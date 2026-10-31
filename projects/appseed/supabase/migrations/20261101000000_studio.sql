-- Listing submission, source code storage and creator analytics (docs/DESIGN.md §35).
-- Listings are created by the `studio` Edge Function (rules + moderation + ownership attestation), land in
-- review, and go live only through staff review. Source code sits in the private `sources` bucket and is
-- handed out only as short-lived signed URLs to owners and the seller.

alter table public.listings add column attested_at timestamptz;
-- Nothing reaches review or goes live without the creator confirming they own the rights (§30).
alter table public.listings add constraint listings_attested check (status in ('draft', 'rejected', 'removed') or attested_at is not null);

insert into storage.buckets (id, name, public) values ('sources', 'sources', false) on conflict (id) do nothing;

create table public.listing_sources (
  slug text primary key references public.listings on delete cascade,
  kind text not null check (kind in ('github', 'zip')),
  repo text,
  ref text,
  -- Object path inside the `sources` bucket.
  path text not null,
  size_bytes bigint not null check (size_bytes >= 0),
  report jsonb not null default '{}',
  scanned_at timestamptz not null default now()
);

-- GitHub App installations, linked only after GitHub confirmed (user OAuth) that the installation is theirs.
create table public.github_installations (
  user_id uuid primary key references auth.users on delete cascade,
  installation_id bigint not null unique,
  login text not null,
  linked_at timestamptz not null default now()
);

-- Daily per-item totals (§26): counts only, never who.
create table public.item_daily (
  item_key text not null,
  day date not null,
  views bigint not null default 0,
  likes bigint not null default 0,
  shares bigint not null default 0,
  comments bigint not null default 0,
  primary key (item_key, day)
);

alter table public.listing_sources enable row level security;
alter table public.github_installations enable row level security;
alter table public.item_daily enable row level security;
revoke insert, update, delete, truncate on public.listing_sources, public.github_installations, public.item_daily from anon, authenticated;
revoke select on public.item_daily from anon, authenticated;

create policy "own sources" on public.listing_sources for select to authenticated
  using (exists (select 1 from public.listings l where l.slug = listing_sources.slug and l.owner_id = auth.uid()));
create policy "own github" on public.github_installations for select to authenticated using (user_id = auth.uid());

create function public.hk_today() returns date language sql stable as $$ select (now() at time zone 'Asia/Hong_Kong')::date $$;

create function public.bump_daily(p_key text, p_views int, p_likes int, p_shares int, p_comments int) returns void
language sql security definer set search_path = '' as $$
  insert into public.item_daily (item_key, day, views, likes, shares, comments)
  values (p_key, public.hk_today(), p_views, p_likes, p_shares, p_comments)
  on conflict (item_key, day) do update set
    views = public.item_daily.views + excluded.views,
    likes = greatest(0, public.item_daily.likes + excluded.likes),
    shares = public.item_daily.shares + excluded.shares,
    comments = public.item_daily.comments + excluded.comments;
$$;
revoke execute on function public.bump_daily from public, anon, authenticated;

create or replace function public.record_view(p_key text) returns void
language sql security definer set search_path = '' as $$
  insert into public.item_counters (item_key, views) values (p_key, 1)
  on conflict (item_key) do update set views = public.item_counters.views + 1;
  select public.bump_daily(p_key, 1, 0, 0, 0);
$$;

