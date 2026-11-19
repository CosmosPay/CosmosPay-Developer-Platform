/* p2pCheckoutApi.test.ts: the hosted charge page's trust boundary (src/lib/p2p/checkout-api.ts),
   what the public app reads from its server route (app-api.ts), and the check a transaction passes
   before a wallet is asked to send it (tx-check.ts). The page tells people where to send money:
   a malformed answer is an error, never half-shown, and a transaction aimed anywhere but the
   order's network and contract is never sent. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { cancelChargeOrder, fetchCharge, fetchChargeOrder, openChargeOrder, parseAccount, parseCheckoutCharge, parseCheckoutOrder, parseCreatedOrder, reportChargePaid } from "@/lib/p2p/checkout-api";
import { appApi, parseMarket, parseOrder, parseQuote } from "@/lib/p2p/app-api";
import { checkTransaction, evmChainOf, explorerTx } from "@/lib/p2p/tx-check";

/* The community server's P2pCheckoutChargeEntity and P2pCheckoutOrderEntity, as it answers them. */
const CHARGE = {
  id: "cm3p2pchg0001l70g8v5q3z2w", network: "base", tokenSymbol: "USDC", currency: "ARS", fiatAmount: "85000.00",
  description: "Order #1042", status: "open", rails: ["ar_bank_transfer"], expiresAt: "2026-11-26T12:00:00.000Z",
};
const ORDER = {
  id: "5f0c2a9e-1b3d-4e5f-8a7b-9c0d1e2f3a4b", chargeId: CHARGE.id, status: "awaiting_payment", currency: "ARS", fiatAmount: "85000.00",
  rail: "ar_bank_transfer", merchantName: "Lumio Exchange", paymentDeadline: "2026-11-19T12:30:00.000Z",
  paymentDetails: { rail: "ar_bank_transfer", holderName: "Lumio Exchange SRL", details: { alias: "lumio.pagos.ars", cuit: "30714209879" } },
  paidAt: null, createdAt: "2026-11-19T12:00:00.000Z",
};

test("a charge: every field checked, the symbol from tokenSymbol, rails possibly none", () => {
  assert.deepEqual(parseCheckoutCharge(CHARGE), {
    id: CHARGE.id, network: "base", token: "USDC", currency: "ARS", fiatAmount: "85000.00", description: "Order #1042", status: "open", rails: ["ar_bank_transfer"], expiresAt: CHARGE.expiresAt,
  });
  assert.deepEqual(parseCheckoutCharge({ ...CHARGE, rails: [] })?.rails, [], "no merchant takes it right now");
  assert.equal(parseCheckoutCharge({ ...CHARGE, description: null })?.description, null);
  for (const bad of [
    { ...CHARGE, status: "PENDING" }, { ...CHARGE, currency: "ars" }, { ...CHARGE, fiatAmount: "1e5" }, { ...CHARGE, fiatAmount: "1.234" }, { ...CHARGE, rails: ["<x>"] },
    { ...CHARGE, rails: "ar_bank_transfer" }, { ...CHARGE, description: "a\u0000b" }, { ...CHARGE, expiresAt: "soon" }, { ...CHARGE, id: "../x" },
    { ...CHARGE, network: "Base Main" }, { ...CHARGE, tokenSymbol: undefined }, null, [],
  ]) assert.equal(parseCheckoutCharge(bad), null, JSON.stringify(bad));
});

test("the payer's order and the account to pay into: plain short strings under plain keys", () => {
  const o = parseCheckoutOrder(ORDER);
  assert.ok(o);
  assert.equal(o!.payBy, ORDER.paymentDeadline);
  assert.equal(o!.paymentDetails?.details.alias, "lumio.pagos.ars");
  assert.equal(o!.paymentDetails?.document, null);
  assert.equal(o!.merchantName, "Lumio Exchange");
  assert.equal(parseCheckoutOrder({ ...ORDER, paymentDetails: null })?.paymentDetails, null, "an order that ended shows no account");
  for (const bad of [
    { ...ORDER, status: "PAID" }, { ...ORDER, paymentDetails: { ...ORDER.paymentDetails, details: { "<b>": "x" } } },
    { ...ORDER, paymentDetails: { ...ORDER.paymentDetails, details: { alias: "a\nb" } } }, { ...ORDER, paymentDetails: { rail: "x" } },
    { ...ORDER, paymentDeadline: "tomorrow" }, { ...ORDER, fiatAmount: 85000 }, { ...ORDER, chargeId: "../x" },
  ]) assert.equal(parseCheckoutOrder(bad), null, JSON.stringify(bad));
  assert.equal(parseAccount({ rail: "br_pix", holderName: "João", details: {} }), null, "an account has details");
  // Opening it answers the order's own fields with the token beside them.
  const created = parseCreatedOrder({ ...ORDER, payerToken: "q3Jx8b2mNfV0tq9Lr5sD1uYc7wHk4eAa6zPgT0oXiEM" });
  assert.equal(created?.order.id, ORDER.id);
  assert.equal(created?.payerToken, "q3Jx8b2mNfV0tq9Lr5sD1uYc7wHk4eAa6zPgT0oXiEM");
  assert.equal(parseCreatedOrder({ ...ORDER, payerToken: "short" }), null);
  assert.equal(parseCreatedOrder({ order: ORDER, payerToken: "q3Jx8b2mNfV0tq9Lr5sD1uYc7wHk4eAa6zPgT0oXiEM" }), null, "the answer is flat");
});

