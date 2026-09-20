# Sidhi Florals Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Sidhi Florals — a flower-shop billing/inventory SPA with the same features as Aakash-Enterprises, plus recipe-based and custom bouquets, a floral visual identity with light animations, and sub-second first paint.

**Architecture:** Single-package Vite + React 19 + Tailwind 4 SPA that talks directly to a Supabase Postgres project via `@supabase/supabase-js`. All multi-step writes (`create_sale`, `record_payment`) are Postgres functions run in one transaction; analytics are SQL views/functions. Routes are lazy-loaded chunks; the TanStack Query cache is persisted to IndexedDB so repeat visits paint from cache.

**Tech Stack:** Vite 7, React 19, TypeScript 5, Tailwind CSS 4, wouter, @tanstack/react-query 5 (+ persist), @supabase/supabase-js 2, motion 12, recharts 2, jspdf 3, lucide-react, sonner, @radix-ui/react-dialog, @fontsource-variable/fraunces + inter, Vitest + Testing Library.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-09-20-sidhi-florals-design.md` — read it first.
- Project root: `C:\Users\araji\AI\Sidhi Florals` (own git repo, branch `main`). Use `npm`, not pnpm.
- Node 22. Windows; shell is Git Bash — use forward slashes and quote the path (it contains a space).
- No login. RLS policies grant `anon` full access. Do not add auth.
- Currency: INR, `en-IN` formatting, `₹` symbol, 0 decimals in UI (as Aakash). Timezone for reports: `Asia/Kolkata`.
- Low-stock threshold: `20`.
- Categories: exactly `'flower' | 'bouquet' | 'accessory'`. Sale item kinds: exactly `'product' | 'custom_bouquet'`.
- Palette (CSS vars in `src/index.css`): background `#FBF7F2`, surface `#FFFFFF`, primary `#D9456C`, secondary `#5F8B6A`, accent `#E2B04A`, text `#2A1E2B`, muted `#7A6B7C`, border `#EADFD8`.
- Fonts: Fraunces (display) + Inter (UI) via `@fontsource-variable/*` (self-hosted). No Google Fonts `<link>`.
- Animations: transform/opacity only; every animation must be disabled under `prefers-reduced-motion`. No `backdrop-blur` on surfaces larger than a dialog overlay. No infinite `animate-pulse` on large elements.
- Every page chunk is lazy (`React.lazy`). `recharts` may only be imported from `pages/Dashboard.tsx` and `pages/Reports.tsx`. `jspdf` may only be imported dynamically inside `ReceiptDialog.tsx`.
- Commit after every task with the message given; end commit bodies with `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`. Commit with `git -c user.name=workspace220106 -c user.email=sattva.tech.team@gmail.com commit ...` if git identity is not configured.
- Supabase MCP tools are available in this session (`mcp__c4f35fb0-...__*`). Organization id: `htgxpkzmkifhyvgthshj`. Use `execute_sql` to verify SQL tasks. Never print the database password or service-role key into files or chat.

---

## File map

```
Sidhi Florals/
  package.json, vite.config.ts, tsconfig.json, tsconfig.node.json, index.html, vercel.json
  .env.example, .env (gitignored), .gitignore
  public/manifest.json, public/sw.js, public/icon-192.png, public/icon-512.png, public/petal.svg
  supabase/migrations/0001_schema.sql        # tables, indexes, RLS
  supabase/migrations/0002_functions.sql     # deduct_stock, sale_json, create_sale, record_payment, delete_sale, get_dashboard
  supabase/migrations/0003_views.sql         # v_daily_sales, v_monthly_sales, v_top_products, v_profit_margins, v_bouquet_availability
  supabase/migrations/0004_seed.sql
  src/main.tsx                               # providers, fonts, SW registration
  src/App.tsx                                # lazy routes
  src/index.css                              # theme tokens, base, utilities, keyframes
  src/config/shop.ts
  src/lib/supabase.ts, src/lib/utils.ts, src/lib/cart.ts, src/lib/bouquet.ts, src/lib/queryClient.ts
  src/api/types.ts, src/api/products.ts, src/api/customers.ts, src/api/sales.ts, src/api/analytics.ts
  src/components/ui/{Button,Input,Dialog,Sheet,Skeleton,Tabs,SearchInput}.tsx
  src/components/layout/{AppLayout,Sidebar,MobileHeader,Logo}.tsx
  src/components/{PetalField,PetalBurst,CountUp,BouquetBuilder,ReceiptDialog,CalculatorWidget,InstallButton,SetupScreen}.tsx
  src/pages/{Dashboard,Billing,Inventory,Customers,Sales,Reports,Credits,NotFound}.tsx
  src/test/setup.ts
  src/lib/__tests__/{cart,bouquet}.test.ts
  src/components/__tests__/BouquetBuilder.test.tsx
```

---

### Task 1: Project scaffold, theme, and tooling

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `tsconfig.node.json`, `index.html`, `vercel.json`, `.gitignore`, `.env.example`, `src/main.tsx`, `src/App.tsx`, `src/index.css`, `src/config/shop.ts`, `src/lib/utils.ts`, `src/test/setup.ts`, `src/vite-env.d.ts`

**Interfaces:**
- Produces: `cn()`, `formatCurrency(n)`, `formatNumber(n)`, `displayName(p: {name, variety})` in `src/lib/utils.ts`; `SHOP` constant in `src/config/shop.ts`; CSS classes `.card`, `.btn-primary`, `.btn-ghost`, `.input`, `.chip`, `.chip-active`; CSS vars listed in Global Constraints.

- [ ] **Step 1: Create package.json**

```json
{
  "name": "sidhi-florals",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -p tsconfig.json --noEmit && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc -p tsconfig.json --noEmit"
  },
  "dependencies": {
    "@fontsource-variable/fraunces": "^5.2.5",
    "@fontsource-variable/inter": "^5.2.5",
    "@radix-ui/react-dialog": "^1.1.14",
    "@supabase/supabase-js": "^2.57.4",
    "@tanstack/query-async-storage-persister": "^5.89.0",
    "@tanstack/react-query": "^5.89.0",
    "@tanstack/react-query-persist-client": "^5.89.0",
    "clsx": "^2.1.1",
    "idb-keyval": "^6.2.2",
    "jspdf": "^3.0.2",
    "lucide-react": "^0.545.0",
    "motion": "^12.23.22",
    "react": "^19.1.1",
    "react-dom": "^19.1.1",
    "recharts": "^2.15.4",
    "sonner": "^2.0.7",
    "tailwind-merge": "^3.3.1",
    "wouter": "^3.7.1"
  },
  "devDependencies": {
    "@tailwindcss/vite": "^4.1.14",
    "@testing-library/jest-dom": "^6.8.0",
    "@testing-library/react": "^16.3.0",
    "@testing-library/user-event": "^14.6.1",
    "@types/node": "^22.18.6",
    "@types/react": "^19.1.13",
    "@types/react-dom": "^19.1.9",
    "@vitejs/plugin-react": "^5.0.3",
    "jsdom": "^26.1.0",
    "tailwindcss": "^4.1.14",
    "typescript": "~5.9.2",
    "vite": "^7.1.7",
    "vitest": "^3.2.4"
  }
}
```

- [ ] **Step 2: Create config files**

`vite.config.ts`:
```ts
/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  build: {
    target: "es2022",
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom", "wouter", "@tanstack/react-query"],
          supabase: ["@supabase/supabase-js"],
          motion: ["motion"],
          charts: ["recharts"],
        },
      },
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    css: false,
  },
});
```

`tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noFallthroughCasesInSwitch": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "resolveJsonModule": true,
    "allowImportingTsExtensions": true,
    "noEmit": true,
    "types": ["vite/client", "vitest/globals", "@testing-library/jest-dom"],
    "baseUrl": ".",
    "paths": { "@/*": ["src/*"] }
  },
  "include": ["src"]
}
```

`tsconfig.node.json`:
```json
{
  "compilerOptions": { "composite": true, "module": "ESNext", "moduleResolution": "bundler", "skipLibCheck": true, "types": ["node"] },
  "include": ["vite.config.ts"]
}
```

`index.html`:
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1" />
    <title>Sidhi Florals</title>
    <meta name="description" content="Billing and inventory for Sidhi Florals" />
    <meta name="theme-color" content="#D9456C" />
    <link rel="manifest" href="/manifest.json" />
    <link rel="icon" href="/icon-192.png" />
    <link rel="apple-touch-icon" href="/icon-192.png" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <style>html{background:#FBF7F2}</style>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`vercel.json`:
```json
{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
```

`.gitignore`:
```
node_modules
dist
.env
.env.*.local
.vercel
*.log
```

`.env.example`:
```
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR-ANON-KEY
```

`src/vite-env.d.ts`:
```ts
/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
}
```

`src/test/setup.ts`:
```ts
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 3: Create theme CSS**

`src/index.css`:
```css
@import "tailwindcss";

@theme {
  --color-background: #fbf7f2;
  --color-surface: #ffffff;
  --color-primary: #d9456c;
  --color-primary-soft: #fbe4ea;
  --color-secondary: #5f8b6a;
  --color-secondary-soft: #e6efe8;
  --color-accent: #e2b04a;
  --color-accent-soft: #fbf1d9;
  --color-foreground: #2a1e2b;
  --color-muted: #7a6b7c;
  --color-border: #eadfd8;
  --color-danger: #c62f2f;
  --color-danger-soft: #fde8e8;

  --font-sans: "Inter Variable", system-ui, sans-serif;
  --font-display: "Fraunces Variable", Georgia, serif;

  --radius-card: 1rem;
  --shadow-card: 0 1px 2px rgb(42 30 43 / 0.04), 0 8px 24px -12px rgb(42 30 43 / 0.12);
  --shadow-rose: 0 10px 30px -12px rgb(217 69 108 / 0.45);
}

@layer base {
  * { @apply border-border; }
  html { scroll-behavior: smooth; }
  body { @apply bg-background text-foreground font-sans antialiased min-h-screen overflow-x-hidden; }
  h1, h2, h3, h4 { @apply font-display font-semibold tracking-tight; }
  input, select, textarea { @apply font-sans; }
  ::-webkit-scrollbar { width: 8px; height: 8px; }
  ::-webkit-scrollbar-thumb { @apply bg-border rounded-full; }
}

@layer components {
  .card { @apply bg-surface border border-border rounded-card shadow-card; }
  .card-hover { @apply transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-rose; }
  .btn { @apply inline-flex items-center justify-center gap-2 rounded-xl font-semibold px-4 py-2.5 transition-[transform,background-color,box-shadow] duration-150 active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none cursor-pointer; }
  .btn-primary { @apply btn bg-primary text-white shadow-rose hover:brightness-105; }
  .btn-secondary { @apply btn bg-secondary text-white hover:brightness-105; }
  .btn-ghost { @apply btn bg-transparent text-muted hover:bg-primary-soft hover:text-primary; }
  .btn-outline { @apply btn border border-border bg-surface text-foreground hover:bg-background; }
  .input { @apply w-full rounded-xl border border-border bg-surface px-3 py-2.5 outline-none transition-[box-shadow,border-color] duration-150 focus:border-primary focus:ring-4 focus:ring-primary/15; }
  .label { @apply block text-sm font-semibold text-foreground mb-1; }
  .chip { @apply px-3.5 py-1.5 rounded-full text-sm font-medium border border-border bg-surface text-muted transition-colors cursor-pointer hover:border-primary/40 hover:text-primary; }
  .chip-active { @apply bg-primary text-white border-primary shadow-rose; }
  .table-head { @apply bg-background/60 text-muted text-xs uppercase tracking-wider; }
  .stock-badge { @apply px-2.5 py-1 rounded-full text-xs font-bold; }
}

@layer utilities {
  .text-gradient { @apply bg-clip-text text-transparent bg-linear-to-r from-primary to-accent; }
}

/* Keyframes (transform/opacity only) */
@keyframes petal-fall {
  0%   { transform: translate3d(0, -10vh, 0) rotate(0deg); opacity: 0; }
  10%  { opacity: var(--petal-opacity, 0.35); }
  100% { transform: translate3d(var(--petal-drift, 40px), 110vh, 0) rotate(360deg); opacity: 0; }
}
@keyframes petal-burst {
  0%   { transform: translate3d(0,0,0) scale(0.6) rotate(0deg); opacity: 1; }
  100% { transform: translate3d(var(--bx, 30px), var(--by, -60px), 0) scale(1) rotate(180deg); opacity: 0; }
}
@keyframes pulse-once {
  0% { transform: scale(1); } 40% { transform: scale(1.08); } 100% { transform: scale(1); }
}
.petal { position: absolute; top: 0; will-change: transform, opacity; animation: petal-fall var(--petal-duration, 14s) linear infinite; animation-delay: var(--petal-delay, 0s); pointer-events: none; }
.petal-burst { position: absolute; will-change: transform, opacity; animation: petal-burst 450ms ease-out forwards; pointer-events: none; }
.pulse-once { animation: pulse-once 350ms ease-out; }

@media (prefers-reduced-motion: reduce) {
  .petal, .petal-burst { display: none !important; }
  .pulse-once { animation: none !important; }
  *, *::before, *::after { animation-duration: 0.001ms !important; transition-duration: 0.001ms !important; }
}
```

- [ ] **Step 4: Create shop config, utils, and minimal App**

`src/config/shop.ts`:
```ts
export const SHOP = {
  name: "Sidhi Florals",
  tagline: "Fresh flowers, bouquets & garlands",
  address: "Shop address — edit in src/config/shop.ts",
  phone: "+91 00000 00000",
  gstin: "GSTIN — edit in src/config/shop.ts",
  receiptFooter: "Thank you for choosing Sidhi Florals!",
} as const;
```

`src/lib/utils.ts`:
```ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);
}

