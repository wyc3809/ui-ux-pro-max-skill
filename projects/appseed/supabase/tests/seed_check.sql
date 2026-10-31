-- Loaded after supabase/seed.sql in its own database (run-sql.sh): the demo catalogue is complete and safe.
\set ON_ERROR_STOP 1
do $$ begin
  assert (select count(*) from public.listings where kind = 'template') > 0, 'templates seeded';
  assert (select count(*) from public.listings where kind = 'prompt') = (select count(*) from public.prompt_texts), 'every prompt has its text';
  assert not exists (select 1 from public.listings l where l.kind in ('template', 'prompt') and l.price > 0
                     and not exists (select 1 from public.listing_prices p where p.listing_id = l.slug)), 'every paid listing has a price tier';
  assert not exists (select 1 from public.listings l join public.prompt_texts t on t.slug = l.slug
                     where l.price > 0 and l.data->>'text' = t.text and t.text like '%' || chr(10) || '%'), 'paid prompt text exposed';
end $$;
set role anon;
do $$ begin
  assert (select count(*) from public.prompt_texts) = 0, 'guests read prompt text';
  assert (select count(*) from public.profiles) > 0, 'demo creators public';
end $$;
reset role;
select 'seed_check: all passed' as result;
