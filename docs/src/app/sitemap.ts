import type { MetadataRoute } from 'next';
import { pageLastModified } from '@/lib/last-modified';
import { docsUrl, isTranslation, pageLanguages, source } from '@/lib/source';
import { DEFAULT_DOCS_LANGUAGE, isDocsLanguage } from '@/lib/i18n-config';

export const revalidate = false;

// /docs/sitemap.xml: every docs page in every language it is written in (English fallback
// copies under a locale prefix are not pages of their own), with hreflang alternates between a
// page and its translations and the date it last changed.
export default function sitemap(): MetadataRoute.Sitemap {
  return source
    .getLanguages()
    .flatMap(({ pages }) => pages)
    .filter(isTranslation)
    .map((page) => {
      const lang = isDocsLanguage(page.locale) ? page.locale : DEFAULT_DOCS_LANGUAGE;
      const languages = pageLanguages(page.slugs);
      return {
        url: docsUrl(page.slugs, lang),
        lastModified: pageLastModified(page)?.date,
        alternates:
          languages.length > 1
            ? {
                languages: {
                  ...Object.fromEntries(languages.map((l) => [l, docsUrl(page.slugs, l)])),
                  'x-default': docsUrl(page.slugs, DEFAULT_DOCS_LANGUAGE),
                },
              }
            : undefined,
      };
    });
}
