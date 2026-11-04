import type { APIRoute } from "astro";
import { navSessionBody } from "@/lib/nav-session";

/* GET /api/nav-session: who is signed in, for the general nav on the company site and the
   gateway's domain (src/lib/nav-session.ts). Read from the session the middleware already
   resolved for this request (the sample account in mock mode). Never cached: it is per visitor. */
export const GET: APIRoute = ({ locals }) =>
  new Response(JSON.stringify(navSessionBody(locals.user)), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "private, no-store",
      Vary: "Cookie",
    },
  });
