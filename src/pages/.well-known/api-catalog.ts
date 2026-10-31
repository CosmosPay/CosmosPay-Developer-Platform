import type { APIRoute } from "astro";
import { DEV, PAYMENTS, SITE } from "@/components/cosmos/lib/constants";
import { API_BASE } from "@/lib/payments/urls";
import { API_CATALOG_TYPE, apiCatalog } from "@/lib/seo/well-known";

/* /.well-known/api-catalog (RFC 9727) on every domain (src/lib/seo/well-known.ts): the Payments
   API, its OpenAPI document and its documentation. Answered to GET and HEAD, both with the
   api-catalog link to itself, as the RFC asks. src/lib/hosts.ts lets the path through on every
   domain. */
const ORIGINS = { site: SITE, dev: DEV, payments: PAYMENTS };

function respond(locals: App.Locals, body: boolean): Response {
  const self = `${ORIGINS[locals.area ?? "dev"]}/.well-known/api-catalog`;
  const headers = {
    "Content-Type": API_CATALOG_TYPE,
    Link: `<${self}>; rel="api-catalog"`,
    "Cache-Control": "public, max-age=3600",
  };
  return new Response(body ? JSON.stringify(apiCatalog({ self, apiBase: API_BASE, docs: `${DEV}/docs/` }), null, 2) : null, { headers });
}

export const GET: APIRoute = ({ locals }) => respond(locals, true);
export const HEAD: APIRoute = ({ locals }) => respond(locals, false);
