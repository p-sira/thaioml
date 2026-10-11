/** @jest-environment node */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildTerminologyIndex } from '@/lib/terminology-index';
import { terminologyLinks } from '@/lib/terminology';

describe('Build-time terminology index', () => {
  let dir: string;
  beforeEach(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'thaioml-terms-')); });
  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));
  function article(name: string, body: string) {
    const file = path.join(dir, name);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, body);
  }

  it('indexes both ID formats, creates referenced stubs, and excludes editorial drafts', () => {
    article('articles/legacy.md', '---\nid: "123"\ntitle: Legacy\nsnomed_links:\n  Missing: "456 | Missing concept"\n---\nMissing and [Manual](snomed://789).');
    article('articles/current.md', '---\nsnomed_id: "321"\ntitle: Current\n---\nCurrent');
    article('editorial/draft.md', '---\nsnomed_id: "456"\nsnomed_links:\n  Secret: "999 | Secret"\n---\nSecret');
    article('guidelines/index.md', '---\ntitle: Guidelines\n---\n[Manual][term]\n\n[term]: snomed:789\n\n`[Code](snomed:999)`');
    const index = buildTerminologyIndex(dir);
    expect(index['123'].article).toBe('/articles/legacy');
    expect(index['321'].article).toBe('/articles/current');
    expect(index['456']).toEqual({ id: '456', label: 'Missing concept', references: [{ url: '/articles/legacy', title: 'Legacy' }] });
    expect(index['789'].references).toHaveLength(2);
    expect(index['999']).toBeUndefined();
  });

  it('resolves a stub to a subsequently published article without changing referring content', () => {
    article('articles/source.md', '---\ntitle: Source\nsnomed_links:\n  Target: "456 | Target"\n---\nTarget');
    expect(buildTerminologyIndex(dir)['456'].article).toBeUndefined();
    article('articles/target.md', '---\ntitle: Target\nsnomed_id: "456"\n---\nTarget');
    expect(buildTerminologyIndex(dir)['456'].article).toBe('/articles/target');
  });

  it('rejects duplicate concept destinations and invalid mappings', () => {
    article('articles/a.md', '---\nid: "123"\n---\nA');
    article('articles/b.md', '---\nsnomed_id: "123"\n---\nB');
    expect(() => buildTerminologyIndex(dir)).toThrow('Duplicate concept');
    for (const value of [null, [], 'bad', { term: 'javascript:alert(1)' }, { term: 123 }]) {
      expect(() => terminologyLinks(value)).toThrow();
    }
  });
});
