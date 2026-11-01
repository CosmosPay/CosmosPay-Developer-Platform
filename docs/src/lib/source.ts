import { docs } from 'collections/server';
import { loader } from 'fumadocs-core/source';
import { openapiPlugin } from 'fumadocs-openapi/server';
import { docsContentRoute, docsImageRoute, docsOrigin, docsRoute } from '@/lib/shared';
import { DEFAULT_DOCS_LANGUAGE, DOCS_LANGUAGES, type DocsLanguage, i18n, isDocsLanguage } from '@/lib/i18n-config';

// See https://fumadocs.dev/docs/headless/source-api for more info
export const source = loader({
  baseUrl: docsRoute,
  // URL-based localization: en stays at the root, other locales under /<lang>/ (see
  // lib/i18n-config.ts). Pages without a translation fall back to English.
  i18n,
  source: docs.toFumadocsSource(),
  // Adds HTTP method badges to API pages in the sidebar (reads the `_openapi` frontmatter
  // that scripts/generate-api.mjs bakes into each generated tag page).
  plugins: [openapiPlugin()],
});

export type DocsPage = (typeof source)['$inferPage'];

/**
 * Whether a page is written in the language it is listed under. With `fallbackLanguage`, every
 * locale also lists the English pages it has no translation for (so the localized sidebar is
 * complete); those copies point at the English file. They stay browsable but are not
 * translations: they are noindex, canonical to the English URL, and left out of hreflang,
 * the sitemap and the llms files.
 */
export function isTranslation(page: DocsPage): boolean {
  if (!page.locale || page.locale === DEFAULT_DOCS_LANGUAGE) return true;
  const original = source.getPage(page.slugs, DEFAULT_DOCS_LANGUAGE);
  if (!original) return true;
  if (page.absolutePath && original.absolutePath) return page.absolutePath !== original.absolutePath;
  return page.data !== original.data;
}

/** The language a page's content is written in: its own, or English for a fallback copy. */
export function contentLanguage(page: DocsPage): DocsLanguage {
  return isTranslation(page) && isDocsLanguage(page.locale) ? page.locale : DEFAULT_DOCS_LANGUAGE;
}

/** The languages a page is written in, English first: the page and its real translations. */
export function pageLanguages(slugs: string[]): DocsLanguage[] {
  return DOCS_LANGUAGES.filter((lang) => {
    const page = source.getPage(slugs, lang);
    return Boolean(page && isTranslation(page));
  });
}

/** The path the export serves a page at in a language, without the /docs basePath. Trailing
 *  slash, as `trailingSlash: true` writes every page as <route>/index.html. */
export function docsPath(slugs: string[], lang: DocsLanguage = DEFAULT_DOCS_LANGUAGE): string {
  const segments = lang === DEFAULT_DOCS_LANGUAGE ? slugs : [lang, ...slugs];
  return segments.length ? `/${segments.join('/')}/` : '/';
}

/** The absolute URL of a page in a language (https://dev.cosmospay.lat/docs/es/x/). */
export function docsUrl(slugs: string[], lang: DocsLanguage = DEFAULT_DOCS_LANGUAGE): string {
  return `${docsOrigin}${docsPath(slugs, lang)}`;
}

/** The one URL a page's content is canonical at: its own, or the English page's for a copy. */
export function canonicalUrl(page: DocsPage): string {
  return docsUrl(page.slugs, contentLanguage(page));
}

export function getPageImage(page: DocsPage) {
  const segments = [...page.slugs, 'image.png'];

  return {
    segments,
    url: `${docsImageRoute}/${segments.join('/')}`,
  };
}

/** The page's Markdown (`/docs/llms.mdx/[<lang>/]<slug>/content.md`). A translation has its
 *  own; an English fallback copy points at the English page's. */
export function getPageMarkdownUrl(page: DocsPage) {
  const lang = contentLanguage(page);
  const segments = [...(lang === DEFAULT_DOCS_LANGUAGE ? [] : [lang]), ...page.slugs, 'content.md'];

  return {
    segments,
    url: `${docsContentRoute}/${segments.join('/')}`,
  };
}
