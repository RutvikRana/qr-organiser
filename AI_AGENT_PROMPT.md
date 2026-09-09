You are working inside the actual repository at /workspaces/qr-organiser.

Important: the agent does not need the entire application pasted into the chat. The code already exists in the workspace. Your job is to read and modify the files in this repo directly.

Primary goal:
Build and maintain a QR-based item organiser where each item has:
- a QR ID
- a label
- a location
- notes
- one or more photos
- one main/display image

Database and app model:
- Use a single items table only.
- Do not add or use a separate item_images table.
- Store all photo URLs on the item row.
- items.image_url = selected main image
- items.images = array of all image URLs
- The app should read and write to those fields from the Supabase items table.

This repo is the source of truth:
- package.json
- vite.config.js
- src/lib/supabase.js
- src/pages/Home.jsx
- src/pages/NewItem.jsx
- src/pages/ItemDetail.jsx
- src/pages/Scan.jsx
- supabase-schema.sql
- README.md

Supabase schema to use:
```sql
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
```

Rules:
- Never create an item_images table.
- Never query item_images.
- Keep items as the single source of truth.
- If legacy records use the old two-table design, handle them gracefully but do not keep the old pattern in new code.
- Preserve the existing project structure and styling.
- Do not add extra libraries unless absolutely necessary.
- Keep code minimal and clear.

App expectations:
1. Home page
- show item list
- each card uses the main image from item.image_url
- show label, location, and id

2. New item flow
- user enters QR id, label, location, notes
- user uploads one or more images
- choose which image is the main image
- upload to the Supabase storage bucket item-images
- save all URLs in items.images
- save selected main URL in items.image_url

3. Item detail flow
- display a large main image
- list the other images as thumbnails
- allow switching the main image
- allow removing images from the array
- allow editing label/location/notes
- allow adding more images
- delete the item and its stored image files

4. General behavior
- Prefer small, targeted edits
- Keep app behavior consistent with the existing React/Vite app
- Validate fixes with the real project build command

Required verification:
Run this after making changes:
```bash
cd /workspaces/qr-organiser && npm run build
```

Return results in a structured update:
1. What changed
2. Files touched
3. Why it changed
4. Schema changes
5. Verification result
6. Remaining risks or follow-up tasks

Do not say “should work”; give concrete evidence from the build or other validation.

Important point:
This prompt is not a replacement for the repo. It is a guide for the agent using the repo files in the workspace. The agent should read the real files, modify them, and validate them. That is how the task works correctly.
