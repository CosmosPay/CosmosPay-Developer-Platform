/* hosts.ts: which domain owns which route, and what a request on any domain becomes.
 *
 * One deployment answers three domains (nginx sends all three to the same process):
 *
 *   cosmospay.lat           "site"      /, /pricing, /tos          (pages under src/pages/site/)
 *   dev.cosmospay.lat       "dev"       /login, /dashboard, /api…  (the rest of src/pages/)
 *   payments.cosmospay.lat  "payments"  /, its content pages (/integrations, /use-cases, /security,
 *                                       /fees, /faq), /pay, /contact (the contact form's POST),
 *                                       /{payment link id}, /preview/{design}
 *                                       (pages under src/pages/payments/)
 *
 * Each domain has its own home page. A route renders ONLY on the domain that owns it. Asked on another one it is a redirect to
 * its owner (query kept); a path nobody owns is a 404 on the site and payments domains. The
 * site and payments pages live under internal mounts (/site, /payments) and are reached by a
 * rewrite, so their public URLs have no prefix, and the mounts themselves are never public:
 * asked directly, they redirect to the public address.
 *
 * Pure (no astro:env), so tests/unit/hosts.test.ts covers the whole table; src/middleware.ts
 * applies it with the configured origins.
 */

export type Area = "site" | "dev" | "payments";

export interface Origins {
  site: string;
  dev: string;
  payments: string;
}

export interface RouteRequest {
  hostname: string;
  pathname: string;
  search: string;
  method: string;
}

export type RouteDecision =
  | { kind: "pass"; area: Area }
  | { kind: "rewrite"; area: Area; path: string }
  | { kind: "redirect"; location: string; status: 301 | 308 }
  | { kind: "not-found"; area: Area };

/** Where the site and payments pages live in src/pages. */
export const MOUNTS: Record<Exclude<Area, "dev">, string> = { site: "/site", payments: "/payments" };

import { PAYMENTS_PAGE_PATHS } from "@/lib/payments/site-pages";

const SITE_PATHS = new Set(["/pricing", "/tos"]);
/* The gateway's content pages (src/lib/payments/site-pages.ts). Its pricing page is /fees,
   because /pricing is the company site's. */
const PAYMENTS_PATHS = new Set(PAYMENTS_PAGE_PATHS);
/* Checkout design previews (src/pages/payments/preview/[design].astro) and the ZK payment pages
   (src/pages/payments/zk/: the private checkout and the prover's files); the checkout is the only
   cross-origin isolated page. */
const PAYMENTS_PREFIXES = ["/preview", "/zk"];
/* The prover's files (bb.js at the SDK's pinned version, src/pages/payments/zk/bb/) are served by
   the platform too: the dashboard proves there for the merchant's confidential account, and bb.js
   starts its Web Worker from its own URL, which must be the page's origin. Same route, same
   headers, on both domains. */
const PROVER_PREFIX = "/zk/bb";
/* The platform's top-level routes. A new one belongs here too, or on the other domains it is
   a 404 instead of a redirect (it still never renders there). */
const DEV_PREFIXES = ["/login", "/dashboard", "/onboarding", "/invite", "/kyc", "/swagger", "/docs", "/api"];
/* Answered on every domain, each with its own content (src/pages/robots.txt.ts, sitemap.xml.ts). */
const SHARED_PATHS = new Set(["/robots.txt", "/sitemap.xml"]);
/* A payment link id (Prisma cuid). Mirrors isPaymentLinkId in src/lib/payments/payment-link.ts. */
const PAYMENT_LINK_PATH = /^\/c[a-z0-9]{20,31}$/;

function hostOf(origin: string): string {
  try {
    return new URL(origin).hostname.toLowerCase();
  } catch {
    return "";
  }
}

/**
 * The path as the router will match it: percent-decoded, backslashes as slashes, repeated
 * slashes collapsed, no trailing slash. Routing on the raw pathname would let `/%70ayments/…`
 * or `//site/…` slip past the mount check and render a page on a domain that does not own it.
 * Null when the encoding is malformed.
 */
