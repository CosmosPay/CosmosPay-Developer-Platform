import { readOpenAPIDocument } from '@/lib/openapi-markdown';

export const revalidate = false;

// The Payments API's OpenAPI document (docs/openapi.json, the one the API reference renders),
// published with the export at /docs/openapi.json so agents and tools can read the contract.
export function GET() {
  return new Response(`${JSON.stringify(readOpenAPIDocument(), null, 2)}\n`, {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
