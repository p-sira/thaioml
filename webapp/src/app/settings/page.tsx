import { currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import UserSettingsClient from './UserSettingsClient'

export default async function SettingsPage() {
  const user = await currentUser()
  if (!user) {
    redirect('/sign-in')
  }

  const currentTheme = (user?.publicMetadata?.theme as string) || 'leuko'

  return (
    <div className="min-h-screen flex flex-col p-4">
      <div className="mb-8 max-w-5xl w-full mx-auto pt-4">
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
      </div>

      <main className="flex justify-center flex-1">
        <UserSettingsClient currentTheme={currentTheme} />
      </main>
    </div>
  )
}
