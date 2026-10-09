'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from 'tiptap-markdown';
import { useRouter } from 'next/navigation';
import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import matter from 'gray-matter';
import { saveMarkdownFile, moveMarkdownFile } from '@/app/actions/github';
import { autoLinkContent, getSnomedSuggestion } from '@/app/actions/medical';
import { SlashCommand, getSuggestionOptions } from './extensions/SlashCommand';
import { CommentMark } from './extensions/CommentMark';
import UserAutocomplete from './UserAutocomplete';
import CommentsSidebar from './comments/CommentsSidebar';
import LinkDialog from './LinkDialog';
import LinkHoverPopup from './LinkHoverPopup';
import { HighlightMark, HighlightColor } from './extensions/HighlightMark';
import { TextColorMark, TextColor } from './extensions/TextColorMark';
import {
  HighlightPickerDropdown,
  TextColorPickerDropdown,
} from './ColorPickerDropdown';
import {
  CommentThread,
  CurrentUserInfo,
  generateCommentId,
  generateReplyId,
} from '@/types/editorial';
import {
  Info,
  Loader2,
  Sparkles,
  MessageSquare,
  Bold,
  Italic,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Undo2,
  Redo2,
  Link as LinkIcon,
  Unlink,
  Minus,
  SlidersHorizontal,
  ChevronRight,
  ChevronLeft,
  MessageSquarePlus,
  Save,
  Check,
} from 'lucide-react';

interface EditorProps {
  initialContent: string;
  filePath: string;
  isEditor?: boolean;
  currentUser?: string | CurrentUserInfo;
  showActiveAuthorWarning?: boolean;
}

