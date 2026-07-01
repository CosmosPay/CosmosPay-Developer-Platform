import { auth } from "@/lib/auth";
import { recordLogin, touchLastSeen } from "@/lib/profile";
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

  const response = await next();
  if (corsOk) applyCors(response.headers, origin, context.request);
  return response;
});