'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from 'tiptap-markdown';
import { useRouter } from 'next/navigation';

import { useState } from 'react';
import matter from 'gray-matter';
import { saveMarkdownFile, moveMarkdownFile } from '@/app/actions/github';
import { autoLinkContent, getSnomedSuggestion } from '@/app/actions/medical';
import { SlashCommand, getSuggestionOptions } from './extensions/SlashCommand';
import { CommentMark } from './extensions/CommentMark';
import { Info, Sparkles, Loader2, MessageSquare } from 'lucide-react';

interface EditorProps {
  initialContent: string;
  filePath: string;
}

export default function Editor({ initialContent, filePath }: EditorProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);

  // Parse initial content once lazily
  const [initialBody] = useState(() => {
    try {
      return matter(initialContent).content || '';
    } catch {
      console.warn("gray-matter parse error, falling back to raw content");
      return initialContent;
    }
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [frontmatter, setFrontmatter] = useState<Record<string, any>>(() => {
    try {
      return matter(initialContent).data || {};
    } catch {
      return {};
    }
  });

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        link: {
          openOnClick: false,
          protocols: ['snomed'],
        }
      }),
      Markdown,
      SlashCommand.configure({
        suggestion: getSuggestionOptions(),
      }),
      CommentMark,
    ],
    content: initialBody,
    editorProps: {
      attributes: {
        class: 'prose prose-slate max-w-none focus:outline-none min-h-[500px]',
      },
    },
    immediatelyRender: false,
  }, [initialBody]); // re-init when initialBody is ready

  if (!editor) {
    return null;
  }

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // @ts-expect-error tiptap-markdown extends storage dynamically
      const markdown = editor.storage.markdown.getMarkdown();
      
      // Parse comma-separated reviewers into array if it's a string
      const dataToSave = { ...frontmatter };
      if (typeof dataToSave.assigned_reviewers === 'string') {
        dataToSave.assigned_reviewers = dataToSave.assigned_reviewers
          .split(',')
          .map((s: string) => s.trim())
          .filter(Boolean);
      }
      
      const fileContent = matter.stringify(markdown, dataToSave);
      
      if (dataToSave.review_status === 'published' && filePath.includes('/editorial/')) {
        const newPath = filePath.replace('/editorial/', '/articles/');
        await moveMarkdownFile(filePath, newPath, fileContent, `Publish ${filePath} to articles`);
        alert('Published successfully! The article has been moved to the articles directory.');
        // Navigate to the new path
        router.push(`/editorial/${newPath}`);
      } else {
        await saveMarkdownFile(filePath, fileContent, `Update ${filePath} via ThaiOML Studio`);
        alert('Saved successfully!');
      }
    } catch {
      alert('Error saving document');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAutoLink = async () => {
    setIsLinking(true);
    try {
      // @ts-expect-error tiptap-markdown extends storage dynamically
      const markdown = editor.storage.markdown.getMarkdown();
      const result = await autoLinkContent(markdown);

      // Assume backend returns the linked markdown in `result.body` or just `result` if string
      const linkedMarkdown = typeof result === 'string' ? result : (result.body || markdown);

      editor.commands.setContent(linkedMarkdown);
    } catch {
      alert('Error running Auto Link. Ensure RAG backend is running.');
    } finally {
      setIsLinking(false);
    }
  };

  const handleFrontmatterChange = (key: string, value: string) => {
    setFrontmatter(prev => ({ ...prev, [key]: value }));
  };

  const handleAutoSuggestSnomed = async () => {
    if (!frontmatter.title) {
      alert("Please enter a title first to auto-suggest a SNOMED Concept ID.");
      return;
    }
    setIsSuggesting(true);
    try {
      // We can use the same getSnomedSuggestion endpoint used by the slash command
      const data = await getSnomedSuggestion(frontmatter.title as string);
      if (data && data.id) {
        handleFrontmatterChange('snomed_id', data.id);
      } else {
        alert("No specific SNOMED concept could be confidently matched for this title.");
      }
    } catch {
      alert("Failed to auto-suggest SNOMED ID. Make sure the RAG backend is running.");
    } finally {
      setIsSuggesting(false);
    }
  };

  return (
    <div className="flex h-full min-h-[700px] border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm">
      {/* Main Editor Column */}
      <div className="flex-1 flex flex-col border-r border-slate-200">
        {/* Toolbar */}
        <div className="bg-slate-50 border-b border-slate-200 p-2 flex items-center justify-between sticky top-0 z-10">
          <div className="flex space-x-2">
            <button
              onClick={() => editor.chain().focus().toggleBold().run()}
              className={`px-3 py-1.5 rounded text-sm font-medium ${editor.isActive('bold') ? 'bg-slate-200 text-slate-900' : 'text-slate-600 hover:bg-slate-200 hover:text-slate-900'}`}
            >
              B
            </button>
            <button
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className={`px-3 py-1.5 rounded text-sm italic font-medium ${editor.isActive('italic') ? 'bg-slate-200 text-slate-900' : 'text-slate-600 hover:bg-slate-200 hover:text-slate-900'}`}
            >
              I
            </button>
            <button
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              className={`px-3 py-1.5 rounded text-sm font-bold ${editor.isActive('heading', { level: 2 }) ? 'bg-slate-200 text-slate-900' : 'text-slate-600 hover:bg-slate-200 hover:text-slate-900'}`}
            >
              H2
            </button>
            <button
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
              className={`px-3 py-1.5 rounded text-sm font-bold ${editor.isActive('heading', { level: 3 }) ? 'bg-slate-200 text-slate-900' : 'text-slate-600 hover:bg-slate-200 hover:text-slate-900'}`}
            >
              H3
            </button>
            <button
              onClick={() => {
                const previousComment = editor.getAttributes('comment').comment;
                if (previousComment) {
                  editor.chain().focus().unsetComment().run();
                  return;
                }
                const text = window.prompt('Enter comment:');
                if (text) {
                  editor.chain().focus().setComment(text).run();
                }
              }}
              className={`px-3 py-1.5 rounded text-sm flex items-center justify-center font-medium ${editor.isActive('comment') ? 'bg-yellow-200 text-yellow-900' : 'text-slate-600 hover:bg-slate-200 hover:text-slate-900'}`}
              title="Add Comment"
            >
              <MessageSquare className="w-4 h-4" />
            </button>

            <div className="w-px bg-slate-300 mx-1"></div>

            <div className="flex items-center space-x-1 group relative">
              <button
                onClick={handleAutoLink}
                disabled={isLinking}
                className="px-3 py-1.5 rounded text-sm font-medium bg-purple-100 text-purple-700 hover:bg-purple-200 disabled:opacity-50 transition flex items-center"
              >
                {isLinking ? 'Linking...' : 'Auto Link'}
              </button>
              <div title="Sends content to the RAG backend to automatically link medical terms to their SNOMED CT concepts" className="text-slate-400 hover:text-slate-600 cursor-help">
                <Info size={16} />
              </div>
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-blue-600 text-white px-4 py-1.5 text-sm rounded-md font-medium hover:bg-blue-700 disabled:opacity-50 transition"
          >
            {isSaving ? 'Saving...' : 'Save to GitHub'}
          </button>
        </div>

        {/* Editor Content */}
        <div className="p-6 bg-white overflow-y-auto flex-1">
          <EditorContent editor={editor} />
        </div>
      </div>

      {/* Frontmatter Sidebar */}
      <div className="w-80 bg-slate-50 flex flex-col">
        <div className="p-4 border-b border-slate-200 font-semibold text-slate-800">
          Article Metadata
        </div>
        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
            <input
              type="text"
              value={frontmatter.title || ''}
              onChange={(e) => handleFrontmatterChange('title', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Article title"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">SNOMED Concept ID</label>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={frontmatter.snomed_id || ''}
                onChange={(e) => handleFrontmatterChange('snomed_id', e.target.value)}
                className="flex-1 px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="e.g. 123456789"
              />
              <button 
                onClick={handleAutoSuggestSnomed} 
                disabled={isSuggesting}
                title="Auto-suggest SNOMED ID based on Title" 
                className="p-2 bg-slate-200 text-slate-600 rounded-md hover:bg-slate-300 transition disabled:opacity-50"
              >
                {isSuggesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-1">Click the ✨ to auto-suggest based on the article title.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Abstract / Pitch Summary</label>
            <textarea
              value={frontmatter.abstract || ''}
              onChange={(e) => handleFrontmatterChange('abstract', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white"
              placeholder="Short list of content..."
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Assigned Editor</label>
            <input
              type="text"
              value={frontmatter.assigned_editor || ''}
              onChange={(e) => handleFrontmatterChange('assigned_editor', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white"
              placeholder="GitHub username"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Assigned Reviewers (comma-separated)</label>
            <input
              type="text"
              value={Array.isArray(frontmatter.assigned_reviewers) ? frontmatter.assigned_reviewers.join(', ') : (frontmatter.assigned_reviewers || '')}
              onChange={(e) => handleFrontmatterChange('assigned_reviewers', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white"
              placeholder="reviewer1, reviewer2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Review Status</label>
            <select
              value={frontmatter.review_status || 'pitch'}
              onChange={(e) => handleFrontmatterChange('review_status', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white"
            >
              <option value="pitch">Pitch</option>
              <option value="accepted">Accepted</option>
              <option value="drafting">Drafting</option>
              <option value="in_review">In Review</option>
              <option value="approved">Approved</option>
              <option value="published">Published</option>
            </select>
          </div>

          <hr className="border-slate-200 my-4" />

          <div className="text-xs text-slate-500">
            <p className="mb-2 font-semibold">TipTap Shortcuts:</p>
            <ul className="list-disc pl-4 space-y-1">
              <li>Type <code className="bg-slate-200 px-1 rounded">/term</code> to search medical terms.</li>
              <li>Use the <b>Auto Link</b> button to process the whole article.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
