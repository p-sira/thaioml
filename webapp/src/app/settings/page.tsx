import UserSettingsClient from './UserSettingsClient'
import { requireUser } from '@/lib/auth'

export default async function SettingsPage() {
  const user = await requireUser('/settings')

  const currentTheme = typeof user.publicMetadata?.theme === 'string' ? user.publicMetadata.theme : 'leuko'

  return (
    <div className="min-h-screen flex flex-col p-4">
      <main className="flex justify-center flex-1">
        <UserSettingsClient currentTheme={currentTheme} />
      </main>
    </div>
  )
}
