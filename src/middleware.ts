import { requestSession } from "@/lib/request-session";
import { recordLogin, touchLastSeen } from "@/lib/profile";
import { trackActivity } from "@/lib/activity";
import { ensureCosmosRouteSynced } from "@/lib/apisix-route";
import { defineMiddleware } from "astro:middleware";
import { ALLOWED_ORIGINS as ALLOWED_ORIGINS_LIST } from "@/lib/allowed-origins";
import { MOUNTS, routeRequest } from "@/lib/hosts";
import { ZK_ISOLATION_HEADERS } from "@/lib/zk/bb-assets";
import { DEV, PAYMENTS, SITE } from "@/components/cosmos/lib/constants";
import { LANG_COOKIE, LOCALES, resolveLocale } from "@/lib/payments/i18n";
import { explicitLang, normalizeLangQuery } from "@/lib/seo/lang-urls";
import { responseHeaders } from "@/lib/seo/response-headers";

// On server start: (re)create the Cosmos API route in APISIX with the current
// COSMOS_API_URL. Runs once per process (idempotent), non-blocking.
ensureCosmosRouteSynced();

/* --- CORS ---
   cosmospay.lat (site + wallet) calls this API (dev.cosmospay.lat) cross-origin, so we
   reflect an allowed Origin and answer preflight. We reflect a specific origin (never
   `*`) with Allow-Credentials so the session cookie can ride along; origins outside the
   allowlist get no CORS headers (browser blocks them). The allowlist (and the matching
   Better Auth trustedOrigins) lives in @/lib/allowed-origins; extend via CORS_ALLOWED_ORIGINS. */
const ALLOWED_ORIGINS = new Set(ALLOWED_ORIGINS_LIST);