export function canonicalPath(pathname: string): string | null {
  let decoded: string;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  const collapsed = decoded.replace(/\\/g, "/").replace(/\/{2,}/g, "/");
  return collapsed.length > 1 ? collapsed.replace(/\/+$/, "") || "/" : collapsed || "/";
}

function underPrefix(path: string, prefix: string): boolean {
  return path === prefix || path.startsWith(`${prefix}/`);
}

/** Which domain a public path belongs to; "home" for `/` (every domain has its own). */
export function ownerOf(path: string): Area | "home" | null {
  if (path === "/") return "home";
  if (SITE_PATHS.has(path)) return "site";
  if (path === "/pay" || path === "/contact" || PAYMENTS_PATHS.has(path) || PAYMENT_LINK_PATH.test(path)) return "payments";
  if (PAYMENTS_PREFIXES.some((p) => underPrefix(path, p))) return "payments";
  if (DEV_PREFIXES.some((p) => underPrefix(path, p))) return "dev";
  return null;
}

/**
 * The areas a hostname serves. An unknown host (a direct IP, a health check, the smoke test)
 * is the platform. Several areas share a host only when the origins are configured that way
 * (a single local host); then that host serves all of them, and no redirect can loop.
 */
export function areasOf(hostname: string, origins: Origins): Set<Area> {
  const host = hostname.toLowerCase();
  const areas = new Set<Area>();
  for (const area of ["site", "dev", "payments"] as const) {
    if (hostOf(origins[area]) === host) areas.add(area);
  }
  if (areas.size === 0) areas.add("dev");
  return areas;
}

export function routeRequest(req: RouteRequest, origins: Origins): RouteDecision {
  const hostname = req.hostname.toLowerCase();
  // Redirects keep the method only with 308; a GET can take the cacheable 301.
  const moved = req.method === "GET" || req.method === "HEAD" ? 301 : 308;
  const to = (area: Area, path: string): RouteDecision => ({
    kind: "redirect",
    location: `${origins[area].replace(/\/+$/, "")}${path}${req.search}`,
    status: moved,
  });

  if (hostname === `www.${hostOf(origins.site)}`) return to("site", req.pathname);

  const areas = areasOf(hostname, origins);
  const primary: Area = areas.has("site") ? "site" : areas.has("payments") ? "payments" : "dev";
  const canonical = canonicalPath(req.pathname);
  if (canonical === null) return { kind: "not-found", area: primary };
  // Matched case-insensitively, so `/Site/…` is a mount too wherever the router would match it.
  const path = canonical.toLowerCase();

  // The internal mounts are not addresses: send them to the public one.
  for (const area of ["site", "payments"] as const) {
    if (underPrefix(path, MOUNTS[area])) return to(area, encodeURI(canonical.slice(MOUNTS[area].length)) || "/");
  }

  if (SHARED_PATHS.has(path)) return { kind: "pass", area: primary };

  const serve = (area: Area): RouteDecision =>
    area === "dev"
      ? { kind: "pass", area }
      : { kind: "rewrite", area, path: path === "/" ? MOUNTS[area] : `${MOUNTS[area]}${path}` };

  if (underPrefix(path, PROVER_PREFIX) && areas.has("dev") && !areas.has("payments")) {
    return { kind: "rewrite", area: "dev", path: `${MOUNTS.payments}${path}` };
  }

  const owner = ownerOf(path);
  if (owner === "home") {
    if (areas.has("site")) return serve("site");
    if (areas.has("payments")) return serve("payments");
    return serve("dev");
  }
  if (owner) return areas.has(owner) ? serve(owner) : to(owner, encodeURI(canonical));
  // Nobody owns it: the platform renders its own 404 (and any route it adds before this
  // table learns it); the other domains do not render platform pages.
  return areas.has("dev") ? { kind: "pass", area: "dev" } : { kind: "not-found", area: primary };
}
