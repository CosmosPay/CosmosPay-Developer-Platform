import { llmsFull } from '@/lib/llms';

export const revalidate = false;

// Every English page in one file, the API reference rendered from openapi.json. The translated
// pages are left out: they repeat the English content and have their own content.md.
export async function GET() {
  return new Response(await llmsFull(), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
