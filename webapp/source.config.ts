import fs from 'node:fs';
import path from 'node:path';
import { buildTerminologyIndex } from './src/lib/terminology-index';
import { defineDocs, defineConfig } from 'fumadocs-mdx/config';
import { remarkThaiOMLLinker } from './src/lib/remark-thaioml-linker';
import { remarkCitations } from './src/lib/remark-citations';
import { pageSchema } from 'fumadocs-core/source/schema';
import { z } from 'zod';

const terminology = buildTerminologyIndex(path.resolve('content/docs'));
fs.mkdirSync('.source', { recursive: true });
const terminologyPath = path.resolve('.source/terminology.json');
const serializedTerminology = JSON.stringify(terminology);
if (!fs.existsSync(terminologyPath) || fs.readFileSync(terminologyPath, 'utf8') !== serializedTerminology) {
  fs.writeFileSync(terminologyPath, serializedTerminology);
}

export const { docs, meta } = defineDocs({
  dir: 'content/docs',
  docs: {
    schema: pageSchema.extend({
      id: z.union([z.string(), z.number()]).optional(),
      snomed_id: z.string().optional(),
      references: z.unknown().optional(),
      snomed_links: z.unknown().optional(),
    }),
  },
});

export default defineConfig({
  mdxOptions: {
    remarkPlugins: [remarkCitations, [remarkThaiOMLLinker, terminology, terminologyPath]],
  },
});
