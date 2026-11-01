import type { APIRoute } from "astro";
import { BING_SITE_AUTH } from "astro:env/server";
import { bingSiteAuthXml } from "@/lib/seo/bing-site-auth";

/* Bing Webmaster Tools' ownership file (src/lib/seo/bing-site-auth.ts), the same on every domain:
   src/lib/hosts.ts lets the path through on all three. No code configured is a 404. */
const HEADERS = { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600" };

function respond(body: boolean): Response {
  const xml = bingSiteAuthXml(BING_SITE_AUTH);
  if (xml === null) return new Response(null, { status: 404 });
  return new Response(body ? xml : null, { headers: HEADERS });
}

export const GET: APIRoute = () => respond(true);
export const HEAD: APIRoute = () => respond(false);
