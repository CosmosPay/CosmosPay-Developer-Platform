/* /p2p/api/* on payments.cosmospay.lat: the public P2P app's server route (the page is
 * src/pages/payments/p2p/index.astro). It calls the Payments API's P2P market with Cosmos Pay's own
 * integrator key (P2P_APP_API_KEY), which never leaves this server, for a visitor bound to the EVM
 * wallet they signed in with (EIP-191 over a single-use challenge; the session is a signed,
 * HttpOnly, SameSite=Strict cookie on /p2p: src/lib/p2p/app-session.ts).
 *
 * Only a whitelist goes through, each call bound to the session's wallet: a purchase delivers to
 * it, a sale is sent from it, an order is read or acted on only when it is the wallet's, and the
 * only transactions built are the release, cancel or dispute of the wallet's own sale
 * (src/lib/p2p/app-guard.ts, where every rule lives and is tested). Limits per network address and
 * per wallet (src/lib/rate-limit.ts), bodies read up to 16 KB, only this origin may write, and
 * nothing is cached.
 *
 * The Payments API answers its own shapes (base units, `buyerAddress`, `tokenSymbol`, lists as
 * `{data, total, take, skip}`, no envelope); this route hands the page the screens' shapes
 * (src/lib/p2p/normalize.ts), so the browser reads one vocabulary in mock mode and in production.
 *
 * Mock mode answers from the mock market (src/lib/mock/handlers/p2p-public.ts, consumer "app")
 * instead of the gateway, and takes any well-formed signature, as every wallet proof there; the
 * session, the whitelist, the binding and the limits run as in production. */
import type { APIRoute } from "astro";
import { P2P_APP_API_KEY, P2P_APP_API_URL, P2P_APP_SESSION_SECRET } from "astro:env/server";
import { API_BASE, PAYMENTS } from "@/lib/payments/urls";
import { isMockMode } from "@/lib/mock/mode";
import { allow, withinBudget } from "@/lib/rate-limit";
import { readCapped } from "@/lib/payments/contact";
import {
  APP_COOKIE, ChallengeStore, SESSION_TTL_MS, clearSessionCookie, cookieValue, envFromKey, readSession, sessionCookie, signSession, verifyChallenge,
  type AppEnv, type AppSession,
} from "@/lib/p2p/app-session";
import {
  HISTORY_PAGES, HISTORY_TAKE, LIMITS, MAX_BODY, challengeAddress, clientKey, needsSession, orderBody, originAllowed, ownOrders, ownsOrder, paidBody, quoteBody, routeOf, transactionBody,
  type AppRoute,
} from "@/lib/p2p/app-guard";
import { normalizeMarket, normalizeOrder, normalizeQuote } from "@/lib/p2p/normalize";
import type { P2pOrder } from "@/lib/p2p/types";

const MOCK = isMockMode();
/* Mock mode only (the dev server): a fixed secret, so a reload keeps the visitor signed in. */
const MOCK_SECRET = "cosmospay-mock-p2p-app-session-secret-0001";
const MOCK_ENV: AppEnv = "prod";
/* The open challenges survive a dev reload (HMR) on globalThis; a restart forgets them. */
const challenges: ChallengeStore = ((globalThis as Record<string, unknown>).__cosmosP2pAppChallenges ??= new ChallengeStore()) as ChallengeStore;

const PAYMENTS_URL = new URL(PAYMENTS);
const SECURE = PAYMENTS_URL.protocol === "https:";
let warned = false;

function reply(status: number, data: unknown, message = "OK", headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify({ data, code: status, message }), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...headers },
  });
}
const refuse = (status: number, message: string, headers: Record<string, string> = {}) => reply(status, null, message, headers);

/** The key and secret this route works with, or null when it is not configured. */
function config(): { key: string; secret: string; env: AppEnv } | null {
  if (MOCK) return { key: "mock", secret: MOCK_SECRET, env: MOCK_ENV };
  const key = P2P_APP_API_KEY.trim();
  const secret = P2P_APP_SESSION_SECRET;
  if (!key || !secret || secret.length < 32) {
    if (!warned) {
      warned = true;
      console.error("[p2p-app] P2P_APP_API_KEY and P2P_APP_SESSION_SECRET (32+ characters) are required; /p2p/api answers 503");
    }
    return null;
  }
  return { key, secret, env: envFromKey(key) };
}

interface Upstream { status: number; data: unknown; message: string }

const obj = (v: unknown): Record<string, unknown> | null => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null);
/* The Payments API answers its objects as they are (no envelope: a transaction's own `data` is its
   calldata) and its errors as `{statusCode, message}`. */
