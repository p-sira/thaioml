import Editor from '@/components/cms/Editor';
import { getMarkdownFile } from '@/app/actions/github';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { requireEditorialUser } from '@/lib/auth';
import matter from 'gray-matter';

export default async function EditorRoute({ 
  params,
  searchParams,
}: { 
  params: Promise<{ slug: string[] }>,
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { user, isEditor } = await requireEditorialUser();

  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  
  const filePath = resolvedParams.slug.join('/');
  
  let { content } = await getMarkdownFile(filePath);
  
  if (content === null) {
    // Generate boilerplate for new files
    const requestedTitle = resolvedSearchParams.title;
    const requestedSnomedId = resolvedSearchParams.snomed_id;
    const title = (Array.isArray(requestedTitle) ? requestedTitle[0] : requestedTitle)
      || filePath.split('/').pop()?.replace('.md', '')
      || 'New Article';
    const snomedId = (Array.isArray(requestedSnomedId) ? requestedSnomedId[0] : requestedSnomedId) || '';

    content = matter.stringify(`# ${title}\n\nBegin writing your article here...\n`, {
      title,
      snomed_id: snomedId,
      abstract: '',
      review_status: 'pitch',
      assigned_editor: '',
      assigned_reviewers: [],
      active_author: user.username || '',
    });
  }

  const currentAuthor = {
    id: user.id,
    username: user.username || user.firstName?.toLowerCase() || 'anonymous',
    name: user.firstName
      ? `${user.firstName} ${user.lastName || ''}`.trim()
      : user.username || 'Anonymous User',
    avatar: user.imageUrl || '',
    role: isEditor ? 'editor' : 'author',
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="bg-background border-b border-border px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <Link href="/editorial" className="p-2 -ml-2 text-foreground-muted hover:text-foreground hover:bg-surface rounded-full transition">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-foreground-strong">ThaiOML Studio</h1>
            <p className="text-sm text-foreground-muted">Editing: {filePath}</p>
          </div>
        </div>
      </header>
      
      <main className="flex-1 p-6 max-w-7xl w-full mx-auto">
        <Editor initialContent={content} filePath={filePath} isEditor={isEditor} currentUser={currentAuthor} />
      </main>
    </div>
  );
}
