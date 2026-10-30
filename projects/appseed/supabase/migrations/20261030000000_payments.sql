-- Payments, seller ledger and payouts (docs/DESIGN.md §31, §32).
-- Money is bigint minor units of HKD. Clients can only read their own rows; every write goes through the
-- payments-webhook and settlement Edge Functions with the service role. No bank or ID details are stored:
-- sellers onboard with Stripe Connect and only the Stripe account id lives here.

-- What can be bought, and who is paid for it. A row is written when a listing goes live.
create table public.listing_prices (
  listing_id text primary key,
  seller_id uuid not null references auth.users on delete restrict,
  -- The fixed IAP price tier (RevenueCat product) used for this listing.
  product_id text not null,
  price bigint not null check (price > 0),
  live boolean not null default true
);

-- IAP products are shared price tiers, so the app records which listing a purchase is for just before
-- buying; the webhook claims the oldest open intent for that buyer and tier.
create table public.purchase_intents (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references auth.users on delete cascade,
  listing_id text not null references public.listing_prices,
  product_id text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '1 hour',
  -- The store transaction that claimed it; the same transaction always claims the same intent.
  external_id text unique
);
create index purchase_intents_open on public.purchase_intents (buyer_id, product_id, created_at) where external_id is null;

create table public.connect_accounts (
  seller_id uuid primary key references auth.users on delete restrict,
  stripe_account_id text not null unique,
  payouts_enabled boolean not null default false,
  details_submitted boolean not null default false,
  updated_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('app_store', 'play_store', 'stripe')),
  external_id text not null,
  buyer_id uuid not null references auth.users on delete restrict,
  seller_id uuid not null references auth.users on delete restrict,
  listing_id text not null references public.listing_prices,
  gross bigint not null check (gross > 0),
  channel_fee bigint not null check (channel_fee >= 0),
  platform_fee bigint not null check (platform_fee >= 0),
  seller_amount bigint not null check (seller_amount >= 0),
  purchased_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (provider, external_id),
  check (channel_fee + platform_fee + seller_amount = gross),
  check (buyer_id <> seller_id)
);
create index orders_seller on public.orders (seller_id, purchased_at desc);

create table public.order_refunds (
  seq bigint generated always as identity primary key,
  order_id uuid not null references public.orders on delete restrict,
  refund_id text not null,
  amount bigint not null check (amount > 0),
  refunded_at timestamptz not null,
  unique (order_id, refund_id)
);

create table public.payouts (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references auth.users on delete restrict,
  period text not null check (period ~ '^\d{4}-\d{2}$'),
  gross bigint not null check (gross > 0),
  fee bigint not null check (fee >= 0),
  net bigint generated always as (gross - fee) stored,
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed')),
  stripe_transfer_id text unique,
  failure text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- One live payout per seller and month; a failed one can be retried.
create unique index payouts_one_per_period on public.payouts (seller_id, period) where status <> 'failed';

-- Append-only: rows are never updated or deleted, corrections are new entries.
create table public.ledger_entries (
  id bigint generated always as identity primary key,
  seller_id uuid not null references auth.users on delete restrict,
  kind text not null check (kind in ('sale', 'refund', 'dispute_hold', 'dispute_release', 'payout', 'payout_reversal')),
  amount bigint not null check (amount <> 0),
  available_at timestamptz not null,
  source_key text not null unique,
  order_id uuid references public.orders,
  payout_id uuid references public.payouts,
  created_at timestamptz not null default now()
);
create index ledger_entries_seller on public.ledger_entries (seller_id, available_at);

create table public.webhook_events (
  provider text not null,
  event_id text not null,
  type text not null,
  received_at timestamptz not null default now(),
  primary key (provider, event_id)
);

create function public.ledger_append_only() returns trigger language plpgsql as $$
begin
  raise exception 'ledger_entries is append-only';
end $$;
create trigger ledger_append_only before update or delete on public.ledger_entries
  for each row execute function public.ledger_append_only();

-- Row Level Security: read your own rows; nobody but the service role writes.
alter table public.listing_prices enable row level security;
alter table public.purchase_intents enable row level security;
alter table public.connect_accounts enable row level security;
alter table public.orders enable row level security;
alter table public.order_refunds enable row level security;
alter table public.payouts enable row level security;
alter table public.ledger_entries enable row level security;
alter table public.webhook_events enable row level security;

revoke insert, update, delete, truncate on
  public.listing_prices, public.purchase_intents, public.connect_accounts, public.orders,
  public.order_refunds, public.payouts, public.ledger_entries, public.webhook_events
from anon, authenticated;
revoke select on public.webhook_events from anon, authenticated;

create policy "live listings are public" on public.listing_prices for select to anon, authenticated using (live);
create policy "own intents" on public.purchase_intents for select to authenticated using (buyer_id = auth.uid());
create policy "own connect account" on public.connect_accounts for select to authenticated using (seller_id = auth.uid());
-- Sellers see their sales with the split; buyers' purchases are served by the access layer, not this table.
create policy "own sales" on public.orders for select to authenticated using (seller_id = auth.uid());
create policy "own sale refunds" on public.order_refunds for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and o.seller_id = auth.uid()));
create policy "own payouts" on public.payouts for select to authenticated using (seller_id = auth.uid());
create policy "own ledger" on public.ledger_entries for select to authenticated using (seller_id = auth.uid());

