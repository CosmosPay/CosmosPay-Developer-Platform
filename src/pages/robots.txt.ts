import type { APIRoute } from "astro";
import { INDEXNOW_KEY } from "astro:env/server";
import { DEV, PAYMENTS, SITE } from "@/components/cosmos/lib/constants";
import { robotsTxt } from "@/lib/seo/robots";

/* robots.txt per domain (src/lib/seo/robots.ts holds the rules; the IndexNow key names the key
   file the payments domain allows). src/lib/hosts.ts lets this path through on every domain. */
export const GET: APIRoute = ({ locals }) =>
  new Response(robotsTxt(locals.area ?? "dev", { site: SITE, dev: DEV, payments: PAYMENTS }, INDEXNOW_KEY), {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" },
  });
