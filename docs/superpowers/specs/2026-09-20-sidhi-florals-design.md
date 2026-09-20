# Sidhi Florals — Design Spec

Date: 2026-09-20
Status: approved by user in brainstorming session

## 1. Goal

Rebuild the Aakash-Enterprises goods-management app (`C:\Users\araji\AI\Aakash-Enterprises`) as **Sidhi Florals**, a flower-shop billing and inventory app with the same features, a floral visual identity with light animations, and a much faster first load.

Reference app features to preserve: Dashboard, Quick Billing (POS), Inventory + Profit Margins, Customers + purchase history, Sales History, Reports (5 charts), Credits & Dues, Receipt (print / PDF / WhatsApp share), floating Calculator, PWA install, mobile layout.

## 2. Why the reference app is slow (and what changes)

| Cause | Fix |
|---|---|
| Express API on Render free tier spins down; first hit waits 30–60 s | No API server. Browser calls Supabase directly. |
| ~50 dependencies, mostly unused; all pages imported eagerly | Only used deps; route-level code splitting. |
| `backdrop-blur-xl` on every panel; giant blurred pulsing background image | Solid cards; no large blur; CSS transform/opacity-only effects. |
| Two render-blocking Google Font requests; global spinner until two API calls finish | Self-hosted woff2 subsets with `font-display: swap`; per-widget skeletons; persisted query cache. |

## 3. Decisions made with the user

- **Backend:** Supabase Postgres called directly from the browser (`@supabase/supabase-js`). No Express, no Vercel functions.
- **Products:** individual flowers tracked by unit; ready-made bouquets defined by a **recipe** of flowers/accessories; **custom bouquets** assembled at billing time from flowers.
- **Bouquet stock:** bouquets have no stock of their own. Availability = min over recipe components. Selling one deducts its components.
- **Auth:** none (same as Aakash). RLS enabled with a policy granting the anon key full read/write. Anyone with the URL can use and modify data. User accepted this risk.

## 4. Architecture

```
Browser — Vite + React 19 + Tailwind 4 SPA (Vercel static)
   │  @supabase/supabase-js
   ▼
Supabase project (new): tables + RPC functions + SQL views
```

Single package at repo root (no pnpm monorepo, no OpenAPI/Orval codegen).

### Dependencies (runtime)

`react`, `react-dom`, `wouter`, `@tanstack/react-query`, `@tanstack/react-query-persist-client`, `@tanstack/query-async-storage-persister` (IndexedDB via `idb-keyval`), `@supabase/supabase-js`, `motion` (framer-motion v12), `recharts`, `jspdf`, `lucide-react`, `clsx`, `tailwind-merge`, `sonner` (toasts), `@radix-ui/react-dialog`. Dev: `vite`, `@vitejs/plugin-react`, `@tailwindcss/vite`, `typescript`, `vitest`, `@testing-library/react`.

### Source layout

```
src/
  main.tsx, App.tsx (routes, providers, lazy imports)
  config/shop.ts            # name, tagline, address, phone, GSTIN for receipts
  lib/supabase.ts           # client
  lib/utils.ts              # cn, formatCurrency, formatNumber
  lib/cart.ts               # pure cart math (tested)
  lib/bouquet.ts            # availability + cost math (tested)
  api/                      # one file per domain: products, customers, sales, analytics
                            # each exports query fns + react-query hooks + query keys
  components/layout/        # AppLayout, Sidebar, MobileHeader
  components/ui/            # Dialog, Sheet, Button, Input, Skeleton, Toast
  components/PetalField.tsx # dashboard background petals
  components/ReceiptDialog.tsx
  components/CalculatorWidget.tsx
  components/BouquetBuilder.tsx   # shared by Billing (custom) and Inventory (recipe)
  pages/ Dashboard, Billing, Inventory, Customers, Sales, Reports, Credits, NotFound
supabase/
  migrations/0001_schema.sql, 0002_functions.sql, 0003_views.sql, 0004_seed.sql
public/ manifest.json, sw.js, icons, fonts/
```

## 5. Data model (Postgres)

### Tables

**products**
`id serial pk, name text, variety text default '', unit text, category text check in ('flower','bouquet','accessory'), purchase_price numeric(10,2), selling_price numeric(10,2), stock integer default 0, supplier text default '', created_at timestamptz default now()`
- `flower`: stock in `unit` (stem, bunch, kg, dozen).
- `accessory`: wrap, ribbon, card — has stock.
- `bouquet`: `stock` ignored; `purchase_price` ignored (cost derives from recipe). `unit` = 'piece'.

**bouquet_recipes**
`id serial pk, bouquet_id int → products on delete cascade, component_id int → products on delete restrict, quantity integer > 0, unique(bouquet_id, component_id)`

