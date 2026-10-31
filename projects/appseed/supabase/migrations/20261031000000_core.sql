-- Accounts, catalogue, user content and purchases (docs/DESIGN.md §33).
-- Reads go straight from the app through RLS. Anything a person writes that others will read (profiles, posts,
-- replies, comments, offers) goes through the `content` Edge Function, which runs the shared rules
-- (moderation, post limits, handles) and then calls the content_* functions below with the service role;
-- those re-check what only the database can check atomically (terms version, daily promotion limit,
-- ownership). Likes, reposts, votes, blocks and reports are written directly under RLS.

-- Accounts --------------------------------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  -- Same rule as src/lib/auth.ts validateHandle; the content function checks reserved words with that code too.
  handle text not null unique check (handle ~ '^[a-z][a-z0-9_-]{2,19}$'
    and handle not in ('admin', 'appseed', 'support', 'help', 'root', 'staff', 'official', 'me', 'settings')),
  name text not null check (char_length(name) between 1 and 50),
  bio text not null default '' check (char_length(bio) <= 160),
  -- Bare handles per network (src/lib/socialLinks.ts); the app builds the URLs.
  links jsonb not null default '{}' check (jsonb_typeof(links) = 'object'),
  avatar_hue int not null default floor(random() * 360)::int check (avatar_hue between 0 and 359),
  terms_version int not null check (terms_version >= 1),
  created_at timestamptz not null default now(),
  -- Set when the account is deleted: name and links are wiped, content is removed, sales records stay.
  deleted_at timestamptz
);

-- Catalogue -------------------------------------------------------------------------------------------------

-- Every market shares one table. `data` holds the public fields the app renders (the shapes in
-- src/api/types.ts); anything an owner alone may see lives in its own table.
create table public.listings (
  slug text primary key check (slug ~ '^[a-z0-9][a-z0-9-]{2,59}$'),
  kind text not null check (kind in ('template', 'prompt', 'buyout', 'launch')),
  owner_id uuid not null references auth.users on delete restrict,
  status text not null default 'draft' check (status in ('draft', 'review', 'live', 'rejected', 'removed')),
  -- HK cents; 0 is free. Buyouts and launches are never bought in the app.
  price bigint not null default 0 check (price >= 0),
  data jsonb not null default '{}' check (jsonb_typeof(data) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (kind in ('template', 'prompt') or price = 0)
);
create index listings_live on public.listings (kind, updated_at desc) where status = 'live';

alter table public.listing_prices add constraint listing_prices_listing_fk
  foreign key (listing_id) references public.listings (slug);

-- Full prompt text: only owners and the seller can read it (CLAUDE.md Markets).
create table public.prompt_texts (
  slug text primary key references public.listings on delete cascade,
  text text not null
);

create table public.free_claims (
  user_id uuid not null references auth.users on delete cascade,
  slug text not null references public.listings,
  claimed_at timestamptz not null default now(),
  primary key (user_id, slug)
);

-- Discussion ------------------------------------------------------------------------------------------------

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles on delete cascade,
  body text not null check (char_length(body) between 1 and 500),
  parent_id uuid references public.posts on delete cascade,
  attachment_kind text check (attachment_kind in ('template', 'prompt', 'buyout', 'launch')),
  attachment_slug text references public.listings,
  created_at timestamptz not null default now(),
  -- Removed by moderation; hidden from everyone but kept for the audit trail.
  hidden_at timestamptz,
  check ((attachment_kind is null) = (attachment_slug is null)),
  -- Replies never carry an attachment (§27).
  check (parent_id is null or attachment_slug is null)
);
create index posts_feed on public.posts (created_at desc) where parent_id is null and hidden_at is null;
create index posts_replies on public.posts (parent_id, created_at) where parent_id is not null;
create index posts_promo on public.posts (author_id, created_at) where attachment_slug is not null;