export function formatNumber(n: number) {
  return new Intl.NumberFormat("en-IN").format(n);
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function displayName(p: { name: string; variety?: string | null }) {
  return p.variety ? `${p.name} · ${p.variety}` : p.name;
}

export function padId(id: number) {
  return String(id).padStart(6, "0");
}
```

`src/App.tsx` (placeholder; replaced in Task 7):
```tsx
export default function App() {
  return <h1 className="p-8 text-3xl">Sidhi Florals</h1>;
}
```

`src/main.tsx` (placeholder; replaced in Task 7):
```tsx
import { createRoot } from "react-dom/client";
import "@fontsource-variable/inter";
import "@fontsource-variable/fraunces";
import "./index.css";
import App from "./App";

createRoot(document.getElementById("root")!).render(<App />);
```

- [ ] **Step 5: Install and verify**

Run: `cd "C:/Users/araji/AI/Sidhi Florals" && npm install && npm run typecheck && npm run build`
Expected: install completes; typecheck prints nothing; build prints `dist/index.html` and asset list with no errors.

- [ ] **Step 6: Commit**

```bash
cd "C:/Users/araji/AI/Sidhi Florals" && git add -A && git commit -m "chore: scaffold Vite + React + Tailwind project with floral theme

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 2: Supabase project + schema migration + seed

**Files:**
- Create: `supabase/migrations/0001_schema.sql`, `supabase/migrations/0004_seed.sql`, `.env`

**Interfaces:**
- Produces: tables `products`, `bouquet_recipes`, `customers`, `sales`, `sale_items`, `sale_item_components` with exact columns in the spec §5; env vars `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.

- [ ] **Step 1: Create the Supabase project via MCP**

Use MCP tools (load with ToolSearch `select:` first):
1. `get_cost` with `{ "type": "project", "organization_id": "htgxpkzmkifhyvgthshj" }` → note the returned cost (free tier expected).
2. `confirm_cost` with `{ "type": "project", "recurrence": "monthly", "amount": <amount from step 1> }` → returns `confirm_cost_id`.
3. `create_project` with `{ "name": "sidhi-florals", "organization_id": "htgxpkzmkifhyvgthshj", "region": "ap-south-1", "confirm_cost_id": "<id>" }`. Record the returned project `id`.
4. Poll `get_project` with that id until `status` is `ACTIVE_HEALTHY` (may take 1–2 minutes).
5. `get_project_url` and `get_publishable_keys` → write `.env`:

```
VITE_SUPABASE_URL=<url>
VITE_SUPABASE_ANON_KEY=<anon/publishable key>
```
`.env` is gitignored. Never paste keys into committed files or the plan.

- [ ] **Step 2: Write the schema migration**

`supabase/migrations/0001_schema.sql`:
```sql
-- Sidhi Florals schema
create table if not exists products (
  id serial primary key,
  name text not null,
  variety text not null default '',
  unit text not null default 'piece',
  category text not null check (category in ('flower','bouquet','accessory')),
  purchase_price numeric(10,2) not null default 0,
  selling_price numeric(10,2) not null default 0,
  stock integer not null default 0,
  supplier text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists products_name_idx on products (name);
create index if not exists products_category_idx on products (category);

create table if not exists bouquet_recipes (
  id serial primary key,
  bouquet_id integer not null references products(id) on delete cascade,
  component_id integer not null references products(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  unique (bouquet_id, component_id)
);
create index if not exists bouquet_recipes_bouquet_idx on bouquet_recipes (bouquet_id);

create table if not exists customers (
  id serial primary key,
  name text not null,
  phone text not null,
  business text not null default '',
  address text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists customers_name_idx on customers (name);

create table if not exists sales (
  id serial primary key,
  customer_id integer references customers(id) on delete set null,
  total numeric(10,2) not null,
  amount_paid numeric(10,2) not null,
  notes text,
  date timestamptz not null default now()
);
create index if not exists sales_date_idx on sales (date);
create index if not exists sales_customer_idx on sales (customer_id);

create table if not exists sale_items (
  id serial primary key,
  sale_id integer not null references sales(id) on delete cascade,
  product_id integer references products(id) on delete set null,
  name text not null,
  kind text not null check (kind in ('product','custom_bouquet')),
  quantity integer not null check (quantity > 0),
  price numeric(10,2) not null,
  total numeric(10,2) not null,
  unit_cost numeric(10,2) not null default 0
);
create index if not exists sale_items_sale_idx on sale_items (sale_id);
create index if not exists sale_items_product_idx on sale_items (product_id);

create table if not exists sale_item_components (
  id serial primary key,
  sale_item_id integer not null references sale_items(id) on delete cascade,
  product_id integer references products(id) on delete set null,
  name text not null,
  quantity integer not null,
  unit_cost numeric(10,2) not null default 0
);
create index if not exists sale_item_components_item_idx on sale_item_components (sale_item_id);

-- RLS: no login in this app; anon has full access (user decision, see spec §3)
alter table products enable row level security;
alter table bouquet_recipes enable row level security;
alter table customers enable row level security;
alter table sales enable row level security;
alter table sale_items enable row level security;
alter table sale_item_components enable row level security;

do $$
declare t text;
begin
  foreach t in array array['products','bouquet_recipes','customers','sales','sale_items','sale_item_components'] loop
    execute format('drop policy if exists anon_all on %I', t);
    execute format('create policy anon_all on %I for all to anon, authenticated using (true) with check (true)', t);
  end loop;
end $$;
```

- [ ] **Step 3: Apply the migration via MCP**

Call `apply_migration` with `{ "project_id": "<id>", "name": "0001_schema", "query": "<contents of 0001_schema.sql>" }`.
Then verify with `list_tables` `{ "project_id": "<id>", "schemas": ["public"] }`.
Expected: the six tables listed, each with `rls_enabled: true`.

- [ ] **Step 4: Write the seed**

`supabase/migrations/0004_seed.sql`:
```sql
insert into products (name, variety, unit, category, purchase_price, selling_price, stock, supplier) values
  ('Rose','Red','stem','flower',8,15,200,'Ooty Farms'),
  ('Rose','White','stem','flower',8,15,120,'Ooty Farms'),
  ('Rose','Pink','stem','flower',8,15,150,'Ooty Farms'),
  ('Marigold','Orange','kg','flower',60,120,40,'Local Mandi'),
  ('Jasmine','','bunch','flower',40,80,60,'Local Mandi'),
  ('Lily','White','stem','flower',35,70,50,'Bangalore Blooms'),
  ('Tuberose','','stem','flower',6,12,180,'Local Mandi'),
  ('Baby''s Breath','','bunch','flower',50,100,30,'Bangalore Blooms'),
  ('Carnation','Pink','stem','flower',10,22,90,'Bangalore Blooms'),
  ('Chrysanthemum','Yellow','stem','flower',7,14,110,'Local Mandi'),
  ('Wrapping Paper','Kraft','sheet','accessory',10,25,100,'Paper House'),
  ('Satin Ribbon','','piece','accessory',5,15,150,'Paper House'),
  ('Greeting Card','','piece','accessory',8,20,80,'Paper House'),
  ('Red Rose Bouquet','12 stems','piece','bouquet',0,399,0,''),
  ('Mixed Pastel Bouquet','','piece','bouquet',0,549,0,''),
  ('Lily & Rose Bouquet','','piece','bouquet',0,699,0,'');

insert into bouquet_recipes (bouquet_id, component_id, quantity)
select b.id, c.id, r.qty from (values
  ('Red Rose Bouquet','Rose','Red',12),
  ('Red Rose Bouquet','Baby''s Breath','',1),
  ('Red Rose Bouquet','Wrapping Paper','Kraft',1),
  ('Red Rose Bouquet','Satin Ribbon','',1),
  ('Mixed Pastel Bouquet','Rose','Pink',6),
  ('Mixed Pastel Bouquet','Rose','White',6),
  ('Mixed Pastel Bouquet','Carnation','Pink',5),
  ('Mixed Pastel Bouquet','Wrapping Paper','Kraft',1),
  ('Mixed Pastel Bouquet','Satin Ribbon','',1),
  ('Lily & Rose Bouquet','Lily','White',5),
  ('Lily & Rose Bouquet','Rose','Red',8),
  ('Lily & Rose Bouquet','Baby''s Breath','',1),
  ('Lily & Rose Bouquet','Wrapping Paper','Kraft',1),
  ('Lily & Rose Bouquet','Satin Ribbon','',1)
) as r(bname, cname, cvariety, qty)
join products b on b.name = r.bname and b.category = 'bouquet'
join products c on c.name = r.cname and c.variety = r.cvariety and c.category <> 'bouquet';

insert into customers (name, phone, business, address, notes) values
  ('Priya Sharma','9876543210','Priya Events','MG Road, Pune','Prefers pastel arrangements'),
  ('Hotel Sunrise','9123456780','Hotel Sunrise','FC Road, Pune','Weekly lobby flowers');
```

- [ ] **Step 5: Apply seed and verify**

`apply_migration` `{ "name": "0004_seed", "query": "<contents>" }`.
Then `execute_sql`:
```sql
select (select count(*) from products) as products, (select count(*) from bouquet_recipes) as recipes, (select count(*) from customers) as customers;
```
Expected: `products = 16`, `recipes = 14`, `customers = 2`.

- [ ] **Step 6: Commit**

```bash
cd "C:/Users/araji/AI/Sidhi Florals" && git add supabase .env.example && git commit -m "feat(db): add schema, RLS policies and seed data

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 3: Postgres functions — create_sale, record_payment, delete_sale, get_dashboard

**Files:**
- Create: `supabase/migrations/0002_functions.sql`

**Interfaces:**
- Produces RPCs (all callable by `anon`):
  - `create_sale(p_customer_id int, p_items jsonb, p_total numeric, p_amount_paid numeric, p_notes text) returns jsonb` — item shape `{kind:'product'|'custom_bouquet', product_id?:int, name?:text, quantity:int, price:numeric, components?:[{product_id:int, quantity:int}]}`; returns sale JSON (shape below). Raises `Not enough <name>: need N, have M` on shortage.
  - `record_payment(p_sale_id int, p_amount numeric) returns jsonb`
  - `delete_sale(p_sale_id int) returns void`
  - `get_dashboard() returns jsonb`
- Sale JSON shape (also produced by nested PostgREST selects in Task 6): `{ id, customer_id, total, amount_paid, notes, date, customers: {name, phone} | null, sale_items: [{ id, product_id, name, kind, quantity, price, total, unit_cost, sale_item_components: [{ id, product_id, name, quantity, unit_cost }] }] }`.

- [ ] **Step 1: Write the functions**

`supabase/migrations/0002_functions.sql`:
```sql
create or replace function product_label(p products) returns text language sql immutable as $$
  select case when p.variety <> '' then p.name || ' ' || p.variety else p.name end;
$$;

create or replace function deduct_stock(p_product_id integer, p_qty integer) returns void
language plpgsql as $$
declare v products%rowtype;
begin
  select * into v from products where id = p_product_id for update;
  if not found then raise exception 'Product % not found', p_product_id; end if;
  if v.stock < p_qty then
    raise exception 'Not enough %: need %, have %', product_label(v), p_qty, v.stock;
  end if;
  update products set stock = stock - p_qty where id = p_product_id;
end $$;

create or replace function sale_json(p_sale_id integer) returns jsonb
language sql stable as $$
  select jsonb_build_object(
    'id', s.id,
    'customer_id', s.customer_id,
    'total', s.total::float,
    'amount_paid', s.amount_paid::float,
    'notes', s.notes,
    'date', s.date,
    'customers', case when c.id is null then null else jsonb_build_object('name', c.name, 'phone', c.phone) end,
    'sale_items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', i.id, 'product_id', i.product_id, 'name', i.name, 'kind', i.kind,
        'quantity', i.quantity, 'price', i.price::float, 'total', i.total::float, 'unit_cost', i.unit_cost::float,
        'sale_item_components', coalesce((
          select jsonb_agg(jsonb_build_object('id', sc.id, 'product_id', sc.product_id, 'name', sc.name, 'quantity', sc.quantity, 'unit_cost', sc.unit_cost::float) order by sc.id)
          from sale_item_components sc where sc.sale_item_id = i.id), '[]'::jsonb)
      ) order by i.id)
      from sale_items i where i.sale_id = s.id), '[]'::jsonb)
  )
  from sales s left join customers c on c.id = s.customer_id
  where s.id = p_sale_id;
$$;

create or replace function create_sale(
  p_customer_id integer, p_items jsonb, p_total numeric, p_amount_paid numeric, p_notes text default null
) returns jsonb language plpgsql security definer as $$
declare
  v_sale_id integer; v_item jsonb; v_item_id integer; v_comp jsonb;
  v_product products%rowtype; v_comp_product products%rowtype; v_recipe record;
  v_qty integer; v_price numeric; v_line_total numeric; v_calc_total numeric := 0;
  v_unit_cost numeric; v_comp_qty integer; v_notes text; v_discount numeric;
begin
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'Cart is empty';
  end if;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_calc_total := v_calc_total + (v_item->>'quantity')::integer * (v_item->>'price')::numeric;
  end loop;

  v_notes := nullif(trim(coalesce(p_notes, '')), '');
  if v_calc_total > 0 and p_total < v_calc_total then
    v_discount := round((v_calc_total - p_total) / v_calc_total * 100, 2);
    v_notes := coalesce(v_notes || ' | ', '') || 'Discount: ' || v_discount || '%';
  end if;

  insert into sales (customer_id, total, amount_paid, notes)
  values (p_customer_id, p_total, coalesce(p_amount_paid, p_total), v_notes)
  returning id into v_sale_id;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := (v_item->>'quantity')::integer;
    v_price := (v_item->>'price')::numeric;
    v_line_total := v_qty * v_price;

    if v_item->>'kind' = 'custom_bouquet' then
      insert into sale_items (sale_id, product_id, name, kind, quantity, price, total, unit_cost)
      values (v_sale_id, null, coalesce(nullif(v_item->>'name',''), 'Custom Bouquet'), 'custom_bouquet', v_qty, v_price, v_line_total, 0)
      returning id into v_item_id;
      v_unit_cost := 0;
      for v_comp in select * from jsonb_array_elements(coalesce(v_item->'components', '[]'::jsonb)) loop
        select * into v_comp_product from products where id = (v_comp->>'product_id')::integer;
        if not found then raise exception 'Product % not found', v_comp->>'product_id'; end if;
        v_comp_qty := (v_comp->>'quantity')::integer * v_qty;
        perform deduct_stock(v_comp_product.id, v_comp_qty);
        insert into sale_item_components (sale_item_id, product_id, name, quantity, unit_cost)
        values (v_item_id, v_comp_product.id, product_label(v_comp_product), v_comp_qty, v_comp_product.purchase_price);
        v_unit_cost := v_unit_cost + (v_comp->>'quantity')::integer * v_comp_product.purchase_price;
      end loop;
      update sale_items set unit_cost = v_unit_cost where id = v_item_id;

    else
      select * into v_product from products where id = (v_item->>'product_id')::integer;
      if not found then raise exception 'Product % not found', v_item->>'product_id'; end if;

      if v_product.category = 'bouquet' then
        insert into sale_items (sale_id, product_id, name, kind, quantity, price, total, unit_cost)
        values (v_sale_id, v_product.id, product_label(v_product), 'product', v_qty, v_price, v_line_total, 0)
        returning id into v_item_id;
        v_unit_cost := 0;
        for v_recipe in
          select r.quantity as rqty, p.* from bouquet_recipes r join products p on p.id = r.component_id
          where r.bouquet_id = v_product.id order by p.name
        loop
          v_comp_qty := v_recipe.rqty * v_qty;
          perform deduct_stock(v_recipe.id, v_comp_qty);
          insert into sale_item_components (sale_item_id, product_id, name, quantity, unit_cost)
          values (v_item_id, v_recipe.id,
                  case when v_recipe.variety <> '' then v_recipe.name || ' ' || v_recipe.variety else v_recipe.name end,
                  v_comp_qty, v_recipe.purchase_price);
          v_unit_cost := v_unit_cost + v_recipe.rqty * v_recipe.purchase_price;
        end loop;
        update sale_items set unit_cost = v_unit_cost where id = v_item_id;
      else
        perform deduct_stock(v_product.id, v_qty);
        insert into sale_items (sale_id, product_id, name, kind, quantity, price, total, unit_cost)
        values (v_sale_id, v_product.id, product_label(v_product), 'product', v_qty, v_price, v_line_total, v_product.purchase_price);
      end if;
    end if;
  end loop;

  return sale_json(v_sale_id);
end $$;

create or replace function record_payment(p_sale_id integer, p_amount numeric) returns jsonb
language plpgsql security definer as $$
declare v sales%rowtype; v_due numeric;
begin
  select * into v from sales where id = p_sale_id for update;
  if not found then raise exception 'Sale % not found', p_sale_id; end if;
  v_due := v.total - v.amount_paid;
  if p_amount is null or p_amount <= 0 then raise exception 'Payment must be greater than 0'; end if;
  if p_amount > v_due + 0.005 then raise exception 'Payment exceeds balance due of %', v_due; end if;
  update sales set amount_paid = amount_paid + p_amount where id = p_sale_id;
  return sale_json(p_sale_id);
end $$;

create or replace function delete_sale(p_sale_id integer) returns void
language sql security definer as $$
  delete from sales where id = p_sale_id;
$$;

create or replace function get_dashboard() returns jsonb
language sql stable security definer as $$
  with tz as (select (now() at time zone 'Asia/Kolkata')::date as today),
  today_sales as (select s.* from sales s, tz where (s.date at time zone 'Asia/Kolkata')::date = tz.today),
  month_sales as (select s.* from sales s, tz where date_trunc('month', (s.date at time zone 'Asia/Kolkata')::date) = date_trunc('month', tz.today))
  select jsonb_build_object(
    'today_revenue', coalesce((select sum(total) from today_sales), 0)::float,
    'today_stems', (
      coalesce((select sum(i.quantity) from sale_items i join today_sales s on s.id = i.sale_id join products p on p.id = i.product_id where i.kind = 'product' and p.category = 'flower'), 0)
      + coalesce((select sum(c.quantity) from sale_item_components c join sale_items i on i.id = c.sale_item_id join today_sales s on s.id = i.sale_id join products p on p.id = c.product_id where p.category = 'flower'), 0)
    )::int,
    'monthly_revenue', coalesce((select sum(total) from month_sales), 0)::float,
    'monthly_bouquets', coalesce((select sum(i.quantity) from sale_items i join month_sales s on s.id = i.sale_id left join products p on p.id = i.product_id where i.kind = 'custom_bouquet' or p.category = 'bouquet'), 0)::int,
    'low_stock', coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'name', p.name, 'variety', p.variety, 'unit', p.unit, 'stock', p.stock) order by p.stock, p.name)
                          from (select * from products where category <> 'bouquet' and stock <= 20 order by stock, name limit 8) p), '[]'::jsonb),
    'star_product', (select jsonb_build_object('id', p.id, 'name', p.name, 'variety', p.variety, 'category', p.category, 'quantity_sold', sum(i.quantity)::int, 'revenue', sum(i.total)::float)
                     from sale_items i join month_sales s on s.id = i.sale_id join products p on p.id = i.product_id
                     group by p.id, p.name, p.variety, p.category order by sum(i.quantity) desc limit 1),
    'unavailable_bouquets', coalesce((select jsonb_agg(jsonb_build_object('id', b.id, 'name', b.name, 'shortages', a.shortages) order by b.name)
                                     from v_bouquet_availability a join products b on b.id = a.bouquet_id where a.can_make = 0), '[]'::jsonb)
  );
$$;

grant execute on function create_sale(integer, jsonb, numeric, numeric, text) to anon, authenticated;
grant execute on function record_payment(integer, numeric) to anon, authenticated;
grant execute on function delete_sale(integer) to anon, authenticated;
grant execute on function get_dashboard() to anon, authenticated;
grant execute on function sale_json(integer) to anon, authenticated;
```

Note: `get_dashboard` references `v_bouquet_availability`, which Task 4 creates. Apply Task 4's view **before** this file, or apply this file after Task 4. Order of application: 0001 → 0003 (views) → 0002 (functions) → 0004 (seed is already applied; fine).

- [ ] **Step 2: Apply Task 4's views first (see Task 4 Step 1–2), then apply this migration**

`apply_migration` `{ "name": "0002_functions", "query": "<contents>" }`. Expected: success, no errors.

- [ ] **Step 3: SQL tests via `execute_sql`**

Test A — plain flower sale deducts stock and returns JSON:
```sql
begin;
select stock from products where name='Rose' and variety='Red';  -- expect 200
select create_sale(null, '[{"kind":"product","product_id":(select id from products where name=''Rose'' and variety=''Red''),"quantity":10,"price":15}]'::jsonb, 150, 150, null);
```
Because jsonb literals can't contain subqueries, instead run:
```sql
with r as (select id from products where name='Rose' and variety='Red')
select create_sale(null, jsonb_build_array(jsonb_build_object('kind','product','product_id',(select id from r),'quantity',10,'price',15)), 150, 150, null);
select stock from products where name='Rose' and variety='Red';
```
Expected: JSON with `sale_items[0].name = 'Rose Red'`, `unit_cost = 8`; stock now `190`.

Test B — bouquet expands recipe:
```sql
with b as (select id from products where name='Red Rose Bouquet')
select create_sale(null, jsonb_build_array(jsonb_build_object('kind','product','product_id',(select id from b),'quantity',2,'price',399)), 798, 798, null);
select name, stock from products where name in ('Rose','Baby''s Breath','Wrapping Paper','Satin Ribbon') order by name, variety;
```
Expected: Rose Red `166` (190 − 24), Baby's Breath `28`, Wrapping Paper `98`, Satin Ribbon `148`; returned item has 4 `sale_item_components`, `unit_cost = 12*8 + 50 + 10 + 5 = 161`.

Test C — shortage rolls back everything:
```sql
with b as (select id from products where name='Red Rose Bouquet')
select create_sale(null, jsonb_build_array(jsonb_build_object('kind','product','product_id',(select id from b),'quantity',100,'price',399)), 39900, 39900, null);
```
Expected: error `Not enough Rose Red: need 1200, have 166`. Then `select count(*) from sales;` — unchanged from before Test C (2).

Test D — custom bouquet + discount note + credit:
```sql
with r as (select id from products where name='Rose' and variety='White'), l as (select id from products where name='Lily')
select create_sale(1, jsonb_build_array(jsonb_build_object('kind','custom_bouquet','name','Custom Bouquet','quantity',1,'price',500,
  'components', jsonb_build_array(jsonb_build_object('product_id',(select id from r),'quantity',6), jsonb_build_object('product_id',(select id from l),'quantity',3)))), 450, 200, null);
```
Expected: `notes = 'Discount: 10.00%'`, `amount_paid = 200`, `customers.name = 'Priya Sharma'`, item `unit_cost = 6*8 + 3*35 = 153`; Rose White stock `114`, Lily `47`.

Test E — record_payment bounds:
```sql
select record_payment((select max(id) from sales), 300);   -- error: exceeds balance due of 250
select record_payment((select max(id) from sales), 250);   -- ok, amount_paid 450
```

Test F — get_dashboard returns keys:
```sql
select jsonb_object_keys(get_dashboard());
```
Expected keys: today_revenue, today_stems, monthly_revenue, monthly_bouquets, low_stock, star_product, unavailable_bouquets.

Cleanup so the seed stays clean:
```sql
delete from sales;
update products set stock = 200 where name = 'Rose' and variety = 'Red';
update products set stock = 120 where name = 'Rose' and variety = 'White';
update products set stock = 50  where name = 'Lily';
update products set stock = 30  where name = 'Baby''s Breath';
update products set stock = 100 where name = 'Wrapping Paper';
update products set stock = 150 where name = 'Satin Ribbon';
```

- [ ] **Step 4: Commit**

```bash
cd "C:/Users/araji/AI/Sidhi Florals" && git add supabase && git commit -m "feat(db): add create_sale, record_payment, delete_sale and get_dashboard functions

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 4: Analytics views

**Files:**
- Create: `supabase/migrations/0003_views.sql`

**Interfaces:**
- Produces views (all columns already cast to JS-friendly types):
  - `v_daily_sales(date text 'YYYY-MM-DD', revenue float, quantity_sold int, profit float)` — last 30 days
  - `v_monthly_sales(month text 'YYYY-MM', revenue float, quantity_sold int, profit float)` — last 12 months
  - `v_top_products(id int, name text, variety text, category text, quantity_sold int, revenue float)` — top 10
  - `v_profit_margins(id, name, variety, unit, category, purchase_price float, selling_price float, profit_per_unit float, profit_margin_percent float, total_units_sold int, total_revenue float, total_profit float, stock int)`
  - `v_bouquet_availability(bouquet_id int, can_make int, shortages jsonb [{product_id, name, need, have}])`

- [ ] **Step 1: Write the views**

`supabase/migrations/0003_views.sql`:
```sql
create or replace view v_bouquet_availability as
select b.id as bouquet_id,
  coalesce(min(floor(c.stock::numeric / r.quantity))::int, 0) as can_make,
  coalesce(jsonb_agg(jsonb_build_object(
      'product_id', c.id,
      'name', case when c.variety <> '' then c.name || ' ' || c.variety else c.name end,
      'need', r.quantity, 'have', c.stock) order by c.name)
    filter (where c.stock < r.quantity), '[]'::jsonb) as shortages
from products b
left join bouquet_recipes r on r.bouquet_id = b.id
left join products c on c.id = r.component_id
where b.category = 'bouquet'
group by b.id;

create or replace view v_sale_metrics as
select s.id, s.date, s.total,
  coalesce((select sum(i.quantity * i.unit_cost) from sale_items i where i.sale_id = s.id), 0) as cost,
  coalesce((select sum(i.quantity) from sale_items i where i.sale_id = s.id), 0) as qty
from sales s;

create or replace view v_daily_sales as
select to_char(d, 'YYYY-MM-DD') as date,
  sum(total)::float as revenue, sum(qty)::int as quantity_sold, (sum(total) - sum(cost))::float as profit
from (select (date at time zone 'Asia/Kolkata')::date as d, * from v_sale_metrics where date >= now() - interval '30 days') m
group by d order by d;

create or replace view v_monthly_sales as
select to_char(m, 'YYYY-MM') as month,
  sum(total)::float as revenue, sum(qty)::int as quantity_sold, (sum(total) - sum(cost))::float as profit
from (select date_trunc('month', (date at time zone 'Asia/Kolkata')::date)::date as m, * from v_sale_metrics where date >= now() - interval '12 months') x
group by m order by m;

create or replace view v_top_products as
select p.id, p.name, p.variety, p.category, sum(i.quantity)::int as quantity_sold, sum(i.total)::float as revenue
from sale_items i join products p on p.id = i.product_id
group by p.id, p.name, p.variety, p.category
order by sum(i.quantity) desc limit 10;

create or replace view v_profit_margins as
with cost as (
  select p.id,
    case when p.category = 'bouquet'
      then coalesce((select sum(r.quantity * c.purchase_price) from bouquet_recipes r join products c on c.id = r.component_id where r.bouquet_id = p.id), 0)
      else p.purchase_price end as purchase_price
  from products p),
sold as (
  select product_id, sum(quantity) as units, sum(total) as revenue, sum(total - quantity * unit_cost) as profit
  from sale_items where product_id is not null group by product_id)
select p.id, p.name, p.variety, p.unit, p.category,
  cost.purchase_price::float,
  p.selling_price::float,
  (p.selling_price - cost.purchase_price)::float as profit_per_unit,
  case when p.selling_price > 0 then round((p.selling_price - cost.purchase_price) / p.selling_price * 100, 2) else 0 end::float as profit_margin_percent,
  coalesce(sold.units, 0)::int as total_units_sold,
  coalesce(sold.revenue, 0)::float as total_revenue,
  coalesce(sold.profit, 0)::float as total_profit,
  p.stock
from products p join cost on cost.id = p.id left join sold on sold.product_id = p.id
order by p.name, p.variety;

grant select on v_bouquet_availability, v_sale_metrics, v_daily_sales, v_monthly_sales, v_top_products, v_profit_margins to anon, authenticated;
```

- [ ] **Step 2: Apply and verify**

`apply_migration` `{ "name": "0003_views", "query": "<contents>" }` (do this before Task 3 Step 2).
`execute_sql`:
```sql
select b.name, a.can_make, a.shortages from v_bouquet_availability a join products b on b.id = a.bouquet_id order by b.name;
select name, variety, purchase_price, selling_price, profit_margin_percent from v_profit_margins where category = 'bouquet';
```
Expected: Red Rose Bouquet `can_make = 16` (200/12), shortages `[]`; Red Rose Bouquet purchase_price `161`, margin `59.65`.

- [ ] **Step 3: Commit**

```bash
cd "C:/Users/araji/AI/Sidhi Florals" && git add supabase && git commit -m "feat(db): add analytics and bouquet availability views

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 5: Pure logic — cart math and bouquet helpers (TDD)

**Files:**
- Create: `src/lib/cart.ts`, `src/lib/bouquet.ts`, `src/lib/__tests__/cart.test.ts`, `src/lib/__tests__/bouquet.test.ts`

**Interfaces:**
- Produces (`src/lib/cart.ts`):
  ```ts
  export interface CartComponent { productId: number; name: string; quantity: number; unitCost: number; sellingPrice: number }
  export interface CartLine { key: string; kind: 'product' | 'custom_bouquet'; productId: number | null; name: string; price: number; quantity: number; maxQuantity: number | null; components: CartComponent[] }
  export function cartSubtotal(lines: CartLine[]): number
  export function cartCount(lines: CartLine[]): number
  export function resolveTotals(lines, customTotalStr: string, amountPaidStr: string): { subtotal, total, amountPaid, due }
  export function validateCheckout(lines, totals, customerId: string): string | null  // error message or null
  export function componentsSummary(components: CartComponent[]): string  // "6 Rose Red, 4 Lily White"
  ```
- Produces (`src/lib/bouquet.ts`):
  ```ts
  export function bouquetCost(components: {quantity:number; unitCost:number}[]): number
  export function bouquetDefaultPrice(components: {quantity:number; sellingPrice:number}[]): number
  export function canMake(recipe: {quantity:number; stock:number}[]): number
  export function shortageText(shortages: {name:string; need:number; have:number}[]): string  // "Short: Rose Red (need 12, have 5)"
  ```

- [ ] **Step 1: Write failing cart tests**

`src/lib/__tests__/cart.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { cartSubtotal, cartCount, resolveTotals, validateCheckout, componentsSummary, type CartLine } from "@/lib/cart";

const line = (over: Partial<CartLine> = {}): CartLine => ({
  key: "p1", kind: "product", productId: 1, name: "Rose Red", price: 15, quantity: 2, maxQuantity: 100, components: [], ...over,
});

describe("cart math", () => {
  it("sums subtotal and count", () => {
    const lines = [line(), line({ key: "p2", price: 100, quantity: 1 })];
    expect(cartSubtotal(lines)).toBe(130);
    expect(cartCount(lines)).toBe(3);
  });

  it("uses subtotal when custom total and paid are blank", () => {
    const t = resolveTotals([line()], "", "");
    expect(t).toEqual({ subtotal: 30, total: 30, amountPaid: 30, due: 0 });
  });

  it("applies custom total and partial payment", () => {
    const t = resolveTotals([line()], "25", "10");
    expect(t).toEqual({ subtotal: 30, total: 25, amountPaid: 10, due: 15 });
  });

  it("ignores garbage input", () => {
    const t = resolveTotals([line()], "abc", "x");
    expect(t.total).toBe(30);
    expect(t.amountPaid).toBe(30);
  });

  it("requires a customer for credit sales", () => {
    const totals = resolveTotals([line()], "", "10");
    expect(validateCheckout([line()], totals, "")).toMatch(/customer/i);
    expect(validateCheckout([line()], totals, "3")).toBeNull();
  });

  it("rejects empty cart", () => {
    expect(validateCheckout([], resolveTotals([], "", ""), "")).toMatch(/empty/i);
  });

  it("summarises components", () => {
    expect(componentsSummary([
      { productId: 1, name: "Rose Red", quantity: 6, unitCost: 8, sellingPrice: 15 },
      { productId: 2, name: "Lily White", quantity: 4, unitCost: 35, sellingPrice: 70 },
    ])).toBe("6 Rose Red, 4 Lily White");
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `cd "C:/Users/araji/AI/Sidhi Florals" && npx vitest run src/lib/__tests__/cart.test.ts`
Expected: FAIL — cannot resolve `@/lib/cart`.

- [ ] **Step 3: Implement cart.ts**

`src/lib/cart.ts`:
```ts
export interface CartComponent {
  productId: number;
  name: string;
  quantity: number;
  unitCost: number;
  sellingPrice: number;
}

export interface CartLine {
  key: string;
  kind: "product" | "custom_bouquet";
  productId: number | null;
  name: string;
  price: number;
  quantity: number;
  maxQuantity: number | null;
  components: CartComponent[];
}

export interface CartTotals {
  subtotal: number;
  total: number;
  amountPaid: number;
  due: number;
}

export function cartSubtotal(lines: CartLine[]) {
  return lines.reduce((s, l) => s + l.price * l.quantity, 0);
}

export function cartCount(lines: CartLine[]) {
  return lines.reduce((s, l) => s + l.quantity, 0);
}

function parseMoney(s: string): number | null {
  const t = s.trim();
  if (t === "") return null;
  const n = parseFloat(t);
  return Number.isFinite(n) ? n : null;
}

export function resolveTotals(lines: CartLine[], customTotalStr: string, amountPaidStr: string): CartTotals {
  const subtotal = cartSubtotal(lines);
  const total = parseMoney(customTotalStr) ?? subtotal;
  const amountPaid = parseMoney(amountPaidStr) ?? total;
  return { subtotal, total, amountPaid, due: Math.max(0, total - amountPaid) };
}

export function validateCheckout(lines: CartLine[], totals: CartTotals, customerId: string): string | null {
  if (lines.length === 0) return "Cart is empty.";
  if (totals.amountPaid < totals.total && !customerId) return "Select a registered customer to record a credit sale.";
  return null;
}

export function componentsSummary(components: CartComponent[]) {
  return components.map((c) => `${c.quantity} ${c.name}`).join(", ");
}
```

- [ ] **Step 4: Run cart tests**

Run: `npx vitest run src/lib/__tests__/cart.test.ts` — Expected: 7 passed.

- [ ] **Step 5: Write failing bouquet tests**

`src/lib/__tests__/bouquet.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { bouquetCost, bouquetDefaultPrice, canMake, shortageText } from "@/lib/bouquet";

describe("bouquet helpers", () => {
  it("computes cost and default price", () => {
    const c = [{ quantity: 6, unitCost: 8, sellingPrice: 15 }, { quantity: 1, unitCost: 10, sellingPrice: 25 }];
    expect(bouquetCost(c)).toBe(58);
    expect(bouquetDefaultPrice(c)).toBe(115);
  });

  it("can make = min floor(stock/qty), 0 for empty recipe", () => {
    expect(canMake([{ quantity: 12, stock: 200 }, { quantity: 1, stock: 5 }])).toBe(5);
    expect(canMake([])).toBe(0);
  });

  it("formats shortage text", () => {
    expect(shortageText([{ name: "Rose Red", need: 12, have: 5 }])).toBe("Short: Rose Red (need 12, have 5)");
    expect(shortageText([{ name: "A", need: 1, have: 0 }, { name: "B", need: 2, have: 1 }])).toBe("Short: A (need 1, have 0), B (need 2, have 1)");
    expect(shortageText([])).toBe("");
  });
});
```

- [ ] **Step 6: Implement bouquet.ts and run**

`src/lib/bouquet.ts`:
```ts
export function bouquetCost(components: { quantity: number; unitCost: number }[]) {
  return components.reduce((s, c) => s + c.quantity * c.unitCost, 0);
}

export function bouquetDefaultPrice(components: { quantity: number; sellingPrice: number }[]) {
  return components.reduce((s, c) => s + c.quantity * c.sellingPrice, 0);
}

export function canMake(recipe: { quantity: number; stock: number }[]) {
  if (recipe.length === 0) return 0;
  return Math.min(...recipe.map((r) => Math.floor(r.stock / r.quantity)));
}

export function shortageText(shortages: { name: string; need: number; have: number }[]) {
  if (shortages.length === 0) return "";
  return "Short: " + shortages.map((s) => `${s.name} (need ${s.need}, have ${s.have})`).join(", ");
}
```

Run: `npx vitest run` — Expected: 10 passed (2 files).

- [ ] **Step 7: Commit**

```bash
cd "C:/Users/araji/AI/Sidhi Florals" && git add src/lib && git commit -m "feat: add cart and bouquet math helpers with tests

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 6: Supabase client, query client with IndexedDB persistence, API layer

**Files:**
- Create: `src/lib/supabase.ts`, `src/lib/queryClient.ts`, `src/api/types.ts`, `src/api/products.ts`, `src/api/customers.ts`, `src/api/sales.ts`, `src/api/analytics.ts`

**Interfaces:**
- Consumes: DB tables/functions/views from Tasks 2–4.
- Produces:
  - `supabase` client, `supabaseConfigError: string | null`, `errorMessage(err): string` (`src/lib/supabase.ts`)
  - `queryClient`, `persister` (`src/lib/queryClient.ts`)
  - Types in `src/api/types.ts` (below)
  - Hooks: `useProducts()`, `useRecipes()`, `useBouquetAvailability()`, `useCreateProduct()`, `useUpdateProduct()`, `useDeleteProduct()`, `useSaveRecipe()`; `useCustomers()`, `useCustomerSales(id)`, `useCreateCustomer()`, `useUpdateCustomer()`, `useDeleteCustomer()`; `useSales()`, `useCreateSale()`, `useRecordPayment()`, `useDeleteSale()`; `useDashboard()`, `useDailySales()`, `useMonthlySales()`, `useTopProducts()`, `useProfitMargins()`
  - `invalidateSalesData(qc)` helper used by every sale-affecting mutation.

- [ ] **Step 1: Supabase client and query client**

`src/lib/supabase.ts`:
```ts
import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseConfigError: string | null =
  !url || !key ? "Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Copy .env.example to .env and fill in your Supabase project values." : null;

export const supabase = createClient(url ?? "https://invalid.supabase.co", key ?? "invalid", {
  auth: { persistSession: false, autoRefreshToken: false },
});

/** Turns a Supabase/PostgREST error into a readable message. */
export function errorMessage(err: unknown): string {
  if (!err) return "Unknown error";
  const e = err as { message?: string; details?: string };
  const msg = e.message || e.details || String(err);
  return msg.replace(/^[A-Z0-9]{5}:\s*/, "");
}
```

`src/lib/queryClient.ts`:
```ts
import { QueryClient } from "@tanstack/react-query";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { get, set, del } from "idb-keyval";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000,
      gcTime: 24 * 60 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export const persister = createAsyncStoragePersister({
  storage: {
    getItem: async (k) => (await get<string>(k)) ?? null,
    setItem: (k, v) => set(k, v),
    removeItem: (k) => del(k),
  },
  key: "sidhi-florals-cache",
  throttleTime: 1000,
});
```

- [ ] **Step 2: Types**

`src/api/types.ts`:
```ts
export type Category = "flower" | "bouquet" | "accessory";
export type ItemKind = "product" | "custom_bouquet";

export interface Product {
  id: number; name: string; variety: string; unit: string; category: Category;
  purchase_price: number; selling_price: number; stock: number; supplier: string; created_at: string;
}
export type ProductInput = Omit<Product, "id" | "created_at">;

export interface RecipeRow { id: number; bouquet_id: number; component_id: number; quantity: number }
export interface RecipeInput { component_id: number; quantity: number }

export interface Shortage { product_id: number; name: string; need: number; have: number }
export interface BouquetAvailability { bouquet_id: number; can_make: number; shortages: Shortage[] }

export interface Customer {
  id: number; name: string; phone: string; business: string; address: string; notes: string; created_at: string;
}
export type CustomerInput = Omit<Customer, "id" | "created_at">;

export interface SaleComponent { id: number; product_id: number | null; name: string; quantity: number; unit_cost: number }
export interface SaleItem {
  id: number; product_id: number | null; name: string; kind: ItemKind; quantity: number; price: number; total: number; unit_cost: number;
  sale_item_components: SaleComponent[];
}
export interface Sale {
  id: number; customer_id: number | null; total: number; amount_paid: number; notes: string | null; date: string;
  customers: { name: string; phone: string } | null;
  sale_items: SaleItem[];
}

export interface CreateSaleItem {
  kind: ItemKind; product_id?: number; name?: string; quantity: number; price: number;
  components?: { product_id: number; quantity: number }[];
}
export interface CreateSaleInput { customer_id: number | null; items: CreateSaleItem[]; total: number; amount_paid: number; notes?: string | null }

export interface DashboardData {
  today_revenue: number; today_stems: number; monthly_revenue: number; monthly_bouquets: number;
  low_stock: { id: number; name: string; variety: string; unit: string; stock: number }[];
  star_product: { id: number; name: string; variety: string; category: Category; quantity_sold: number; revenue: number } | null;
  unavailable_bouquets: { id: number; name: string; shortages: Shortage[] }[];
}
export interface DailyRow { date: string; revenue: number; quantity_sold: number; profit: number }
export interface MonthlyRow { month: string; revenue: number; quantity_sold: number; profit: number }
export interface TopProduct { id: number; name: string; variety: string; category: Category; quantity_sold: number; revenue: number }
export interface MarginRow {
  id: number; name: string; variety: string; unit: string; category: Category; purchase_price: number; selling_price: number;
  profit_per_unit: number; profit_margin_percent: number; total_units_sold: number; total_revenue: number; total_profit: number; stock: number;
}
```

- [ ] **Step 3: Products API**

`src/api/products.ts`:
```ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { BouquetAvailability, Product, ProductInput, RecipeInput, RecipeRow } from "./types";

export const productKeys = {
  all: ["products"] as const,
  recipes: ["recipes"] as const,
  availability: ["bouquet-availability"] as const,
};

const num = (v: unknown) => Number(v ?? 0);
function mapProduct(r: Record<string, unknown>): Product {
  return { ...(r as unknown as Product), purchase_price: num(r.purchase_price), selling_price: num(r.selling_price), stock: num(r.stock) };
}

async function fetchProducts(): Promise<Product[]> {
  const { data, error } = await supabase.from("products").select("*").order("name").order("variety");
  if (error) throw error;
  return (data ?? []).map(mapProduct);
}

export function useProducts() {
  return useQuery({ queryKey: productKeys.all, queryFn: fetchProducts });
}

export function useRecipes() {
  return useQuery({
    queryKey: productKeys.recipes,
    queryFn: async (): Promise<RecipeRow[]> => {
      const { data, error } = await supabase.from("bouquet_recipes").select("*");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useBouquetAvailability() {
  return useQuery({
    queryKey: productKeys.availability,
    queryFn: async (): Promise<BouquetAvailability[]> => {
      const { data, error } = await supabase.from("v_bouquet_availability").select("*");
      if (error) throw error;
      return (data ?? []) as BouquetAvailability[];
    },
  });
}

function useInvalidateProducts() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: productKeys.all });
    qc.invalidateQueries({ queryKey: productKeys.recipes });
    qc.invalidateQueries({ queryKey: productKeys.availability });
    qc.invalidateQueries({ queryKey: ["profit-margins"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
  };
}

export function useCreateProduct() {
  const inv = useInvalidateProducts();
  return useMutation({
    mutationFn: async (input: ProductInput) => {
      const { data, error } = await supabase.from("products").insert(input).select().single();
      if (error) throw error;
      return mapProduct(data);
    },
    onSuccess: inv,
  });
}

export function useUpdateProduct() {
  const inv = useInvalidateProducts();
  return useMutation({
    mutationFn: async ({ id, ...input }: ProductInput & { id: number }) => {
      const { data, error } = await supabase.from("products").update(input).eq("id", id).select().single();
      if (error) throw error;
      return mapProduct(data);
    },
    onSuccess: inv,
  });
}

export function useDeleteProduct() {
  const inv = useInvalidateProducts();
  return useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: inv,
  });
}

/** Replaces the whole recipe of a bouquet. */
export function useSaveRecipe() {
  const inv = useInvalidateProducts();
  return useMutation({
    mutationFn: async ({ bouquetId, rows }: { bouquetId: number; rows: RecipeInput[] }) => {
      const del = await supabase.from("bouquet_recipes").delete().eq("bouquet_id", bouquetId);
      if (del.error) throw del.error;
      if (rows.length) {
        const ins = await supabase.from("bouquet_recipes").insert(rows.map((r) => ({ ...r, bouquet_id: bouquetId })));
        if (ins.error) throw ins.error;
      }
    },
    onSuccess: inv,
  });
}
```

- [ ] **Step 4: Sales API (customers depends on it)**

`src/api/sales.ts`:
```ts
import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { CreateSaleInput, Sale } from "./types";

export const saleKeys = { all: ["sales"] as const };

export const SALE_SELECT = "*, customers(name, phone), sale_items(*, sale_item_components(*))";

const num = (v: unknown) => Number(v ?? 0);
export function mapSale(r: Record<string, unknown>): Sale {
  const s = r as unknown as Sale;
  return {
    ...s,
    total: num(s.total),
    amount_paid: num(s.amount_paid),
    sale_items: (s.sale_items ?? [])
      .map((i) => ({
        ...i,
        price: num(i.price), total: num(i.total), unit_cost: num(i.unit_cost),
        sale_item_components: (i.sale_item_components ?? []).map((c) => ({ ...c, unit_cost: num(c.unit_cost) })),
      }))
      .sort((a, b) => a.id - b.id),
  };
}

export function invalidateSalesData(qc: QueryClient) {
  for (const key of ["sales", "products", "bouquet-availability", "dashboard", "daily-sales", "monthly-sales", "top-products", "profit-margins", "customer-sales"]) {
    qc.invalidateQueries({ queryKey: [key] });
  }
}

export function useSales() {
  return useQuery({
    queryKey: saleKeys.all,
    queryFn: async (): Promise<Sale[]> => {
      const { data, error } = await supabase.from("sales").select(SALE_SELECT).order("date", { ascending: false }).limit(500);
      if (error) throw error;
      return (data ?? []).map(mapSale);
    },
  });
}

export function useCreateSale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateSaleInput): Promise<Sale> => {
      const { data, error } = await supabase.rpc("create_sale", {
        p_customer_id: input.customer_id, p_items: input.items, p_total: input.total, p_amount_paid: input.amount_paid, p_notes: input.notes ?? null,
      });
      if (error) throw error;
      return mapSale(data as Record<string, unknown>);
    },
    onSuccess: () => invalidateSalesData(qc),
  });
}

export function useRecordPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ saleId, amount }: { saleId: number; amount: number }): Promise<Sale> => {
      const { data, error } = await supabase.rpc("record_payment", { p_sale_id: saleId, p_amount: amount });
      if (error) throw error;
      return mapSale(data as Record<string, unknown>);
    },
    onSuccess: () => invalidateSalesData(qc),
  });
}

export function useDeleteSale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (saleId: number) => {
      const { error } = await supabase.rpc("delete_sale", { p_sale_id: saleId });
      if (error) throw error;
    },
    onSuccess: () => invalidateSalesData(qc),
  });
}
```

- [ ] **Step 5: Customers API**

`src/api/customers.ts`:
```ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { mapSale, SALE_SELECT } from "./sales";
import type { Customer, CustomerInput, Sale } from "./types";

export const customerKeys = { all: ["customers"] as const, sales: (id: number) => ["customer-sales", id] as const };

export function useCustomers() {
  return useQuery({
    queryKey: customerKeys.all,
    queryFn: async (): Promise<Customer[]> => {
      const { data, error } = await supabase.from("customers").select("*").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCustomerSales(id: number | null) {
  return useQuery({
    queryKey: customerKeys.sales(id ?? 0),
    enabled: id != null,
    queryFn: async (): Promise<Sale[]> => {
      const { data, error } = await supabase.from("sales").select(SALE_SELECT).eq("customer_id", id!).order("date", { ascending: false });
      if (error) throw error;
      return (data ?? []).map(mapSale);
    },
  });
}

function useInvalidateCustomers() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: customerKeys.all });
}

export function useCreateCustomer() {
  const inv = useInvalidateCustomers();
  return useMutation({
    mutationFn: async (input: CustomerInput) => {
      const { data, error } = await supabase.from("customers").insert(input).select().single();
      if (error) throw error;
      return data as Customer;
    },
    onSuccess: inv,
  });
}

export function useUpdateCustomer() {
  const inv = useInvalidateCustomers();
  return useMutation({
    mutationFn: async ({ id, ...input }: CustomerInput & { id: number }) => {
      const { data, error } = await supabase.from("customers").update(input).eq("id", id).select().single();
      if (error) throw error;
      return data as Customer;
    },
    onSuccess: inv,
  });
}

export function useDeleteCustomer() {
  const inv = useInvalidateCustomers();
  return useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from("customers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: inv,
  });
}
```

- [ ] **Step 6: Analytics API**

`src/api/analytics.ts`:
```ts
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { DailyRow, DashboardData, MarginRow, MonthlyRow, TopProduct } from "./types";

async function selectView<T>(view: string): Promise<T[]> {
  const { data, error } = await supabase.from(view).select("*");
  if (error) throw error;
  return (data ?? []) as T[];
}

export function useDashboard() {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: async (): Promise<DashboardData> => {
      const { data, error } = await supabase.rpc("get_dashboard");
      if (error) throw error;
      return data as DashboardData;
    },
  });
}

export const useDailySales = () => useQuery({ queryKey: ["daily-sales"], queryFn: () => selectView<DailyRow>("v_daily_sales") });
export const useMonthlySales = () => useQuery({ queryKey: ["monthly-sales"], queryFn: () => selectView<MonthlyRow>("v_monthly_sales") });
export const useTopProducts = () => useQuery({ queryKey: ["top-products"], queryFn: () => selectView<TopProduct>("v_top_products") });
export const useProfitMargins = () => useQuery({ queryKey: ["profit-margins"], queryFn: () => selectView<MarginRow>("v_profit_margins") });
```

- [ ] **Step 7: Typecheck and commit**

Run: `cd "C:/Users/araji/AI/Sidhi Florals" && npm run typecheck` — Expected: no output.

```bash
git add src/lib src/api && git commit -m "feat: add Supabase client, persisted query client and API hooks

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 7: UI primitives, layout shell, routing, petals

**Files:**
- Create: `src/components/ui/Button.tsx`, `src/components/ui/Input.tsx`, `src/components/ui/Dialog.tsx`, `src/components/ui/Skeleton.tsx`, `src/components/ui/Tabs.tsx`, `src/components/ui/SearchInput.tsx`, `src/components/layout/Logo.tsx`, `src/components/layout/Sidebar.tsx`, `src/components/layout/MobileHeader.tsx`, `src/components/layout/AppLayout.tsx`, `src/components/PetalField.tsx`, `src/components/PetalBurst.tsx`, `src/components/CountUp.tsx`, `src/components/SetupScreen.tsx`, `src/components/InstallButton.tsx`, `src/components/CalculatorWidget.tsx` (placeholder), `src/pages/NotFound.tsx`, placeholder pages `src/pages/{Dashboard,Billing,Inventory,Customers,Sales,Reports,Credits}.tsx`, `public/petal.svg`
- Modify: `src/App.tsx`, `src/main.tsx`

**Interfaces:**
- Produces: `<Dialog open onOpenChange title description? size? footer?>`, `<Sheet open onOpenChange side="left"|"bottom" title?>`, `<Button variant size loading>`, `<Input>`, `<Textarea>`, `<Select>`, `<Field label hint?>`, `<Skeleton className>`, `<TableSkeleton rows cols>`, `<Tabs value onChange items>`, `<SearchInput value onChange placeholder>`, `<PetalField count?>`, `burstPetals(el)`, `<CountUp value format?>`, `<PageHeader title subtitle? actions?>`, `prefetchRoute(href)`.
- Route paths: `/`, `/billing`, `/inventory`, `/customers`, `/sales`, `/reports`, `/credits`.

- [ ] **Step 1: UI primitives**

`src/components/ui/Button.tsx`:
```tsx
import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "outline" | "danger";
type Size = "sm" | "md" | "lg";
const variants: Record<Variant, string> = {
  primary: "btn-primary", secondary: "btn-secondary", ghost: "btn-ghost", outline: "btn-outline",
  danger: "btn bg-danger-soft text-danger hover:bg-danger hover:text-white",
};
const sizes: Record<Size, string> = { sm: "px-3 py-1.5 text-sm rounded-lg", md: "", lg: "px-6 py-3 text-base" };

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> { variant?: Variant; size?: Size; loading?: boolean }

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading, className, children, disabled, ...rest }, ref) {
  return (
    <button ref={ref} className={cn(variants[variant], sizes[size], className)} disabled={disabled || loading} {...rest}>
      {loading && <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" aria-hidden />}
      {children}
    </button>
  );
});
```

`src/components/ui/Input.tsx`:
```tsx
import { forwardRef, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...p }, ref) {
  return <input ref={ref} className={cn("input", className)} {...p} />;
});
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...p }, ref) {
  return <textarea ref={ref} className={cn("input min-h-20", className)} {...p} />;
});
export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select({ className, ...p }, ref) {
  return <select ref={ref} className={cn("input bg-surface", className)} {...p} />;
});

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
      {hint && <p className="text-xs text-muted mt-1">{hint}</p>}
    </div>
  );
}
```

`src/components/ui/Dialog.tsx`:
```tsx
import * as RD from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { AnimatePresence, m } from "motion/react";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface DialogProps {
  open: boolean; onOpenChange: (o: boolean) => void; title: ReactNode; description?: string;
  children: ReactNode; footer?: ReactNode; size?: "sm" | "md" | "lg" | "xl";
}
const sizes = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl", xl: "max-w-4xl" };

