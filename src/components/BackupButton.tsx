import { useEffect, useState } from "react";
import { DatabaseBackup } from "lucide-react";
import { toast } from "sonner";
import { Button } from "./ui/Button";
import { buildBackup, downloadBackup, backupRowTotal } from "@/lib/backup";
import { errorMessage } from "@/lib/supabase";
import { cn } from "@/lib/utils";

const LAST_BACKUP_KEY = "sidhi-last-backup";
const NAG_AFTER_DAYS = 7;

function readLastBackup(): Date | null {
  try {
    const v = localStorage.getItem(LAST_BACKUP_KEY);
    return v ? new Date(v) : null;
  } catch {
    return null;
  }
}

/**
 * Downloads the shop's whole database as a JSON file it owns outright,
 * and nudges gently once a week so backups actually happen.
 */
export function BackupButton({ className }: { className?: string }) {
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState<Date | null>(null);

  useEffect(() => setLast(readLastBackup()), []);

  const daysSince = last ? (Date.now() - last.getTime()) / 86_400_000 : Infinity;
  const overdue = daysSince >= NAG_AFTER_DAYS;

  const run = async () => {
    setBusy(true);
    try {
      const backup = await buildBackup();
      downloadBackup(backup);
      const now = new Date();
      try { localStorage.setItem(LAST_BACKUP_KEY, now.toISOString()); } catch { /* private mode */ }
      setLast(now);
      toast.success(`Backup saved — ${backupRowTotal(backup)} records`);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={cn("space-y-1.5", className)}>
      <Button
        variant={overdue ? "primary" : "outline"}
        className="w-full"
        onClick={run}
        loading={busy}
        title="Download a complete copy of your data"
      >
        <DatabaseBackup className="w-4 h-4" />
        {busy ? "Preparing…" : "Download backup"}
      </Button>
      <p className="text-[11px] text-muted text-center">
        {last
          ? overdue
            ? `Last backup ${Math.floor(daysSince)} days ago`
            : `Backed up ${daysSince < 1 ? "today" : `${Math.floor(daysSince)}d ago`}`
          : "No backup taken yet"}
      </p>
    </div>
  );
}
