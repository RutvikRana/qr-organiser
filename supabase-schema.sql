-- Run this in Supabase: Dashboard → SQL Editor → New query → paste → Run

create table if not exists items (
  id text primary key,
  label text not null,
  location text,
  image_url text,
  images text[] not null default '{}',
  notes text,
  created_at timestamptz default now()
);

alter table items enable row level security;

create policy "public read items" on items for select using (true);
create policy "public insert items" on items for insert with check (true);
create policy "public update items" on items for update using (true);
create policy "public delete items" on items for delete using (true);

insert into storage.buckets (id, name, public)
values ('item-images', 'item-images', true)
on conflict (id) do nothing;

create policy "public read item images storage" on storage.objects
  for select using (bucket_id = 'item-images');
create policy "public upload item images storage" on storage.objects
  for insert with check (bucket_id = 'item-images');
create policy "public delete item images storage" on storage.objects
  for delete using (bucket_id = 'item-images');
create policy "public delete item images" on storage.objects
  for delete using (bucket_id = 'item-images');
