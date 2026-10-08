import 'server-only'

import { currentUser, type User } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

export const CLERK_ENABLED = process.env.NEXT_PUBLIC_CLERK_ENABLED !== 'false'

function signInUrl(returnTo?: string) {
  return returnTo ? `/sign-in?redirect_url=${encodeURIComponent(returnTo)}` : '/sign-in'
}

export async function requireUser(returnTo?: string): Promise<User> {
  if (!CLERK_ENABLED) redirect(signInUrl(returnTo))

  let user: User | null = null
  try {
    user = await currentUser()
  } catch {
    redirect(signInUrl(returnTo))
  }

  if (!user) redirect(signInUrl(returnTo))
  return user
}

export function getUserRoles(user: User) {
  const roles = user.publicMetadata?.roles
  return Array.isArray(roles) ? roles.filter((role): role is string => typeof role === 'string') : []
}

export async function requireEditorialUser(returnTo = '/editorial') {
  const user = await requireUser(returnTo)
  const roles = getUserRoles(user)
  const isAdmin = roles.includes('admin')
  const isEditor = isAdmin || roles.includes('editor')

  if (!isEditor && !roles.includes('author')) redirect('/cms')

  return { user, isAdmin, isEditor }
}
