'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSnomedSuggestion } from '@/app/actions/medical';
import { Loader2, Plus } from 'lucide-react';

export default function NewArticleForm() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    
    setIsCreating(true);
    try {
      const data = await getSnomedSuggestion(title);
      if (data && data.id) {
        // Generate kebab-case slug
        const kebabTitle = title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)+/g, '');
        
        const slug = `${kebabTitle}.md`;
        
        // Use encodeURIComponent to safely pass the suggested SNOMED ID and Title as query params
        // So the new editor can pick them up to populate the frontmatter
        router.push(`/editorial/webapp/content/docs/articles/${slug}?title=${encodeURIComponent(title)}&snomed_id=${data.id}`);
      } else {
        alert("Failed to find a confident SNOMED CT concept for this title. Article creation is blocked to maintain strictness.");
      }
    } catch (error) {
      console.error(error);
      alert("Error resolving SNOMED ID. Make sure the RAG backend is running.");
    } finally {
      setIsCreating(false);
    }
  };

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition shadow-sm font-medium"
      >
        <Plus className="w-4 h-4" />
        New Article
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-xl font-bold text-slate-800">Create New Article</h2>
          <p className="text-sm text-slate-500 mt-1">
            Enter a descriptive title. We will automatically resolve a SNOMED CT concept to strictly categorize it.
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">Article Title</label>
            <input
              type="text"
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g. Myocardial Infarction"
              required
            />
          </div>
          
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              disabled={isCreating}
              className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-md transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreating || !title.trim()}
              className="px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-2"
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Resolving SNOMED...
                </>
              ) : (
                'Create & Edit'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
