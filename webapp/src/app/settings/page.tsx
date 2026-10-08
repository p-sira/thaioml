import { currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import UserSettingsClient from './UserSettingsClient'

const HAS_CLERK = process.env.NEXT_PUBLIC_CLERK_ENABLED !== 'false'

export default async function SettingsPage() {
  if (!HAS_CLERK) {
    redirect('/sign-in')
  }

  let user = null
  try {
    user = await currentUser()
  } catch {
    redirect('/sign-in')
  }

  if (!user) {
    redirect('/sign-in')
  }

  const currentTheme = (user?.publicMetadata?.theme as string) || 'leuko'

  return (
    <div className="min-h-screen flex flex-col p-4">
      <main className="flex justify-center flex-1">
        <UserSettingsClient currentTheme={currentTheme} />
      </main>
    </div>
  )
}
