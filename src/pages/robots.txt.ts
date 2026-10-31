import type { APIRoute } from "astro";
import { DEV, PAYMENTS, SITE } from "@/components/cosmos/lib/constants";
import { robotsTxt } from "@/lib/seo/robots";

/* robots.txt per domain (src/lib/seo/robots.ts holds the rules). src/lib/hosts.ts lets this path
   through on every domain. */
export const GET: APIRoute = ({ locals }) =>
  new Response(robotsTxt(locals.area ?? "dev", { site: SITE, dev: DEV, payments: PAYMENTS }), {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" },
  });
