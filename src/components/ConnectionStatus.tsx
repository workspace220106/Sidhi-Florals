import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Reports the browser's real connectivity instead of always claiming "online".
 * While offline, saved pages still open but new bills cannot be written.
 */
export function useOnline() {
  const [online, setOnline] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine));
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);
  return online;
}

export function ConnectionStatus() {
  const online = useOnline();
  return (
    <div
      className={cn(
        "p-3 rounded-xl border flex items-center gap-2.5 text-sm font-semibold transition-colors",
        online ? "bg-secondary-soft border-border text-foreground" : "bg-primary-soft border-primary-border text-primary",
      )}
    >
      <span className="relative flex h-2.5 w-2.5">
        {online && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />}
        <span className={cn("relative inline-flex rounded-full h-2.5 w-2.5", online ? "bg-primary" : "bg-muted")} />
      </span>
      <span>{online ? "Sidhi Live Studio" : "Offline — bills can't save"}</span>
    </div>
  );
}