function isAllowedOrigin(origin: string | null): origin is string {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.has(origin)) return true;
  try {
    const { hostname } = new URL(origin);
    return hostname === "localhost" || hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

function applyCors(headers: Headers, origin: string, request: Request): void {
  headers.set("Access-Control-Allow-Origin", origin);
  headers.set("Access-Control-Allow-Credentials", "true");
  headers.set("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  const requested = request.headers.get("access-control-request-headers");
  headers.set("Access-Control-Allow-Headers", requested || "Content-Type, Authorization");
  headers.set("Access-Control-Max-Age", "86400");
  const vary = headers.get("Vary");
  headers.set("Vary", vary && !/(^|,)\s*origin\s*(,|$)/i.test(vary) ? `${vary}, Origin` : vary || "Origin");
}

/* --- Domains ---
   This one process answers cosmospay.lat, dev.cosmospay.lat and payments.cosmospay.lat. Which
   domain owns which route, and what a request for someone else's route becomes, is the table
   in src/lib/hosts.ts; the origins come from PUBLIC_SITE_URL / PUBLIC_BETTER_AUTH_URL /
   PUBLIC_PAYMENTS_URL. Static files (dist/client) are served before this runs, on every
   domain, which is fine for assets; the docs export under /docs is kept to the platform domain by
   nginx (see README). */
const ORIGINS = { site: SITE, dev: DEV, payments: PAYMENTS };

/* One year: the lifetime the language cookie has everywhere. */
const LANG_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/* The languages the company site and the gateway are written in (the same seven). Each of their
   pages exists once per language at ?lang= (src/lib/seo/lang-urls.ts). */
const LANG_CODES = LOCALES.map((l) => l.code);

/* The payments domain shows people where to send money, so it must never render inside
   someone else's frame (a framed checkout with an overlaid address is the attack). */
const PAYMENTS_SECURITY_HEADERS: Record<string, string> = {
  "Content-Security-Policy": "frame-ancestors 'none'; base-uri 'self'; object-src 'none'; form-action 'self'",
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
};

function underPaymentsMount(routePattern: string | undefined): boolean {
  return !!routePattern && (routePattern === MOUNTS.payments || routePattern.startsWith(`${MOUNTS.payments}/`));
}

/* --- Activity: this app's own API surface ---
   The Payments service logs what reaches IT. Nothing logged what reaches US, so
   the half of a session that never leaves this app (signing in, minting a key,
   loading the dashboard) was invisible in the activity feed while an API-key
   call from a script was not. Recorded here, once, rather than in forty route
   handlers that would each have to remember.

   Only for a signed-in user: a row is attributed to that account's consumer
   upstream, and an anonymous caller has none.

   The activity route itself is skipped, or the feed would be mostly a record of
   itself. */
const ACTIVITY_SKIP_PREFIXES = ["/api/activity"];

function trackApiRequest(context: {
  url: URL;
  request: Request;
  locals: { user?: { id: string } | null };
}, status: number, startedAt: number): void {
  const path = context.url.pathname;
  if (!path.startsWith("/api/")) return;
  if (ACTIVITY_SKIP_PREFIXES.some((p) => path.startsWith(p))) return;
  const userId = context.locals.user?.id;
  if (!userId) return;

  const method = context.request.method.toUpperCase();
  // A successful read is not activity worth a row. The dashboard polls notifications
  // every 20s and unread support replies every 15s per open tab, so recording every
  // 200 GET would bury the events somebody actually goes looking for, and would grow
  // the table by two rows a minute per idle tab. A FAILED read is kept: a 500 on a
  // poll is exactly the invisible breakage this feed exists for.
  const read = method === "GET" || method === "HEAD";
  if (read && status < 400) return;

  trackActivity(userId, context.url.searchParams.get("env") === "prod" ? "prod" : "dev", {
    type: "api.request",
    source: "server",
    // The severity IS the status: a feed filtered to `error` should show the
    // 500s without anyone having to know which endpoint they came from.
    level: status >= 500 ? "error" : status >= 400 ? "warn" : "info",
    category: "api",
    // Path only, never the query string: `?token=`, `?state=` and `?code=` all
    // appear on real routes here, and a telemetry row is not the place for them.
    message: `${method} ${path}`,
    durationMs: Math.round(performance.now() - startedAt),
    props: { method, path, status },
  });
}

export const onRequest = defineMiddleware(async (context, next) => {
  const origin = context.request.headers.get("origin");
  const corsOk = isAllowedOrigin(origin);

  // Answer CORS preflight directly, before auth/route work (preflight carries no creds).
  if (context.request.method === "OPTIONS") {
    const headers = new Headers();
    if (corsOk) applyCors(headers, origin, context.request);
    return new Response(null, { status: corsOk ? 204 : 403, headers });
  }

  // Next 16 client-prefetch segment files (`__next.*`) under /docs don't exist in the static
  // export, so they'd 404-flood the console. Real assets (/docs/_next/*, llms.txt, content.md)
  // are served by the static handler before this runs; only the phantom prefetches reach here.
  if (context.url.pathname.startsWith('/docs/') && context.url.pathname.includes('__next')) {
    return new Response(null, { status: 204 });
  }

  // Route by domain before any database work: a redirect needs no session.
  const decision = routeRequest(
    {
      hostname: context.url.hostname,
      pathname: context.url.pathname,
      search: context.url.search,
      method: context.request.method.toUpperCase(),
    },
    ORIGINS,
  );
  if (decision.kind === "redirect") {
    return new Response(null, { status: decision.status, headers: { Location: decision.location } });
  }
  context.locals.area = decision.area;
  context.locals.publicPath = context.url.pathname;

  // The company site and the gateway speak the visitor's language: ?lang= first (each language
  // of a page has its own address there, for search engines), then the cookie, then
  // Accept-Language, then English.
  const multilingual = decision.area === "payments" || decision.area === "site";
  const method = context.request.method.toUpperCase();
  if (multilingual && decision.kind === "rewrite" && (method === "GET" || method === "HEAD")) {
    // A `lang` the pages do not take as written (?lang=ES, ?lang=xx, twice) would be one more
    // indexable copy of the page: send it to the address that names the language, or to the bare
    // path when it names none (other parameters kept as they came).
    const fixed = normalizeLangQuery(context.url.search, LANG_CODES);
    if (fixed !== null) {
      const location = `${ORIGINS[decision.area].replace(/\/+$/, "")}${context.url.pathname}${fixed}`;
      return new Response(null, { status: 301, headers: { Location: location } });
    }
  }
  const askedLang = multilingual ? explicitLang(context.url.searchParams.get("lang"), LANG_CODES) : null;
  if (multilingual) {
    const lang = resolveLocale({
      query: askedLang,
      cookie: context.cookies.get(LANG_COOKIE)?.value,
      acceptLanguage: context.request.headers.get("accept-language"),
    });
    context.locals.lang = lang;
    // An explicit choice (the footer picker submits ?lang=) sticks for the next visit.
    if (askedLang === lang) context.cookies.set(LANG_COOKIE, lang, { path: "/", maxAge: LANG_COOKIE_MAX_AGE, sameSite: "lax" });
  }

  // Belt-and-suspenders: ensure the route was synced (no-op after the first call).
  ensureCosmosRouteSynced();

  // Read once for the whole request: an API route asking again gets this same answer.
  const isAuthed = await requestSession(context.request.headers);

  if (isAuthed) {
    context.locals.user = isAuthed.user;
    context.locals.session = isAuthed.session;
    // Best-effort: ensure the profile exists and capture sign-in location once per
    // session (emits a sign-in notification). Never blocks or fails the request.
    recordLogin(isAuthed, context).catch(() => {});
    // Track "last online" (throttled write; see touchLastSeen).
    touchLastSeen(isAuthed.user.id).catch(() => {});
  } else {
    context.locals.user = null;
    context.locals.session = null;
  }

  const startedAt = performance.now();
  // The site and payments pages render from their internal mounts; the public URL stays.
  const response =
    decision.kind === "rewrite"
      ? await next(new URL(decision.path + context.url.search, context.url))
      : decision.kind === "not-found"
        ? await next("/404")
        : await next();
  // By the page that rendered as well as by the domain asked: a payments page must never
  // leave without these, whatever path reached it.
  if (decision.area === "payments" || underPaymentsMount(context.routePattern)) {
    for (const [name, value] of Object.entries(PAYMENTS_SECURITY_HEADERS)) response.headers.set(name, value);
    // The ZK payment pages prove in the browser: bb.js needs SharedArrayBuffer, so they are
    // cross-origin isolated (src/lib/zk/bb-assets.ts).
    if (context.url.pathname === "/zk" || context.url.pathname.startsWith("/zk/")) {
      for (const [name, value] of Object.entries(ZK_ISOLATION_HEADERS)) response.headers.set(name, value);
    }
  }
  // HSTS, Referrer-Policy, the HTML charset, and Vary on the pages whose language follows the
  // visitor (src/lib/seo/response-headers.ts).
  const served = responseHeaders(response, {
    https: ORIGINS[decision.area].startsWith("https://"),
    negotiatedLang: multilingual && decision.kind === "rewrite" && askedLang === null,
  });
  if (corsOk) applyCors(served.headers, origin, context.request);
  trackApiRequest(context, served.status, startedAt);
  return served;
});