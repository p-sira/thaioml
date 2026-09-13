import { currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { listMarkdownFiles, getMarkdownFile } from '@/app/actions/github';
import matter from 'gray-matter';
import DashboardClient from './DashboardClient';
import NewArticleForm from './NewArticleForm';

// Helper to fetch file content and parse frontmatter
async function getFileWithFrontmatter(filePath: string) {
  const { content } = await getMarkdownFile(filePath);
  if (!content) return null;
  const { data } = matter(content);
  return { path: filePath, data };
}

export default async function EditorialDashboardPage() {
  const user = await currentUser();

  if (!user) {
    redirect('/sign-in?redirect_url=/editorial');
  }

  const roles = (user.publicMetadata?.roles as string[]) || [];
  const hasPermission = roles.includes('editor') || roles.includes('admin') || roles.includes('author');
  const isAdmin = roles.includes('admin');
  const isEditor = roles.includes('editor') || isAdmin;

  if (!hasPermission) {
    redirect('/cms');
  }

  const { files } = await listMarkdownFiles('webapp/content/docs/editorial');
  
  // Fetch all contents in parallel to read frontmatter
  const articlesData = await Promise.all(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    files.map((file: any) => getFileWithFrontmatter(file.path))
  );

  // Filter out nulls
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const validArticles = articlesData.filter(Boolean) as { path: string, data: any }[];
  
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-6">
          <div>
            <h1 className="text-xl font-bold text-slate-900">ThaiOML Studio</h1>
            <p className="text-sm text-slate-500">Editorial Dashboard</p>
          </div>
        </div>
        <NewArticleForm />
      </header>
      
      <main className="flex-1 p-8 w-full max-w-7xl mx-auto">
        <DashboardClient 
          articles={validArticles} 
          currentUser={user.username || ''} 
          isAdmin={isAdmin}
          isEditor={isEditor}
        />
      </main>
    </div>
  );
}
