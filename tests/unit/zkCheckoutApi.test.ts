import { test } from "node:test";
import assert from "node:assert/strict";
import { confirmZkCheckout, fetchZkCheckout, parseZkCheckout, parseZkConfig } from "@/lib/zk/checkout-api";

/* The ZK checkout's trust boundary: what the gateway answers is checked field by field. */

const C = (c: string) => `C${c.repeat(55)}`;
const G = (c: string) => `G${c.repeat(55)}`;
const ID = "cm1x2y3z4a5b6c7d8e9f0g1h2";
const config = {
  enabled: true,
  network: "testnet",
  rpcUrl: "https://soroban-testnet.stellar.org",
  networkPassphrase: "Test SDF Network ; September 2015",
  token: { contractId: C("A"), symbol: "XLM", decimals: 7, underlying: "native", deployedAtLedger: 5371973 },
  verifier: C("B"),
  auditorRegistry: C("D"),
  auditorId: 0,
  feeBps: 1,
  feeAccount: G("F"),
};
const payment = {
  ...config,
  id: ID,
  status: "PENDING",
  amount: "100",
  netAmount: "99.99",
  feeAmount: "0.01",
  recipient: G("M"),
  description: "Order 24",
  expiresAt: "2026-10-26T12:00:00.000Z",
  paymentTxHash: null,
  feeTxHash: null,
};

test("a well-formed payment parses, inside the API envelope or bare", () => {
  const bare = parseZkCheckout(payment, ID);
  assert.ok(bare);
  assert.equal(bare.netAmount, "99.99");
  assert.equal(bare.token.contractId, C("A"));
  assert.deepEqual(parseZkCheckout({ data: payment, code: 200, status: "success", message: "ok" }, ID), bare);
});

test("anything malformed, or another payment's id, is refused whole", () => {
  const bad: Array<Record<string, unknown>> = [
    { id: "cm9999999999999999999999z" },
    { status: "PAID" },
    { amount: "1e5" },
    { netAmount: "-1" },
    { recipient: "GABC" },
    { recipient: C("A") },
    { feeAccount: "not-an-account" },
    { rpcUrl: "http://soroban-testnet.stellar.org" },
    { rpcUrl: "javascript:alert(1)" },
    { token: { ...config.token, contractId: G("A") } },
    { auditorId: -1 },
    { expiresAt: "tomorrow" },
    { description: "x".repeat(141) },
  ];
  for (const patch of bad) assert.equal(parseZkCheckout({ ...payment, ...patch }, ID), null, JSON.stringify(patch).slice(0, 60));
  assert.equal(parseZkCheckout(payment, "cm0000000000000000000000z"), null);
  assert.equal(parseZkCheckout(null, ID), null);
});

test("a malformed transaction hash is dropped, not trusted", () => {
  assert.equal(parseZkCheckout({ ...payment, paymentTxHash: "<script>" }, ID)?.paymentTxHash, null);
  assert.equal(parseZkCheckout({ ...payment, paymentTxHash: "a".repeat(64) }, ID)?.paymentTxHash, "a".repeat(64));
});

test("a network without ZK payments reads as null, a configured one parses", () => {
  assert.equal(parseZkConfig({ enabled: false }), null);
  assert.equal(parseZkConfig(config)?.feeAccount, G("F"));
});

test("fetching maps 404, 429 and errors, and calls the keyless prefix", async () => {
  const calls: string[] = [];
  const fake = (status: number, body: unknown, headers: Record<string, string> = {}) => (async (url: string) => {
    calls.push(url);
    return new Response(JSON.stringify(body), { status, headers });
  }) as unknown as typeof fetch;
  assert.deepEqual((await fetchZkCheckout("https://api.example/cosmos-api/", ID, fake(200, { data: payment }))).kind, "ok");
  assert.equal(calls.at(-1), `https://api.example/cosmos-api/v1/zk-checkout/${ID}`);
  assert.deepEqual(await fetchZkCheckout("https://x", ID, fake(404, {})), { kind: "not-found" });
  assert.deepEqual(await fetchZkCheckout("https://x", ID, fake(429, {}, { "retry-after": "12" })), { kind: "rate-limited", retryAfterMs: 12000 });
  assert.deepEqual(await fetchZkCheckout("https://x", ID, fake(400, { message: "payment_transfer_mismatch" })), { kind: "error", message: "payment_transfer_mismatch" });
});

test("confirm sends only well-formed hashes", async () => {
  let sent = false;
  const fake = (async () => { sent = true; return new Response("{}", { status: 200 }); }) as unknown as typeof fetch;
  assert.deepEqual(await confirmZkCheckout("https://x", ID, { paymentTxHash: "nope", feeTxHash: "a".repeat(64) }, fake), { kind: "error" });
  assert.equal(sent, false);
});