**customers**
`id serial pk, name text, phone text, business text default '', address text default '', notes text default '', created_at timestamptz`

**sales**
`id serial pk, customer_id int → customers on delete set null, total numeric(10,2), amount_paid numeric(10,2), notes text, date timestamptz default now()`

**sale_items**
`id serial pk, sale_id int → sales on delete cascade, product_id int → products on delete set null, name text, kind text check in ('product','custom_bouquet'), quantity integer, price numeric(10,2), total numeric(10,2), unit_cost numeric(10,2)`
- `name` snapshotted at sale time.
- `unit_cost` = purchase price (product) or Σ component cost (bouquet / custom) — enables profit reports without recomputation.

**sale_item_components**
`id serial pk, sale_item_id int → sale_items on delete cascade, product_id int → products on delete set null, name text, quantity integer, unit_cost numeric(10,2)`
- Rows exist for bouquet and custom-bouquet lines only. `quantity` = per-bouquet qty × line quantity (total consumed).

Indexes: `products(name)`, `products(category)`, `sales(date)`, `sales(customer_id)`, `sale_items(sale_id)`, `sale_item_components(sale_item_id)`.

### RPC functions (SECURITY DEFINER, single transaction)

**`create_sale(p_customer_id int, p_items jsonb, p_total numeric, p_amount_paid numeric, p_notes text) returns jsonb`**
`p_items` element: `{ kind: 'product'|'custom_bouquet', product_id?, name?, quantity, price, components?: [{product_id, quantity}] }`
1. Insert `sales` row (notes gets `Discount: X%` appended when `p_total` < Σ line totals, as in Aakash).
2. For each item: insert `sale_items`. Determine components:
   - `product` with category `flower`/`accessory`: deduct `quantity` from that product; `unit_cost` = purchase price.
   - `product` with category `bouquet`: expand `bouquet_recipes` × quantity; insert components; deduct each.
   - `custom_bouquet`: use provided `components` × quantity; insert; deduct each.
3. Stock check before each deduction; on shortage `RAISE EXCEPTION 'Not enough %: need %, have %'` → whole transaction rolls back.
4. Return the full sale with items and components (same shape the UI uses for receipts).

**`record_payment(p_sale_id int, p_amount numeric) returns jsonb`** — validates `0 < amount ≤ remaining due`, updates `amount_paid`, returns sale.

**`delete_sale(p_sale_id int)`** — deletes sale (cascade). Stock is **not** restored (matches Aakash behaviour).

### Views

- `get_dashboard()` RPC (returns one jsonb) — today_revenue, today_stems (Σ flower components + flower lines today), monthly_revenue, monthly_bouquets (bouquet + custom lines this month), `low_stock` (flowers/accessories with stock ≤ 20), `star_product` (top product by qty this month), `unavailable_bouquets` (from `v_bouquet_availability` where can_make = 0). One round trip for the whole Dashboard.
- `v_daily_sales` (last 30 days, Asia/Kolkata): date, revenue, quantity_sold, profit (= Σ total − Σ qty × unit_cost).
- `v_monthly_sales` (last 12 months): month, revenue, quantity_sold, profit.
- `v_top_products` (top 10 by qty): id, name, variety, category, quantity_sold, revenue.
- `v_profit_margins`: per product — purchase_price (bouquets: recipe cost), selling_price, profit_per_unit, margin %, units sold, revenue, profit.
- `v_bouquet_availability`: bouquet_id, can_make (min over floor(component stock / qty)), shortages jsonb.

### RLS
All tables: RLS on; policy `anon_all` for role `anon` and `authenticated`: `USING (true) WITH CHECK (true)`. RPCs granted to `anon`.

## 6. Screens

Common: left sidebar (desktop) / sheet nav (mobile), floating calculator, PWA install button, page transition.

