/* sitemap.ts: sitemap.xml for each domain. The company site and the gateway list every indexable
   page in every language (?lang=) plus its bare path (x-default), each entry naming all of them as
   alternates, as Google asks of a multilingual sitemap. The platform's only indexable content is
   the documentation, a separate static export with its own sitemap (/docs/sitemap.xml), so the
   platform's sitemap is an index pointing at it. lastmod only where the page states a date: a
   build date on every entry would teach crawlers to ignore the field. src/pages/sitemap.xml.ts
   serves it. Pure, so tests/unit/seoSitemap.test.ts covers it. */
import { PAYMENTS_PAGE_PATHS } from "@/lib/payments/site-pages";
import { LOCALES as PAYMENTS_LOCALES } from "@/lib/payments/i18n";
import { hreflangAlternates, type Alternate } from "@/lib/seo/lang-urls";
import { PAGE_LANGS, SITE_PAGE_PATHS, TOS_LAST_UPDATED, type SitePage } from "@/lib/seo/site-meta";

export type SitemapArea = "site" | "dev" | "payments";

export interface SitemapOrigins {
  site: string;
  dev: string;
  payments: string;
}

export interface SitemapEntry {
  loc: string;
  lastmod?: string;
  alternates: Alternate[];
}

/** One entry per version of `path` (each language, then x-default), all naming each other. */
export function inEveryLanguage(origin: string, path: string, langs: readonly string[], lastmod?: string): SitemapEntry[] {
  const alternates = hreflangAlternates(origin, path, langs);
  return alternates.map((a) => ({ loc: a.href, ...(lastmod && { lastmod }), alternates }));
}

/* The company site's pages, the date a page states as its last change (only the terms state one). */
const SITE_PAGES: SitePage[] = ["home", "pricing", "swaps", "tos", "about"];
const SITE_LASTMOD: Partial<Record<SitePage, string>> = { tos: TOS_LAST_UPDATED };

export function siteEntries(origin: string): SitemapEntry[] {
  return SITE_PAGES.flatMap((page) => inEveryLanguage(origin, SITE_PAGE_PATHS[page], PAGE_LANGS[page], SITE_LASTMOD[page]));
}

export function paymentsEntries(origin: string): SitemapEntry[] {
  const langs = PAYMENTS_LOCALES.map((l) => l.code);
  return ["/", ...PAYMENTS_PAGE_PATHS].flatMap((path) => inEveryLanguage(origin, path, langs));
}

const xml = (value: string): string =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

export function urlsetXml(entries: SitemapEntry[]): string {
  const urls = entries
    .map((e) => {
      const links = e.alternates.map((a) => `\n    <xhtml:link rel="alternate" hreflang="${xml(a.hreflang)}" href="${xml(a.href)}"/>`).join("");
      const lastmod = e.lastmod ? `\n    <lastmod>${xml(e.lastmod)}</lastmod>` : "";
      return `  <url>\n    <loc>${xml(e.loc)}</loc>${lastmod}${links}\n  </url>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls}\n</urlset>\n`;
}

export function sitemapIndexXml(locs: string[]): string {
  const items = locs.map((loc) => `  <sitemap>\n    <loc>${xml(loc)}</loc>\n  </sitemap>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${items}\n</sitemapindex>\n`;
}

/** sitemap.xml for one domain. */
export function sitemapXml(area: SitemapArea, origins: SitemapOrigins): string {
  switch (area) {
    case "site":
      return urlsetXml(siteEntries(origins.site));
    case "payments":
      return urlsetXml(paymentsEntries(origins.payments));
    case "dev":
      return sitemapIndexXml([`${origins.dev}/docs/sitemap.xml`]);
  }
}