function answer(status: number, json: unknown): Upstream {
  const o = obj(json);
  const message = status >= 400 && typeof o?.message === "string" && o.message.length <= 300 ? o.message : "";
  return { status, data: json, message };
}
/* The rows of a list page (`{data, total, take, skip}`), or of a bare array. */
const rowsOf = (v: unknown): unknown[] => (Array.isArray(v) ? v : Array.isArray(obj(v)?.data) ? (obj(v)!.data as unknown[]) : []);

/** One call to the Payments API's /v1/p2p/<path> with the integrator key (or the mock market). */
async function upstream(cfg: { key: string; env: AppEnv }, method: string, path: string, body?: Record<string, unknown>, query?: URLSearchParams): Promise<Upstream> {
  if (MOCK) {
    const { mockAppUpstream } = await import("@/lib/mock/handlers/p2p-public");
    const a = mockAppUpstream(cfg.env, method, path, query ?? new URLSearchParams(), body ?? null);
    return answer(a.status, a.body);
  }
  const base = (P2P_APP_API_URL.trim() || API_BASE).replace(/\/+$/, "");
  const url = `${base}/v1/p2p/${path}${query && [...query].length ? `?${query}` : ""}`;
  try {
    const res = await fetch(url, {
      method,
      headers: { Authorization: `Bearer ${cfg.key}`, Accept: "application/json", ...(body ? { "Content-Type": "application/json" } : {}) },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(15_000),
    });
    return answer(res.status, await res.json().catch(() => null));
  } catch (err) {
    console.error(`[p2p-app] /v1/p2p/${path.split("/")[0]} failed: ${(err as { cause?: { code?: string } })?.cause?.code ?? (err as Error)?.name}`);
    return { status: 502, data: null, message: "" };
  }
}

/** The upstream answer as this route's, with a neutral message for a server error. */
const pass = (u: Upstream, data: unknown = u.data) =>
  u.status >= 500 || u.status === 0
    ? refuse(502, "The P2P market could not be reached. Try again in a moment.")
    : u.status >= 400
      ? refuse(u.status === 401 || u.status === 403 ? 503 : u.status, u.message || "The request was refused.")
      : reply(u.status, data);

/* An order in the screens' shape (amounts in the token's decimals, the parties as buyer and
   seller, a sale's two transactions tagged). */
const asOrder = (v: unknown): P2pOrder | null => (obj(v) ? normalizeOrder(v) : null);

async function readOwnOrder(cfg: { key: string; env: AppEnv }, id: string, address: string): Promise<{ order: P2pOrder } | { response: Response }> {
  const u = await upstream(cfg, "GET", `orders/${encodeURIComponent(id)}`);
  if (u.status >= 400 && u.status !== 404) return { response: pass(u) };
  const order = u.status < 400 ? asOrder(u.data) : null;
  if (!order || !ownsOrder(order, address)) return { response: refuse(404, "Order not found") };
  return { order };
}

