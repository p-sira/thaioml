import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

// Protect the profile page, but leave the rest open for now (e.g. AI Search might need auth, but we can do that in the page itself)
const isProtectedRoute = createRouteMatcher(['/profile(.*)'])

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) await auth.protect()
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}
