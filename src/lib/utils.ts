import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Money for display. Shows paise only when the amount actually has them,
 * so ₹22 stays ₹22 but ₹22.50 is never rounded to ₹23.
 */
export function formatCurrency(amount: number) {
  const n = Number.isFinite(amount) ? amount : 0;
  const hasPaise = Math.abs(n * 100 - Math.round(n * 100)) > 0.5 || Math.round(n * 100) % 100 !== 0;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: hasPaise ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(n);
}

export function formatNumber(n: number) {
  return new Intl.NumberFormat("en-IN").format(n);
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function displayName(p: { name: string; variety?: string | null }) {
  return p.variety ? `${p.name} · ${p.variety}` : p.name;
}

export function padId(id: number) {
  return String(id).padStart(6, "0");
}
