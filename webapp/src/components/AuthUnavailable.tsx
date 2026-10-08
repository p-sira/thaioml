export function AuthUnavailable({ action }: { action: 'Sign In' | 'Sign Up' }) {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md rounded-lg border border-border bg-background p-6 text-center shadow-sm">
        <h1 className="mb-2 text-xl font-bold text-foreground">{action}</h1>
        <p className="text-sm text-foreground-muted">
          Authentication is currently disabled in this environment.
        </p>
      </div>
    </div>
  )
}
