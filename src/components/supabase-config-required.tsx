export function isSupabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}

export function SupabaseConfigRequired() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="max-w-lg rounded-2xl border border-border bg-card p-8 text-card-foreground shadow-lg">
        <h1 className="font-display text-xl font-bold">Supabase not configured</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Add these environment variables in Vercel → Project → Settings → Environment Variables,
          then <strong>redeploy</strong> (required for <code className="text-xs">NEXT_PUBLIC_*</code> vars).
        </p>
        <ul className="mt-4 space-y-2 font-mono text-xs text-muted-foreground">
          <li>NEXT_PUBLIC_SUPABASE_URL</li>
          <li>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</li>
          <li>SUPABASE_SERVICE_ROLE_KEY</li>
          <li>SUPABASE_URL</li>
          <li>SUPABASE_PUBLISHABLE_KEY</li>
        </ul>
      </div>
    </div>
  );
}
