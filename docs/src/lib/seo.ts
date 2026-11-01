import type { Metadata } from 'next';
import { appName, docsOrigin, ogImage } from '@/lib/shared';
import { DEFAULT_DOCS_LANGUAGE, type DocsLanguage } from '@/lib/i18n-config';
import {
  canonicalUrl,
  contentLanguage,
  docsUrl,
  type DocsPage,
  isTranslation,
  markdownPageUrl,
  pageLanguages,
  source,
} from '@/lib/source';
import { pageJsonLdDates } from '@/lib/last-modified';
// The company's entities as the portal builds them (copied from ../src by scripts/sync-portal-ui.mjs):
// the same builders and the same data, so each node is identical wherever it is published.
import { apiNode, organizationNode, orgId, sameAsProfiles, sdkNode } from '@/lib/seo/schema';
import { SITE, SOCIAL } from '@/components/cosmos/lib/constants';
import { API_BASE } from '@/lib/payments/urls';

// Search and social metadata for every docs page: the title, the canonical URL, hreflang
// between a page and its real translations, the Markdown alternate, Open Graph / Twitter and
// the JSON-LD graph. English fallback copies under a locale prefix are noindex and canonical to
// the English page (see isTranslation in lib/source.ts).

/** Open Graph locale per docs language (the portal's OG_LOCALES in src/lib/payments/seo.ts). */
const OG_LOCALES: Record<DocsLanguage, string> = {
  en: 'en_US',
  es: 'es_LA',
  pt: 'pt_BR',
  fr: 'fr_FR',
  de: 'de_DE',
};

/** A title two pages of one language share gets its section: the sidebar's separators in
 *  content/docs/meta.json ("SDK", "REST API"), e.g. "Webhooks | SDK" and "Webhooks | REST API". */
const SECTION_LABELS: Record<string, string> = { sdk: 'SDK', api: 'REST API' };

// The company's Organization (https://cosmospay.lat/#organization), defined on every docs page that
// carries a graph, as cosmospay.lat and payments.cosmospay.lat define it: built by the portal's
// organizationNode from the same profiles (SOCIAL), so a parser reading one page resolves it and
// merging the hosts' graphs finds one set of values. The Payments API and the SDK are the
// portal's nodes too (apiNode, sdkNode), never a docs variant of them.
const ORGANIZATION_NODE = organizationNode(SITE, sameAsProfiles(SOCIAL));
const ORGANIZATION = { '@id': orgId(SITE) };
const WEBSITE_URL = `${docsOrigin}/`;
const WEBSITE_ID = `${WEBSITE_URL}#website`;
const API_NODE = apiNode({ site: SITE, docs: WEBSITE_URL, apiBase: API_BASE });
const SDK_NODE = sdkNode(SITE);
const API_ID = API_NODE['@id'] as string;
const SDK_ID = SDK_NODE['@id'] as string;

let titleCounts: Map<string, Map<string, number>> | undefined;

function sharedTitleCount(title: string, lang: string): number {
  if (!titleCounts) {
    titleCounts = new Map();
    for (const { language, pages } of source.getLanguages()) {
      const counts = new Map<string, number>();
      for (const page of pages) counts.set(page.data.title, (counts.get(page.data.title) ?? 0) + 1);
      titleCounts.set(language, counts);
    }
  }
  return titleCounts.get(lang)?.get(title) ?? 0;
}

/** The page's <title> before the " | Cosmos Pay Docs" template: unique within its language. */
export function pageTitle(page: DocsPage): string {
  const title = page.data.title;
  const section = SECTION_LABELS[page.slugs[0]];
  if (section && sharedTitleCount(title, page.locale ?? DEFAULT_DOCS_LANGUAGE) > 1) return `${title} | ${section}`;
  return title;
}

function alternateLanguages(slugs: string[]): Record<string, string> | undefined {
  const languages = pageLanguages(slugs);
  if (languages.length < 2) return undefined;
  return {
    ...Object.fromEntries(languages.map((lang) => [lang, docsUrl(slugs, lang)])),
    'x-default': docsUrl(slugs, DEFAULT_DOCS_LANGUAGE),
  };
}

