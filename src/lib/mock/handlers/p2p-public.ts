/* The P2P market's payments-domain side in mock mode, over the dashboard's mock market
   (p2p-market.ts):
   - the public P2P app's upstream (`mockAppUpstream`): what the server route
     (src/pages/payments/p2p/api/[...path].ts) asks the Payments API for with Cosmos Pay's
     integrator key, answered here for the consumer "app" instead. The route's session, whitelist,
     wallet binding and limits run as in production in front of it;
   - the hosted charge page's keyless routes (`handleP2pCheckout`, /mock-gateway/v1/p2p-checkout/*
     through src/lib/mock/gateway.ts): the charge's projection, the payer's order (a CHARGE order of
     the charge's consumer, delivered to the charge's wallet), its read with the payer token and
     "I transferred".
   The orders made here are the dashboard's too: a purchase matched to the sample account's merchant
   wallet shows in its P2P orders, a charge's order in its charges. */
import { randomBytes } from "node:crypto";
import type { MockEnv } from "@/lib/mock/http";
import { buildFor, chargeById, clientOrderAction, mockP2pMarket, orderFor, orderView, p2pStore, quoteFor } from "@/lib/mock/handlers/p2p-market";
import { checkEmail, checkHolderName, checkPayerDocument, railsFor } from "@/lib/p2p/rails";
import { merchantSells } from "@/lib/p2p/orders";
import { nowIso } from "@/lib/mock/fixtures";

export interface UpstreamAnswer {
  status: number;
  body: unknown;
}

const ok = (data: unknown, status = 200): UpstreamAnswer => ({ status, body: { data, message: "OK" } });
const fail = (status: number, message: string): UpstreamAnswer => ({ status, body: { data: null, statusCode: status, message } });
const live = (status: string) => !["completed", "cancelled", "expired", "resolved", "failed"].includes(status);

