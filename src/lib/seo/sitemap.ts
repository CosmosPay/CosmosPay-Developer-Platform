/* sitemap.ts: sitemap.xml for each domain. The company site and the gateway list every indexable
   page once per language: English at its bare path (also its x-default), every other language at
   ?lang=<code>, each entry naming all of them as alternates, as Google asks of a multilingual
   sitemap. A company-site page whose canonical version is the gateway's (/swaps:
   src/lib/seo/cross-host.ts) is left out. The platform's only indexable content is the
   documentation, a separate static export with its own sitemap (/docs/sitemap.xml), so the
   platform's sitemap is an index pointing at it. lastmod is when the page last changed
   (src/lib/seo/page-dates.ts: the date it states, else its sources' last commit, else the build);
   without those dates only the pages that state a date carry one. src/pages/sitemap.xml.ts serves
   it. Pure, so tests/unit/seoSitemap.test.ts covers it. */
import { hreflangAlternates, pageUrl, type Alternate } from "@/lib/seo/lang-urls";
import { pageModified, statedDate, type DateInput } from "@/lib/seo/page-dates";
import { indexablePages } from "@/lib/seo/indexable";

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

/** When the page at `path`, in `lang`, last changed; undefined when nothing says. */
export type LastmodOf = (path: string, lang: string) => string | null | undefined;

/** One entry per language version of `path` (English at the bare path, which is also the
 *  x-default), all naming each other. */
export function inEveryLanguage(origin: string, path: string, langs: readonly string[], lastmodOf?: LastmodOf): SitemapEntry[] {
  const alternates = hreflangAlternates(origin, path, langs);
  return langs.map((lang) => {
    const lastmod = lastmodOf?.(path, lang);
    return { loc: pageUrl(origin, path, lang), ...(lastmod && { lastmod }), alternates };
  });
}

const lastmodFor =
  (area: "site" | "payments", dates?: DateInput): LastmodOf =>
  (path, lang) =>
    dates ? pageModified(area, path, lang, dates) : statedDate(area, path);

export function siteEntries(origin: string, dates?: DateInput): SitemapEntry[] {
  return indexablePages("site").flatMap((page) => inEveryLanguage(origin, page.path, page.langs, lastmodFor("site", dates)));
}

export function paymentsEntries(origin: string, dates?: DateInput): SitemapEntry[] {
  return indexablePages("payments").flatMap((page) => inEveryLanguage(origin, page.path, page.langs, lastmodFor("payments", dates)));
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

/** sitemap.xml for one domain; `dates` (the build's git dates) give every page its lastmod. */
export function sitemapXml(area: SitemapArea, origins: SitemapOrigins, dates?: DateInput): string {
  switch (area) {
    case "site":
      return urlsetXml(siteEntries(origins.site, dates));
    case "payments":
      return urlsetXml(paymentsEntries(origins.payments, dates));
    case "dev":
      return sitemapIndexXml([`${origins.dev}/docs/sitemap.xml`]);
  }
}
