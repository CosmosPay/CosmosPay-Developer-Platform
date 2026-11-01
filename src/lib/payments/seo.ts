/* seo.ts: the payments gateway's indexable addresses, one per language. Every indexable page
   exists once per language at ?lang=<code> (the language resolution reads it first:
   src/lib/payments/i18n.ts); the bare path follows the visitor (cookie, then Accept-Language)
   and stands as x-default. The helpers are shared with the company site and live in
   src/lib/seo/lang-urls.ts; PaymentsLayout (canonical, hreflang), sitemap.xml, robots.txt and
   StructuredData.astro all build their URLs there, so they always agree. */
export { OG_LOCALES, ogLocale, pageUrl } from "@/lib/seo/lang-urls";
