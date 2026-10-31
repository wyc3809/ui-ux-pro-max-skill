-- Accounts, catalogue, content and purchases rules on a real Postgres: supabase/tests/run-sql.sh
\set ON_ERROR_STOP 1
set client_min_messages = warning;

-- d1 seller, d2 buyer, d3 someone else, d4 signed up but no profile yet.
insert into auth.users values
  ('00000000-0000-0000-0000-0000000000d1'), ('00000000-0000-0000-0000-0000000000d2'),
  ('00000000-0000-0000-0000-0000000000d3'), ('00000000-0000-0000-0000-0000000000d4');

set role service_role;
do $$
begin
  perform public.content_complete_profile('00000000-0000-0000-0000-0000000000d1', 'demo-seller', 'Demo Seller', 2, 2);
  perform public.content_complete_profile('00000000-0000-0000-0000-0000000000d2', 'demo-buyer', 'Demo Buyer', 2, 2);
  perform public.content_complete_profile('00000000-0000-0000-0000-0000000000d3', 'demo-other', 'Demo Other', 2, 2);

  begin
    perform public.content_complete_profile('00000000-0000-0000-0000-0000000000d4', 'demo-buyer', 'Dup', 2, 2);
    raise exception 'duplicate handle accepted';
  exception when raise_exception then if sqlerrm <> 'handleTaken' then raise; end if; end;
  begin
    perform public.content_complete_profile('00000000-0000-0000-0000-0000000000d4', 'demo-new', 'New', 1, 2);
    raise exception 'old terms accepted';
  exception when raise_exception then if sqlerrm <> 'termsRequired' then raise; end if; end;
  begin
    perform public.content_complete_profile('00000000-0000-0000-0000-0000000000d4', 'admin', 'New', 2, 2);
    raise exception 'reserved handle accepted';
  exception when check_violation then null; end;
  begin
    perform public.content_complete_profile('00000000-0000-0000-0000-0000000000d1', 'demo-again', 'Again', 2, 2);
    raise exception 'second profile accepted';
  exception when raise_exception then if sqlerrm <> 'profileExists' then raise; end if; end;
end $$;

insert into public.listings (slug, kind, owner_id, status, price, data) values
  ('demo-tpl', 'template', '00000000-0000-0000-0000-0000000000d1', 'live', 15800, '{"name": "Demo template"}'),
  ('demo-tpl-2', 'template', '00000000-0000-0000-0000-0000000000d1', 'live', 7800, '{}'),
  ('demo-prompt', 'prompt', '00000000-0000-0000-0000-0000000000d1', 'live', 3800, '{}'),
  ('demo-free', 'template', '00000000-0000-0000-0000-0000000000d1', 'live', 0, '{}'),
  ('demo-launch', 'launch', '00000000-0000-0000-0000-0000000000d1', 'live', 0, '{}'),
  ('demo-buyout', 'buyout', '00000000-0000-0000-0000-0000000000d1', 'live', 0, '{}'),
  ('demo-draft', 'template', '00000000-0000-0000-0000-0000000000d1', 'draft', 5800, '{}'),
  ('demo-other-tpl', 'template', '00000000-0000-0000-0000-0000000000d3', 'live', 5800, '{}');
insert into public.prompt_texts values ('demo-prompt', 'Full prompt text only owners can read.');

