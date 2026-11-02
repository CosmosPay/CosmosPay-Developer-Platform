import { defineConfig, defineDocs } from 'fumadocs-mdx/config';
import { metaSchema, pageSchema } from 'fumadocs-core/source/schema';

// You can customize Zod schemas for frontmatter and `meta.json` here
// see https://fumadocs.dev/docs/mdx/collections
export const docs = defineDocs({
  dir: 'content/docs',
  docs: {
    // metaDescription: the search-result description, for a page whose `description` (the intro
    // under its title) runs longer or shorter than a result shows; src/lib/seo.ts prefers it. It
    // has description's own type: an optional string.
    schema: pageSchema.extend({ metaDescription: pageSchema.shape.description }),
    postprocess: {
      includeProcessedMarkdown: true,
    },
  },
  meta: {
    schema: metaSchema,
  },
});

export default defineConfig({
  mdxOptions: {
    // MDX options
  },
});
