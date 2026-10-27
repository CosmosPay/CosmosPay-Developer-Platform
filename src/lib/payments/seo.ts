/* seo.ts: the payments gateway's indexable addresses, one per language. Every indexable page
   exists once per language at ?lang=<code> (the language resolution reads it first:
   src/lib/payments/i18n.ts); the bare path follows the visitor (cookie, then Accept-Language)
   and stands as x-default. PaymentsLayout (canonical, hreflang), sitemap.xml, robots.txt and
   StructuredData.astro all build their URLs here, so they always agree. Pure, so it is tested. */

/** The address of `path` on `origin`, in `lang` when given: `https://payments…/faq?lang=es`. */
export function pageUrl(origin: string, path: string, lang?: string | null): string {
  const url = new URL(path, origin);
  if (lang) url.searchParams.set("lang", lang);
  return url.href;
}

/** Open Graph wants language_TERRITORY: the market each language is written for. */
export const OG_LOCALES = { en: "en_US", es: "es_LA", pt: "pt_BR", fr: "fr_FR", de: "de_DE", hi: "hi_IN", zh: "zh_CN" } as const;
