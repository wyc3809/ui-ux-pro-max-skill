-- Operations (docs/DESIGN.md §36): staff review of reports and listings, moderation holds, blocks by handle,
-- and anonymous client error reports. Staff actions go through the `admin` Edge Function, which checks the
-- caller is staff and records every action in an append-only audit log.

create table public.staff (
  user_id uuid primary key references auth.users on delete cascade,
  role text not null check (role in ('admin', 'moderator')),
  added_at timestamptz not null default now()
);

create table public.admin_actions (
  id bigint generated always as identity primary key,
  staff_id uuid not null references auth.users on delete restrict,
  action text not null,
  target text not null,
  note text not null default '',
  created_at timestamptz not null default now()
);
create trigger admin_actions_append_only before update or delete on public.admin_actions
  for each row execute function public.ledger_append_only();

-- Crash and error reports from the app: no account, no device id, just what broke (§30, no tracking SDKs).
create table public.client_errors (
  id bigint generated always as identity primary key,
  platform text not null check (platform in ('ios', 'android', 'web')),
  app_version text not null check (char_length(app_version) <= 20),
  route text not null default '' check (char_length(route) <= 200),
  message text not null check (char_length(message) between 1 and 500),
  stack text not null default '' check (char_length(stack) <= 4000),
  created_at timestamptz not null default now()
);

alter table public.staff enable row level security;
alter table public.admin_actions enable row level security;
alter table public.client_errors enable row level security;
revoke insert, update, delete, truncate on public.staff, public.admin_actions from anon, authenticated;
revoke select, update, delete, truncate on public.client_errors from anon, authenticated;
revoke select on public.admin_actions from anon, authenticated;

create policy "own staff role" on public.staff for select to authenticated using (user_id = auth.uid());
create policy "report errors" on public.client_errors for insert to anon, authenticated with check (true);

