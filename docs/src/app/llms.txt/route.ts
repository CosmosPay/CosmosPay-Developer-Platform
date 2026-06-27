import { source } from '@/lib/source';
import { llms } from 'fumadocs-core/source';

export const revalidate = false;

export function GET() {
  // Prefix the basePath (/docs) onto the relative links so they resolve when fetched.
  return new Response(llms(source).index().replace(/\]\(\//g, '](/docs/'));
}
