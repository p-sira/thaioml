import { clerkMiddleware } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// When NEXT_PUBLIC_CLERK_ENABLED=false (e.g., CI with dummy keys),
// skip Clerk middleware entirely so it doesn't try to reach a
// non-existent Clerk backend and return 400 for all requests.
const isClerkEnabled = process.env.NEXT_PUBLIC_CLERK_ENABLED !== 'false'

export default isClerkEnabled
  ? clerkMiddleware()
  : (_req: NextRequest) => NextResponse.next()

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}
