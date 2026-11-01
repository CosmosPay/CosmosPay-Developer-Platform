import { llmsSection } from '@/lib/llms';

export const revalidate = false;

// One part of /docs/llms-full.txt (src/lib/llms.ts LLMS_SECTIONS), for assistants whose context
// cannot take the whole file.
export async function GET() {
  return new Response(await llmsSection('api'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
