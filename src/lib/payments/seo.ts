/* seo.ts: the payments gateway's indexable addresses, one per language: English at the bare path
   (also x-default), the others at ?lang=<code>. The helpers are shared with the company site and
   live in src/lib/seo/lang-urls.ts; PaymentsLayout (canonical, hreflang), sitemap.xml, robots.txt
   and StructuredData.astro all build their URLs there, so they always agree. */
export { OG_LOCALES, ogLocale, pageUrl } from "@/lib/seo/lang-urls";
