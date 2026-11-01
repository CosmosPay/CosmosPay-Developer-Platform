import type { APIRoute } from "astro";
import { DEV, PAYMENTS, SITE } from "@/components/cosmos/lib/constants";
import { sitemapXml } from "@/lib/seo/sitemap";
import { PAGE_DATES } from "@/lib/seo/page-dates-build";

/* sitemap.xml per domain (src/lib/seo/sitemap.ts): the company site's and the gateway's pages in
   every language, each with when it last changed (the build's git dates, src/lib/seo/page-dates.ts),
   and on the platform an index pointing at the docs' own sitemap. */
export const GET: APIRoute = ({ locals }) =>
  new Response(sitemapXml(locals.area ?? "dev", { site: SITE, dev: DEV, payments: PAYMENTS }, PAGE_DATES), {
    headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600" },
  });
