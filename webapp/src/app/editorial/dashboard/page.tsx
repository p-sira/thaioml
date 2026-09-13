import { currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { listMarkdownFiles, getMarkdownFile } from '@/app/actions/github';
import Link from 'next/link';
import { Edit2, LayoutDashboard } from 'lucide-react';
import matter from 'gray-matter';

// Helper to fetch file content and parse frontmatter
async function getFileWithFrontmatter(filePath: string) {
  const { content } = await getMarkdownFile(filePath);
  if (!content) return null;
  const { data } = matter(content);
  return { path: filePath, data };
}

export default async function DashboardPage() {
  const user = await currentUser();

  if (!user) {
    redirect('/sign-in?redirect_url=/editorial/dashboard');
  }

  const roles = (user.publicMetadata?.roles as string[]) || [];
  const hasPermission = roles.includes('editor') || roles.includes('admin');

  if (!hasPermission) {
    redirect('/cms');
  }

  const { files } = await listMarkdownFiles('webapp/content/docs/editorial');
  
  // Fetch all contents in parallel to read frontmatter
  const articlesData = await Promise.all(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    files.map((file: any) => getFileWithFrontmatter(file.path))
  );

  // Filter out nulls and categorize
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const validArticles = articlesData.filter(Boolean) as { path: string, data: any }[];
  
  const pitches = validArticles.filter(a => ['pitch'].includes(a.data.review_status));
  const accepted = validArticles.filter(a => ['accepted', 'drafting'].includes(a.data.review_status));
  const inReview = validArticles.filter(a => ['in_review', 'approved'].includes(a.data.review_status));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderCard = (article: { path: string, data: any }) => (
    <div key={article.path} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col gap-3">
      <div>
        <div className="flex justify-between items-start">
          <h4 className="font-semibold text-slate-900">{article.data.title || 'Untitled'}</h4>
          <span className="text-xs px-2 py-1 bg-slate-100 text-slate-600 rounded-full font-medium">
            {article.data.review_status || 'unknown'}
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-1 truncate">{article.path.split('/').pop()}</p>
      </div>
      
      {article.data.abstract && (
        <p className="text-sm text-slate-600 line-clamp-3 bg-slate-50 p-2 rounded border border-slate-100">
          {article.data.abstract}
        </p>
      )}

      <div className="text-xs text-slate-500 flex flex-col gap-1">
        {article.data.assigned_editor && (
          <div><span className="font-medium text-slate-700">Editor:</span> {article.data.assigned_editor}</div>
        )}
        {article.data.assigned_reviewers && article.data.assigned_reviewers.length > 0 && (
          <div><span className="font-medium text-slate-700">Reviewers:</span> {
            Array.isArray(article.data.assigned_reviewers) 
              ? article.data.assigned_reviewers.join(', ') 
              : article.data.assigned_reviewers
          }</div>
        )}
      </div>

      <div className="mt-auto pt-3 border-t border-slate-100">
        <Link 
          href={`/editorial/${article.path}`}
          className="flex items-center justify-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 py-2 rounded-md transition w-full"
        >
          <Edit2 className="w-4 h-4" />
          View / Edit
        </Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-6">
          <div>
            <h1 className="text-xl font-bold text-slate-900">ThaiOML Studio</h1>
            <p className="text-sm text-slate-500">Editorial Dashboard</p>
          </div>
          <nav className="flex space-x-1 border-l border-slate-200 pl-6">
            <Link 
              href="/editorial" 
              className="px-3 py-2 text-sm font-medium rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            >
              Articles
            </Link>
            <Link 
              href="/editorial/dashboard" 
              className="px-3 py-2 text-sm font-medium rounded-md bg-slate-100 text-slate-900"
            >
              Dashboard
            </Link>
          </nav>
        </div>
      </header>
      
      <main className="flex-1 p-8 w-full max-w-7xl mx-auto">
        <div className="mb-6 flex items-center gap-3">
          <LayoutDashboard className="w-6 h-6 text-slate-700" />
          <h2 className="text-2xl font-bold text-slate-800">Editorial Workflow</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Column 1: Pitches */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between border-b-2 border-blue-500 pb-2">
              <h3 className="font-bold text-slate-800">New Pitches</h3>
              <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">{pitches.length}</span>
            </div>
            <div className="flex flex-col gap-4">
              {pitches.length === 0 && <p className="text-sm text-slate-500 italic">No new pitches.</p>}
              {pitches.map(renderCard)}
            </div>
          </div>

          {/* Column 2: Accepted & Drafting */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between border-b-2 border-amber-500 pb-2">
              <h3 className="font-bold text-slate-800">Drafting</h3>
              <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full">{accepted.length}</span>
            </div>
            <div className="flex flex-col gap-4">
              {accepted.length === 0 && <p className="text-sm text-slate-500 italic">No articles in drafting.</p>}
              {accepted.map(renderCard)}
            </div>
          </div>

          {/* Column 3: In Review & Approved */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between border-b-2 border-green-500 pb-2">
              <h3 className="font-bold text-slate-800">Review & Approval</h3>
              <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full">{inReview.length}</span>
            </div>
            <div className="flex flex-col gap-4">
              {inReview.length === 0 && <p className="text-sm text-slate-500 italic">No articles in review.</p>}
              {inReview.map(renderCard)}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
