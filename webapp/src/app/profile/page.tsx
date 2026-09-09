import { UserProfile } from '@clerk/nextjs'
import { auth } from '@clerk/nextjs/server'
import Link from 'next/link'

export default async function ProfilePage() {
  await auth.protect()
  return (
    <div className="min-h-screen flex flex-col p-4">
      <header className="flex items-center justify-between py-4 border-b border-slate-200 mb-8 max-w-5xl w-full mx-auto">
        <h1 className="text-2xl font-bold text-slate-800">Your Profile</h1>
        <Link href="/" className="text-blue-600 hover:underline font-medium">
          &larr; Back to AI Search
        </Link>
      </header>
      
      <main className="flex justify-center flex-1">
        <UserProfile routing="hash" />
      </main>
    </div>
  )
}
