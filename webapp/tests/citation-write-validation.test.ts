import { saveMarkdownFile, moveMarkdownFile } from '@/app/actions/github';
import { Octokit } from 'octokit';
import { currentUser } from '@clerk/nextjs/server';

jest.mock('octokit', () => ({ Octokit: jest.fn() }));
jest.mock('@clerk/nextjs/server', () => ({ currentUser: jest.fn() }));

describe('Citation validation before GitHub writes', () => {
  it('rejects invalid content before either save or publish can have external side effects', async () => {
    const invalid = '---\ntitle: Invalid\nreferences:\n  - id: x\n    text: Source\n    url: javascript:alert(1)\n---\n[@missing]';
    await expect(saveMarkdownFile('webapp/content/docs/editorial/test.md', invalid, 'Save')).rejects.toThrow('Missing reference: missing');
    await expect(moveMarkdownFile('webapp/content/docs/editorial/test.md', 'webapp/content/docs/articles/test.md', invalid, 'Publish')).rejects.toThrow('URL must be an absolute HTTP(S) URL');
    expect(Octokit).not.toHaveBeenCalled();
    expect(currentUser).not.toHaveBeenCalled();
  });
});
