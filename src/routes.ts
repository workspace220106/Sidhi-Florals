export const loaders = {
  "/": () => import("@/pages/Dashboard"),
  "/billing": () => import("@/pages/Billing"),
  "/inventory": () => import("@/pages/Inventory"),
  "/customers": () => import("@/pages/Customers"),
  "/sales": () => import("@/pages/Sales"),
  "/reports": () => import("@/pages/Reports"),
  "/credits": () => import("@/pages/Credits"),
} as const;

export function prefetchRoute(href: string) {
  const l = loaders[href as keyof typeof loaders];
  if (l) void l();
}