export const ALL: APIRoute = async ({ request, url, clientAddress }) => {
  const at = url.pathname.indexOf("/p2p/api/");
  const segments = at < 0 ? [] : url.pathname.slice(at + "/p2p/api/".length).split("/").filter(Boolean);
  const r: AppRoute | null = routeOf(request.method, segments);
  if (!r) return refuse(404, "Not found");
  const cfg = config();
  if (!cfg) return refuse(503, "The P2P market is not available right now.");
  if (!originAllowed(request.method, request.headers, PAYMENTS_URL.origin)) return refuse(403, "Forbidden");

  const session: AppSession | null = readSession(cfg.secret, cookieValue(request.headers.get("cookie"), APP_COOKIE), Date.now(), cfg.env);
  if (needsSession(r.op) && !session) return refuse(401, "Sign in with your wallet first.");

  const ip = clientKey(request.headers, clientAddress);
  const limit = LIMITS[r.op];
  const within = withinBudget(limit.bucket, `ip:${ip}`, limit.perKey, limit.global) && (!session || allow(limit.bucket, `w:${session.address}`, limit.perKey));
  if (!within) return refuse(429, "Too many requests. Try again in a minute.", { "Retry-After": "60" });

  let body: Record<string, unknown> | null = null;
  if (request.method !== "GET" && request.method !== "HEAD" && request.method !== "DELETE") {
    const raw = await readCapped(request.body, MAX_BODY).catch(() => null);
    if (raw === null) return refuse(413, "The request is too large.");
    if (raw.byteLength) {
      try {
        body = obj(JSON.parse(new TextDecoder().decode(raw)));
      } catch {
        return refuse(400, "The request is not valid JSON.");
      }
    }
  }

  switch (r.op) {
    case "challenge": {
      const address = challengeAddress(body);
      if (!address) return refuse(400, "Connect an EVM wallet.");
      const c = challenges.issue(address, PAYMENTS_URL.host, cfg.env);
      return reply(201, { id: c.id, message: c.message, expiresAt: new Date(c.expiresAt).toISOString() });
    }
    case "signIn": {
      const c = challenges.consume(body?.challengeId);
      if (!c || c.host !== PAYMENTS_URL.host || c.env !== cfg.env) return refuse(400, "The sign-in request expired. Try again.");
      if (!verifyChallenge(c, body?.signature, MOCK)) return refuse(401, "The signature is not this wallet's.");
      const exp = Date.now() + SESSION_TTL_MS;
      const token = signSession(cfg.secret, { address: c.address, env: cfg.env, exp });
      return reply(201, { address: c.address, expiresAt: new Date(exp).toISOString() }, "OK", {
        "Set-Cookie": sessionCookie(token, { secure: SECURE, maxAgeSeconds: SESSION_TTL_MS / 1000 }),
      });
    }
    case "session":
      // Signed out is an answer, not an error: the page asks on every load.
      return reply(200, session ? { address: session.address, expiresAt: new Date(session.exp).toISOString() } : null);
    case "signOut":
      return reply(200, null, "OK", { "Set-Cookie": clearSessionCookie(SECURE) });
    case "market": {
      const u = await upstream(cfg, "GET", "market");
      return u.status < 400 ? pass(u, normalizeMarket(u.data)) : pass(u);
    }
    case "quote": {
      const shaped = quoteBody(body);
      if (!shaped.ok) return refuse(400, shaped.message);
      const u = await upstream(cfg, "POST", "quotes", shaped.body);
      return u.status < 400 ? pass(u, normalizeQuote(u.data)) : pass(u);
    }
    case "createOrder": {
      const shaped = orderBody(body, session!.address);
      if (!shaped.ok) return refuse(400, shaped.message);
      const u = await upstream(cfg, "POST", "orders", shaped.body);
      if (u.status >= 400) return pass(u);
      // The API answered an order: it must be this wallet's, or nothing is shown.
      const order = asOrder(u.data);
      if (!order || !ownsOrder(order, session!.address)) {
        console.error("[p2p-app] the API answered an order that is not the session's wallet's");
        return refuse(502, "The P2P market could not be reached. Try again in a moment.");
      }
      return pass(u, order);
    }
    case "listOrders": {
      // The API takes no address filter: the integrator's newest pages, the wallet's rows kept.
      const own: P2pOrder[] = [];
      for (let p = 0; p < HISTORY_PAGES; p++) {
        const u = await upstream(cfg, "GET", "orders", undefined, new URLSearchParams({ take: String(HISTORY_TAKE), skip: String(p * HISTORY_TAKE) }));
        if (u.status >= 400) return p === 0 ? pass(u) : reply(200, own);
        const rows = rowsOf(u.data);
        own.push(...ownOrders(rows.map(asOrder).filter((o): o is P2pOrder => !!o), session!.address));
        if (rows.length < HISTORY_TAKE) break;
      }
      return reply(200, own);
    }
    case "getOrder": {
      const got = await readOwnOrder(cfg, r.id, session!.address);
      return "response" in got ? got.response : reply(200, got.order);
    }
    case "orderAction": {
      const got = await readOwnOrder(cfg, r.id, session!.address);
      if ("response" in got) return got.response;
      const u = await upstream(cfg, "POST", `orders/${encodeURIComponent(r.id)}/${r.action}`, r.action === "paid" ? paidBody(body) : {});
      return u.status < 400 ? pass(u, asOrder(u.data) ?? got.order) : pass(u);
    }
    case "transaction": {
      const id = typeof body?.orderId === "string" && /^[a-z0-9][a-z0-9-]{7,63}$/i.test(body.orderId) ? body.orderId : "";
      if (!id) return refuse(400, "An order is required.");
      const got = await readOwnOrder(cfg, id, session!.address);
      if ("response" in got) return got.response;
      const shaped = transactionBody(body, got.order, session!.address);
      if (!shaped.ok) return refuse(400, shaped.message);
      return pass(await upstream(cfg, "POST", "transactions", shaped.body));
    }
  }
};
