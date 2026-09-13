'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Edit2, LayoutDashboard, Search, Filter } from 'lucide-react';

interface ArticleData {
  title?: string;
  review_status?: string;
  abstract?: string;
  assigned_editor?: string;
  assigned_reviewers?: string | string[];
  active_author?: string;
}

interface Article {
  path: string;
  data: ArticleData;
}

interface DashboardClientProps {
  articles: Article[];
  currentUser: string;
  isAdmin: boolean;
  isEditor: boolean;
  newArticleForm?: React.ReactNode;
}

export default function DashboardClient({ articles, currentUser, isAdmin, isEditor, newArticleForm }: DashboardClientProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');

  // 1. Filter by permissions / related to you
  const visibleArticles = articles.filter(article => {
    if (isAdmin) return true;
    const d = article.data;
    const isRelated = 
      d.active_author === currentUser || 
      d.assigned_editor === currentUser || 
      (Array.isArray(d.assigned_reviewers) ? d.assigned_reviewers.includes(currentUser) : d.assigned_reviewers === currentUser);
    
    if (isEditor && d.review_status === 'pitch') return true;
    
    return isRelated;
  });

  // 2. Filter by search and status
  const filteredArticles = visibleArticles.filter(article => {
    const matchesSearch = (article.data.title || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || article.data.review_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // 3. Group into My Active vs Archived/Others
  const myActiveArticles = filteredArticles.filter(a => {
    const d = a.data;
    return d.active_author === currentUser || 
           d.assigned_editor === currentUser || 
           (Array.isArray(d.assigned_reviewers) ? d.assigned_reviewers.includes(currentUser) : d.assigned_reviewers === currentUser);
  });
  
  const archivedArticles = filteredArticles.filter(a => !myActiveArticles.includes(a));

  const renderCard = (article: Article) => (
    <div key={article.path} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col gap-3">
      <div>
        <div className="flex justify-between items-start mb-2">
          <h4 className="font-semibold text-slate-900">{article.data.title || 'Untitled'}</h4>
          <span className="text-xs px-2 py-1 bg-slate-100 text-slate-600 rounded-full font-medium whitespace-nowrap ml-2">
            Status: {article.data.review_status || 'unknown'}
          </span>
        </div>
        <div className="flex items-center gap-2 mb-2">
           <span className={`text-xs px-2 py-1 rounded font-medium ${article.data.active_author === currentUser ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
             Author: @{article.data.active_author || 'none'}
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
    <>
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-6">
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <LayoutDashboard className="w-5 h-5 text-slate-700" />
              ThaiOML Studio
            </h1>
            <p className="text-sm text-slate-500">Editorial Dashboard</p>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-3 flex-1 md:justify-center md:max-w-2xl w-full">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search articles..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="relative w-full sm:w-48 flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full pl-2 pr-4 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="all">All Statuses</option>
              <option value="pitch">Pitch</option>
              <option value="accepted">Accepted</option>
              <option value="drafting">Drafting</option>
              <option value="in_review">In Review</option>
              <option value="approved">Approved</option>
              <option value="published">Published</option>
            </select>
          </div>
        </div>

        <div className="flex-shrink-0">
          {newArticleForm}
        </div>
      </header>

      <main className="flex-1 p-8 w-full max-w-7xl mx-auto flex flex-col gap-6">

      <div className="border-b border-slate-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('active')}
            className={`
              whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
              ${activeTab === 'active' 
                ? 'border-blue-500 text-blue-600' 
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}
            `}
          >
            My Active Articles
            <span className={`ml-3 py-0.5 px-2.5 rounded-full text-xs font-medium ${activeTab === 'active' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-900'}`}>
              {myActiveArticles.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('archived')}
            className={`
              whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
              ${activeTab === 'archived' 
                ? 'border-blue-500 text-blue-600' 
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}
            `}
          >
            Archived & Others
            <span className={`ml-3 py-0.5 px-2.5 rounded-full text-xs font-medium ${activeTab === 'archived' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-900'}`}>
              {archivedArticles.length}
            </span>
          </button>
        </nav>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {activeTab === 'active' && (
          <>
            {myActiveArticles.length === 0 && <p className="text-sm text-slate-500 italic col-span-full">No active articles found.</p>}
            {myActiveArticles.map(renderCard)}
          </>
        )}
        {activeTab === 'archived' && (
          <>
            {archivedArticles.length === 0 && <p className="text-sm text-slate-500 italic col-span-full">No archived articles found.</p>}
            {archivedArticles.map(renderCard)}
          </>
        )}
      </div>
      </main>
    </>
  );
}