do $$
declare v_post uuid; v_id uuid;
begin
  -- Buyouts and launches are never priced in the app.
  begin
    insert into public.listings (slug, kind, owner_id, price) values ('demo-paid-launch', 'launch', '00000000-0000-0000-0000-0000000000d1', 100);
    raise exception 'priced launch accepted';
  exception when check_violation then null; end;

  -- Promotion: own live listings only, 3 a day; replies drop attachments.
  for i in 1..3 loop
    perform public.content_create_post('00000000-0000-0000-0000-0000000000d1', 'Look at this ' || i, null, 'template', 'demo-tpl', 2, 3);
  end loop;
  begin
    perform public.content_create_post('00000000-0000-0000-0000-0000000000d1', 'One more', null, 'template', 'demo-tpl-2', 2, 3);
    raise exception 'fourth promo accepted';
  exception when raise_exception then if sqlerrm <> 'promoLimit' then raise; end if; end;
  begin
    perform public.content_create_post('00000000-0000-0000-0000-0000000000d2', 'Not mine', null, 'template', 'demo-tpl', 2, 3);
    raise exception 'promoted someone else''s listing';
  exception when raise_exception then if sqlerrm <> 'notYourListing' then raise; end if; end;
  begin
    perform public.content_create_post('00000000-0000-0000-0000-0000000000d1', 'Draft', null, 'template', 'demo-draft', 2, 99);
    raise exception 'promoted a draft';
  exception when raise_exception then if sqlerrm <> 'notYourListing' then raise; end if; end;
  -- A plain post is never limited.
  v_post := public.content_create_post('00000000-0000-0000-0000-0000000000d1', '  Plain post  ', null, null, null, 2, 3);
  assert (select body from public.posts where id = v_post) = 'Plain post', 'body trimmed';
  v_id := public.content_create_post('00000000-0000-0000-0000-0000000000d2', 'Reply', v_post, 'template', 'demo-tpl', 2, 3);
  assert (select attachment_slug is null and parent_id = v_post from public.posts where id = v_id), 'reply has no attachment';

  -- A newer terms version blocks publishing until accepted.
  begin
    perform public.content_create_post('00000000-0000-0000-0000-0000000000d2', 'Hi', null, null, null, 3, 3);
    raise exception 'old terms could post';
  exception when raise_exception then if sqlerrm <> 'termsRequired' then raise; end if; end;
  begin
    perform public.content_post_comment('00000000-0000-0000-0000-0000000000d4', 'demo-tpl', 'No profile', 2);
    raise exception 'comment without profile';
  exception when raise_exception then if sqlerrm <> 'profileRequired' then raise; end if; end;
  perform public.content_post_comment('00000000-0000-0000-0000-0000000000d2', 'demo-tpl', 'Nice', 2);
  begin
    perform public.content_post_comment('00000000-0000-0000-0000-0000000000d2', 'Bad Key!', 'x', 2);
    raise exception 'bad item key accepted';
  exception when check_violation then null; end;

  -- Offers: live buyouts of someone else, one per buyer (a new offer replaces it).
  perform public.content_make_offer('00000000-0000-0000-0000-0000000000d2', 'demo-buyout', 15000000, 'Interested', 2);
  perform public.content_make_offer('00000000-0000-0000-0000-0000000000d2', 'demo-buyout', 16000000, 'Raised', 2);
  assert (select amount from public.offers where buyer_id = '00000000-0000-0000-0000-0000000000d2') = 16000000, 'offer replaced';
  begin
    perform public.content_make_offer('00000000-0000-0000-0000-0000000000d1', 'demo-buyout', 1, '', 2);
    raise exception 'offer on own buyout';
  exception when raise_exception then if sqlerrm <> 'notFound' then raise; end if; end;

  -- A sale of the prompt to d2.
  insert into public.listing_prices values ('demo-prompt', '00000000-0000-0000-0000-0000000000d1', 'tier_38', 3800, true);
  insert into public.orders (provider, external_id, buyer_id, seller_id, listing_id, gross, channel_fee, platform_fee, seller_amount, purchased_at)
    values ('stripe', 'pi_core', '00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000d1', 'demo-prompt', 3800, 364, 687, 2749, now());
end $$;

