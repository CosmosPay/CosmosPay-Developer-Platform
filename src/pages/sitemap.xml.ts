import type { APIRoute } from "astro";
import { DEV, PAYMENTS, SITE } from "@/components/cosmos/lib/constants";
import { PAYMENTS_PAGE_PATHS } from "@/lib/payments/site-pages";

/* sitemap.xml per domain; the payments domain lists its landing and content pages (see
   robots.txt.ts and src/lib/payments/site-pages.ts). */
const PAGES: Record<string, { loc: string; changefreq: string; priority: string }[]> = {
  site: [
    { loc: `${SITE}/`, changefreq: "weekly", priority: "1.0" },
    { loc: `${SITE}/pricing`, changefreq: "monthly", priority: "0.8" },
    { loc: `${SITE}/tos`, changefreq: "yearly", priority: "0.3" },
  ],
  dev: [{ loc: `${DEV}/docs`, changefreq: "weekly", priority: "1.0" }],
  payments: [
    { loc: `${PAYMENTS}/`, changefreq: "weekly", priority: "1.0" },
    ...PAYMENTS_PAGE_PATHS.map((p) => ({ loc: `${PAYMENTS}${p}`, changefreq: "monthly", priority: "0.8" })),
  ],
};

export const GET: APIRoute = ({ locals }) => {
  const urls = PAGES[locals.area ?? "dev"]
    .map((p) => `  <url>\n    <loc>${p.loc}</loc>\n    <changefreq>${p.changefreq}</changefreq>\n    <priority>${p.priority}</priority>\n  </url>`)
    .join("\n");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
  return new Response(xml, {
    headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600" },
  });
};
