-- Customers are archived rather than deleted so past bills keep their buyer.
alter table customers add column if not exists archived_at timestamptz;
create index if not exists customers_archived_idx on customers (archived_at) where archived_at is null;
