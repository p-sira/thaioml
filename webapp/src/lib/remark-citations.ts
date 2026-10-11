import matter from 'gray-matter';
import type { Plugin } from 'unified';
import type { Root, Text, PhrasingContent, RootContent, Paragraph, Link } from 'mdast';
import type { Parent } from 'unist';
import { citationMarkdown, citationErrors, numberReferences, type ArticleReference } from './citations';

/** Produce ordinary static HTML through the MDX AST; reference text is never HTML. */
export const remarkCitations: Plugin<[], Root> = () => (tree, file) => {
  const source = String(file.value);
  const data = (file.data.frontmatter ?? matter(source).data) as Record<string, unknown>;
  const groups: string[][] = [];
  const occurrences = new Map<string, string[]>();
  let occurrence = 0;
  const pending: { node: Parent; ids: string[]; anchors: string[] }[] = [];

  function transform(parent: Parent) {
    if (['link', 'linkReference', 'code', 'inlineCode'].includes(parent.type)) return;
    parent.children = parent.children.flatMap(node => {
      if (node.type !== 'text') {
        if ('children' in node) transform(node as Parent);
        return [node];
      }
      const text = node as Text;
      const raw = source.slice(text.position?.start.offset, text.position?.end.offset);
      const tokens = citationMarkdown.parseInline(raw, {})[0]?.children ?? [];
      if (!tokens.some(token => token.type === 'thaioml_citation')) return [node];
      if (tokens.some(token => !['text', 'softbreak', 'thaioml_citation'].includes(token.type))) return [node];
      if (tokens.map(token => token.type === 'softbreak' ? '\n' : token.content).join('') !== text.value) return [node];
      return tokens.map(token => {
        if (token.type !== 'thaioml_citation') return { type: 'text', value: token.type === 'softbreak' ? '\n' : token.content } as Text;
        const ids = token.meta as string[];
        groups.push(ids);
        const anchors = ids.map(id => {
          const anchor = `citation-${++occurrence}`;
          occurrences.set(id, [...(occurrences.get(id) ?? []), anchor]);
          return anchor;
        });
        const sup = { type: 'mdxJsxTextElement', name: 'sup', attributes: [], data: { citationGenerated: true }, children: [] };
        pending.push({ node: sup, ids, anchors });
        return sup;
      });
    });
  }
  transform(tree);
  const errors = citationErrors(data.references, groups);
  if (errors.length) file.fail(errors.join('\n'));
  const references = (data.references ?? []) as ArticleReference[];
  if (!references.length) return;
  const numbers = numberReferences(references, groups);
  for (const { node, ids, anchors } of pending) {
    node.children = [
      { type: 'text', value: '[' } as Text,
      ...ids.flatMap((id, index) => {
        const link: Link = {
          type: 'link', url: `#reference-${id}`,
          data: { hProperties: { id: anchors[index], 'aria-label': `Reference ${numbers.get(id)}` } },
          children: [{ type: 'text', value: String(numbers.get(id)) }],
        };
        return index ? [{ type: 'text', value: ', ' } as Text, link] : [link];
      }),
      { type: 'text', value: ']' } as Text,
    ];
  }
  const sorted = [...references].sort((a, b) => numbers.get(a.id)! - numbers.get(b.id)!);
  tree.children.push(
    { type: 'heading', depth: 2, data: { hProperties: { id: 'article-references' } }, children: [{ type: 'text', value: 'References' }] },
    { type: 'list', ordered: true, start: 1, spread: false, data: { citationGenerated: true }, children: sorted.map(reference => {
      const children: PhrasingContent[] = [{ type: 'text', value: reference.text }];
      if (reference.url) children.push({ type: 'text', value: ' ' }, { type: 'link', url: reference.url, children: [{ type: 'text', value: 'Source' }] });
      (occurrences.get(reference.id) ?? []).forEach((anchor, index) => children.push(
        { type: 'text', value: ' ' },
        { type: 'link', url: `#${anchor}`, data: { hProperties: { 'aria-label': `Back to citation ${index + 1} of reference ${numbers.get(reference.id)}` } }, children: [{ type: 'text', value: `↩${index + 1}` }] },
      ));
      return { type: 'listItem', spread: false, data: { hProperties: { id: `reference-${reference.id}` } }, children: [{ type: 'paragraph', children } as Paragraph] };
    }) } as RootContent,
  );
};
