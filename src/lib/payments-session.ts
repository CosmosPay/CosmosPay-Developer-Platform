/* The platform calls the gateway's domain (payments) may make with the visitor's session cookie.
   That origin stays off the session's allowlist (src/lib/allowed-origins.ts: an origin there is
   trusted with the whole session), so the middleware gives a credentialed CORS allowance to these
   requests only, from that one origin:
   - GET /api/nav-session, who is signed in, for the nav (src/lib/nav-session.ts);
   - the public swap page's calls for a signed-in visitor (product owner, 2026-11-04: "with my plan
     the commission should come down"): which organizations they belong to, and quoting, opening,
     reading by id, submitting and reporting a deposit for a swap of one of them, so the swap pays
     that organization's plan's commission (src/lib/swap-api.ts orgSwapApi with the platform's
     origin). Never a list of an organization's records, its keys, its settings or its members.
   The routes still check the session, the membership and the permission themselves; this only
   lets the browser read their answers. No astro:env import here, so the unit tests can load it. */
import { NAV_SESSION_PATH } from "@/lib/nav-session";

type Rule = readonly [method: "GET" | "POST", path: RegExp];

const ID = "[^/]+";
const RULES: Rule[] = [
  ["GET", new RegExp(`^${NAV_SESSION_PATH}$`)],
  ["GET", /^\/api\/organizations$/],
  ["POST", /^\/api\/swaps\/quote$/],
  ["POST", /^\/api\/swaps$/],
  ["GET", new RegExp(`^/api/swaps/${ID}$`)],
  ["POST", new RegExp(`^/api/swaps/${ID}/submit$`)],
  ["GET", /^\/api\/cross-chain-swaps\/assets$/],
  ["POST", /^\/api\/cross-chain-swaps\/quote$/],
  ["POST", /^\/api\/cross-chain-swaps$/],
  ["GET", new RegExp(`^/api/cross-chain-swaps/${ID}$`)],
  ["POST", new RegExp(`^/api/cross-chain-swaps/${ID}/deposit$`)],
  ["GET", /^\/api\/usdt0\/routes$/],
  ["POST", /^\/api\/usdt0\/quote$/],
  ["POST", /^\/api\/usdt0\/transfers$/],
  ["GET", new RegExp(`^/api/usdt0/transfers/${ID}$`)],
  ["POST", new RegExp(`^/api/usdt0/transfers/${ID}/submit$`)],
];

/** Whether the payments domain may make this call with the session. */
export function paymentsSessionRoute(method: string, pathname: string): boolean {
  const m = method.toUpperCase();
  return RULES.some(([rm, path]) => rm === m && path.test(pathname));
}

const fromOrigin = (origin: string | null, payments: string): origin is string => {
  if (!origin) return false;
  try {
    return new URL(payments).origin === origin;
  } catch {
    return false;
  }
};

/** Whether a response to this request gets sessionCors: one of the calls above, from `payments`. */
export function wantsPaymentsSessionCors(method: string, pathname: string, origin: string | null, payments: string): boolean {
  return fromOrigin(origin, payments) && paymentsSessionRoute(method, pathname);
}

/** The credentialed allowance: the origin reflected (never `*`), with credentials, Vary kept. */
export function sessionCors(headers: Headers, origin: string): void {
  headers.set("Access-Control-Allow-Origin", origin);
  headers.set("Access-Control-Allow-Credentials", "true");
  const vary = headers.get("Vary");
  headers.set("Vary", vary && !/(^|,)\s*origin\s*(,|$)/i.test(vary) ? `${vary}, Origin` : vary || "Origin");
}

/** The answer to a preflight for one of the calls above from `payments` (a JSON POST needs one),
    or null when the preflight asks for anything else. Only Content-Type may be sent. */
export function paymentsSessionPreflight(request: Request, pathname: string, payments: string): Headers | null {
  const origin = request.headers.get("origin");
  const method = request.headers.get("access-control-request-method") ?? "";
  if (!wantsPaymentsSessionCors(method, pathname, origin, payments)) return null;
  const asked = (request.headers.get("access-control-request-headers") ?? "").split(",").map((h) => h.trim().toLowerCase()).filter(Boolean);
  if (asked.some((h) => h !== "content-type")) return null;
  const headers = new Headers();
  sessionCors(headers, origin!);
  headers.set("Access-Control-Allow-Methods", method.toUpperCase());
  headers.set("Access-Control-Allow-Headers", "Content-Type");
  headers.set("Access-Control-Max-Age", "600");
  return headers;
}
