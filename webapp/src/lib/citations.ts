import MarkdownIt from 'markdown-it';
import type Token from 'markdown-it/lib/token';
import matter from 'gray-matter';

export interface ArticleReference {
  id: string;
  text: string;
  url?: string;
}

export const referenceIdPattern = /^[A-Za-z0-9][A-Za-z0-9_-]*$/;
const citationPattern = /^\[@([A-Za-z0-9][A-Za-z0-9_-]*)(?:\s*;\s*@[A-Za-z0-9][A-Za-z0-9_-]*)*\]/;
const installedParsers = new WeakSet<MarkdownIt>();

export function citationSyntax(ids: string[]): string {
  return `[${ids.map(id => `@${id}`).join('; ')}]`;
}

/** Install once per parser; normal Markdown rules handle escapes, code and links. */
export function installCitationRule(md: MarkdownIt) {
  if (installedParsers.has(md)) return;
  installedParsers.add(md);
  md.inline.ruler.after('link', 'thaioml_citation', (state, silent) => {
    // Link-label scanning must see balanced literal brackets, not a nested token.
    if (silent) return false;
    if ((state as typeof state & { linkLevel: number }).linkLevel > 0) return false;
    const match = citationPattern.exec(state.src.slice(state.pos));
    if (!match) return false;
    const token = state.push('thaioml_citation', '', 0);
    token.content = match[0];
    token.meta = [...new Set(match[0].slice(1, -1).split(';').map(key => key.trim().slice(1)))];
    state.pos += match[0].length;
    return true;
  });
  // Image alt text is plain text, so citation-shaped text stays literal there.
  md.core.ruler.after('inline', 'thaioml_citation_alt', state => {
    const walk = (tokens: Token[], inImage = false) => {
      for (const token of tokens) {
        if (inImage && token.type === 'thaioml_citation') token.type = 'text';
        if (token.children) walk(token.children, inImage || token.type === 'image');
      }
    };
    walk(state.tokens);
  });
}

export const citationMarkdown = new MarkdownIt({ html: true });
installCitationRule(citationMarkdown);

export function citationGroups(markdown: string): string[][] {
  const groups: string[][] = [];
  const walk = (tokens: Token[]) => {
    for (const token of tokens) {
      if (token.type === 'thaioml_citation') groups.push(token.meta as string[]);
      if (token.children) walk(token.children);
    }
  };
  walk(citationMarkdown.parse(markdown, {}));
  return groups;
}

export function referenceErrors(value: unknown): string[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) return ['references must be an array.'];
  const errors: string[] = [];
  const seen = new Set<string>();
  value.forEach((item, index) => {
    const label = `Reference ${index + 1}`;
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      errors.push(`${label} must be an object.`);
      return;
    }
    if (typeof item.id !== 'string' || !referenceIdPattern.test(item.id)) {
      errors.push(`${label} needs an ID using letters, digits, hyphens or underscores.`);
    } else if (seen.has(item.id)) {
      errors.push(`Duplicate reference ID: ${item.id}.`);
    } else seen.add(item.id);
    if (typeof item.text !== 'string' || !item.text.trim()) errors.push(`${label} needs reference text.`);
    if (item.url !== undefined) {
      try {
        if (typeof item.url !== 'string' || !['https:', 'http:'].includes(new URL(item.url).protocol)) throw new Error();
      } catch { errors.push(`${label} URL must be an absolute HTTP(S) URL.`); }
    }
  });
  return errors;
}

export function citationErrors(references: unknown, groups: string[][]): string[] {
  const errors = referenceErrors(references);
  const ids = new Set(Array.isArray(references) ? references.map(item => item?.id) : []);
  for (const id of new Set(groups.flat())) {
    if (!ids.has(id)) errors.push(`Missing reference: ${id}.`);
  }
  return errors;
}

export function numberReferences(references: ArticleReference[], groups: string[][]): Map<string, number> {
  const ids = [...new Set([...groups.flat(), ...references.map(reference => reference.id)])];
  return new Map(ids.map((id, index) => [id, index + 1]));
}

export function validateCitationDocument(content: string): void {
  const { data, content: body } = matter(content);
  const errors = citationErrors(data.references, citationGroups(body));
  if (errors.length) throw new Error(errors.join('\n'));
}
