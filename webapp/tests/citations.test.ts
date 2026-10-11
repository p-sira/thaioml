import { citationGroups, citationErrors, numberReferences, validateCitationDocument } from '@/lib/citations';
import { remarkCitations } from '@/lib/remark-citations';
import type { Root } from 'mdast';

const references = [{ id: 'a', text: 'First source.' }, { id: 'b', text: 'Second source.' }, { id: 'unused', text: 'Additional reading.' }];

describe('Article citations', () => {
  it('recognizes groups and nested formatting, excluding escaped syntax, code, links and attributes', () => {
    const markdown = '- **Evidence [@b; @a; @b]** and [@b].\n\n\\[@literal] `[@code]` [label [@link]](https://example.org/[@url]) <span title="[@attribute]">text</span>\n\n![Image [@alt]](image.png) [@linked]\n\n[@linked]: https://example.org\n\n```\n[@fenced]\n```';
    expect(citationGroups(markdown)).toEqual([['b', 'a'], ['b']]);
    expect([...numberReferences(references, citationGroups(markdown))]).toEqual([['b', 1], ['a', 2], ['unused', 3]]);
  });

  it('rejects invalid reference records, duplicates, unsafe URLs and missing keys', () => {
    expect(citationErrors([{ id: 'a', text: '' }, { id: 'a', text: 'Other', url: 'javascript:alert(1)' }, { id: 'bad id', text: 'Invalid ID' }], [['missing']])).toEqual(expect.arrayContaining([
      'Reference 1 needs reference text.', 'Duplicate reference ID: a.', 'Reference 2 URL must be an absolute HTTP(S) URL.', 'Missing reference: missing.',
    ]));
    expect(() => validateCitationDocument('---\nreferences: invalid\n---\n[@missing]')).toThrow('references must be an array');
    expect(() => validateCitationDocument('Uncited legacy document.')).not.toThrow();
  });

  it('preserves literal escaped citations and generates numbered links and backlinks with safe text nodes', () => {
    const body = '\\[@literal] then [@b; @a] and [@b].';
    const source = `---\nreferences:\n  - id: a\n    text: '<script>alert(1)</script>'\n  - id: b\n    text: Second\n  - id: unused\n    text: Uncited\n---\n${body}`;
    const offset = source.indexOf(body);
    const tree: Root = { type: 'root', children: [{ type: 'paragraph', children: [{ type: 'text', value: body.slice(1), position: { start: { line: 11, column: 1, offset }, end: { line: 11, column: body.length + 1, offset: source.length } } }] }] };
    const transform = remarkCitations.call({} as never) as (tree: Root, file: unknown) => void;
    transform(tree, { value: source, data: {}, fail: (message: string) => { throw new Error(message); } });
    const output = JSON.stringify(tree);
    expect(output).toContain('[@literal] then ');
    expect(output).toContain('#reference-b');
    expect(output).toContain('#citation-3');
    expect(output).toContain('"value":"<script>alert(1)</script>"');
    expect(output.indexOf('"id":"reference-b"')).toBeLessThan(output.indexOf('"id":"reference-a"'));
    expect(output.indexOf('"id":"reference-a"')).toBeLessThan(output.indexOf('"id":"reference-unused"'));
  });

  it('uses Fumadocs metadata when YAML has been removed from the compiler input', () => {
    const body = 'Evidence [@a].';
    const tree: Root = { type: 'root', children: [{ type: 'paragraph', children: [{ type: 'text', value: body, position: { start: { line: 1, column: 1, offset: 0 }, end: { line: 1, column: body.length + 1, offset: body.length } } }] }] };
    const transform = remarkCitations.call({} as never) as (tree: Root, file: unknown) => void;
    transform(tree, { value: body, data: { frontmatter: { references } }, fail: (message: string) => { throw new Error(message); } });
    expect(JSON.stringify(tree)).toContain('#reference-a');
    expect(JSON.stringify(tree)).toContain('reference-unused');
  });
});