test("the calls: the keyless routes, the bodies the API takes, the payer token as a header, errors in their kinds", async () => {
  const seen: { url: string; init: RequestInit }[] = [];
  const answer = (status: number, body: unknown, headers: Record<string, string> = {}) => (async (url: string | URL | Request, init?: RequestInit) => {
    seen.push({ url: String(url), init: init ?? {} });
    return new Response(JSON.stringify(body), { status, headers });
  }) as typeof fetch;
  assert.deepEqual(await fetchCharge("https://api.example/cosmos-api/", CHARGE.id, answer(200, CHARGE)), { kind: "ok", value: parseCheckoutCharge(CHARGE) });
  assert.equal(seen[0].url, `https://api.example/cosmos-api/v1/p2p-checkout/charges/${CHARGE.id}`);
  assert.equal(seen[0].init.credentials, "omit");
  assert.deepEqual(await fetchCharge("https://api.example", CHARGE.id, answer(404, {})), { kind: "not-found" });
  assert.deepEqual(await fetchCharge("https://api.example", CHARGE.id, answer(429, { statusCode: 429, code: "rate_limited", message: "Slow down" }, { "Retry-After": "30" })), { kind: "error", status: 429, message: "Slow down", code: "rate_limited", retryAfter: 30 });
  assert.deepEqual(await fetchCharge("https://api.example", CHARGE.id, answer(200, { ...CHARGE, status: "x" })), { kind: "error" });
  const opened = await openChargeOrder("https://api.example", CHARGE.id, { rail: "ar_bank_transfer", name: " Ana ", document: "20329642330", email: "a@b.co" }, answer(201, { ...ORDER, payerToken: "t".repeat(43) }));
  assert.equal(opened.kind, "ok");
  // Exactly the server's DTO: the rail and the payer (name, document, email), nothing else.
  assert.deepEqual(JSON.parse(String(seen.at(-1)!.init.body)), { rail: "ar_bank_transfer", payer: { name: "Ana", document: "20329642330", email: "a@b.co" } });
  await fetchChargeOrder("https://api.example", ORDER.id, "tok", answer(200, ORDER));
  assert.equal((seen.at(-1)!.init.headers as Record<string, string>)["X-Payer-Token"], "tok");
  await reportChargePaid("https://api.example", ORDER.id, "tok", " TRX1 ", answer(200, ORDER));
  assert.deepEqual(JSON.parse(String(seen.at(-1)!.init.body)), { reference: "TRX1" });
  const cancelled = await cancelChargeOrder("https://api.example", ORDER.id, "tok", answer(200, { ...ORDER, status: "cancelled", paymentDetails: null }));
  assert.equal(cancelled.kind === "ok" && cancelled.value.status, "cancelled");
  assert.match(seen.at(-1)!.url, /\/orders\/[^/]+\/cancel$/);
  const thrown = (async () => { throw new Error("offline"); }) as unknown as typeof fetch;
  assert.deepEqual(await fetchCharge("https://api.example", CHARGE.id, thrown), { kind: "error" });
});