-- Balance as the studio shows it; runs as the caller, so RLS limits a seller to their own entries.
create function public.seller_balance(p_seller uuid, p_now timestamptz default now())
returns table (total bigint, available bigint, pending bigint)
language sql stable security invoker set search_path = '' as $$
  select coalesce(sum(amount), 0)::bigint,
         coalesce(sum(amount) filter (where amount < 0 or available_at <= p_now), 0)::bigint,
         coalesce(sum(amount) filter (where amount > 0 and available_at > p_now), 0)::bigint
  from public.ledger_entries where seller_id = p_seller;
$$;

create function public.ledger_sellers()
returns setof uuid language sql stable security definer set search_path = '' as $$
  select distinct seller_id from public.ledger_entries;
$$;

-- Called by the app right before an IAP purchase.
create function public.create_purchase_intent(p_listing text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_listing public.listing_prices;
  v_id uuid;
begin
  if auth.uid() is null then raise exception 'authRequired'; end if;
  select * into v_listing from public.listing_prices where listing_id = p_listing and live;
  if not found then raise exception 'listingNotFound'; end if;
  if v_listing.seller_id = auth.uid() then raise exception 'selfPurchase'; end if;
  insert into public.purchase_intents (buyer_id, listing_id, product_id)
    values (auth.uid(), v_listing.listing_id, v_listing.product_id) returning id into v_id;
  return v_id;
end $$;

create function public.match_purchase_intent(p_buyer uuid, p_product text, p_external text)
returns table (listing_id text, seller_id uuid) language plpgsql security definer set search_path = '' as $$
declare
  v_intent uuid;
begin
  select i.id into v_intent from public.purchase_intents i where i.external_id = p_external;
  if v_intent is null then
    select i.id into v_intent from public.purchase_intents i
      where i.buyer_id = p_buyer and i.product_id = p_product and i.external_id is null and i.expires_at > now()
      order by i.created_at limit 1 for update skip locked;
    if v_intent is null then return; end if;
    update public.purchase_intents set external_id = p_external where id = v_intent;
  end if;
  return query select l.listing_id, l.seller_id from public.purchase_intents i
    join public.listing_prices l on l.listing_id = i.listing_id where i.id = v_intent;
end $$;

-- Records a refund once. p_amount null refunds the rest. Returns the amount recorded and what earlier
-- refunds of the order already took back, so the ledger reverses each part exactly once.
create function public.record_refund(p_order uuid, p_refund text, p_amount bigint, p_at timestamptz)
returns table (amount bigint, refunded_before bigint) language plpgsql security definer set search_path = '' as $$
declare
  v_gross bigint;
  v_existing public.order_refunds;
  v_before bigint;
  v_amount bigint;
begin
  select o.gross into v_gross from public.orders o where o.id = p_order for update;
  if not found then raise exception 'orderNotFound'; end if;
  select * into v_existing from public.order_refunds r where r.order_id = p_order and r.refund_id = p_refund;
  if found then
    return query select v_existing.amount,
      coalesce((select sum(r.amount) from public.order_refunds r where r.order_id = p_order and r.seq < v_existing.seq), 0)::bigint;
    return;
  end if;
  select coalesce(sum(r.amount), 0) into v_before from public.order_refunds r where r.order_id = p_order;
  v_amount := least(coalesce(p_amount, v_gross - v_before), v_gross - v_before);
  if v_amount > 0 then
    insert into public.order_refunds (order_id, refund_id, amount, refunded_at) values (p_order, p_refund, v_amount, p_at);
  end if;
  return query select greatest(v_amount, 0), v_before;
end $$;

-- Re-checks the payable balance under a per-seller lock, then writes the payout and its ledger debit in
-- one transaction. Returns null if the seller already has a live payout for this period.
create function public.create_payout(p_seller uuid, p_period text, p_gross bigint, p_fee bigint, p_now timestamptz)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_available bigint;
  v_id uuid;
begin
  perform pg_advisory_xact_lock(hashtextextended('payout:' || p_seller::text, 0));
  if exists (select 1 from public.payouts where seller_id = p_seller and period = p_period and status <> 'failed') then
    return null;
  end if;
  select coalesce(sum(amount) filter (where amount < 0 or available_at <= p_now), 0) into v_available
    from public.ledger_entries where seller_id = p_seller;
  if v_available <> p_gross then raise exception 'balanceChanged'; end if;
  insert into public.payouts (seller_id, period, gross, fee) values (p_seller, p_period, p_gross, p_fee) returning id into v_id;
  insert into public.ledger_entries (seller_id, kind, amount, available_at, source_key, payout_id)
    values (p_seller, 'payout', -p_gross, p_now, 'payout:' || v_id, v_id);
  return v_id;
end $$;

revoke execute on function public.ledger_sellers, public.match_purchase_intent, public.record_refund, public.create_payout from public, anon, authenticated;
revoke execute on function public.create_purchase_intent from public, anon;
grant execute on function public.create_purchase_intent to authenticated;
grant execute on function public.ledger_sellers, public.match_purchase_intent, public.record_refund, public.create_payout to service_role;

-- Monthly settlement: schedule with pg_cron + pg_net once the function is deployed, e.g.
--   select cron.schedule('settlement', '0 2 9 * *', $$ select net.http_post(
--     url := '<project>.supabase.co/functions/v1/settlement',
--     headers := jsonb_build_object('Authorization', 'Bearer ' || <secret from vault>)) $$);
-- The 9th leaves time for the previous month's refunds and the 30-day hold to settle.
