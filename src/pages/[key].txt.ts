import type { APIRoute } from "astro";
import { INDEXNOW_KEY } from "astro:env/server";
import { keyFileBody } from "@/lib/seo/indexnow";

/* The IndexNow key file (src/lib/seo/indexnow.ts): /<INDEXNOW_KEY>.txt, whose body is the key,
   on every domain, so a submission for any of the three hosts proves itself. src/lib/hosts.ts
   lets a path of that shape through on every domain; any other name, or no key configured, is a
   404. The key is public by design: this file is how the engines check it. */
const HEADERS = { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" };

function respond(requested: string | undefined, body: boolean): Response {
  const key = keyFileBody(requested, INDEXNOW_KEY);
  if (key === null) return new Response(null, { status: 404 });
  return new Response(body ? key : null, { headers: HEADERS });
}

export const GET: APIRoute = ({ params }) => respond(params.key, true);
export const HEAD: APIRoute = ({ params }) => respond(params.key, false);
