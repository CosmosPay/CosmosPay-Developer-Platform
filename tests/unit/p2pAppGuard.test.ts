/* p2pAppGuard.test.ts: what the public P2P app's server route lets through under Cosmos Pay's
   integrator key (src/lib/p2p/app-guard.ts). A whitelist of operations, each bound to the
   session's wallet: the browser can never name another recipient or seller, read or act on
   another wallet's order, or have any other transaction built. */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  LIMITS, challengeAddress, clientKey, needsSession, orderBody, originAllowed, ownOrders, ownsOrder, paidBody, quoteBody, routeOf, transactionBody,
} from "@/lib/p2p/app-guard";

const ME = "0x1111111111111111111111111111111111111111";
const OTHER = "0x2222222222222222222222222222222222222222";
const ID = "0b9c4a1e-7d2f-4c3a-9e1b-2f6d8a7c5e40";

test("only the whitelisted operations exist", () => {
  assert.deepEqual(routeOf("GET", ["market"]), { op: "market" });
  assert.deepEqual(routeOf("POST", ["quotes"]), { op: "quote" });
  assert.deepEqual(routeOf("POST", ["orders"]), { op: "createOrder" });
  assert.deepEqual(routeOf("GET", ["orders"]), { op: "listOrders" });
  assert.deepEqual(routeOf("GET", ["orders", ID]), { op: "getOrder", id: ID });
  for (const a of ["paid", "cancel", "dispute"] as const) assert.deepEqual(routeOf("POST", ["orders", ID, a]), { op: "orderAction", id: ID, action: a });
  assert.deepEqual(routeOf("POST", ["transactions"]), { op: "transaction" });
  assert.deepEqual(routeOf("POST", ["session", "challenge"]), { op: "challenge" });
  assert.deepEqual(routeOf("POST", ["session"]), { op: "signIn" });
  assert.deepEqual(routeOf("GET", ["session"]), { op: "session" });
  assert.deepEqual(routeOf("DELETE", ["session"]), { op: "signOut" });
  for (const [m, p] of [
    ["GET", ["accounts"]], ["POST", ["accounts"]], ["GET", ["merchant", "orders"]], ["POST", ["merchant", "transfer-matches"]],
    ["POST", ["charges"]], ["POST", ["payouts"]], ["POST", ["offers"]], ["PATCH", ["orders", ID]], ["DELETE", ["orders", ID]],
    ["POST", ["orders", ID, "release"]], ["GET", ["orders", "../accounts"]], ["GET", ["orders", ID, "paid"]], ["POST", ["market"]],
    ["GET", ["market", "x"]], ["GET", []], ["POST", ["orders", ID, "paid", "x"]], ["GET", ["session", "challenge"]],
  ] as const) assert.equal(routeOf(m, [...p]), null, `${m} ${p.join("/")}`);
  assert.ok(!needsSession("challenge") && !needsSession("signIn") && !needsSession("session") && !needsSession("signOut"));
  assert.ok(!needsSession("market"), "the market is public");
  for (const op of ["quote", "createOrder", "listOrders", "getOrder", "orderAction", "transaction"] as const) assert.ok(needsSession(op), op);
  for (const op of Object.keys(LIMITS)) assert.ok(LIMITS[op as keyof typeof LIMITS].perKey.limit > 0, op);
});

test("a quote carries only its own fields and one amount, in the API's shapes", () => {
  assert.deepEqual(quoteBody({ side: "BUY", network: "base", token: "USDC", currency: "ARS", rail: "ar_bank_transfer", fiatAmount: "50000", recipient: OTHER, extra: 1 }), {
    ok: true, body: { side: "BUY", network: "base", token: "USDC", currency: "ARS", rail: "ar_bank_transfer", fiatAmount: "50000" },
  });
  // A sale's amount is the token's, in base units (the API refuses a decimal there).
  assert.deepEqual(quoteBody({ side: "SELL", network: "base", token: "USDC", currency: "ARS", rail: "r", tokenAmount: "25000000" }), {
    ok: true, body: { side: "SELL", network: "base", token: "USDC", currency: "ARS", rail: "r", tokenAmount: "25000000" },
  });
  assert.equal(quoteBody({ side: "SELL", network: "base", token: "USDC", currency: "ARS", rail: "r", tokenAmount: "25.5" }).ok, false, "base units only");
  assert.equal(quoteBody({ side: "SELL", network: "base", token: "USDC", currency: "ARS", rail: "r", tokenAmount: "0" }).ok, false);
  assert.equal(quoteBody({ side: "BUY", network: "base", token: "USDC", currency: "ARS", rail: "r", fiatAmount: "10.123" }).ok, false, "local money has two decimals at most");
  assert.equal(quoteBody({ side: "SELL", network: "base", token: "USDC", currency: "ARS", rail: "r", tokenAmount: "1", fiatAmount: "2" }).ok, false, "one amount");
  assert.equal(quoteBody({ side: "SWAP", network: "base", token: "USDC", currency: "ARS", rail: "r", fiatAmount: "1" }).ok, false);
  assert.equal(quoteBody({ side: "BUY", network: "base", token: "USDC", currency: "ARS", rail: "r", fiatAmount: "-1" }).ok, false);
  assert.equal(quoteBody(null).ok, false);
});

