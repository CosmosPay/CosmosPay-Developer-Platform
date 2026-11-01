import type { APIRoute } from "astro";
import { DEV, PAYMENTS, SITE } from "@/components/cosmos/lib/constants";
import { CONTACT_ADDRESS } from "@/lib/payments/contact";
import { securityTxt } from "@/lib/seo/well-known";

/* /.well-known/security.txt (RFC 9116) on every domain, the same file (src/lib/seo/well-known.ts).
   Expires is computed per request. src/lib/hosts.ts lets the path through on every domain. */
const CANONICALS = [...new Set([SITE, DEV, PAYMENTS])].map((origin) => `${origin}/.well-known/security.txt`);

export const GET: APIRoute = () =>
  new Response(securityTxt({ now: new Date(), contact: CONTACT_ADDRESS, canonicals: CANONICALS, languages: ["en", "es"] }), {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=86400" },
  });
