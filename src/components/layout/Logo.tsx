import { Flower2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { m } from "motion/react";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3 group cursor-pointer select-none">
      <m.div 
        whileHover={{ rotate: 15, scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        transition={{ type: "spring", stiffness: 400, damping: 17 }}
        className={cn("rounded-2xl bg-linear-to-br from-primary via-rose-500 to-primary-hover text-white flex items-center justify-center shadow-rose group-hover:shadow-rose-glow transition-shadow duration-300", compact ? "w-9 h-9" : "w-12 h-12")}>
        <Flower2 className={cn("transition-transform duration-300 group-hover:scale-110", compact ? "w-5 h-5" : "w-7 h-7")} />
      </m.div>
      <div>
        <h1 className={cn("font-display font-bold leading-tight text-gradient tracking-tight transition-all duration-300 group-hover:tracking-normal", compact ? "text-lg" : "text-2xl")}>Sidhi</h1>
        <p className="text-[10px] font-bold text-muted uppercase tracking-[0.25em] transition-colors duration-300 group-hover:text-primary">Florals</p>
      </div>
    </div>
  );
}

