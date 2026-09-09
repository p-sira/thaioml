import { UserButton } from '@clerk/nextjs'
import { currentUser } from '@clerk/nextjs/server'
import Link from 'next/link'

export default async function Home() {
  const user = await currentUser()
  const isSignedIn = !!user
  
  const roles = (user?.publicMetadata?.roles as string[]) || []
  const hasCmsPermission = roles.includes('editor') || roles.includes('admin')

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between py-4 px-6 border-b border-slate-200 bg-white">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-blue-600">ThaiOML Webapp</h1>
          <a href="http://localhost:8000" className="text-sm text-slate-500 hover:text-slate-800 transition">
            &larr; Back to Static Library
          </a>
        </div>
        <div>
          {isSignedIn ? (
            <div className="flex items-center gap-6">
              <Link href={hasCmsPermission ? "http://localhost:8000/admin/" : "/contribute"} className="text-sm font-medium text-slate-700 hover:text-blue-600">
                Contribute
              </Link>
              <Link href="/profile" className="text-sm font-medium text-slate-700 hover:text-blue-600">
                My Profile
              </Link>
              <UserButton />
            </div>
          ) : (
            <Link href="/sign-in" className="px-4 py-2 bg-blue-600 text-white rounded-full font-medium text-sm hover:bg-blue-700 transition">
              Sign In
            </Link>
          )}
        </div>
      </header>

      {/* Main Content (Consensus-style stub) */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 bg-slate-50">
        {isSignedIn ? (
          <div className="max-w-2xl w-full flex flex-col items-center text-center space-y-6">
            <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight">
              Ask the Library
            </h2>
            <p className="text-lg text-slate-600">
              Search for medical guidelines, clinical trials, or protocols using natural language.
            </p>
            
            <div className="w-full relative shadow-sm hover:shadow-md transition-shadow duration-200 rounded-full bg-white border border-slate-300">
              <input
                type="text"
                placeholder="E.g., What are the latest guidelines for treating hypertension?"
                className="w-full px-6 py-4 rounded-full outline-none text-slate-700 bg-transparent"
                disabled
              />
              <button disabled className="absolute right-2 top-2 bottom-2 px-6 bg-blue-600 text-white rounded-full font-bold hover:bg-blue-700 disabled:opacity-50 transition">
                Search
              </button>
            </div>
            
            <p className="text-sm text-slate-400 mt-4">
              AI Backend Integration is coming soon...
            </p>
          </div>
        ) : (
          <div className="text-center max-w-lg">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Welcome to ThaiOML AI Search</h2>
            <p className="text-slate-600 mb-8">
              Please sign in to access the advanced clinical search tools, edit your profile, or use the prompt interface.
            </p>
            <Link href="/sign-in" className="px-8 py-3 bg-blue-600 text-white rounded-full font-bold shadow hover:bg-blue-700 transition text-lg">
              Sign In to Continue
            </Link>
          </div>
        )}
      </main>
    </div>
  )
}
