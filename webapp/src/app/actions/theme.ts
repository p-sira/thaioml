'use server'

import { auth, clerkClient } from '@clerk/nextjs/server'

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
}
