import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import MarkdownIt from 'markdown-it';
import { conceptId, snomedLinkId, terminologyLinks, type TerminologyIndex } from './terminology';

/** Build-only: never shipped as a filesystem dependency of public pages. */
export function buildTerminologyIndex(contentDir: string): TerminologyIndex {
  const index: TerminologyIndex = Object.create(null);
  const parser = new MarkdownIt();
  const files: string[] = [];
  const collect = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      // Editorial drafts must never become public destinations or stub references.
      if (entry.name === 'editorial') continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) collect(fullPath);
      else if (/\.mdx?$/.test(entry.name)) files.push(fullPath);
    }
  };
  collect(contentDir);

  for (const file of files) {
    const { data, content } = matter(fs.readFileSync(file, 'utf8'));
    const relative = path.relative(contentDir, file).replace(/\\/g, '/').replace(/\.mdx?$/, '');
    const url = `/${relative.replace(/(^|\/)index$/, '')}`.replace(/\/$/, '') || '/';
    const title = String(data.title || relative);
    const ownId = conceptId(String(data.snomed_id ?? data.id ?? ''));
    if (ownId && relative.startsWith('articles/')) {
      const existing = index[ownId];
      if (existing?.article && existing.article !== url) {
        throw new Error(`Duplicate concept ${ownId}: ${existing.article} and ${url}.`);
      }
      index[ownId] = { id: ownId, label: title, references: existing?.references ?? [], article: url };
    }
    const addReference = (id: string, label: string) => {
      if (id === ownId) return;
      const concept = index[id] ??= { id, label: label || `SNOMED CT ${id}`, references: [] };
      if (!concept.references.some(reference => reference.url === url)) concept.references.push({ url, title });
    };
    for (const [phrase, target] of Object.entries(terminologyLinks(data.snomed_links))) {
      const [rawId, ...label] = target.split('|');
      addReference(conceptId(rawId)!, label.join('|').trim() || phrase);
    }
    for (const block of parser.parse(content, {})) {
      const tokens = block.children ?? [];
      for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        if (token.type !== 'link_open') continue;
        const id = snomedLinkId(token.attrGet('href') ?? '');
        if (!id) continue;
        let label = '';
        for (let j = i + 1; j < tokens.length && tokens[j].type !== 'link_close'; j++) {
          if (tokens[j].type === 'text' || tokens[j].type === 'code_inline') label += tokens[j].content;
        }
        addReference(id, label);
      }
    }
  }
  return index;
}
