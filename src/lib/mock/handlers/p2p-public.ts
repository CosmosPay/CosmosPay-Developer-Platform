/* The P2P market's payments-domain side in mock mode, over the dashboard's mock market
   (p2p-market.ts), answering in the Payments API's own shapes (the community server's src/p2p
   entities: base units, `buyerAddress`, `tokenSymbol`, lists as `{data, total, take, skip}`, no
   envelope), so mock mode runs the same normalizers and parsers as production:
   - the public P2P app's upstream (`mockAppUpstream`): what the server route
     (src/pages/payments/p2p/api/[...path].ts) asks the Payments API for with Cosmos Pay's
     integrator key, answered here for the consumer "app". The route's session, whitelist, wallet
     binding and limits run as in production in front of it;
   - the hosted charge page's keyless routes (`handleP2pCheckout`, /mock-gateway/v1/p2p-checkout/*
     through src/lib/mock/gateway.ts): the charge's projection, the payer's order (a CHARGE order of
     the charge's consumer, delivered to the charge's wallet), its read with the payer token,
     "I transferred" and the payer's cancel.
   The orders made here are the dashboard's too: a purchase matched to the sample account's merchant
   wallet shows in its P2P orders, a charge's order in its charges. */
import { randomBytes } from "node:crypto";
import type { MockEnv } from "@/lib/mock/http";
import { apiMarket, apiOrder, apiQuote, buildFor, chargeById, clientOrderAction, orderFor, p2pStore, quoteFor } from "@/lib/mock/handlers/p2p-market";
import { checkEmail, checkHolderName, checkPayerDocument, railsFor } from "@/lib/p2p/rails";
import { merchantSells } from "@/lib/p2p/orders";
import { nowIso } from "@/lib/mock/fixtures";

export interface UpstreamAnswer {
  status: number;
  body: unknown;
}

const ok = (body: unknown, status = 200): UpstreamAnswer => ({ status, body });
const fail = (status: number, message: string, code = "validation_failed"): UpstreamAnswer => ({ status, body: { statusCode: status, code, message } });
const live = (status: string) => !["completed", "cancelled", "expired", "resolved", "failed"].includes(status);
/* The list routes take only these (the server's ValidationPipe refuses any other field). */
const ORDER_QUERY = new Set(["status", "kind", "address", "take", "skip"]);

/** One upstream call of the public P2P app, for the consumer "app" (path without /v1/p2p/). */
export function mockAppUpstream(env: MockEnv, method: string, path: string, query: URLSearchParams, body: Record<string, unknown> | null): UpstreamAnswer {
  const [a, b, c] = path.split("/").filter(Boolean);
  const s = p2pStore(env);
  if (a === "market" && method === "GET") return ok(apiMarket(env));
  if (a === "quotes" && method === "POST") {
    const q = quoteFor(env, body, "app");
    return typeof q === "string" ? fail(400, q) : ok(apiQuote(env, q), 201);
  }
  if (a === "orders" && !b && method === "POST") {
    const o = orderFor(env, body, "app");
    return typeof o === "string" ? fail(400, o) : ok(apiOrder(env, o, "client"), 201);
  }
  if (a === "orders" && !b && method === "GET") {
    const unknown = [...query.keys()].filter((k) => !ORDER_QUERY.has(k));
    if (unknown.length) return fail(400, `property ${unknown[0]} should not exist`);
    const take = Math.min(100, Math.max(1, Number(query.get("take")) || 20));
    const skip = Math.max(0, Number(query.get("skip")) || 0);
    const wallet = (query.get("address") ?? "").toLowerCase();
    const all = s.orders.filter((o) => o.consumer === "app" && (!query.get("kind") || o.kind === query.get("kind")) && (!query.get("status") || o.status === query.get("status")) && (!wallet || o.buyer?.toLowerCase() === wallet || o.seller?.toLowerCase() === wallet));
    return ok({ data: all.slice(skip, skip + take).map((o) => apiOrder(env, o, "client")), total: all.length, take, skip });
  }
  if (a === "orders" && b) {
    const o = s.orders.find((x) => x.id === b && x.consumer === "app");
    if (!o) return fail(404, "Order not found", "not_found");
    if (!c && method === "GET") return ok(apiOrder(env, o, "client"));
    if (c && method === "POST") {
      const err = clientOrderAction(env, o, c);
      if (err) return fail(400, err, "invalid_state_transition");
      if (c === "paid" && typeof body?.reference === "string") o.paidReference = body.reference.slice(0, 60) || o.paidReference || null;
      return ok(apiOrder(env, o, "client"));
    }
  }
  if (a === "transactions" && method === "POST") {
    const tx = buildFor(env, body, "app");
    if (typeof tx === "string") return fail(400, tx);
    // The server's transaction names no step.
    const { action: _a, ...unsigned } = tx;
    return ok(unsigned, 201);
  }
  return fail(404, "Not found", "not_found");
}

/* --- The hosted charge page's keyless routes --- */

const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Accept, Content-Type, X-Payer-Token",
  "Access-Control-Max-Age": "600",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });
}
const refuse = (status: number, message: string, code: string) => json({ statusCode: status, code, message }, status);

/* The payer tokens handed out here (the real server keeps only their hash), per order. */
const TOKENS_KEY = "__cosmosMockP2pPayerTokens";
function tokens(): Map<string, { env: MockEnv; orderId: string }> {
  const g = globalThis as unknown as Record<string, Map<string, { env: MockEnv; orderId: string }> | undefined>;
  return (g[TOKENS_KEY] ??= new Map());
}

