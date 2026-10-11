import '@testing-library/jest-dom';
import { Editor as TiptapEditor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { Markdown, type MarkdownStorage } from 'tiptap-markdown';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import matter from 'gray-matter';
import { Citation, editorCitationGroups } from '@/components/cms/extensions/Citation';
import Editor from '@/components/cms/Editor';
import { saveMarkdownFile } from '@/app/actions/github';
import { autoLinkContent } from '@/app/actions/medical';

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('@/app/actions/github', () => ({ saveMarkdownFile: jest.fn().mockResolvedValue({ success: true }), moveMarkdownFile: jest.fn() }));
jest.mock('@/app/actions/medical', () => ({ autoLinkContent: jest.fn(), getSnomedSuggestion: jest.fn() }));

const source = '---\ntitle: Test\nreview_status: drafting\nreferences:\n  - id: a\n    text: First source\n  - id: b\n    text: Second source\ncomments: []\n---\n- Claim [@b; @a]. Repeat [@b].';

describe('Citation editor integration', () => {
  // jsdom has no layout engine; ProseMirror uses Range geometry when focusing.
  const rangeRects = Object.getOwnPropertyDescriptor(Range.prototype, 'getClientRects');
  const rangeBounds = Object.getOwnPropertyDescriptor(Range.prototype, 'getBoundingClientRect');
  beforeAll(() => {
    Object.defineProperty(Range.prototype, 'getClientRects', { configurable: true, value: () => [] });
    Object.defineProperty(Range.prototype, 'getBoundingClientRect', { configurable: true, value: () => new DOMRect() });
  });
  afterAll(() => {
    if (rangeRects) Object.defineProperty(Range.prototype, 'getClientRects', rangeRects);
    else Reflect.deleteProperty(Range.prototype, 'getClientRects');
    if (rangeBounds) Object.defineProperty(Range.prototype, 'getBoundingClientRect', rangeBounds);
    else Reflect.deleteProperty(Range.prototype, 'getBoundingClientRect');
  });
  beforeEach(() => jest.clearAllMocks());

  it('round-trips citation atoms, escaped text and code and derives live numbers', () => {
    const editor = new TiptapEditor({ extensions: [StarterKit, Markdown, Citation], content: '- Claim [@b; @a]. Repeat [@b]. Literal \\[@literal] and `[@code]`.\n\n[@linked]\n\n[@linked]: https://example.org' });
    expect(editorCitationGroups(editor.state.doc)).toEqual([['b', 'a'], ['b']]);
    const markdown = (editor.storage as unknown as { markdown: MarkdownStorage }).markdown.getMarkdown();
    expect(markdown).toContain('[@b; @a]');
    editor.commands.setContent(markdown);
    expect(editorCitationGroups(editor.state.doc)).toEqual([['b', 'a'], ['b']]);
    expect(editor.view.dom.querySelector('[data-citation-label]')).toHaveAttribute('data-citation-label', '[1, 2]');
    editor.commands.setContent('Reordered [@a]. Then [@b; @a].');
    expect(editor.view.dom.querySelectorAll('[data-citation-label]')[1]).toHaveAttribute('data-citation-label', '[2, 1]');
    editor.destroy();
  });

  it('manages references, protects cited sources, inserts citations and preserves frontmatter on save', async () => {
    render(<Editor initialContent={source} filePath="webapp/content/docs/editorial/test.md" />);
    await waitFor(() => expect(document.querySelector('[data-citation-ids]')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'References' }));
    expect(screen.getByRole('button', { name: 'Delete a' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Reference ID'), { target: { value: 'c' } });
    fireEvent.change(screen.getByLabelText('New reference text'), { target: { value: 'Third source' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add reference' }));
    fireEvent.click(screen.getByRole('checkbox', { name: /c \(uncited\)/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Insert citation' }));
    fireEvent.click(screen.getByRole('button', { name: /save to github/i }));
    await waitFor(() => expect(saveMarkdownFile).toHaveBeenCalled());
    const saved = matter(jest.mocked(saveMarkdownFile).mock.calls[0][1]);
    expect(saved.data.references.map((entry: { id: string }) => entry.id)).toEqual(['a', 'b', 'c']);
    expect(saved.data.comments).toEqual([]);
    expect(saved.data.review_status).toBe('drafting');
    expect(saved.content).toContain('[@c]');
  });

  it('saves auto-link mappings while preserving existing terminology and citation content', async () => {
    const alert = jest.spyOn(window, 'alert').mockImplementation(() => {});
    jest.mocked(autoLinkContent).mockResolvedValue({ body: 'Unexpected replacement', links: { Claim: '123 | Claim', Existing: '456 | Changed' } });
    render(<Editor initialContent={source.replace('comments: []', 'snomed_links:\n  Existing: "789 | Existing"\ncomments: []')} filePath="webapp/content/docs/editorial/test.md" />);
    fireEvent.click(await screen.findByRole('button', { name: /auto link/i }));
    await waitFor(() => expect(alert).toHaveBeenCalledWith(expect.stringContaining('Identified 2 medical terms')));
    fireEvent.click(screen.getByRole('button', { name: /save to github/i }));
    await waitFor(() => expect(saveMarkdownFile).toHaveBeenCalled());
    const saved = matter(jest.mocked(saveMarkdownFile).mock.calls[0][1]);
    expect(saved.data.snomed_links).toEqual({ Claim: '123 | Claim', Existing: '789 | Existing' });
    expect(saved.content).toContain('Claim [@b; @a]');
    expect(saved.content).not.toContain('Unexpected replacement');
    alert.mockRestore();
  });

  it('blocks saving a missing citation and locks reference controls during pitch', async () => {
    const view = render(<Editor initialContent={source.replace('[@b; @a]', '[@missing]')} filePath="webapp/content/docs/editorial/test.md" />);
    fireEvent.click(await screen.findByRole('button', { name: /save to github/i }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Missing reference: missing'));
    expect(saveMarkdownFile).not.toHaveBeenCalled();
    view.unmount();
    render(<Editor initialContent={source.replace('drafting', 'pitch')} filePath="webapp/content/docs/editorial/test.md" />);
    fireEvent.click(await screen.findByRole('button', { name: 'References' }));
    expect(screen.getByRole('button', { name: 'Add reference' })).toBeDisabled();
    expect(screen.getByLabelText('Reference ID')).toBeDisabled();
  });

  it('edits an existing citation through keyboard activation', async () => {
    render(<Editor initialContent={source} filePath="webapp/content/docs/editorial/test.md" />);
    const citation = await screen.findByRole('button', { name: 'Edit citation 1, 2' });
    fireEvent.keyDown(citation, { key: 'Enter' });
    const update = await screen.findByRole('button', { name: 'Update citation' });
    fireEvent.click(screen.getByRole('checkbox', { name: /a$/ }));
    fireEvent.click(update);
    fireEvent.click(screen.getByRole('button', { name: /save to github/i }));
    await waitFor(() => expect(saveMarkdownFile).toHaveBeenCalled());
    const saved = jest.mocked(saveMarkdownFile).mock.calls[0][1];
    expect(saved).not.toContain('[@b; @a]');
    expect(saved).toContain('[@b]');
  });
});
