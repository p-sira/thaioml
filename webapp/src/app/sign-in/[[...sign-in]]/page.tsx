import { SignIn } from '@clerk/nextjs'

const HAS_CLERK = process.env.NEXT_PUBLIC_CLERK_ENABLED !== 'false'

export default function Page() {
  if (!HAS_CLERK) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 p-6 rounded-lg border text-center shadow-sm">
          <h1 className="text-xl font-bold mb-2">Sign In</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            Authentication is currently disabled in this environment.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <SignIn />
    </div>
  )
}
