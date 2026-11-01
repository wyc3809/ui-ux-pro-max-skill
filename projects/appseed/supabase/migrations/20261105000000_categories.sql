-- Categories (docs/DESIGN.md §40). A listing's primary and optional secondary category live in `data`
-- (category, secondaryCategory) and are checked against src/lib/categories.ts by the studio function. Every
-- category has its own leaderboard and top charts, which read live listings by category, so both keys are indexed.
create index if not exists listings_category on public.listings (kind, (data->>'category')) where status = 'live';
create index if not exists listings_secondary_category on public.listings (kind, (data->>'secondaryCategory'))
  where status = 'live' and data ? 'secondaryCategory';
