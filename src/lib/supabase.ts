import { PostgrestClient } from "@supabase/postgrest-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseConfigError: string | null =
  !url || !key ? "Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Copy .env.example to .env and fill in your Supabase project values." : null;

/** PostgREST-only client: same .from()/.rpc() API as supabase-js, a fraction of the bundle size. */
export const supabase = new PostgrestClient(`${url ?? "https://invalid.supabase.co"}/rest/v1`, {
  headers: { apikey: key ?? "", Authorization: `Bearer ${key ?? ""}` },
});

/** Turns a PostgREST error into a readable message. */
export function errorMessage(err: unknown): string {
  if (!err) return "Unknown error";
  const e = err as { message?: string; details?: string };
  const msg = e.message || e.details || String(err);
  return msg.replace(/^[A-Z0-9]{5}:\s*/, "");
}