export function Dialog({ open, onOpenChange, title, description, children, footer, size = "md" }: DialogProps) {
  return (
    <RD.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <RD.Portal forceMount>
            <RD.Overlay asChild forceMount>
              <m.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}
                className="fixed inset-0 z-50 bg-foreground/35" />
            </RD.Overlay>
            <RD.Content asChild forceMount aria-describedby={description ? undefined : ""}>
              <m.div initial={{ opacity: 0, scale: 0.96, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 8 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className={cn("fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] max-h-[90vh] flex flex-col card overflow-hidden", sizes[size])}>
                <div className="px-6 py-4 border-b border-border flex items-start justify-between gap-4 bg-background/60">
                  <div>
                    <RD.Title className="font-display text-xl font-semibold">{title}</RD.Title>
                    {description && <RD.Description className="text-sm text-muted mt-0.5">{description}</RD.Description>}
                  </div>
                  <RD.Close className="p-1.5 rounded-lg text-muted hover:bg-primary-soft hover:text-primary transition-colors cursor-pointer" aria-label="Close"><X className="w-5 h-5" /></RD.Close>
                </div>
                <div className="p-6 overflow-y-auto flex-1">{children}</div>
                {footer && <div className="px-6 py-4 border-t border-border bg-background/60 flex justify-end gap-3">{footer}</div>}
              </m.div>
            </RD.Content>
          </RD.Portal>
        )}
      </AnimatePresence>
    </RD.Root>
  );
}

