import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { visit, SKIP } from 'unist-util-visit';
import type { Plugin } from 'unified';
import type { PhrasingContent, Root } from 'mdast';

let snomedIndex: Record<string, string> | null = null;

function buildSnomedIndex(dir: string, baseDir: string, index: Record<string, string>) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (!fs.existsSync(fullPath)) continue;
    if (fs.statSync(fullPath).isDirectory()) {
      buildSnomedIndex(fullPath, baseDir, index);
    } else if (fullPath.endsWith('.md') || fullPath.endsWith('.mdx')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const { data } = matter(content);
      if (data.id) {
        let relativePath = path.relative(baseDir, fullPath).replace(/\\/g, '/');
        // Remove .md or .mdx extensions
        relativePath = relativePath.replace(/\.mdx?$/, '');
        // Remove index at the end if it exists
        if (relativePath.endsWith('/index')) {
          relativePath = relativePath.slice(0, -6);
        } else if (relativePath === 'index') {
          relativePath = '';
        }
        const url = `/${relativePath}`;
        index[String(data.id)] = url;
      }
    }
  }
}

function getSnomedIndex() {
  if (!snomedIndex) {
    snomedIndex = {};
    const contentDir = path.resolve(process.cwd(), 'content/docs');
    if (fs.existsSync(contentDir)) {
      buildSnomedIndex(contentDir, contentDir, snomedIndex);
    }
  }
  return snomedIndex;
}

export const remarkThaiOMLLinker: Plugin<[], Root> = () => {
  const index = getSnomedIndex();

  return (tree, file) => {
    // Fumadocs supplies validated metadata separately from the Markdown body.
    const frontmatter = (file.data.frontmatter ?? matter(String(file.value)).data) as Record<string, unknown>;
    
    if (!frontmatter || !frontmatter.snomed_links) return;

    const snomedLinks = frontmatter.snomed_links as Record<string, string>;
    if (typeof snomedLinks !== 'object') return;

    const terms = Object.keys(snomedLinks).sort((a, b) => b.length - a.length);
    if (!terms.length) return;

    // Escape regex characters
    const escapeRegExp = (string: string) => {
      return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    };

    const pattern = new RegExp(`\\b(${terms.map(escapeRegExp).join('|')})\\b`, 'g');

    visit(tree, (current, indexInParent, parent) => {
      if (['link', 'linkReference', 'heading', 'code', 'inlineCode'].includes(current.type) || (current.data && 'citationGenerated' in current.data)) return SKIP;
      if (current.type !== 'text') return;
      const node = current as import('mdast').Text;
      if (!parent) {
        return;
      }

      const matches = [...node.value.matchAll(pattern)];
      if (matches.length === 0) return;

      const newChildren: PhrasingContent[] = [];
      let lastIndex = 0;

      for (const match of matches) {
        const matchIndex = match.index!;
        const matchedTerm = match[0];

        // Add text before match
        if (matchIndex > lastIndex) {
          newChildren.push({
            type: 'text',
            value: node.value.slice(lastIndex, matchIndex),
          });
        }

        const snomedIdRaw = String(snomedLinks[matchedTerm]);
        const snomedId = snomedIdRaw.split('|')[0].trim();
        let url = index[snomedId];
        
        if (!url) {
          url = `/stub/${snomedId}`;
        }

        // Add link
        newChildren.push({
          type: 'link',
          url,
          children: [{ type: 'text', value: matchedTerm }],
        });

        lastIndex = matchIndex + matchedTerm.length;
      }

      // Add remaining text
      if (lastIndex < node.value.length) {
        newChildren.push({
          type: 'text',
          value: node.value.slice(lastIndex),
        });
      }

      // Replace node with new children
      if (indexInParent !== undefined) {
        parent.children.splice(indexInParent, 1, ...newChildren);
      }
      
      // return indexInParent + newChildren.length to avoid processing the newly inserted text nodes
      return indexInParent! + newChildren.length;
    });
  };
};
