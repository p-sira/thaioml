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
}

export default function DashboardClient({ articles, currentUser, isAdmin, isEditor }: DashboardClientProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

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
  const myActiveArticles = filteredArticles.filter(a => a.data.active_author === currentUser);
  const archivedArticles = filteredArticles.filter(a => a.data.active_author !== currentUser);

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
    <div className="flex flex-col gap-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <LayoutDashboard className="w-6 h-6 text-slate-700" />
          <h2 className="text-2xl font-bold text-slate-800">Editorial Workflow</h2>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-3">
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
              className="w-full pl-2 pr-4 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Column 1: My Active Articles */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between border-b-2 border-green-500 pb-2">
            <h3 className="font-bold text-slate-800">My Active Articles</h3>
            <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full">{myActiveArticles.length}</span>
          </div>
          <div className="flex flex-col gap-4">
            {myActiveArticles.length === 0 && <p className="text-sm text-slate-500 italic">No active articles found.</p>}
            {myActiveArticles.map(renderCard)}
          </div>
        </div>

        {/* Column 2: Archived & Others */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between border-b-2 border-slate-400 pb-2">
            <h3 className="font-bold text-slate-800">Archived & Other Authors</h3>
            <span className="bg-slate-200 text-slate-700 text-xs font-bold px-2 py-0.5 rounded-full">{archivedArticles.length}</span>
          </div>
          <div className="flex flex-col gap-4">
            {archivedArticles.length === 0 && <p className="text-sm text-slate-500 italic">No archived articles found.</p>}
            {archivedArticles.map(renderCard)}
          </div>
        </div>
      </div>
    </div>
  );
}
