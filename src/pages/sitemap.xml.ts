import type { APIRoute } from "astro";
import { DEV, PAYMENTS, SITE } from "@/components/cosmos/lib/constants";
import { PAYMENTS_PAGE_PATHS } from "@/lib/payments/site-pages";
import { LOCALES } from "@/lib/payments/i18n";
import { pageUrl } from "@/lib/payments/seo";

type Entry = { loc: string; changefreq: string; priority: string; alternates?: { hreflang: string; href: string }[] };

/* A gateway page in every language (?lang=) and its bare path (x-default), each entry listing
   all of them as alternates, as Google asks of a multilingual sitemap (src/lib/payments/seo.ts). */
function inEveryLanguage(path: string, changefreq: string, priority: string): Entry[] {
  const alternates = [
    ...LOCALES.map((l) => ({ hreflang: l.code, href: pageUrl(PAYMENTS, path, l.code) })),
    { hreflang: "x-default", href: pageUrl(PAYMENTS, path) },
  ];
  return alternates.map((a) => ({ loc: a.href, changefreq, priority, alternates }));
}

/* sitemap.xml per domain; the payments domain lists its landing and content pages (see
   robots.txt.ts and src/lib/payments/site-pages.ts). */
const PAGES: Record<string, Entry[]> = {
  site: [
    { loc: `${SITE}/`, changefreq: "weekly", priority: "1.0" },
    { loc: `${SITE}/pricing`, changefreq: "monthly", priority: "0.8" },
    { loc: `${SITE}/tos`, changefreq: "yearly", priority: "0.3" },
  ],
  dev: [{ loc: `${DEV}/docs`, changefreq: "weekly", priority: "1.0" }],
  payments: [
    ...inEveryLanguage("/", "weekly", "1.0"),
    ...PAYMENTS_PAGE_PATHS.flatMap((p) => inEveryLanguage(p, "monthly", "0.8")),
  ],
};

export const GET: APIRoute = ({ locals }) => {
  const urls = PAGES[locals.area ?? "dev"]
    .map((p) => {
      const links = (p.alternates ?? []).map((a) => `\n    <xhtml:link rel="alternate" hreflang="${a.hreflang}" href="${a.href}"/>`).join("");
      return `  <url>\n    <loc>${p.loc}</loc>${links}\n    <changefreq>${p.changefreq}</changefreq>\n    <priority>${p.priority}</priority>\n  </url>`;
    })
    .join("\n");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls}\n</urlset>\n`;
  return new Response(xml, {
    headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600" },
  });
};
