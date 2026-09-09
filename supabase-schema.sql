-- Run this in Supabase: Dashboard → SQL Editor → New query → paste → Run

create table if not exists items (
  id text primary key,           -- the value printed/encoded in the QR sticker, e.g. '12300'
  label text not null,
  location text,
  image_url text,
  notes text,
  created_at timestamptz default now()
);

alter table items enable row level security;

-- No login screen in this first version, so keep access open to anyone
-- holding your anon key. Fine for personal use; tighten later if needed.
create policy "public read items" on items for select using (true);
create policy "public insert items" on items for insert with check (true);
create policy "public update items" on items for update using (true);
create policy "public delete items" on items for delete using (true);

-- Storage bucket for item photos.
-- Easiest to create this via Dashboard → Storage → New bucket → name it
-- "item-images" → toggle "Public bucket" ON. (Public just means anyone with
-- the exact file URL can view it — fine for personal photos of your stuff,
-- and simplest for a first version.) The SQL below does the same thing if
-- you'd rather run it than click through the UI.
insert into storage.buckets (id, name, public)
values ('item-images', 'item-images', true)
on conflict (id) do nothing;

create policy "public read item images" on storage.objects
  for select using (bucket_id = 'item-images');
create policy "public upload item images" on storage.objects
  for insert with check (bucket_id = 'item-images');