create or replace function public.record_share(p_key text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'authRequired'; end if;
  insert into public.item_counters (item_key, shares) values (p_key, 1)
  on conflict (item_key) do update set shares = public.item_counters.shares + 1;
  perform public.bump_daily(p_key, 0, 0, 1, 0);
end $$;

create function public.daily_on_like() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then perform public.bump_daily(new.item_key, 0, 1, 0, 0);
  else perform public.bump_daily(old.item_key, 0, -1, 0, 0); end if;
  return null;
end $$;
create trigger item_likes_daily after insert or delete on public.item_likes for each row execute function public.daily_on_like();

create function public.daily_on_comment() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform public.bump_daily(new.item_key, 0, 0, 0, 1);
  return null;
end $$;
create trigger comments_daily after insert on public.comments for each row execute function public.daily_on_comment();

-- The caller's own listings, one row per listing per day for the last p_days days (Hong Kong dates), with
-- engagement from item_daily and units / proceeds (seller's share, HK cents) from orders.
create function public.creator_daily(p_days int)
returns table (slug text, day date, views bigint, likes bigint, shares bigint, comments bigint, units bigint, proceeds bigint)
language sql stable security definer set search_path = '' as $$
  with mine as (
    select l.slug, case when l.kind = 'template' then l.slug else l.kind || ':' || l.slug end as item_key
    from public.listings l where l.owner_id = auth.uid() and l.kind in ('template', 'prompt', 'launch')
  ), days as (
    select generate_series(public.hk_today() - (least(greatest(p_days, 1), 366) - 1), public.hk_today(), interval '1 day')::date as day
  )
  select m.slug, d.day,
         coalesce(i.views, 0), coalesce(i.likes, 0), coalesce(i.shares, 0), coalesce(i.comments, 0),
         (select count(*) from public.orders o where o.listing_id = m.slug and (o.purchased_at at time zone 'Asia/Hong_Kong')::date = d.day),
         (select coalesce(sum(o.seller_amount), 0) from public.orders o where o.listing_id = m.slug and (o.purchased_at at time zone 'Asia/Hong_Kong')::date = d.day)::bigint
  from mine m cross join days d
  left join public.item_daily i on i.item_key = m.item_key and i.day = d.day
  where auth.uid() is not null
  order by m.slug, d.day;
$$;
revoke execute on function public.creator_daily from public, anon;
grant execute on function public.creator_daily to authenticated;

-- Studio summary for the caller: listings with status and this month's sales.
create function public.my_listings()
returns table (slug text, kind text, status text, month_sales bigint, month_revenue bigint)
language sql stable security definer set search_path = '' as $$
  select l.slug, l.kind, l.status,
         (select count(*) from public.orders o where o.listing_id = l.slug and o.purchased_at >= date_trunc('month', now())),
         (select coalesce(sum(o.seller_amount), 0) from public.orders o where o.listing_id = l.slug and o.purchased_at >= date_trunc('month', now()))::bigint
  from public.listings l where l.owner_id = auth.uid() and l.status <> 'removed'
  order by l.updated_at desc;
$$;
revoke execute on function public.my_listings from public, anon;
grant execute on function public.my_listings to authenticated;

-- Written by the studio function (service role) after its checks.
create function public.studio_submit_listing(p_user uuid, p_slug text, p_kind text, p_price bigint, p_data jsonb, p_min_terms int)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform public.require_terms(p_user, p_min_terms);
  insert into public.listings (slug, kind, owner_id, status, price, data, attested_at)
  values (p_slug, p_kind, p_user, 'review', p_price, p_data, now());
end $$;
revoke execute on function public.studio_submit_listing from public, anon, authenticated;
grant execute on function public.studio_submit_listing to service_role;

create function public.studio_save_prompt_text(p_slug text, p_text text) returns void
language sql security definer set search_path = '' as $$
  insert into public.prompt_texts (slug, text) values (p_slug, p_text) on conflict (slug) do update set text = excluded.text;
$$;

-- Source downloads: the seller, or someone who owns the listing.
create function public.can_download(p_user uuid, p_slug text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.listings where slug = p_slug and owner_id = p_user) or public.owns(p_user, p_slug);
$$;

revoke execute on function public.studio_save_prompt_text, public.can_download from public, anon, authenticated;
grant execute on function public.studio_save_prompt_text, public.can_download to service_role;

create policy "unlink own github" on public.github_installations for delete to authenticated using (user_id = auth.uid());
grant delete on public.github_installations to authenticated;
