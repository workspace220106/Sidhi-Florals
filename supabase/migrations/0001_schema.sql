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

-- RLS: no login in this app; anon has full access (user decision, see spec)
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