interface SheetProps { open: boolean; onOpenChange: (o: boolean) => void; side?: "left" | "bottom"; children: ReactNode; title?: string }
export function Sheet({ open, onOpenChange, side = "left", children, title = "Menu" }: SheetProps) {
  const isLeft = side === "left";
  return (
    <RD.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <RD.Portal forceMount>
            <RD.Overlay asChild forceMount>
              <m.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} className="fixed inset-0 z-50 bg-foreground/35" />
            </RD.Overlay>
            <RD.Content asChild forceMount aria-describedby="">
              <m.div
                initial={isLeft ? { x: "-100%" } : { y: "100%" }} animate={{ x: 0, y: 0 }} exit={isLeft ? { x: "-100%" } : { y: "100%" }}
                transition={{ type: "spring", stiffness: 380, damping: 36 }}
                className={cn("fixed z-50 bg-surface shadow-2xl flex flex-col", isLeft ? "top-0 left-0 h-full w-72" : "left-0 right-0 bottom-0 max-h-[92vh] rounded-t-3xl")}>
                <RD.Title className="sr-only">{title}</RD.Title>
                {children}
              </m.div>
            </RD.Content>
          </RD.Portal>
        )}
      </AnimatePresence>
    </RD.Root>
  );
}
```

`src/components/ui/Skeleton.tsx`:
```tsx
import { cn } from "@/lib/utils";
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("bg-border/60 rounded-lg animate-pulse", className)} aria-hidden />;
}
export function TableSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="p-4 space-y-3">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4">{Array.from({ length: cols }).map((_, c) => <Skeleton key={c} className="h-5 flex-1" />)}</div>
      ))}
    </div>
  );
}
```

`src/components/ui/Tabs.tsx`:
```tsx
import { m } from "motion/react";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export interface TabItem<T extends string> { value: T; label: string; icon?: LucideIcon; count?: number }
export function Tabs<T extends string>({ value, onChange, items, className, id = "tabs" }: { value: T; onChange: (v: T) => void; items: TabItem<T>[]; className?: string; id?: string }) {
  return (
    <div className={cn("inline-flex p-1 bg-border/40 rounded-xl", className)}>
      {items.map((it) => {
        const active = it.value === value;
        return (
          <button key={it.value} onClick={() => onChange(it.value)}
            className={cn("relative px-4 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer flex items-center gap-2", active ? "text-primary" : "text-muted hover:text-foreground")}>
            {active && <m.span layoutId={`${id}-pill`} className="absolute inset-0 bg-surface rounded-lg shadow-card" transition={{ type: "spring", stiffness: 400, damping: 32 }} />}
            <span className="relative flex items-center gap-2">{it.icon && <it.icon className="w-4 h-4" />}{it.label}{it.count != null && <span className="text-xs opacity-70">({it.count})</span>}</span>
          </button>
        );
      })}
    </div>
  );
}
```

`src/components/ui/SearchInput.tsx`:
```tsx
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
export function SearchInput({ value, onChange, placeholder, className }: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string }) {
  return (
    <div className={cn("relative", className)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
      <input type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="input pl-9" />
    </div>
  );
}
```

- [ ] **Step 2: Petals, count-up, install button, setup screen**

`public/petal.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 2C7 6 4 11 6 17c1.5 4 5 5 6 5s4.5-1 6-5c2-6-1-11-6-15z" fill="#F4A7B9"/></svg>
```

`src/components/PetalField.tsx`:
```tsx
import { useMemo, type CSSProperties } from "react";

/** Decorative falling petals. CSS-animated; hidden under prefers-reduced-motion (see index.css). */
export function PetalField({ count = 9 }: { count?: number }) {
  const petals = useMemo(() => Array.from({ length: count }, (_, i) => ({
    left: `${(i * 97) % 100}%`, size: 10 + ((i * 37) % 10), duration: 12 + ((i * 53) % 9), delay: -((i * 41) % 12),
    drift: (i % 2 ? 1 : -1) * (30 + ((i * 29) % 50)), opacity: 0.2 + ((i * 13) % 15) / 100,
  })), [count]);
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden z-0" aria-hidden>
      {petals.map((p, i) => (
        <img key={i} src="/petal.svg" alt="" className="petal" width={p.size} height={p.size}
          style={{ left: p.left, "--petal-duration": `${p.duration}s`, "--petal-delay": `${p.delay}s`, "--petal-drift": `${p.drift}px`, "--petal-opacity": p.opacity } as CSSProperties} />
      ))}
    </div>
  );
}
```

`src/components/PetalBurst.tsx`:
```tsx
/** Spawns petals from the centre of `el`; each removes itself when its CSS animation ends. */
export function burstPetals(el: HTMLElement, count = 5) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const r = el.getBoundingClientRect();
  for (let i = 0; i < count; i++) {
    const img = document.createElement("img");
    img.src = "/petal.svg"; img.alt = ""; img.className = "petal-burst"; img.width = 12; img.height = 12;
    const angle = Math.PI + (Math.PI * (i + 0.5)) / count; // upward fan
    img.style.position = "fixed"; img.style.zIndex = "60";
    img.style.left = `${r.left + r.width / 2}px`; img.style.top = `${r.top + r.height / 2}px`;
    img.style.setProperty("--bx", `${Math.cos(angle) * 60}px`); img.style.setProperty("--by", `${Math.sin(angle) * 60}px`);
    document.body.appendChild(img);
    img.addEventListener("animationend", () => img.remove());
    setTimeout(() => img.remove(), 1000);
  }
}
```

`src/components/CountUp.tsx`:
```tsx
import { useEffect, useRef, useState } from "react";

export function CountUp({ value, format = (n: number) => String(Math.round(n)), duration = 600 }: { value: number; format?: (n: number) => string; duration?: number }) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setShown(value); from.current = value; return; }
    const start = performance.now(); const a = from.current; const b = value; let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration); const e = 1 - Math.pow(1 - p, 3);
      setShown(a + (b - a) * e);
      if (p < 1) raf = requestAnimationFrame(tick); else from.current = b;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return <>{format(shown)}</>;
}
```

`src/components/InstallButton.tsx`:
```tsx
import { useEffect, useState } from "react";
import { Download } from "lucide-react";

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

export function InstallButton() {
  const [evt, setEvt] = useState<BIPEvent | null>(null);
  useEffect(() => {
    const h = (e: Event) => { e.preventDefault(); setEvt(e as BIPEvent); };
    window.addEventListener("beforeinstallprompt", h);
    return () => window.removeEventListener("beforeinstallprompt", h);
  }, []);
  if (!evt || window.matchMedia("(display-mode: standalone)").matches) return null;
  return (
    <button onClick={async () => { await evt.prompt(); await evt.userChoice; setEvt(null); }} className="btn-primary w-full">
      <Download className="w-4 h-4" /> Install App
    </button>
  );
}
```

`src/components/SetupScreen.tsx`:
```tsx
export function SetupScreen({ message }: { message: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="card p-8 max-w-md text-center space-y-3">
        <h1 className="text-2xl">Sidhi Florals needs setup</h1>
        <p className="text-muted">{message}</p>
        <pre className="text-left text-xs bg-background p-3 rounded-lg border border-border">VITE_SUPABASE_URL=...{"\n"}VITE_SUPABASE_ANON_KEY=...</pre>
      </div>
    </div>
  );
}
```

`src/components/CalculatorWidget.tsx` (placeholder; real one in Task 16):
```tsx
export function CalculatorWidget() { return null; }
```

- [ ] **Step 3: Layout**

`src/components/layout/Logo.tsx`:
```tsx
import { Flower2 } from "lucide-react";
import { cn } from "@/lib/utils";
export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className={cn("rounded-2xl bg-linear-to-br from-primary to-accent text-white flex items-center justify-center shadow-rose", compact ? "w-9 h-9" : "w-12 h-12")}>
        <Flower2 className={compact ? "w-5 h-5" : "w-7 h-7"} />
      </div>
      <div>
        <h1 className={cn("font-display font-bold leading-tight text-gradient", compact ? "text-lg" : "text-2xl")}>Sidhi</h1>
        <p className="text-[10px] font-semibold text-muted uppercase tracking-[0.2em]">Florals</p>
      </div>
    </div>
  );
}
```

`src/components/layout/Sidebar.tsx`:
```tsx
import { Link, useLocation } from "wouter";
import { LayoutDashboard, ShoppingBag, Flower2, Users, History, BarChart3, Coins } from "lucide-react";
import { m } from "motion/react";
import { cn } from "@/lib/utils";
import { Logo } from "./Logo";
import { InstallButton } from "../InstallButton";
import { prefetchRoute } from "@/App";

export const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/billing", label: "Billing", icon: ShoppingBag },
  { href: "/inventory", label: "Inventory", icon: Flower2 },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/sales", label: "Sales", icon: History },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/credits", label: "Credits & Dues", icon: Coins },
];

export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const [location] = useLocation();
  return (
    <div className="h-full flex flex-col pt-8 pb-6 px-4">
      <div className="px-3 mb-10"><Logo /></div>
      <nav className="flex-1 space-y-1">
        {NAV.map((item) => {
          const active = location === item.href || (item.href !== "/" && location.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href} onClick={onNavigate} onMouseEnter={() => prefetchRoute(item.href)} onTouchStart={() => prefetchRoute(item.href)}
              className={cn("relative flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors", active ? "text-primary" : "text-muted hover:text-foreground hover:bg-primary-soft/50")}>
              {active && <m.span layoutId="nav-pill" className="absolute inset-0 bg-primary-soft rounded-xl" transition={{ type: "spring", stiffness: 350, damping: 30 }} />}
              <item.icon className="relative w-5 h-5" />
              <span className="relative">{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto px-1 space-y-3">
        <InstallButton />
        <div className="p-3 rounded-xl bg-secondary-soft border border-secondary/20 flex items-center gap-2 text-sm text-secondary font-medium">
          <span className="w-2 h-2 rounded-full bg-secondary" /> Fresh & online
        </div>
      </div>
    </div>
  );
}

export function Sidebar() {
  return (
    <aside className="hidden lg:flex fixed top-0 left-0 h-screen w-72 flex-col border-r border-border bg-surface/70 z-20">
      <SidebarContent />
    </aside>
  );
}
```

`src/components/layout/MobileHeader.tsx`:
```tsx
import { useState } from "react";
import { Menu } from "lucide-react";
import { Sheet } from "../ui/Dialog";
import { Logo } from "./Logo";
import { SidebarContent } from "./Sidebar";

export function MobileHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-surface/95 border-b border-border">
      <Logo compact />
      <button onClick={() => setOpen(true)} className="p-2 rounded-lg text-muted hover:bg-primary-soft hover:text-primary cursor-pointer" aria-label="Open menu"><Menu className="w-6 h-6" /></button>
      <Sheet open={open} onOpenChange={setOpen} side="left"><SidebarContent onNavigate={() => setOpen(false)} /></Sheet>
    </header>
  );
}
```

`src/components/layout/AppLayout.tsx`:
```tsx
import type { ReactNode } from "react";
import { useLocation } from "wouter";
import { AnimatePresence, m } from "motion/react";
import { Sidebar } from "./Sidebar";
import { MobileHeader } from "./MobileHeader";
import { CalculatorWidget } from "../CalculatorWidget";

export function AppLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      <MobileHeader />
      <Sidebar />
      <main className="flex-1 lg:ml-72 min-h-screen p-4 sm:p-6 lg:p-8 relative z-10">
        <AnimatePresence mode="wait" initial={false}>
          <m.div key={location} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.22, ease: "easeOut" }}
            className="max-w-7xl mx-auto w-full pb-24">
            {children}
          </m.div>
        </AnimatePresence>
      </main>
      <CalculatorWidget />
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div>
        <h1 className="text-3xl">{title}</h1>
        {subtitle && <p className="text-muted mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-3 w-full sm:w-auto">{actions}</div>}
    </div>
  );
}
```

- [ ] **Step 4: App with lazy routes, and main with providers**

`src/App.tsx`:
```tsx
import { lazy, Suspense } from "react";
import { Route, Switch } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import { Skeleton } from "@/components/ui/Skeleton";

const loaders = {
  "/": () => import("@/pages/Dashboard"),
  "/billing": () => import("@/pages/Billing"),
  "/inventory": () => import("@/pages/Inventory"),
  "/customers": () => import("@/pages/Customers"),
  "/sales": () => import("@/pages/Sales"),
  "/reports": () => import("@/pages/Reports"),
  "/credits": () => import("@/pages/Credits"),
} as const;

export function prefetchRoute(href: string) {
  const l = loaders[href as keyof typeof loaders];
  if (l) void l();
}

const Dashboard = lazy(loaders["/"]);
const Billing = lazy(loaders["/billing"]);
const Inventory = lazy(loaders["/inventory"]);
const Customers = lazy(loaders["/customers"]);
const Sales = lazy(loaders["/sales"]);
const Reports = lazy(loaders["/reports"]);
const Credits = lazy(loaders["/credits"]);
const NotFound = lazy(() => import("@/pages/NotFound"));

function PageFallback() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-9 w-56" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}</div>
      <Skeleton className="h-72" />
    </div>
  );
}

export default function App() {
  return (
    <AppLayout>
      <Suspense fallback={<PageFallback />}>
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/billing" component={Billing} />
          <Route path="/inventory" component={Inventory} />
          <Route path="/customers" component={Customers} />
          <Route path="/sales" component={Sales} />
          <Route path="/reports" component={Reports} />
          <Route path="/credits" component={Credits} />
          <Route component={NotFound} />
        </Switch>
      </Suspense>
    </AppLayout>
  );
}
```

`src/main.tsx`:
```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { LazyMotion, domAnimation } from "motion/react";
import { Toaster } from "sonner";
import "@fontsource-variable/inter";
import "@fontsource-variable/fraunces";
import "./index.css";
import App from "./App";
import { queryClient, persister } from "./lib/queryClient";
import { supabaseConfigError } from "./lib/supabase";
import { SetupScreen } from "./components/SetupScreen";

const root = createRoot(document.getElementById("root")!);

if (supabaseConfigError) {
  root.render(<SetupScreen message={supabaseConfigError} />);
} else {
  root.render(
    <StrictMode>
      <PersistQueryClientProvider client={queryClient} persistOptions={{ persister, maxAge: 24 * 60 * 60 * 1000, buster: "v1" }}>
        <LazyMotion features={domAnimation} strict>
          <App />
          <Toaster position="top-center" richColors closeButton />
        </LazyMotion>
      </PersistQueryClientProvider>
    </StrictMode>,
  );
}

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => { navigator.serviceWorker.register("/sw.js").catch(() => {}); });
}
```

Placeholder pages — create each of `src/pages/Dashboard.tsx`, `Billing.tsx`, `Inventory.tsx`, `Customers.tsx`, `Sales.tsx`, `Reports.tsx`, `Credits.tsx` with the page's own name in place of `Dashboard`:
```tsx
import { PageHeader } from "@/components/layout/AppLayout";
export default function Dashboard() { return <PageHeader title="Dashboard" subtitle="Coming soon" />; }
```

`src/pages/NotFound.tsx`:
```tsx
import { Link } from "wouter";
export default function NotFound() {
  return (
    <div className="card p-10 text-center space-y-3">
      <h1 className="text-3xl">Page not found</h1>
      <Link href="/" className="btn-primary inline-flex">Back to Dashboard</Link>
    </div>
  );
}
```

- [ ] **Step 5: Build and verify visually**

Run: `cd "C:/Users/araji/AI/Sidhi Florals" && npm run typecheck && npm run build`
Expected: no errors; output lists separate chunks `Dashboard-*.js`, `Billing-*.js`, …, `vendor-*.js`, `motion-*.js`.
Then start the dev server (`npm run dev` via the preview tool) and open `http://localhost:5173`: sidebar with 7 items, active pill slides on click, page fades on route change; at mobile width a header with hamburger opens the sheet.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: add UI primitives, layout shell, lazy routes and petal effects

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 8: Dashboard page

**Files:**
- Modify: `src/pages/Dashboard.tsx`

**Interfaces:**
- Consumes: `useDashboard()`, `useDailySales()` (Task 6); `PetalField`, `CountUp`, `Skeleton`, `PageHeader` (Task 7); `formatCurrency`, `formatNumber`, `displayName`.

- [ ] **Step 1: Write the page**

