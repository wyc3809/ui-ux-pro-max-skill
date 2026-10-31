-- Runs the payments migration's rules on a real Postgres: supabase/tests/run-sql.sh
\set ON_ERROR_STOP 1
set client_min_messages = warning;

insert into auth.users values
  ('00000000-0000-0000-0000-00000000000a'), -- seller
  ('00000000-0000-0000-0000-00000000000b'), -- buyer
  ('00000000-0000-0000-0000-00000000000c'); -- another seller

set role service_role;
insert into public.listings (slug, kind, owner_id, status, price) values ('demo-listing', 'template', '00000000-0000-0000-0000-00000000000a', 'live', 15800);
insert into public.listing_prices values ('demo-listing', '00000000-0000-0000-0000-00000000000a', 'tier_158', 15800, true);
insert into public.connect_accounts (seller_id, stripe_account_id, payouts_enabled) values ('00000000-0000-0000-0000-00000000000a', 'acct_demo', true);
insert into public.orders (provider, external_id, buyer_id, seller_id, listing_id, gross, channel_fee, platform_fee, seller_amount, purchased_at)
  values ('stripe', 'pi_1', '00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000a', 'demo-listing', 50000, 1935, 9613, 38452, '2026-09-01');
insert into public.ledger_entries (seller_id, kind, amount, available_at, source_key, order_id)
  select seller_id, 'sale', seller_amount, purchased_at + interval '30 days', 'sale:' || id, id from public.orders where external_id = 'pi_1';

do $$
declare v record; v_id uuid; v_again uuid;
begin
  -- Split must add up; a buyer cannot buy their own listing.
  begin
    insert into public.orders (provider, external_id, buyer_id, seller_id, listing_id, gross, channel_fee, platform_fee, seller_amount, purchased_at)
      values ('stripe', 'pi_bad', '00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000a', 'demo-listing', 100, 10, 10, 10, now());
    raise exception 'split check missing';
  exception when check_violation then null; end;

  -- Same source key twice is rejected (webhook replays insert with ON CONFLICT DO NOTHING).
  begin
    insert into public.ledger_entries (seller_id, kind, amount, available_at, source_key)
      select seller_id, 'sale', 1, now(), 'sale:' || id from public.orders;
    raise exception 'source_key not unique';
  exception when unique_violation then null; end;

  -- Append-only, even for the service role.
  begin
    update public.ledger_entries set amount = 1;
    raise exception 'ledger is editable';
  exception when raise_exception then
    if sqlerrm <> 'ledger_entries is append-only' then raise; end if;
  end;

  -- Balance: held before day 30, payable after.
  select * into v from public.seller_balance('00000000-0000-0000-0000-00000000000a', '2026-09-15');
  assert v.total = 38452 and v.available = 0 and v.pending = 38452, 'held balance';
  select * into v from public.seller_balance('00000000-0000-0000-0000-00000000000a', '2026-10-09');
  assert v.available = 38452 and v.pending = 0, 'payable balance';

  -- Payout re-checks the balance and is once per period.
  begin
    perform public.create_payout('00000000-0000-0000-0000-00000000000a', '2026-10', 99999, 0, '2026-10-09');
    raise exception 'stale balance accepted';
  exception when raise_exception then
    if sqlerrm <> 'balanceChanged' then raise; end if;
  end;
  v_id := public.create_payout('00000000-0000-0000-0000-00000000000a', '2026-10', 38452, 121, '2026-10-09');
  assert v_id is not null, 'payout created';
  assert (select net from public.payouts where id = v_id) = 38331, 'net = gross - fee';
  v_again := public.create_payout('00000000-0000-0000-0000-00000000000a', '2026-10', 0, 0, '2026-10-09');
  assert v_again is null, 'second payout in the same period';
  select * into v from public.seller_balance('00000000-0000-0000-0000-00000000000a', '2026-10-09');
  assert v.total = 0, 'payout debited';

  -- A failed payout frees the period for a retry.
  update public.payouts set status = 'failed' where id = v_id;
  insert into public.ledger_entries (seller_id, kind, amount, available_at, source_key, payout_id)
    values ('00000000-0000-0000-0000-00000000000a', 'payout_reversal', 38452, '2026-10-09', 'payout-reversal:' || v_id, v_id);
  assert public.create_payout('00000000-0000-0000-0000-00000000000a', '2026-10', 38452, 121, '2026-10-10') is not null, 'retry after failure';

  -- Refunds: recorded once, partial refunds never exceed the order.
  select * into v from public.record_refund((select id from public.orders where external_id = 'pi_1'), 're_1', 20000, now());
  assert v.amount = 20000 and v.refunded_before = 0, 'first refund';
  select * into v from public.record_refund((select id from public.orders where external_id = 'pi_1'), 're_2', null, now());
  assert v.amount = 30000 and v.refunded_before = 20000, 'refund the rest';
  select * into v from public.record_refund((select id from public.orders where external_id = 'pi_1'), 're_1', 20000, now());
  assert v.amount = 20000 and v.refunded_before = 0, 'replayed refund';
  select * into v from public.record_refund((select id from public.orders where external_id = 'pi_1'), 're_3', 5, now());
  assert v.amount = 0, 'nothing left to refund';
  assert (select count(*) from public.order_refunds where order_id = (select id from public.orders where external_id = 'pi_1')) = 2, 'two refund rows';
  assert (select array_agg(s) from public.ledger_sellers() s) = array['00000000-0000-0000-0000-00000000000a'::uuid], 'ledger sellers';