export function pageMetadata(page: DocsPage): Metadata {
  const translated = isTranslation(page);
  const lang = contentLanguage(page);
  const title = pageTitle(page);
  const fullTitle = `${title} | ${appName}`;
  const description = page.data.description;
  const url = canonicalUrl(page);
  const languages = translated ? alternateLanguages(page.slugs) : undefined;

  return {
    title,
    description,
    alternates: {
      canonical: url,
      languages,
      types: { 'text/markdown': markdownPageUrl(page) },
    },
    robots: translated ? undefined : { index: false, follow: true },
    openGraph: {
      type: page.slugs.length ? 'article' : 'website',
      siteName: appName,
      title: fullTitle,
      description,
      url,
      locale: OG_LOCALES[lang],
      alternateLocale: languages
        ? pageLanguages(page.slugs).filter((l) => l !== lang).map((l) => OG_LOCALES[l])
        : undefined,
      images: [ogImage],
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      images: [ogImage.url],
    },
  };
}

type JsonLd = Record<string, unknown>;

const website: JsonLd = {
  '@type': 'WebSite',
  '@id': WEBSITE_ID,
  name: appName,
  url: WEBSITE_URL,
  inLanguage: ['en', 'es', 'pt', 'fr', 'de'],
  publisher: ORGANIZATION,
};

/** Docs > every ancestor that is a page of its own (a folder with an index, e.g. the API
 *  reference) > the page. Folders without a page have no URL to point at, so they are left out.
 *  The docs home is the trail's root alone, the crumb every other page starts from. */
function breadcrumb(page: DocsPage, url: string): JsonLd {
  const lang = contentLanguage(page);
  const items: { name: string; item?: string }[] = [{ name: appName, item: docsUrl([], lang) }];
  for (let i = 1; i < page.slugs.length; i++) {
    const ancestor = source.getPage(page.slugs.slice(0, i), lang);
    if (ancestor) items.push({ name: ancestor.data.title, item: canonicalUrl(ancestor) });
  }
  if (page.slugs.length) items.push({ name: page.data.title });
  return {
    '@type': 'BreadcrumbList',
    '@id': `${url}#breadcrumb`,
    itemListElement: items.map((crumb, i) => ({ '@type': 'ListItem', position: i + 1, ...crumb })),
  };
}

/**
 * The page's JSON-LD graph: the company's Organization and the docs WebSite, then a TechArticle with
 * its BreadcrumbList (and the Payments API on an API reference page); the docs home is a WebPage
 * about the API and the SDK, with its one-crumb BreadcrumbList and both entities. Every company
 * node is the portal's own (identical on all three hosts). datePublished and dateModified come
 * from git (lib/last-modified.ts) or are left out. Undefined for an English fallback copy: its
 * content is the English page's, which carries the graph.
 */
export function pageJsonLd(page: DocsPage): JsonLd | undefined {
  if (!isTranslation(page)) return undefined;
  const lang = contentLanguage(page);
  const url = canonicalUrl(page);
  const { datePublished, dateModified } = pageJsonLdDates(page);
  const isOpenAPI = Boolean((page.data as { _openapi?: unknown })._openapi) || page.slugs[0] === 'api';

  if (!page.slugs.length) {
    return {
      '@context': 'https://schema.org',
      '@graph': [
        ORGANIZATION_NODE,
        website,
        {
          '@type': 'WebPage',
          '@id': `${url}#webpage`,
          url,
          name: `${page.data.title} | ${appName}`,
          description: page.data.description,
          inLanguage: lang,
          isPartOf: { '@id': WEBSITE_ID },
          about: [{ '@id': API_ID }, { '@id': SDK_ID }],
          breadcrumb: { '@id': `${url}#breadcrumb` },
          primaryImageOfPage: { '@type': 'ImageObject', url: ogImage.url, width: ogImage.width, height: ogImage.height },
          publisher: ORGANIZATION,
          datePublished,
          dateModified,
        },
        breadcrumb(page, url),
        API_NODE,
        SDK_NODE,
      ],
    };
  }

  return {
    '@context': 'https://schema.org',
    '@graph': [
      ORGANIZATION_NODE,
      website,
      {
        '@type': 'TechArticle',
        '@id': `${url}#article`,
        headline: page.data.title,
        description: page.data.description,
        url,
        mainEntityOfPage: url,
        inLanguage: lang,
        isPartOf: { '@id': WEBSITE_ID },
        about: isOpenAPI ? { '@id': API_ID } : undefined,
        image: ogImage.url,
        author: ORGANIZATION,
        publisher: ORGANIZATION,
        breadcrumb: { '@id': `${url}#breadcrumb` },
        datePublished,
        dateModified,
      },
      breadcrumb(page, url),
      ...(isOpenAPI ? [API_NODE] : []),
    ],
  };
}

/** JSON for a <script type="application/ld+json">: `<` escaped so content can't close the tag. */
export function serializeJsonLd(data: JsonLd): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
