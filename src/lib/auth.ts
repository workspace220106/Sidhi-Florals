import { GoTrueClient, type Session } from "@supabase/auth-js";
import { supabase } from "./supabase";

const url = import.meta.env.VITE_SUPABASE_URL ?? "";
const key = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";

export const auth = new GoTrueClient({
  url: `${url}/auth/v1`,
  headers: { apikey: key, Authorization: `Bearer ${key}` },
  storageKey: "sidhi-florals-auth",
  autoRefreshToken: true,
  persistSession: true,
  detectSessionInUrl: false,
});

/**
 * Point PostgREST at the signed-in user's token so the database sees a real
 * identity and can enforce row-level security. Falls back to the anon key when
 * signed out, which the policies reject.
 */
export function applySession(session: Session | null) {
  // postgrest-js exposes a mutable Headers object rather than a setAuth().
  supabase.headers.set("Authorization", `Bearer ${session?.access_token ?? key}`);
}

auth.onAuthStateChange((_event, session) => applySession(session));

/** Restores a saved session on boot so the shop isn't asked to log in daily. */
export async function initSession(): Promise<Session | null> {
  const { data } = await auth.getSession();
  applySession(data.session);
  return data.session;
}

export async function signIn(email: string, password: string) {
  const { data, error } = await auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw error;
  applySession(data.session);
  return data.session;
}

export async function signOut() {
  await auth.signOut();
  applySession(null);
}

/** Auth errors phrased for a shop owner rather than a developer. */
export function authErrorMessage(err: unknown): string {
  const raw = (err as { message?: string })?.message ?? String(err);
  if (/invalid login credentials/i.test(raw)) return "That email or password is not right.";
  if (/email not confirmed/i.test(raw)) return "This account still needs its email confirmed.";
  if (/rate limit|too many/i.test(raw)) return "Too many attempts. Wait a minute and try again.";
  if (/failed to fetch|network/i.test(raw)) return "Could not reach the server. Check your internet.";
  return raw;
}
