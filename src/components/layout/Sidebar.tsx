import { Link, useLocation } from "wouter";
import { LayoutDashboard, ShoppingBag, Flower2, Users, History, BarChart3, Coins } from "lucide-react";
import { m } from "motion/react";
import { cn } from "@/lib/utils";
import { Logo } from "./Logo";
import { InstallButton } from "../InstallButton";
import { prefetchRoute } from "@/routes";

export const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/billing", label: "Billing", icon: ShoppingBag },
  { href: "/inventory", label: "Inventory", icon: Flower2 },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/sales", label: "Sales", icon: History },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/credits", label: "Credits & Dues", icon: Coins },
];

export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const [location] = useLocation();
  return (
    <div className="h-full flex flex-col pt-8 pb-6 px-4">
      <div className="px-3 mb-10"><Logo /></div>
      <nav className="flex-1 space-y-1">
        {NAV.map((item) => {
          const active = location === item.href || (item.href !== "/" && location.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href} onClick={onNavigate} onMouseEnter={() => prefetchRoute(item.href)} onTouchStart={() => prefetchRoute(item.href)}
              className={cn("relative flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors", active ? "text-primary" : "text-muted hover:text-foreground hover:bg-primary-soft/50")}>
              {active && <m.span layoutId="nav-pill" className="absolute inset-0 bg-primary-soft rounded-xl" transition={{ type: "spring", stiffness: 350, damping: 30 }} />}
              <item.icon className="relative w-5 h-5" />
              <span className="relative">{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto px-1 space-y-3">
        <InstallButton />
        <div className="p-3 rounded-xl bg-secondary-soft border border-secondary/20 flex items-center gap-2 text-sm text-secondary font-medium">
          <span className="w-2 h-2 rounded-full bg-secondary" /> Fresh &amp; online
        </div>
      </div>
    </div>
  );
}

export function Sidebar() {
  return (
    <aside className="hidden lg:flex fixed top-0 left-0 h-screen w-72 flex-col border-r border-border bg-surface/70 z-20">
      <SidebarContent />
    </aside>
  );
}