function findCharge(id: string) {
  for (const env of ["dev", "prod"] as const) {
    const c = chargeById(env, id);
    if (c) return { env, c };
  }
  return null;
}

/* The charge as its payer reads it (P2pCheckoutChargeEntity): what to pay and for what, the rails
   a merchant takes now; nothing about who created it. */
function chargeView(env: MockEnv, c: NonNullable<ReturnType<typeof chargeById>>) {
  const expired = c.status === "open" && !!c.expiresAt && Date.parse(c.expiresAt) <= Date.now();
  return {
    id: c.id,
    network: c.network,
    tokenSymbol: c.token,
    currency: c.currency,
    fiatAmount: c.fiatAmount,
    description: c.description,
    status: expired ? "expired" : c.status,
    // Who the payer is paying: the name the charge's creator chose.
    merchantName: c.payeeName ?? "",
    rails: railsFor(c.currency).map((r) => r.id),
    expiresAt: c.expiresAt ?? new Date(Date.now() + 7 * 86_400_000).toISOString(),
  };
}

/* The payer's order (P2pCheckoutOrderEntity): where to transfer while it is live, the deadline. */
function payerOrderView(o: ReturnType<typeof p2pStore>["orders"][number]) {
  return {
    id: o.id,
    chargeId: o.chargeId ?? "",
    status: o.status,
    currency: o.currency,
    fiatAmount: o.fiatAmount,
    rail: o.rail,
    merchantName: o.merchant?.displayName ?? null,
    paymentDeadline: o.deadlines.payBy,
    paymentDetails: live(o.status) && o.paymentDetails ? { rail: o.paymentDetails.rail, holderName: o.paymentDetails.holderName, details: o.paymentDetails.details } : null,
    paidAt: o.status === "paid" || o.status === "completed" ? o.updatedAt ?? null : null,
    createdAt: o.createdAt,
  };
}

/** /mock-gateway/v1/p2p-checkout/<rest>. */
export async function handleP2pCheckout(request: Request, rest: string[]): Promise<Response> {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  const [kind, id, action] = rest;
  if (kind === "charges" && id) {
    const found = findCharge(id);
    if (!found) return refuse(404, "Charge not found", "not_found");
    const { env, c } = found;
    if (request.method === "GET" && !action) return json(chargeView(env, c));
    if (request.method === "POST" && action === "orders") {
      const view = chargeView(env, c);
      if (view.status !== "open") return refuse(400, "This charge can no longer be paid.", "request_closed");
      const busy = p2pStore(env).orders.some((o) => o.chargeId === c.id && live(o.status));
      if (busy && !c.multiUse) return refuse(409, "Someone is paying this charge right now.", "operation_in_flight");
      const b = (await request.json().catch(() => null)) as Record<string, unknown> | null;
      const unknown = Object.keys(b ?? {}).filter((k) => k !== "rail" && k !== "payer");
      if (unknown.length) return refuse(400, `property ${unknown[0]} should not exist`, "validation_failed");
      const payer = (b?.payer && typeof b.payer === "object" ? b.payer : {}) as Record<string, unknown>;
      const name = String(payer.name ?? "");
      const document = String(payer.document ?? "");
      const email = String(payer.email ?? "");
      const rail = String(b?.rail ?? "");
      if (checkHolderName(name) || checkPayerDocument(c.currency, document) || checkEmail(email)) return refuse(400, "Check the payer's name, document and email.", "validation_failed");
      if (!(view.rails as readonly string[]).includes(rail)) return refuse(400, "Unknown payment method.", "validation_failed");
      const q = quoteFor(env, { side: "BUY", network: c.network, token: c.token, currency: c.currency, rail, fiatAmount: c.fiatAmount }, c.consumer);
      if (typeof q === "string") return refuse(400, q, "no_match");
      const o = orderFor(env, { quoteId: q.id, recipient: c.recipient, payer: { name, document, email } }, c.consumer, { kind: "CHARGE", chargeId: c.id });
      if (typeof o === "string") return refuse(400, o, "no_match");
      const token = randomBytes(32).toString("base64url");
      tokens().set(token, { env, orderId: o.id });
      // The answer is the order itself with its token (shown once).
      return json({ ...payerOrderView(o), payerToken: token }, 201);
    }
    return refuse(404, "Not found", "not_found");
  }
  if (kind === "orders" && id) {
    const t = tokens().get(request.headers.get("x-payer-token") ?? "");
    if (!t || t.orderId !== id) return refuse(404, "Order not found", "not_found");
    const o = p2pStore(t.env).orders.find((x) => x.id === id);
    if (!o) return refuse(404, "Order not found", "not_found");
    if (request.method === "GET" && !action) return json(payerOrderView(o));
    if (request.method === "POST" && (action === "paid" || action === "cancel")) {
      if (!merchantSells(o.kind)) return refuse(404, "Order not found", "not_found");
      const err = clientOrderAction(t.env, o, action);
      if (err) return refuse(400, err, "invalid_state_transition");
      const b = (await request.json().catch(() => null)) as Record<string, unknown> | null;
      if (action === "paid" && typeof b?.reference === "string" && b.reference.trim()) o.paidReference = b.reference.trim().slice(0, 60);
      o.updatedAt = nowIso();
      return json(payerOrderView(o));
    }
  }
  return refuse(404, "Not found", "not_found");
}