end $$;

-- Purchase intents: created by the buyer, claimed once per store transaction.
reset role;
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
select public.create_purchase_intent('demo-listing');
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
do $$ begin
  perform public.create_purchase_intent('demo-listing');
  raise exception 'self purchase allowed';
exception when raise_exception then
  if sqlerrm <> 'selfPurchase' then raise; end if;
end $$;

reset role;
set role service_role;
do $$
declare v record;
begin
  select * into v from public.match_purchase_intent('00000000-0000-0000-0000-00000000000b', 'tier_158', 'tx_1');
  assert v.listing_id = 'demo-listing' and v.seller_id = '00000000-0000-0000-0000-00000000000a', 'intent matched';
  select * into v from public.match_purchase_intent('00000000-0000-0000-0000-00000000000b', 'tier_158', 'tx_1');
  assert v.listing_id = 'demo-listing', 'same transaction, same intent';
  select * into v from public.match_purchase_intent('00000000-0000-0000-0000-00000000000b', 'tier_158', 'tx_2');
  assert v is null or v.listing_id is null, 'intent used only once';
end $$;

-- Row Level Security: sellers read only their own money; nobody else writes.
reset role;
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
do $$ begin
  assert (select count(*) from public.ledger_entries) = 0, 'other seller sees ledger';
  assert (select count(*) from public.payouts) = 0, 'other seller sees payouts';
  assert (select count(*) from public.orders) = 0, 'other seller sees orders';
  assert (select count(*) from public.listing_prices) >= 1, 'live listing prices are public';
  begin
    perform count(*) from public.webhook_events;
    raise exception 'webhook events readable';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.ledger_entries (seller_id, kind, amount, available_at, source_key)
      values ('00000000-0000-0000-0000-00000000000c', 'sale', 100, now(), 'forged');
    raise exception 'client wrote to ledger';
  exception when insufficient_privilege then null; end;
  begin
    perform public.create_payout('00000000-0000-0000-0000-00000000000c', '2026-10', 1, 0, now());
    raise exception 'client created payout';
  exception when insufficient_privilege then null; end;
  begin
    perform public.ledger_sellers();
    raise exception 'client listed sellers';
  exception when insufficient_privilege then null; end;
end $$;

set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
do $$ declare v record; begin
  assert (select count(*) from public.ledger_entries) > 0, 'seller sees own ledger';
  assert (select count(*) from public.orders) = 1, 'seller sees own sales';
  select * into v from public.seller_balance('00000000-0000-0000-0000-00000000000a');
  assert v.total = 0, 'seller balance through RLS';
  select * into v from public.seller_balance('00000000-0000-0000-0000-00000000000c');
  assert v.total = 0, 'cannot read another balance';
end $$;

set request.jwt.claim.sub = '';
set role anon;
do $$ begin
  assert (select count(*) from public.payouts) = 0, 'anon sees payouts';
  begin
    perform public.create_purchase_intent('demo-listing');
    raise exception 'anon created intent';
  exception when insufficient_privilege then null; end;
end $$;

reset role;
select 'payments_test: all passed' as result;
