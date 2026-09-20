import { m } from "motion/react";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export interface TabItem<T extends string> { value: T; label: string; icon?: LucideIcon; count?: number }
export function Tabs<T extends string>({ value, onChange, items, className, id = "tabs" }: { value: T; onChange: (v: T) => void; items: TabItem<T>[]; className?: string; id?: string }) {
  return (
    <div className={cn("inline-flex p-1.5 bg-secondary-soft rounded-2xl border border-border max-w-full overflow-x-auto", className)}>
      {items.map((it) => {
        const active = it.value === value;
        return (
          <button key={it.value} onClick={() => onChange(it.value)}
            className={cn("relative px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 cursor-pointer flex items-center gap-2 whitespace-nowrap select-none", 
              active ? "text-primary" : "text-muted hover:text-foreground hover:bg-surface/50")}>
            {active && (
              <m.span layoutId={`${id}-pill`} className="absolute inset-0 bg-surface rounded-xl shadow-card border border-primary-border/60" transition={{ type: "spring", stiffness: 420, damping: 32 }} />
            )}
            <span className="relative flex items-center gap-2">
              {it.icon && <it.icon className={cn("w-4 h-4 transition-transform", active && "scale-110 text-primary")} />}
              {it.label}
              {it.count != null && <span className="text-xs opacity-75 font-mono">({it.count})</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}

