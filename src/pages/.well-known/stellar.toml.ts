import type { APIRoute } from "astro";
import { SITE, SOCIAL } from "@/components/cosmos/lib/constants";
import { CONTACT_ADDRESS } from "@/lib/payments/contact";
import { STELLAR_TOML_HEADERS, stellarToml } from "@/lib/seo/well-known";

/* /.well-known/stellar.toml (SEP-1) on the company site only (src/lib/seo/well-known.ts says why
   it exists and what it leaves out). src/lib/hosts.ts lets the path through on every domain; the
   platform and the gateway are no one's home domain, so there it is a 404. */
const X_HANDLE = new URL(SOCIAL.x).pathname.replace(/^\/+|\/+$/g, "");

function respond(locals: App.Locals, body: boolean): Response {
  if (locals.area !== "site") return new Response(null, { status: 404 });
  const toml = stellarToml({ orgUrl: SITE, email: CONTACT_ADDRESS, github: "CosmosPay", twitter: X_HANDLE });
  return new Response(body ? toml : null, { headers: STELLAR_TOML_HEADERS });
}

export const GET: APIRoute = ({ locals }) => respond(locals, true);
export const HEAD: APIRoute = ({ locals }) => respond(locals, false);