-- Buyer: owns what they paid for, reads its prompt text, claims free items only.
reset role;
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000d2';
do $$ begin
  assert (select array_agg(slug) from public.my_purchases()) = array['demo-prompt'], 'paid prompt owned';
  assert (select count(*) from public.prompt_texts) = 1, 'owner reads prompt text';
  perform public.claim_free('demo-free');
  assert (select count(*) from public.my_purchases()) = 2, 'free claim owned';
  begin
    perform public.claim_free('demo-tpl');
    raise exception 'claimed a paid template';
  exception when raise_exception then if sqlerrm <> 'notFree' then raise; end if; end;
  begin
    perform public.owns('00000000-0000-0000-0000-0000000000d3', 'demo-other-tpl');
    raise exception 'asked about someone else''s purchases';
  exception when insufficient_privilege then null; end;

  -- Reactions as yourself only; your own like shows in the feed.
  insert into public.post_likes (post_id, user_id) select id, auth.uid() from public.posts where body = 'Plain post';
  assert (select liked and likes = 1 and replies = 1 from public.post_feed where body = 'Plain post'), 'feed counts and own like';
  begin
    insert into public.post_likes (post_id, user_id) select id, '00000000-0000-0000-0000-0000000000d3' from public.posts where body = 'Plain post';
    raise exception 'liked as someone else';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.posts (author_id, body) values (auth.uid(), 'Bypassing the content function');
    raise exception 'wrote a post directly';
  exception when insufficient_privilege then null; end;
  insert into public.launch_votes (slug, user_id) values ('demo-launch', auth.uid());
  insert into public.blocks (blocker_id, blocked_id) values (auth.uid(), '00000000-0000-0000-0000-0000000000d3');
  perform public.record_share('launch:demo-launch');
  assert (select upvotes = 1 and shares = 1 from public.launch_stats where slug = 'demo-launch'), 'launch stats';
  assert (select liked = false and comments = 1 from public.engagement('demo-tpl')), 'engagement';

  -- Reports: as yourself, IP claims need detail and contact, nobody reads them back.
  insert into public.reports (reporter_id, target_kind, target_id, reason) values (auth.uid(), 'post', 'x', 'spam');
  begin
    insert into public.reports (reporter_id, target_kind, target_id, reason) values (auth.uid(), 'listing', 'demo-tpl', 'ip');
    raise exception 'IP claim without detail';
  exception when check_violation then null; end;
  begin
    insert into public.reports (reporter_id, target_kind, target_id, reason) values ('00000000-0000-0000-0000-0000000000d3', 'post', 'x', 'spam');
    raise exception 'reported as someone else';
  exception when insufficient_privilege then null; end;
  begin
    perform count(*) from public.reports;
    raise exception 'reports readable';
  exception when insufficient_privilege then null; end;
  assert (select count(*) from public.offers) = 1, 'own offer visible';
end $$;

-- Seller: sees drafts and offers on their buyout; cannot vote for their own launch.
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000d1';
do $$ begin
  assert (select count(*) from public.listings where status = 'draft') = 1, 'owner sees own draft';
  assert (select count(*) from public.offers) = 1, 'seller sees offers';
  assert (select count(*) from public.prompt_texts) = 1, 'seller reads own prompt text';
  begin
    insert into public.launch_votes (slug, user_id) values ('demo-launch', auth.uid());
    raise exception 'voted for own launch';
  exception when insufficient_privilege then null; end;
end $$;

-- Someone else: no prompt text, no offers, no drafts.
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000d3';
do $$ begin
  assert (select count(*) from public.prompt_texts) = 0, 'non-owner reads prompt text';
  assert (select count(*) from public.offers) = 0, 'sees others'' offers';
  assert (select count(*) from public.my_purchases()) = 0, 'owns nothing';
  assert (select count(*) from public.blocks) = 0, 'sees others'' blocks';
end $$;

-- Guests: browse live listings, view counts, report; nothing else.
set request.jwt.claim.sub = '';
set role anon;
do $$ begin
  assert (select count(*) from public.listings where slug = 'demo-draft') = 0, 'guest sees draft';
  assert (select count(*) from public.listings) = 7, 'guest sees live listings';
  perform public.record_view('demo-tpl');
  insert into public.reports (target_kind, target_id, reason) values ('listing', 'demo-tpl', 'scam');
  begin
    perform public.record_share('demo-tpl');
    raise exception 'guest share counted';
  exception when insufficient_privilege then null; end;
  begin
    perform public.my_purchases();
    raise exception 'guest purchases';
  exception when insufficient_privilege then null; end;
end $$;

-- Refund and account deletion.
reset role;
set role service_role;
do $$ begin
  perform public.record_refund((select id from public.orders where external_id = 'pi_core'), 're_core', null, now());
  assert not public.owns('00000000-0000-0000-0000-0000000000d2', 'demo-prompt'), 'refund removes access';
  assert public.owns('00000000-0000-0000-0000-0000000000d2', 'demo-free'), 'free claim kept';

  perform public.content_delete_account('00000000-0000-0000-0000-0000000000d2');
  assert (select deleted_at is not null and name = 'deleted' from public.profiles where id = '00000000-0000-0000-0000-0000000000d2'), 'profile wiped';
  assert (select count(*) from public.posts where author_id = '00000000-0000-0000-0000-0000000000d2') = 0, 'posts removed';
  assert (select count(*) from public.orders where buyer_id = '00000000-0000-0000-0000-0000000000d2') = 1, 'order kept for accounting';
end $$;
set role anon;
do $$ begin
  assert (select count(*) from public.profiles where handle = 'demo-buyer') = 0, 'deleted profile hidden';
end $$;

reset role;
select 'core_test: all passed' as result;
