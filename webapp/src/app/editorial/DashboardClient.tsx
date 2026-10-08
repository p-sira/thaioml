'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Edit2, LayoutDashboard, Search, Filter } from 'lucide-react';
import { ARTICLE_STATUSES, isArticleAssignedTo, type EditorialArticle } from '@/lib/editorial';
import { fieldStyles } from '@/components/ui/FormField';
import { classNames } from '@/lib/classNames';

interface DashboardClientProps {
  articles: EditorialArticle[];
  currentUser: string;
  isAdmin: boolean;
  isEditor: boolean;
  newArticleForm?: React.ReactNode;
}

function ArticleCard({ article, currentUser }: { article: EditorialArticle; currentUser: string }) {
  const { data } = article;

  return (
    <article className="bg-background rounded-xl border border-border shadow-sm p-4 flex flex-col gap-3">
      <div>
        <div className="flex justify-between items-start mb-2">
          <h2 className="font-semibold text-foreground-strong">{data.title || 'Untitled'}</h2>
          <span className="text-xs px-2 py-1 bg-surface text-foreground-muted rounded-full font-medium whitespace-nowrap ml-2">
            Status: {data.review_status || 'unknown'}
          </span>
        </div>
        <div className="flex items-center gap-2 mb-2">
          <span className={classNames(
            'text-xs px-2 py-1 rounded font-medium',
            data.active_author === currentUser ? 'bg-green-100 text-green-700' : 'bg-surface text-foreground-muted',
          )}>
            Author: @{data.active_author || 'none'}
          </span>
        </div>
        <p className="text-xs text-foreground-muted mt-1 truncate">{article.path.split('/').pop()}</p>
      </div>

      {data.abstract && (
        <p className="text-sm text-foreground-muted line-clamp-3 bg-surface p-2 rounded border border-border">
          {data.abstract}
        </p>
      )}

      <div className="text-xs text-foreground-muted flex flex-col gap-1">
        {data.assigned_editor && <div><span className="font-medium text-foreground">Editor:</span> {data.assigned_editor}</div>}
        {data.assigned_reviewers && data.assigned_reviewers.length > 0 && (
          <div><span className="font-medium text-foreground">Reviewers:</span> {
            Array.isArray(data.assigned_reviewers) ? data.assigned_reviewers.join(', ') : data.assigned_reviewers
          }</div>
        )}
      </div>

      <div className="mt-auto pt-3 border-t border-border">
        <Link
          href={`/editorial/${article.path}`}
          className="flex items-center justify-center gap-2 text-sm font-medium text-accent hover:opacity-80 bg-surface py-2 rounded-md transition w-full"
        >
          <Edit2 className="w-4 h-4" />
          View / Edit
        </Link>
      </div>
    </article>
  );
}

export default function DashboardClient({ articles, currentUser, isAdmin, isEditor, newArticleForm }: DashboardClientProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');

  // 1. Filter by permissions / related to you
  const visibleArticles = articles.filter(article => {
    if (isAdmin) return true;
    const isRelated = isArticleAssignedTo(article, currentUser);

    if (isEditor && article.data.review_status === 'pitch') return true;

    return isRelated;
  });

  // 2. Filter by search and status
  const filteredArticles = visibleArticles.filter(article => {
    const matchesSearch = (article.data.title || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || article.data.review_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // 3. Group into My Active vs Archived/Others
  const myActiveArticles = filteredArticles.filter(article => isArticleAssignedTo(article, currentUser));
  const archivedArticles = filteredArticles.filter(article => !isArticleAssignedTo(article, currentUser));

  return (
    <>
      <header className="bg-background border-b border-border px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-6">
          <div>
            <h1 className="text-xl font-bold text-foreground-strong flex items-center gap-2">
              <LayoutDashboard className="w-5 h-5 text-foreground" />
              ThaiOML Studio
            </h1>
            <p className="text-sm text-foreground-muted">Editorial Dashboard</p>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-3 flex-1 md:justify-center md:max-w-2xl w-full">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted" />
            <input 
              type="text" 
              placeholder="Search articles..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`${fieldStyles} pl-9`}
            />
          </div>
          <div className="relative w-full sm:w-48 flex items-center gap-2">
            <Filter className="w-4 h-4 text-foreground-muted" />
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={fieldStyles}
            >
              <option value="all">All Statuses</option>
              {ARTICLE_STATUSES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
        </div>

        <div className="flex-shrink-0">
          {newArticleForm}
        </div>
      </header>

      <main className="flex-1 p-8 w-full max-w-7xl mx-auto flex flex-col gap-6">

      <div className="border-b border-border">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('active')}
            className={`
              whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
              ${activeTab === 'active' 
                ? 'border-accent text-accent' 
                : 'border-transparent text-foreground-muted hover:text-foreground hover:border-border'}
            `}
          >
            My Active Articles
            <span className={`ml-3 py-0.5 px-2.5 rounded-full text-xs font-medium ${activeTab === 'active' ? 'bg-surface text-accent' : 'bg-surface text-foreground-strong'}`}>
              {myActiveArticles.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('archived')}
            className={`
              whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
              ${activeTab === 'archived' 
                ? 'border-accent text-accent' 
                : 'border-transparent text-foreground-muted hover:text-foreground hover:border-border'}
            `}
          >
            Archived &amp; Others
            <span className={`ml-3 py-0.5 px-2.5 rounded-full text-xs font-medium ${activeTab === 'archived' ? 'bg-surface text-accent' : 'bg-surface text-foreground-strong'}`}>
              {archivedArticles.length}
            </span>
          </button>
        </nav>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {activeTab === 'active' && (
          <>
            {myActiveArticles.length === 0 && <p className="text-sm text-foreground-muted italic col-span-full">No active articles found.</p>}
            {myActiveArticles.map(article => <ArticleCard key={article.path} article={article} currentUser={currentUser} />)}
          </>
        )}
        {activeTab === 'archived' && (
          <>
            {archivedArticles.length === 0 && <p className="text-sm text-foreground-muted italic col-span-full">No archived articles found.</p>}
            {archivedArticles.map(article => <ArticleCard key={article.path} article={article} currentUser={currentUser} />)}
          </>
        )}
      </div>
      </main>
    </>
  );
}
