export interface CommentAuthor {
  id: string;
  name: string;
  username: string;
  avatar?: string;
  role?: string;
}

export interface CommentReply {
  id: string;
  createdAt: string; // ISO string
  author: CommentAuthor;
  content: string;
  updatedAt?: string;
}

export interface CommentThread {
  id: string;
  createdAt: string; // ISO string
  author: CommentAuthor;
  content: string;
  highlightedText?: string;
  status: 'open' | 'resolved';
  resolvedBy?: CommentAuthor | null;
  resolvedAt?: string | null;
  replies: CommentReply[];
  updatedAt?: string;
}

export interface CurrentUserInfo {
  id: string;
  name: string;
  username: string;
  avatar?: string;
  role?: string;
}

export function generateCommentId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `comment_${timestamp}_${random}`;
}

export function generateReplyId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `reply_${timestamp}_${random}`;
}

export function formatRelativeTime(dateString?: string | null): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';

  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 45) {
    return 'Just now';
  }
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`;
  }
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours}h ago`;
  }
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays}d ago`;
  }
  // Date format e.g. Oct 8, 2026
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

export function getInitials(name?: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const AVATAR_COLORS = [
  'bg-amber-600 text-white',
  'bg-emerald-600 text-white',
  'bg-blue-600 text-white',
  'bg-purple-600 text-white',
  'bg-rose-600 text-white',
  'bg-indigo-600 text-white',
  'bg-teal-600 text-white',
  'bg-cyan-600 text-white',
];

export function getAvatarColor(name?: string): string {
  if (!name) return AVATAR_COLORS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}
