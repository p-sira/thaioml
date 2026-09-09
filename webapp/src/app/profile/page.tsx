import { UserProfile } from '@clerk/nextjs'
import { currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import ThemeSettings from './ThemeSettings'
import { Palette } from 'lucide-react'

export default async function ProfilePage() {
  const user = await currentUser()
  if (!user) {
    redirect('/sign-in')
  }
  
  const currentTheme = (user?.publicMetadata?.theme as string) || 'leuko'
  const currentAccent = (user?.publicMetadata?.accent as string) || '#64748b'

  return (
    <div className="min-h-screen flex flex-col p-4">
      <header className="flex items-center justify-between py-4 border-b border-slate-200 mb-8 max-w-5xl w-full mx-auto">
        <h1 className="text-2xl font-bold text-slate-800">Your Profile</h1>
        <Link href="/" className="text-blue-600 hover:underline font-medium">
          &larr; Back to AI Search
        </Link>
      </header>
      
      <main className="flex justify-center flex-1">
        <UserProfile routing="hash">
          <UserProfile.Page label="Display Settings" labelIcon={<Palette className="w-4 h-4" />} url="theme-settings">
            <ThemeSettings initialTheme={currentTheme} initialAccent={currentAccent} />
          </UserProfile.Page>
        </UserProfile>
      </main>
    </div>
  )
}
