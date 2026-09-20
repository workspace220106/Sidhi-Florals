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
