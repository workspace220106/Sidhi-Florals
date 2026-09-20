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
      const { data, error } = await supabase.from("sales").select(SALE_SELECT).eq("customer_id", id as number).order("date", { ascending: false });
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
