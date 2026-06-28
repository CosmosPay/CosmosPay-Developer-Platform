import { generateOpenApiDocument } from '@/lib/openapi/document';
import { apiDocsEnabled } from '@/lib/api-docs';
import type { APIRoute } from 'astro';

export const GET: APIRoute = async () => {
  // The API reference is gated by environment (dev-only by default) — don't expose the spec in
  // production unless explicitly enabled (API_DOCS_ENABLED).
  if (!apiDocsEnabled) return new Response('Not found', { status: 404 });

  const document = generateOpenApiDocument();

  return new Response(JSON.stringify(document, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
};
