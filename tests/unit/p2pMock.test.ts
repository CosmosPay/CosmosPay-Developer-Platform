/* p2pMock.test.ts: mock mode answers every P2P market route the dashboard calls (design route list,
   /v1/p2p/* through /api/p2p/*), with the envelopes the real proxy answers, and its market keeps the
   rules the screens rely on (a wallet's own sale offers need a payment method, a registered wallet
   signs, a payout needs the matcher). A route the views call without a mock breaks mock mode. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { matchPath, type MockRequest } from "@/lib/mock/http";
import { routes, mockP2pMarket, p2pStore, quoteFor, orderFor, buildFor } from "@/lib/mock/handlers/p2p-market";
import { mockOptions } from "@/lib/mock/mode";

const ROUTES = [
  ["GET", "/api/p2p/market"],
  ["POST", "/api/p2p/accounts/challenge"],
  ["POST", "/api/p2p/accounts"],
  ["GET", "/api/p2p/accounts"],
  ["GET", "/api/p2p/accounts/x"],
  ["PATCH", "/api/p2p/accounts/x"],
  ["DELETE", "/api/p2p/accounts/x"],
  ["POST", "/api/p2p/payment-methods"],
  ["GET", "/api/p2p/payment-methods"],
  ["PATCH", "/api/p2p/payment-methods/x"],
  ["DELETE", "/api/p2p/payment-methods/x"],
  ["POST", "/api/p2p/offers"],
  ["GET", "/api/p2p/offers"],
  ["PATCH", "/api/p2p/offers/x"],
  ["DELETE", "/api/p2p/offers/x"],
  ["POST", "/api/p2p/quotes"],
  ["POST", "/api/p2p/orders"],
  ["GET", "/api/p2p/orders"],
  ["GET", "/api/p2p/orders/x"],
  ["POST", "/api/p2p/orders/x/paid"],
  ["POST", "/api/p2p/orders/x/cancel"],
  ["POST", "/api/p2p/orders/x/dispute"],
  ["GET", "/api/p2p/merchant/orders"],
  ["GET", "/api/p2p/merchant/orders/x"],
  ["POST", "/api/p2p/merchant/transfer-matches"],
  ["POST", "/api/p2p/transactions"],
  ["POST", "/api/p2p/charges"],
  ["GET", "/api/p2p/charges"],
  ["GET", "/api/p2p/charges/x"],
  ["DELETE", "/api/p2p/charges/x"],
  ["POST", "/api/p2p/payouts"],
  ["GET", "/api/p2p/payouts"],
  ["GET", "/api/p2p/payouts/x"],
] as const;

function find(method: string, path: string) {
  for (const r of routes) {
    if (r.method !== method) continue;
    const params = matchPath(r.path, path);
    if (params) return { r, params };
  }
  return null;
}

async function call(method: string, path: string, body: Record<string, unknown> | null = null, env: "dev" | "prod" = "dev") {
  const hit = find(method, path);
  assert.ok(hit, `${method} ${path} has a mock`);
  const url = new URL(`http://localhost${path}?env=${env}`);
  const req: MockRequest = { method, url, params: hit.params, body, env, org: null, user: { id: "u", name: "U", email: "u@example.com", image: null }, options: mockOptions({}) };
  const res = await hit.r.handler(req);
  return { status: res.status, json: (await res.json()) as { data: any; message: string } };
}

test("every P2P route the dashboard calls has a mock", () => {
  for (const [method, path] of ROUTES) assert.ok(find(method, path), `${method} ${path}`);
});

test("the market lists EVM networks with tokens, every rail and the matcher", async () => {
  for (const env of ["dev", "prod"] as const) {
    const m = mockP2pMarket(env);
    assert.ok(m.networks.length >= 3, env);
    for (const n of m.networks) {
      assert.match(n.contract, /^0x[0-9a-fA-F]{40}$/);
      assert.ok(n.tokens.every((t) => /^0x[0-9a-fA-F]{40}$/.test(t.address) && t.decimals === 6), n.id);
    }
    assert.equal(m.rails.length, 6);
    assert.match(m.matcher, /^0x[0-9a-fA-F]{40}$/);
  }
  const { status, json } = await call("GET", "/api/p2p/market");
  assert.equal(status, 200);
  assert.equal(json.data.tier, "testnet");
  assert.ok(Array.isArray(json.data.currencies[0].rails) && typeof json.data.currencies[0].rails[0] === "object", "the server's shape: rails nested in currencies");
});

test("a wallet registers with a single-use challenge", async () => {
  const address = "0x1111111111111111111111111111111111111111";
  const ch = await call("POST", "/api/p2p/accounts/challenge", { address });
  assert.equal(ch.status, 201);
  assert.match(ch.json.data.message, /0x1111111111111111111111111111111111111111/);
  assert.equal(ch.json.data.id, undefined, "the server keeps the challenge; the register call names the address");
  const sig = `0x${"ab".repeat(65)}`;
  assert.equal((await call("POST", "/api/p2p/accounts", { challengeId: "x", address, signature: sig })).status, 400, "an unknown field is refused, as the server does");
  const reg = await call("POST", "/api/p2p/accounts", { address, signature: sig, label: "Ops", displayName: "Ops Exchange" });
  assert.equal(reg.status, 201);
  assert.equal(reg.json.data.displayName, "Ops Exchange");
  const again = await call("POST", "/api/p2p/accounts", { address, signature: sig });
  assert.equal(again.status, 400, "a challenge is used once");
  const dup = await call("POST", "/api/p2p/accounts/challenge", { address });
  assert.equal(dup.status, 409, "a registered wallet is not registered twice");
});

test("a purchase is opened from a quote and needs the payer's identity", async () => {
  const q = quoteFor("dev", { side: "BUY", network: "base", token: "USDC", currency: "ARS", rail: "ar_bank_transfer", fiatAmount: "50000" }, "org");
  assert.notEqual(typeof q, "string");
  if (typeof q === "string") return;
  assert.equal(q.fiatAmount, "50000.00");
  const bad = orderFor("dev", { quoteId: q.id, recipient: "0x2222222222222222222222222222222222222222", payer: { name: "Ana", document: "1" } }, "org");
  assert.equal(typeof bad, "string");
  const q2 = quoteFor("dev", { side: "BUY", network: "base", token: "USDC", currency: "ARS", rail: "ar_bank_transfer", fiatAmount: "50000" }, "org");
  if (typeof q2 === "string") return assert.fail(q2);
  const o = orderFor("dev", { quoteId: q2.id, recipient: "0x2222222222222222222222222222222222222222", payer: { name: "Ana Gómez", document: "20329642330" } }, "org");
  assert.notEqual(typeof o, "string");
  if (typeof o === "string") return;
  assert.equal(o.status, "pending");
  assert.ok(o.paymentDetails?.holderName);
  const reused = orderFor("dev", { quoteId: q2.id, recipient: "0x2222222222222222222222222222222222222222", payer: { name: "Ana Gómez", document: "20329642330" } }, "org");
  assert.equal(typeof reused, "string", "a quote opens one order");
});

test("a sale answers the seller's unsigned approve and openWithDeposit", () => {
  const q = quoteFor("dev", { side: "SELL", network: "base", token: "USDC", currency: "ARS", rail: "ar_bank_transfer", tokenAmount: "25000000" }, "app");
  if (typeof q === "string") return assert.fail(q);
  assert.equal(q.tokenAmount, "25.000000", "the API's token amounts are base units");
  const o = orderFor("dev", { quoteId: q.id, seller: "0x3333333333333333333333333333333333333333", beneficiary: { holderName: "Ana Gómez", document: "20329642330", details: { alias: "ana.gomez.mp", cuit: "20329642330" } } }, "app");
  if (typeof o === "string") return assert.fail(o);
  assert.deepEqual(o.transactions?.map((t) => t.action), ["approve", "openWithDeposit"]);
  assert.ok(o.transactions?.every((t) => /^0x[0-9a-f]+$/.test(t.data) && t.value === "0"));
});

test("the transaction builder checks what each action names", () => {
  const s = p2pStore("dev");
  const acc = s.accounts[0];
  assert.equal(buildFor("dev", { network: "base", from: acc.id, action: "nope", args: {} }, "org"), "Unknown action.");
  assert.equal(typeof buildFor("dev", { network: "base", from: acc.id, action: "deposit", args: { token: "USDC", amount: "10000000" } }, "org"), "object");
  assert.equal(buildFor("dev", { network: "base", from: acc.id, action: "deposit", args: { token: "USDC", amount: "10.5" } }, "org"), "Enter an amount above zero.", "base units only");
  assert.equal(buildFor("dev", { network: "base", from: acc.id, action: "withdraw", args: { token: "USDC", amount: "99999999999999" } }, "org"), "The free balance is lower than that.");
  assert.equal(buildFor("dev", { network: "base", from: acc.id, action: "setOperator", args: { operator: acc.address, permissions: 2 } }, "org"), "A wallet cannot be its own bot.");
  assert.equal(buildFor("dev", { network: "base", from: acc.id, action: "setMatcher", args: { maxPerOrder: "100", autoSettle: true } }, "org"), "Automatic settlement is not offered to a wallet with active sell offers.");
  const order = s.orders.find((o) => o.kind === "BUY" && o.merchantAccountId === acc.id && o.status === "awaiting_payment")!;
  const tx = buildFor("dev", { network: order.network, from: acc.id, action: "release", args: { orderId: order.id } }, "org");
  assert.equal(typeof tx, "object");
  const other = s.accounts[1];
  assert.equal(buildFor("dev", { network: order.network, from: other.id, action: "release", args: { orderId: order.id } }, "org"), "Only the order's seller can release it.");
});

test("transfer matches find the merchant's order by amount and score the payer", async () => {
  const s = p2pStore("prod");
  const order = s.orders.find((o) => o.kind === "BUY" && o.merchantAccountId && o.status === "awaiting_payment")!;
  const { json } = await call("POST", "/api/p2p/merchant/transfer-matches", { currency: order.currency, amount: order.fiatAmount, payerName: order.payer!.name.split(" ")[0] }, "prod");
  assert.ok(json.data.data.length >= 1);
  assert.equal(json.data.data[0].order.id, order.id);
  assert.ok(json.data.data[0].score >= 2, "the amount and the name");
  assert.equal(json.data.data[0].transaction.description, "release");
});

test("a payout batch needs the matcher on its network", async () => {
  const s = p2pStore("prod");
  const noMatcher = s.accounts[1];
  const res = await call("POST", "/api/p2p/payouts", { network: "monad", token: "USDC", accountId: noMatcher.id, items: [] }, "prod");
  assert.equal(res.status, 400);
});
