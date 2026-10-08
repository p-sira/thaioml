import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import CommentCard from '@/components/cms/comments/CommentCard';
import CommentsSidebar from '@/components/cms/comments/CommentsSidebar';
import {
  CommentThread,
  CurrentUserInfo,
  formatRelativeTime,
  getInitials,
  generateCommentId,
} from '@/types/editorial';

const mockUser: CurrentUserInfo = {
  id: 'user_editor_1',
  name: 'Dr. Sarah Connor',
  username: 'sconnor',
  avatar: 'https://example.com/avatar.jpg',
  role: 'editor',
};

const mockThread: CommentThread = {
  id: 'comm_123',
  createdAt: new Date().toISOString(),
  author: {
    id: 'user_reviewer_2',
    name: 'Dr. Somchai Dee',
    username: 'somchai',
  },
  content: 'Please confirm the clinical dosage recommendation for adult hypertension.',
  highlightedText: '50mg hydrochlorothiazide once daily',
  status: 'open',
  resolvedBy: null,
  resolvedAt: null,
  replies: [
    {
      id: 'rep_1',
      createdAt: new Date().toISOString(),
      author: {
        id: 'user_editor_1',
        name: 'Dr. Sarah Connor',
        username: 'sconnor',
      },
      content: 'Updated to standard 25mg initial dose per ESC 2026 guidelines.',
    },
  ],
};

