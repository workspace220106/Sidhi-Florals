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
