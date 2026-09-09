# Box Organiser

Scan a QR sticker on a box → see (and edit) what's inside. React + Vite PWA, Supabase backend.

## What's already built
- `/` — list of all items
- `/scan` — opens your camera, reads a QR code
  - known ID → jumps straight to that item
  - unknown ID → takes you to a form to register it (label, location, photo, notes)
- `/item/:id` — view, edit, or delete an item; supports a photo upload
- Installable as a PWA (Add to Home Screen) via `vite-plugin-pwa`

**Data model:** one flat `items` table — `id` (the value encoded in the QR sticker, e.g. `12300`), `label`, `location`, `image_url`, `notes`, `created_at`.

## 1. Install dependencies
```bash
cd qr-organiser
npm install
```

## 2. Create your Supabase project
1. Go to supabase.com → New project (free tier is fine).
2. Once it's created, open **SQL Editor** → paste the contents of `supabase-schema.sql` → Run. This creates the `items` table and the `item-images` storage bucket for photos.
3. Go to **Project Settings → API** and copy:
   - `Project URL`
   - `anon public` key

## 3. Add your keys
```bash
cp .env.example .env
```
Paste your URL and anon key into `.env`.

## 4. Run it locally
```bash
npm run dev
```
Open the printed `localhost` URL. Camera access needs HTTPS or `localhost` — both work fine for dev.

### Testing the camera on your phone
Vite is set to `host: true`, so on your phone (same WiFi) visit `http://<your-computer-ip>:5173`.
⚠️ Most mobile browsers only allow camera access over HTTPS, `localhost`, or `127.0.0.1` — plain `http://192.168.x.x` may get blocked. Once deployed (step 6) this isn't an issue, since your deploy URL is HTTPS.

## 5. Print your QR stickers
Any QR generator works (e.g. `qr-code-generator.com` or the `qrcode` npm package). Encode a short unique ID per item — doesn't need to be pretty, e.g.:
```
12300
12301
12302
```
Print and stick these on your items/boxes now. The app looks up whatever value is inside the code as the item's `id`, so the code itself can be as ugly as you want. You can also add an item manually from `/item/new?id=12300` without scanning anything first.

## 6. Deploy (so it works away from your laptop)
Push this folder to a GitHub repo, then:
1. Go to vercel.com → New Project → import the repo.
2. Add the same two env vars (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) in Vercel's project settings.
3. Deploy. You'll get a URL like `qr-organiser.vercel.app`.
4. Open it on your phone → browser menu → **Add to Home Screen**. It now behaves like an installed app.

## Notes / next steps
- **Photos**: already wired in — uploads go to the `item-images` Supabase Storage bucket, and the public URL is saved to `items.image_url`.
- **Security**: there's no login yet, so anyone with your public URL + anon key could read/write your items. Fine for personal use behind an obscure URL; add Supabase Auth later if you want it locked down.
- **Icons**: `vite.config.js` references `icon-192.png` / `icon-512.png` for the PWA manifest — drop any square PNGs with those names into `/public` before deploying, or the "Add to Home Screen" icon will look blank.
