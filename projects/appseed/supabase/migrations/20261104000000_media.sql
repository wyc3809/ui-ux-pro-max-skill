-- Listing media (docs/DESIGN.md §39): app icons, screenshots and preview videos are public images that appear on
-- listings, so they live in a public bucket. Uploads only happen through URLs the studio function signs after
-- checking lib/media.ts rules, into a folder named after the uploader; listings may only reference files in the
-- uploader's own folder (studio.ts cleanMedia), and nothing appears publicly before staff review.
insert into storage.buckets (id, name, public) values ('media', 'media', true) on conflict (id) do nothing;

-- On Supabase, also let Storage itself enforce the size and type limits (50 MB = the video limit).
do $$ begin
  if exists (select 1 from information_schema.columns where table_schema = 'storage' and table_name = 'buckets' and column_name = 'file_size_limit') then
    execute $q$update storage.buckets set file_size_limit = 52428800,
      allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp', 'video/mp4', 'video/quicktime'] where id = 'media'$q$;
  end if;
end $$;
