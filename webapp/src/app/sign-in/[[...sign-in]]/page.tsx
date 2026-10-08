import { SignIn } from '@clerk/nextjs'
import { AuthUnavailable } from '@/components/AuthUnavailable'
import { CLERK_ENABLED } from '@/lib/auth'

export default function Page() {
  if (!CLERK_ENABLED) return <AuthUnavailable action="Sign In" />

  return (
    <div className="flex min-h-screen items-center justify-center">
      <SignIn />
    </div>
  )
}
