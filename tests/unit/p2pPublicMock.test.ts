/* p2pPublicMock.test.ts: mock mode's payments-domain side of the P2P market
   (src/lib/mock/handlers/p2p-public.ts): the hosted charge page's keyless routes answer what the
   page's parser accepts, a payer token reads only its own order, and the public app's upstream
   answers the whitelist's calls for the consumer "app" in shapes the app reads. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { handleP2pCheckout, mockAppUpstream } from "@/lib/mock/handlers/p2p-public";
import { p2pStore } from "@/lib/mock/handlers/p2p-market";
import { parseCheckoutCharge, parseCheckoutOrder, parseCreatedOrder } from "@/lib/p2p/checkout-api";
import { parseMarket, parseOrder, parseQuote } from "@/lib/p2p/app-api";

const req = (method: string, body?: unknown, headers: Record<string, string> = {}) =>
  new Request("http://mock.local/x", { method, headers: { "Content-Type": "application/json", ...headers }, body: body === undefined ? undefined : JSON.stringify(body) });

test("the charge page: read the charge, open the payer's order, read it with its token, report the transfer", async () => {
  const charge = p2pStore("dev").charges.find((c) => c.status === "open" && !c.multiUse)!;
  // The seeded charge has a live order already; a payer comes to a fresh one.
  for (const o of p2pStore("dev").orders) if (o.chargeId === charge.id) o.status = "completed";
  const read = await handleP2pCheckout(req("GET"), ["charges", charge.id]);
  const parsed = parseCheckoutCharge(await read.json());
  assert.ok(parsed);
  assert.equal(parsed!.status, "open");
  assert.ok(!JSON.stringify(parsed).includes(charge.recipient), "the payer never sees the recipient's address");
  const bad = await handleP2pCheckout(req("POST", { payerName: "Ana", payerDocument: "1", payerEmail: "x", rail: parsed!.rails[0] }), ["charges", charge.id, "orders"]);
  assert.equal(bad.status, 400);
  const opened = await handleP2pCheckout(req("POST", { payerName: "Ana Gómez", payerDocument: "20329642330", payerEmail: "ana@example.com", rail: parsed!.rails[0] }), ["charges", charge.id, "orders"]);
  assert.equal(opened.status, 201);
  const created = parseCreatedOrder(await opened.json());
  assert.ok(created);
  const second = await handleP2pCheckout(req("POST", { payerName: "Ana Gómez", payerDocument: "20329642330", payerEmail: "ana@example.com", rail: parsed!.rails[0] }), ["charges", charge.id, "orders"]);
  assert.equal(second.status, 409, "one live order per charge");
  const noToken = await handleP2pCheckout(req("GET"), ["orders", created!.order.id]);
  assert.equal(noToken.status, 404);
  const withToken = await handleP2pCheckout(req("GET", undefined, { "X-Payer-Token": created!.payerToken }), ["orders", created!.order.id]);
  assert.ok(parseCheckoutOrder(await withToken.json()));
  const order = p2pStore("dev").orders.find((o) => o.id === created!.order.id)!;
  assert.equal(order.kind, "CHARGE");
  assert.equal(order.buyer, charge.recipient);
  order.status = "awaiting_payment";
  const paid = await handleP2pCheckout(req("POST", { reference: "TRX1" }, { "X-Payer-Token": created!.payerToken }), ["orders", created!.order.id, "paid"]);
  assert.equal(paid.status, 200);
  assert.equal(order.paidReference, "TRX1");
  const pre = await handleP2pCheckout(req("OPTIONS"), ["charges", charge.id]);
  assert.match(pre.headers.get("access-control-allow-headers") ?? "", /X-Payer-Token/);
});

test("the public app's upstream: market, quote, the wallet's order and its history", () => {
  const me = "0x1111111111111111111111111111111111111111";
  const unwrap = (a: { status: number; body: unknown }) => (a.body as { data: unknown }).data;
  assert.ok(parseMarket(unwrap(mockAppUpstream("prod", "GET", "market", new URLSearchParams(), null))));
  const q = parseQuote(unwrap(mockAppUpstream("prod", "POST", "quotes", new URLSearchParams(), { side: "BUY", network: "base", token: "USDC", currency: "ARS", rail: "ar_bank_transfer", fiatAmount: "100000" })));
  assert.ok(q);
  const created = mockAppUpstream("prod", "POST", "orders", new URLSearchParams(), { quoteId: q!.id, kind: "BUY", recipient: me, payer: { name: "Ana Gómez", document: "20329642330" } });
  assert.equal(created.status, 201);
  const order = parseOrder(unwrap(created));
  assert.equal(order?.buyer, me);
  const list = unwrap(mockAppUpstream("prod", "GET", "orders", new URLSearchParams({ address: me }), null)) as { data: unknown[] };
  assert.ok(list.data.some((o) => (o as { id: string }).id === order!.id));
  assert.equal(mockAppUpstream("prod", "GET", "orders/unknown-order-id", new URLSearchParams(), null).status, 404);
  assert.equal(mockAppUpstream("prod", "GET", "accounts", new URLSearchParams(), null).status, 404);
});
