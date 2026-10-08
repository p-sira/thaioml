import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Editor from '@/components/cms/Editor';
import * as githubActions from '@/app/actions/github';

// Mock useRouter
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

// Mock GitHub server actions
jest.mock('@/app/actions/github', () => ({
  saveMarkdownFile: jest.fn().mockResolvedValue({ success: true }),
  moveMarkdownFile: jest.fn().mockResolvedValue({ success: true }),
}));

// Mock medical actions
jest.mock('@/app/actions/medical', () => ({
  autoLinkContent: jest.fn().mockResolvedValue('Updated markdown'),
  getSnomedSuggestion: jest.fn().mockResolvedValue({ id: '38341003', name: 'Hypertension' }),
}));

describe('Editor Component Integration', () => {
  const sampleMarkdown = `---
title: "Management of Essential Hypertension"
snomed_id: "38341003"
abstract: "Clinical guideline summary"
review_status: drafting
active_author: "author_dr_somchai"
comments:
  - id: "comment_test_1"
    createdAt: "2026-10-08T10:00:00.000Z"
    author:
      id: "usr_rev_1"
      name: "Dr. Reviewer"
      username: "reviewer1"
    content: "Consider adding renal function contraindications."
    highlightedText: "ACE inhibitors first-line"
    status: "open"
    resolvedBy: null
    resolvedAt: null
    replies: []
---

# Management of Essential Hypertension

For stage 1 hypertension, <mark data-comment-id="comment_test_1">ACE inhibitors first-line</mark> therapy is indicated.
`;

  const mockCurrentUser = {
    id: 'user_editor_sira',
    name: 'Sira Editor',
    username: 'p-sira',
    avatar: 'https://example.com/avatar.jpg',
    role: 'editor',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the editor toolbar, content area, and comments sidebar with existing comments', async () => {
    render(
      <Editor
        initialContent={sampleMarkdown}
        filePath="guidelines/hypertension.md"
        isEditor={true}
        currentUser={mockCurrentUser}
      />
    );

    // Verify main toolbar buttons
    expect(screen.getByTitle(/Undo/i)).toBeInTheDocument();
    expect(screen.getByTitle(/Bold/i)).toBeInTheDocument();
    expect(screen.getByTitle(/Heading 1/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save to github/i })).toBeInTheDocument();

    // Verify comment is displayed in sidebar
    expect(
      screen.getByText(/Consider adding renal function contraindications/i)
    ).toBeInTheDocument();
    expect(screen.getByText('Dr. Reviewer')).toBeInTheDocument();
    expect(screen.getAllByText(/ACE inhibitors first-line/i).length).toBe(2);

    // Verify word count & active user footer
    expect(screen.getByText(/Signed in as/i)).toBeInTheDocument();
    expect(screen.getByText('Sira Editor')).toBeInTheDocument();
  });

  it('switches between Comments and Metadata sidebar tabs', async () => {
    render(
      <Editor
        initialContent={sampleMarkdown}
        filePath="guidelines/hypertension.md"
        isEditor={true}
        currentUser={mockCurrentUser}
      />
    );

    // Click Metadata tab
    const metadataTabBtn = screen.getByRole('button', { name: /metadata/i });
    fireEvent.click(metadataTabBtn);

    // Verify metadata fields are displayed
    expect(screen.getByDisplayValue('Management of Essential Hypertension')).toBeInTheDocument();
    expect(screen.getByDisplayValue('38341003')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Clinical guideline summary')).toBeInTheDocument();

    // Switch back to Comments tab
    const commentsTabBtn = screen.getByRole('button', { name: /comments/i });
    fireEvent.click(commentsTabBtn);

    expect(
      screen.getByText(/Consider adding renal function contraindications/i)
    ).toBeInTheDocument();
  });

  it('resolves a comment and updates frontmatter when saved to GitHub', async () => {
    render(
      <Editor
        initialContent={sampleMarkdown}
        filePath="guidelines/hypertension.md"
        isEditor={true}
        currentUser={mockCurrentUser}
      />
    );

    // Click resolve on the existing comment
    const resolveBtn = screen.getByTitle('Mark as resolved');
    fireEvent.click(resolveBtn);

    // Click Save to GitHub
    const saveBtn = screen.getByRole('button', { name: /save to github/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(githubActions.saveMarkdownFile).toHaveBeenCalledTimes(1);
    });

    const [savedPath, savedContent] = (githubActions.saveMarkdownFile as jest.Mock).mock.calls[0];
    expect(savedPath).toBe('guidelines/hypertension.md');
    // Verify comment status is marked as resolved in saved markdown frontmatter
    expect(savedContent).toContain('status: resolved');
    expect(savedContent).toContain('Sira Editor');
  });

  it('collapses and expands the sidebar', async () => {
    render(
      <Editor
        initialContent={sampleMarkdown}
        filePath="guidelines/hypertension.md"
        isEditor={true}
        currentUser={mockCurrentUser}
      />
    );

    const toggleSidebarBtn = screen.getByTitle('Collapse Sidebar');
    fireEvent.click(toggleSidebarBtn);

    // Comments tab should be hidden when collapsed
    expect(screen.queryByPlaceholderText(/search comments/i)).not.toBeInTheDocument();

    // Re-expand sidebar
    const expandSidebarBtn = screen.getByTitle('Expand Sidebar');
    fireEvent.click(expandSidebarBtn);

    expect(screen.getByPlaceholderText(/search comments/i)).toBeInTheDocument();
  });
});
