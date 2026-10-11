/** @jest-environment node */
import type { Root } from 'mdast';
import { remarkThaiOMLLinker } from '@/lib/remark-thaioml-linker';

const index = { '123': { id: '123', label: 'Target', article: '/articles/target', references: [] } };
function transform(tree: Root, frontmatter: Record<string, unknown> = {}) {
  const run = remarkThaiOMLLinker.call({} as never, index) as (tree: Root, file: unknown) => void;
  run(tree, { value: '', data: { frontmatter } });
  return JSON.stringify(tree);
}

it('resolves authored protocols and reference links without requiring a mapping', () => {
  const tree: Root = { type: 'root', children: [
    { type: 'heading', depth: 2, children: [{ type: 'link', url: 'snomed:123', children: [{ type: 'text', value: 'Target' }] }] },
    { type: 'paragraph', children: [{ type: 'link', url: 'snomed://456', children: [{ type: 'text', value: 'Missing' }] }] },
    { type: 'definition', identifier: 'term', url: 'snomed:123' },
  ] };
  const output = transform(tree);
  expect(output).toContain('/articles/target');
  expect(output).toContain('/stub/456');
  expect(output).not.toContain('snomed:');
});

it('matches longest phrases and Unicode boundaries while excluding self, headings, code and links', () => {
  const tree: Root = { type: 'root', children: [
    { type: 'heading', depth: 2, children: [{ type: 'text', value: 'Target' }] },
    { type: 'paragraph', children: [
      { type: 'text', value: 'Target disease Target Targets โรคเบาหวาน Self ' },
      { type: 'inlineCode', value: 'Target' },
      { type: 'link', url: '/existing', children: [{ type: 'text', value: 'Target' }] },
    ] },
    { type: 'paragraph', data: { citationGenerated: true } as never, children: [{ type: 'text', value: 'Target' }] },
  ] };
  const output = transform(tree, { snomed_id: '789', snomed_links: { Target: '123 | Target', 'Target disease': '456 | Missing', โรคเบาหวาน: '123 | Target', Self: '789 | Self' } });
  expect(output.match(/\/articles\/target/g)).toHaveLength(2);
  expect(output.match(/\/stub\/456/g)).toHaveLength(1);
  expect(output).not.toContain('/stub/789');
  expect(output).toContain('Targets');
  expect(output).toContain('/existing');
});

it('rejects unsafe or malformed authored concept links', () => {
  const tree: Root = { type: 'root', children: [{ type: 'paragraph', children: [{ type: 'link', url: 'snomed:../../secret', children: [] }] }] };
  expect(() => transform(tree)).toThrow('Invalid SNOMED link');
});
