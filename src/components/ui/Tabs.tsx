import { m } from "motion/react";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export interface TabItem<T extends string> { value: T; label: string; icon?: LucideIcon; count?: number }
export function Tabs<T extends string>({ value, onChange, items, className, id = "tabs" }: { value: T; onChange: (v: T) => void; items: TabItem<T>[]; className?: string; id?: string }) {
  return (
    <div className={cn("inline-flex p-1 bg-border/40 rounded-xl max-w-full overflow-x-auto", className)}>
      {items.map((it) => {
        const active = it.value === value;
        return (
          <button key={it.value} onClick={() => onChange(it.value)}
            className={cn("relative px-4 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap", active ? "text-primary" : "text-muted hover:text-foreground")}>
            {active && <m.span layoutId={`${id}-pill`} className="absolute inset-0 bg-surface rounded-lg shadow-card" transition={{ type: "spring", stiffness: 400, damping: 32 }} />}
            <span className="relative flex items-center gap-2">{it.icon && <it.icon className="w-4 h-4" />}{it.label}{it.count != null && <span className="text-xs opacity-70">({it.count})</span>}</span>
          </button>
        );
      })}
    </div>
  );
}
