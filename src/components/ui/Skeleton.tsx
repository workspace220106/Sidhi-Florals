import { cn } from "@/lib/utils";
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("bg-border/60 rounded-lg animate-pulse", className)} aria-hidden />;
}
export function TableSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="p-4 space-y-3">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4">{Array.from({ length: cols }).map((_, c) => <Skeleton key={c} className="h-5 flex-1" />)}</div>
      ))}
    </div>
  );
}
