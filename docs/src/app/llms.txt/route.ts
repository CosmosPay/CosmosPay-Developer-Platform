import { source } from '@/lib/source';
import { llms } from 'fumadocs-core/source';

export const revalidate = false;

export async function GET() {
  // Prefix the basePath (/docs) onto the relative links so they resolve when fetched.
  // `index()` returns a promise since fumadocs-core 16.15.13.
  const index = await llms(source).index();
  return new Response(index.replace(/\]\(\//g, '](/docs/'));
}
