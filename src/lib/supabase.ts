import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseConfigError: string | null =
  !url || !key ? "Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Copy .env.example to .env and fill in your Supabase project values." : null;

export const supabase = createClient(url ?? "https://invalid.supabase.co", key ?? "invalid", {
  auth: { persistSession: false, autoRefreshToken: false },
});

/** Turns a Supabase/PostgREST error into a readable message. */
export function errorMessage(err: unknown): string {
  if (!err) return "Unknown error";
  const e = err as { message?: string; details?: string };
  const msg = e.message || e.details || String(err);
  return msg.replace(/^[A-Z0-9]{5}:\s*/, "");
}
