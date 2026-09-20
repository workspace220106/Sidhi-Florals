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
