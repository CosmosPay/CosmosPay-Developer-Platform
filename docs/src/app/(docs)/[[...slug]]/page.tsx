import { contentLanguage, docsPath, getPageMarkdownUrl, isTranslation, pageLanguages, source } from '@/lib/source';
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
import { pruneOpenAPIDocument, type PrunedOperation, type PrunedWebhook } from '@/lib/openapi-prune';
import { OpenAPIPage } from '@/components/api-page';
import { baseOptions } from '@/lib/layout.shared';
import { MobileSidebarTrigger } from '@/components/mobile-sidebar-trigger';
import { LanguageLinks } from '@/components/language-links';
import { DEFAULT_DOCS_LANGUAGE, DOCS_LOCALE_ITEMS, splitLocale } from '@/lib/i18n-config';
import { DOCS_TRANSLATIONS } from '@/lib/docs-i18n';
import { pageJsonLd, pageMetadata, serializeJsonLd } from '@/lib/seo';

// The route is a single optional catch-all. When the first segment is a (non-default) locale
// it selects the language; everything after it is the page slug (see splitLocale).

export default async function Page(props: PageProps<'/[[...slug]]'>) {
  const params = await props.params;
  const { lang, slug } = splitLocale(params.slug);
  const page = source.getPage(slug, lang);
  if (!page) notFound();

  const MDX = page.data.body;
  const markdownUrl = getPageMarkdownUrl(page).url;
  const jsonLd = pageJsonLd(page);
  // An English page listed under a locale prefix (no translation yet): the chrome follows the
  // locale, the content is English, so the article says so for assistive tech and translators.
  const contentLang = isTranslation(page) ? undefined : contentLanguage(page);

  // Plain links to this page in the other languages it is written in: crawlable, unlike the
  // navbar's language picker, which navigates from script.
  const languageLinks = pageLanguages(slug)
    .filter((l) => l !== lang)
    .map((l) => ({
      lang: l,
      href: `/docs${docsPath(slug, l)}`,
      name: DOCS_LOCALE_ITEMS.find((item) => item.locale === l)?.name ?? l,
    }));
  const languagesLabel = DOCS_TRANSLATIONS[lang]?.['Choose a language(language switcher)'] ?? 'Choose a language';

  // API reference pages carry an `_openapi` frontmatter block; load their schema(s)
  // server-side so the client <OpenAPIPage> renders without fetching at runtime.
  const isOpenAPI = Boolean((page.data as { _openapi?: unknown })._openapi);
  const preloaded = isOpenAPI ? (await openapi.preloadOpenAPIPage(page)).preloaded : null;

  // The sidebar/page tree is per-locale, so build it for the active language. The global
  // Cosmos navbar is rendered in the root layout, so Fumadocs' own top nav stays disabled.
  // Sidebar links are not prefetched: on a static export every visible link fetched its RSC
  // payload up front (about 80 requests per page), and a click loads only the one it needs.
  return (
    <DocsLayout
      tree={source.getPageTree(lang)}
      {...baseOptions()}
      nav={{ enabled: false }}
      sidebar={{
        prefetch: false,
        footer: languageLinks.length ? <LanguageLinks label={languagesLabel} links={languageLinks} /> : undefined,
      }}
    >
      {jsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }} />}
      <MobileSidebarTrigger />
      <DocsPage toc={page.data.toc} full={page.data.full} lang={contentLang}>
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
              // The page's own operations, with their descriptions (fumadocs' generated pages
              // leave `showDescription` off, so the prose of every operation was missing).
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              OpenAPIPage: (mdxProps: any) => (
                <OpenAPIPage
                  {...mdxProps}
                  showDescription
                  {...(preloaded ? { preloaded: pagePreload(preloaded, mdxProps) } : {})}
                />
              ),
            })}
          />
        </DocsBody>
      </DocsPage>
    </DocsLayout>
  );
}

/**
 * The preloaded documents reduced to what the page renders: its document, with only its
 * operations and the components they reference (lib/openapi-prune.ts). Client props are
 * serialized into the HTML, and the whole API was most of every reference page.
 */
function pagePreload(
  preloaded: Awaited<ReturnType<typeof openapi.preloadOpenAPIPage>>['preloaded'],
  props: { document: string; operations?: PrunedOperation[]; webhooks?: PrunedWebhook[] },
) {
  const doc = preloaded.docs[props.document];
  if (!doc) return preloaded;
  return { ...preloaded, docs: { [props.document]: pruneOpenAPIDocument(doc, props) } };
}

export async function generateStaticParams() {
  // Enumerate every language × page. The default language keeps its bare slug; other locales
  // are prefixed with their code so the exported paths match the URL scheme above. Pages a
  // locale has no translation for are exported too (the localized sidebar links them), as
  // English copies that are noindex and canonical to the English page (lib/seo.ts).
  return source.generateParams().map(({ lang, slug }) =>
    lang === DEFAULT_DOCS_LANGUAGE ? { slug } : { slug: [lang, ...slug] },
  );
}

export async function generateMetadata(props: PageProps<'/[[...slug]]'>): Promise<Metadata> {
  const params = await props.params;
  const { lang, slug } = splitLocale(params.slug);
  const page = source.getPage(slug, lang);
  if (!page) notFound();

  return pageMetadata(page);
}