/** One upstream call of the public P2P app, for the consumer "app" (path without /v1/p2p/). */
export function mockAppUpstream(env: MockEnv, method: string, path: string, query: URLSearchParams, body: Record<string, unknown> | null): UpstreamAnswer {
  const [a, b, c] = path.split("/").filter(Boolean);
  const s = p2pStore(env);
  if (a === "market" && method === "GET") return ok(mockP2pMarket(env));
  if (a === "quotes" && method === "POST") {
    const q = quoteFor(env, body, "app");
    if (typeof q === "string") return fail(400, q);
    const { offerId: _o, merchantAccountId: _m, consumer: _c, ...view } = q;
    return ok(view, 201);
  }
  if (a === "orders" && !b && method === "POST") {
    const o = orderFor(env, body, "app");
    return typeof o === "string" ? fail(400, o) : ok(orderView(o, "client"), 201);
  }
  if (a === "orders" && !b && method === "GET") {
    const address = (query.get("address") ?? "").toLowerCase();
    const rows = s.orders
      .filter((o) => o.consumer === "app" && (!address || o.buyer?.toLowerCase() === address || o.seller?.toLowerCase() === address))
      .slice(0, 50)
      .map((o) => orderView(o, "client"));
    return ok({ data: rows, total: rows.length, take: 50, skip: 0 });
  }
  if (a === "orders" && b) {
    const o = s.orders.find((x) => x.id === b && x.consumer === "app");
    if (!o) return fail(404, "Order not found");
    if (!c && method === "GET") return ok(orderView(o, "client"));
    if (c && method === "POST") {
      const err = clientOrderAction(env, o, c);
      if (err) return fail(400, err);
      if (c === "paid" && typeof body?.reference === "string") o.paidReference = body.reference.slice(0, 60) || o.paidReference || null;
      return ok(orderView(o, "client"));
    }
  }
  if (a === "transactions" && method === "POST") {
    const tx = buildFor(env, body, "app");
    return typeof tx === "string" ? fail(400, tx) : ok(tx, 201);
  }
  return fail(404, "Not found");
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

/* The charge as a payer sees it: what to pay and for what; never the recipient's address. */
function chargeView(env: MockEnv, c: NonNullable<ReturnType<typeof chargeById>>) {
  const net = mockP2pMarket(env).networks.find((n) => n.id === c.network);
  const expired = c.status === "open" && !!c.expiresAt && Date.parse(c.expiresAt) <= Date.now();
  const open = p2pStore(env).orders.find((o) => o.chargeId === c.id && live(o.status));
  return {
    id: c.id,
    currency: c.currency,
    fiatAmount: c.fiatAmount,
    description: c.description,
    merchantName: "Lumio",
    network: c.network,
    networkName: net?.name ?? null,
    token: c.token,
    status: expired ? "expired" : c.status,
    expiresAt: c.expiresAt,
    multiUse: c.multiUse,
    rails: railsFor(c.currency).map((r) => r.id),
    tier: env === "prod" ? "mainnet" : "testnet",
    openOrderId: open && !c.multiUse ? open.id : null,
  };
}

/* The payer's view of their order: the merchant's account to pay into and the amount. */
function payerOrderView(o: ReturnType<typeof p2pStore>["orders"][number]) {
  return {
    id: o.id,
    status: o.status,
    currency: o.currency,
    fiatAmount: o.fiatAmount,
    rail: o.rail,
    token: o.token,
    tokenAmount: o.tokenAmount,
    network: o.network,
    payBy: o.deadlines.payBy,
    paymentDetails: o.paymentDetails ?? null,
    paidReference: o.paidReference ?? null,
    merchantName: o.merchant?.displayName ?? null,
    txs: o.txs?.release ? { release: o.txs.release } : {},
  };
}

/** /mock-gateway/v1/p2p-checkout/<rest>. */
export async function handleP2pCheckout(request: Request, rest: string[]): Promise<Response> {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  const [kind, id, action] = rest;
  if (kind === "charges" && id) {
    const found = findCharge(id);
    if (!found) return json({ statusCode: 404, message: "Charge not found" }, 404);
    const { env, c } = found;
    if (request.method === "GET" && !action) return json({ data: chargeView(env, c) });
    if (request.method === "POST" && action === "orders") {
      const view = chargeView(env, c);
      if (view.status !== "open") return json({ statusCode: 400, message: "This charge can no longer be paid." }, 400);
      if (view.openOrderId) return json({ statusCode: 409, message: "Someone is paying this charge right now." }, 409);
      const b = (await request.json().catch(() => null)) as Record<string, unknown> | null;
      const name = String(b?.payerName ?? "");
      const document = String(b?.payerDocument ?? "");
      const email = String(b?.payerEmail ?? "");
      const rail = String(b?.rail ?? "");
      if (checkHolderName(name) || checkPayerDocument(c.currency, document) || checkEmail(email)) return json({ statusCode: 400, message: "Check the payer's name, document and email." }, 400);
      if (!view.rails.includes(rail)) return json({ statusCode: 400, message: "Unknown payment method." }, 400);
      const q = quoteFor(env, { side: "BUY", network: c.network, token: c.token, currency: c.currency, rail, fiatAmount: c.fiatAmount }, c.consumer);
      if (typeof q === "string") return json({ statusCode: 400, message: q }, 400);
      const o = orderFor(env, { quoteId: q.id, recipient: c.recipient, payer: { name, document, email } }, c.consumer, { kind: "CHARGE", chargeId: c.id });
      if (typeof o === "string") return json({ statusCode: 400, message: o }, 400);
      const token = randomBytes(32).toString("base64url");
      tokens().set(token, { env, orderId: o.id });
      return json({ data: { order: payerOrderView(o), payerToken: token } }, 201);
    }
    return json({ statusCode: 404, message: "Not found" }, 404);
  }
  if (kind === "orders" && id) {
    const t = tokens().get(request.headers.get("x-payer-token") ?? "");
    if (!t || t.orderId !== id) return json({ statusCode: 404, message: "Order not found" }, 404);
    const o = p2pStore(t.env).orders.find((x) => x.id === id);
    if (!o) return json({ statusCode: 404, message: "Order not found" }, 404);
    if (request.method === "GET" && !action) return json({ data: payerOrderView(o) });
    if (request.method === "POST" && action === "paid") {
      if (!merchantSells(o.kind)) return json({ statusCode: 400, message: "Not found" }, 400);
      const err = clientOrderAction(t.env, o, "paid");
      if (err) return json({ statusCode: 400, message: err }, 400);
      const b = (await request.json().catch(() => null)) as Record<string, unknown> | null;
      if (typeof b?.reference === "string" && b.reference.trim()) o.paidReference = b.reference.trim().slice(0, 60);
      o.updatedAt = nowIso();
      return json({ data: payerOrderView(o) });
    }
  }
  return json({ statusCode: 404, message: "Not found" }, 404);
}
