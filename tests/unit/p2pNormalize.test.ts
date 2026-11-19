/* p2pNormalize.test.ts: the Payments API's P2P answers, in the community server's own shapes
   (src/p2p/entities over there), become what the screens read (src/lib/p2p/normalize.ts), and the
   screens' requests become the bodies its DTOs accept. Fixtures copy the server's field names. */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeMarket, normalizeAccount, normalizeOffer, normalizeQuote, normalizeOrder, normalizeTransferMatches, normalizeCharge,
  normalizePayoutBatch, txArgs, decimalsOf, matchConfidence,
} from "@/lib/p2p/normalize";

const MARKET = {
  available: true,
  tier: "public",
  networks: [
    { id: "base", name: "Base", chainId: 8453, contract: "0x1111111111111111111111111111111111111111", tokens: [{ symbol: "USDC", address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", decimals: 6 }], protocolFeeBps: 30, paused: false, nativeSymbol: "ETH", explorerUrl: "https://basescan.org", rpcUrl: "https://mainnet.base.org" },
    { id: "arb", name: "Arbitrum", chainId: 42161, contract: "0x2222222222222222222222222222222222222222", tokens: [], protocolFeeBps: 25, paused: true },
  ],
  currencies: [{ code: "ARS", decimals: 2, rails: [{ id: "ar_bank_transfer", name: "Bank transfer", fields: [{ name: "cbu", description: "", required: false }, { name: "cuit", description: "", required: true }] }] }],
  windows: { buyPaymentWindow: 1800, sellAcceptWindow: 300, sellPaymentWindow: 1800, sellSettleWindow: 21600 },
  bondBps: 1000,
  matcher: null,
  maxIntegratorFeeBps: 500,
};

test("the market: flat rails, windows and fee, paused networks left out", () => {
  const m = normalizeMarket(MARKET)!;
  assert.equal(m.tier, "mainnet");
  assert.deepEqual(m.networks.map((n) => n.id), ["base"]);
  assert.deepEqual(m.currencies, [{ code: "ARS", rails: ["ar_bank_transfer"] }]);
  assert.deepEqual(m.rails, [{ id: "ar_bank_transfer", currency: "ARS", fields: [{ key: "cbu", required: false }, { key: "cuit", required: true }] }]);
  assert.deepEqual(m.windows, { paymentSeconds: 1800, acceptSeconds: 300, settleSeconds: 21600 });
  assert.equal(m.sellBondBps, 1000);
  assert.equal(m.protocolFeeBps, 30);
  assert.equal(m.matcher, "");
  assert.deepEqual([m.networks[0].explorer, m.networks[0].rpcUrl, m.networks[0].nativeSymbol], ["https://basescan.org", "https://mainnet.base.org", "ETH"], "what a wallet needs to add the chain, and its explorer");
  assert.equal(normalizeMarket({ nope: 1 }), null);
  assert.deepEqual(normalizeMarket(m), m, "the screens' own shape stays as it is");
  assert.equal(decimalsOf(m, "base", "USDC"), 6);
  assert.equal(decimalsOf(m, "base", "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913"), 6);
});

test("an account: the merchant profile and the chain state", () => {
  const a = normalizeAccount({
    id: "acc", address: "0xabc", label: "Treasury", displayName: "Lumio", merchantStatus: "PAUSED",
    stats: { completedOrders: 12, cancelledOrders: 1, completionRate: 0.9, disputesLost: 0, medianReleaseSeconds: 240 }, lastActiveAt: "2026-11-19T10:00:00Z",
    tier: "public", createdAt: "2026-11-01T00:00:00Z", updatedAt: "2026-11-02T00:00:00Z",
    networks: [
      { network: "base", balances: [{ symbol: "USDC", token: "0xusdc", amount: "1500000", locked: "250000", decimals: 6 }], matcher: { maxPerOrder: "0", autoSettle: false }, operators: { "0xbot": 6, "0xold": 0 } },
      { network: "arb", balances: [], matcher: { maxPerOrder: "1000000000", autoSettle: true }, operators: {} },
    ],
  });
  assert.deepEqual(a.merchant, { displayName: "Lumio", status: "PAUSED", stats: { completed: 12, cancelled: 1, disputesLost: 0, medianReleaseSeconds: 240, lastActiveAt: "2026-11-19T10:00:00.000Z" } });
  assert.equal(a.chains![0].balances[0].freeUnits, "1500000");
  assert.equal(a.chains![0].balances[0].lockedUnits, "250000");
  assert.equal(a.chains![0].matcher, null, "\"0\" is not authorised");
  assert.deepEqual(a.chains![0].operators, [{ address: "0xbot", perms: 6 }]);
  assert.deepEqual(a.chains![1].matcher, { maxPerOrderUnits: "1000000000", autoSettle: true });
  assert.equal(normalizeAccount({ id: "x", address: "0x1", displayName: null, merchantStatus: "ACTIVE", createdAt: "2026-11-01T00:00:00Z" }).merchant, null, "a wallet without a name is not a merchant");
});

test("an offer and a quote: the token's symbol and decimal amounts", () => {
  assert.equal(normalizeOffer({ id: "o", accountId: "a", side: "BUY_TOKEN", network: "base", token: "0xusdc", tokenSymbol: "USDC", currency: "ARS", rails: ["ar_bank_transfer"], price: "1420.5", priceTtlSeconds: 600, minFiat: "1", maxFiat: "2", active: true, priceFresh: true, createdAt: "2026-11-01T00:00:00Z", updatedAt: "2026-11-02T00:00:00Z" }).token, "USDC");
  const q = normalizeQuote({ id: "q", side: "BUY", network: "base", token: "0xusdc", tokenSymbol: "USDC", tokenDecimals: 6, currency: "ARS", rail: "ar_bank_transfer", price: "1431.98", fiatAmount: "50000", tokenAmount: "34916800", protocolFee: "104750", integratorFee: "0", netAmount: "34812050", merchant: { displayName: "Lumio", completedOrders: 312, cancelledOrders: 6, completionRate: 0.98, disputesLost: 0, medianReleaseSeconds: 185 }, expiresAt: "2026-11-19T12:01:00Z" });
  assert.equal(q.token, "USDC");
  assert.equal(q.tokenAmount, "34.9168");
  assert.equal(q.netAmount, "34.81205");
  assert.equal(q.merchant.completed, 312);
});

test("an order, from the client's and the merchant's views", () => {
  const base = {
    id: "ord", kind: "SALE", status: "awaiting_payment", tier: "public", network: "base", chainId: 8453, contract: "0x1", token: "0xusdc", tokenSymbol: "USDC", tokenDecimals: 6,
    currency: "ARS", rail: "ar_bank_transfer", price: "1400", fiatAmount: "140000", tokenAmount: "100000000", netAmount: "99700000", protocolFeeBps: 30, integratorFeeBps: 0,
    bond: "0", sellerAddress: "0xs", buyerAddress: "0xb", onchainId: "7", acceptDeadline: null, paymentDeadline: "2026-11-19T12:30:00Z", paidAt: null, endedAt: null,
    txHashes: { open: "0xopen", accept: null, paid: null, release: null, cancel: null, dispute: null, resolve: null }, createdAt: "2026-11-19T12:00:00Z", updatedAt: "2026-11-19T12:00:00Z",
  };
  const client = normalizeOrder({ ...base, kind: "BUY", merchant: { displayName: "Lumio" }, paymentDetails: { rail: "ar_bank_transfer", holderName: "Lumio SRL", details: { alias: "lumio.ars" } }, transactions: [] });
  assert.equal(client.kind, "BUY");
  assert.equal(client.role, "client");
  assert.equal(client.tokenAmount, "100");
  assert.equal(client.bond, null);
  assert.equal(client.buyer, "0xb");
  assert.deepEqual(client.deadlines, { acceptBy: null, payBy: "2026-11-19T12:30:00.000Z", settleBy: null });
  assert.deepEqual(client.txs, { open: "0xopen" });
  assert.equal(client.paymentDetails?.holderName, "Lumio SRL");
  assert.equal(normalizeOrder({ ...base, kind: "SELL", status: "paid", settleDeadline: "2026-11-19T18:00:00Z" }).deadlines.settleBy, "2026-11-19T18:00:00.000Z", "a seller may dispute before it");
  const merchant = normalizeOrder({ ...base, kind: "PAYOUT", bond: "10000000", merchantAccountId: "acc", merchantSide: "buyer", beneficiary: { holderName: "Ana", document: "20329642330", rail: "ar_bank_transfer", details: { cbu: "0170099222000001234561" } }, payer: null });
  assert.equal(merchant.role, "merchant");
  assert.equal(merchant.bond, "10");
  assert.equal(merchant.paymentDetails?.document, "20329642330", "the merchant pays the beneficiary's account");
  const sale = normalizeOrder({ ...base, kind: "SELL", status: "pending", transactions: [{ chainId: 8453, to: "0xusdc", data: "0x095ea7b3", value: "0", description: "Approve" }, { chainId: 8453, to: "0x1", data: "0xabcdef", value: "0", description: "Open" }] });
  assert.deepEqual(sale.transactions?.map((t) => t.action), ["approve", "openWithDeposit"]);
});

test("transfer matches, charges and payout batches", () => {
  const matches = normalizeTransferMatches({ data: [{ order: { id: "o", kind: "BUY", status: "paid", network: "base", tokenSymbol: "USDC", tokenDecimals: 6, tokenAmount: "1000000", merchantSide: "seller", fiatAmount: "1400", currency: "ARS", rail: "ar_bank_transfer", price: "1400", createdAt: "2026-11-19T12:00:00Z" }, score: 3, matchedOn: ["amount", "name", "document"], transaction: { chainId: 8453, to: "0x1", data: "0x37bdc99b", value: "0", description: "Release" } }] });
  assert.equal(matches.length, 1);
  assert.equal(matches[0].transaction.action, "release");
  assert.equal(matchConfidence(3), 1);
  assert.equal(matchConfidence(1), 1 / 3);
  const c = normalizeCharge({ id: "c", currency: "ARS", fiatAmount: "85000", network: "base", token: "0xusdc", tokenSymbol: "USDC", recipientAccountId: "acc", recipientAddress: "0xr", description: null, status: "open", url: "https://payments.cosmospay.lat/p2p/c", multiUse: false, expiresAt: "2026-11-20T12:00:00Z", paidAt: null, paidCount: 0, createdAt: "2026-11-19T12:00:00Z" });
  assert.equal(c.token, "USDC");
  assert.equal(c.recipient, "0xr");
  assert.equal(c.qr, null);
  const withQr = normalizeCharge({ id: "c", status: "open", qr: "data:image/png;base64,iVBORw0KGgo=", payeeName: "Tienda Salta" });
  assert.deepEqual([withQr.qr, withQr.payeeName], ["data:image/png;base64,iVBORw0KGgo=", "Tienda Salta"]);
  const b = normalizePayoutBatch({ id: "b", network: "base", token: "0xusdc", accountId: "acc", status: "partially_completed", itemCount: 3, orders: [{ id: "o1", kind: "PAYOUT", status: "completed", tokenDecimals: 6, tokenAmount: "1", currency: "ARS", fiatAmount: "1000", rail: "ar_bank_transfer", price: "1", merchantSide: "buyer", beneficiary: { holderName: "Ana", details: {} }, externalReference: "inv-1", createdAt: "2026-11-19T12:00:00Z" }], failedItems: [{ index: 1, currency: "CLP", fiatAmount: "95000", externalReference: "inv-2", reason: "No merchant" }], createdAt: "2026-11-19T12:00:00Z" });
  assert.equal(b.status, "partial");
  assert.equal(b.itemCount, 3);
  assert.deepEqual(b.items.map((i) => [i.status, i.beneficiaryName, i.error]), [["completed", "Ana", null], ["rejected", "-", "No merchant"]]);
  assert.equal(normalizePayoutBatch({ id: "b", status: "processing", itemCount: 2, orders: [], failedItems: [] }).itemCount, 2, "a list answers without its orders");
});

test("requests: base units and the server's argument names", () => {
  assert.deepEqual(txArgs("deposit", { token: "USDC", amount: "250.5" }, 6), { token: "USDC", amount: "250500000" });
  assert.deepEqual(txArgs("setMatcher", { maxPerOrder: "1000", autoSettle: false }, 6), { maxPerOrder: "1000000000", autoSettle: false });
  assert.deepEqual(txArgs("setOperator", { operator: "0xbot", perms: 6 }, 6), { operator: "0xbot", permissions: 6 });
  assert.deepEqual(txArgs("release", { orderId: "o", reference: "x" }, 6), { orderId: "o" });
  assert.deepEqual(txArgs("markPaid", { orderId: "o", reference: "x" }, 6), { orderId: "o", reference: "x" });
});