describe('Editorial Comments & Threading System', () => {
  describe('Helper Utilities', () => {
    it('generates unique comment IDs with expected prefix', () => {
      const id1 = generateCommentId();
      const id2 = generateCommentId();
      expect(id1).toMatch(/^comment_\d+_[a-z0-9]+$/);
      expect(id2).toMatch(/^comment_\d+_[a-z0-9]+$/);
      expect(id1).not.toBe(id2);
    });

    it('extracts uppercase initials properly', () => {
      expect(getInitials('Sarah Connor')).toBe('SC');
      expect(getInitials('Somchai')).toBe('SO');
      expect(getInitials('')).toBe('?');
    });

    it('formats relative timestamps', () => {
      const now = new Date().toISOString();
      expect(formatRelativeTime(now)).toBe('Just now');

      const oneHourAgo = new Date(Date.now() - 3600 * 1000).toISOString();
      expect(formatRelativeTime(oneHourAgo)).toBe('1h ago');
    });
  });

  describe('CommentCard Component', () => {
    it('renders author info, quote snippet, comment content, and replies', () => {
      const onSelect = jest.fn();
      const onResolve = jest.fn();
      const onReopen = jest.fn();
      const onDelete = jest.fn();
      const onEdit = jest.fn();
      const onReply = jest.fn();
      const onDeleteReply = jest.fn();
      const onEditReply = jest.fn();

      render(
        <CommentCard
          thread={mockThread}
          currentUser={mockUser}
          isActive={false}
          isEditor={true}
          onSelect={onSelect}
          onResolve={onResolve}
          onReopen={onReopen}
          onDelete={onDelete}
          onEdit={onEdit}
          onReply={onReply}
          onDeleteReply={onDeleteReply}
          onEditReply={onEditReply}
        />
      );

      // Verify author identity is displayed
      expect(screen.getByText('Dr. Somchai Dee')).toBeInTheDocument();
      expect(screen.getByText('@somchai')).toBeInTheDocument();

      // Verify highlighted text snippet
      expect(
        screen.getByText(/50mg hydrochlorothiazide once daily/i)
      ).toBeInTheDocument();

      // Verify comment content
      expect(
        screen.getByText(/Please confirm the clinical dosage recommendation/i)
      ).toBeInTheDocument();

      // Verify nested reply is rendered
      expect(
        screen.getByText(/Updated to standard 25mg initial dose/i)
      ).toBeInTheDocument();
      expect(screen.getByText('Dr. Sarah Connor')).toBeInTheDocument();
    });

    it('allows posting a reply to the thread', () => {
      const onReply = jest.fn();

      render(
        <CommentCard
          thread={mockThread}
          currentUser={mockUser}
          isActive={true}
          isEditor={true}
          onSelect={jest.fn()}
          onResolve={jest.fn()}
          onReopen={jest.fn()}
          onDelete={jest.fn()}
          onEdit={jest.fn()}
          onReply={onReply}
          onDeleteReply={jest.fn()}
          onEditReply={jest.fn()}
        />
      );

      // Click "Reply..." button to open reply composer
      const replyBtn = screen.getByRole('button', { name: /reply\.\.\./i });
      fireEvent.click(replyBtn);

      // Fill in reply textarea
      const textarea = screen.getByPlaceholderText(/reply to this thread/i);
      fireEvent.change(textarea, { target: { value: 'Agreed, will revise.' } });

      // Click Send Reply button
      const sendBtn = screen.getByRole('button', { name: /^reply$/i });
      fireEvent.click(sendBtn);

      expect(onReply).toHaveBeenCalledWith('comm_123', 'Agreed, will revise.');
    });

    it('allows marking a thread as resolved', () => {
      const onResolve = jest.fn();

      render(
        <CommentCard
          thread={mockThread}
          currentUser={mockUser}
          isActive={true}
          isEditor={true}
          onSelect={jest.fn()}
          onResolve={onResolve}
          onReopen={jest.fn()}
          onDelete={jest.fn()}
          onEdit={jest.fn()}
          onReply={jest.fn()}
          onDeleteReply={jest.fn()}
          onEditReply={jest.fn()}
        />
      );

      const resolveBtn = screen.getByTitle('Mark as resolved');
      fireEvent.click(resolveBtn);

      expect(onResolve).toHaveBeenCalledWith('comm_123');
    });

    it('renders resolved status and provides a re-open option', () => {
      const resolvedThread: CommentThread = {
        ...mockThread,
        status: 'resolved',
        resolvedBy: mockUser,
        resolvedAt: new Date().toISOString(),
      };

      const onReopen = jest.fn();

      render(
        <CommentCard
          thread={resolvedThread}
          currentUser={mockUser}
          isActive={false}
          isEditor={true}
          onSelect={jest.fn()}
          onResolve={jest.fn()}
          onReopen={onReopen}
          onDelete={jest.fn()}
          onEdit={jest.fn()}
          onReply={jest.fn()}
          onDeleteReply={jest.fn()}
          onEditReply={jest.fn()}
        />
      );

      // Check resolved banner
      expect(screen.getByText(/Resolved by/i)).toBeInTheDocument();
      expect(screen.getAllByText('Dr. Sarah Connor').length).toBeGreaterThanOrEqual(1);

      // Check re-open button
      const reopenBtn = screen.getByRole('button', { name: /re-open/i });
      fireEvent.click(reopenBtn);
      expect(onReopen).toHaveBeenCalledWith('comm_123');
    });
  });

  describe('CommentsSidebar Component', () => {
    it('filters between Open and Resolved comments and filters by search', () => {
      const resolvedThread: CommentThread = {
        ...mockThread,
        id: 'comm_456',
        content: 'Check references formatting.',
        status: 'resolved',
        resolvedBy: mockUser,
        resolvedAt: new Date().toISOString(),
      };

      render(
        <CommentsSidebar
          threads={[mockThread, resolvedThread]}
          currentUser={mockUser}
          isEditor={true}
          activeCommentId={null}
          pendingComment={null}
          onSelectComment={jest.fn()}
          onSubmitPendingComment={jest.fn()}
          onCancelPendingComment={jest.fn()}
          onResolve={jest.fn()}
          onReopen={jest.fn()}
          onDelete={jest.fn()}
          onEdit={jest.fn()}
          onReply={jest.fn()}
          onDeleteReply={jest.fn()}
          onEditReply={jest.fn()}
        />
      );

      // Initially on 'Open (1)' tab: open thread should be visible, resolved thread hidden
      expect(
        screen.getByText(/Please confirm the clinical dosage recommendation/i)
      ).toBeInTheDocument();
      expect(
        screen.queryByText(/Check references formatting/i)
      ).not.toBeInTheDocument();

      // Switch to 'Resolved (1)' tab
      const resolvedTabBtn = screen.getByRole('button', { name: /resolved \(1\)/i });
      fireEvent.click(resolvedTabBtn);

      expect(
        screen.getByText(/Check references formatting/i)
      ).toBeInTheDocument();
      expect(
        screen.queryByText(/Please confirm the clinical dosage recommendation/i)
      ).not.toBeInTheDocument();

      // Switch to 'All (2)' tab
      const allTabBtn = screen.getByRole('button', { name: /all \(2\)/i });
      fireEvent.click(allTabBtn);

      expect(
        screen.getByText(/Check references formatting/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Please confirm the clinical dosage recommendation/i)
      ).toBeInTheDocument();

      // Test search filter
      const searchInput = screen.getByPlaceholderText(/search comments/i);
      fireEvent.change(searchInput, { target: { value: 'dosage' } });

      expect(
        screen.getByText(/Please confirm the clinical dosage recommendation/i)
      ).toBeInTheDocument();
      expect(
        screen.queryByText(/Check references formatting/i)
      ).not.toBeInTheDocument();
    });

    it('renders pending comment composer when text is selected', () => {
      const onSubmitPending = jest.fn();
      const onCancelPending = jest.fn();

      render(
        <CommentsSidebar
          threads={[]}
          currentUser={mockUser}
          isEditor={true}
          activeCommentId={null}
          pendingComment={{ highlightedText: 'selected medical claim' }}
          onSelectComment={jest.fn()}
          onSubmitPendingComment={onSubmitPending}
          onCancelPendingComment={onCancelPending}
          onResolve={jest.fn()}
          onReopen={jest.fn()}
          onDelete={jest.fn()}
          onEdit={jest.fn()}
          onReply={jest.fn()}
          onDeleteReply={jest.fn()}
          onEditReply={jest.fn()}
        />
      );

      // Verify highlighted text preview is shown
      expect(screen.getByText(/selected medical claim/i)).toBeInTheDocument();

      // Type comment and post
      const textarea = screen.getByPlaceholderText(/add your review comment/i);
      fireEvent.change(textarea, { target: { value: 'Needs a peer-reviewed citation.' } });

      const commentBtn = screen.getByRole('button', { name: /comment/i });
      fireEvent.click(commentBtn);

      expect(onSubmitPending).toHaveBeenCalledWith('Needs a peer-reviewed citation.');
    });
  });
});
