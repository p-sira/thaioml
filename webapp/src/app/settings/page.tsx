import { currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import UserSettingsClient from './UserSettingsClient'

export default async function SettingsPage() {
  const user = await currentUser()
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
