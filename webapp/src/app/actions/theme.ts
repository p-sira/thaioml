'use server'

import { auth, clerkClient } from '@clerk/nextjs/server'
import { cookies, headers } from 'next/headers'
import { isTheme } from '@/lib/theme'

export async function updateThemeSettings(theme: string) {
  if (!isTheme(theme)) {
    throw new Error('Unsupported theme')
  }

  const authObj = await auth()
  if (!authObj.userId) {
    throw new Error('Unauthorized')
  }

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
