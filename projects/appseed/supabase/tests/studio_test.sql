-- Listing submission and creator analytics on a real Postgres: supabase/tests/run-sql.sh
\set ON_ERROR_STOP 1
set client_min_messages = warning;

insert into auth.users values ('00000000-0000-0000-0000-0000000000e1'), ('00000000-0000-0000-0000-0000000000e2');
set role service_role;
do $$ begin
  perform public.content_complete_profile('00000000-0000-0000-0000-0000000000e1', 'studio-maker', 'Studio Maker', 2, 2);
  perform public.content_complete_profile('00000000-0000-0000-0000-0000000000e2', 'studio-fan', 'Studio Fan', 2, 2);

  -- Submitted listings land in review, attested.
  perform public.studio_submit_listing('00000000-0000-0000-0000-0000000000e1', 'studio-tpl', 'template', 7800, '{"name": "Studio template"}', 2);
  assert (select status = 'review' and attested_at is not null from public.listings where slug = 'studio-tpl'), 'in review, attested';
  begin
    perform public.studio_submit_listing('00000000-0000-0000-0000-0000000000e1', 'studio-tpl', 'template', 7800, '{}', 2);
    raise exception 'duplicate slug accepted';
  exception when unique_violation then null; end;
  begin
    perform public.studio_submit_listing('00000000-0000-0000-0000-0000000000e1', 'studio-new', 'template', 7800, '{}', 3);
    raise exception 'old terms could submit';
  exception when raise_exception then if sqlerrm <> 'termsRequired' then raise; end if; end;
  -- No listing goes live without attestation, even written directly.
  begin
    insert into public.listings (slug, kind, owner_id, status) values ('studio-sneaky', 'template', '00000000-0000-0000-0000-0000000000e1', 'live');
    raise exception 'live without attestation';
  exception when check_violation then null; end;
  update public.listings set status = 'live' where slug = 'studio-tpl';
end $$;

reset role;
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000e2';
do $$ begin
  perform public.record_view('studio-tpl');
  perform public.record_view('studio-tpl');
  perform public.record_share('studio-tpl');
  insert into public.item_likes (item_key, user_id) values ('studio-tpl', auth.uid());
  -- Fans cannot read anyone's daily numbers.
  begin
    perform count(*) from public.item_daily;
    raise exception 'daily stats readable';
  exception when insufficient_privilege then null; end;
  assert (select count(*) from public.creator_daily(7)) = 0, 'fan has no listings';
end $$;

set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000e1';
do $$ declare v record; begin
  select * into v from public.creator_daily(7) where day = public.hk_today();
  assert v.slug = 'studio-tpl' and v.views = 2 and v.shares = 1 and v.likes = 1 and v.units = 0, 'today''s stats';
  assert (select count(*) from public.creator_daily(30)) = 30, 'one row per day';
  assert (select status from public.my_listings() where slug = 'studio-tpl') = 'live', 'studio list';
end $$;

reset role;
select 'studio_test: all passed' as result;
