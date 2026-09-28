import { useState, type FormEvent } from "react";
import { Flower2, LogIn } from "lucide-react";
import { signIn, authErrorMessage } from "@/lib/auth";
import { Button } from "./ui/Button";
import { Input, Field } from "./ui/Input";
import { SHOP } from "@/config/shop";

export function LoginScreen({ onSignedIn }: { onSignedIn: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signIn(email, password);
      onSignedIn();
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-5">
      <div className="card w-full max-w-sm p-7 space-y-6">
        <div className="text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-primary to-primary-hover text-white flex items-center justify-center mx-auto shadow-rose">
            <Flower2 className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-gradient">{SHOP.name}</h1>
            <p className="text-sm text-muted mt-1">Sign in to open the shop.</p>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <Field label="Email">
            <Input
              type="email"
              autoComplete="username"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </Field>
          <Field label="Password">
            <Input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>

          {error && (
            <p className="text-sm text-primary bg-primary-soft border border-primary-border rounded-xl px-3 py-2">
              {error}
            </p>
          )}

          <Button type="submit" className="w-full" loading={busy} size="lg">
            <LogIn className="w-4 h-4" /> Sign in
          </Button>
        </form>

        <p className="text-[11px] text-muted text-center leading-relaxed">
          This shop's billing, stock and customer records are private to this account.
        </p>
      </div>
    </div>
  );
}
