import { PostgrestClient } from "@supabase/postgrest-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseConfigError: string | null =
  !url || !key ? "Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Copy .env.example to .env and fill in your Supabase project values." : null;

/** PostgREST-only client: same .from()/.rpc() API as supabase-js, a fraction of the bundle size. */
export const supabase = new PostgrestClient(`${url ?? "https://invalid.supabase.co"}/rest/v1`, {
  headers: { apikey: key ?? "", Authorization: `Bearer ${key ?? ""}` },
});

/** Turns a PostgREST or network error into a message a shop owner can act on. */
export function errorMessage(err: unknown): string {
  if (!err) return "Something went wrong. Please try again.";
  const e = err as { message?: string; details?: string; code?: string };
  const raw = (e.message || e.details || String(err)).trim();

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return "You're offline — this could not be saved. Reconnect and try again.";
  }
  if (/failed to fetch|networkerror|load failed|fetch failed/i.test(raw)) {
    return "Could not reach the server. Check your internet and try again.";
  }
  if (e.code === "23505" || /duplicate key/i.test(raw)) {
    return "That entry already exists.";
  }
  if (e.code === "23503" || /foreign key|violates foreign key/i.test(raw)) {
    return "This item is used in a bouquet recipe. Remove it from those recipes first.";
  }
  // Postgres RAISE messages arrive prefixed with a SQLSTATE like "P0001: ".
  return raw.replace(/^[A-Z0-9]{5}:\s*/, "");
}
