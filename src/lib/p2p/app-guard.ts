/* app-guard.ts: what the public P2P app's server route lets through to the Payments API, under
   Cosmos Pay's integrator key, for a visitor bound to one wallet (app-session.ts). A whitelist:
   anything not named here answers 404 without leaving this server.

     GET  market                               the networks, tokens, currencies and rails
     POST quotes                               a price for an amount (only the quote's own fields)
     POST orders                               BUY: the recipient IS the session's wallet;
                                               SELL: the seller IS the session's wallet
     GET  orders                               the wallet's purchases and sales, nothing else
     GET  orders/{id}                          404 unless the order is the wallet's
     POST orders/{id}/paid|cancel|dispute      the same check first
     POST transactions                         release, cancel or dispute of the wallet's own sale,
                                               built for the wallet's address only

   Plus the session's own calls (challenge, sign in, read, sign out), which never reach the API.
   Every decision is here, pure, so tests/unit/p2pAppGuard.test.ts covers each rule; the route
   only wires it to the request. */
import type { P2pOrder } from "@/lib/p2p/types";
import type { RatePolicy } from "@/lib/rate-limit";

export type AppRoute =
  | { op: "challenge" }
  | { op: "signIn" }
  | { op: "session" }
  | { op: "signOut" }
  | { op: "market" }
  | { op: "quote" }
  | { op: "createOrder" }
  | { op: "listOrders" }
  | { op: "getOrder"; id: string }
  | { op: "orderAction"; id: string; action: "paid" | "cancel" | "dispute" }
  | { op: "transaction" };

export type AppOp = AppRoute["op"];

const ID = /^[a-z0-9][a-z0-9-]{7,63}$/;
const EVM = /^0x[0-9a-fA-F]{40}$/;
const SIDES = ["BUY", "SELL"] as const;

/** The operation a method and path (the segments after /p2p/api/) name, or null. */
export function routeOf(method: string, segments: string[]): AppRoute | null {
  const m = method.toUpperCase();
  const [a, b, c, ...rest] = segments;
  if (rest.length) return null;
  if (a === "session") {
    if (b === "challenge" && !c && m === "POST") return { op: "challenge" };
    if (b) return null;
    if (m === "POST") return { op: "signIn" };
    if (m === "GET") return { op: "session" };
    if (m === "DELETE") return { op: "signOut" };
    return null;
  }
  if (a === "market" && !b && m === "GET") return { op: "market" };
  if (a === "quotes" && !b && m === "POST") return { op: "quote" };
  if (a === "transactions" && !b && m === "POST") return { op: "transaction" };
  if (a === "orders") {
    if (!b) return m === "GET" ? { op: "listOrders" } : m === "POST" ? { op: "createOrder" } : null;
    if (!ID.test(b)) return null;
    if (!c) return m === "GET" ? { op: "getOrder", id: b } : null;
    if (m === "POST" && (c === "paid" || c === "cancel" || c === "dispute")) return { op: "orderAction", id: b, action: c };
  }
  return null;
}

/** Whether an operation needs the wallet's session (everything but signing in). */
export const needsSession = (op: AppOp) => op !== "challenge" && op !== "signIn" && op !== "session" && op !== "signOut";

type Body = Record<string, unknown> | null;
type Shaped = { ok: true; body: Record<string, unknown> } | { ok: false; message: string };

const text = (v: unknown, max: number) => (typeof v === "string" && v.trim() && v.length <= max ? v.trim() : undefined);
const amount = (v: unknown) => (typeof v === "string" && /^\d{1,18}(\.\d{1,18})?$/.test(v.trim()) && Number(v) > 0 ? v.trim() : undefined);

/** A quote's body: only the fields a quote takes, checked for shape (the API checks the rest). */
export function quoteBody(body: Body): Shaped {
  const side = body?.side;
  if (!SIDES.includes(side as never)) return { ok: false, message: "Choose to buy or to sell." };
  const network = text(body?.network, 40);
  const token = text(body?.token, 20);
  const currency = text(body?.currency, 3);
  const rail = text(body?.rail, 40);
  if (!network || !token || !currency || !rail) return { ok: false, message: "A network, a token, a currency and a payment method are required." };
  const fiatAmount = amount(body?.fiatAmount);
  const tokenAmount = amount(body?.tokenAmount);
  if (!!fiatAmount === !!tokenAmount) return { ok: false, message: "Enter one amount." };
  return { ok: true, body: { side, network, token, currency, rail, ...(fiatAmount ? { fiatAmount } : { tokenAmount }) } };
}

/** An order's body for the session's wallet: a purchase delivers to it, a sale is sent from it.
    Whatever the browser said about either address is dropped. */
export function orderBody(body: Body, address: string): Shaped {
  const quoteId = text(body?.quoteId, 80);
  if (!quoteId) return { ok: false, message: "A quote is required." };
  const side = body?.side;
  if (side === "BUY") {
    const payer = (body?.payer && typeof body.payer === "object" ? body.payer : {}) as Record<string, unknown>;
    const name = text(payer.name, 80);
    const document = text(payer.document, 30);
    const email = payer.email === undefined || payer.email === "" ? undefined : text(payer.email, 254);
    if (!name || !document) return { ok: false, message: "The payer's name and document are required." };
    if (payer.email !== undefined && payer.email !== "" && !email) return { ok: false, message: "The payer's email is not valid." };
    return { ok: true, body: { quoteId, kind: "BUY", recipient: address, payer: { name, document, ...(email ? { email } : {}) } } };
  }
  if (side === "SELL") {
    const payout = (body?.payout && typeof body.payout === "object" ? body.payout : {}) as Record<string, unknown>;
    const holderName = text(payout.holderName, 80);
    const document = typeof payout.document === "string" ? payout.document.trim().slice(0, 30) : "";
    const raw = (payout.details && typeof payout.details === "object" ? payout.details : {}) as Record<string, unknown>;
    const details: Record<string, string> = {};
    for (const [k, v] of Object.entries(raw).slice(0, 12)) {
      if (/^[a-zA-Z]{1,24}$/.test(k) && typeof v === "string" && v.trim() && v.length <= 80) details[k] = v.trim();
    }
    if (!holderName || !Object.keys(details).length) return { ok: false, message: "The account the money goes to is required." };
    return { ok: true, body: { quoteId, kind: "SELL", seller: address, payout: { holderName, document, details } } };
  }
  return { ok: false, message: "Choose to buy or to sell." };
}

