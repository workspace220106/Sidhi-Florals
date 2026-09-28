import { useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/auth-js";
import { auth, initSession } from "@/lib/auth";
import { LoginScreen } from "./LoginScreen";
import { Skeleton } from "./ui/Skeleton";

/**
 * Renders the shop only for a signed-in user. Restores a saved session first
 * so reopening the app doesn't ask for a password every time.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    initSession()
      .then((s) => { if (active) { setSession(s); setReady(true); } })
      .catch(() => { if (active) setReady(true); });

    const { data } = auth.onAuthStateChange((_e, s) => { if (active) setSession(s); });
    return () => { active = false; data.subscription.unsubscribe(); };
  }, []);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center p-5">
        <Skeleton className="h-64 w-full max-w-sm rounded-card" />
      </div>
    );
  }

  if (!session) return <LoginScreen onSignedIn={() => { /* state arrives via onAuthStateChange */ }} />;

  return <>{children}</>;
}
