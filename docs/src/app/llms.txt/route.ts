import { llmsIndex } from '@/lib/llms';

export const revalidate = false;

// The docs index for LLMs (llmstxt.org): "# Cosmos Pay Docs", a one-line summary, then every
// English page with its description. Translations are one line per language, not a second list.
export function GET() {
  return new Response(llmsIndex(), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
