'use client';
// `createOpenAPIPage` returns a client component (the API reference + playground UI).
// The schema itself is loaded server-side and passed in via the `preloaded` prop from
// `openapi.preloadOpenAPIPage(page)` in the docs page.
import { createOpenAPIPage } from 'fumadocs-openapi/ui';

export const OpenAPIPage = createOpenAPIPage();
