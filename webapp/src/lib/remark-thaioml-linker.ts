import matter from 'gray-matter';
import { visit, SKIP } from 'unist-util-visit';
import type { Plugin } from 'unified';
import type { PhrasingContent, Root } from 'mdast';
import { conceptId, snomedLinkId, terminologyLinks, type TerminologyIndex } from './terminology';

export const remarkThaiOMLLinker: Plugin<[TerminologyIndex, string?], Root> = (index, manifestPath) => {
  const destination = (id: string) => index[id]?.article ?? `/stub/${id}`;
  return (tree, file) => {
    // Destinations may change while this article's Markdown stays unchanged.
    const compiler = file.data._compiler as { addDependency?: (path: string) => void } | undefined;
    if (manifestPath) compiler?.addDependency?.(manifestPath);
    const frontmatter = (file.data.frontmatter ?? matter(String(file.value)).data) as Record<string, unknown>;
    const ownId = conceptId(String(frontmatter.snomed_id ?? frontmatter.id ?? ''));
    const links = terminologyLinks(frontmatter.snomed_links);
    const terms = Object.keys(links).filter(term => conceptId(links[term].split('|')[0]) !== ownId).sort((a, b) => b.length - a.length);
    const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Unicode boundaries also support Thai and phrases ending in punctuation.
    const pattern = terms.length ? new RegExp(`(?<![\\p{L}\\p{N}_])(${terms.map(escapeRegExp).join('|')})(?![\\p{L}\\p{N}_])`, 'gu') : undefined;

    // Resolve authored links even inside headings; exclusions below apply to auto-linking.
    visit(tree, current => {
      if (current.type !== 'link' && current.type !== 'definition') return;
      const id = snomedLinkId(current.url);
      if (id) current.url = destination(id);
      else if (/^snomed:/i.test(current.url)) throw new Error(`Invalid SNOMED link: ${current.url}.`);
    });
    visit(tree, (current, position, parent) => {
      if (['link', 'linkReference', 'heading', 'code', 'inlineCode', 'image', 'html'].includes(current.type) || current.data && 'citationGenerated' in current.data) return SKIP;
      if (current.type !== 'text' || !parent || position === undefined || !pattern) return;
      const matches = [...current.value.matchAll(pattern)];
      if (!matches.length) return;
      const children: PhrasingContent[] = [];
      let end = 0;
      for (const match of matches) {
        const start = match.index!;
        if (start > end) children.push({ type: 'text', value: current.value.slice(end, start) });
        children.push({ type: 'link', url: destination(conceptId(links[match[0]].split('|')[0])!), children: [{ type: 'text', value: match[0] }] });
        end = start + match[0].length;
      }
      if (end < current.value.length) children.push({ type: 'text', value: current.value.slice(end) });
      parent.children.splice(position, 1, ...children);
      return position + children.length;
    });
  };
};
