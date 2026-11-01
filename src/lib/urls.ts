/* urls.ts: pure helpers for absolute links between the three domains. No astro:env import
   here, so the unit tests can load it under plain `node --test`;
   @/components/cosmos/lib/constants feeds it the configured origins. */
import { isSafeNextPath } from "@/lib/safe-next";

/** Drop surrounding whitespace and trailing slashes so `${origin}/path` never doubles them. */
export function normalizeOrigin(origin: string): string {
  return origin.trim().replace(/\/+$/, "");
}

/**
 * The platform's sign-in entry. `next` is the path on the platform to land on afterwards;
 * /login only honours same-origin paths, so anything else is dropped here too rather than
 * producing a link that silently ignores it.
 */
export function loginUrl(devOrigin: string, next?: string): string {
  const base = `${normalizeOrigin(devOrigin)}/login`;
  if (!next || !isSafeNextPath(next)) return base;
  return `${base}?next=${encodeURIComponent(next)}`;
}

/** The documentation's root, `<platform>/docs/`: a static export served under /docs, whose
 *  canonical addresses end in a slash. */
export function docsRoot(devOrigin: string): string {
  return `${normalizeOrigin(devOrigin)}/docs/`;
}

/**
 * A page of the documentation at its canonical address. The docs are a static export whose every
 * page is a folder (`trailingSlash: true` in docs/next.config.mjs), so a page's address ends in
 * "/" and nginx answers the slashless form with a 301: every link goes straight to the slash.
 * `root` is the docs root (docsRoot; its own slash optional), `path` the page under it (`/api`,
 * `sdk/server/webhooks`, "" for the root). A file (`/llms.txt`, `/openapi.json`) keeps its name,
 * and a query or a fragment stays after the slash.
 */
export function docsLink(root: string, path = ""): string {
  const cut = path.search(/[?#]/);
  const rest = cut < 0 ? "" : path.slice(cut);
  let page = (cut < 0 ? path : path.slice(0, cut)).replace(/^\/+/, "");
  const last = page.split("/").pop() ?? "";
  if (page && !page.endsWith("/") && !last.includes(".")) page += "/";
  return `${root.replace(/\/+$/, "")}/${page}${rest}`;
}

/** Whether `href` leads to a page of the docs under `root` without its trailing slash (a 301
 *  away from the page): what docsLink never writes. */
export function isSlashlessDocsLink(href: string, root: string): boolean {
  const base = root.replace(/\/+$/, "");
  if (href !== base && ![`${base}/`, `${base}?`, `${base}#`].some((prefix) => href.startsWith(prefix))) return false;
  const pathname = href.slice(base.length).split(/[?#]/)[0];
  return pathname === "" || docsLink(base, pathname) !== `${base}${pathname}`;
}
