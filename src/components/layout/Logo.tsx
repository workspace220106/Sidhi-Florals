import { Flower2 } from "lucide-react";
import { cn } from "@/lib/utils";
export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className={cn("rounded-2xl bg-linear-to-br from-primary to-accent text-white flex items-center justify-center shadow-rose", compact ? "w-9 h-9" : "w-12 h-12")}>
        <Flower2 className={compact ? "w-5 h-5" : "w-7 h-7"} />
      </div>
      <div>
        <h1 className={cn("font-display font-bold leading-tight text-gradient", compact ? "text-lg" : "text-2xl")}>Sidhi</h1>
        <p className="text-[10px] font-semibold text-muted uppercase tracking-[0.2em]">Florals</p>
      </div>
    </div>
  );
}
