import { currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { listMarkdownFiles } from '@/app/actions/github';
import NewArticleForm from './NewArticleForm';
import Link from 'next/link';
import { FileText, Edit2 } from 'lucide-react';

export default async function EditorialPage() {
  const user = await currentUser();

  if (!user) {
    redirect('/sign-in?redirect_url=/editorial');
  }

  const roles = (user.publicMetadata?.roles as string[]) || [];
  const hasPermission = roles.includes('editor') || roles.includes('admin');

  if (!hasPermission) {
    redirect('/cms');
  }

  const { files } = await listMarkdownFiles('docs/docs/articles');

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-900">ThaiOML Studio</h1>
          <p className="text-sm text-slate-500">Article Explorer</p>
        </div>
        <NewArticleForm />
      </header>
      
      <main className="flex-1 p-8 max-w-6xl w-full mx-auto">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-800">Articles Directory</h2>
          <p className="text-slate-500 mt-1">Manage and edit markdown articles across the monorepo.</p>
        </div>

        {files.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900">No articles found</h3>
            <p className="text-slate-500 mt-1">Create a new article to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {files.map((file: { sha: string, name: string, path: string }) => (
              <div key={file.sha} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition p-5 flex flex-col h-full group">
                <div className="flex items-start gap-3 mb-4 flex-1">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 line-clamp-2" title={file.name}>
                      {file.name}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 break-all">
                      {file.path}
                    </p>
                  </div>
                </div>
                
                <div className="pt-4 border-t border-slate-100 flex justify-end">
                  <Link 
                    href={`/editorial/${file.path}`}
                    className="flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-800 transition px-3 py-1.5 bg-blue-50 hover:bg-blue-100 rounded-md"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit Article
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
