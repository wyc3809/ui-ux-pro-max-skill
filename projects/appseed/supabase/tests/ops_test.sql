-- Staff review, holds, blocks and error reports on a real Postgres: supabase/tests/run-sql.sh
\set ON_ERROR_STOP 1
set client_min_messages = warning;

insert into auth.users values ('00000000-0000-0000-0000-0000000000f1'), ('00000000-0000-0000-0000-0000000000f2'), ('00000000-0000-0000-0000-0000000000f3');
set role service_role;
insert into public.staff values ('00000000-0000-0000-0000-0000000000f3', 'moderator', now());
do $$ declare v_post uuid; v_report uuid; begin
  perform public.content_complete_profile('00000000-0000-0000-0000-0000000000f1', 'ops-maker', 'Ops Maker', 2, 2);
  perform public.content_complete_profile('00000000-0000-0000-0000-0000000000f2', 'ops-troll', 'Ops Troll', 2, 2);

  -- An unsure classifier verdict hides the post and queues it.
  v_post := public.content_create_post('00000000-0000-0000-0000-0000000000f2', 'Borderline', null, null, null, 2, 3);
  perform public.moderation_hold('post', v_post, 'classifier');
  assert (select hidden_at is not null from public.posts where id = v_post), 'held post hidden';
  select id into v_report from public.admin_report_queue() where target_id = v_post::text;
  assert v_report is not null, 'held post queued';
  -- A person finds it fine: restored, report closed, action logged.
  perform public.admin_resolve_report('00000000-0000-0000-0000-0000000000f3', v_report, 'restore', 'fine');
  assert (select hidden_at is null from public.posts where id = v_post), 'restored';
  assert (select status from public.reports where id = v_report) = 'dismissed', 'report closed';
  assert (select count(*) from public.admin_actions where target = 'post:' || v_post) = 1, 'audited';
  begin
    update public.admin_actions set note = 'tampered';
    raise exception 'audit log editable';
  exception when raise_exception then if sqlerrm <> 'ledger_entries is append-only' then raise; end if; end;

  -- Listing review: approval makes a paid listing buyable on its tier.
  perform public.studio_submit_listing('00000000-0000-0000-0000-0000000000f1', 'ops-tpl', 'template', 15800, '{"name": "Ops template"}', 2);
  assert (select count(*) from public.admin_listing_queue() where slug = 'ops-tpl') = 1, 'in review queue';
  perform public.admin_review_listing('00000000-0000-0000-0000-0000000000f3', 'ops-tpl', true, '');
  assert (select status from public.listings where slug = 'ops-tpl') = 'live', 'approved';
  assert (select product_id from public.listing_prices where listing_id = 'ops-tpl') = 'tier_158', 'priced on tier';

  -- Suspension hides everything the person wrote.
  perform public.content_create_post('00000000-0000-0000-0000-0000000000f2', 'More trolling', null, null, null, 2, 3);
  perform public.admin_suspend('00000000-0000-0000-0000-0000000000f3', 'ops-troll', 'abuse');
  assert (select count(*) from public.posts where author_id = '00000000-0000-0000-0000-0000000000f2' and hidden_at is null) = 0, 'all hidden';
end $$;

reset role;
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000f1';
do $$ begin
  perform public.block_handle('ops-troll');
  perform public.block_handle('ops-maker');
  assert (select array_agg(h) from public.my_blocks() h) = array['ops-troll'], 'blocked by handle, never yourself';
  perform public.unblock_handle('ops-troll');
  assert (select count(*) from public.my_blocks()) = 0, 'unblocked';
  assert (select count(*) from public.staff) = 0, 'not staff';
  begin
    perform public.admin_report_queue();
    raise exception 'non-staff read the queue';
  exception when insufficient_privilege then null; end;
end $$;

set request.jwt.claim.sub = '';
set role anon;
insert into public.client_errors (platform, app_version, route, message) values ('web', '0.1.0', '/template/x', 'TypeError: x is undefined');
do $$ begin
  begin
    perform count(*) from public.client_errors;
    raise exception 'error reports readable';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.client_errors (platform, app_version, message) values ('web', '0.1.0', repeat('x', 501));
    raise exception 'oversized report accepted';
  exception when check_violation then null; end;
end $$;

reset role;
select 'ops_test: all passed' as result;
