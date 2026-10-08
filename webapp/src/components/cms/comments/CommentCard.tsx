'use client';

import { useState, useRef, useEffect } from 'react';
import {
  CommentThread,
  CurrentUserInfo,
  formatRelativeTime,
  getInitials,
  getAvatarColor,
} from '@/types/editorial';
import {
  Check,
  RotateCcw,
  Trash2,
  Edit2,
  CheckCircle2,
  MessageSquare,
  CornerDownRight,
} from 'lucide-react';

interface CommentCardProps {
  thread: CommentThread;
  currentUser: CurrentUserInfo;
  isActive: boolean;
  isEditor: boolean;
  onSelect: () => void;
  onResolve: (threadId: string) => void;
  onReopen: (threadId: string) => void;
  onDelete: (threadId: string) => void;
  onEdit: (threadId: string, newContent: string) => void;
  onReply: (threadId: string, replyContent: string) => void;
  onDeleteReply: (threadId: string, replyId: string) => void;
  onEditReply: (threadId: string, replyId: string, newContent: string) => void;
}

export default function CommentCard({
  thread,
  currentUser,
  isActive,
  isEditor,
  onSelect,
  onResolve,
  onReopen,
  onDelete,
  onEdit,
  onReply,
  onDeleteReply,
  onEditReply,
}: CommentCardProps) {
  const [isReplying, setIsReplying] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isEditingMain, setIsEditingMain] = useState(false);
  const [editMainText, setEditMainText] = useState(thread.content);
  const [editingReplyId, setEditingReplyId] = useState<string | null>(null);
  const [editReplyText, setEditReplyText] = useState('');

  const cardRef = useRef<HTMLDivElement>(null);
  const replyInputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll into view when activated
  useEffect(() => {
    if (
      isActive &&
      cardRef.current &&
      typeof cardRef.current.scrollIntoView === 'function'
    ) {
      cardRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [isActive]);

  const canModifyThread =
    isEditor ||
    thread.author.id === currentUser.id ||
    thread.author.username === currentUser.username;

  const handleSendReply = () => {
    if (!replyText.trim()) return;
    onReply(thread.id, replyText.trim());
    setReplyText('');
    setIsReplying(false);
  };

  const handleSaveMainEdit = () => {
    if (!editMainText.trim()) return;
    onEdit(thread.id, editMainText.trim());
    setIsEditingMain(false);
  };

  const handleSaveReplyEdit = (replyId: string) => {
    if (!editReplyText.trim()) return;
    onEditReply(thread.id, replyId, editReplyText.trim());
    setEditingReplyId(null);
    setEditReplyText('');
  };

  const renderAvatar = (author: { name: string; avatar?: string }) => {
    if (author.avatar) {
      return (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={author.avatar}
          alt={author.name}
          className="w-7 h-7 rounded-full object-cover shrink-0 ring-1 ring-border"
        />
      );
    }
    return (
      <div
        className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 shadow-xs ${getAvatarColor(
          author.name
        )}`}
      >
        {getInitials(author.name)}
      </div>
    );
  };

  const isResolved = thread.status === 'resolved';

  return (
    <div
      ref={cardRef}
      onClick={onSelect}
      className={`rounded-lg p-3.5 transition-all duration-200 border text-foreground cursor-pointer ${
        isActive
          ? 'bg-surface border-amber-500 shadow-md ring-2 ring-amber-400/20'
          : isResolved
          ? 'bg-surface/50 border-border/60 opacity-80 hover:opacity-100 hover:border-border'
          : 'bg-surface border-border hover:border-border hover:shadow-xs'
      }`}
    >
      {/* Thread Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          {renderAvatar(thread.author)}
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-semibold text-xs text-foreground truncate">
                {thread.author.name}
              </span>
              <span className="text-[11px] text-foreground-muted">
                @{thread.author.username}
              </span>
            </div>
            <div className="text-[10px] text-foreground-muted">
              {formatRelativeTime(thread.createdAt)}
              {thread.updatedAt && <span className="ml-1 italic">(edited)</span>}
            </div>
          </div>
        </div>

        {/* Card Action Controls */}
        <div
          className="flex items-center gap-1 shrink-0"
          onClick={e => e.stopPropagation()}
        >
          {isResolved ? (
            <button
              onClick={() => onReopen(thread.id)}
              className="px-2 py-0.5 text-[11px] rounded bg-background border border-border text-foreground hover:bg-border transition flex items-center gap-1"
              title="Re-open comment thread"
            >
              <RotateCcw className="w-3 h-3" />
              Re-open
            </button>
          ) : (
            <button
              onClick={() => onResolve(thread.id)}
              className="p-1 rounded text-foreground-muted hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition"
              title="Mark as resolved"
            >
              <Check className="w-4 h-4" />
            </button>
          )}

          {canModifyThread && (
            <>
              {!isEditingMain && (
                <button
                  onClick={() => {
                    setIsEditingMain(true);
                    setEditMainText(thread.content);
                  }}
                  className="p-1 rounded text-foreground-muted hover:text-foreground hover:bg-border/60 transition"
                  title="Edit comment"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={() => {
                  if (confirm('Delete this comment thread?')) {
                    onDelete(thread.id);
                  }
                }}
                className="p-1 rounded text-foreground-muted hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                title="Delete comment thread"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Quoted highlighted text */}
      {thread.highlightedText && (
        <div
          onClick={onSelect}
          className="mb-2.5 pl-2.5 border-l-2 border-amber-400 bg-amber-50/50 dark:bg-amber-950/20 py-1 pr-2 rounded-r text-xs text-foreground-muted italic line-clamp-2 hover:text-foreground transition cursor-pointer"
          title="Click to jump to highlighted text in article"
        >
          &ldquo;{thread.highlightedText}&rdquo;
        </div>
      )}

      {/* Main Comment Content */}
      {isEditingMain ? (
        <div className="mb-3" onClick={e => e.stopPropagation()}>
          <textarea
            value={editMainText}
            onChange={e => setEditMainText(e.target.value)}
            rows={2}
            className="w-full text-xs p-2 rounded border border-border bg-background text-foreground focus:ring-1 focus:ring-accent focus:outline-none"
            placeholder="Edit comment..."
          />
          <div className="flex justify-end gap-1.5 mt-1.5">
            <button
              onClick={() => setIsEditingMain(false)}
              className="px-2 py-1 text-xs rounded text-foreground-muted hover:bg-border transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveMainEdit}
              className="px-2.5 py-1 text-xs rounded bg-foreground text-background font-medium hover:opacity-90 transition"
            >
              Save
            </button>
          </div>
        </div>
      ) : (
        <div className="text-xs text-foreground whitespace-pre-wrap leading-relaxed mb-2.5">
          {thread.content}
        </div>
      )}

      {/* Resolved Banner */}
      {isResolved && (
        <div className="mb-2.5 flex items-center gap-1.5 text-[11px] text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1.5 rounded border border-emerald-200 dark:border-emerald-800">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          <span>
            Resolved by{' '}
            <strong className="font-semibold">
              {thread.resolvedBy?.name || 'Reviewer'}
            </strong>{' '}
            {formatRelativeTime(thread.resolvedAt)}
          </span>
        </div>
      )}

      {/* Thread Replies */}
      {thread.replies && thread.replies.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-border/50 mb-2.5">
          {thread.replies.map(reply => {
            const canModifyReply =
              isEditor ||
              reply.author.id === currentUser.id ||
              reply.author.username === currentUser.username;
            const isEditingThisReply = editingReplyId === reply.id;

            return (
              <div
                key={reply.id}
                className="pl-2 border-l border-border/80 flex flex-col gap-1 text-xs"
              >
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {renderAvatar(reply.author)}
                    <span className="font-semibold text-[11px] text-foreground truncate">
                      {reply.author.name}
                    </span>
                    <span className="text-[10px] text-foreground-muted">
                      {formatRelativeTime(reply.createdAt)}
                    </span>
                    {reply.updatedAt && (
                      <span className="text-[10px] text-foreground-muted italic">
                        (edited)
                      </span>
                    )}
                  </div>

                  {canModifyReply && (
                    <div
                      className="flex items-center gap-0.5 shrink-0"
                      onClick={e => e.stopPropagation()}
                    >
                      {!isEditingThisReply && (
                        <button
                          onClick={() => {
                            setEditingReplyId(reply.id);
                            setEditReplyText(reply.content);
                          }}
                          className="p-0.5 text-foreground-muted hover:text-foreground transition"
                          title="Edit reply"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                      )}
                      <button
                        onClick={() => {
                          if (confirm('Delete this reply?')) {
                            onDeleteReply(thread.id, reply.id);
                          }
                        }}
                        className="p-0.5 text-foreground-muted hover:text-rose-600 transition"
                        title="Delete reply"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>

                {isEditingThisReply ? (
                  <div className="mt-1" onClick={e => e.stopPropagation()}>
                    <textarea
                      value={editReplyText}
                      onChange={e => setEditReplyText(e.target.value)}
                      rows={2}
                      className="w-full text-xs p-1.5 rounded border border-border bg-background text-foreground focus:ring-1 focus:ring-accent focus:outline-none"
                    />
                    <div className="flex justify-end gap-1 mt-1">
                      <button
                        onClick={() => setEditingReplyId(null)}
                        className="px-2 py-0.5 text-[11px] rounded text-foreground-muted hover:bg-border transition"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleSaveReplyEdit(reply.id)}
                        className="px-2 py-0.5 text-[11px] rounded bg-foreground text-background font-medium hover:opacity-90 transition"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-[11px] text-foreground/90 whitespace-pre-wrap pl-8">
                    {reply.content}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Reply Input Box */}
      <div className="mt-2" onClick={e => e.stopPropagation()}>
        {isReplying ? (
          <div className="space-y-1.5">
            <div className="flex items-start gap-1.5">
              {renderAvatar(currentUser)}
              <textarea
                ref={replyInputRef}
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                onKeyDown={e => {
                  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                    handleSendReply();
                  }
                }}
                rows={2}
                autoFocus
                placeholder="Reply to this thread... (Cmd+Enter to send)"
                className="flex-1 text-xs p-2 rounded-md border border-border bg-background text-foreground placeholder:text-foreground-muted focus:ring-1 focus:ring-accent focus:border-accent focus:outline-none shadow-xs"
              />
            </div>
            <div className="flex justify-end gap-1.5 pl-8">
              <button
                onClick={() => {
                  setIsReplying(false);
                  setReplyText('');
                }}
                className="px-2 py-1 text-xs rounded text-foreground-muted hover:bg-border transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSendReply}
                disabled={!replyText.trim()}
                className="px-3 py-1 text-xs rounded bg-foreground text-background font-medium hover:opacity-90 disabled:opacity-50 transition flex items-center gap-1 shadow-xs"
              >
                <CornerDownRight className="w-3 h-3" />
                Reply
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => {
              setIsReplying(true);
              setTimeout(() => replyInputRef.current?.focus(), 50);
            }}
            className="w-full text-left text-xs py-1.5 px-2.5 rounded border border-border/80 bg-background/50 hover:bg-background text-foreground-muted hover:text-foreground transition flex items-center gap-1.5"
          >
            <MessageSquare className="w-3.5 h-3.5 text-foreground-muted" />
            <span>Reply...</span>
          </button>
        )}
      </div>
    </div>
  );
}
