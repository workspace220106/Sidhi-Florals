-- Stored balance so Credits can filter outstanding bills in the database
-- instead of scanning a recent-sales window client-side (which silently
-- dropped old debts once the shop passed that many bills).
alter table sales
  add column if not exists balance_due numeric(10,2)
  generated always as (total - amount_paid) stored;

create index if not exists sales_balance_due_idx on sales (balance_due) where balance_due > 0;