`src/pages/Dashboard.tsx`:
```tsx
import { Link } from "wouter";
import { m } from "motion/react";
import { Banknote, Flower2, TrendingUp, Gift, AlertTriangle, Star, Sparkles } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useDashboard, useDailySales } from "@/api/analytics";
import { PageHeader } from "@/components/layout/AppLayout";
import { PetalField } from "@/components/PetalField";
import { CountUp } from "@/components/CountUp";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatCurrency, formatNumber, displayName } from "@/lib/utils";
import { shortageText } from "@/lib/bouquet";

const cards = [
  { key: "today_revenue", title: "Today's Revenue", icon: Banknote, tone: "from-secondary to-emerald-400", money: true },
  { key: "today_stems", title: "Stems Sold Today", icon: Flower2, tone: "from-primary to-pink-400", money: false },
  { key: "monthly_revenue", title: "Monthly Revenue", icon: TrendingUp, tone: "from-violet-500 to-fuchsia-400", money: true },
  { key: "monthly_bouquets", title: "Bouquets This Month", icon: Gift, tone: "from-accent to-orange-400", money: false },
] as const;

export default function Dashboard() {
  const { data, isPending } = useDashboard();
  const { data: daily, isPending: dailyPending } = useDailySales();

  return (
    <div className="space-y-8 relative">
      <PetalField />
      <PageHeader title="Dashboard" subtitle="Good day! Here's how Sidhi Florals is blooming." />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {cards.map((c, i) => (
          <m.div key={c.key} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06, duration: 0.3 }}
            className="card card-hover p-5 flex items-center gap-4 relative overflow-hidden">
            <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full bg-linear-to-br ${c.tone} opacity-10`} />
            <div className={`w-12 h-12 rounded-2xl bg-linear-to-br ${c.tone} text-white flex items-center justify-center shadow-card shrink-0`}><c.icon className="w-6 h-6" /></div>
            <div className="min-w-0">
              <p className="text-sm text-muted">{c.title}</p>
              {isPending && !data ? <Skeleton className="h-7 w-28 mt-1" /> : (
                <h3 className="text-2xl mt-0.5 truncate">
                  <CountUp value={data?.[c.key] ?? 0} format={c.money ? formatCurrency : formatNumber} />
                </h3>
              )}
            </div>
          </m.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card p-6">
          <h2 className="text-xl mb-4">Revenue — last 30 days</h2>
          <div className="h-64 sm:h-80">
            {dailyPending && !daily ? <Skeleton className="h-full" /> : daily && daily.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={daily} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#D9456C" stopOpacity={0.35} /><stop offset="95%" stopColor="#D9456C" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EADFD8" />
                  <XAxis dataKey="date" tickFormatter={(d: string) => d.slice(5)} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#7A6B7C" }} dy={8} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#7A6B7C" }} tickFormatter={(v: number) => `₹${v >= 1000 ? `${v / 1000}k` : v}`} width={52} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #EADFD8", boxShadow: "0 8px 24px -12px rgba(42,30,43,.25)" }} formatter={(v: number) => [formatCurrency(v), "Revenue"]} />
                  <Area type="monotone" dataKey="revenue" stroke="#D9456C" strokeWidth={3} fill="url(#rev)" isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            ) : <div className="h-full flex items-center justify-center text-muted">No sales yet — your first bill will show up here.</div>}
          </div>
        </div>

        <div className="space-y-6">
          <div className="card p-6 bg-linear-to-br from-accent-soft to-surface border-accent/30 relative overflow-hidden">
            <Sparkles className="absolute -right-3 -top-3 w-20 h-20 text-accent/20" />
            <div className="flex items-center gap-2 mb-3"><Star className="w-5 h-5 text-accent fill-accent" /><h3 className="text-lg">Bloom of the Month</h3></div>
            {isPending && !data ? <Skeleton className="h-16" /> : data?.star_product ? (
              <div>
                <p className="text-xl font-semibold">{displayName(data.star_product)}</p>
                <p className="text-sm text-muted">{formatNumber(data.star_product.quantity_sold)} sold · {formatCurrency(data.star_product.revenue)}</p>
              </div>
            ) : <p className="text-muted text-sm">No sales this month yet.</p>}
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-danger" /> Low stock</h3>
              <Link href="/inventory" className="text-sm font-medium text-primary hover:underline">Inventory</Link>
            </div>
            {isPending && !data ? <Skeleton className="h-24" /> : data && data.low_stock.length > 0 ? (
              <ul className="space-y-2">
                {data.low_stock.map((p) => (
                  <li key={p.id} className="flex justify-between items-center p-2.5 rounded-xl bg-danger-soft/60">
                    <span className="font-medium">{displayName(p)}</span>
                    <span className="stock-badge bg-danger text-white">{p.stock} {p.unit}</span>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-secondary bg-secondary-soft p-3 rounded-xl">All flowers well stocked.</p>}
          </div>

          {data && data.unavailable_bouquets.length > 0 && (
            <div className="card p-6">
              <h3 className="text-lg flex items-center gap-2 mb-3"><Gift className="w-5 h-5 text-primary" /> Bouquets short on flowers</h3>
              <ul className="space-y-2 text-sm">
                {data.unavailable_bouquets.map((b) => (
                  <li key={b.id} className="p-2.5 rounded-xl bg-primary-soft/60">
                    <p className="font-medium">{b.name}</p>
                    <p className="text-muted text-xs">{shortageText(b.shortages) || "No recipe defined"}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify**

Run `npm run typecheck`; open `/` in the dev server. Expected: petals drift; 4 cards count up; chart shows "No sales yet" (or data if any); low-stock list is empty ("All flowers well stocked") with seed data; no console errors.

- [ ] **Step 3: Commit**

```bash
git add src/pages/Dashboard.tsx && git commit -m "feat(dashboard): stats, revenue chart, bloom of the month and stock alerts

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 9: BouquetBuilder component (TDD)

**Files:**
- Create: `src/components/BouquetBuilder.tsx`, `src/hooks/useMediaQuery.ts`, `src/components/__tests__/BouquetBuilder.test.tsx`

**Interfaces:**
- Produces:
  ```ts
  export interface BuilderComponent { productId: number; name: string; quantity: number; unitCost: number; sellingPrice: number; stock: number; unit: string }
  export interface BuilderResult { components: BuilderComponent[]; price: number; label: string }
  export interface BouquetBuilderProps {
    open: boolean; onOpenChange: (o: boolean) => void;
    mode: "custom" | "recipe";           // custom: price+label fields, "Add to bill"; recipe: "Save recipe"
    products: Product[];                  // any list; builder ignores category 'bouquet'
    initial?: Partial<BuilderResult>;
    onSubmit: (r: BuilderResult) => void;
    submitting?: boolean;
  }
  export function BouquetBuilder(props: BouquetBuilderProps): JSX.Element
  export function useMediaQuery(q: string): boolean
  ```

- [ ] **Step 1: Write the failing component test**

`src/components/__tests__/BouquetBuilder.test.tsx`:
```tsx
import { describe, it, expect, vi } from "vitest";
import { render as rtlRender, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LazyMotion, domAnimation } from "motion/react";
import { BouquetBuilder } from "@/components/BouquetBuilder";
import type { Product } from "@/api/types";
import type { ReactElement } from "react";

// `m` components need LazyMotion features to render
const render = (ui: ReactElement) => rtlRender(<LazyMotion features={domAnimation}>{ui}</LazyMotion>);

const p = (o: Partial<Product>): Product => ({
  id: 1, name: "Rose", variety: "Red", unit: "stem", category: "flower", purchase_price: 8, selling_price: 15, stock: 20, supplier: "", created_at: "", ...o,
});
const products = [p({}), p({ id: 2, name: "Lily", variety: "White", purchase_price: 35, selling_price: 70, stock: 2 }), p({ id: 3, name: "Red Rose Bouquet", variety: "", category: "bouquet" })];

describe("BouquetBuilder", () => {
  it("adds components, defaults price to selling total, and submits", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<BouquetBuilder open onOpenChange={() => {}} mode="custom" products={products} onSubmit={onSubmit} />);

    expect(screen.queryByText("Red Rose Bouquet")).toBeNull(); // bouquets are not components

    await user.click(screen.getByRole("button", { name: /add rose · red/i }));
    await user.click(screen.getByRole("button", { name: /add rose · red/i }));
    await user.click(screen.getByRole("button", { name: /add lily · white/i }));

    const price = screen.getByLabelText(/price/i) as HTMLInputElement;
    expect(price.value).toBe("100"); // 2*15 + 70
    expect(screen.getByText(/cost/i).parentElement).toHaveTextContent("₹51"); // 2*8 + 35

    await user.clear(price);
    await user.type(price, "150");
    await user.click(screen.getByRole("button", { name: /add to bill/i }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const r = onSubmit.mock.calls[0][0];
    expect(r.price).toBe(150);
    expect(r.components).toEqual([
      expect.objectContaining({ productId: 1, quantity: 2 }),
      expect.objectContaining({ productId: 2, quantity: 1 }),
    ]);
  });

  it("blocks quantities above stock in custom mode", async () => {
    const user = userEvent.setup();
    render(<BouquetBuilder open onOpenChange={() => {}} mode="custom" products={products} onSubmit={() => {}} />);
    const add = screen.getByRole("button", { name: /add lily · white/i });
    await user.click(add); await user.click(add); await user.click(add);
    expect(screen.getByLabelText(/quantity of lily · white/i)).toHaveValue(2);
  });

  it("recipe mode hides price and shows Save recipe", () => {
    render(<BouquetBuilder open onOpenChange={() => {}} mode="recipe" products={products} onSubmit={() => {}} />);
    expect(screen.queryByLabelText(/price/i)).toBeNull();
    expect(screen.getByRole("button", { name: /save recipe/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/components/__tests__/BouquetBuilder.test.tsx` — Expected: FAIL, module not found.

- [ ] **Step 3: Implement the hook and component**

`src/hooks/useMediaQuery.ts`:
```ts
import { useEffect, useState } from "react";
export function useMediaQuery(q: string) {
  const [m, setM] = useState(() => typeof window !== "undefined" && window.matchMedia(q).matches);
  useEffect(() => {
    const mq = window.matchMedia(q); const h = () => setM(mq.matches);
    mq.addEventListener("change", h); return () => mq.removeEventListener("change", h);
  }, [q]);
  return m;
}
```

`src/components/BouquetBuilder.tsx`:
```tsx
import { useEffect, useMemo, useState } from "react";
import { Plus, Minus, Trash2, Flower2 } from "lucide-react";
import { AnimatePresence, m } from "motion/react";
import type { Product } from "@/api/types";
import { Dialog, Sheet } from "./ui/Dialog";
import { Button } from "./ui/Button";
import { Input, Field } from "./ui/Input";
import { SearchInput } from "./ui/SearchInput";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { bouquetCost, bouquetDefaultPrice } from "@/lib/bouquet";
import { displayName, formatCurrency, cn } from "@/lib/utils";

export interface BuilderComponent { productId: number; name: string; quantity: number; unitCost: number; sellingPrice: number; stock: number; unit: string }
export interface BuilderResult { components: BuilderComponent[]; price: number; label: string }
export interface BouquetBuilderProps {
  open: boolean; onOpenChange: (o: boolean) => void; mode: "custom" | "recipe"; products: Product[];
  initial?: Partial<BuilderResult>; onSubmit: (r: BuilderResult) => void; submitting?: boolean;
}

export function BouquetBuilder({ open, onOpenChange, mode, products, initial, onSubmit, submitting }: BouquetBuilderProps) {
  const isMobile = useMediaQuery("(max-width: 1023px)");
  const [search, setSearch] = useState("");
  const [components, setComponents] = useState<BuilderComponent[]>(initial?.components ?? []);
  const [priceStr, setPriceStr] = useState(initial?.price != null ? String(initial.price) : "");
  const [priceTouched, setPriceTouched] = useState(initial?.price != null);
  const [label, setLabel] = useState(initial?.label ?? "");

  useEffect(() => {
    if (open) {
      setComponents(initial?.components ?? []); setLabel(initial?.label ?? ""); setSearch("");
      setPriceStr(initial?.price != null ? String(initial.price) : ""); setPriceTouched(initial?.price != null);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const candidates = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => p.category !== "bouquet" && (!q || displayName(p).toLowerCase().includes(q)));
  }, [products, search]);

  const cost = bouquetCost(components);
  const defaultPrice = bouquetDefaultPrice(components);
  const price = priceTouched && priceStr.trim() !== "" ? Number(priceStr) || 0 : defaultPrice;

  const setQty = (p: Product, delta: number) => {
    setComponents((cs) => {
      const i = cs.findIndex((c) => c.productId === p.id);
      const cur = i >= 0 ? cs[i].quantity : 0;
      let next = cur + delta;
      if (mode === "custom") next = Math.min(next, p.stock);
      next = Math.max(0, next);
      if (next === 0) return cs.filter((c) => c.productId !== p.id);
      const comp: BuilderComponent = { productId: p.id, name: displayName(p), quantity: next, unitCost: p.purchase_price, sellingPrice: p.selling_price, stock: p.stock, unit: p.unit };
      return i >= 0 ? cs.map((c, j) => (j === i ? comp : c)) : [...cs, comp];
    });
  };

  const submit = () => onSubmit({ components, price, label: label.trim() });
  const canSubmit = components.length > 0 && (mode === "recipe" || price > 0);

  const body = (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full min-h-0">
      <div className="flex flex-col min-h-0">
        <SearchInput value={search} onChange={setSearch} placeholder="Search flowers & accessories…" className="mb-3" />
        <div className="overflow-y-auto space-y-1.5 max-h-[38vh] lg:max-h-[52vh] pr-1">
          {candidates.map((p) => {
            const qty = components.find((c) => c.productId === p.id)?.quantity ?? 0;
            const out = mode === "custom" && p.stock <= 0;
            return (
              <div key={p.id} className={cn("flex items-center gap-3 p-2.5 rounded-xl border border-border bg-surface", out && "opacity-50")}>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{displayName(p)}</p>
                  <p className="text-xs text-muted">{formatCurrency(p.selling_price)} / {p.unit} · {p.stock} left</p>
                </div>
                {qty > 0 && <span className="text-sm font-bold text-primary w-6 text-center">{qty}</span>}
                <button aria-label={`Add ${displayName(p)}`} disabled={out} onClick={() => setQty(p, 1)}
                  className="w-8 h-8 rounded-lg bg-primary-soft text-primary hover:bg-primary hover:text-white transition-colors flex items-center justify-center cursor-pointer disabled:cursor-not-allowed"><Plus className="w-4 h-4" /></button>
              </div>
            );
          })}
          {candidates.length === 0 && <p className="text-sm text-muted p-4 text-center">Nothing matches.</p>}
        </div>
      </div>

      <div className="flex flex-col min-h-0">
        <h4 className="font-semibold mb-2 flex items-center gap-2"><Flower2 className="w-4 h-4 text-primary" /> {mode === "custom" ? "Your bouquet" : "Recipe"}</h4>
        <div className="flex-1 overflow-y-auto space-y-1.5 max-h-[30vh] lg:max-h-[38vh] pr-1">
          <AnimatePresence initial={false}>
            {components.map((c) => {
              const p = products.find((x) => x.id === c.productId)!;
              return (
                <m.div key={c.productId} layout initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.18 }}
                  className="flex items-center gap-2 p-2 rounded-xl bg-background border border-border">
                  <span className="flex-1 truncate text-sm font-medium">{c.name}</span>
                  <div className="flex items-center gap-1 bg-surface rounded-lg border border-border p-0.5">
                    <button aria-label={`Decrease ${c.name}`} onClick={() => setQty(p, -1)} className="p-1 rounded hover:bg-primary-soft cursor-pointer"><Minus className="w-3 h-3" /></button>
                    <input aria-label={`Quantity of ${c.name}`} type="number" min={1} value={c.quantity} readOnly className="w-9 text-center text-sm font-bold bg-transparent outline-none" />
                    <button aria-label={`Increase ${c.name}`} onClick={() => setQty(p, 1)} className="p-1 rounded hover:bg-primary-soft cursor-pointer"><Plus className="w-3 h-3" /></button>
                  </div>
                  <button aria-label={`Remove ${c.name}`} onClick={() => setQty(p, -c.quantity)} className="p-1.5 text-muted hover:text-danger cursor-pointer"><Trash2 className="w-4 h-4" /></button>
                </m.div>
              );
            })}
          </AnimatePresence>
          {components.length === 0 && <p className="text-sm text-muted p-6 text-center border border-dashed border-border rounded-xl">Tap + on flowers to add them.</p>}
        </div>

        <div className="mt-3 pt-3 border-t border-border space-y-3">
          <div className="flex justify-between text-sm"><span className="text-muted">Cost</span><span className="font-semibold">{formatCurrency(cost)}</span></div>
          {mode === "custom" && (
            <>
              <Field label="Price (₹)">
                <Input id="bouquet-price" aria-label="Price" type="number" inputMode="decimal" min={0} step="any"
                  value={priceTouched ? priceStr : String(defaultPrice)} onChange={(e) => { setPriceTouched(true); setPriceStr(e.target.value); }} />
              </Field>
              <Field label="Label (optional)"><Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Anniversary · pink & white" /></Field>
            </>
          )}
          <Button className="w-full" onClick={submit} disabled={!canSubmit} loading={submitting}>
            {mode === "custom" ? `Add to bill · ${formatCurrency(price)}` : "Save recipe"}
          </Button>
        </div>
      </div>
    </div>
  );

  const title = mode === "custom" ? "Custom Bouquet" : "Bouquet Recipe";
  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange} side="bottom" title={title}>
        <div className="p-5 overflow-y-auto"><h3 className="text-xl mb-4">{title}</h3>{body}</div>
      </Sheet>
    );
  }
  return <Dialog open={open} onOpenChange={onOpenChange} title={title} size="xl">{body}</Dialog>;
}
```

- [ ] **Step 4: Run tests**

First replace `src/test/setup.ts` with the jsdom shims Radix and the builder need:
```ts
import "@testing-library/jest-dom/vitest";

class RO { observe() {} unobserve() {} disconnect() {} }
(globalThis as unknown as { ResizeObserver: typeof RO }).ResizeObserver = RO;

window.matchMedia = window.matchMedia || ((q: string) => ({
  matches: false, media: q, onchange: null,
  addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent: () => false,
}) as unknown as MediaQueryList);

// Radix Dialog calls these on pointer events; jsdom lacks them
Element.prototype.hasPointerCapture ??= () => false;
Element.prototype.setPointerCapture ??= () => {};
Element.prototype.releasePointerCapture ??= () => {};
Element.prototype.scrollIntoView ??= () => {};
```

Run: `npx vitest run` — Expected: 13 tests pass across 3 files.

- [ ] **Step 5: Commit**

```bash
git add src/components src/hooks src/test && git commit -m "feat: add BouquetBuilder for custom bouquets and recipes with tests

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 10: ReceiptDialog

**Files:**
- Create: `src/components/ReceiptDialog.tsx`

**Interfaces:**
- Consumes: `Sale` type; `SHOP` config; `Dialog`, `Button`.
- Produces: `<ReceiptDialog sale={Sale|null} open onOpenChange />` with Print, Share PDF (WhatsApp), Close.

- [ ] **Step 1: Write the component**

`src/components/ReceiptDialog.tsx`:
```tsx
import { Fragment, useState } from "react";
import { Printer, Send } from "lucide-react";
import { toast } from "sonner";
import type { Sale } from "@/api/types";
import { SHOP } from "@/config/shop";
import { formatCurrency, padId } from "@/lib/utils";
import { Dialog } from "./ui/Dialog";
import { Button } from "./ui/Button";

async function buildPdf(sale: Sale) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = 22;
  const line = () => { doc.line(20, y, 190, y); y += 6; };
  doc.setFont("courier", "bold"); doc.setFontSize(18); doc.text(SHOP.name.toUpperCase(), 105, y, { align: "center" }); y += 7;
  doc.setFont("courier", "normal"); doc.setFontSize(9);
  doc.text(SHOP.tagline, 105, y, { align: "center" }); y += 5;
  doc.text(`${SHOP.address} | ${SHOP.phone}`, 105, y, { align: "center" }); y += 5;
  doc.text(SHOP.gstin, 105, y, { align: "center" }); y += 6; line();
  doc.setFont("courier", "bold"); doc.text(`RECEIPT #${padId(sale.id)}`, 20, y);
  doc.setFont("courier", "normal"); doc.text(new Date(sale.date).toLocaleString("en-IN"), 190, y, { align: "right" }); y += 6;
  doc.text(`Customer: ${sale.customers?.name ?? "Walk-in Customer"}`, 20, y); y += 6; line();
  doc.setFont("courier", "bold"); doc.text("Item", 20, y); doc.text("Qty", 125, y, { align: "center" }); doc.text("Price", 158, y, { align: "right" }); doc.text("Total", 190, y, { align: "right" }); y += 3; line();
  doc.setFont("courier", "normal");
  const row = (name: string, qty: string, price: string, total: string, small = false) => {
    if (y > 270) { doc.addPage(); y = 22; }
    doc.setFontSize(small ? 8 : 9);
    doc.text(name.length > 34 ? name.slice(0, 31) + "..." : name, small ? 26 : 20, y);
    doc.text(qty, 125, y, { align: "center" }); doc.text(price, 158, y, { align: "right" }); doc.text(total, 190, y, { align: "right" }); y += small ? 4.5 : 6;
  };
  for (const it of sale.sale_items) {
    row(it.name, String(it.quantity), it.price.toFixed(2), it.total.toFixed(2));
    for (const c of it.sale_item_components) row(`- ${c.name}`, String(c.quantity), "", "", true);
  }
  line();
  const subtotal = sale.sale_items.reduce((s, i) => s + i.total, 0);
  doc.setFontSize(9);
  if (subtotal - sale.total > 0.01) {
    doc.text("Subtotal:", 130, y); doc.text(subtotal.toFixed(2), 190, y, { align: "right" }); y += 6;
    doc.text(`Discount (${(((subtotal - sale.total) / subtotal) * 100).toFixed(2)}%):`, 130, y); doc.text(`-${(subtotal - sale.total).toFixed(2)}`, 190, y, { align: "right" }); y += 6;
  }
  doc.setFont("courier", "bold"); doc.text("GRAND TOTAL:", 130, y); doc.text(`INR ${sale.total.toFixed(2)}`, 190, y, { align: "right" }); y += 6;
  doc.setFont("courier", "normal"); doc.text("Paid:", 130, y); doc.text(sale.amount_paid.toFixed(2), 190, y, { align: "right" }); y += 6;
  if (sale.total - sale.amount_paid > 0.01) { doc.text("Balance due:", 130, y); doc.text((sale.total - sale.amount_paid).toFixed(2), 190, y, { align: "right" }); y += 6; }
  y += 8; doc.setFont("courier", "italic"); doc.text(SHOP.receiptFooter, 105, y, { align: "center" });
  return doc;
}

export function ReceiptDialog({ sale, open, onOpenChange }: { sale: Sale | null; open: boolean; onOpenChange: (o: boolean) => void }) {
  const [busy, setBusy] = useState<"print" | "share" | null>(null);
  if (!sale) return null;
  const subtotal = sale.sale_items.reduce((s, i) => s + i.total, 0);
  const discount = subtotal - sale.total;
  const due = sale.total - sale.amount_paid;

  const print = () => {
    const html = document.getElementById("receipt-content")?.innerHTML;
    if (!html) return;
    setBusy("print");
    const iframe = document.createElement("iframe");
    iframe.style.cssText = "position:fixed;width:0;height:0;border:0;opacity:0";
    document.body.appendChild(iframe);
    const d = iframe.contentDocument!;
    d.open();
    d.write(`<html><head><title>Receipt</title><style>
      body{font-family:Courier,monospace;font-size:12px;color:#000;margin:0;padding:8mm 6mm}
      table{width:100%;border-collapse:collapse} th,td{padding:3px 2px;text-align:left} .r{text-align:right} .c{text-align:center}
      .dash{border-top:1px dashed #000} .comp{font-size:10px;color:#444;padding-left:10px} .center{text-align:center} .b{font-weight:bold} .muted{color:#555;font-size:10px}
      @page{margin:0}</style></head><body>${html}</body></html>`);
    d.close();
    setTimeout(() => { iframe.contentWindow?.focus(); iframe.contentWindow?.print(); setTimeout(() => { iframe.remove(); setBusy(null); }, 800); }, 250);
  };

  const share = async () => {
    setBusy("share");
    try {
      const doc = await buildPdf(sale);
      const blob = doc.output("blob");
      const file = new File([blob], `Receipt_${padId(sale.id)}.pdf`, { type: "application/pdf" });
      const text = `*${SHOP.name}*\nReceipt #${padId(sale.id)} — ${formatCurrency(sale.total)}${due > 0 ? ` (balance due ${formatCurrency(due)})` : ""}\n${SHOP.receiptFooter}`;
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `Receipt #${padId(sale.id)}`, text });
      } else {
        doc.save(file.name);
        const phone = (sale.customers?.phone ?? "").replace(/\D/g, "");
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text + "\n(PDF downloaded — attach it to this chat)")}`, "_blank");
      }
    } catch (e) {
      if (!(e instanceof Error && e.name === "AbortError")) toast.error("Could not share the receipt.");
    } finally { setBusy(null); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={`Receipt #${padId(sale.id)}`} size="sm"
      footer={<>
        <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        <Button variant="outline" onClick={print} loading={busy === "print"}><Printer className="w-4 h-4" /> Print</Button>
        <Button variant="secondary" onClick={share} loading={busy === "share"}><Send className="w-4 h-4" /> WhatsApp</Button>
      </>}>
      <div id="receipt-content" className="font-mono text-sm">
        <div className="center text-center mb-4">
          <p className="b font-bold text-base uppercase tracking-widest">{SHOP.name}</p>
          <p className="muted text-xs text-muted">{SHOP.tagline}</p>
          <p className="muted text-xs text-muted">{SHOP.address} · {SHOP.phone}</p>
          <p className="muted text-xs text-muted">{SHOP.gstin}</p>
          <div className="dash border-t border-dashed border-border mt-2 pt-2 text-xs">
            <p>RECEIPT #{padId(sale.id)}</p><p>{new Date(sale.date).toLocaleString("en-IN")}</p>
          </div>
        </div>
        <p className="mb-3"><span className="muted text-xs text-muted uppercase">Customer: </span><span className="b font-bold">{sale.customers?.name ?? "Walk-in Customer"}</span></p>
        <table>
          <thead><tr className="muted text-xs text-muted"><th>Item</th><th className="c text-center">Qty</th><th className="r text-right">Price</th><th className="r text-right">Total</th></tr></thead>
          <tbody>
            {sale.sale_items.map((it) => (
              <Fragment key={it.id}>
                <tr><td>{it.name}</td><td className="c text-center">{it.quantity}</td><td className="r text-right">{formatCurrency(it.price)}</td><td className="r text-right b font-bold">{formatCurrency(it.total)}</td></tr>
                {it.sale_item_components.map((c) => <tr key={`c${c.id}`} className="comp text-xs text-muted"><td className="pl-3">– {c.quantity} {c.name}</td><td /><td /><td /></tr>)}
              </Fragment>
            ))}
          </tbody>
          <tfoot>
            {discount > 0.01 && <>
              <tr className="dash border-t border-dashed"><td colSpan={3} className="muted text-xs text-muted pt-2">Subtotal</td><td className="r text-right pt-2 text-xs">{formatCurrency(subtotal)}</td></tr>
              <tr><td colSpan={3} className="muted text-xs text-muted">Discount ({((discount / subtotal) * 100).toFixed(2)}%)</td><td className="r text-right text-xs">-{formatCurrency(discount)}</td></tr>
            </>}
            <tr className="dash border-t border-dashed"><td colSpan={3} className="b font-bold pt-2 uppercase">Grand Total</td><td className="r text-right b font-bold pt-2">{formatCurrency(sale.total)}</td></tr>
            <tr><td colSpan={3} className="muted text-xs text-muted">Paid</td><td className="r text-right text-xs">{formatCurrency(sale.amount_paid)}</td></tr>
            {due > 0.01 && <tr><td colSpan={3} className="b font-bold text-danger">Balance due</td><td className="r text-right b font-bold text-danger">{formatCurrency(due)}</td></tr>}
          </tfoot>
        </table>
        {sale.notes && <p className="muted text-xs text-muted mt-3 italic">{sale.notes}</p>}
        <p className="center text-center mt-5 pt-3 dash border-t border-dashed border-border italic">{SHOP.receiptFooter}</p>
      </div>
    </Dialog>
  );
}
```

- [ ] **Step 2: Typecheck and commit**

Run `npm run typecheck` (expect clean).
```bash
git add src/components/ReceiptDialog.tsx && git commit -m "feat: add receipt dialog with print and WhatsApp PDF share

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 11: Billing page (POS with custom bouquets)

**Files:**
- Modify: `src/pages/Billing.tsx`

**Interfaces:**
- Consumes: `useProducts`, `useBouquetAvailability`, `useCustomers`, `useCreateSale`; `CartLine`, `resolveTotals`, `validateCheckout`, `componentsSummary`, `cartCount`; `BouquetBuilder`, `BuilderResult`; `ReceiptDialog`; `burstPetals`; `shortageText`; `errorMessage`.

- [ ] **Step 1: Write the page**

`src/pages/Billing.tsx`:
```tsx
import { useMemo, useRef, useState } from "react";
import { AnimatePresence, m } from "motion/react";
import { ShoppingBag, Trash2, Plus, Minus, UserCircle, Sparkles, Pencil } from "lucide-react";
import { toast } from "sonner";
import { useProducts, useBouquetAvailability } from "@/api/products";
import { useCustomers } from "@/api/customers";
import { useCreateSale } from "@/api/sales";
import type { Category, Product, Sale, CreateSaleItem } from "@/api/types";
import { PageHeader } from "@/components/layout/AppLayout";
import { SearchInput } from "@/components/ui/SearchInput";
import { Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { BouquetBuilder, type BuilderResult } from "@/components/BouquetBuilder";
import { ReceiptDialog } from "@/components/ReceiptDialog";
import { burstPetals } from "@/components/PetalBurst";
import { cartCount, componentsSummary, resolveTotals, validateCheckout, type CartLine } from "@/lib/cart";
import { shortageText } from "@/lib/bouquet";
import { errorMessage } from "@/lib/supabase";
import { cn, displayName, formatCurrency } from "@/lib/utils";

type Filter = "all" | Category;
const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" }, { value: "flower", label: "Flowers" }, { value: "bouquet", label: "Bouquets" }, { value: "accessory", label: "Accessories" },
];

export default function Billing() {
  const { data: products, isPending } = useProducts();
  const { data: availability } = useBouquetAvailability();
  const { data: customers } = useCustomers();
  const createSale = useCreateSale();

  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"products" | "cart">("products");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [customTotal, setCustomTotal] = useState("");
  const [amountPaid, setAmountPaid] = useState("");
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<Sale | null>(null);
  const totalRef = useRef<HTMLDivElement>(null);

  const avail = useMemo(() => new Map((availability ?? []).map((a) => [a.bouquet_id, a])), [availability]);
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (products ?? []).filter((p) => (filter === "all" || p.category === filter) && (!q || displayName(p).toLowerCase().includes(q)));
  }, [products, filter, search]);

  const maxFor = (p: Product) => (p.category === "bouquet" ? avail.get(p.id)?.can_make ?? 0 : p.stock);

  const pulseTotal = () => { totalRef.current?.classList.remove("pulse-once"); void totalRef.current?.offsetWidth; totalRef.current?.classList.add("pulse-once"); };

  const addProduct = (p: Product, el: HTMLElement) => {
    const max = maxFor(p);
    const key = `p${p.id}`;
    const existing = cart.find((l) => l.key === key);
    if ((existing?.quantity ?? 0) + 1 > max) { toast.warning(`Only ${max} ${displayName(p)} available.`); return; }
    setCart(existing
      ? cart.map((l) => (l.key === key ? { ...l, quantity: l.quantity + 1 } : l))
      : [...cart, { key, kind: "product", productId: p.id, name: displayName(p), price: p.selling_price, quantity: 1, maxQuantity: max, components: [] }]);
    burstPetals(el); pulseTotal();
  };

  const addCustom = (r: BuilderResult) => {
    const max = Math.min(...r.components.map((c) => Math.floor(c.stock / c.quantity)));
    const name = r.label || `Custom Bouquet`;
    const components = r.components.map((c) => ({ productId: c.productId, name: c.name, quantity: c.quantity, unitCost: c.unitCost, sellingPrice: c.sellingPrice }));
    if (editingKey) {
      setCart(cart.map((l) => (l.key === editingKey ? { ...l, name, price: r.price, maxQuantity: max, components, quantity: Math.min(l.quantity, max) } : l)));
    } else {
      setCart([...cart, { key: `c${Date.now()}`, kind: "custom_bouquet", productId: null, name, price: r.price, quantity: 1, maxQuantity: max, components }]);
    }
    setBuilderOpen(false); setEditingKey(null); pulseTotal();
  };

  const changeQty = (key: string, delta: number) => setCart(cart.map((l) => {
    if (l.key !== key) return l;
    const q = l.quantity + delta;
    if (q < 1) return l;
    if (l.maxQuantity != null && q > l.maxQuantity) { toast.warning(`Only ${l.maxQuantity} available.`); return l; }
    return { ...l, quantity: q };
  }));
  const setPrice = (key: string, price: number) => setCart(cart.map((l) => (l.key === key ? { ...l, price } : l)));
  const remove = (key: string) => setCart(cart.filter((l) => l.key !== key));
  const clear = () => { setCart([]); setCustomTotal(""); setAmountPaid(""); setCustomerId(""); };

  const totals = resolveTotals(cart, customTotal, amountPaid);
  const count = cartCount(cart);

  const checkout = () => {
    const err = validateCheckout(cart, totals, customerId);
    if (err) { toast.error(err); return; }
    const items: CreateSaleItem[] = cart.map((l) => l.kind === "product"
      ? { kind: "product", product_id: l.productId!, quantity: l.quantity, price: l.price }
      : { kind: "custom_bouquet", name: l.name, quantity: l.quantity, price: l.price, components: l.components.map((c) => ({ product_id: c.productId, quantity: c.quantity })) });
    createSale.mutate({ customer_id: customerId ? Number(customerId) : null, items, total: totals.total, amount_paid: totals.amountPaid }, {
      onSuccess: (sale) => { clear(); setReceipt(sale); setTab("products"); toast.success(`Bill #${sale.id} saved`); if (totalRef.current) burstPetals(totalRef.current, 12); },
      onError: (e) => toast.error(errorMessage(e)),
    });
  };

  const editingLine = editingKey ? cart.find((l) => l.key === editingKey) : undefined;

  return (
    <div className="lg:h-[calc(100vh-6rem)] flex flex-col">
      <PageHeader title="Billing" subtitle="Tap flowers or bouquets to add them to the bill." />

      <div className="lg:hidden flex p-1 bg-border/40 rounded-xl mb-4">
        {(["products", "cart"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={cn("flex-1 py-2.5 rounded-lg font-semibold text-sm cursor-pointer transition-colors", tab === t ? "bg-surface text-primary shadow-card" : "text-muted")}>
            {t === "products" ? `Products (${visible.length})` : `Bill (${count})`}
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-6">
        <section className={cn("flex-1 min-h-0 flex flex-col gap-4", tab === "products" ? "flex" : "hidden lg:flex")}>
          <div className="card p-3 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
            <SearchInput value={search} onChange={setSearch} placeholder="Search flowers, bouquets…" className="flex-1" />
            <div className="flex gap-2 overflow-x-auto">
              {FILTERS.map((f) => <button key={f.value} onClick={() => setFilter(f.value)} className={cn("chip whitespace-nowrap", filter === f.value && "chip-active")}>{f.label}</button>)}
            </div>
            <Button variant="secondary" onClick={() => { setEditingKey(null); setBuilderOpen(true); }}><Sparkles className="w-4 h-4" /> Custom Bouquet</Button>
          </div>

          <div className="flex-1 overflow-y-auto pr-1 pb-4">
            {isPending && !products ? (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-28" />)}</div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {visible.map((p) => {
                  const max = maxFor(p);
                  const a = p.category === "bouquet" ? avail.get(p.id) : undefined;
                  const disabled = max <= 0;
                  return (
                    <m.button key={p.id} whileTap={disabled ? undefined : { scale: 0.97 }} disabled={disabled}
                      onClick={(e) => addProduct(p, e.currentTarget)}
                      className={cn("card card-hover p-4 text-left flex flex-col border-b-4", p.category === "bouquet" ? "border-b-accent" : "border-b-primary", disabled && "opacity-50 grayscale cursor-not-allowed hover:translate-y-0 hover:shadow-card")}>
                      <p className="font-semibold leading-tight line-clamp-2">{displayName(p)}</p>
                      <p className="text-xs text-muted mt-0.5 capitalize">{p.category} · per {p.unit}</p>
                      <div className="mt-auto pt-3 flex items-end justify-between gap-2">
                        <span className="text-lg font-display font-bold text-primary">{formatCurrency(p.selling_price)}</span>
                        {p.category === "bouquet"
                          ? <span className={cn("stock-badge", max > 0 ? "bg-secondary-soft text-secondary" : "bg-danger-soft text-danger")}>{max > 0 ? `Can make ${max}` : "Short"}</span>
                          : <span className={cn("stock-badge", p.stock > 20 ? "bg-background text-muted" : "bg-danger-soft text-danger")}>{p.stock} left</span>}
                      </div>
                      {a && a.shortages.length > 0 && <p className="text-[11px] text-danger mt-1 leading-tight">{shortageText(a.shortages)}</p>}
                    </m.button>
                  );
                })}
                {visible.length === 0 && <p className="col-span-full text-center text-muted p-8">Nothing matches.</p>}
              </div>
            )}
          </div>
        </section>

        <aside className={cn("w-full lg:w-[400px] shrink-0 card flex flex-col lg:h-full overflow-hidden border-t-8 border-t-primary", tab === "cart" ? "flex" : "hidden lg:flex")}>
          <div className="p-4 border-b border-border bg-background/60">
            <h2 className="text-xl flex items-center gap-2"><ShoppingBag className="text-primary w-5 h-5" /> Current Bill</h2>
            <div className="mt-3 flex items-center gap-2">
              <UserCircle className="w-5 h-5 text-muted" />
              <Select value={customerId} onChange={(e) => setCustomerId(e.target.value)} className="py-2 text-sm">
                <option value="">Walk-in customer</option>
                {customers?.map((c) => <option key={c.id} value={c.id}>{c.name}{c.business ? ` · ${c.business}` : ""}</option>)}
              </Select>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-[240px]">
            <AnimatePresence initial={false}>
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-muted p-8 text-center"><ShoppingBag className="w-14 h-14 mb-3 opacity-20" /><p>Bill is empty. Tap products to add.</p></div>
              ) : cart.map((l) => (
                <m.div key={l.key} layout initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24, scale: 0.95 }} transition={{ duration: 0.18 }}
                  className="bg-surface p-3 rounded-xl border border-border flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{l.name}</p>
                    {l.kind === "custom_bouquet" && <p className="text-[11px] text-muted truncate">{componentsSummary(l.components)}</p>}
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-xs text-muted">₹</span>
                      <input type="number" step="any" value={l.price || ""} onChange={(e) => setPrice(l.key, Number(e.target.value) || 0)}
                        className="w-20 text-sm font-bold text-primary bg-background border border-border rounded-md px-1.5 py-0.5 outline-none focus:border-primary" aria-label={`Price of ${l.name}`} />
                      {l.kind === "custom_bouquet" && <button onClick={() => { setEditingKey(l.key); setBuilderOpen(true); }} className="p-1 text-muted hover:text-primary cursor-pointer" aria-label="Edit bouquet"><Pencil className="w-3.5 h-3.5" /></button>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 bg-background rounded-lg border border-border p-0.5">
                    <button onClick={() => changeQty(l.key, -1)} className="p-1.5 rounded hover:bg-surface cursor-pointer" aria-label="Decrease"><Minus className="w-3 h-3" /></button>
                    <span className="w-6 text-center font-bold text-sm">{l.quantity}</span>
                    <button onClick={() => changeQty(l.key, 1)} className="p-1.5 rounded hover:bg-surface cursor-pointer" aria-label="Increase"><Plus className="w-3 h-3" /></button>
                  </div>
                  <button onClick={() => remove(l.key)} className="p-2 text-muted hover:text-danger hover:bg-danger-soft rounded-lg cursor-pointer" aria-label="Remove"><Trash2 className="w-4 h-4" /></button>
                </m.div>
              ))}
            </AnimatePresence>
          </div>

          <div className="p-4 bg-background/70 border-t border-border space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-muted">Total</span>
              <div ref={totalRef} className="flex items-center gap-1 border-b-2 border-dashed border-border focus-within:border-primary">
                <span className="text-xl font-bold text-muted">₹</span>
                <input inputMode="decimal" value={customTotal} onChange={(e) => setCustomTotal(e.target.value.replace(/[^0-9.]/g, ""))} placeholder={String(totals.subtotal)}
                  className="w-32 text-right text-3xl font-display font-bold bg-transparent outline-none" aria-label="Total" />
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted">Paid</span>
              <div className="flex items-center gap-1 border-b-2 border-dashed border-border focus-within:border-primary">
                <span className="text-lg font-bold text-muted">₹</span>
                <input inputMode="decimal" value={amountPaid} onChange={(e) => setAmountPaid(e.target.value.replace(/[^0-9.]/g, ""))} placeholder={String(totals.total)}
                  className="w-28 text-right text-2xl font-bold bg-transparent outline-none" aria-label="Amount paid" />
              </div>
            </div>
            {totals.due > 0 && <div className="flex justify-between px-3 py-2 rounded-xl bg-accent-soft text-amber-800 text-sm font-semibold"><span>Credit due</span><span>{formatCurrency(totals.due)}</span></div>}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <Button variant="danger" onClick={clear} disabled={cart.length === 0}>Clear</Button>
              <Button onClick={checkout} disabled={cart.length === 0} loading={createSale.isPending}>Generate Bill</Button>
            </div>
          </div>
        </aside>
      </div>

      {tab === "products" && cart.length > 0 && (
        <m.button initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} whileTap={{ scale: 0.95 }} onClick={() => setTab("cart")}
          className="lg:hidden fixed bottom-6 right-6 z-30 btn-primary rounded-full px-5 py-4 shadow-rose">
          <ShoppingBag className="w-5 h-5" /> View bill ({count}) · {formatCurrency(totals.total)}
        </m.button>
      )}

      <BouquetBuilder open={builderOpen} onOpenChange={(o) => { setBuilderOpen(o); if (!o) setEditingKey(null); }} mode="custom" products={products ?? []}
        initial={editingLine ? { components: editingLine.components.map((c) => { const p = products?.find((x) => x.id === c.productId); return { ...c, stock: p?.stock ?? 0, unit: p?.unit ?? "" }; }), price: editingLine.price, label: editingLine.name } : undefined}
        onSubmit={addCustom} />
      <ReceiptDialog sale={receipt} open={!!receipt} onOpenChange={(o) => { if (!o) setReceipt(null); }} />
    </div>
  );
}
```

- [ ] **Step 2: Manual verification**

Open `/billing`. Check: chips filter; tapping "Rose · Red" adds a line with a petal burst and the total pulses; "Red Rose Bouquet" shows "Can make 16"; Custom Bouquet → add 6 Rose Red + 1 Wrapping Paper → price defaults to ₹115 → Add to bill; set Paid lower than Total without a customer → toast "Select a registered customer…"; pick Priya → Generate Bill → receipt dialog opens with components listed; Dashboard afterwards shows today's revenue and stock reduced in Inventory (Task 12).

- [ ] **Step 3: Commit**

```bash
git add src/pages/Billing.tsx && git commit -m "feat(billing): POS with categories, custom bouquets, credit and receipts

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 12: Inventory page (flowers/accessories, bouquets with recipes, profit margins)

