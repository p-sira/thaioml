/** Shared, browser-safe terminology validation. IDs are always strings. */
export function conceptId(value: unknown): string | undefined {
  return typeof value === 'string' && /^\d+$/.test(value.trim()) ? value.trim() : undefined;
}

export function snomedLinkId(url: string): string | undefined {
  const match = /^snomed:(?:\/\/)?(\d+)$/i.exec(url);
  return match?.[1];
}

export function terminologyLinks(value: unknown): Record<string, string> {
  if (value === undefined) return {};
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('snomed_links must be a phrase-to-string map.');
  }
  const links: Record<string, string> = Object.create(null);
  for (const [phrase, target] of Object.entries(value)) {
    if (!phrase.trim() || typeof target !== 'string' || !conceptId(target.split('|')[0])) {
      throw new Error(`Invalid terminology mapping: ${phrase}.`);
    }
    links[phrase] = target;
  }
  return links;
}

export interface TerminologyConcept {
  id: string;
  label: string;
  article?: string;
  references: { url: string; title: string }[];
}

export type TerminologyIndex = Record<string, TerminologyConcept>;
