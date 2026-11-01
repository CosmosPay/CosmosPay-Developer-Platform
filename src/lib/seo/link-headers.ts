/* link-headers.ts: the RFC 8288 Link header every indexable page of the company site and the
   gateway answers with (src/middleware.ts, through src/lib/seo/response-headers.ts), so an agent
   that reads only the response headers finds what describes the site and its API:

     </llms.txt>; rel="describedby"; type="text/plain"              the host's llms.txt
     </.well-known/api-catalog>; rel="api-catalog"                    RFC 9727's catalog
     <https://dev.cosmospay.lat/docs/openapi.json>; rel="service-desc"; type="application/json"
     <https://dev.cosmospay.lat/docs/>; rel="service-doc"            the documentation
     </sitemap.xml>; rel="sitemap"                                    the host's sitemap
     <https://cosmospay.lat/pricing.md>; rel="alternate"; type="text/markdown"

   The host's own files are relative references (RFC 8288 resolves them against the page, so they
   name that host's llms.txt and sitemap); the docs and the Markdown version are absolute. The
   Markdown version is the one the page's own `<link rel="alternate" type="text/markdown">` names
   (both layouts): the canonical address of the version shown with `.md`, so /tos?lang=fr names the
   English terms' and the company's /swaps the gateway's (src/lib/seo/cross-host.ts). `sitemap` is
   not an IANA-registered relation; the others are (describedby, api-catalog, service-desc,
   service-doc, alternate). The api-catalog route keeps its own Link to itself
   (src/pages/.well-known/api-catalog.ts). Pure, so tests/unit/seoLinkHeaders.test.ts covers it. */
import { canonicalUrl } from "@/lib/seo/lang-urls";
import { crossHostCanonical } from "@/lib/seo/cross-host";
import { markdownAlternate } from "@/lib/seo/markdown-urls";

export interface DiscoveryLinksInput {
  /** The documentation's root, with its trailing slash: https://dev.cosmospay.lat/docs/ */
  docs: string;
  /** The page's Markdown version (absolute), or null when it has none. */
  markdown: string | null;
}

/** The Link values an indexable page answers with, one per target. */
export function discoveryLinks({ docs, markdown }: DiscoveryLinksInput): string[] {
  const root = docs.endsWith("/") ? docs : `${docs}/`;
  return [
    '</llms.txt>; rel="describedby"; type="text/plain"',
    '</.well-known/api-catalog>; rel="api-catalog"',
    `<${root}openapi.json>; rel="service-desc"; type="application/json"`,
    `<${root}>; rel="service-doc"`,
    '</sitemap.xml>; rel="sitemap"',
    ...(markdown ? [`<${markdown}>; rel="alternate"; type="text/markdown"`] : []),
  ];
}

export interface PageMarkdownInput {
  area: "site" | "payments";
  /** The page's path, lowercase, without a trailing slash (`/`, `/pricing`, `/learn/x`). */
  path: string;
  /** The language its `?lang=` names, if any (explicitLang). */
  asked: string | null | undefined;
  /** The languages the page is written in; null for every language. */
  langs: readonly string[] | null;
  /** Every language the host speaks. */
  allLangs: readonly string[];
  origins: { site: string; payments: string };
}

/** The Markdown version an indexable page names: its canonical address (the version shown, on
 *  the host that is canonical for it) with `.md`, as both layouts compute it. */
export function pageMarkdownLink({ area, path, asked, langs, allLangs, origins }: PageMarkdownInput): string {
  const written = langs ?? allLangs;
  const elsewhere = area === "site" ? crossHostCanonical(path, asked, written, allLangs, origins.payments) : null;
  return markdownAlternate(elsewhere ?? canonicalUrl(origins[area], path, asked, written, allLangs));
}