**Files:**
- Modify: `src/pages/Inventory.tsx`

**Interfaces:**
- Consumes: `useProducts`, `useRecipes`, `useBouquetAvailability`, `useCreateProduct`, `useUpdateProduct`, `useDeleteProduct`, `useSaveRecipe`, `useProfitMargins`; `BouquetBuilder` (recipe mode); `Tabs`, `Dialog`, `Field`, `Input`, `Select`, `Button`, `TableSkeleton`.

- [ ] **Step 1: Write the page**

`src/pages/Inventory.tsx`:
```tsx
import { useMemo, useState } from "react";
import { m } from "motion/react";
import { Plus, Pencil, Trash2, Flower2, Gift, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { toast } from "sonner";
import { useProducts, useRecipes, useBouquetAvailability, useCreateProduct, useUpdateProduct, useDeleteProduct, useSaveRecipe } from "@/api/products";
import { useProfitMargins } from "@/api/analytics";
import type { Product, ProductInput } from "@/api/types";
import { PageHeader } from "@/components/layout/AppLayout";
import { Tabs } from "@/components/ui/Tabs";
import { SearchInput } from "@/components/ui/SearchInput";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input, Select, Field } from "@/components/ui/Input";
import { TableSkeleton, Skeleton } from "@/components/ui/Skeleton";
import { BouquetBuilder, type BuilderResult } from "@/components/BouquetBuilder";
import { errorMessage } from "@/lib/supabase";
import { shortageText } from "@/lib/bouquet";
import { cn, displayName, formatCurrency } from "@/lib/utils";

type Tab = "stock" | "bouquets" | "margins";
const UNITS = ["stem", "bunch", "kg", "dozen", "piece", "sheet", "garland"];
const empty = (category: ProductInput["category"]): ProductInput => ({ name: "", variety: "", unit: category === "bouquet" ? "piece" : "stem", category, purchase_price: 0, selling_price: 0, stock: 0, supplier: "" });

export default function Inventory() {
  const [tab, setTab] = useState<Tab>("stock");
  const [search, setSearch] = useState("");
  const { data: products, isPending } = useProducts();
  const { data: recipes } = useRecipes();
  const { data: availability } = useBouquetAvailability();
  const { data: margins, isPending: marginsPending } = useProfitMargins();
  const create = useCreateProduct(); const update = useUpdateProduct(); const del = useDeleteProduct(); const saveRecipe = useSaveRecipe();

  const [form, setForm] = useState<ProductInput | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [recipeFor, setRecipeFor] = useState<Product | null>(null);

  const q = search.trim().toLowerCase();
  const stockItems = useMemo(() => (products ?? []).filter((p) => p.category !== "bouquet" && (!q || displayName(p).toLowerCase().includes(q))), [products, q]);
  const bouquets = useMemo(() => (products ?? []).filter((p) => p.category === "bouquet" && (!q || p.name.toLowerCase().includes(q))), [products, q]);
  const availMap = useMemo(() => new Map((availability ?? []).map((a) => [a.bouquet_id, a])), [availability]);
  const byId = useMemo(() => new Map((products ?? []).map((p) => [p.id, p])), [products]);

  const openNew = (category: ProductInput["category"]) => { setEditId(null); setForm(empty(category)); };
  const openEdit = (p: Product) => { const { id, created_at, ...rest } = p; void id; void created_at; setEditId(p.id); setForm(rest); };

  const submitForm = (e: React.FormEvent) => {
    e.preventDefault(); if (!form) return;
    const opts = { onSuccess: () => { setForm(null); toast.success(editId ? "Updated" : "Added"); }, onError: (err: unknown) => toast.error(errorMessage(err)) };
    if (editId) update.mutate({ id: editId, ...form }, opts); else create.mutate(form, opts);
  };
  const remove = (p: Product) => { if (confirm(`Delete ${displayName(p)}?`)) del.mutate(p.id, { onError: (err) => toast.error(errorMessage(err)), onSuccess: () => toast.success("Deleted") }); };

  const recipeInitial = (b: Product): BuilderResult => ({
    price: 0, label: "",
    components: (recipes ?? []).filter((r) => r.bouquet_id === b.id).map((r) => { const c = byId.get(r.component_id)!; return { productId: c.id, name: displayName(c), quantity: r.quantity, unitCost: c.purchase_price, sellingPrice: c.selling_price, stock: c.stock, unit: c.unit }; }),
  });
  const submitRecipe = (r: BuilderResult) => {
    if (!recipeFor) return;
    saveRecipe.mutate({ bouquetId: recipeFor.id, rows: r.components.map((c) => ({ component_id: c.productId, quantity: c.quantity })) },
      { onSuccess: () => { setRecipeFor(null); toast.success("Recipe saved"); }, onError: (err) => toast.error(errorMessage(err)) });
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Inventory" subtitle="Flowers, accessories, bouquet recipes and margins."
        actions={<>
          <SearchInput value={search} onChange={setSearch} placeholder="Search…" className="flex-1 sm:w-56" />
          {tab === "stock" && <Button onClick={() => openNew("flower")}><Plus className="w-4 h-4" /> Add Item</Button>}
          {tab === "bouquets" && <Button onClick={() => openNew("bouquet")}><Plus className="w-4 h-4" /> Add Bouquet</Button>}
        </>} />

      <Tabs id="inventory" value={tab} onChange={setTab} items={[
        { value: "stock", label: "Flowers & Accessories", icon: Flower2 }, { value: "bouquets", label: "Bouquets", icon: Gift }, { value: "margins", label: "Profit Margins", icon: TrendingUp }]} />

      {tab === "stock" && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead><tr className="table-head border-b border-border"><th className="p-4">Item</th><th className="p-4">Unit</th><th className="p-4">Purchase</th><th className="p-4">Selling</th><th className="p-4">Stock</th><th className="p-4">Supplier</th><th className="p-4 text-right">Actions</th></tr></thead>
              <tbody className="divide-y divide-border">
                {isPending && !products ? <tr><td colSpan={7}><TableSkeleton cols={7} /></td></tr> : stockItems.map((p, i) => (
                  <m.tr key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(i, 12) * 0.03 }} className="hover:bg-background/60">
                    <td className="p-4 font-semibold">{displayName(p)}<span className="ml-2 text-[10px] uppercase text-muted">{p.category}</span></td>
                    <td className="p-4 text-muted">{p.unit}</td>
                    <td className="p-4 text-muted">{formatCurrency(p.purchase_price)}</td>
                    <td className="p-4 font-medium">{formatCurrency(p.selling_price)}</td>
                    <td className="p-4"><span className={cn("stock-badge", p.stock <= 20 ? "bg-danger-soft text-danger" : "bg-secondary-soft text-secondary")}>{p.stock}</span></td>
                    <td className="p-4 text-muted">{p.supplier}</td>
                    <td className="p-4"><div className="flex justify-end gap-1">
                      <button onClick={() => openEdit(p)} className="p-2 rounded-lg text-muted hover:text-primary hover:bg-primary-soft cursor-pointer" aria-label="Edit"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => remove(p)} className="p-2 rounded-lg text-muted hover:text-danger hover:bg-danger-soft cursor-pointer" aria-label="Delete"><Trash2 className="w-4 h-4" /></button>
                    </div></td>
                  </m.tr>
                ))}
                {!isPending && stockItems.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-muted">No items yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "bouquets" && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {isPending && !products ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-44" />) : bouquets.map((b, i) => {
            const rows = (recipes ?? []).filter((r) => r.bouquet_id === b.id);
            const a = availMap.get(b.id);
            const cost = rows.reduce((s, r) => s + r.quantity * (byId.get(r.component_id)?.purchase_price ?? 0), 0);
            return (
              <m.div key={b.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="card card-hover p-5 flex flex-col border-t-4 border-t-accent">
                <div className="flex justify-between items-start gap-2">
                  <div><h3 className="text-lg">{b.name}</h3>{b.variety && <p className="text-xs text-muted">{b.variety}</p>}</div>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(b)} className="p-2 rounded-lg text-muted hover:text-primary hover:bg-primary-soft cursor-pointer" aria-label="Edit"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => remove(b)} className="p-2 rounded-lg text-muted hover:text-danger hover:bg-danger-soft cursor-pointer" aria-label="Delete"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
                <ul className="mt-3 text-sm text-muted space-y-0.5 flex-1">
                  {rows.length === 0 && <li className="italic">No recipe yet</li>}
                  {rows.map((r) => <li key={r.id}>{r.quantity} × {byId.get(r.component_id) ? displayName(byId.get(r.component_id)!) : "?"}</li>)}
                </ul>
                <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-sm">
                  <span>Cost {formatCurrency(cost)} · <span className="font-semibold text-primary">{formatCurrency(b.selling_price)}</span></span>
                  <span className={cn("stock-badge", (a?.can_make ?? 0) > 0 ? "bg-secondary-soft text-secondary" : "bg-danger-soft text-danger")}>Can make {a?.can_make ?? 0}</span>
                </div>
                {a && a.shortages.length > 0 && <p className="text-[11px] text-danger mt-1">{shortageText(a.shortages)}</p>}
                <Button variant="outline" size="sm" className="mt-3" onClick={() => setRecipeFor(b)}>Edit recipe</Button>
              </m.div>
            );
          })}
          {!isPending && bouquets.length === 0 && <p className="col-span-full text-center text-muted p-8">No bouquets yet. Add one, then define its recipe.</p>}
        </div>
      )}

      {tab === "margins" && (
        <div className="card overflow-hidden border-t-4 border-t-primary">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead><tr className="table-head border-b border-border"><th className="p-4">Product</th><th className="p-4">Cost / Sell</th><th className="p-4">Profit / unit</th><th className="p-4">Margin</th><th className="p-4">Sold</th><th className="p-4">Revenue</th><th className="p-4 text-right">Profit</th></tr></thead>
              <tbody className="divide-y divide-border">
                {marginsPending && !margins ? <tr><td colSpan={7}><TableSkeleton cols={7} /></td></tr> : (margins ?? []).filter((r) => !q || displayName(r).toLowerCase().includes(q)).map((r) => {
                  const hi = r.profit_margin_percent >= 40, mid = r.profit_margin_percent >= 20 && !hi;
                  const Icon = hi ? TrendingUp : mid ? Minus : TrendingDown;
                  return (
                    <tr key={r.id} className="hover:bg-background/60">
                      <td className="p-4"><p className="font-semibold">{displayName(r)}</p><p className="text-xs text-muted capitalize">{r.category} · {r.unit}</p></td>
                      <td className="p-4 text-muted text-sm">{formatCurrency(r.purchase_price)} / {formatCurrency(r.selling_price)}</td>
                      <td className="p-4 font-medium text-secondary">{formatCurrency(r.profit_per_unit)}</td>
                      <td className="p-4"><span className={cn("inline-flex items-center gap-1 stock-badge", hi ? "bg-secondary-soft text-secondary" : mid ? "bg-accent-soft text-amber-800" : "bg-danger-soft text-danger")}><Icon className="w-3.5 h-3.5" />{r.profit_margin_percent.toFixed(1)}%</span></td>
                      <td className="p-4 text-muted">{r.total_units_sold}</td>
                      <td className="p-4 text-muted">{formatCurrency(r.total_revenue)}</td>
                      <td className="p-4 font-bold text-right">{formatCurrency(r.total_profit)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)} title={editId ? "Edit item" : form?.category === "bouquet" ? "New bouquet" : "New item"}>
        {form && (
          <form onSubmit={submitForm} className="grid grid-cols-2 gap-4" id="product-form">
            <div className="col-span-2"><Field label="Name"><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field></div>
            <Field label="Variety / colour"><Input value={form.variety} onChange={(e) => setForm({ ...form, variety: e.target.value })} placeholder="Red, White…" /></Field>
            <Field label="Category">
              <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as ProductInput["category"] })} disabled={!!editId}>
                <option value="flower">Flower</option><option value="accessory">Accessory</option><option value="bouquet">Bouquet</option>
              </Select>
            </Field>
            {form.category !== "bouquet" && <>
              <Field label="Unit"><Select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>{UNITS.map((u) => <option key={u}>{u}</option>)}</Select></Field>
              <Field label="Purchase price (₹)"><Input required type="number" step="0.01" min={0} value={form.purchase_price} onChange={(e) => setForm({ ...form, purchase_price: Number(e.target.value) })} /></Field>
            </>}
            <Field label="Selling price (₹)"><Input required type="number" step="0.01" min={0} value={form.selling_price} onChange={(e) => setForm({ ...form, selling_price: Number(e.target.value) })} /></Field>
            {form.category !== "bouquet" && <>
              <Field label="Stock"><Input required type="number" min={0} value={form.stock} onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })} /></Field>
              <Field label="Supplier"><Input value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} /></Field>
            </>}
            <div className="col-span-2 flex justify-end gap-3 pt-2">
              <Button type="button" variant="ghost" onClick={() => setForm(null)}>Cancel</Button>
              <Button type="submit" loading={create.isPending || update.isPending}>{editId ? "Update" : "Save"}</Button>
            </div>
          </form>
        )}
      </Dialog>

      {recipeFor && (
        <BouquetBuilder open onOpenChange={(o) => !o && setRecipeFor(null)} mode="recipe" products={products ?? []} initial={recipeInitial(recipeFor)} onSubmit={submitRecipe} submitting={saveRecipe.isPending} />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify**

Open `/inventory`: three tabs animate; add a flower; edit stock; Bouquets tab shows recipes and "Can make N"; "Edit recipe" opens the builder pre-filled; saving updates the card; Profit Margins shows bouquets with recipe cost (Red Rose Bouquet cost ₹161, margin 59.6%).

- [ ] **Step 3: Commit**

```bash
git add src/pages/Inventory.tsx && git commit -m "feat(inventory): stock table, bouquet recipes and profit margins

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 13: Customers page

