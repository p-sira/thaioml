import { currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Editor from '@/components/cms/Editor';
import { getMarkdownFile } from '@/app/actions/github';

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

  // For Phase 1, we will edit a test file to demonstrate the editor
  const filePath = 'docs/docs/test-article.md';
  const { content } = await getMarkdownFile(filePath);
  
  const initialContent = content || `# Test Article
  
Welcome to ThaiOML Studio. This is a test article for the new Next.js native editor.
`;

  return (
    <div className="min-h-screen flex flex-col bg-slate-100">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">ThaiOML Studio</h1>
          <p className="text-sm text-slate-500">Editing: {filePath}</p>
        </div>
      </header>
      
      <main className="flex-1 p-6 max-w-5xl w-full mx-auto">
        <Editor initialContent={initialContent} filePath={filePath} />
      </main>
    </div>
  );
}