const NETWORK = {
  id: "base", name: "Base", chainId: 8453, contract: "0x00000000000000000000000000000000000000c0",
  tokens: [{ symbol: "USDC", address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", decimals: 6 }],
  explorer: "https://basescan.org", rpcUrl: "https://mainnet.base.org", nativeSymbol: "ETH",
};
const word = (hex: string) => hex.replace(/^0x/, "").padStart(64, "0");

test("a transaction is sent only to the order's network and contract (or, to approve, the token)", () => {
  const release = { chainId: 8453, to: NETWORK.contract, data: `0x37bdc99b${word("1")}`, value: "0", action: "release" };
  assert.equal(checkTransaction(release, NETWORK), null);
  assert.equal(checkTransaction({ ...release, chainId: 1 }, NETWORK), "chain");
  assert.equal(checkTransaction({ ...release, to: "0x00000000000000000000000000000000000000c1" }, NETWORK), "target");
  assert.equal(checkTransaction({ ...release, value: "1000" }, NETWORK), "value");
  assert.equal(checkTransaction({ ...release, data: "0x" }, NETWORK), "shape");
  assert.equal(checkTransaction(null, NETWORK), "shape");
  const approve = { chainId: 8453, to: NETWORK.tokens[0].address, data: `0x095ea7b3${word(NETWORK.contract)}${word("ff")}`, value: "0", action: "approve" };
  assert.equal(checkTransaction(approve, NETWORK, "USDC"), null);
  assert.equal(checkTransaction(approve, NETWORK), "target", "an approval needs the token it may approve");
  assert.equal(checkTransaction({ ...approve, data: `0x095ea7b3${word("0x00000000000000000000000000000000000000ee")}${word("ff")}` }, NETWORK, "USDC"), "target", "the spender must be the market");
  assert.equal(checkTransaction({ ...approve, to: NETWORK.contract }, NETWORK, "USDC"), "target");
  assert.deepEqual(evmChainOf(NETWORK), { chainId: 8453, chainName: "Base", nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 }, rpcUrls: ["https://mainnet.base.org"], blockExplorerUrls: ["https://basescan.org"] });
  assert.equal(evmChainOf({ ...NETWORK, rpcUrl: "http://x" }), undefined);
  assert.equal(explorerTx(NETWORK, `0x${"a".repeat(64)}`), `https://basescan.org/tx/0x${"a".repeat(64)}`);
  assert.equal(explorerTx(NETWORK, "0x1"), null);
  assert.equal(explorerTx({ explorer: "javascript:alert(1)" }, `0x${"a".repeat(64)}`), null);
});

test("the app's market keeps only well-formed networks; orders and quotes are checked", async () => {
  const m = parseMarket({ tier: "mainnet", networks: [NETWORK, { ...NETWORK, id: "bad", contract: "0x1" }, { ...NETWORK, id: "x", tokens: [{ symbol: "USDC", address: "nope", decimals: 6 }] }], currencies: [{ code: "ARS", rails: ["ar_bank_transfer"] }, { code: "xx", rails: [] }], protocolFeeBps: 30, windows: {}, sellBondBps: 1000, matcher: NETWORK.contract });
  assert.deepEqual(m?.networks.map((n) => n.id), ["base"]);
  assert.deepEqual(m?.currencies, [{ code: "ARS", rails: ["ar_bank_transfer"] }]);
  assert.equal(m?.windows.paymentSeconds, 1800);
  const order = {
    id: ORDER.id, kind: "BUY", status: "awaiting_payment", network: "base", token: "USDC", tokenAmount: "59.42", fiatAmount: "85000.00", currency: "ARS", rail: "ar_bank_transfer",
    buyer: "0x1111111111111111111111111111111111111111", seller: null, price: "1430", deadlines: { payBy: ORDER.paymentDeadline }, createdAt: "2026-11-19T12:00:00.000Z",
    merchant: { displayName: "Lumio" }, paymentDetails: { rail: "ar_bank_transfer", holderName: "Lumio Exchange SRL", details: { alias: "lumio.pagos.ars" } },
  };
  assert.equal(parseOrder(order)?.paymentDetails?.holderName, "Lumio Exchange SRL");
  assert.equal(parseOrder({ ...order, paymentDetails: { rail: "x" } })?.paymentDetails, null, "a doubtful account is dropped");
  assert.equal(parseOrder({ ...order, status: "nope" }), null);
  assert.equal(parseOrder({ ...order, kind: "SWAP" }), null);
  assert.equal(parseQuote({ id: "q", side: "BUY", price: "1", fiatAmount: "1", tokenAmount: "1", protocolFee: "0", netAmount: "1", expiresAt: "x", network: "base", token: "USDC", currency: "ARS", rail: "r", merchant: { displayName: "M" } })?.integratorFee, "0");
  assert.equal(parseQuote({ id: "q", side: "BUY" }), null);
  const calls: string[] = [];
  const api = appApi((async (url: string | URL | Request, init?: RequestInit) => {
    calls.push(`${init?.method} ${String(url)} ${init?.credentials}`);
    return new Response(JSON.stringify({ data: [order, { bad: 1 }] }), { status: 200 });
  }) as typeof fetch);
  assert.equal((await api.orders()).length, 1);
  assert.deepEqual(calls, ["GET /p2p/api/orders same-origin"]);
  const failing = appApi((async () => new Response(JSON.stringify({ message: "Sign in with your wallet first." }), { status: 401 })) as unknown as typeof fetch);
  await assert.rejects(failing.market(), (e: { status?: number }) => e.status === 401);
});
