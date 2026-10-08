import { currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Editor from '@/components/cms/Editor';
import { getMarkdownFile } from '@/app/actions/github';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

const HAS_CLERK = process.env.NEXT_PUBLIC_CLERK_ENABLED !== 'false';

export default async function EditorRoute({ 
  params,
  searchParams,
}: { 
  params: Promise<{ slug: string[] }>,
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  if (!HAS_CLERK) {
    redirect('/sign-in?redirect_url=/editorial');
  }

  let user = null;
  try {
    user = await currentUser();
  } catch {
    redirect('/sign-in?redirect_url=/editorial');
  }

  if (!user) {
    redirect('/sign-in?redirect_url=/editorial');
  }

  const roles = (user.publicMetadata?.roles as string[]) || [];
  const hasPermission = roles.includes('editor') || roles.includes('admin') || roles.includes('author');
  const isEditor = roles.includes('editor') || roles.includes('admin');

  if (!hasPermission) {
    redirect('/cms');
  }

  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  
  const filePath = resolvedParams.slug.join('/');
  
  let { content } = await getMarkdownFile(filePath);
  
  if (content === null) {
    // Generate boilerplate for new files
    const title = resolvedSearchParams.title || filePath.split('/').pop()?.replace('.md', '') || 'New Article';
    const snomedId = resolvedSearchParams.snomed_id || '';
    
    content = `---
title: "${title}"
snomed_id: "${snomedId}"
abstract: ""
review_status: pitch
assigned_editor: ""
assigned_reviewers: []
active_author: "${user.username || ''}"
---

# ${title}

Begin writing your article here...
`;
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
