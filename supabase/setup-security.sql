-- QR Organiser — secure the data with Supabase Auth + Row Level Security
-- Run this once in: Supabase Dashboard → SQL Editor → New query → paste → Run
--
-- What it does:
--   1. Enables RLS on `items` — WITHOUT this, the anon/publishable key can read
--      and write everything. This is the real lock; the login page is just the door.
--   2. Allows every signed-in user full access (this is a personal/family app).
--   3. Locks the `item-images` storage bucket the same way.

-- ---------- 1. Lock the items table ----------
alter table public.items enable row level security;

-- Drop old policies if re-running
drop policy if exists "authenticated full access" on public.items;

create policy "authenticated full access"
  on public.items
  for all
  to authenticated
  using (true)
  with check (true);

-- ---------- 2. Lock the item-images storage bucket ----------
-- (Skip any statement that errors with "already exists" if you re-run.)

insert into storage.buckets (id, name, public)
values ('item-images', 'item-images', true)
on conflict (id) do nothing;

-- Drop old policies if re-running
drop policy if exists "authenticated can read item images" on storage.objects;
drop policy if exists "authenticated can upload item images" on storage.objects;
drop policy if exists "authenticated can update item images" on storage.objects;
drop policy if exists "authenticated can delete item images" on storage.objects;

create policy "authenticated can read item images"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'item-images');

create policy "authenticated can upload item images"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'item-images');

create policy "authenticated can update item images"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'item-images')
  with check (bucket_id = 'item-images');

create policy "authenticated can delete item images"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'item-images');

-- ---------- 3. Done. ----------
-- After running this, create your account:
--   Dashboard → Authentication → Users → "Add user" → Create new user
--   (enter your email + a strong password, tick "Auto Confirm User")
--
-- Then close the front door to strangers:
--   Dashboard → Authentication → Sign In / Providers → Email
--   → turn OFF "Allow new users to sign up"
-- (Do this AFTER creating your own account, or you'll lock yourself out.)
