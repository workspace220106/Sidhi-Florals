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
