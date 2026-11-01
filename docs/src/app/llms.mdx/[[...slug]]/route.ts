import { notFound } from 'next/navigation';
import { getLLMText } from '@/lib/llms';
import { getPageMarkdownUrl, isTranslation, source } from '@/lib/source';
import { splitLocale } from '@/lib/i18n-config';

export const revalidate = false;

// One page as Markdown: /docs/llms.mdx/<slug>/content.md, and /docs/llms.mdx/<lang>/<slug>/
// content.md for a real translation (an English fallback copy has none: it points at the
// English page's).
export async function GET(_req: Request, { params }: RouteContext<'/llms.mdx/[[...slug]]'>) {
  const { slug } = await params;
  // remove the appended "content.md"
  const { lang, slug: pageSlug } = splitLocale(slug?.slice(0, -1));
  const page = source.getPage(pageSlug, lang);
  if (!page || !isTranslation(page)) notFound();

  return new Response(await getLLMText(page), {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
    },
  });
}

export function generateStaticParams() {
  return source
    .getLanguages()
    .flatMap(({ pages }) => pages)
    .filter(isTranslation)
    .map((page) => ({ slug: getPageMarkdownUrl(page).segments }));
}
