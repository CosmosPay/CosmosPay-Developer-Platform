'use client';
// `createOpenAPIPage` returns a client component (the API reference + playground UI).
// The schema itself is loaded server-side and passed in via the `preloaded` prop from
// `openapi.preloadOpenAPIPage(page)` in the docs page, reduced to the page's operations
// (lib/openapi-prune.ts).
//
// What the page writes into the exported HTML is kept small (each API page was 0.8 to 1.9 MB,
// close to Googlebot's 2 MB fetch limit): the schema UI renders each property's copy-link button
// after hydration (api/schema-ui.tsx), code blocks are written once (api/code-block.tsx), each
// response's schema mounts when its status is opened (api/responses.tsx) and the controls of the
// playground bar and the example cards render after hydration (api/operation-layout.tsx). What
// the server HTML keeps of every operation: its title, method and path, description,
// authorization, parameters, request body fields, response codes with their descriptions and
// its example request and response.
import { createOpenAPIPage } from 'fumadocs-openapi/ui';
import { Heading, type HeadingTag } from '@/components/heading';
import { ApiCodeBlock } from '@/components/api/code-block';
import { ExampleLayout, OperationLayout } from '@/components/api/operation-layout';
import { Schema } from '@/components/api/schema-ui';

export const OpenAPIPage = createOpenAPIPage({
  components: {
    // The operation and section headings through the docs' own <Heading>, whose copy-link
    // button is icon-only, so their text is the title alone (as in the MDX pages).
    Heading: ({ depth, ...props }) => <Heading as={`h${Math.min(Math.max(depth, 1), 6)}` as HeadingTag} {...props} />,
    CodeBlock: ApiCodeBlock,
    SchemaUI: Schema,
  },
  content: {
    renderOperationLayout: (slots, { method, path }) => <OperationLayout slots={slots} method={method} path={path} />,
    renderAPIExampleLayout: (slots) => <ExampleLayout slots={slots} />,
  },
});
