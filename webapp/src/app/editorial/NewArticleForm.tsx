'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSnomedSuggestion } from '@/app/actions/medical';
import { Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { FormField, fieldStyles } from '@/components/ui/FormField';

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
        
        const slug = `${kebabTitle || `article-${data.id}`}.md`;
        
        // Use encodeURIComponent to safely pass the suggested SNOMED ID and Title as query params
        // So the new editor can pick them up to populate the frontmatter
        router.push(`/editorial/webapp/content/docs/editorial/${slug}?title=${encodeURIComponent(title)}&snomed_id=${data.id}`);
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
      <Button
        onClick={() => setIsOpen(true)}
        className="shadow-sm"
      >
        <Plus className="w-4 h-4" />
        New Article
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 bg-foreground/50 flex items-center justify-center z-50 p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="new-article-title" className="bg-background rounded-lg shadow-xl w-full max-w-md overflow-hidden border border-border">
        <div className="px-6 py-4 border-b border-border">
          <h2 id="new-article-title" className="text-xl font-bold text-foreground-strong">Create New Article</h2>
          <p className="text-sm text-foreground-muted mt-1">
            Enter a descriptive title. We will automatically resolve a SNOMED CT concept to strictly categorize it.
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6">
          <FormField label="Article Title" htmlFor="article-title" className="mb-6">
            <input
              id="article-title"
              type="text"
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={fieldStyles}
              placeholder="e.g. Myocardial Infarction"
              required
            />
          </FormField>
          
          <div className="flex justify-end gap-3">
            <Button
              onClick={() => setIsOpen(false)}
              disabled={isCreating}
              variant="ghost"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isCreating || !title.trim()}
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Resolving SNOMED...
                </>
              ) : (
                'Create & Edit'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
