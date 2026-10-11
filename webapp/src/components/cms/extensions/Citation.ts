import { Node, mergeAttributes } from '@tiptap/core';
import { Plugin } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import type { MarkdownNodeSpec } from 'tiptap-markdown';
import { citationSyntax, installCitationRule, numberReferences } from '@/lib/citations';

export function editorCitationGroups(doc: ProseMirrorNode): string[][] {
  const groups: string[][] = [];
  doc.descendants(node => {
    if (node.type.name === 'citation') groups.push(node.attrs.ids);
  });
  return groups;
}

export const Citation = Node.create({
  name: 'citation',
  inline: true,
  group: 'inline',
  atom: true,
  addAttributes() {
    return {
      ids: {
        default: [],
        parseHTML: element => (element.getAttribute('data-citation-ids') ?? '').split(';').filter(Boolean),
        renderHTML: attributes => ({ 'data-citation-ids': attributes.ids.join(';') }),
      },
    };
  },
  parseHTML() { return [{ tag: 'span[data-citation-ids]' }]; },
  renderHTML({ node, HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, { class: 'article-citation' }), citationSyntax(node.attrs.ids)];
  },
  addStorage() {
    const markdown: MarkdownNodeSpec = {
      serialize(state, node) { state.write(citationSyntax(node.attrs.ids)); },
      parse: {
        setup(md) {
          installCitationRule(md);
          md.renderer.rules.thaioml_citation = (tokens, index) => {
            const ids = tokens[index].meta as string[];
            return `<span data-citation-ids="${ids.join(';')}">${citationSyntax(ids)}</span>`;
          };
        },
      },
    };
    return { markdown };
  },
  addProseMirrorPlugins() {
    return [new Plugin({
      props: {
        decorations(state) {
          const numbers = numberReferences([], editorCitationGroups(state.doc));
          const decorations: Decoration[] = [];
          state.doc.descendants((node, pos) => {
            if (node.type.name === 'citation') decorations.push(Decoration.node(pos, pos + node.nodeSize, {
              'data-citation-label': `[${node.attrs.ids.map((id: string) => numbers.get(id)).join(', ')}]`,
              title: citationSyntax(node.attrs.ids),
              role: 'button',
              tabindex: '0',
              'aria-label': `Edit citation ${node.attrs.ids.map((id: string) => numbers.get(id)).join(', ')}`,
            }));
          });
          return DecorationSet.create(state.doc, decorations);
        },
      },
    })];
  },
});
