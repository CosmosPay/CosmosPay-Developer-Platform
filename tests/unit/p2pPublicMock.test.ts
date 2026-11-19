/* p2pPublicMock.test.ts: mock mode's payments-domain side of the P2P market
   (src/lib/mock/handlers/p2p-public.ts) answers in the Payments API's own shapes, so mock mode runs
   the same parsers and normalizers as production: the hosted charge page's keyless routes read
   through checkout-api.ts, a payer token reads only its own order, and the public app's upstream
   answers the whitelist's calls (and refuses a query field the API refuses) for the consumer "app". */
import { test } from "node:test";
import assert from "node:assert/strict";
import { handleP2pCheckout, mockAppUpstream } from "@/lib/mock/handlers/p2p-public";
import { p2pStore } from "@/lib/mock/handlers/p2p-market";
import { parseCheckoutCharge, parseCheckoutOrder, parseCreatedOrder } from "@/lib/p2p/checkout-api";
import { normalizeMarket, normalizeOrder, normalizeQuote } from "@/lib/p2p/normalize";
import { ownsOrder } from "@/lib/p2p/app-guard";

const req = (method: string, body?: unknown, headers: Record<string, string> = {}) =>
  new Request("http://mock.local/x", { method, headers: { "Content-Type": "application/json", ...headers }, body: body === undefined ? undefined : JSON.stringify(body) });

test("the charge page: read the charge, open the payer's order, read it with its token, report or cancel", async () => {
  const charge = p2pStore("dev").charges.find((c) => c.status === "open" && !c.multiUse)!;
  // The seeded charge has a live order already; a payer comes to a fresh one.
  for (const o of p2pStore("dev").orders) if (o.chargeId === charge.id) o.status = "completed";
  const read = await handleP2pCheckout(req("GET"), ["charges", charge.id]);
  const raw = await read.json();
  const parsed = parseCheckoutCharge(raw);
  assert.ok(parsed, JSON.stringify(raw));
  assert.equal(parsed!.status, "open");
  assert.ok(!JSON.stringify(raw).includes(charge.recipient), "the payer never sees the recipient's address");
  const unknownField = await handleP2pCheckout(req("POST", { rail: parsed!.rails[0], payer: { name: "Ana Gómez", document: "20329642330", email: "ana@example.com" }, payerName: "x" }), ["charges", charge.id, "orders"]);
  assert.equal(unknownField.status, 400, "the API refuses an unknown field");
  const bad = await handleP2pCheckout(req("POST", { rail: parsed!.rails[0], payer: { name: "Ana", document: "1", email: "x" } }), ["charges", charge.id, "orders"]);
  assert.equal(bad.status, 400);
  const opened = await handleP2pCheckout(req("POST", { rail: parsed!.rails[0], payer: { name: "Ana Gómez", document: "20329642330", email: "ana@example.com" } }), ["charges", charge.id, "orders"]);
  assert.equal(opened.status, 201);
  const created = parseCreatedOrder(await opened.json());
  assert.ok(created, "a flat order with its payer token");
  const second = await handleP2pCheckout(req("POST", { rail: parsed!.rails[0], payer: { name: "Ana Gómez", document: "20329642330", email: "ana@example.com" } }), ["charges", charge.id, "orders"]);
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
  order.status = "awaiting_payment";
  const cancelled = await handleP2pCheckout(req("POST", {}, { "X-Payer-Token": created!.payerToken }), ["orders", created!.order.id, "cancel"]);
  assert.equal(cancelled.status, 200);
  const pre = await handleP2pCheckout(req("OPTIONS"), ["charges", charge.id]);
  assert.match(pre.headers.get("access-control-allow-headers") ?? "", /X-Payer-Token/);
});

test("the public app's upstream: market, quote, the wallet's order and the integrator's list, in the API's shapes", () => {
  const me = "0x1111111111111111111111111111111111111111";
  const market = mockAppUpstream("prod", "GET", "market", new URLSearchParams(), null);
  assert.equal((market.body as { tier: string }).tier, "public");
  assert.ok(normalizeMarket(market.body)?.networks.length);
  // A sale names its token amount in base units.
  const sellQuote = mockAppUpstream("prod", "POST", "quotes", new URLSearchParams(), { side: "SELL", network: "base", token: "USDC", currency: "ARS", rail: "ar_bank_transfer", tokenAmount: "25000000" });
  assert.equal(sellQuote.status, 201, JSON.stringify(sellQuote.body));
  assert.equal(normalizeQuote(sellQuote.body).tokenAmount, "25");
  const q = mockAppUpstream("prod", "POST", "quotes", new URLSearchParams(), { side: "BUY", network: "base", token: "USDC", currency: "ARS", rail: "ar_bank_transfer", fiatAmount: "100000" });
  assert.equal(q.status, 201);
  assert.match(String((q.body as { tokenAmount: string }).tokenAmount), /^\d+$/, "base units");
  const created = mockAppUpstream("prod", "POST", "orders", new URLSearchParams(), { quoteId: (q.body as { id: string }).id, kind: "BUY", recipient: me, payer: { name: "Ana Gómez", document: "20329642330" } });
  assert.equal(created.status, 201, JSON.stringify(created.body));
  assert.equal((created.body as { buyerAddress: string }).buyerAddress, me);
  const order = normalizeOrder(created.body);
  assert.ok(ownsOrder(order, me));
  assert.equal(mockAppUpstream("prod", "GET", "orders", new URLSearchParams({ address: me }), null).status, 400, "the API takes no address filter");
  const list = mockAppUpstream("prod", "GET", "orders", new URLSearchParams({ take: "100", skip: "0" }), null).body as { data: unknown[]; total: number };
  assert.ok(list.data.some((o) => (o as { id: string }).id === order.id));
  assert.equal(mockAppUpstream("prod", "GET", "orders/unknown-order-id", new URLSearchParams(), null).status, 404);
  assert.equal(mockAppUpstream("prod", "GET", "accounts", new URLSearchParams(), null).status, 404);
});

test("a sale's unsigned steps: no step names in the API's answer, tagged by the normalizer", () => {
  const me = "0x3333333333333333333333333333333333333333";
  const q = mockAppUpstream("prod", "POST", "quotes", new URLSearchParams(), { side: "SELL", network: "base", token: "USDC", currency: "ARS", rail: "ar_bank_transfer", tokenAmount: "25000000" });
  const created = mockAppUpstream("prod", "POST", "orders", new URLSearchParams(), {
    quoteId: (q.body as { id: string }).id, kind: "SELL", seller: me,
    beneficiary: { holderName: "Ana Gómez", document: "20329642330", details: { alias: "ana.gomez.mp", cuit: "20329642330" } },
  });
  assert.equal(created.status, 201, JSON.stringify(created.body));
  const steps = (created.body as { transactions: Record<string, unknown>[] }).transactions;
  assert.equal(steps.length, 2);
  assert.ok(steps.every((t) => !("action" in t)));
  assert.deepEqual(normalizeOrder(created.body).transactions?.map((t) => t.action), ["approve", "openWithDeposit"]);
  const tx = mockAppUpstream("prod", "POST", "transactions", new URLSearchParams(), { network: "base", from: me, action: "cancel", args: { orderId: (created.body as { id: string }).id } });
  assert.equal(tx.status, 201, JSON.stringify(tx.body));
  assert.match((tx.body as { data: string }).data, /^0x[0-9a-f]+$/, "the calldata stays under `data`");
});
