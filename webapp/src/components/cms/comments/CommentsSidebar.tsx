'use client';

import { useState } from 'react';
import {
  CommentThread,
  CurrentUserInfo,
  getInitials,
  getAvatarColor,
} from '@/types/editorial';
import CommentCard from './CommentCard';
import {
  MessageSquare,
  Search,
  X,
  CornerDownRight,
  Filter,
  CheckCircle2,
} from 'lucide-react';

interface CommentsSidebarProps {
  threads: CommentThread[];
  currentUser: CurrentUserInfo;
  isEditor: boolean;
  activeCommentId: string | null;
  pendingComment: { highlightedText: string } | null;
  onSelectComment: (id: string) => void;
  onSubmitPendingComment: (content: string) => void;
  onCancelPendingComment: () => void;
  onResolve: (id: string) => void;
  onReopen: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (id: string, content: string) => void;
  onReply: (threadId: string, content: string) => void;
  onDeleteReply: (threadId: string, replyId: string) => void;
  onEditReply: (threadId: string, replyId: string, content: string) => void;
}

type FilterTab = 'open' | 'resolved' | 'all';

export default function CommentsSidebar({
  threads,
  currentUser,
  isEditor,
  activeCommentId,
  pendingComment,
  onSelectComment,
  onSubmitPendingComment,
  onCancelPendingComment,
  onResolve,
  onReopen,
  onDelete,
  onEdit,
  onReply,
  onDeleteReply,
  onEditReply,
}: CommentsSidebarProps) {
  const [filterTab, setFilterTab] = useState<FilterTab>('open');
  const [searchQuery, setSearchQuery] = useState('');
  const [newCommentText, setNewCommentText] = useState('');

  const openCount = threads.filter(t => t.status === 'open').length;
  const resolvedCount = threads.filter(t => t.status === 'resolved').length;

  const filteredThreads = threads.filter(thread => {
    // 1. Tab filter
    if (filterTab === 'open' && thread.status !== 'open') return false;
    if (filterTab === 'resolved' && thread.status !== 'resolved') return false;

    // 2. Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const inMainContent = thread.content.toLowerCase().includes(q);
      const inAuthor =
        thread.author.name.toLowerCase().includes(q) ||
        thread.author.username.toLowerCase().includes(q);
      const inQuote = thread.highlightedText?.toLowerCase().includes(q);
      const inReplies = thread.replies?.some(
        r =>
          r.content.toLowerCase().includes(q) ||
          r.author.name.toLowerCase().includes(q) ||
          r.author.username.toLowerCase().includes(q)
      );

      return inMainContent || inAuthor || inQuote || inReplies;
    }

    return true;
  });

  const handleCreateComment = () => {
    if (!newCommentText.trim()) return;
    onSubmitPendingComment(newCommentText.trim());
    setNewCommentText('');
  };

  const renderCurrentUserAvatar = () => {
    if (currentUser.avatar) {
      return (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={currentUser.avatar}
          alt={currentUser.name}
          className="w-7 h-7 rounded-full object-cover shrink-0 ring-1 ring-border"
        />
      );
    }
    return (
      <div
        className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${getAvatarColor(
          currentUser.name
        )}`}
      >
        {getInitials(currentUser.name)}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-surface border-l border-border select-none">
      {/* Header & Controls */}
      <div className="p-3 border-b border-border space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-amber-500" />
            <h3 className="font-semibold text-sm text-foreground">Comments</h3>
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-border text-foreground-muted font-medium">
              {threads.length}
            </span>
          </div>

          <div className="text-[11px] text-foreground-muted">
            {openCount} open
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex p-0.5 rounded-md bg-background border border-border text-xs font-medium">
          <button
            onClick={() => setFilterTab('open')}
            className={`flex-1 py-1 rounded transition text-center ${
              filterTab === 'open'
                ? 'bg-surface text-foreground shadow-xs font-semibold'
                : 'text-foreground-muted hover:text-foreground'
            }`}
          >
            Open ({openCount})
          </button>
          <button
            onClick={() => setFilterTab('resolved')}
            className={`flex-1 py-1 rounded transition text-center ${
              filterTab === 'resolved'
                ? 'bg-surface text-foreground shadow-xs font-semibold'
                : 'text-foreground-muted hover:text-foreground'
            }`}
          >
            Resolved ({resolvedCount})
          </button>
          <button
            onClick={() => setFilterTab('all')}
            className={`flex-1 py-1 rounded transition text-center ${
              filterTab === 'all'
                ? 'bg-surface text-foreground shadow-xs font-semibold'
                : 'text-foreground-muted hover:text-foreground'
            }`}
          >
            All ({threads.length})
          </button>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-foreground-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search comments or authors..."
            className="w-full pl-8 pr-7 py-1 text-xs rounded-md bg-background border border-border text-foreground placeholder:text-foreground-muted focus:ring-1 focus:ring-accent focus:outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-foreground-muted hover:text-foreground"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Comment Cards Stream */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* Pending New Comment Box */}
        {pendingComment && (
          <div className="rounded-lg p-3.5 bg-background border-2 border-amber-500 shadow-md animate-in fade-in duration-200">
            <div className="flex items-center gap-2 mb-2">
              {renderCurrentUserAvatar()}
              <div className="min-w-0">
                <span className="font-semibold text-xs text-foreground block truncate">
                  {currentUser.name}
                </span>
                <span className="text-[10px] text-foreground-muted block">
                  New comment on selection
                </span>
              </div>
            </div>

            {pendingComment.highlightedText && (
              <div className="mb-2 pl-2 border-l-2 border-amber-400 text-xs italic text-foreground-muted bg-amber-50/50 dark:bg-amber-950/20 py-1 pr-1.5 rounded-r line-clamp-2">
                &ldquo;{pendingComment.highlightedText}&rdquo;
              </div>
            )}

            <textarea
              autoFocus
              value={newCommentText}
              onChange={e => setNewCommentText(e.target.value)}
              onKeyDown={e => {
                if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                  handleCreateComment();
                } else if (e.key === 'Escape') {
                  onCancelPendingComment();
                }
              }}
              placeholder="Add your review comment... (Cmd+Enter to post)"
              rows={3}
              className="w-full text-xs p-2 rounded border border-border bg-surface text-foreground placeholder:text-foreground-muted focus:ring-1 focus:ring-amber-500 focus:outline-none"
            />

            <div className="flex justify-end gap-1.5 mt-2">
              <button
                onClick={onCancelPendingComment}
                className="px-2.5 py-1 text-xs rounded text-foreground-muted hover:bg-border transition"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateComment}
                disabled={!newCommentText.trim()}
                className="px-3 py-1 text-xs rounded bg-amber-600 text-white font-medium hover:bg-amber-700 disabled:opacity-50 transition flex items-center gap-1 shadow-xs"
              >
                <CornerDownRight className="w-3 h-3" />
                Comment
              </button>
            </div>
          </div>
        )}

        {/* Filtered Threads List */}
        {filteredThreads.length > 0 ? (
          filteredThreads.map(thread => (
            <CommentCard
              key={thread.id}
              thread={thread}
              currentUser={currentUser}
              isActive={activeCommentId === thread.id}
              isEditor={isEditor}
              onSelect={() => onSelectComment(thread.id)}
              onResolve={onResolve}
              onReopen={onReopen}
              onDelete={onDelete}
              onEdit={onEdit}
              onReply={onReply}
              onDeleteReply={onDeleteReply}
              onEditReply={onEditReply}
            />
          ))
        ) : (
          <div className="h-48 flex flex-col items-center justify-center text-center p-4 text-foreground-muted">
            {searchQuery ? (
              <>
                <Filter className="w-8 h-8 mb-2 opacity-40" />
                <p className="text-xs font-medium">No matching comments</p>
                <p className="text-[11px] mt-1">Try another search term.</p>
              </>
            ) : filterTab === 'resolved' ? (
              <>
                <CheckCircle2 className="w-8 h-8 mb-2 opacity-40 text-emerald-500" />
                <p className="text-xs font-medium">No resolved comments</p>
                <p className="text-[11px] mt-1">
                  Resolved discussions will appear here.
                </p>
              </>
            ) : filterTab === 'open' ? (
              <>
                <MessageSquare className="w-8 h-8 mb-2 opacity-40" />
                <p className="text-xs font-medium">All caught up!</p>
                <p className="text-[11px] mt-1 max-w-[200px]">
                  Select any text in the article and click &ldquo;Comment&rdquo;
                  or press <kbd className="px-1 py-0.5 bg-border rounded">Ctrl+Alt+M</kbd>.
                </p>
              </>
            ) : (
              <>
                <MessageSquare className="w-8 h-8 mb-2 opacity-40" />
                <p className="text-xs font-medium">No comments yet</p>
                <p className="text-[11px] mt-1 max-w-[200px]">
                  Start an editorial review by highlighting text and adding a comment.
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
