'use client';
// `createOpenAPIPage` returns a client component (the API reference + playground UI).
// The schema itself is loaded server-side and passed in via the `preloaded` prop from
// `openapi.preloadOpenAPIPage(page)` in the docs page.
import { createOpenAPIPage } from 'fumadocs-openapi/ui';
import { Heading, type HeadingTag } from '@/components/heading';

export const OpenAPIPage = createOpenAPIPage({
  components: {
    // The operation and section headings through the docs' own <Heading>, whose copy-link
    // button is icon-only, so their text is the title alone (as in the MDX pages).
    Heading: ({ depth, ...props }) => <Heading as={`h${Math.min(Math.max(depth, 1), 6)}` as HeadingTag} {...props} />,
  },
});
