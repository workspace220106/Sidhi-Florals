# Sidhi Florals

Billing, inventory and bouquet management for Sidhi Florals. Vite + React + Tailwind on the front, Supabase Postgres behind it — no API server, so the app opens in about a second.

## Run locally
1. `npm install`
2. Copy `.env.example` to `.env` and fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (Supabase → Project Settings → API). The `.env` for the `sidhi-florals` project is already in place on this machine.
3. `npm run dev`

## Database
Supabase project **sidhi-florals** (ref `jdgshudtqymneaaiabxm`, region ap-south-1). Migrations live in `supabase/migrations/` and are applied in this order: `0001_schema.sql`, `0003_views.sql`, `0002_functions.sql`, `0004_seed.sql` (seed is optional). They are already applied to the project.

There is **no login**: the anon key has full read/write access. Keep the URL private.

## Shop details on receipts
Edit `src/config/shop.ts` (name, tagline, address, phone, GSTIN, footer).

## Deploy (Vercel)
Import the repo, framework "Vite", add the two `VITE_*` environment variables, deploy. `vercel.json` routes all paths to `index.html`.

## Scripts
- `npm run dev` / `npm run build` / `npm run preview`
- `npm test` — Vitest (cart & bouquet math, BouquetBuilder)
- `npm run typecheck`
- `node scripts/make-icons.mjs` — regenerate PWA icons

## Features
Dashboard · Billing (flowers, ready bouquets with "can make N", custom bouquet builder, discounts, credit sales) · Inventory (stock, bouquet recipes, profit margins) · Customers + purchase history · Sales history · Reports (5 charts) · Credits & Dues · Receipt print / WhatsApp PDF · Calculator · PWA install.
