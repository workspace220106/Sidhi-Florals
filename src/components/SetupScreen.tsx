export function SetupScreen({ message }: { message: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="card p-8 max-w-md text-center space-y-3">
        <h1 className="text-2xl">Sidhi Florals needs setup</h1>
        <p className="text-muted">{message}</p>
        <pre className="text-left text-xs bg-background p-3 rounded-lg border border-border">VITE_SUPABASE_URL=...{"\n"}VITE_SUPABASE_ANON_KEY=...</pre>
      </div>
    </div>
  );
}
