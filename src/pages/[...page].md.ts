import type { APIRoute } from "astro";
import { markdownHeaders, markdownRequest } from "@/lib/seo/page-markdown";
import { AREA_ORIGINS, MARKDOWN_INPUT } from "@/lib/seo/markdown-config";

/* The Markdown version of an indexable page of the company site or the gateway: the page's
   address with `.md` (/pricing.md, /learn/accept-usdc-payments.md; the home's is /index.md), its
   other languages at ?lang= as for the page (src/lib/seo/markdown-urls.ts). src/lib/hosts.ts sends
   each path to the host whose page it is; here the address is checked and answered
   (src/lib/seo/page-markdown.ts): the page in the language it names, a 301 to the one address of
   that version (lowercase path, `?lang=` as the pages take it), or a 404. The page itself names
   this address in its `<link rel="alternate" type="text/markdown">`. Astro leaves `params` to the
   path; the route reads the path as asked. */
function respond(area: string | undefined, url: URL, body: boolean): Response {
  if (area !== "site" && area !== "payments") return new Response(null, { status: 404 });
  const answer = markdownRequest(area, url.pathname, url.search, AREA_ORIGINS[area], MARKDOWN_INPUT);
  if (answer.kind === "not-found") return new Response(null, { status: 404 });
  if (answer.kind === "redirect") return new Response(null, { status: 301, headers: { Location: answer.location } });
  return new Response(body ? answer.markdown : null, {
    headers: { ...markdownHeaders(answer.doc), "Cache-Control": "public, max-age=3600" },
  });
}

export const GET: APIRoute = ({ locals, url }) => respond(locals.area, url, true);
export const HEAD: APIRoute = ({ locals, url }) => respond(locals.area, url, false);
