import { getPageMarkdownUrl, source } from '@/lib/source';
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
  MarkdownCopyButton,
  ViewOptionsPopover,
} from 'fumadocs-ui/layouts/docs/page';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { notFound } from 'next/navigation';
import { getMDXComponents } from '@/components/mdx';
import type { Metadata } from 'next';
import { createRelativeLink } from 'fumadocs-ui/mdx';
import { gitConfig } from '@/lib/shared';
import { openapi } from '@/lib/openapi';
import { OpenAPIPage } from '@/components/api-page';
import { baseOptions } from '@/lib/layout.shared';
import { MobileSidebarTrigger } from '@/components/mobile-sidebar-trigger';
import { DOCS_LANGUAGES, DEFAULT_DOCS_LANGUAGE } from '@/lib/i18n-config';

// The route is a single optional catch-all. When the first segment is a (non-default) locale
// it selects the language; everything after it is the page slug. This keeps the default
// language at the unprefixed root (/docs/sdk/...) and other locales under /docs/<lang>/... ,
// which is what we need for a static export (no Next middleware to rewrite locales).
function parseParams(slug?: string[]): { lang: string; slug: string[] } {
  const segs = slug ?? [];
  if (segs.length && (DOCS_LANGUAGES as readonly string[]).includes(segs[0]) && segs[0] !== DEFAULT_DOCS_LANGUAGE) {
    return { lang: segs[0], slug: segs.slice(1) };
  }
  return { lang: DEFAULT_DOCS_LANGUAGE, slug: segs };
}

export default async function Page(props: PageProps<'/[[...slug]]'>) {
  const params = await props.params;
  const { lang, slug } = parseParams(params.slug);
  const page = source.getPage(slug, lang);
  if (!page) notFound();

  const MDX = page.data.body;
  const markdownUrl = getPageMarkdownUrl(page).url;

  // API reference pages carry an `_openapi` frontmatter block; load their schema(s)
  // server-side so the client <OpenAPIPage> renders without fetching at runtime.
  const isOpenAPI = Boolean((page.data as { _openapi?: unknown })._openapi);
  const preloaded = isOpenAPI ? await openapi.preloadOpenAPIPage(page) : null;

  // The sidebar/page tree is per-locale, so build it for the active language. The global
  // Cosmos navbar is rendered in the root layout, so Fumadocs' own top nav stays disabled.
  return (
    <DocsLayout tree={source.getPageTree(lang)} {...baseOptions()} nav={{ enabled: false }}>
      <MobileSidebarTrigger />
      <DocsPage toc={page.data.toc} full={page.data.full}>
        <DocsTitle>{page.data.title}</DocsTitle>
        <DocsDescription className="mb-0">{page.data.description}</DocsDescription>
        <div className="flex flex-row gap-2 items-center border-b pb-6">
          <MarkdownCopyButton markdownUrl={markdownUrl} />
          <ViewOptionsPopover
            markdownUrl={markdownUrl}
            githubUrl={`https://github.com/${gitConfig.user}/${gitConfig.repo}/blob/${gitConfig.branch}/content/docs/${page.path}`}
          />
        </div>
        <DocsBody>
          <MDX
            components={getMDXComponents({
              // this allows you to link to other pages with relative file paths
              a: createRelativeLink(source, page),
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              OpenAPIPage: (mdxProps: any) => <OpenAPIPage {...mdxProps} {...(preloaded ?? {})} />,
            })}
          />
        </DocsBody>
      </DocsPage>
    </DocsLayout>
  );
}

export async function generateStaticParams() {
  // Enumerate every language × page. The default language keeps its bare slug; other locales
  // are prefixed with their code so the exported paths match the URL scheme above.
  return source.generateParams().map(({ lang, slug }) =>
    lang === DEFAULT_DOCS_LANGUAGE ? { slug } : { slug: [lang, ...slug] },
  );
}

export async function generateMetadata(props: PageProps<'/[[...slug]]'>): Promise<Metadata> {
  const params = await props.params;
  const { lang, slug } = parseParams(params.slug);
  const page = source.getPage(slug, lang);
  if (!page) notFound();

  return {
    title: page.data.title,
    description: page.data.description,
  };
}
