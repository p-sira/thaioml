'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from 'tiptap-markdown';
import { useState } from 'react';
import { saveMarkdownFile } from '@/app/actions/github';

interface EditorProps {
  initialContent: string;
  filePath: string;
}

export default function Editor({ initialContent, filePath }: EditorProps) {
  const [isSaving, setIsSaving] = useState(false);
  
  const editor = useEditor({
    extensions: [
      StarterKit,
      Markdown,
    ],
    content: initialContent,
    editorProps: {
      attributes: {
        class: 'prose prose-slate max-w-none focus:outline-none min-h-[500px]',
      },
    },
  });

  if (!editor) {
    return null;
  }

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const markdown = editor.storage.markdown.getMarkdown();
      await saveMarkdownFile(filePath, markdown, `Update ${filePath} via ThaiOML Studio`);
      alert('Saved successfully!');
    } catch (error) {
      console.error(error);
      alert('Error saving document');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm flex flex-col">
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
      <div className="p-6 bg-white overflow-y-auto">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
