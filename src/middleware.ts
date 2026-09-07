import { auth } from "@/lib/auth";
import { recordLogin, touchLastSeen } from "@/lib/profile";
import { trackActivity } from "@/lib/activity";
import { ensureCosmosRouteSynced } from "@/lib/apisix-route";
import { defineMiddleware } from "astro:middleware";
import { ALLOWED_ORIGINS as ALLOWED_ORIGINS_LIST } from "@/lib/allowed-origins";

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

/* --- Activity: this app's own API surface ---
   The Payments service logs what reaches IT. Nothing logged what reaches US, so
   the half of a session that never leaves this app — signing in, minting a key,
   loading the dashboard — was invisible in the activity feed while an API-key
   call from a script was not. Recorded here, once, rather than in forty route
   handlers that would each have to remember.

   Only for a signed-in user: a row is attributed to that account's consumer
   upstream, and an anonymous caller has none. The public wallet routes are not
   lost by that — the wallet reports its own side to /api/telemetry.

   The two telemetry routes are skipped, or the feed would be mostly a record of
   itself. */
const ACTIVITY_SKIP_PREFIXES = ["/api/activity", "/api/telemetry"];

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
  // 200 GET would bury the events somebody actually goes looking for — and would grow
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

  // Answer CORS preflight directly — before auth/route work (preflight carries no creds).
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

  // Belt-and-suspenders: ensure the route was synced (no-op after the first call).
  ensureCosmosRouteSynced();

  const isAuthed = await auth.api
    .getSession({
      headers: context.request.headers,
    })

  if (isAuthed) {
    context.locals.user = isAuthed.user;
    context.locals.session = isAuthed.session;
    // Best-effort: ensure the profile exists and capture sign-in location once per
    // session (emits a sign-in notification). Never blocks or fails the request.
    recordLogin(isAuthed, context).catch(() => {});
    // Track "last online" (throttled write — see touchLastSeen).
    touchLastSeen(isAuthed.user.id).catch(() => {});
  } else {
    context.locals.user = null;
    context.locals.session = null;
  }

  const startedAt = performance.now();
  const response = await next();
  if (corsOk) applyCors(response.headers, origin, context.request);
  trackApiRequest(context, response.status, startedAt);
  return response;
});