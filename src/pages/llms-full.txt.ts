import type { APIRoute } from "astro";
import { DEV } from "@/components/cosmos/lib/constants";
import { llmsFullTxt } from "@/lib/seo/llms-full";
import { MARKDOWN_INPUT } from "@/lib/seo/markdown-config";

/* /llms-full.txt per domain (src/lib/seo/llms-full.ts): the English text of every indexable page of
   the company site on cosmospay.lat, of the gateway on payments.cosmospay.lat, built from the same
   catalogs and data the pages render. The platform's is the docs' own (/docs/llms-full.txt), so
   there this answers a redirect to it. src/lib/hosts.ts lets the path through on every domain. */
const HEADERS = { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" };

function respond(area: string | undefined, body: boolean): Response {
  if (area !== "site" && area !== "payments") return new Response(null, { status: 301, headers: { Location: `${DEV}/docs/llms-full.txt` } });
  return new Response(body ? llmsFullTxt(area, MARKDOWN_INPUT) : null, { headers: HEADERS });
}

export const GET: APIRoute = ({ locals }) => respond(locals.area, true);
export const HEAD: APIRoute = ({ locals }) => respond(locals.area, false);
