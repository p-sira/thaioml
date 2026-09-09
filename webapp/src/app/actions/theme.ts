'use server'

import { auth, clerkClient } from '@clerk/nextjs/server'
import { cookies } from 'next/headers'

export async function updateThemeSettings(theme: string, accent: string) {
  const authObj = await auth()
  if (!authObj.userId) {
    throw new Error('Unauthorized')
  }

  // clerkClient() in v7 is an async call or returns an object?
  // Let's check Clerk v7 docs. In v7, clerkClient is a Promise or a function?
  // It's a function: await clerkClient().users.updateUserMetadata(...)
  // Actually, wait, let's write the v7 compliant version.
  const client = await clerkClient()
  await client.users.updateUserMetadata(authObj.userId, {
    publicMetadata: {
      theme,
      accent,
    },
  })

  const cookieStore = await cookies()
  // Ensure the server sets the cookie so layout.tsx gets the updated value immediately on refresh
  const isProd = process.env.NODE_ENV === 'production'
  cookieStore.set('thaioml-theme', theme, { 
    path: '/', 
    domain: isProd ? '.thaioml.org' : undefined,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365 
  })
  cookieStore.set('thaioml-accent-color', accent, { 
    path: '/', 
    domain: isProd ? '.thaioml.org' : undefined,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365 
  })
}
