'use server'

import { auth, clerkClient } from '@clerk/nextjs/server'
import { cookies, headers } from 'next/headers'

export async function updateThemeSettings(theme: string) {
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
    },
  })

  const cookieStore = await cookies()
  const headersList = await headers()
  const host = headersList.get('host') || ''
  
  // Set cross-subdomain cookie for production, otherwise bind to exact hostname
  const domain = host.includes('thaioml.org') ? '.thaioml.org' : undefined

  cookieStore.set('thaioml-theme', theme, { 
    path: '/', 
    domain,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365 
  })
}