export default function Editor({
  initialContent,
  filePath,
  isEditor = false,
  currentUser = '',
  showActiveAuthorWarning = false,
}: EditorProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);

  // Normalize currentUser into CurrentUserInfo object
  const normalizedUser: CurrentUserInfo = useMemo(() => {
    if (typeof currentUser === 'object' && currentUser !== null) {
      return {
        id: currentUser.id || 'usr_anon',
        name: currentUser.name || currentUser.username || 'Anonymous',
        username: currentUser.username || 'anonymous',
        avatar: currentUser.avatar || '',
        role: currentUser.role || (isEditor ? 'editor' : 'author'),
      };
    }
    const username = (currentUser as string) || 'anonymous';
    return {
      id: username,
      name: username,
      username: username,
      avatar: '',
      role: isEditor ? 'editor' : 'author',
    };
  }, [currentUser, isEditor]);

  // Parse initial content once lazily
  const [initialBody] = useState(() => {
    try {
      return matter(initialContent).content || '';
    } catch {
      console.warn('gray-matter parse error, falling back to raw content');
      return initialContent;
    }
  });

  // Frontmatter state
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [frontmatter, setFrontmatter] = useState<Record<string, any>>(() => {
    try {
      const data = matter(initialContent).data || {};
      return data;
    } catch {
      return {};
    }
  });

  // Comments state initialized from frontmatter
  const [comments, setComments] = useState<CommentThread[]>(() => {
    try {
      const data = matter(initialContent).data || {};
      if (Array.isArray(data.comments)) {
        return data.comments as CommentThread[];
      }
      return [];
    } catch {
      return [];
    }
  });

  // Active / Selected comment in sidebar
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);

  // Pending new comment on selection
  const [pendingComment, setPendingComment] = useState<{
    highlightedText: string;
  } | null>(null);

  // Sidebar controls
  const [sidebarTab, setSidebarTab] = useState<'comments' | 'metadata'>('comments');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Link modal state (replaces browser window.prompt)
  const [linkDialogState, setLinkDialogState] = useState<{
    isOpen: boolean;
    initialUrl: string;
    selectedText?: string;
    pos?: number;
  } | null>(null);

  // Container ref for click-to-focus and scroll synchronization
  const editorContainerRef = useRef<HTMLDivElement>(null);

  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({
          link: {
            openOnClick: false,
            protocols: ['snomed'],
            HTMLAttributes: {
              class: 'editor-link',
            },
          },
        }),
        Markdown,
        SlashCommand.configure({
          suggestion: getSuggestionOptions(),
        }),
        CommentMark,
        HighlightMark,
        TextColorMark,
      ],
      content: initialBody,
      editorProps: {
        attributes: {
          class:
            'prose max-w-none focus:outline-none min-h-[580px] p-6 text-foreground text-base leading-relaxed',
        },
      },
      editable: frontmatter.review_status !== 'pitch',
      immediatelyRender: false,
    },
    [initialBody]
  );

  // Count open comments
  const openCommentsCount = useMemo(
    () => comments.filter(c => c.status === 'open').length,
    [comments]
  );

  // Listen to document clicks to synchronize active comment highlight
  useEffect(() => {
    const container = editorContainerRef.current;
    if (!container) return;

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const markEl = target.closest('mark[data-comment-id]');
      if (markEl) {
        const commentId = markEl.getAttribute('data-comment-id');
        if (commentId) {
          setActiveCommentId(commentId);
          setSidebarTab('comments');
          setIsSidebarOpen(true);
        }
      }
    };

    container.addEventListener('click', handleClick);
    return () => container.removeEventListener('click', handleClick);
  }, []);

  // Trigger creating a comment from current selection
  const handleTriggerAddComment = useCallback(() => {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    if (from === to) {
      alert('Please select text in the article first to add a comment.');
      return;
    }

    const selectedText = editor.state.doc.textBetween(from, to, ' ');
    setPendingComment({ highlightedText: selectedText });
    setSidebarTab('comments');
    setIsSidebarOpen(true);
  }, [editor]);

  // Keyboard shortcut Ctrl/Cmd+Alt+M to add comment on selection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.altKey && (e.key === 'm' || e.key === 'M')) {
        e.preventDefault();
        handleTriggerAddComment();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleTriggerAddComment]);

  if (!editor) {
    return null;
  }

  // Submit new pending comment
  const handleSubmitPendingComment = (content: string) => {
    if (!editor) return;

    const threadId = generateCommentId();
    const highlightedText = pendingComment?.highlightedText || '';

    // Apply TipTap comment mark to current selection
    editor.commands.setComment({ commentId: threadId, resolved: false });

    const newThread: CommentThread = {
      id: threadId,
      createdAt: new Date().toISOString(),
      author: {
        id: normalizedUser.id,
        name: normalizedUser.name,
        username: normalizedUser.username,
        avatar: normalizedUser.avatar,
        role: normalizedUser.role,
      },
      content,
      highlightedText,
      status: 'open',
      resolvedBy: null,
      resolvedAt: null,
      replies: [],
    };

    setComments(prev => [newThread, ...prev]);
    setActiveCommentId(threadId);
    setPendingComment(null);
  };

  // Cancel pending comment
  const handleCancelPendingComment = () => {
    setPendingComment(null);
  };

  // Select comment from sidebar & scroll editor to that highlight
  const handleSelectComment = (threadId: string) => {
    setActiveCommentId(threadId);
    if (!editorContainerRef.current) return;

    const markEl = editorContainerRef.current.querySelector(
      `mark[data-comment-id="${threadId}"]`
    ) as HTMLElement | null;

    if (markEl) {
      markEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      markEl.setAttribute('data-active', 'true');
      setTimeout(() => {
        markEl.removeAttribute('data-active');
      }, 1800);
    }
  };

  // Mark thread as resolved
  const handleResolveComment = (threadId: string) => {
    setComments(prev =>
      prev.map(t =>
        t.id === threadId
          ? {
              ...t,
              status: 'resolved',
              resolvedBy: {
                id: normalizedUser.id,
                name: normalizedUser.name,
                username: normalizedUser.username,
                avatar: normalizedUser.avatar,
              },
              resolvedAt: new Date().toISOString(),
            }
          : t
      )
    );

    // Update mark in editor
    editor.commands.updateCommentStatus(threadId, true);
  };

  // Re-open thread
  const handleReopenComment = (threadId: string) => {
    setComments(prev =>
      prev.map(t =>
        t.id === threadId
          ? {
              ...t,
              status: 'open',
              resolvedBy: null,
              resolvedAt: null,
            }
          : t
      )
    );

    // Update mark in editor
    editor.commands.updateCommentStatus(threadId, false);
  };

  // Delete thread
  const handleDeleteComment = (threadId: string) => {
    setComments(prev => prev.filter(t => t.id !== threadId));
    // Remove mark from editor
    editor.commands.unsetComment(threadId);
    if (activeCommentId === threadId) {
      setActiveCommentId(null);
    }
  };

  // Edit main comment content
  const handleEditComment = (threadId: string, newContent: string) => {
    setComments(prev =>
      prev.map(t =>
        t.id === threadId
          ? {
              ...t,
              content: newContent,
              updatedAt: new Date().toISOString(),
            }
          : t
      )
    );
  };

  // Add reply to thread
  const handleAddReply = (threadId: string, replyContent: string) => {
    const reply = {
      id: generateReplyId(),
      createdAt: new Date().toISOString(),
      author: {
        id: normalizedUser.id,
        name: normalizedUser.name,
        username: normalizedUser.username,
        avatar: normalizedUser.avatar,
        role: normalizedUser.role,
      },
      content: replyContent,
    };

    setComments(prev =>
      prev.map(t =>
        t.id === threadId
          ? {
              ...t,
              replies: [...(t.replies || []), reply],
            }
          : t
      )
    );
  };

  // Delete reply
  const handleDeleteReply = (threadId: string, replyId: string) => {
    setComments(prev =>
      prev.map(t =>
        t.id === threadId
          ? {
              ...t,
              replies: (t.replies || []).filter(r => r.id !== replyId),
            }
          : t
      )
    );
  };

  // Edit reply
  const handleEditReply = (
    threadId: string,
    replyId: string,
    newContent: string
  ) => {
    setComments(prev =>
      prev.map(t =>
        t.id === threadId
          ? {
              ...t,
              replies: (t.replies || []).map(r =>
                r.id === replyId
                  ? {
                      ...r,
                      content: newContent,
                      updatedAt: new Date().toISOString(),
                    }
                  : r
              ),
            }
          : t
      )
    );
  };

  // Save to GitHub
  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      // @ts-expect-error tiptap-markdown extends storage dynamically
      const markdown = editor.storage.markdown.getMarkdown();

      // Parse comma-separated reviewers into array if it's a string
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const dataToSave: Record<string, any> = {
        ...frontmatter,
        comments,
      };

      if (typeof dataToSave.assigned_reviewers === 'string') {
        dataToSave.assigned_reviewers = dataToSave.assigned_reviewers
          .split(',')
          .map((s: string) => s.trim())
          .filter(Boolean);
      }

      const fileContent = matter.stringify(markdown, dataToSave);

      if (
        dataToSave.review_status === 'published' &&
        filePath.includes('/editorial/')
      ) {
        const newPath = filePath.replace('/editorial/', '/articles/');
        await moveMarkdownFile(
          filePath,
          newPath,
          fileContent,
          `Publish ${filePath} to articles`
        );
        alert(
          'Published successfully! The article has been moved to the articles directory.'
        );
        router.push(`/editorial/${newPath}`);
      } else {
        await saveMarkdownFile(
          filePath,
          fileContent,
          `Update ${filePath} via ThaiOML Studio`
        );
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch {
      alert('Error saving document to GitHub');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAutoLink = async () => {
    setIsLinking(true);
    try {
      // @ts-expect-error tiptap-markdown extends storage dynamically
      const markdown = editor.storage.markdown.getMarkdown();
      const result = await autoLinkContent(
        markdown,
        frontmatter.title,
        frontmatter.snomed_id
      );

      const linkedMarkdown =
        typeof result === 'string' ? result : result.body || markdown;

      editor.commands.setContent(linkedMarkdown);
    } catch {
      alert('Error running Auto Link. Ensure RAG backend is running.');
    } finally {
      setIsLinking(false);
    }
  };

  const handleFrontmatterChange = (key: string, value: unknown) => {
    setFrontmatter(prev => ({ ...prev, [key]: value }));
  };

  const handleAutoSuggestSnomed = async () => {
    if (!frontmatter.title) {
      alert('Please enter a title first to auto-suggest a SNOMED Concept ID.');
      return;
    }
    setIsSuggesting(true);
    try {
      const data = await getSnomedSuggestion(frontmatter.title as string);
      if (data && data.id) {
        handleFrontmatterChange('snomed_id', data.id);
      } else {
        alert(
          'No specific SNOMED concept could be confidently matched for this title.'
        );
      }
    } catch {
      alert('Failed to auto-suggest SNOMED ID. Make sure the RAG backend is running.');
    } finally {
      setIsSuggesting(false);
    }
  };

  const handleAddLink = () => {
    const previousUrl = editor.getAttributes('link').href || '';
    const { from, to } = editor.state.selection;
    const selectedText = from !== to ? editor.state.doc.textBetween(from, to) : '';
    setLinkDialogState({
      isOpen: true,
      initialUrl: previousUrl,
      selectedText,
      pos: undefined,
    });
  };

  const handleEditLinkFromHover = (href: string, pos: number) => {
    setLinkDialogState({
      isOpen: true,
      initialUrl: href,
      pos,
    });
  };

  const handleSaveLink = (newUrl: string) => {
    if (linkDialogState?.pos !== undefined) {
      editor
        .chain()
        .setTextSelection(linkDialogState.pos)
        .extendMarkRange('link')
        .setLink({ href: newUrl })
        .focus()
        .run();
    } else {
      editor
        .chain()
        .focus()
        .extendMarkRange('link')
        .setLink({ href: newUrl })
        .run();
    }
    setLinkDialogState(null);
  };

  const handleRemoveLinkFromDialog = () => {
    if (linkDialogState?.pos !== undefined) {
      editor
        .chain()
        .setTextSelection(linkDialogState.pos)
        .extendMarkRange('link')
        .unsetLink()
        .focus()
        .run();
    } else {
      editor
        .chain()
        .focus()
        .extendMarkRange('link')
        .unsetLink()
        .run();
    }
    setLinkDialogState(null);
  };

  // Word count & character count calculations
  const characterCount = editor.storage.characterCount
    ? editor.storage.characterCount.characters()
    : editor.getText().length;
  const wordCount = editor.getText().trim()
    ? editor.getText().trim().split(/\s+/).length
    : 0;

  return (
    <div className="flex h-full min-h-[750px] border border-border rounded-xl overflow-hidden bg-background shadow-md">
      {/* Main Document & Editor Area */}
      <div className="flex-1 flex flex-col min-w-0 border-r border-border">
        {/* Full Rich Toolbar */}
        <div className="bg-surface border-b border-border p-2 flex flex-wrap items-center justify-between gap-1.5 sticky top-0 z-20 shadow-xs">
          {/* Formatting tools */}
          <div className="flex items-center flex-wrap gap-1">
            {/* History */}
            <div className="flex items-center border-r border-border pr-1 mr-1">
              <button
                type="button"
                onClick={() => editor.chain().focus().undo().run()}
                disabled={!editor.can().undo()}
                className="p-1.5 rounded text-foreground-muted hover:text-foreground hover:bg-border/60 disabled:opacity-40 transition"
                title="Undo (Ctrl+Z)"
              >
                <Undo2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => editor.chain().focus().redo().run()}
                disabled={!editor.can().redo()}
                className="p-1.5 rounded text-foreground-muted hover:text-foreground hover:bg-border/60 disabled:opacity-40 transition"
                title="Redo (Ctrl+Y)"
              >
                <Redo2 className="w-4 h-4" />
              </button>
            </div>

            {/* Typography formats */}
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleBold().run()}
              className={`p-1.5 rounded text-xs font-semibold transition ${
                editor.isActive('bold')
                  ? 'bg-border text-foreground-strong'
                  : 'text-foreground-muted hover:text-foreground hover:bg-border/60'
              }`}
              title="Bold (Ctrl+B)"
            >
              <Bold className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className={`p-1.5 rounded text-xs transition ${
                editor.isActive('italic')
                  ? 'bg-border text-foreground-strong'
                  : 'text-foreground-muted hover:text-foreground hover:bg-border/60'
              }`}
              title="Italic (Ctrl+I)"
            >
              <Italic className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleStrike().run()}
              className={`p-1.5 rounded text-xs transition ${
                editor.isActive('strike')
                  ? 'bg-border text-foreground-strong'
                  : 'text-foreground-muted hover:text-foreground hover:bg-border/60'
              }`}
              title="Strikethrough"
            >
              <Strikethrough className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleCode().run()}
              className={`p-1.5 rounded text-xs transition ${
                editor.isActive('code')
                  ? 'bg-border text-foreground-strong'
                  : 'text-foreground-muted hover:text-foreground hover:bg-border/60'
              }`}
              title="Inline Code"
            >
              <Code className="w-4 h-4" />
            </button>

            <div className="w-px h-5 bg-border mx-1" />

            {/* Theme-Adaptive Text Color & Highlight Pickers */}
            <TextColorPickerDropdown
              currentColor={
                editor.isActive('textColor')
                  ? (editor.getAttributes('textColor').color as TextColor)
                  : null
              }
              onSelect={color => editor.chain().focus().setTextColor(color).run()}
              onClear={() => editor.chain().focus().unsetTextColor().run()}
            />
            <HighlightPickerDropdown
              currentColor={
                editor.isActive('highlight')
                  ? (editor.getAttributes('highlight').color as HighlightColor)
                  : null
              }
              onSelect={color => editor.chain().focus().setHighlight({ color }).run()}
              onClear={() => editor.chain().focus().unsetHighlight().run()}
            />

            <div className="w-px h-5 bg-border mx-1" />

            {/* Headings */}
            <button
              type="button"
              onClick={() =>
                editor.chain().focus().toggleHeading({ level: 1 }).run()
              }
              className={`px-2 py-1 rounded text-xs font-bold transition ${
                editor.isActive('heading', { level: 1 })
                  ? 'bg-border text-foreground-strong'
                  : 'text-foreground-muted hover:text-foreground hover:bg-border/60'
              }`}
              title="Heading 1"
            >
              <Heading1 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() =>
                editor.chain().focus().toggleHeading({ level: 2 }).run()
              }
              className={`px-2 py-1 rounded text-xs font-bold transition ${
                editor.isActive('heading', { level: 2 })
                  ? 'bg-border text-foreground-strong'
                  : 'text-foreground-muted hover:text-foreground hover:bg-border/60'
              }`}
              title="Heading 2"
            >
              <Heading2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() =>
                editor.chain().focus().toggleHeading({ level: 3 }).run()
              }
              className={`px-2 py-1 rounded text-xs font-bold transition ${
                editor.isActive('heading', { level: 3 })
                  ? 'bg-border text-foreground-strong'
                  : 'text-foreground-muted hover:text-foreground hover:bg-border/60'
              }`}
              title="Heading 3"
            >
              <Heading3 className="w-4 h-4" />
            </button>

            <div className="w-px h-5 bg-border mx-1" />

            {/* Lists & Quotes */}
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              className={`p-1.5 rounded text-xs transition ${
                editor.isActive('bulletList')
                  ? 'bg-border text-foreground-strong'
                  : 'text-foreground-muted hover:text-foreground hover:bg-border/60'
              }`}
              title="Bullet List"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              className={`p-1.5 rounded text-xs transition ${
                editor.isActive('orderedList')
                  ? 'bg-border text-foreground-strong'
                  : 'text-foreground-muted hover:text-foreground hover:bg-border/60'
              }`}
              title="Ordered List"
            >
              <ListOrdered className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              className={`p-1.5 rounded text-xs transition ${
                editor.isActive('blockquote')
                  ? 'bg-border text-foreground-strong'
                  : 'text-foreground-muted hover:text-foreground hover:bg-border/60'
              }`}
              title="Blockquote"
            >
              <Quote className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().setHorizontalRule().run()}
              className="p-1.5 rounded text-xs text-foreground-muted hover:text-foreground hover:bg-border/60 transition"
              title="Divider / Horizontal Rule"
            >
              <Minus className="w-4 h-4" />
            </button>

            <div className="w-px h-5 bg-border mx-1" />

            {/* Links */}
            <button
              type="button"
              onClick={handleAddLink}
              className={`p-1.5 rounded text-xs transition ${
                editor.isActive('link')
                  ? 'bg-border text-foreground-strong'
                  : 'text-foreground-muted hover:text-foreground hover:bg-border/60'
              }`}
              title="Insert / Edit Link"
            >
              <LinkIcon className="w-4 h-4" />
            </button>
            {editor.isActive('link') && (
              <button
                type="button"
                onClick={() => editor.chain().focus().unsetLink().run()}
                className="p-1.5 rounded text-xs text-foreground-muted hover:text-foreground hover:bg-border/60 transition"
                title="Remove Link"
              >
                <Unlink className="w-4 h-4" />
              </button>
            )}

            <div className="w-px h-5 bg-border mx-1" />

            {/* Google Docs Comment Button */}
            <button
              type="button"
              onClick={handleTriggerAddComment}
              className="px-2.5 py-1.5 rounded-md text-xs font-medium bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 border border-amber-500/30 transition flex items-center gap-1.5 shadow-2xs"
              title="Add Comment on Selection (Ctrl+Alt+M)"
            >
              <MessageSquarePlus className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>Comment</span>
              {openCommentsCount > 0 && (
                <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-amber-500 text-white text-[10px] font-bold">
                  {openCommentsCount}
                </span>
              )}
            </button>

            {/* Medical Auto Link */}
            <div className="flex items-center space-x-1 ml-1 group relative">
              <button
                type="button"
                onClick={handleAutoLink}
                disabled={isLinking}
                className="px-2.5 py-1.5 rounded-md text-xs font-medium bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/50 border border-purple-200 dark:border-purple-800 disabled:opacity-50 transition flex items-center gap-1"
                title="Auto-link medical terms to SNOMED CT via RAG"
              >
                {isLinking ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                <span>Auto Link</span>
              </button>
              <div
                title="Sends article to ThaiOML RAG backend to automatically match medical terms to SNOMED concepts"
                className="text-foreground-muted hover:text-foreground cursor-help"
              >
                <Info size={14} />
              </div>
            </div>
          </div>

          {/* Right Toolbar: Actions & Panels */}
          <div className="flex items-center gap-2">
            {/* Sidebar toggle button */}
            <button
              type="button"
              onClick={() => setIsSidebarOpen(prev => !prev)}
              className="p-1.5 rounded text-foreground-muted hover:text-foreground hover:bg-border/60 transition flex items-center gap-1 text-xs"
              title={isSidebarOpen ? 'Collapse Sidebar' : 'Expand Sidebar'}
            >
              <SlidersHorizontal className="w-4 h-4" />
              {isSidebarOpen ? (
                <ChevronRight className="w-3.5 h-3.5" />
              ) : (
                <ChevronLeft className="w-3.5 h-3.5" />
              )}
            </button>

            {/* Save Button */}
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className={`px-4 py-1.5 text-xs rounded-md font-semibold transition flex items-center gap-1.5 shadow-xs ${
                saveSuccess
                  ? 'bg-emerald-600 text-white'
                  : 'bg-foreground text-background hover:opacity-90 disabled:opacity-50'
              }`}
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Saving...
                </>
              ) : saveSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  Saved!
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  Save to GitHub
                </>
              )}
            </button>
          </div>
        </div>

        {/* Warning Banner for Active Author */}
        {showActiveAuthorWarning &&
          frontmatter.active_author &&
          frontmatter.active_author !== normalizedUser.username && (
            <div role="alert" className="bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800 px-4 py-2 text-xs text-amber-800 dark:text-amber-200 flex items-center justify-center font-medium">
              ⚠️ Warning: @{frontmatter.active_author} is currently the active author
              of this draft. Edit with caution to avoid concurrent merge conflicts.
            </div>
          )}

        {/* Floating Bubble Menu on text selection */}
        {editor && (
          <BubbleMenu
            editor={editor}
            className="flex items-center gap-1 bg-surface border border-border rounded-lg p-1 shadow-xl text-foreground text-xs z-30 animate-in fade-in zoom-in-95 duration-150"
          >
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleBold().run()}
              className={`p-1.5 rounded transition ${
                editor.isActive('bold')
                  ? 'bg-border text-foreground-strong'
                  : 'hover:bg-border/60 text-foreground-muted hover:text-foreground'
              }`}
              title="Bold"
            >
              <Bold className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className={`p-1.5 rounded transition ${
                editor.isActive('italic')
                  ? 'bg-border text-foreground-strong'
                  : 'hover:bg-border/60 text-foreground-muted hover:text-foreground'
              }`}
              title="Italic"
            >
              <Italic className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleStrike().run()}
              className={`p-1.5 rounded transition ${
                editor.isActive('strike')
                  ? 'bg-border text-foreground-strong'
                  : 'hover:bg-border/60 text-foreground-muted hover:text-foreground'
              }`}
              title="Strikethrough"
            >
              <Strikethrough className="w-3.5 h-3.5" />
            </button>

            <div className="w-px h-4 bg-border mx-0.5" />

            {/* Floating Text Color & Highlight Pickers */}
            <TextColorPickerDropdown
              compact
              currentColor={
                editor.isActive('textColor')
                  ? (editor.getAttributes('textColor').color as TextColor)
                  : null
              }
              onSelect={color => editor.chain().focus().setTextColor(color).run()}
              onClear={() => editor.chain().focus().unsetTextColor().run()}
            />
            <HighlightPickerDropdown
              compact
              currentColor={
                editor.isActive('highlight')
                  ? (editor.getAttributes('highlight').color as HighlightColor)
                  : null
              }
              onSelect={color => editor.chain().focus().setHighlight({ color }).run()}
              onClear={() => editor.chain().focus().unsetHighlight().run()}
            />

            <div className="w-px h-4 bg-border mx-0.5" />

            <button
              type="button"
              onClick={handleAddLink}
              className={`p-1.5 rounded transition ${
                editor.isActive('link')
                  ? 'bg-border text-foreground-strong'
                  : 'hover:bg-border/60 text-foreground-muted hover:text-foreground'
              }`}
              title="Link"
            >
              <LinkIcon className="w-3.5 h-3.5" />
            </button>

            <div className="w-px h-4 bg-border mx-0.5" />

            {/* Floating "+ Comment" action */}
            <button
              type="button"
              onClick={handleTriggerAddComment}
              className="px-2 py-1 rounded bg-amber-500 text-white font-medium hover:bg-amber-600 transition flex items-center gap-1 shadow-2xs"
              title="Add Comment (Ctrl+Alt+M)"
            >
              <MessageSquarePlus className="w-3.5 h-3.5" />
              <span>Comment</span>
            </button>
          </BubbleMenu>
        )}

        {/* Editor Content Area */}
        {frontmatter.review_status === 'pitch' ? (
          <div className="p-8 bg-surface flex-1 flex flex-col items-center justify-center text-foreground-muted">
            <Info className="w-12 h-12 text-foreground-muted mb-4" />
            <h3 className="text-lg font-medium text-foreground">
              Main Body Disabled
            </h3>
            <p className="max-w-md text-center mt-2 text-sm leading-relaxed">
              The main body of the article is disabled during the Pitch phase.
              Please complete the Abstract / Summary in the metadata sidebar.
            </p>
          </div>
        ) : (
          <div
            ref={editorContainerRef}
            className="flex-1 overflow-y-auto bg-background focus:outline-none"
          >
            <EditorContent editor={editor} />
          </div>
        )}

        {/* Link Hover Preview and Quick Actions Popup */}
        <LinkHoverPopup
          editor={editor}
          containerRef={editorContainerRef}
          onEditLink={handleEditLinkFromHover}
          editable={frontmatter.review_status !== 'pitch'}
        />

        {/* Custom Link Dialog replacing window.prompt */}
        {linkDialogState?.isOpen && (
          <LinkDialog
            key={`${linkDialogState.initialUrl}-${linkDialogState.pos ?? 'new'}`}
            isOpen={linkDialogState.isOpen}
            initialUrl={linkDialogState.initialUrl}
            selectedText={linkDialogState.selectedText}
            onSave={handleSaveLink}
            onRemove={handleRemoveLinkFromDialog}
            onClose={() => setLinkDialogState(null)}
          />
        )}

        {/* Status bar */}
        <div className="bg-surface border-t border-border px-4 py-1.5 text-xs text-foreground-muted flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span>{wordCount} words</span>
            <span>{characterCount} characters</span>
            <span className="flex items-center gap-1">
              <MessageSquare className="w-3 h-3 text-amber-500" />
              {openCommentsCount} open comments
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span>
              Signed in as{' '}
              <strong className="text-foreground font-medium">
                {normalizedUser.name}
              </strong>{' '}
              (@{normalizedUser.username})
            </span>
          </div>
        </div>
      </div>

      {/* Right Sidebar: Google Docs Comments & Article Metadata */}
      {isSidebarOpen && (
        <div className="w-84 xl:w-96 bg-surface flex flex-col shrink-0">
          {/* Top Segmented Tab Switch */}
          <div className="p-2 border-b border-border bg-background flex items-center justify-between">
            <div className="flex p-0.5 rounded-lg bg-surface border border-border w-full text-xs font-medium">
              <button
                type="button"
                onClick={() => setSidebarTab('comments')}
                className={`flex-1 py-1.5 rounded-md transition flex items-center justify-center gap-1.5 ${
                  sidebarTab === 'comments'
                    ? 'bg-background text-foreground shadow-xs font-semibold'
                    : 'text-foreground-muted hover:text-foreground'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5 text-amber-500" />
                <span>Comments</span>
                {openCommentsCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-white text-[10px] font-bold">
                    {openCommentsCount}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setSidebarTab('metadata')}
                className={`flex-1 py-1.5 rounded-md transition flex items-center justify-center gap-1.5 ${
                  sidebarTab === 'metadata'
                    ? 'bg-background text-foreground shadow-xs font-semibold'
                    : 'text-foreground-muted hover:text-foreground'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Metadata</span>
              </button>
            </div>
          </div>

          {/* Tab 1: Comments Stream (Google Docs style) */}
          {sidebarTab === 'comments' ? (
            <div className="flex-1 overflow-hidden">
              <CommentsSidebar
                threads={comments}
                currentUser={normalizedUser}
                isEditor={isEditor}
                activeCommentId={activeCommentId}
                pendingComment={pendingComment}
                onSelectComment={handleSelectComment}
                onSubmitPendingComment={handleSubmitPendingComment}
                onCancelPendingComment={handleCancelPendingComment}
                onResolve={handleResolveComment}
                onReopen={handleReopenComment}
                onDelete={handleDeleteComment}
                onEdit={handleEditComment}
                onReply={handleAddReply}
                onDeleteReply={handleDeleteReply}
                onEditReply={handleEditReply}
              />
            </div>
          ) : (
            /* Tab 2: Article Frontmatter Metadata */
            <div className="p-4 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={frontmatter.title || ''}
                  onChange={e => handleFrontmatterChange('title', e.target.value)}
                  className="w-full px-3 py-1.5 border border-border rounded-md bg-background text-foreground placeholder:text-foreground-muted shadow-xs focus:outline-none focus:ring-1 focus:ring-accent sm:text-xs"
                  placeholder="Article title"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  SNOMED Concept ID
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={frontmatter.snomed_id || ''}
                    onChange={e =>
                      handleFrontmatterChange('snomed_id', e.target.value)
                    }
                    className="flex-1 px-3 py-1.5 border border-border rounded-md bg-background text-foreground placeholder:text-foreground-muted shadow-xs focus:outline-none focus:ring-1 focus:ring-accent sm:text-xs"
                    placeholder="e.g. 123456789"
                  />
                  <button
                    type="button"
                    onClick={handleAutoSuggestSnomed}
                    disabled={isSuggesting}
                    title="Auto-suggest SNOMED ID based on Title"
                    className="p-1.5 bg-surface text-foreground-muted rounded-md hover:bg-border transition disabled:opacity-50"
                  >
                    {isSuggesting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <p className="text-[11px] text-foreground-muted mt-1">
                  Click the ✨ to auto-suggest based on the title.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Abstract / Pitch Summary
                </label>
                <textarea
                  value={frontmatter.abstract || ''}
                  onChange={e =>
                    handleFrontmatterChange('abstract', e.target.value)
                  }
                  className="w-full px-3 py-1.5 border border-border rounded-md bg-background text-foreground placeholder:text-foreground-muted shadow-xs focus:outline-none focus:ring-1 focus:ring-accent sm:text-xs"
                  placeholder="Short list of key clinical points..."
                  rows={3}
                />
              </div>

              <div className="mb-3">
                <UserAutocomplete
                  label="Active Author"
                  value={frontmatter.active_author || ''}
                  onChange={val => handleFrontmatterChange('active_author', val)}
                  disabled={
                    !isEditor &&
                    frontmatter.active_author !== normalizedUser.username
                  }
                  placeholder="ThaiOML username"
                />
              </div>

              <div className="mb-3">
                <UserAutocomplete
                  label="Assigned Editor"
                  value={frontmatter.assigned_editor || ''}
                  onChange={val =>
                    handleFrontmatterChange('assigned_editor', val)
                  }
                  disabled={!isEditor}
                  placeholder="ThaiOML username"
                />
              </div>

              <div className="mb-3">
                <UserAutocomplete
                  label="Assigned Reviewers"
                  value={frontmatter.assigned_reviewers || []}
                  onChange={val =>
                    handleFrontmatterChange('assigned_reviewers', val)
                  }
                  disabled={!isEditor}
                  multiple={true}
                  placeholder="ThaiOML usernames"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Review Status
                </label>
                <select
                  value={frontmatter.review_status || 'pitch'}
                  onChange={e =>
                    handleFrontmatterChange('review_status', e.target.value)
                  }
                  disabled={!isEditor}
                  className="w-full px-3 py-1.5 border border-border rounded-md bg-background text-foreground shadow-xs focus:outline-none focus:ring-1 focus:ring-accent sm:text-xs disabled:bg-surface disabled:text-foreground-muted cursor-pointer disabled:cursor-not-allowed"
                >
                  <option value="pitch">Pitch</option>
                  <option value="accepted">Accepted</option>
                  <option value="drafting">Drafting</option>
                  <option value="in_review">In Review</option>
                  <option value="approved">Approved</option>
                  <option value="published">Published</option>
                </select>
              </div>

              <hr className="border-border my-3" />

              <div className="text-[11px] text-foreground-muted space-y-1.5">
                <p className="font-semibold text-foreground">
                  Editor Shortcuts:
                </p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>
                    <kbd className="bg-border px-1 rounded">Ctrl+Alt+M</kbd> Add
                    comment to selection
                  </li>
                  <li>
                    Type <code className="bg-border px-1 rounded">/term</code> to
                    lookup SNOMED CT terms
                  </li>
                  <li>
                    Use <b>Auto Link</b> for automatic entity linking
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
