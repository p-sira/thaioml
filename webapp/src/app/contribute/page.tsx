import { currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function ContributePage() {
  const user = await currentUser()

  if (!user) {
    redirect('/sign-in?redirect_url=/contribute')
  }

  const roles = (user.publicMetadata?.roles as string[]) || []
  const hasPermission = roles.includes('editor') || roles.includes('admin')

  if (hasPermission) {
    redirect('/admin/')
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 bg-slate-50">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Access Restricted</h2>
          <p className="text-slate-600 mb-6">
            You don't have permission to access the Content Management System (CMS). To become an editor and help expand ThaiOML, please request permission.
          </p>
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-8 inline-block w-full">
            <p className="text-sm text-slate-500 mb-1">Send an email to:</p>
            <a href="mailto:code@psira.me" className="text-blue-600 font-bold hover:underline text-lg">code@psira.me</a>
          </div>
          <Link href="/" className="px-6 py-3 bg-blue-600 text-white rounded-full font-bold shadow hover:bg-blue-700 transition">
            Return Home
          </Link>
        </div>
      </main>
    </div>
  )
}
