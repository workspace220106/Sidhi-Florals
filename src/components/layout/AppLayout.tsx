import type { ReactNode } from "react";
import { useLocation } from "wouter";
import { AnimatePresence, m } from "motion/react";
import { Sidebar } from "./Sidebar";
import { MobileHeader } from "./MobileHeader";
import { CalculatorWidget } from "../CalculatorWidget";

export function AppLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      <MobileHeader />
      <Sidebar />
      <main className="flex-1 lg:ml-72 min-h-screen p-4 sm:p-6 lg:p-8 relative z-10">
        <AnimatePresence mode="wait" initial={false}>
          <m.div key={location} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.22, ease: "easeOut" }}
            className="max-w-7xl mx-auto w-full pb-24">
            {children}
          </m.div>
        </AnimatePresence>
      </main>
      <CalculatorWidget />
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div>
        <h1 className="text-3xl">{title}</h1>
        {subtitle && <p className="text-muted mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-3 w-full sm:w-auto">{actions}</div>}
    </div>
  );
}