const same = (a: string | null | undefined, b: string) => typeof a === "string" && a.toLowerCase() === b.toLowerCase();

/** Whether an order is the wallet's: a purchase it receives, or a sale it sends. */
export function ownsOrder(order: Pick<P2pOrder, "kind" | "buyer" | "seller"> | null | undefined, address: string): boolean {
  if (!order) return false;
  if (order.kind === "BUY") return same(order.buyer, address);
  if (order.kind === "SELL") return same(order.seller, address);
  return false;
}

/** The wallet's own orders out of an upstream list (whatever filter the API applied). */
export function ownOrders<T extends Pick<P2pOrder, "kind" | "buyer" | "seller">>(orders: T[], address: string): T[] {
  return orders.filter((o) => ownsOrder(o, address));
}

/** The transaction builder's body for the wallet's own sale: release, cancel or dispute only, from
    the wallet's address, on the order's network. */
export function transactionBody(body: Body, order: Pick<P2pOrder, "id" | "kind" | "seller" | "network"> | null, address: string): Shaped {
  const action = body?.action;
  if (action !== "release" && action !== "cancel" && action !== "dispute") return { ok: false, message: "Unknown action." };
  if (!order || order.kind !== "SELL" || !same(order.seller, address)) return { ok: false, message: "Order not found." };
  return { ok: true, body: { network: order.network, from: address, action, args: { orderId: order.id } } };
}

/** The reference a payer reports with "I transferred" (optional, short, one line). */
export function paidBody(body: Body): Record<string, unknown> {
  const reference = typeof body?.reference === "string" ? body.reference.replace(/[\r\n]+/g, " ").trim().slice(0, 60) : "";
  return reference ? { reference } : {};
}

/** The body for an address the browser names (the challenge's). */
export function challengeAddress(body: Body): string | null {
  return typeof body?.address === "string" && EVM.test(body.address.trim()) ? body.address.trim() : null;
}

/* --- Limits (src/lib/rate-limit.ts withinBudget): per network address and per wallet, and a
   global ceiling no rotation of either gets past. In memory, one process: a first line, the
   Payments API counts the integrator's calls too. --- */

export interface OpLimit {
  bucket: string;
  perKey: RatePolicy;
  global: RatePolicy;
}

const MIN = 60_000;
export const LIMITS: Record<AppOp, OpLimit> = {
  challenge: { bucket: "p2p-app:challenge", perKey: { limit: 10, windowMs: 10 * MIN }, global: { limit: 600, windowMs: 10 * MIN } },
  signIn: { bucket: "p2p-app:sign-in", perKey: { limit: 10, windowMs: 10 * MIN }, global: { limit: 600, windowMs: 10 * MIN } },
  session: { bucket: "p2p-app:session", perKey: { limit: 120, windowMs: MIN }, global: { limit: 6000, windowMs: MIN } },
  signOut: { bucket: "p2p-app:sign-out", perKey: { limit: 30, windowMs: MIN }, global: { limit: 3000, windowMs: MIN } },
  market: { bucket: "p2p-app:market", perKey: { limit: 60, windowMs: MIN }, global: { limit: 3000, windowMs: MIN } },
  quote: { bucket: "p2p-app:quote", perKey: { limit: 40, windowMs: MIN }, global: { limit: 2000, windowMs: MIN } },
  createOrder: { bucket: "p2p-app:order", perKey: { limit: 10, windowMs: 10 * MIN }, global: { limit: 300, windowMs: 10 * MIN } },
  listOrders: { bucket: "p2p-app:orders", perKey: { limit: 60, windowMs: MIN }, global: { limit: 3000, windowMs: MIN } },
  getOrder: { bucket: "p2p-app:order-read", perKey: { limit: 120, windowMs: MIN }, global: { limit: 6000, windowMs: MIN } },
  orderAction: { bucket: "p2p-app:order-action", perKey: { limit: 20, windowMs: 10 * MIN }, global: { limit: 600, windowMs: 10 * MIN } },
  transaction: { bucket: "p2p-app:transaction", perKey: { limit: 20, windowMs: 10 * MIN }, global: { limit: 600, windowMs: 10 * MIN } },
};

/** The largest body the route reads, whatever Content-Length says. */
export const MAX_BODY = 16_384;

/** The caller's network address for the limits: Cloudflare's header (it overwrites it), else the
    connection's own address; never X-Forwarded-For or X-Real-IP, which a client writes. */
export function clientKey(headers: Headers, peer: string | undefined): string {
  return headers.get("cf-connecting-ip")?.trim() || peer || "unknown";
}

/** Only the payments origin may change anything: a non-GET needs its Origin (or, without one, a
    same-origin fetch). With SameSite=Strict on the cookie this is the second lock. */
export function originAllowed(method: string, headers: Headers, paymentsOrigin: string): boolean {
  const m = method.toUpperCase();
  if (m === "GET" || m === "HEAD") return true;
  const origin = headers.get("origin");
  if (origin) return origin === paymentsOrigin;
  return headers.get("sec-fetch-site") === "same-origin";
}
