import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { DailyRow, DashboardData, MarginRow, MonthlyRow, TopProduct } from "./types";

async function selectView<T>(view: string): Promise<T[]> {
  const { data, error } = await supabase.from(view).select("*");
  if (error) throw error;
  return (data ?? []) as T[];
}

export function useDashboard() {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: async (): Promise<DashboardData> => {
      const { data, error } = await supabase.rpc("get_dashboard");
      if (error) throw error;
      return data as DashboardData;
    },
  });
}

export const useDailySales = () => useQuery({ queryKey: ["daily-sales"], queryFn: () => selectView<DailyRow>("v_daily_sales") });
export const useMonthlySales = () => useQuery({ queryKey: ["monthly-sales"], queryFn: () => selectView<MonthlyRow>("v_monthly_sales") });
export const useTopProducts = () => useQuery({ queryKey: ["top-products"], queryFn: () => selectView<TopProduct>("v_top_products") });
export const useProfitMargins = () => useQuery({ queryKey: ["profit-margins"], queryFn: () => selectView<MarginRow>("v_profit_margins") });