**Files:**
- Modify: `src/pages/Customers.tsx`

- [ ] **Step 1: Write the page**

`src/pages/Customers.tsx`:
```tsx
import { useMemo, useState } from "react";
import { m } from "motion/react";
import { Plus, Pencil, Trash2, History, Phone, MapPin } from "lucide-react";
import { toast } from "sonner";
import { useCustomers, useCustomerSales, useCreateCustomer, useUpdateCustomer, useDeleteCustomer } from "@/api/customers";
import type { Customer, CustomerInput } from "@/api/types";
import { PageHeader } from "@/components/layout/AppLayout";
import { SearchInput } from "@/components/ui/SearchInput";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Field } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { errorMessage } from "@/lib/supabase";
import { formatCurrency, formatDate } from "@/lib/utils";

const empty: CustomerInput = { name: "", phone: "", business: "", address: "", notes: "" };

export default function Customers() {
  const [search, setSearch] = useState("");
  const { data: customers, isPending } = useCustomers();
  const create = useCreateCustomer(); const update = useUpdateCustomer(); const del = useDeleteCustomer();
  const [form, setForm] = useState<CustomerInput | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [historyId, setHistoryId] = useState<number | null>(null);
  const { data: history } = useCustomerSales(historyId);

  const list = useMemo(() => { const q = search.trim().toLowerCase(); return (customers ?? []).filter((c) => !q || c.name.toLowerCase().includes(q) || c.phone.includes(q) || c.business.toLowerCase().includes(q)); }, [customers, search]);

  const openEdit = (c: Customer) => { setEditId(c.id); setForm({ name: c.name, phone: c.phone, business: c.business, address: c.address, notes: c.notes }); };
  const submit = (e: React.FormEvent) => {
    e.preventDefault(); if (!form) return;
    const opts = { onSuccess: () => { setForm(null); toast.success(editId ? "Customer updated" : "Customer added"); }, onError: (err: unknown) => toast.error(errorMessage(err)) };
    if (editId) update.mutate({ id: editId, ...form }, opts); else create.mutate(form, opts);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Customers" subtitle="Decorators, hotels, temples and regulars."
        actions={<><SearchInput value={search} onChange={setSearch} placeholder="Search name, phone…" className="flex-1 sm:w-64" /><Button variant="secondary" onClick={() => { setEditId(null); setForm(empty); }}><Plus className="w-4 h-4" /> Add Customer</Button></>} />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {isPending && !customers ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-40" />) : list.map((c, i) => (
          <m.div key={c.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 8) * 0.04 }} className="card card-hover p-5 flex flex-col">
            <div className="flex justify-between items-start gap-2 mb-3">
              <div><h3 className="text-lg">{c.name}</h3>{c.business && <p className="text-secondary font-medium text-sm">{c.business}</p>}</div>
              <div className="flex gap-1">
                <button onClick={() => setHistoryId(c.id)} className="p-2 rounded-lg text-muted hover:text-secondary hover:bg-secondary-soft cursor-pointer" aria-label="History"><History className="w-4 h-4" /></button>
                <button onClick={() => openEdit(c)} className="p-2 rounded-lg text-muted hover:text-primary hover:bg-primary-soft cursor-pointer" aria-label="Edit"><Pencil className="w-4 h-4" /></button>
                <button onClick={() => { if (confirm(`Delete ${c.name}?`)) del.mutate(c.id, { onError: (e) => toast.error(errorMessage(e)) }); }} className="p-2 rounded-lg text-muted hover:text-danger hover:bg-danger-soft cursor-pointer" aria-label="Delete"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
            <div className="text-sm text-muted space-y-1 mt-auto">
              <p className="flex items-center gap-2"><Phone className="w-3.5 h-3.5" /> {c.phone}</p>
              {c.address && <p className="flex items-center gap-2 line-clamp-2"><MapPin className="w-3.5 h-3.5 shrink-0" /> {c.address}</p>}
              {c.notes && <p className="italic text-xs bg-background p-2 rounded-lg border border-border mt-2">{c.notes}</p>}
            </div>
          </m.div>
        ))}
        {!isPending && list.length === 0 && <p className="col-span-full text-center text-muted p-8">No customers found.</p>}
      </div>

      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)} title={editId ? "Edit customer" : "Add customer"}>
        {form && (
          <form onSubmit={submit} className="space-y-4">
            <Field label="Name"><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="Phone"><Input required inputMode="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
            <Field label="Business (optional)"><Input value={form.business} onChange={(e) => setForm({ ...form, business: e.target.value })} placeholder="Event planner, hotel, temple…" /></Field>
            <Field label="Address (optional)"><Textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></Field>
            <Field label="Notes (optional)"><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
            <div className="flex justify-end gap-3 pt-2"><Button type="button" variant="ghost" onClick={() => setForm(null)}>Cancel</Button><Button type="submit" variant="secondary" loading={create.isPending || update.isPending}>{editId ? "Update" : "Save"}</Button></div>
          </form>
        )}
      </Dialog>

      <Dialog open={historyId != null} onOpenChange={(o) => !o && setHistoryId(null)} title="Purchase history" size="lg">
        {!history ? <Skeleton className="h-24" /> : history.length === 0 ? <p className="text-center text-muted py-4">No purchases yet.</p> : (
          <div className="space-y-3">
            {history.map((s) => (
              <div key={s.id} className="border border-border rounded-xl p-4 bg-background/60">
                <div className="flex justify-between font-semibold mb-2"><span>{formatDate(s.date)}</span><span className="text-primary">{formatCurrency(s.total)}{s.total - s.amount_paid > 0.01 && <span className="ml-2 text-xs text-danger">due {formatCurrency(s.total - s.amount_paid)}</span>}</span></div>
                <ul className="text-sm text-muted space-y-0.5">{s.sale_items.map((it) => <li key={it.id} className="flex justify-between"><span>{it.quantity} × {it.name}</span><span>{formatCurrency(it.total)}</span></li>)}</ul>
              </div>
            ))}
          </div>
        )}
      </Dialog>
    </div>
  );
}
```

- [ ] **Step 2: Verify and commit**

