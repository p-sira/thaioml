import { listMarkdownFiles, getMarkdownFile } from '@/app/actions/github';
import matter from 'gray-matter';
import DashboardClient from './DashboardClient';
import NewArticleForm from './NewArticleForm';
import { requireEditorialUser } from '@/lib/auth';
import type { EditorialArticle } from '@/lib/editorial';

// Helper to fetch file content and parse frontmatter
async function getFileWithFrontmatter(filePath: string) {
  const { content } = await getMarkdownFile(filePath);
  if (!content) return null;
  const { data } = matter(content);
  return { path: filePath, data };
}

export default async function EditorialDashboardPage() {
  const { user, isAdmin, isEditor } = await requireEditorialUser();

  const { files } = await listMarkdownFiles('webapp/content/docs/editorial');
  
  // Fetch all contents in parallel to read frontmatter
  const articlesData = await Promise.all(
    files.map((file) => getFileWithFrontmatter(file.path))
  );

  // Filter out nulls
  const validArticles = articlesData.filter((article): article is EditorialArticle => article !== null);
  
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <DashboardClient 
        articles={validArticles} 
        currentUser={user.username || ''} 
        isAdmin={isAdmin}
        isEditor={isEditor}
        newArticleForm={<NewArticleForm />}
      />
    </div>
  );
}
