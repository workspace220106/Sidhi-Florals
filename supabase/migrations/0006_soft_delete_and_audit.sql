-- Bills and products are never destroyed: a sale is voided (with its stock
-- returned) and a product is archived. Sales history is a business record —
-- it must survive mistakes, and revenue must not be able to silently vanish.

alter table sales add column if not exists voided_at timestamptz;
alter table sales add column if not exists void_reason text;
create index if not exists sales_voided_idx on sales (voided_at) where voided_at is null;

alter table products add column if not exists archived_at timestamptz;
create index if not exists products_archived_idx on products (archived_at) where archived_at is null;

create or replace function void_sale(p_sale_id integer, p_reason text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v sales%rowtype; r record;
begin
  select * into v from sales where id = p_sale_id for update;
  if not found then raise exception 'Sale % not found', p_sale_id; end if;
  if v.voided_at is not null then raise exception 'Bill #% is already voided', p_sale_id; end if;

  for r in
    select c.product_id, c.quantity from sale_item_components c
    join sale_items i on i.id = c.sale_item_id
    where i.sale_id = p_sale_id and c.product_id is not null
  loop
    update products set stock = stock + r.quantity where id = r.product_id;
  end loop;

  for r in
    select i.product_id, i.quantity from sale_items i
    where i.sale_id = p_sale_id and i.product_id is not null
      and not exists (select 1 from sale_item_components c where c.sale_item_id = i.id)
  loop
    update products set stock = stock + r.quantity where id = r.product_id;
  end loop;

  update sales set voided_at = now(), void_reason = nullif(trim(coalesce(p_reason, '')), '')
   where id = p_sale_id;

  return sale_json(p_sale_id);
end $$;

-- Anything still calling delete_sale now voids instead of destroying.
create or replace function delete_sale(p_sale_id integer)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform void_sale(p_sale_id, 'Voided from the app');
end $$;

grant execute on function void_sale(integer, text) to anon, authenticated;