Open `/customers`: cards, add/edit/delete, history dialog shows the bill created in Task 11.
```bash
git add src/pages/Customers.tsx && git commit -m "feat(customers): cards, CRUD and purchase history

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 14: Sales history page

**Files:**
- Modify: `src/pages/Sales.tsx`

- [ ] **Step 1: Write the page**

`src/pages/Sales.tsx`:
```tsx
import { useState } from "react";
import { AnimatePresence, m } from "motion/react";
import { Calendar, FileText, Trash2, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { useSales, useDeleteSale } from "@/api/sales";
import type { Sale } from "@/api/types";
import { PageHeader } from "@/components/layout/AppLayout";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { ReceiptDialog } from "@/components/ReceiptDialog";
import { errorMessage } from "@/lib/supabase";
import { cn, formatCurrency, formatDate } from "@/lib/utils";

export default function Sales() {
  const { data: sales, isPending } = useSales();
  const del = useDeleteSale();
  const [open, setOpen] = useState<number | null>(null);
  const [receipt, setReceipt] = useState<Sale | null>(null);

  return (
    <div className="space-y-6">
      <PageHeader title="Sales" subtitle="Every bill, newest first. Tap a row to see its items." />
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead><tr className="table-head border-b border-border"><th className="p-4">Date</th><th className="p-4">Customer</th><th className="p-4">Items</th><th className="p-4">Total</th><th className="p-4">Status</th><th className="p-4 text-right">Actions</th></tr></thead>
            <tbody className="divide-y divide-border">
              {isPending && !sales ? <tr><td colSpan={6}><TableSkeleton cols={6} /></td></tr> : sales?.length === 0 ? <tr><td colSpan={6} className="p-8 text-center text-muted">No bills yet.</td></tr> : sales?.map((s) => {
                const due = s.total - s.amount_paid; const expanded = open === s.id;
                return (
                  <m.tr key={s.id} layout className="hover:bg-background/60 cursor-pointer align-top" onClick={() => setOpen(expanded ? null : s.id)}>
                    <td className="p-4 whitespace-nowrap"><span className="flex items-center gap-2 font-medium"><Calendar className="w-4 h-4 text-muted" /> {formatDate(s.date)}</span><span className="text-xs text-muted ml-6">{new Date(s.date).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span></td>
                    <td className="p-4">{s.customers ? <span className="font-semibold text-primary">{s.customers.name}</span> : <span className="text-muted italic">Walk-in</span>}</td>
                    <td className="p-4">
                      <span className="flex items-center gap-1">{s.sale_items.reduce((a, i) => a + i.quantity, 0)} items <ChevronDown className={cn("w-4 h-4 text-muted transition-transform", expanded && "rotate-180")} /></span>
                      <AnimatePresence>{expanded && (
                        <m.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                          <ul className="mt-2 text-sm bg-surface border border-border rounded-lg p-3 space-y-1 w-max max-w-md">
                            {s.sale_items.map((it) => (
                              <li key={it.id}>
                                <div className="flex gap-4"><span className="text-muted w-8">{it.quantity}×</span><span className="font-medium flex-1">{it.name}</span><span className="text-muted">{formatCurrency(it.total)}</span></div>
                                {it.sale_item_components.map((c) => <div key={c.id} className="text-xs text-muted pl-12">– {c.quantity} {c.name}</div>)}
                              </li>
                            ))}
                            {s.notes && <li className="text-xs italic text-muted pt-1 border-t border-border">{s.notes}</li>}
                          </ul>
                        </m.div>
                      )}</AnimatePresence>
                    </td>
                    <td className="p-4 font-bold text-lg">{formatCurrency(s.total)}</td>
                    <td className="p-4">{due > 0.01 ? <span className="stock-badge bg-danger-soft text-danger">Due {formatCurrency(due)}</span> : <span className="stock-badge bg-secondary-soft text-secondary">Paid</span>}</td>
                    <td className="p-4" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-1">
                        <button onClick={() => setReceipt(s)} className="p-2 rounded-lg text-muted hover:text-primary hover:bg-primary-soft cursor-pointer" aria-label="Receipt"><FileText className="w-4 h-4" /></button>
                        <button onClick={() => { if (confirm("Delete this bill? Stock will not be restored.")) del.mutate(s.id, { onError: (e) => toast.error(errorMessage(e)), onSuccess: () => toast.success("Bill deleted") }); }} className="p-2 rounded-lg text-muted hover:text-danger hover:bg-danger-soft cursor-pointer" aria-label="Delete"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </m.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <ReceiptDialog sale={receipt} open={!!receipt} onOpenChange={(o) => !o && setReceipt(null)} />
    </div>
  );
}
```

- [ ] **Step 2: Verify and commit**

```bash
git add src/pages/Sales.tsx && git commit -m "feat(sales): history with expandable items, receipts and delete

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 15: Reports page

**Files:**
- Modify: `src/pages/Reports.tsx`

- [ ] **Step 1: Write the page**

`src/pages/Reports.tsx`:
```tsx
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Cell, AreaChart, Area } from "recharts";
import { useDailySales, useMonthlySales, useTopProducts } from "@/api/analytics";
import { PageHeader } from "@/components/layout/AppLayout";
import { Skeleton } from "@/components/ui/Skeleton";
import { displayName, formatCurrency } from "@/lib/utils";
import type { ReactNode } from "react";

const COLORS = ["#D9456C", "#5F8B6A", "#E2B04A", "#8B5CF6", "#F472B6"];
const tip = { borderRadius: 12, border: "1px solid #EADFD8", boxShadow: "0 8px 24px -12px rgba(42,30,43,.25)" };
const axis = { fontSize: 12, fill: "#7A6B7C" };
const money = (v: number) => `₹${v >= 1000 ? `${Math.round(v / 100) / 10}k` : v}`;

function Panel({ title, children, loading, empty, accent = "border-t-primary" }: { title: string; children: ReactNode; loading: boolean; empty: boolean; accent?: string }) {
  return (
    <div className={`card p-6 border-t-4 ${accent}`}>
      <h3 className="text-xl mb-4">{title}</h3>
      <div className="h-64 sm:h-80">{loading ? <Skeleton className="h-full" /> : empty ? <div className="h-full flex items-center justify-center text-muted">No data yet.</div> : children}</div>
    </div>
  );
}

export default function Reports() {
  const { data: daily, isPending: dp } = useDailySales();
  const { data: monthly, isPending: mp } = useMonthlySales();
  const { data: top, isPending: tp } = useTopProducts();
  const topRows = (top ?? []).map((t) => ({ ...t, label: displayName(t) }));

  return (
    <div className="space-y-8">
      <PageHeader title="Reports" subtitle="How the shop is performing." />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Panel title="Monthly revenue (12 months)" loading={mp && !monthly} empty={!monthly?.length}>
          <ResponsiveContainer><BarChart data={monthly} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EADFD8" /><XAxis dataKey="month" tickFormatter={(v: string) => v.slice(2)} axisLine={false} tickLine={false} tick={axis} /><YAxis axisLine={false} tickLine={false} tick={axis} tickFormatter={money} width={52} />
            <Tooltip cursor={{ fill: "#FBE4EA", opacity: 0.5 }} contentStyle={tip} formatter={(v: number) => [formatCurrency(v), "Revenue"]} />
            <Bar dataKey="revenue" radius={[6, 6, 0, 0]} isAnimationActive={false}>{(monthly ?? []).map((_, i) => <Cell key={i} fill={i === (monthly?.length ?? 0) - 1 ? "#D9456C" : "#5F8B6A"} />)}</Bar>
          </BarChart></ResponsiveContainer>
        </Panel>

        <Panel title="Top products (by quantity)" loading={tp && !top} empty={!top?.length} accent="border-t-accent">
          <ResponsiveContainer><BarChart data={topRows} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#EADFD8" /><XAxis type="number" axisLine={false} tickLine={false} tick={axis} /><YAxis type="category" dataKey="label" axisLine={false} tickLine={false} tick={{ ...axis, fill: "#2A1E2B", fontWeight: 500 }} width={110} />
            <Tooltip cursor={{ fill: "#FBE4EA", opacity: 0.5 }} contentStyle={tip} formatter={(v: number, _n, p) => [`${v} sold · ${formatCurrency((p.payload as { revenue: number }).revenue)}`, "Quantity"]} />
            <Bar dataKey="quantity_sold" radius={[0, 6, 6, 0]} barSize={22} isAnimationActive={false}>{topRows.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Bar>
          </BarChart></ResponsiveContainer>
        </Panel>

        <div className="lg:col-span-2">
          <Panel title="Daily units sold (30 days)" loading={dp && !daily} empty={!daily?.length} accent="border-t-secondary">
            <ResponsiveContainer><LineChart data={daily} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EADFD8" /><XAxis dataKey="date" tickFormatter={(d: string) => d.slice(5)} axisLine={false} tickLine={false} tick={axis} /><YAxis axisLine={false} tickLine={false} tick={axis} width={40} />
              <Tooltip contentStyle={tip} formatter={(v: number) => [v, "Units"]} /><Line type="monotone" dataKey="quantity_sold" stroke="#5F8B6A" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 6 }} isAnimationActive={false} />
            </LineChart></ResponsiveContainer>
          </Panel>
        </div>
      </div>

      <div><h2 className="text-2xl">Profit</h2><p className="text-muted text-sm">Revenue minus the purchase cost of everything sold (bouquets use their recipe cost).</p></div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Panel title="Daily net profit (30 days)" loading={dp && !daily} empty={!daily?.length} accent="border-t-secondary">
          <ResponsiveContainer><AreaChart data={daily} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs><linearGradient id="profit" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#5F8B6A" stopOpacity={0.4} /><stop offset="95%" stopColor="#5F8B6A" stopOpacity={0} /></linearGradient></defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EADFD8" /><XAxis dataKey="date" tickFormatter={(d: string) => d.slice(5)} axisLine={false} tickLine={false} tick={axis} /><YAxis axisLine={false} tickLine={false} tick={axis} tickFormatter={money} width={52} />
            <Tooltip contentStyle={tip} formatter={(v: number) => [formatCurrency(v), "Profit"]} /><Area type="monotone" dataKey="profit" stroke="#5F8B6A" strokeWidth={3} fill="url(#profit)" isAnimationActive={false} />
          </AreaChart></ResponsiveContainer>
        </Panel>
        <Panel title="Monthly net profit (12 months)" loading={mp && !monthly} empty={!monthly?.length} accent="border-t-secondary">
          <ResponsiveContainer><BarChart data={monthly} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EADFD8" /><XAxis dataKey="month" tickFormatter={(v: string) => v.slice(2)} axisLine={false} tickLine={false} tick={axis} /><YAxis axisLine={false} tickLine={false} tick={axis} tickFormatter={money} width={52} />
            <Tooltip cursor={{ fill: "#E6EFE8", opacity: 0.6 }} contentStyle={tip} formatter={(v: number) => [formatCurrency(v), "Profit"]} />
            <Bar dataKey="profit" radius={[6, 6, 0, 0]} isAnimationActive={false}>{(monthly ?? []).map((_, i) => <Cell key={i} fill={i === (monthly?.length ?? 0) - 1 ? "#5F8B6A" : "#9BC0A5"} />)}</Bar>
          </BarChart></ResponsiveContainer>
        </Panel>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify and commit**

Open `/reports`: 5 charts render (data from earlier test bills); `npm run typecheck` clean.
```bash
git add src/pages/Reports.tsx && git commit -m "feat(reports): revenue, top products, volume and profit charts

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 16: Credits & Dues page

**Files:**
- Modify: `src/pages/Credits.tsx`

- [ ] **Step 1: Write the page**

`src/pages/Credits.tsx`:
```tsx
import { useMemo, useState } from "react";
import { m } from "motion/react";
import { Coins, Users, FileText, Check } from "lucide-react";
import { toast } from "sonner";
import { useSales, useRecordPayment } from "@/api/sales";
import type { Sale } from "@/api/types";
import { PageHeader } from "@/components/layout/AppLayout";
import { SearchInput } from "@/components/ui/SearchInput";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input, Field } from "@/components/ui/Input";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { ReceiptDialog } from "@/components/ReceiptDialog";
import { errorMessage } from "@/lib/supabase";
import { formatCurrency, formatDate } from "@/lib/utils";

const due = (s: Sale) => Math.max(0, s.total - s.amount_paid);

export default function Credits() {
  const { data: sales, isPending } = useSales();
  const pay = useRecordPayment();
  const [search, setSearch] = useState("");
  const [paying, setPaying] = useState<Sale | null>(null);
  const [amount, setAmount] = useState("");
  const [receipt, setReceipt] = useState<Sale | null>(null);

  const credits = useMemo(() => (sales ?? []).filter((s) => due(s) > 0.01), [sales]);
  const list = useMemo(() => { const q = search.trim().toLowerCase(); return credits.filter((s) => !q || (s.customers?.name ?? "").toLowerCase().includes(q) || (s.customers?.phone ?? "").includes(q)); }, [credits, search]);
  const outstanding = credits.reduce((a, s) => a + due(s), 0);
  const debtors = new Set(credits.map((s) => s.customer_id).filter(Boolean)).size;

  const submit = (e: React.FormEvent) => {
    e.preventDefault(); if (!paying) return;
    const amt = parseFloat(amount);
    if (!(amt > 0)) return toast.error("Enter an amount greater than 0.");
    if (amt > due(paying) + 0.005) return toast.error(`Maximum is ${formatCurrency(due(paying))}.`);
    pay.mutate({ saleId: paying.id, amount: amt }, { onSuccess: () => { toast.success("Payment recorded"); setPaying(null); setAmount(""); }, onError: (err) => toast.error(errorMessage(err)) });
  };

  const stats = [
    { label: "Total outstanding", value: formatCurrency(outstanding), icon: Coins, tone: "text-danger bg-danger-soft" },
    { label: "Customers with dues", value: String(debtors), icon: Users, tone: "text-amber-800 bg-accent-soft" },
    { label: "Pending bills", value: String(credits.length), icon: FileText, tone: "text-primary bg-primary-soft" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Credits & Dues" subtitle="Bills that still have a balance." actions={<SearchInput value={search} onChange={setSearch} placeholder="Search customer or phone…" className="w-full sm:w-72" />} />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {stats.map((s, i) => (
          <m.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} className="card p-5 flex items-center justify-between">
            <div><p className="text-xs uppercase tracking-wider text-muted font-semibold">{s.label}</p><h3 className="text-3xl mt-1">{s.value}</h3></div>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${s.tone}`}><s.icon className="w-6 h-6" /></div>
          </m.div>
        ))}
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead><tr className="table-head border-b border-border"><th className="p-4">Customer</th><th className="p-4">Date</th><th className="p-4">Items</th><th className="p-4">Total</th><th className="p-4">Paid</th><th className="p-4 text-danger">Due</th><th className="p-4 text-right">Actions</th></tr></thead>
            <tbody className="divide-y divide-border">
              {isPending && !sales ? <tr><td colSpan={7}><TableSkeleton cols={7} /></td></tr> : list.length === 0 ? <tr><td colSpan={7} className="p-8 text-center text-muted">{search ? "No matching credits." : "No outstanding credits — everything is settled!"}</td></tr> : list.map((s) => (
                <tr key={s.id} className="hover:bg-background/60">
                  <td className="p-4"><p className="font-semibold">{s.customers?.name ?? "Walk-in"}</p><p className="text-xs text-muted">{s.customers?.phone}</p></td>
                  <td className="p-4 text-sm whitespace-nowrap">{formatDate(s.date)}</td>
                  <td className="p-4 text-sm text-muted max-w-xs truncate">{s.sale_items.map((i) => `${i.quantity}× ${i.name}`).join(", ")}</td>
                  <td className="p-4 font-medium">{formatCurrency(s.total)}</td>
                  <td className="p-4 text-muted">{formatCurrency(s.amount_paid)}</td>
                  <td className="p-4 font-bold text-danger text-lg">{formatCurrency(due(s))}</td>
                  <td className="p-4"><div className="flex justify-end gap-2">
                    <button onClick={() => setReceipt(s)} className="p-2 rounded-lg text-muted hover:text-primary hover:bg-primary-soft cursor-pointer" aria-label="Receipt"><FileText className="w-4 h-4" /></button>
                    <Button variant="secondary" size="sm" onClick={() => { setPaying(s); setAmount(String(due(s))); }}><Coins className="w-3.5 h-3.5" /> Pay</Button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={!!paying} onOpenChange={(o) => !o && setPaying(null)} title="Record payment" size="sm">
        {paying && (
          <form onSubmit={submit} className="space-y-4">
            <div className="bg-background rounded-xl p-4 text-sm space-y-1 border border-border">
              <div className="flex justify-between"><span className="text-muted">Customer</span><span className="font-semibold">{paying.customers?.name}</span></div>
              <div className="flex justify-between"><span className="text-muted">Bill</span><span>#{paying.id} · {formatDate(paying.date)}</span></div>
              <div className="flex justify-between"><span className="text-muted">Total</span><span>{formatCurrency(paying.total)}</span></div>
              <div className="flex justify-between"><span className="text-muted">Paid so far</span><span>{formatCurrency(paying.amount_paid)}</span></div>
              <div className="flex justify-between font-bold text-danger border-t border-border pt-1 mt-1"><span>Balance due</span><span>{formatCurrency(due(paying))}</span></div>
            </div>
            <Field label="Amount received (₹)"><Input required type="number" step="0.01" min="0.01" max={due(paying)} value={amount} onChange={(e) => setAmount(e.target.value)} className="text-lg font-semibold" autoFocus /></Field>
            <div className="flex justify-end gap-3"><Button type="button" variant="ghost" onClick={() => setPaying(null)}>Cancel</Button><Button type="submit" variant="secondary" loading={pay.isPending}><Check className="w-4 h-4" /> Record</Button></div>
          </form>
        )}
      </Dialog>
      <ReceiptDialog sale={receipt} open={!!receipt} onOpenChange={(o) => !o && setReceipt(null)} />
    </div>
  );
}
```

- [ ] **Step 2: Verify and commit**

Open `/credits`: the credit bill from Task 11 appears; Pay with a larger amount → toast; pay the exact due → row disappears, stats update.
```bash
git add src/pages/Credits.tsx && git commit -m "feat(credits): outstanding balances and payment recording

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 17: Calculator widget, PWA manifest and service worker, icons

**Files:**
- Modify: `src/components/CalculatorWidget.tsx`
- Create: `public/manifest.json`, `public/sw.js`, `public/icon-192.png`, `public/icon-512.png`

- [ ] **Step 1: Calculator**

`src/components/CalculatorWidget.tsx`:
```tsx
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Calculator, X, Delete } from "lucide-react";
import { AnimatePresence, m } from "motion/react";
import { cn } from "@/lib/utils";

function evaluate(expr: string): string {
  const s = expr.replace(/[^-+*/().\d\s]/g, "");
  if (!s.trim()) return "0";
  try { const r = Function(`"use strict"; return (${s})`)() as number; return Number.isFinite(r) ? String(Number(r.toFixed(4))) : "Error"; } catch { return "Error"; }
}

export function CalculatorWidget() {
  const [open, setOpen] = useState(false);
  const [display, setDisplay] = useState("0");
  const [eq, setEq] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (open) ref.current?.focus(); }, [open]);

  const num = (n: string) => setDisplay((d) => (d === "0" || d === "Error" ? n : d + n));
  const op = (o: string) => { setEq(display + " " + o + " "); setDisplay("0"); };
  const calc = () => { setDisplay(evaluate(eq + display)); setEq(""); };
  const clear = () => { setDisplay("0"); setEq(""); };
  const back = () => setDisplay((d) => (d.length > 1 ? d.slice(0, -1) : "0"));

  const onKey = (e: KeyboardEvent) => {
    if (/^[0-9.]$/.test(e.key)) num(e.key);
    else if (["+", "-", "*", "/"].includes(e.key)) { e.preventDefault(); op(e.key); }
    else if (e.key === "Enter" || e.key === "=") { e.preventDefault(); calc(); }
    else if (e.key === "Backspace") back();
    else if (e.key === "Delete") clear();
    else if (e.key === "Escape") setOpen(false);
  };

  const k = "h-12 rounded-xl font-display font-semibold text-lg bg-surface border border-border hover:bg-background active:scale-95 transition-transform cursor-pointer";
  const o = "h-12 rounded-xl font-display font-semibold text-lg bg-primary-soft text-primary hover:bg-primary hover:text-white active:scale-95 transition-[transform,background-color] cursor-pointer";
  const keys: [string, () => void, string][] = [
    ["7", () => num("7"), k], ["8", () => num("8"), k], ["9", () => num("9"), k], ["×", () => op("*"), o],
    ["4", () => num("4"), k], ["5", () => num("5"), k], ["6", () => num("6"), k], ["−", () => op("-"), o],
    ["1", () => num("1"), k], ["2", () => num("2"), k], ["3", () => num("3"), k], ["+", () => op("+"), o],
  ];

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end lg:bottom-8 lg:right-8">
      <AnimatePresence>
        {open && (
          <m.div ref={ref} tabIndex={0} onKeyDown={onKey} initial={{ opacity: 0, y: 16, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 16, scale: 0.95 }} transition={{ duration: 0.18 }}
            className="mb-3 w-72 card p-4 outline-none focus:ring-4 focus:ring-primary/15">
            <div className="flex justify-between items-center mb-3"><h3 className="text-base flex items-center gap-2"><Calculator className="w-4 h-4 text-primary" /> Calculator</h3><button onClick={() => setOpen(false)} className="p-1 rounded-full text-muted hover:bg-background cursor-pointer" aria-label="Close"><X className="w-4 h-4" /></button></div>
            <div className="bg-background border border-border rounded-xl p-3 mb-3 text-right"><div className="text-xs text-muted h-4 font-mono">{eq}</div><div className="text-3xl font-display font-bold truncate">{display}</div></div>
            <div className="grid grid-cols-4 gap-2">
              <button onClick={clear} className={cn(k, "col-span-2 text-danger bg-danger-soft border-danger/20")}>AC</button>
              <button onClick={back} className={cn(k, "flex items-center justify-center")} aria-label="Backspace"><Delete className="w-5 h-5" /></button>
              <button onClick={() => op("/")} className={o}>÷</button>
              {keys.map(([label, fn, cls]) => <button key={label} onClick={fn} className={cls}>{label}</button>)}
              <button onClick={() => num("0")} className={cn(k, "col-span-2")}>0</button>
              <button onClick={() => num(".")} className={k}>.</button>
              <button onClick={calc} className="h-12 rounded-xl font-display font-bold text-xl btn-primary">=</button>
            </div>
          </m.div>
        )}
      </AnimatePresence>
      <button onClick={() => setOpen((v) => !v)} aria-label="Calculator"
        className={cn("w-14 h-14 rounded-full flex items-center justify-center shadow-rose transition-transform hover:scale-105 active:scale-95 cursor-pointer", open ? "bg-surface text-foreground border border-border" : "bg-linear-to-br from-primary to-accent text-white")}>
        {open ? <X className="w-6 h-6" /> : <Calculator className="w-6 h-6" />}
      </button>
    </div>
  );
}
```

- [ ] **Step 2: PWA files**

`public/manifest.json`:
```json
{
  "short_name": "Sidhi Florals",
  "name": "Sidhi Florals Billing",
  "description": "Billing, inventory and bouquets for Sidhi Florals.",
  "icons": [{ "src": "icon-192.png", "type": "image/png", "sizes": "192x192" }, { "src": "icon-512.png", "type": "image/png", "sizes": "512x512" }],
  "start_url": "/",
  "background_color": "#FBF7F2",
  "theme_color": "#D9456C",
  "display": "standalone",
  "orientation": "portrait"
}
```

`public/sw.js`:
```js
const CACHE = "sidhi-florals-v1";
const SHELL = ["/", "/index.html", "/manifest.json", "/petal.svg", "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener("activate", (e) => { e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== self.location.origin) return; // never touch Supabase or other origins
  if (e.request.mode === "navigate") {
    e.respondWith(fetch(e.request).catch(() => caches.match("/index.html")));
    return;
  }
  // stale-while-revalidate for same-origin assets
  e.respondWith(caches.open(CACHE).then(async (cache) => {
    const cached = await cache.match(e.request);
    const network = fetch(e.request).then((res) => { if (res.ok) cache.put(e.request, res.clone()); return res; }).catch(() => cached);
    return cached || network;
  }));
});
```

Icons: generate two PNGs with a script (no external tools needed). Create `scripts/make-icons.mjs`:
```js
// Renders a simple rose-coloured rounded square with a white flower glyph to PNG using pure Node (no deps).
import { writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";

function png(size, draw) {
  const rows = [];
  for (let y = 0; y < size; y++) { const row = [0]; for (let x = 0; x < size; x++) row.push(...draw(x, y)); rows.push(Buffer.from(row)); }
  const raw = Buffer.concat(rows);
  const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const crc = Buffer.alloc(4); crc.writeInt32BE(crc32(td)); return Buffer.concat([len, td, crc]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}
let T; function crc32(b) { if (!T) { T = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; T[n] = c >>> 0; } } let c = 0xffffffff; for (const x of b) c = T[(c ^ x) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) | 0; }

for (const size of [192, 512]) {
  const r = size * 0.22, cx = size / 2, cy = size / 2;
  const buf = png(size, (x, y) => {
    const inRound = (x > r || y > r || Math.hypot(x - r, y - r) < r) && (x < size - r || y > r || Math.hypot(x - (size - r), y - r) < r) && (x > r || y < size - r || Math.hypot(x - r, y - (size - r)) < r) && (x < size - r || y < size - r || Math.hypot(x - (size - r), y - (size - r)) < r);
    if (!inRound) return [0, 0, 0, 0];
    // flower: 5 petals + centre
    let petal = false;
    for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2 - Math.PI / 2; const px = cx + Math.cos(a) * size * 0.17, py = cy + Math.sin(a) * size * 0.17; if (Math.hypot(x - px, y - py) < size * 0.13) petal = true; }
    const centre = Math.hypot(x - cx, y - cy) < size * 0.08;
    if (centre) return [226, 176, 74, 255];
    if (petal) return [255, 255, 255, 255];
    return [217, 69, 108, 255];
  });
  writeFileSync(`public/icon-${size}.png`, buf);
}
console.log("icons written");
```
Run: `node scripts/make-icons.mjs` — Expected: `icons written`; `public/icon-192.png` and `public/icon-512.png` exist and open as a rose square with a white flower.

- [ ] **Step 3: Verify PWA**

`npm run build && npm run preview`, open the preview URL in the browser pane: calculator opens/closes with keyboard support; DevTools → Application shows manifest and an active service worker; "Install App" button appears in the sidebar in Chrome.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: add calculator widget, PWA manifest, service worker and icons

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 18: Performance verification, README, deploy notes

**Files:**
- Create: `README.md`
- Possibly modify: `vite.config.ts` (chunking), `src/index.css`

- [ ] **Step 1: Bundle check**

Run: `npm run build`. Record the gzip sizes printed. Expected budget: initial route (`index-*.js` + `vendor-*.js` + `supabase-*.js` + `motion-*.js` + CSS) ≤ 180 kB gzip; `charts-*.js` loaded only on Dashboard/Reports; `jspdf` appears as its own chunk and is not in the initial graph.
If `recharts` ends up in the initial graph, confirm no file outside `pages/Dashboard.tsx` and `pages/Reports.tsx` imports it (`grep -r "recharts" src --include=*.tsx -l`).

- [ ] **Step 2: Lighthouse**

Run `npm run preview`, open the preview URL in the browser pane, run Lighthouse (mobile) or the equivalent audit. Target: Performance ≥ 90, no console errors, no layout shift from fonts (fonts are self-hosted with swap).
If FCP > 1.5 s on throttled mobile: move `@fontsource-variable/fraunces` import from `main.tsx` into `index.css` as `@import "@fontsource-variable/fraunces";` after the Tailwind import so it ships in the CSS bundle, and confirm `recharts` is not in the initial chunk.

- [ ] **Step 3: Repeat-visit check**

Load `/`, then reload: dashboard cards must paint immediately from the IndexedDB cache (no skeleton flash), then update. Verify in DevTools → Application → IndexedDB → `keyval-store` has `sidhi-florals-cache`.

- [ ] **Step 4: Full test run and typecheck**

Run: `npm test && npm run typecheck` — Expected: all tests pass, typecheck clean.

- [ ] **Step 5: README**

`README.md`:
```markdown
# Sidhi Florals

Billing, inventory and bouquet management for Sidhi Florals. Vite + React + Tailwind on the front, Supabase Postgres behind it — no API server, so the app opens in about a second.

## Run locally
1. `npm install`
2. Copy `.env.example` to `.env` and fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (Supabase → Project Settings → API).
3. `npm run dev`

## Database
Migrations live in `supabase/migrations/` and are applied in this order: `0001_schema.sql`, `0003_views.sql`, `0002_functions.sql`, `0004_seed.sql` (seed is optional). Apply them from the Supabase SQL editor or the Supabase MCP `apply_migration` tool.

There is **no login**: the anon key has full read/write access. Keep the URL private.

## Shop details on receipts
Edit `src/config/shop.ts` (name, tagline, address, phone, GSTIN, footer).

## Deploy (Vercel)
Import the repo, framework "Vite", add the two `VITE_*` environment variables, deploy. `vercel.json` routes all paths to `index.html`.

## Scripts
- `npm run dev` / `npm run build` / `npm run preview`
- `npm test` — Vitest (cart & bouquet math, BouquetBuilder)
- `npm run typecheck`
```

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "docs: add README with setup, database and deploy instructions

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Self-review notes (already applied)

- Spec coverage: §4 architecture → T1, T6, T7; §5 data model → T2–T4; §6 screens → T8, T11–T16; BouquetBuilder → T9; Receipt → T10; §7 visuals/animations → T1 (tokens, keyframes), T7 (petals, transitions, pill), T8 (count-up), T11 (burst, pulse); §8 performance → T1 (chunks), T6 (persist), T7 (lazy + prefetch), T18 (verification); §9 errors → toasts + `errorMessage` in every mutation, `SetupScreen` for missing env; §10 tests → T5, T9, T3 SQL tests; §11 deploy → T2, T18; §12 out of scope respected.
- Type consistency: `Sale` shape from `sale_json` matches PostgREST nested select (`customers`, `sale_items`, `sale_item_components`) and `mapSale`. `BuilderResult`/`BuilderComponent` used identically in T9, T11, T12. `CartLine.components` type is `CartComponent[]` (no `stock`/`unit`); Billing maps `BuilderComponent → CartComponent` and back (adding `stock`/`unit` from products) — both directions shown in T11.
- Migration order dependency (functions need `v_bouquet_availability`) is called out in T3 and README.
