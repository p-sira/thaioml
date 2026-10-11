import { defineDocs, defineConfig } from 'fumadocs-mdx/config';
import { remarkThaiOMLLinker } from './src/lib/remark-thaioml-linker';
import { remarkCitations } from './src/lib/remark-citations';
import { pageSchema } from 'fumadocs-core/source/schema';
import { z } from 'zod';

export const { docs, meta } = defineDocs({
  dir: 'content/docs',
  docs: {
    schema: pageSchema.extend({
      references: z.unknown().optional(),
      snomed_links: z.unknown().optional(),
    }),
  },
});

export default defineConfig({
  mdxOptions: {
    remarkPlugins: [remarkCitations, remarkThaiOMLLinker],
  },
});
