import type { APIRoute } from "astro";
import { DEV, PAYMENTS, SITE } from "@/components/cosmos/lib/constants";
import { API_BASE } from "@/lib/payments/urls";
import { CONTACT_ADDRESS } from "@/lib/payments/contact";
import { authMd } from "@/lib/seo/auth-md";

/* /auth.md on every domain, the same file (src/lib/seo/auth-md.ts): how an AI agent authenticates
   with Cosmos Pay. Markdown as text/markdown, GET and HEAD, the company site's copy named
   canonical, cached an hour like llms.txt. src/lib/hosts.ts lets the path through on every domain
   (it outranks src/pages/[...page].md.ts, which serves the pages' Markdown versions), and the
   payments robots.txt allows it. */
const BODY = authMd({ site: SITE, dev: DEV, payments: PAYMENTS, apiBase: API_BASE, contact: CONTACT_ADDRESS });
const HEADERS = {
  "Content-Type": "text/markdown; charset=utf-8",
  "Content-Language": "en",
  "Cache-Control": "public, max-age=3600",
  Link: `<${SITE}/auth.md>; rel="canonical"`,
  "X-Content-Type-Options": "nosniff",
};

export const GET: APIRoute = () => new Response(BODY, { headers: HEADERS });
export const HEAD: APIRoute = () => new Response(null, { headers: HEADERS });