**Dashboard** — 4 stat cards (Today's Revenue, Stems Sold Today, Monthly Revenue, Bouquets This Month) with count-up; 30-day revenue area chart; "Bloom of the Month" star product card; Low Stock list; "Bouquets short on flowers" list. Petal background lives only here.

**Billing** — category chips (All / Flowers / Bouquets / Accessories) + search; product grid (bouquet cards show "Can make N" or "Short: Red Rose (need 12, have 5)" and disable); **Custom Bouquet** button → BouquetBuilder; cart with editable price, +/−, remove; customer select; custom total (discount); amount paid (credit; requires customer if partial); Generate Bill → `create_sale` → ReceiptDialog + petal confetti. Mobile: Products/Cart tabs + floating cart button, as in Aakash.

**BouquetBuilder** (dialog desktop / bottom sheet mobile) — searchable list of flowers + accessories with stock; +/− steppers; right pane: components, cost (small, owner-only), Price (default Σ selling price, editable), optional label. Modes: `custom` (returns a cart line) and `recipe` (returns recipe rows for a bouquet product). Editing a custom cart line reopens the builder with its components.

**Inventory** — tabs: *Flowers & Accessories* (table CRUD, search, stock badge red < 20), *Bouquets* (cards with recipe summary, can-make count, add/edit via BouquetBuilder in recipe mode + name/price form), *Profit Margins* (table from `v_profit_margins`).

**Customers** — cards CRUD + purchase history dialog. Fields: name, phone (required); business, address, notes (optional).

**Sales** — table, expandable row lists items; bouquet/custom lines show their components indented; receipt button; delete (confirm).

**Reports** — Monthly Revenue (bar), Top Products (horizontal bar), Daily Volume (line), Daily Net Profit (area), Monthly Net Profit (bar). Same as Aakash.

**Credits** — outstanding bills only; 3 summary cards; search by name/phone; Pay → `record_payment` dialog; receipt.

**ReceiptDialog** — branded from `config/shop.ts`; items with components listed under bouquet lines; subtotal/discount/grand total/paid/due; Print (iframe), Share PDF via WhatsApp (jsPDF → Web Share API; desktop fallback: download PDF + open `wa.me` text link — no server upload since there is no server).

## 7. Visual design

Palette (CSS variables): background cream `#FBF7F2`; surface white; primary rose `#D9456C`; secondary sage `#5F8B6A`; accent gold `#E2B04A`; text plum `#2A1E2B`; muted `#7A6B7C`; border `#EADFD8`.
Fonts: Fraunces (display) + Inter (UI), self-hosted woff2 subsets, `font-display: swap`, preloaded.
Cards: solid, 1px border, soft shadow, radius 16px. No `backdrop-blur` on large surfaces.

### Animations (transform/opacity only; all off under `prefers-reduced-motion`)
- Petal drift: 8–10 SVG petals, CSS keyframes, opacity ≤ 0.35, Dashboard only.
- Page enter: fade + 8px rise, 250 ms.
- Stat cards: stagger 60 ms, number count-up 600 ms.
- Product card: hover lift 2 px + rose shadow; tap scale 0.97.
- Add to cart: line slides in from right; total pulses; one 400 ms petal burst from tapped card.
- Sidebar active pill: layout animation.
- Dialogs: scale 0.96→1 + backdrop fade, 200 ms.
- Receipt success: petal confetti once per bill.

## 8. Performance

Targets on a mid-range phone, 4G: first paint < 1 s, interactive < 2 s, route change < 300 ms.
- Route-level lazy chunks; `recharts` only in Dashboard/Reports chunks; `jspdf` dynamic import on share.
- React Query cache persisted to IndexedDB; `staleTime` 2 min; cached data paints immediately, refetch in background.
- Prefetch route chunk on nav hover/touchstart.
- Per-widget skeletons; never a full-page spinner after first load.
- Products query shared across Billing / Inventory / Builder.
- Vite `manualChunks`: vendor (react, wouter, query), motion, charts.
- Service worker: precache shell; stale-while-revalidate for hashed assets; never cache Supabase requests.
- Supabase: `select` only needed columns; views return chart-ready rows.

## 9. Error handling

- Mutations: toast with server message (e.g. shortage text from `create_sale`); form inputs preserved; buttons disabled while pending.
- `create_sale` atomic — no partial stock deduction.
- Offline: cached pages render; writes show "You're offline" toast and are not queued.
- Missing env vars: startup screen explaining `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`.

## 10. Testing

- Vitest unit tests: `lib/cart.ts` (totals, discount %, due), `lib/bouquet.ts` (availability, shortage message, cost).
- Component tests: BouquetBuilder add/remove/price default; Billing credit-requires-customer rule.
- SQL: run `create_sale` happy path, bouquet expansion, shortage rollback, and `record_payment` bounds against the Supabase project via MCP `execute_sql` during implementation.
- Manual: Lighthouse performance ≥ 90 on production build.

## 11. Deployment & setup

1. Create Supabase project `sidhi-florals` (via MCP), apply migrations 0001–0004.
2. `.env` (gitignored): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`; `.env.example` committed.
3. Vercel static deploy; `vercel.json` rewrites `/(.*)` → `/index.html`.
4. Seed data: ~10 flowers (Rose Red/White/Pink, Marigold, Jasmine, Lily, Tuberose, Baby's Breath, Carnation, Chrysanthemum), 3 accessories (Wrap, Ribbon, Card), 3 bouquets with recipes.

## 12. Out of scope

Login/roles, stock restore on sale delete, multi-currency, image uploads for products, server-side PDF hosting.