create table public.post_likes (
  post_id uuid not null references public.posts on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  primary key (post_id, user_id)
);
create table public.reposts (
  post_id uuid not null references public.posts on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

-- Engagement on listings (§24). `item_key` follows src/lib/engagement.ts itemKey: a template's slug, else kind:slug.
create table public.comments (
  id uuid primary key default gen_random_uuid(),
  item_key text not null check (item_key ~ '^((prompt|buyout|launch):)?[a-z0-9][a-z0-9-]{2,59}$'),
  author_id uuid not null references public.profiles on delete cascade,
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now(),
  hidden_at timestamptz
);
create index comments_item on public.comments (item_key, created_at desc);

create table public.item_likes (
  item_key text not null,
  user_id uuid not null references auth.users on delete cascade,
  primary key (item_key, user_id)
);
create table public.item_counters (
  item_key text primary key,
  views bigint not null default 0,
  shares bigint not null default 0
);

create table public.launch_votes (
  slug text not null references public.listings on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  primary key (slug, user_id)
);

-- Safety ----------------------------------------------------------------------------------------------------

create table public.blocks (
  blocker_id uuid not null references auth.users on delete cascade,
  blocked_id uuid not null references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

-- Reviewed by a person within 24 hours (App Review 1.2). Rules match src/lib/moderation.ts validateReport.
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references auth.users on delete set null,
  target_kind text not null check (target_kind in ('post', 'comment', 'listing', 'profile')),
  target_id text not null,
  target_handle text not null default '',
  reason text not null check (reason in ('spam', 'harassment', 'sexual', 'violence', 'scam', 'ip', 'other')),
  detail text not null default '' check (char_length(detail) <= 2000),
  contact text not null default '' check (char_length(contact) <= 200),
  status text not null default 'open' check (status in ('open', 'actioned', 'dismissed')),
  created_at timestamptz not null default now(),
  check (reason <> 'ip' or (char_length(btrim(detail)) >= 20 and btrim(contact) ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$')),
  check (reason <> 'other' or char_length(btrim(detail)) >= 5)
);
create index reports_open on public.reports (created_at) where status = 'open';

-- Buyouts ---------------------------------------------------------------------------------------------------

create table public.offers (
  id uuid primary key default gen_random_uuid(),
  slug text not null references public.listings,
  buyer_id uuid not null references auth.users on delete cascade,
  amount bigint not null check (amount > 0),
  message text not null default '' check (char_length(message) <= 500),
  status text not null default 'sent' check (status in ('sent', 'countered', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  unique (slug, buyer_id)
);

-- Row Level Security ----------------------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.listings enable row level security;
alter table public.prompt_texts enable row level security;
alter table public.free_claims enable row level security;
alter table public.posts enable row level security;
alter table public.post_likes enable row level security;
alter table public.reposts enable row level security;
alter table public.comments enable row level security;
alter table public.item_likes enable row level security;
alter table public.item_counters enable row level security;
alter table public.launch_votes enable row level security;
alter table public.blocks enable row level security;
alter table public.reports enable row level security;
alter table public.offers enable row level security;

-- Content is written by the content function; clients may only add or remove their own reactions.
revoke insert, update, delete, truncate on
  public.profiles, public.listings, public.prompt_texts, public.free_claims, public.posts, public.comments,
  public.item_counters, public.offers
from anon, authenticated;
revoke update, truncate on public.post_likes, public.reposts, public.item_likes, public.launch_votes, public.blocks, public.reports from anon, authenticated;
revoke select on public.reports from anon, authenticated;
revoke delete on public.reports from anon, authenticated;

-- Whether this person owns a listing: a valid order (not fully refunded, no open or lost dispute) or a free claim.
create function public.owns(p_user uuid, p_slug text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.free_claims f where f.user_id = p_user and f.slug = p_slug)
      or exists (
        select 1 from public.orders o
        where o.buyer_id = p_user and o.listing_id = p_slug
          and coalesce((select sum(r.amount) from public.order_refunds r where r.order_id = o.id), 0) < o.gross
          and (select count(*) filter (where e.kind = 'dispute_hold') - count(*) filter (where e.kind = 'dispute_release')
               from public.ledger_entries e where e.order_id = o.id) <= 0
      );
$$;

-- The caller's own ownership only: nobody can ask what someone else bought.
create function public.i_own(p_slug text) returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and public.owns(auth.uid(), p_slug);
$$;

create policy "public profiles" on public.profiles for select to anon, authenticated using (deleted_at is null);
create policy "live listings" on public.listings for select to anon, authenticated using (status = 'live');
create policy "own listings" on public.listings for select to authenticated using (owner_id = auth.uid());
create policy "owners read prompt text" on public.prompt_texts for select to authenticated
  using (public.i_own(slug) or exists (select 1 from public.listings l where l.slug = prompt_texts.slug and l.owner_id = auth.uid()));
create policy "own claims" on public.free_claims for select to authenticated using (user_id = auth.uid());

create policy "visible posts" on public.posts for select to anon, authenticated using (hidden_at is null);
create policy "visible comments" on public.comments for select to anon, authenticated using (hidden_at is null);
create policy "delete own comment" on public.comments for delete to authenticated using (author_id = auth.uid());
grant delete on public.comments to authenticated;

create policy "post likes are public" on public.post_likes for select to anon, authenticated using (true);
create policy "like as yourself" on public.post_likes for insert to authenticated with check (user_id = auth.uid());
create policy "unlike your own" on public.post_likes for delete to authenticated using (user_id = auth.uid());
create policy "reposts are public" on public.reposts for select to anon, authenticated using (true);
create policy "repost as yourself" on public.reposts for insert to authenticated with check (user_id = auth.uid());
create policy "undo your own repost" on public.reposts for delete to authenticated using (user_id = auth.uid());
create policy "item likes are public" on public.item_likes for select to anon, authenticated using (true);
create policy "like items as yourself" on public.item_likes for insert to authenticated with check (user_id = auth.uid());
create policy "unlike items" on public.item_likes for delete to authenticated using (user_id = auth.uid());
create policy "counters are public" on public.item_counters for select to anon, authenticated using (true);

create policy "votes are public" on public.launch_votes for select to anon, authenticated using (true);
-- No voting for your own launch.
create policy "vote as yourself" on public.launch_votes for insert to authenticated with check (
  user_id = auth.uid()
  and exists (select 1 from public.listings l where l.slug = launch_votes.slug and l.kind = 'launch' and l.status = 'live' and l.owner_id <> auth.uid())
);
create policy "remove your vote" on public.launch_votes for delete to authenticated using (user_id = auth.uid());

create policy "own blocks" on public.blocks for select to authenticated using (blocker_id = auth.uid());
create policy "block as yourself" on public.blocks for insert to authenticated with check (blocker_id = auth.uid());
create policy "unblock" on public.blocks for delete to authenticated using (blocker_id = auth.uid());

-- Anyone can report, including guests; a signed-in reporter is always recorded as themselves.
create policy "report as guest" on public.reports for insert to anon with check (reporter_id is null);
create policy "report as yourself" on public.reports for insert to authenticated with check (reporter_id = auth.uid());

create policy "own offers" on public.offers for select to authenticated using (buyer_id = auth.uid());
create policy "offers on my listing" on public.offers for select to authenticated
  using (exists (select 1 from public.listings l where l.slug = offers.slug and l.owner_id = auth.uid()));

-- Reads -----------------------------------------------------------------------------------------------------

-- Feed rows with author, counts and the viewer's own like / repost. Runs as the caller, so RLS applies.
create view public.post_feed with (security_invoker = true) as
  select p.id, p.author_id as user_id, pr.name as author, pr.handle, p.body, p.created_at, p.parent_id,
         p.attachment_kind, p.attachment_slug,
         -- An attachment is always the author's own listing (checked on write), so it is always promotion.
         p.attachment_slug is not null as promo,
         (select count(*) from public.post_likes l where l.post_id = p.id) as likes,
         (select count(*) from public.posts r where r.parent_id = p.id and r.hidden_at is null) as replies,
         (select count(*) from public.reposts s where s.post_id = p.id) as reposts,
         exists (select 1 from public.post_likes l where l.post_id = p.id and l.user_id = auth.uid()) as liked,
         exists (select 1 from public.reposts s where s.post_id = p.id and s.user_id = auth.uid()) as reposted
  from public.posts p join public.profiles pr on pr.id = p.author_id;

create view public.comment_feed with (security_invoker = true) as
  select c.id, c.item_key, c.author_id as user_id, pr.name as author, pr.handle, c.body, c.created_at
  from public.comments c join public.profiles pr on pr.id = c.author_id;

create function public.engagement(p_key text)
returns table (likes bigint, views bigint, shares bigint, comments bigint, liked boolean)
language sql stable security definer set search_path = '' as $$
  select (select count(*) from public.item_likes where item_key = p_key),
         coalesce((select c.views from public.item_counters c where c.item_key = p_key), 0),
         coalesce((select c.shares from public.item_counters c where c.item_key = p_key), 0),
         (select count(*) from public.comments where item_key = p_key and hidden_at is null),
         exists (select 1 from public.item_likes where item_key = p_key and user_id = auth.uid());
$$;

create function public.record_view(p_key text) returns void
language sql security definer set search_path = '' as $$
  insert into public.item_counters (item_key, views) values (p_key, 1)
  on conflict (item_key) do update set views = public.item_counters.views + 1;
$$;

-- Shares feed the leaderboard, so only signed-in people count.
create function public.record_share(p_key text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'authRequired'; end if;
  insert into public.item_counters (item_key, shares) values (p_key, 1)
  on conflict (item_key) do update set shares = public.item_counters.shares + 1;
end $$;

-- Ranking signals per launch (lib/ranking.ts aggregates from these): votes split by account age, distinct
-- reporters, shares and comments. Individual voters never leave the database.
create view public.launch_stats with (security_invoker = false) as
  select l.slug,
         count(v.user_id) as upvotes,
         coalesce(avg(case when pr.created_at < v.created_at - interval '30 days' then 1.0 else 0.0 end), 0) as trusted_share,
         coalesce(avg(case when pr.created_at > v.created_at - interval '7 days' then 1.0 else 0.0 end), 0) as new_account_share,
         (select count(distinct r.reporter_id) from public.reports r where r.target_kind = 'listing' and r.target_id = l.slug and r.status <> 'dismissed') as reports,
         coalesce((select c.shares from public.item_counters c where c.item_key = 'launch:' || l.slug), 0) as shares,
         (select count(*) from public.comments c where c.item_key = 'launch:' || l.slug and c.hidden_at is null) as comments
  from public.listings l
  left join public.launch_votes v on v.slug = l.slug
  left join public.profiles pr on pr.id = v.user_id
  where l.kind = 'launch' and l.status = 'live'
  group by l.slug;
grant select on public.launch_stats to anon, authenticated;

-- What this account owns, for the library and "Restore purchases".
create function public.my_purchases()
returns table (slug text, kind text, acquired_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select l.slug, l.kind, min(x.at) from (
    select o.listing_id as slug, o.purchased_at as at from public.orders o where o.buyer_id = auth.uid()
    union all
    select f.slug, f.claimed_at from public.free_claims f where f.user_id = auth.uid()
  ) x join public.listings l on l.slug = x.slug
  where auth.uid() is not null and public.owns(auth.uid(), l.slug)
  group by l.slug, l.kind;
$$;

create function public.claim_free(p_slug text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'authRequired'; end if;
  if not exists (select 1 from public.listings where slug = p_slug and status = 'live' and price = 0 and kind in ('template', 'prompt')) then
    raise exception 'notFree';
  end if;
  insert into public.free_claims (user_id, slug) values (auth.uid(), p_slug) on conflict do nothing;
end $$;

-- Start of today in Hong Kong: the daily promotion limit resets at local midnight.
create function public.hk_day_start() returns timestamptz language sql stable as $$
  select date_trunc('day', now() at time zone 'Asia/Hong_Kong') at time zone 'Asia/Hong_Kong';
$$;

create function public.promo_today() returns int
language sql stable security definer set search_path = '' as $$
  select count(*)::int from public.posts
  where author_id = auth.uid() and attachment_slug is not null and parent_id is null and created_at >= public.hk_day_start();
$$;

create function public.accept_terms(p_version int) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'authRequired'; end if;
  update public.profiles set terms_version = greatest(terms_version, p_version) where id = auth.uid() and deleted_at is null;
  if not found then raise exception 'notFound'; end if;
end $$;

-- Writes for the content function (service role only) ------------------------------------------------------

create function public.require_terms(p_user uuid, p_min_terms int) returns void
language plpgsql stable security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.profiles where id = p_user and deleted_at is null) then raise exception 'profileRequired'; end if;
  if not exists (select 1 from public.profiles where id = p_user and terms_version >= p_min_terms) then raise exception 'termsRequired'; end if;
end $$;

create function public.content_complete_profile(p_user uuid, p_handle text, p_name text, p_terms int, p_min_terms int)
returns public.profiles language plpgsql security definer set search_path = '' as $$
declare v public.profiles;
begin
  if p_terms < p_min_terms then raise exception 'termsRequired'; end if;
  insert into public.profiles (id, handle, name, terms_version) values (p_user, p_handle, btrim(p_name), p_terms) returning * into v;
  return v;
exception when unique_violation then
  if exists (select 1 from public.profiles where id = p_user) then raise exception 'profileExists'; end if;
  raise exception 'handleTaken';
end $$;

create function public.content_save_profile(p_user uuid, p_name text, p_bio text, p_links jsonb)
returns public.profiles language plpgsql security definer set search_path = '' as $$
declare v public.profiles;
begin
  update public.profiles set name = btrim(p_name), bio = btrim(p_bio), links = p_links
    where id = p_user and deleted_at is null returning * into v;
  if not found then raise exception 'profileRequired'; end if;
  return v;
end $$;

create function public.content_create_post(p_user uuid, p_body text, p_parent uuid, p_kind text, p_slug text, p_min_terms int, p_promo_limit int)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  perform public.require_terms(p_user, p_min_terms);
  if p_parent is not null then
    if not exists (select 1 from public.posts where id = p_parent and hidden_at is null) then raise exception 'notFound'; end if;
    p_kind := null; p_slug := null;
  end if;
  if p_slug is not null then
    if not exists (select 1 from public.listings where slug = p_slug and kind = p_kind and owner_id = p_user and status = 'live') then
      raise exception 'notYourListing';
    end if;
    -- One writer at a time per person, so two posts sent together cannot both slip under the limit.
    perform pg_advisory_xact_lock(hashtextextended('promo:' || p_user::text, 0));
    if (select count(*) from public.posts where author_id = p_user and attachment_slug is not null and parent_id is null
        and created_at >= public.hk_day_start()) >= p_promo_limit then
      raise exception 'promoLimit';
    end if;
  end if;
  insert into public.posts (author_id, body, parent_id, attachment_kind, attachment_slug)
    values (p_user, btrim(p_body), p_parent, p_kind, p_slug) returning id into v_id;
  return v_id;
end $$;

create function public.content_post_comment(p_user uuid, p_key text, p_body text, p_min_terms int)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  perform public.require_terms(p_user, p_min_terms);
  insert into public.comments (item_key, author_id, body) values (p_key, p_user, btrim(p_body)) returning id into v_id;
  return v_id;
end $$;

create function public.content_make_offer(p_user uuid, p_slug text, p_amount bigint, p_message text, p_min_terms int)
returns public.offers language plpgsql security definer set search_path = '' as $$
declare v public.offers;
begin
  perform public.require_terms(p_user, p_min_terms);
  if not exists (select 1 from public.listings where slug = p_slug and kind = 'buyout' and status = 'live' and owner_id <> p_user) then
    raise exception 'notFound';
  end if;
  insert into public.offers (slug, buyer_id, amount, message) values (p_slug, p_user, p_amount, btrim(p_message))
  on conflict (slug, buyer_id) do update set amount = excluded.amount, message = excluded.message, status = 'sent', created_at = now()
  returning * into v;
  return v;
end $$;

-- Account deletion (App Review 5.1.1(v)): wipes the profile and everything the person wrote; orders and the
-- ledger stay for accounting, tied to an account that can no longer sign in.
create function public.content_delete_account(p_user uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.posts where author_id = p_user;
  delete from public.comments where author_id = p_user;
  delete from public.post_likes where user_id = p_user;
  delete from public.reposts where user_id = p_user;
  delete from public.item_likes where user_id = p_user;
  delete from public.launch_votes where user_id = p_user;
  delete from public.blocks where blocker_id = p_user or blocked_id = p_user;
  delete from public.offers where buyer_id = p_user;
  update public.profiles set name = 'deleted', bio = '', links = '{}', handle = 'deleted-' || substr(md5(p_user::text), 1, 12), deleted_at = now()
    where id = p_user;
  update public.listings set status = 'removed', updated_at = now() where owner_id = p_user and status <> 'removed';
end $$;

revoke execute on function
  public.require_terms, public.content_complete_profile, public.content_save_profile, public.content_create_post,
  public.content_post_comment, public.content_make_offer, public.content_delete_account
from public, anon, authenticated;
grant execute on function
  public.require_terms, public.content_complete_profile, public.content_save_profile, public.content_create_post,
  public.content_post_comment, public.content_make_offer, public.content_delete_account
to service_role;
revoke execute on function public.owns, public.i_own from public, anon, authenticated;
grant execute on function public.owns to service_role;
grant execute on function public.i_own to authenticated;
revoke execute on function public.my_purchases, public.claim_free, public.promo_today, public.accept_terms, public.record_share from public, anon;
grant execute on function public.my_purchases, public.claim_free, public.promo_today, public.accept_terms, public.record_share to authenticated;
grant execute on function public.engagement, public.record_view to anon, authenticated;
