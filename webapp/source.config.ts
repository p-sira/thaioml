import { defineDocs, defineConfig } from 'fumadocs-mdx/config';
import { remarkThaiOMLLinker } from './src/lib/remark-thaioml-linker';

export const { docs, meta } = defineDocs({
  dir: 'content/docs',
});

export default defineConfig({
  mdxOptions: {
    remarkPlugins: [remarkThaiOMLLinker],
  },
});
