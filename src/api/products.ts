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