test("a purchase delivers to the session's wallet, a sale is sent from it, whatever the browser says", () => {
  // The API takes the payer's name and document only: anything else (an email) is a 400 there.
  const buy = orderBody({ side: "BUY", quoteId: "q1", recipient: OTHER, seller: OTHER, payer: { name: " Ana ", document: "20329642330", email: "ana@example.com", extra: 1 } }, ME);
  assert.deepEqual(buy, { ok: true, body: { quoteId: "q1", kind: "BUY", recipient: ME, payer: { name: "Ana", document: "20329642330" } } });
  const sell = orderBody({ side: "SELL", quoteId: "q2", seller: OTHER, recipient: OTHER, beneficiary: { holderName: "Ana", document: "20329642330", details: { alias: "ana.mp", "bad key": "x", cbu: "" }, extra: 1 } }, ME);
  assert.deepEqual(sell, { ok: true, body: { quoteId: "q2", kind: "SELL", seller: ME, beneficiary: { holderName: "Ana", document: "20329642330", details: { alias: "ana.mp" } } } });
  assert.equal(orderBody({ side: "BUY", quoteId: "q", payer: { name: "Ana" } }, ME).ok, false, "the document is required");
  assert.equal(orderBody({ side: "BUY", quoteId: "q", payer: { name: "Ana", document: "123" } }, ME).ok, false, "a document has 4 characters at least");
  assert.equal(orderBody({ side: "SELL", quoteId: "q", beneficiary: { holderName: "Ana", document: "20329642330", details: {} } }, ME).ok, false, "an account is required");
  assert.equal(orderBody({ side: "SELL", quoteId: "q", beneficiary: { holderName: "Ana", details: { alias: "ana.mp" } } }, ME).ok, false, "the holder's document is required");
  assert.equal(orderBody({ side: "SELL", quoteId: "q", payout: { holderName: "Ana", document: "20329642330", details: { alias: "ana.mp" } } }, ME).ok, false, "the API's name is beneficiary");
  assert.equal(orderBody({ side: "CHARGE", quoteId: "q" }, ME).ok, false, "only purchases and sales");
  assert.equal(orderBody({ side: "BUY" }, ME).ok, false);
});

test("an order is the wallet's only when it receives the purchase or sends the sale", () => {
  assert.ok(ownsOrder({ kind: "BUY", buyer: ME.toUpperCase().replace("0X", "0x"), seller: OTHER }, ME));
  assert.ok(!ownsOrder({ kind: "BUY", buyer: OTHER, seller: ME }, ME), "the merchant side of a purchase is not the wallet's");
  assert.ok(ownsOrder({ kind: "SELL", buyer: OTHER, seller: ME }, ME));
  assert.ok(!ownsOrder({ kind: "SELL", buyer: ME, seller: OTHER }, ME));
  // The API's own names for the parties are read too.
  assert.ok(ownsOrder({ kind: "BUY", buyerAddress: ME, sellerAddress: OTHER }, ME));
  assert.ok(!ownsOrder({ kind: "SELL", buyerAddress: ME, sellerAddress: OTHER }, ME));
  for (const kind of ["CHARGE", "PAYOUT"] as const) assert.ok(!ownsOrder({ kind, buyer: ME, seller: ME }, ME), kind);
  assert.ok(!ownsOrder(null, ME));
  const list = [{ kind: "BUY" as const, buyer: ME, seller: OTHER }, { kind: "BUY" as const, buyer: OTHER, seller: ME }, { kind: "SELL" as const, buyer: OTHER, seller: ME }];
  assert.equal(ownOrders(list, ME).length, 2);
});

test("transactions: release, cancel or dispute of the wallet's own sale, from its address", () => {
  const sale = { id: ID, kind: "SELL" as const, seller: ME, network: "base" };
  assert.deepEqual(transactionBody({ action: "release", from: OTHER, network: "arb" }, sale, ME), { ok: true, body: { network: "base", from: ME, action: "release", args: { orderId: ID } } });
  assert.equal(transactionBody({ action: "withdraw" }, sale, ME).ok, false);
  assert.equal(transactionBody({ action: "setOperator" }, sale, ME).ok, false);
  assert.equal(transactionBody({ action: "release" }, { ...sale, seller: OTHER }, ME).ok, false);
  assert.equal(transactionBody({ action: "release" }, { ...sale, kind: "BUY" }, ME).ok, false, "a purchase is released by its merchant");
  assert.equal(transactionBody({ action: "release" }, null, ME).ok, false);
});

test("the transfer reference, the challenge's address, the network key and the origin", () => {
  assert.deepEqual(paidBody({ reference: " TRX 1\n2 " }), { reference: "TRX 1 2" });
  assert.deepEqual(paidBody({ reference: "" }), {});
  assert.equal(paidBody({ reference: "x".repeat(100) }).reference?.toString().length, 60);
  assert.equal(challengeAddress({ address: ` ${ME} ` }), ME);
  assert.equal(challengeAddress({ address: "0x12" }), null);
  const h = (o: Record<string, string>) => new Headers(o);
  assert.equal(clientKey(h({ "cf-connecting-ip": "203.0.113.9", "x-forwarded-for": "1.1.1.1" }), "10.0.0.1"), "203.0.113.9");
  assert.equal(clientKey(h({ "x-forwarded-for": "1.1.1.1", "x-real-ip": "2.2.2.2" }), "10.0.0.1"), "10.0.0.1", "never a header the client writes");
  const O = "https://payments.cosmospay.lat";
  assert.ok(originAllowed("GET", h({ origin: "https://evil.example" }), O));
  assert.ok(originAllowed("POST", h({ origin: O }), O));
  assert.ok(!originAllowed("POST", h({ origin: "https://evil.example" }), O));
  assert.ok(!originAllowed("DELETE", h({ origin: "https://dev.cosmospay.lat" }), O));
  assert.ok(originAllowed("POST", h({ "sec-fetch-site": "same-origin" }), O));
  assert.ok(!originAllowed("POST", h({ "sec-fetch-site": "cross-site" }), O));
  assert.ok(!originAllowed("POST", h({}), O));
});