-- Moderation hold: the classifier was unsure, so the item is hidden and queued for a person.
create function public.moderation_hold(p_kind text, p_id uuid, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_handle text;
begin
  if p_kind = 'post' then
    update public.posts set hidden_at = now() where id = p_id;
    select pr.handle into v_handle from public.posts p join public.profiles pr on pr.id = p.author_id where p.id = p_id;
  elsif p_kind = 'comment' then
    update public.comments set hidden_at = now() where id = p_id;
    select pr.handle into v_handle from public.comments c join public.profiles pr on pr.id = c.author_id where c.id = p_id;
  else
    raise exception 'invalidKind';
  end if;
  insert into public.reports (reporter_id, target_kind, target_id, target_handle, reason, detail)
  values (null, p_kind, p_id::text, coalesce(v_handle, ''), 'other', 'auto: ' || p_reason);
end $$;

-- Blocks by handle (the app knows people by handle); the ids stay in the database.
create function public.block_handle(p_handle text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if auth.uid() is null then raise exception 'authRequired'; end if;
  select id into v_id from public.profiles where handle = p_handle;
  if v_id is null or v_id = auth.uid() then return; end if;
  insert into public.blocks (blocker_id, blocked_id) values (auth.uid(), v_id) on conflict do nothing;
end $$;

create function public.unblock_handle(p_handle text) returns void
language sql security definer set search_path = '' as $$
  delete from public.blocks b using public.profiles p where b.blocker_id = auth.uid() and b.blocked_id = p.id and p.handle = p_handle;
$$;

create function public.my_blocks() returns setof text
language sql stable security definer set search_path = '' as $$
  select p.handle from public.blocks b join public.profiles p on p.id = b.blocked_id where b.blocker_id = auth.uid() order by b.created_at;
$$;

-- Staff queues (service role, behind the admin function's staff check).
create function public.admin_report_queue() returns table (id uuid, target_kind text, target_id text, target_handle text, reason text, detail text, reports bigint, preview text, created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select r.id, r.target_kind, r.target_id, r.target_handle, r.reason, r.detail,
         count(*) over (partition by r.target_kind, r.target_id),
         coalesce(
           (select p.body from public.posts p where r.target_kind = 'post' and p.id::text = r.target_id),
           (select c.body from public.comments c where r.target_kind = 'comment' and c.id::text = r.target_id),
           (select coalesce(l.data->>'name', l.data->>'title', l.slug) from public.listings l where r.target_kind = 'listing' and l.slug = r.target_id),
           (select pr.name || ' · ' || pr.bio from public.profiles pr where r.target_kind = 'profile' and pr.handle = r.target_handle),
           ''),
         r.created_at
  from public.reports r where r.status = 'open' order by r.created_at limit 200;
$$;

create function public.admin_listing_queue() returns table (slug text, kind text, owner_handle text, price bigint, data jsonb, report jsonb, created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select l.slug, l.kind, pr.handle, l.price, l.data, s.report, l.created_at
  from public.listings l join public.profiles pr on pr.id = l.owner_id left join public.listing_sources s on s.slug = l.slug
  where l.status = 'review' order by l.created_at limit 200;
$$;

-- Resolves a report: dismiss it, or hide the item (post / comment), remove the listing, and close every open
-- report on the same target. Suspension is done by the admin function (auth ban) plus `admin_hide_author`.
create function public.admin_resolve_report(p_staff uuid, p_report uuid, p_action text, p_note text) returns void
language plpgsql security definer set search_path = '' as $$
declare r public.reports;
begin
  select * into r from public.reports where id = p_report for update;
  if not found then raise exception 'notFound'; end if;
  if p_action = 'hide' then
    if r.target_kind = 'post' then update public.posts set hidden_at = coalesce(hidden_at, now()) where id::text = r.target_id;
    elsif r.target_kind = 'comment' then update public.comments set hidden_at = coalesce(hidden_at, now()) where id::text = r.target_id;
    elsif r.target_kind = 'listing' then update public.listings set status = 'removed', updated_at = now() where slug = r.target_id;
    else raise exception 'cannotHide'; end if;
  elsif p_action = 'restore' then
    -- A held item the classifier was unsure about, found fine by a person.
    if r.target_kind = 'post' then update public.posts set hidden_at = null where id::text = r.target_id;
    elsif r.target_kind = 'comment' then update public.comments set hidden_at = null where id::text = r.target_id; end if;
  elsif p_action <> 'dismiss' then
    raise exception 'invalidAction';
  end if;
  update public.reports set status = case when p_action = 'hide' then 'actioned' else 'dismissed' end
    where target_kind = r.target_kind and target_id = r.target_id and status = 'open';
  insert into public.admin_actions (staff_id, action, target, note) values (p_staff, 'report:' || p_action, r.target_kind || ':' || r.target_id, coalesce(p_note, ''));
end $$;

create function public.admin_review_listing(p_staff uuid, p_slug text, p_approve boolean, p_note text) returns void
language plpgsql security definer set search_path = '' as $$
declare l public.listings;
begin
  select * into l from public.listings where slug = p_slug and status = 'review' for update;
  if not found then raise exception 'notFound'; end if;
  update public.listings set status = case when p_approve then 'live' else 'rejected' end, updated_at = now() where slug = p_slug;
  -- A paid listing becomes buyable on its fixed price tier.
  if p_approve and l.price > 0 and l.kind in ('template', 'prompt') then
    insert into public.listing_prices (listing_id, seller_id, product_id, price)
    values (l.slug, l.owner_id, 'tier_' || (l.price / 100), l.price)
    on conflict (listing_id) do update set live = true, price = excluded.price, product_id = excluded.product_id;
  end if;
  insert into public.admin_actions (staff_id, action, target, note) values (p_staff, case when p_approve then 'listing:approve' else 'listing:reject' end, p_slug, coalesce(p_note, ''));
end $$;

-- Suspension: everything the person wrote disappears and their listings come down; the admin function also
-- bans the sign-in.
create function public.admin_suspend(p_staff uuid, p_handle text, p_note text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  select id into v_id from public.profiles where handle = p_handle;
  if v_id is null then raise exception 'notFound'; end if;
  update public.posts set hidden_at = coalesce(hidden_at, now()) where author_id = v_id;
  update public.comments set hidden_at = coalesce(hidden_at, now()) where author_id = v_id;
  update public.listings set status = 'removed', updated_at = now() where owner_id = v_id and status in ('review', 'live');
  update public.reports set status = 'actioned' where target_handle = p_handle and status = 'open';
  insert into public.admin_actions (staff_id, action, target, note) values (p_staff, 'suspend', p_handle, coalesce(p_note, ''));
  return v_id;
end $$;

create function public.is_staff(p_user uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.staff where user_id = p_user);
$$;

revoke execute on function public.moderation_hold, public.admin_report_queue, public.admin_listing_queue, public.admin_resolve_report,
  public.admin_review_listing, public.admin_suspend, public.is_staff from public, anon, authenticated;
grant execute on function public.moderation_hold, public.admin_report_queue, public.admin_listing_queue, public.admin_resolve_report,
  public.admin_review_listing, public.admin_suspend, public.is_staff to service_role;
revoke execute on function public.block_handle, public.unblock_handle, public.my_blocks from public, anon;
grant execute on function public.block_handle, public.unblock_handle, public.my_blocks to authenticated;

-- Error reports are kept 90 days (privacy policy). Schedule daily with pg_cron:
--   select cron.schedule('purge-client-errors', '17 3 * * *', $$ select public.purge_client_errors() $$);
create function public.purge_client_errors() returns void language sql security definer set search_path = '' as $$
  delete from public.client_errors where created_at < now() - interval '90 days';
$$;
revoke execute on function public.purge_client_errors from public, anon, authenticated;
