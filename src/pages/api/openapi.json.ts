import { generateOpenApiDocument } from '@/lib/openapi/document';
import type { APIRoute } from 'astro';

export const GET: APIRoute = async () => {
  const document = generateOpenApiDocument();

  return new Response(JSON.stringify(document, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
};
