import { supabase } from "./supabase";

/** Tables that together hold everything the shop has entered. */
const TABLES = [
  "products",
  "bouquet_recipes",
  "customers",
  "sales",
  "sale_items",
  "sale_item_components",
] as const;

export interface BackupFile {
  app: "sidhi-florals";
  version: 1;
  exported_at: string;
  counts: Record<string, number>;
  data: Record<string, unknown[]>;
}

/**
 * Pulls every row from every table into one JSON file.
 *
 * This is the shop's own copy of its data, independent of the hosting
 * provider: it survives an account lapse, an accidental wipe, or a decision
 * to move somewhere else entirely. Plain JSON so it stays readable for years
 * without this app.
 */
export async function buildBackup(): Promise<BackupFile> {
  const data: Record<string, unknown[]> = {};
  const counts: Record<string, number> = {};

  for (const table of TABLES) {
    const rows: unknown[] = [];
    const pageSize = 1000;
    // Paged so a shop with years of history still exports completely.
    for (let from = 0; ; from += pageSize) {
      const { data: page, error } = await supabase
        .from(table)
        .select("*")
        .order("id", { ascending: true })
        .range(from, from + pageSize - 1);
      if (error) throw error;
      rows.push(...(page ?? []));
      if (!page || page.length < pageSize) break;
    }
    data[table] = rows;
    counts[table] = rows.length;
  }

  return {
    app: "sidhi-florals",
    version: 1,
    exported_at: new Date().toISOString(),
    counts,
    data,
  };
}

export function downloadBackup(backup: BackupFile) {
  const stamp = backup.exported_at.slice(0, 10);
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `sidhi-florals-backup-${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function backupRowTotal(backup: BackupFile) {
  return Object.values(backup.counts).reduce((a, b) => a + b, 0);
}
