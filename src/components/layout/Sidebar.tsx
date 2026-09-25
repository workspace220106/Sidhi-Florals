import { Link, useLocation } from "wouter";
import { LayoutDashboard, ShoppingBag, Flower2, Users, History, BarChart3, Coins } from "lucide-react";
import { m } from "motion/react";
import { cn } from "@/lib/utils";
import { Logo } from "./Logo";
import { InstallButton } from "../InstallButton";
import { ConnectionStatus } from "../ConnectionStatus";
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
      <nav className="flex-1 space-y-1.5">
        {NAV.map((item) => {
          const active = location === item.href || (item.href !== "/" && location.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href} onClick={onNavigate} onMouseEnter={() => prefetchRoute(item.href)} onTouchStart={() => prefetchRoute(item.href)}
              className={cn("relative flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 group", 
                active ? "text-primary font-semibold" : "text-muted hover:text-foreground hover:bg-secondary-soft hover:translate-x-1")}>
              {active && (
                <m.span layoutId="nav-pill" className="absolute inset-0 bg-primary-soft rounded-xl border border-primary-border/60 shadow-xs" transition={{ type: "spring", stiffness: 380, damping: 32 }} />
              )}
              <item.icon className={cn("relative w-5 h-5 transition-transform duration-200 group-hover:scale-110", active ? "text-primary" : "text-muted group-hover:text-primary")} />
              <span className="relative">{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto px-1 space-y-3">
        <InstallButton />
        <ConnectionStatus />
      </div>
    </div>
  );
}

export function Sidebar() {
  return (
    <aside className="hidden lg:flex fixed top-0 left-0 h-screen w-64 xl:w-72 flex-col border-r border-border bg-surface/85 backdrop-blur-md z-20 shadow-xs">
      <SidebarContent />
    </aside>
  );
}

