import type { ReactNode } from "react";
import { useLocation } from "wouter";
import { AnimatePresence, m } from "motion/react";
import { Sidebar } from "./Sidebar";
import { MobileHeader } from "./MobileHeader";
import { CalculatorWidget } from "../CalculatorWidget";

export function AppLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return (
    <div className="min-h-screen flex flex-col lg:flex-row min-w-0">
      <MobileHeader />
      <Sidebar />
      <main className="flex-1 lg:ml-64 xl:ml-72 min-h-screen p-3.5 sm:p-5 lg:p-6 xl:p-8 relative z-10 min-w-0 max-w-full">
        <AnimatePresence mode="wait" initial={false}>
          <m.div key={location} 
            initial={{ opacity: 0, y: 14, scale: 0.99 }} 
            animate={{ opacity: 1, y: 0, scale: 1 }} 
            exit={{ opacity: 0, y: -10, scale: 0.99 }} 
            transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-7xl mx-auto w-full pb-24 min-w-0">
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
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
      <div>
        <h1 className="text-3xl sm:text-4xl text-foreground font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="text-muted mt-1.5 text-base font-normal">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-3 w-full sm:w-auto shrink-0">{actions}</div>}
    </div>
  );
}

