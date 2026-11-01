/* markdown-urls.ts: where the Markdown version of an indexable page lives, and when a request for
   the page itself asks for it.

   The scheme (llmstxt.org's: the page's address with `.md` appended), one address per language as
   for the pages (src/lib/seo/lang-urls.ts):
     https://cosmospay.lat/pricing                 -> https://cosmospay.lat/pricing.md
     https://cosmospay.lat/pricing?lang=es         -> https://cosmospay.lat/pricing.md?lang=es
     https://payments.cosmospay.lat/               -> https://payments.cosmospay.lat/index.md
     https://payments.cosmospay.lat/learn/x?lang=pt -> https://payments.cosmospay.lat/learn/x.md?lang=pt
   English is the bare `.md` path and never changes with the visitor's cookie or Accept-Language;
   `?lang=en`, a `lang` the page is not written in and any other spelling of one are a 301 to the
   one address (src/pages/[...page].md.ts). Every indexable page has one, in each language it is
   written in, except a company-site page whose canonical version is the gateway's (/swaps:
   src/lib/seo/cross-host.ts): its Markdown is the gateway's. src/lib/hosts.ts routes these paths
   to the host that owns the page, the payments robots.txt allows them (src/lib/seo/robots.ts),
   and every page names its own in a `<link rel="alternate" type="text/markdown">`.

   A GET of the page's own address whose Accept header prefers text/markdown to text/html (an
   agent's, never a browser's) gets the same Markdown there (`prefersMarkdown`, the middleware).
   Pure and free of catalogs (hosts.ts and the layouts import it), so
   tests/unit/seoMarkdown.test.ts covers it. */
import { pageLanguages, pageUrl } from "@/lib/seo/lang-urls";
import { SITE_PATHS_CANONICAL_ON_PAYMENTS } from "@/lib/seo/cross-host";

export type MarkdownArea = "site" | "payments";

/** The Markdown path of the page at `path`: `/pricing` → `/pricing.md`, `/` → `/index.md`. */
export function markdownPath(path: string): string {
  return path === "/" ? "/index.md" : `${path.replace(/\/+$/, "")}.md`;
}

/** The page a Markdown path stands for: `/pricing.md` → `/pricing`, `/index.md` → `/`; null for
 *  anything else (`/learn/index.md` is not an address: the hub's is `/learn.md`). */
export function pageOfMarkdown(path: string): string | null {
  if (!path.endsWith(".md")) return null;
  const page = path.slice(0, -".md".length);
  if (page === "/index") return "/";
  if (!page.startsWith("/") || page === "/" || page.endsWith("/") || page.endsWith("/index")) return null;
  return page;
}

/** The address of the Markdown version of `path` on `origin`, in `lang` (English bare). */
export function markdownUrl(origin: string, path: string, lang?: string | null): string {
  return pageUrl(origin, markdownPath(path), lang);
}

/** The Markdown version of a page's canonical address: its path with `.md`, its query kept. */
export function markdownAlternate(canonical: string): string {
  const url = new URL(canonical);
  url.pathname = markdownPath(url.pathname);
  return url.href;
}

/**
 * The languages the Markdown version of `path` on `area` exists in (null: every language), or
 * undefined when that host has none for it: the indexable pages (pageLanguages), less the
 * company-site pages whose canonical version is the gateway's.
 */
export function markdownLanguages(area: MarkdownArea, path: string): readonly string[] | null | undefined {
  if (area === "site" && SITE_PATHS_CANONICAL_ON_PAYMENTS.includes(path)) return undefined;
  return pageLanguages(area, path);
}

/** The hosts whose page at `path` has a Markdown version: one, or both for the home. */
export function markdownOwners(path: string): MarkdownArea[] {
  return (["site", "payments"] as const).filter((area) => markdownLanguages(area, path) !== undefined);
}

/* One entry of an Accept header: its media range and its weight. */
function acceptEntries(accept: string): { type: string; q: number }[] {
  return accept
    .split(",")
    .map((part) => {
      const [range, ...params] = part.trim().split(";");
      const q = params.map((x) => x.trim()).find((x) => x.toLowerCase().startsWith("q="));
      const weight = q === undefined ? 1 : Number(q.slice(2));
      return { type: (range ?? "").trim().toLowerCase(), q: Number.isFinite(weight) ? weight : 0 };
    })
    .filter((e) => e.type);
}

/**
 * Whether an Accept header asks for Markdown rather than HTML: it names text/markdown itself
 * (a wildcard never counts) with a weight above zero and at least that of text/html (or of the
 * range that covers it: text/*, then *\/*). Browsers never name text/markdown, so they always
 * get the page.
 */
export function prefersMarkdown(accept: string | null | undefined): boolean {
  if (!accept) return false;
  const entries = acceptEntries(accept);
  const weightOf = (type: string): number | undefined => {
    const matching = entries.filter((e) => e.type === type);
    return matching.length ? Math.max(...matching.map((e) => e.q)) : undefined;
  };
  const markdown = weightOf("text/markdown");
  if (!markdown || markdown <= 0) return false;
  const html = weightOf("text/html") ?? weightOf("text/*") ?? weightOf("*/*") ?? 0;
  return markdown >= html;
}
