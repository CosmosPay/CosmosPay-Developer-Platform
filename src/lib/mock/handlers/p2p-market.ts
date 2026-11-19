/* The P2P market in mock mode: the dashboard's P2P views (/api/p2p/*, the Payments API's /v1/p2p/*),
   and the store the payments domain's mocks read too (the hosted charge page's keyless routes in
   src/lib/mock/gateway.ts, the public P2P app's server route). One market per environment, seeded
   the same on every start: the networks the contract is "deployed" on, two registered wallets of
   the sample account (one a merchant with offers and payment methods), orders on both sides,
   charges and a payout batch.

   Nothing reaches a chain. A transaction the builder answers is a well-formed sample a wallet
   could decode; once it is built, the order or balance it names moves a few seconds later, as the
   indexer would show it after the wallet sent it, so every screen's next step can be seen. Wallet
   signatures are not checked (a challenge is issued, any signature over it is taken), as for the
   organization's wallets. The checks and messages are the Payments API's, per the design. */
import { badRequest, conflict, created, notFound, ok, page, route, str, type MockEnv, type MockRoute } from "@/lib/mock/http";
import { mockEnvStore } from "@/lib/mock/store";
import { daysAgo, evmAddress, evmTxHash, hex, hoursAgo, nowIso, qrImage, rng, uuid } from "@/lib/mock/fixtures";
import { RAILS, RAIL_IDS, checkAccount, checkBeneficiary, isRailId, normalizeDetails, checkPayerDocument, fiatDecimals } from "@/lib/p2p/rails";
import { fromBaseUnits, toBaseUnits } from "@/lib/p2p/amounts";
import { isValidMask } from "@/lib/p2p/perms";
import { merchantSells } from "@/lib/p2p/orders";
import type {
  P2pAccount, P2pCharge, P2pMarket, P2pNetwork, P2pOffer, P2pOrder, P2pOrderKind, P2pOrderStatus, P2pPaymentMethod,
  P2pPayoutBatch, P2pPayoutItem, P2pQuote, P2pTransaction, P2pTxAction,
} from "@/lib/p2p/types";
import { P2P_TX_ACTIONS } from "@/lib/p2p/types";

const PAYMENTS_ORIGIN = (process.env.PUBLIC_PAYMENTS_URL || "https://payments.cosmospay.lat").replace(/\/+$/, "");
const EVM = /^0x[0-9a-fA-F]{40}$/;

/* Who an order belongs to: the sample account's consumer, or the public P2P app's (Cosmos Pay's
   own integrator key on the payments domain). */
export type P2pConsumer = "org" | "app";

/* --- The market --- */

const USDC_MAIN: Record<string, string> = {
  base: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  arb: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
  pol: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
  op: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85",
  monad: "0x754704bc059f8c67012fed69bc8a327a5aafb603",
};

function networks(env: MockEnv): P2pNetwork[] {
  const net = (id: string, name: string, chainId: number, explorer: string, tokens: P2pNetwork["tokens"], nativeSymbol = "ETH", rpcUrl: string | null = null): P2pNetwork => ({
    id, name, chainId, contract: evmAddress(`p2p-market-${env}-${id}`), explorer, rpcUrl, nativeSymbol, tokens,
  });
  if (env === "prod") {
    return [
      net("base", "Base", 8453, "https://basescan.org", [{ symbol: "USDC", address: USDC_MAIN.base, decimals: 6 }]),
      net("arb", "Arbitrum", 42161, "https://arbiscan.io", [
        { symbol: "USDC", address: USDC_MAIN.arb, decimals: 6 },
        { symbol: "USDT", address: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", decimals: 6 },
      ]),
      net("pol", "Polygon", 137, "https://polygonscan.com", [{ symbol: "USDC", address: USDC_MAIN.pol, decimals: 6 }], "POL"),
      net("op", "Optimism", 10, "https://optimistic.etherscan.io", [{ symbol: "USDC", address: USDC_MAIN.op, decimals: 6 }]),
      net("monad", "Monad", 143, "https://monadscan.com", [{ symbol: "USDC", address: USDC_MAIN.monad, decimals: 6 }], "MON", "https://rpc.monad.xyz"),
    ];
  }
  return [
    net("base", "Base Sepolia", 84532, "https://sepolia.basescan.org", [{ symbol: "USDC", address: "0x036CbD53842c5426634e7929541eC2318f3dCF7e", decimals: 6 }], "ETH", "https://sepolia.base.org"),
    net("arb", "Arbitrum Sepolia", 421614, "https://sepolia.arbiscan.io", [{ symbol: "USDC", address: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d", decimals: 6 }], "ETH", "https://sepolia-rollup.arbitrum.io/rpc"),
    net("monad", "Monad Testnet", 10143, "https://testnet.monadexplorer.com", [{ symbol: "USDC", address: evmAddress("monad-testnet-usdc"), decimals: 6 }], "MON", "https://testnet-rpc.monad.xyz"),
  ];
}

export function mockP2pMarket(env: MockEnv): P2pMarket {
  const currencies = [...new Set(RAIL_IDS.map((id) => RAILS[id].currency))];
  return {
    tier: env === "prod" ? "mainnet" : "testnet",
    networks: networks(env),
    currencies: currencies.map((code) => ({ code, rails: RAIL_IDS.filter((id) => RAILS[id].currency === code) })),
    rails: RAIL_IDS.map((id) => ({
      id,
      currency: RAILS[id].currency,
      fields: RAILS[id].fields.map((f) => ({ key: f.key, required: !f.optional && !f.oneOf })),
    })),
    protocolFeeBps: 30,
    windows: { paymentSeconds: 1800, acceptSeconds: 300, settleSeconds: 21600 },
    sellBondBps: 1000,
    matcher: evmAddress(`p2p-matcher-${env}`),
    maxPayoutItems: 100,
  };
}

const networkOf = (env: MockEnv, id: string) => networks(env).find((n) => n.id === id) ?? null;
const tokenOf = (env: MockEnv, network: string, symbol: string) => networkOf(env, network)?.tokens.find((t) => t.symbol === symbol) ?? null;

/* Indicative prices: local money per USD stablecoin, what the seeded merchants quote. */
const PRICES: Record<string, number> = { ARS: 1415, BRL: 5.41, MXN: 18.32, COP: 3920, PEN: 3.37, CLP: 942 };
/* Merchants that are not the sample account's, so a quote always finds someone. */
const MARKET_MERCHANTS = [
  { id: "mm-1", displayName: "Andes Cambio", completed: 1284, completionRate: 0.994, medianReleaseSeconds: 240, disputesLost: 1 },
  { id: "mm-2", displayName: "Rio Câmbio", completed: 862, completionRate: 0.989, medianReleaseSeconds: 310, disputesLost: 2 },
  { id: "mm-3", displayName: "Pacífico OTC", completed: 431, completionRate: 0.978, medianReleaseSeconds: 420, disputesLost: 0 },
];

/* --- The store --- */

interface ChainState {
  balances: Record<string, { free: bigint; locked: bigint }>; // by token symbol
  matcher: { maxPerOrderUnits: string; autoSettle: boolean } | null;
  operators: Record<string, number>; // address -> mask
}

interface MockOrder extends P2pOrder {
  consumer: P2pConsumer;
  merchantAccountId: string | null;
  payerToken?: string | null;
  payerEmail?: string | null;
}

interface MockQuote extends P2pQuote {
  offerId: string | null;
  merchantAccountId: string | null;
  consumer: P2pConsumer;
}

interface Store {
  accounts: P2pAccount[];
  chains: Record<string, Record<string, ChainState>>; // accountId -> network -> state
  challenges: Map<string, { address: string; expiresAt: number; used: boolean }>;
  methods: P2pPaymentMethod[];
  offers: P2pOffer[];
  quotes: Map<string, MockQuote>;
  orders: MockOrder[];
  charges: (P2pCharge & { consumer: P2pConsumer })[];
  payouts: P2pPayoutBatch[];
  seq: number;
}

const units = (amount: string | number, decimals = 6) => toBaseUnits(String(amount), decimals) ?? "0";
const floorFixed = (n: number, d: number) => (Math.floor(n * 10 ** d) / 10 ** d).toFixed(d);
const later = (minutes: number) => new Date(Date.now() + minutes * 60_000).toISOString();

function seed(env: MockEnv): Store {
  const r = rng(`p2p-${env}`);
  const net = networks(env);
  const home = net[0];
  const acc1: P2pAccount = {
    id: uuid(`p2p-account-1-${env}`),
    address: evmAddress(`p2p-account-1-${env}`),
    label: "Treasury",
    verifiedAt: daysAgo(40),
    createdAt: daysAgo(40),
    merchant: {
      displayName: "Lumio Exchange",
      status: "ACTIVE",
      stats: { completed: 312, cancelled: 6, disputesLost: 0, medianReleaseSeconds: 185, lastActiveAt: hoursAgo(1) },
    },
  };
  const acc2: P2pAccount = {
    id: uuid(`p2p-account-2-${env}`),
    address: evmAddress(`p2p-account-2-${env}`),
    label: "Payouts",
    verifiedAt: daysAgo(12),
    createdAt: daysAgo(12),
    merchant: null,
  };
  const state = (free: number, locked: number, matcher: string | null, ops: Record<string, number> = {}): ChainState => ({
    balances: { USDC: { free: BigInt(units(free)), locked: BigInt(units(locked)) } },
    matcher: matcher ? { maxPerOrderUnits: units(matcher), autoSettle: false } : null,
    operators: ops,
  });
  const chains: Store["chains"] = {
    [acc1.id]: Object.fromEntries(net.map((n, i) => [n.id, i === 0 ? state(18420.5, 1250, "2000", { [evmAddress(`p2p-bot-${env}`)]: 6 }) : i === 1 ? state(3200, 0, "1000") : state(0, 0, null)])),
    [acc2.id]: Object.fromEntries(net.map((n, i) => [n.id, i === 0 ? state(5400, 640, "1500") : state(0, 0, null)])),
  };
  const methods: P2pPaymentMethod[] = [
    { id: uuid(`pm-ars-${env}`), accountId: acc1.id, currency: "ARS", rail: "ar_bank_transfer", label: "Galicia", holderName: "Lumio Exchange SRL", document: "30714209879", details: { alias: "lumio.pagos.ars", cuit: "30714209879" }, active: true, createdAt: daysAgo(39) },
    { id: uuid(`pm-brl-${env}`), accountId: acc1.id, currency: "BRL", rail: "br_pix", label: "Pix CNPJ", holderName: "Lumio Câmbio Ltda", document: "11222333000181", details: { keyType: "cnpj", key: "11222333000181" }, active: true, createdAt: daysAgo(30) },
    { id: uuid(`pm-mxn-${env}`), accountId: acc1.id, currency: "MXN", rail: "mx_spei", label: "BBVA", holderName: "Lumio Exchange SA de CV", document: "LEX201015AB1", details: { clabe: "002010077777777771" }, active: false, createdAt: daysAgo(8) },
  ];
  const offer = (i: number, side: P2pOffer["side"], currency: string, rails: string[], spread: number, min: string, max: string, active = true, network = home.id): P2pOffer => ({
    id: uuid(`offer-${i}-${env}`), accountId: acc1.id, side, network, token: "USDC", currency, rails,
    price: (PRICES[currency] * (1 + spread)).toFixed(currency === "CLP" || currency === "COP" || currency === "ARS" ? 2 : 4),
    priceUpdatedAt: hoursAgo(0.05 * (i + 1)), priceTtlSeconds: 900, minFiat: min, maxFiat: max, active, createdAt: daysAgo(30 - i),
  });
  const offers = [
    offer(1, "SELL_TOKEN", "ARS", ["ar_bank_transfer"], 0.012, "10000", "2500000"),
    offer(2, "BUY_TOKEN", "ARS", ["ar_bank_transfer"], -0.008, "10000", "1500000"),
    offer(3, "SELL_TOKEN", "BRL", ["br_pix"], 0.01, "50", "25000"),
    offer(4, "SELL_TOKEN", "MXN", ["mx_spei"], 0.015, "200", "80000", false),
    offer(5, "SELL_TOKEN", "ARS", ["ar_bank_transfer"], 0.014, "10000", "800000", true, net[1].id),
  ];
  const marketSummary = (m = MARKET_MERCHANTS[0]) => ({ displayName: m.displayName, completed: m.completed, completionRate: m.completionRate, medianReleaseSeconds: m.medianReleaseSeconds, disputesLost: m.disputesLost });
  const ownSummary = { displayName: acc1.merchant!.displayName!, completed: 312, completionRate: 0.981, medianReleaseSeconds: 185, disputesLost: 0 };
  const people = [["Sofía Herrera", "27344556677"], ["Mateo Rossi", "20301234565"], ["Valentina Cruz", "27289012342"], ["Lucas Pereira", "52998224725"], ["Camila Duarte", "20329642330"]];
  const orders: MockOrder[] = [];
  const mk = (i: number, kind: P2pOrderKind, status: P2pOrderStatus, o: { consumer?: P2pConsumer; merchant?: boolean; currency?: string; fiat?: number; ageH?: number; network?: string } = {}): MockOrder => {
    const currency = o.currency ?? "ARS";
    const rail = RAIL_IDS.find((id) => RAILS[id].currency === currency)!;
    const price = PRICES[currency] * (merchantSells(kind) ? 1.012 : 0.992);
    const fiat = o.fiat ?? Number(r.amount(20000, 600000, 0));
    const tokenAmount = floorFixed(fiat / price, 6);
    const created = hoursAgo(o.ageH ?? i * 7 + 1);
    const live = !["completed", "cancelled", "expired", "resolved", "failed"].includes(status);
    const ownMerchant = !!o.merchant;
    const merchantSells_ = merchantSells(kind);
    const person = people[i % people.length];
    const userAddr = evmAddress(`p2p-user-${i}-${env}`);
    const merchantAddr = ownMerchant ? acc1.address : evmAddress(`mm-${i % 3}-${env}`);
    const clientAddr = kind === "PAYOUT" || kind === "CHARGE" ? acc2.address : userAddr;
    return {
      id: uuid(`p2p-order-${i}-${env}`),
      ref: `0x${hex(`p2p-ref-${i}-${env}`, 32)}`,
      kind, status,
      network: o.network ?? home.id,
      token: "USDC",
      tokenAmount,
      fiatAmount: fiat.toFixed(fiatDecimals(currency)),
      currency, rail,
      price: price.toFixed(2),
      feeBps: 30,
      integratorFeeBps: 0,
      buyer: merchantSells_ ? clientAddr : merchantAddr,
      seller: merchantSells_ ? merchantAddr : clientAddr,
      bond: merchantSells_ ? null : floorFixed(Number(tokenAmount) * 0.1, 6),
      merchant: ownMerchant ? ownSummary : marketSummary(MARKET_MERCHANTS[i % 3]),
      deadlines: {
        acceptBy: !merchantSells_ ? (status === "awaiting_acceptance" ? later(4) : created) : null,
        payBy: status === "awaiting_payment" ? later(18 + (i % 3) * 4) : created,
        settleBy: kind === "SELL" && status === "paid" ? later(300) : null,
      },
      paymentDetails: merchantSells_
        ? { rail, holderName: ownMerchant ? "Lumio Exchange SRL" : MARKET_MERCHANTS[i % 3].displayName, document: "30714209879", details: rail === "ar_bank_transfer" ? { alias: "lumio.pagos.ars", cuit: "30714209879" } : rail === "br_pix" ? { keyType: "cnpj", key: "11222333000181" } : { clabe: "002010077777777771" } }
        : { rail, holderName: person[0], document: person[1], details: { cbu: "0000003110000000123456", cuit: person[1] } },
      payer: merchantSells_ ? { name: person[0], document: person[1] } : null,
      paidReference: ["paid", "completed"].includes(status) ? `TRX${hex(`trx-${i}`, 4).toUpperCase()}` : null,
      onchainId: status === "pending" ? null : String(1000 + i),
      txs: {
        ...(status !== "pending" ? { open: evmTxHash(`p2p-open-${i}-${env}`) } : {}),
        ...(["paid", "completed", "disputed"].includes(status) ? { paid: evmTxHash(`p2p-paid-${i}-${env}`) } : {}),
        ...(status === "completed" ? { release: evmTxHash(`p2p-release-${i}-${env}`) } : {}),
        ...(status === "cancelled" || status === "expired" ? { cancel: evmTxHash(`p2p-cancel-${i}-${env}`) } : {}),
        ...(status === "disputed" ? { dispute: evmTxHash(`p2p-dispute-${i}-${env}`) } : {}),
      },
      chargeId: null,
      payoutBatchId: null,
      externalReference: kind === "PAYOUT" ? `inv-${2000 + i}` : null,
      createdAt: created,
      updatedAt: live ? hoursAgo(0.1) : created,
      consumer: o.consumer ?? "org",
      merchantAccountId: ownMerchant ? acc1.id : null,
      role: ownMerchant ? "merchant" : "client",
    };
  };
  // The sample account's own orders (it is the client).
  orders.push(
    mk(1, "BUY", "awaiting_payment", { ageH: 0.2 }),
    mk(2, "BUY", "completed"),
    mk(3, "SELL", "awaiting_acceptance", { ageH: 0.05 }),
    mk(4, "CHARGE", "completed", { currency: "BRL", fiat: 480 }),
    mk(5, "PAYOUT", "paid", { ageH: 1.5 }),
    mk(6, "PAYOUT", "completed"),
    mk(7, "BUY", "expired"),
    mk(8, "BUY", "disputed", { ageH: 5 }),
    mk(9, "SELL", "completed", { currency: "BRL", fiat: 1250 }),
    mk(10, "CHARGE", "awaiting_payment", { ageH: 0.1, fiat: 85000 }),
  );
  // Orders matched to the sample account's merchant wallet, from other clients.
  orders.push(
    mk(21, "BUY", "awaiting_payment", { consumer: "app", merchant: true, ageH: 0.15, fiat: 150000 }),
    mk(22, "BUY", "paid", { consumer: "app", merchant: true, ageH: 0.3, fiat: 72500 }),
    mk(23, "CHARGE", "completed", { consumer: "app", merchant: true }),
    mk(24, "SELL", "awaiting_acceptance", { consumer: "app", merchant: true, ageH: 0.02, fiat: 98000 }),
    mk(25, "PAYOUT", "awaiting_payment", { consumer: "app", merchant: true, ageH: 0.25, fiat: 210000 }),
    mk(26, "BUY", "completed", { consumer: "app", merchant: true, currency: "BRL", fiat: 900 }),
    mk(27, "BUY", "cancelled", { consumer: "app", merchant: true }),
    mk(28, "SELL", "completed", { consumer: "app", merchant: true }),
  );
  const charge = (i: number, status: P2pCharge["status"], fiat: string, currency: string, description: string, ageD: number, multiUse = false): Store["charges"][number] => {
    const id = uuid(`p2p-charge-${i}-${env}`);
    return {
      id, currency, fiatAmount: fiat, network: home.id, token: "USDC", recipient: acc2.address, description, status, payeeName: "Andes Commerce",
      url: `${PAYMENTS_ORIGIN}/p2p/${id}`, qr: qrImage(id), multiUse,
      expiresAt: status === "expired" ? daysAgo(ageD - 1) : new Date(Date.now() + 7 * 86_400_000).toISOString(),
      paidAt: status === "paid" ? daysAgo(ageD - 0.5) : null, orders: status === "paid" ? 1 : 0, createdAt: daysAgo(ageD), consumer: "org",
    };
  };
  const charges = [
    charge(1, "open", "85000.00", "ARS", "Order #1042", 0.2),
    charge(2, "paid", "480.00", "BRL", "Annual plan", 3),
    charge(3, "open", "12500.00", "ARS", "Donation", 6, true),
    charge(4, "expired", "2300.00", "MXN", "Invoice F-88", 15),
  ];
  orders.find((o) => o.id === uuid(`p2p-order-4-${env}`))!.chargeId = charges[1].id;
  orders.find((o) => o.id === uuid(`p2p-order-10-${env}`))!.chargeId = charges[0].id;
  const batchId = uuid(`p2p-batch-1-${env}`);
  const payouts: P2pPayoutBatch[] = [{
    id: batchId, network: home.id, token: "USDC", accountId: acc2.id, status: "processing", createdAt: hoursAgo(2),
    items: [
      { index: 0, orderId: uuid(`p2p-order-5-${env}`), status: "paid", currency: "ARS", fiatAmount: orders[4].fiatAmount, rail: "ar_bank_transfer", beneficiaryName: "Lucas Pereira", externalReference: "inv-2005", error: null },
      { index: 1, orderId: uuid(`p2p-order-6-${env}`), status: "completed", currency: "ARS", fiatAmount: orders[5].fiatAmount, rail: "ar_bank_transfer", beneficiaryName: "Camila Duarte", externalReference: "inv-2006", error: null },
      { index: 2, orderId: null, status: "rejected", currency: "CLP", fiatAmount: "95000", rail: "cl_bank_transfer", beneficiaryName: "Pedro Soto", externalReference: "inv-2007", error: "No merchant can pay this amount right now." },
    ],
  }];
  for (const o of orders) if (o.kind === "PAYOUT" && o.consumer === "org") o.payoutBatchId = batchId;
  return { accounts: [acc1, acc2], chains, challenges: new Map(), methods, offers, quotes: new Map(), orders, charges, payouts, seq: 0 };
}

export const p2pStore = (env: MockEnv) => mockEnvStore<Store>("p2p-market", env, seed);

/* --- On-chain moves, a few seconds after a transaction is built (as if sent and indexed) --- */

const SETTLE_MS = 4000;

function later_(fn: () => void, ms = SETTLE_MS) {
  // unref: a pending move never keeps a process (a test run) alive.
  setTimeout(() => { try { fn(); } catch (err) { console.error("[mock] p2p:", err); } }, ms).unref?.();
}

function moveOrder(env: MockEnv, id: string, action: P2pTxAction | "paidByMatcher", from?: string) {
  const o = p2pStore(env).orders.find((x) => x.id === id);
  if (!o) return;
  const now = nowIso();
  const settle = mockP2pMarket(env).windows.settleSeconds;
  switch (action) {
    case "accept":
      if (o.status !== "awaiting_acceptance") return;
      o.status = "awaiting_payment";
      o.deadlines.payBy = later(30);
      o.txs = { ...o.txs, accept: evmTxHash(`accept-${id}`) };
      break;
    case "markPaid":
    case "paidByMatcher":
      if (o.status !== "awaiting_payment") return;
      o.status = "paid";
      if (o.kind === "SELL") o.deadlines.settleBy = new Date(Date.now() + settle * 1000).toISOString();
      o.txs = { ...o.txs, paid: evmTxHash(`paid-${id}`) };
      break;
    case "release":
      if (o.status !== "awaiting_payment" && o.status !== "paid") return;
      o.status = "completed";
      o.txs = { ...o.txs, release: evmTxHash(`release-${id}`) };
      if (o.chargeId) {
        const c = p2pStore(env).charges.find((x) => x.id === o.chargeId);
        if (c) { c.status = c.multiUse ? "open" : "paid"; c.paidAt = now; c.orders = (c.orders ?? 0) + (c.multiUse ? 0 : 0); }
      }
      break;
    case "cancel":
      if (!["awaiting_acceptance", "awaiting_payment", "paid", "pending"].includes(o.status)) return;
      o.status = "cancelled";
      o.txs = { ...o.txs, cancel: evmTxHash(`cancel-${id}`) };
      break;
    case "dispute":
      if (o.status !== "paid") return;
      o.status = "disputed";
      o.txs = { ...o.txs, dispute: evmTxHash(`dispute-${id}`) };
      break;
    default:
      return;
  }
  void from;
  o.updatedAt = now;
}

/* --- Reading a request --- */

const accountIds = (env: MockEnv) => new Set(p2pStore(env).accounts.map((a) => a.id));
const isOwnAccount = (env: MockEnv, id: string) => accountIds(env).has(id);
const accountByAddress = (env: MockEnv, address: string) => p2pStore(env).accounts.find((a) => a.address.toLowerCase() === address.toLowerCase()) ?? null;

/** The public projection of an order for `role`: a merchant never sees the client's consumer, a
    client never the merchant's address or the other party's account beyond what the role needs. */
export function orderView(o: MockOrder, role: "client" | "merchant"): P2pOrder {
  const { consumer: _c, merchantAccountId: _m, payerToken: _t, payerEmail: _e, ...rest } = o;
  const sells = merchantSells(o.kind);
  return {
    ...rest,
    role,
    // The merchant's account is for whoever pays into it (the client side on a purchase); the
    // beneficiary's for the merchant who pays it (on a sale or a payout).
    paymentDetails: (role === "client") === sells ? o.paymentDetails ?? null : null,
    payer: role === "merchant" && sells ? o.payer ?? null : null,
  };
}

function detailsOf(env: MockEnv, a: P2pAccount): P2pAccount {
  const st = p2pStore(env).chains[a.id] ?? {};
  return {
    ...a,
    chains: networks(env).map((n) => {
      const s = st[n.id] ?? { balances: {}, matcher: null, operators: {} };
      return {
        network: n.id,
        balances: n.tokens.map((t) => ({
          token: t.address, symbol: t.symbol, decimals: t.decimals,
          freeUnits: (s.balances[t.symbol]?.free ?? 0n).toString(),
          lockedUnits: (s.balances[t.symbol]?.locked ?? 0n).toString(),
        })),
        matcher: s.matcher,
        operators: Object.entries(s.operators).filter(([, m]) => m > 0).map(([address, perms]) => ({ address, perms })),
      };
    }),
  };
}

function chainState(env: MockEnv, accountId: string, network: string): ChainState {
  const st = (p2pStore(env).chains[accountId] ??= {});
  return (st[network] ??= { balances: {}, matcher: null, operators: {} });
}

/* --- The Payments API's own shapes (the community server's src/p2p entities): what the routes
   answer, so mock mode runs the screens' normalizers (src/lib/p2p/normalize.ts) on them. --- */

const decOf = (env: MockEnv, network: string, symbol: string) => networkOf(env, network)?.tokens.find((t) => t.symbol === symbol)?.decimals ?? 6;
const addrOf = (env: MockEnv, network: string, symbol: string) => networkOf(env, network)?.tokens.find((t) => t.symbol === symbol)?.address ?? symbol;
const toUnits = (env: MockEnv, network: string, symbol: string, decimal: string | null | undefined) => toBaseUnits(String(decimal ?? "0"), decOf(env, network, symbol)) ?? "0";

/** The market as GET /v1/p2p/market answers it. */
export function apiMarket(env: MockEnv) {
  const m = mockP2pMarket(env);
  return {
    available: true,
    tier: env === "prod" ? "public" : "testnet",
    networks: m.networks.map(({ explorer, rpcUrl, nativeSymbol, ...n }) => ({ ...n, nativeSymbol: nativeSymbol ?? "ETH", explorerUrl: explorer ?? null, rpcUrl: rpcUrl ?? null, protocolFeeBps: m.protocolFeeBps, paused: false })),
    currencies: m.currencies.map((c) => ({
      code: c.code, decimals: c.code === "CLP" ? 0 : 2,
      rails: c.rails.map((id) => ({ id, name: id, fields: RAILS[id as keyof typeof RAILS].fields.map((f) => ({ name: f.key, description: f.key, required: !f.optional && !f.oneOf, ...(f.options ? { options: [...f.options] } : {}) })) })),
    })),
    windows: { buyPaymentWindow: m.windows.paymentSeconds, sellAcceptWindow: m.windows.acceptSeconds, sellPaymentWindow: m.windows.paymentSeconds, sellSettleWindow: m.windows.settleSeconds },
    bondBps: m.sellBondBps,
    matcher: m.matcher,
    maxIntegratorFeeBps: 500,
  };
}

/** A registered wallet as the accounts routes answer it (with its networks on the detail). */
export function apiAccount(env: MockEnv, a: P2pAccount, withNetworks = false) {
  const st = p2pStore(env).chains[a.id] ?? {};
  return {
    id: a.id, address: a.address, label: a.label, tier: env === "prod" ? "public" : "testnet",
    displayName: a.merchant?.displayName ?? null, merchantStatus: a.merchant?.status ?? "ACTIVE",
    stats: { completedOrders: a.merchant?.stats.completed ?? 0, cancelledOrders: a.merchant?.stats.cancelled ?? 0, completionRate: 0.98, disputesLost: a.merchant?.stats.disputesLost ?? 0, medianReleaseSeconds: a.merchant?.stats.medianReleaseSeconds ?? null },
    lastActiveAt: a.merchant?.stats.lastActiveAt ?? null,
    createdAt: a.createdAt, updatedAt: a.createdAt,
    ...(withNetworks ? {
      networks: networks(env).map((n) => {
        const s = st[n.id] ?? { balances: {}, matcher: null, operators: {} };
        return {
          network: n.id,
          balances: n.tokens.map((t) => ({ symbol: t.symbol, token: t.address, decimals: t.decimals, amount: (s.balances[t.symbol]?.free ?? 0n).toString(), locked: (s.balances[t.symbol]?.locked ?? 0n).toString() })),
          matcher: { maxPerOrder: s.matcher?.maxPerOrderUnits ?? "0", autoSettle: s.matcher?.autoSettle ?? false },
          operators: Object.fromEntries(Object.entries(s.operators)),
        };
      }),
    } : {}),
  };
}

export function apiMethod(m: P2pPaymentMethod) {
  const { document: _d, ...rest } = m;
  const summary = m.details.alias ? `alias ${m.details.alias}` : m.details.key ? `PIX ${m.details.keyType} ${m.details.key}` : m.details.clabe ? `CLABE ****${m.details.clabe.slice(-4)}` : m.rail;
  return { ...rest, summary, updatedAt: m.createdAt };
}

export function apiOffer(env: MockEnv, o: P2pOffer) {
  return { ...o, token: addrOf(env, o.network, o.token), tokenSymbol: o.token, priceFresh: Date.parse(o.priceUpdatedAt) + o.priceTtlSeconds * 1000 > Date.now(), updatedAt: o.priceUpdatedAt };
}

export function apiQuote(env: MockEnv, q: MockQuote) {
  const { offerId: _o, merchantAccountId: _m, consumer: _c, ...rest } = q;
  const u = (v: string) => toUnits(env, q.network, q.token, v);
  return {
    ...rest, token: addrOf(env, q.network, q.token), tokenSymbol: q.token, tokenDecimals: decOf(env, q.network, q.token),
    tokenAmount: u(q.tokenAmount), protocolFee: u(q.protocolFee), integratorFee: u(q.integratorFee), netAmount: q.side === "BUY" ? u(q.netAmount) : q.netAmount,
    protocolFeeBps: 30, integratorFeeBps: 0, bond: q.side === "SELL" ? u(floorFixed(Number(q.tokenAmount) * 0.1, 6)) : "0",
    windows: { acceptWindow: q.side === "SELL" ? 300 : 0, paymentWindow: 1800, settleWindow: q.side === "SELL" ? 21600 : 0 },
    merchant: { displayName: q.merchant.displayName, completedOrders: q.merchant.completed, cancelledOrders: 3, completionRate: q.merchant.completionRate, disputesLost: q.merchant.disputesLost ?? 0, medianReleaseSeconds: q.merchant.medianReleaseSeconds },
  };
}

/** An order as the client's routes (role "client") or the merchant's (role "merchant") answer it. */
export function apiOrder(env: MockEnv, o: MockOrder, role: "client" | "merchant") {
  const sells = merchantSells(o.kind);
  const network = networkOf(env, o.network);
  const u = (v: string | null | undefined) => toUnits(env, o.network, o.token, v);
  const base = {
    id: o.id, kind: o.kind, status: o.status, tier: env === "prod" ? "public" : "testnet", network: o.network, chainId: network?.chainId ?? 0, contract: network?.contract ?? "",
    token: addrOf(env, o.network, o.token), tokenSymbol: o.token, tokenDecimals: decOf(env, o.network, o.token),
    currency: o.currency, rail: o.rail, price: o.price, fiatAmount: o.fiatAmount, tokenAmount: u(o.tokenAmount), netAmount: u(floorFixed(Number(o.tokenAmount) * 0.997, 6)),
    bond: o.bond ? u(o.bond) : "0", sellerAddress: o.seller, buyerAddress: o.buyer, onchainId: o.onchainId ?? null,
    acceptDeadline: o.deadlines.acceptBy, paymentDeadline: o.deadlines.payBy, settleDeadline: o.deadlines.settleBy, paidAt: o.status === "paid" ? o.updatedAt ?? null : null, endedAt: null,
    txHashes: { open: null, accept: null, paid: null, release: null, cancel: null, dispute: null, resolve: null, ...(o.txs ?? {}) },
    paidReference: o.paidReference ?? null, createdAt: o.createdAt, updatedAt: o.updatedAt ?? o.createdAt,
  };
  if (role === "merchant") {
    return {
      ...base, merchantAccountId: o.merchantAccountId, merchantSide: sells ? "seller" : "buyer",
      payer: sells && o.payer && !["completed", "cancelled", "expired", "resolved", "failed"].includes(o.status) ? o.payer : null,
      beneficiary: !sells && o.paymentDetails ? { holderName: o.paymentDetails.holderName, document: o.paymentDetails.document ?? "", rail: o.paymentDetails.rail, details: o.paymentDetails.details } : null,
    };
  }
  return {
    ...base, protocolFeeBps: 30, integratorFeeBps: 0, merchant: { displayName: o.merchant?.displayName ?? null },
    settlement: null, failureReason: null, chargeId: o.chargeId ?? null, payoutBatchId: o.payoutBatchId ?? null, externalReference: o.externalReference ?? null,
    paymentDetails: sells && o.paymentDetails ? { rail: o.paymentDetails.rail, holderName: o.paymentDetails.holderName, details: o.paymentDetails.details } : null,
    transactions: o.transactions ? o.transactions.map(({ action: _a, ...t }) => t) : [],
  };
}

export function apiCharge(env: MockEnv, c: Store["charges"][number]) {
  const { consumer: _c, recipient, orders, ...rest } = c;
  return {
    ...rest, token: addrOf(env, c.network, c.token), tokenSymbol: c.token, recipientAccountId: p2pStore(env).accounts.find((a) => a.address === recipient)?.id ?? null,
    recipientAddress: recipient, paidCount: orders ?? 0, tier: env === "prod" ? "public" : "testnet", updatedAt: c.createdAt,
  };
}

export function apiBatch(env: MockEnv, b: P2pPayoutBatch, withOrders = true) {
  const s = batchStatus(b, env);
  const orders = b.items.filter((i) => i.orderId).map((i) => p2pStore(env).orders.find((o) => o.id === i.orderId)).filter((o): o is MockOrder => !!o);
  return {
    id: b.id, network: b.network, token: addrOf(env, b.network, b.token), accountId: b.accountId, tier: env === "prod" ? "public" : "testnet",
    status: s.status === "partial" ? "partially_completed" : s.status, itemCount: b.items.length,
    orders: withOrders ? orders.map((o) => ({ ...apiOrder(env, o, "client"), beneficiary: o.paymentDetails ? { holderName: o.paymentDetails.holderName, document: o.paymentDetails.document ?? "", rail: o.rail, details: o.paymentDetails.details } : null })) : [],
    failedItems: b.items.filter((i) => !i.orderId).map((i) => ({ index: i.index, currency: i.currency, fiatAmount: i.fiatAmount, externalReference: i.externalReference, reason: i.error ?? "" })),
    completedAt: null, createdAt: b.createdAt,
  };
}

/* The calldata a sample transaction carries: the function's selector and its arguments as 32-byte
   words, so a wallet shows a contract call of the right shape. */
const SELECTORS: Record<P2pTxAction, string> = {
  approve: "095ea7b3", deposit: "47e7ef24", withdraw: "f3fef3a3", setOperator: "558a7297", setMatcher: "6d1b8b1b",
  accept: "19b05f49", markPaid: "4d2c6e6e", release: "37bdc99b", cancel: "40e58ee5", dispute: "f240f7c3",
};
const word = (v: string) => v.replace(/^0x/, "").toLowerCase().padStart(64, "0").slice(-64);
const uintWord = (n: string | number | bigint) => BigInt(n).toString(16).padStart(64, "0");

export function buildTransaction(env: MockEnv, network: P2pNetwork, action: P2pTxAction, args: Record<string, unknown>): P2pTransaction {
  const token = typeof args.token === "string" ? network.tokens.find((t) => t.symbol === args.token || t.address.toLowerCase() === String(args.token).toLowerCase()) : null;
  const amount = typeof args.amountUnits === "string" ? args.amountUnits : "0";
  const order = typeof args.orderId === "string" ? p2pStore(env).orders.find((o) => o.id === args.orderId) : null;
  const words: string[] = [];
  if (action === "approve") words.push(word(network.contract), uintWord(amount));
  else if (action === "deposit" || action === "withdraw") words.push(word(token?.address ?? "0x0"), uintWord(amount));
  else if (action === "setOperator") words.push(word(String(args.operator ?? "0x0")), uintWord(Number(args.perms ?? 0)));
  else if (action === "setMatcher") words.push(word(mockP2pMarket(env).matcher), uintWord(String(args.maxPerOrderUnits ?? "0")), uintWord(args.autoSettle ? 1 : 0));
  else words.push(uintWord(order?.onchainId ?? 0));
  return {
    chainId: network.chainId,
    to: action === "approve" ? token?.address ?? network.contract : network.contract,
    data: `0x${SELECTORS[action]}${words.join("")}`,
    value: "0",
    description: action,
    action,
  };
}

/** Build one transaction for `from` (an account id, or the user's address on its own sale), check
    it against what it names, and move the store a few seconds later. Answers an error message. */
export function buildFor(env: MockEnv, body: Record<string, unknown> | null, consumer: P2pConsumer): P2pTransaction | string {
  const network = networkOf(env, str(body, "network") ?? "");
  if (!network) return "Unknown network.";
  const action = str(body, "action") as P2pTxAction;
  if (!(P2P_TX_ACTIONS as readonly string[]).includes(action)) return "Unknown action.";
  const from = str(body, "from") ?? "";
  const args = (body?.args && typeof body.args === "object" ? body.args : {}) as Record<string, unknown>;
  const s = p2pStore(env);
  const account = s.accounts.find((a) => a.id === from) ?? null;
  const order = typeof args.orderId === "string" ? s.orders.find((o) => o.id === args.orderId) ?? null : null;
  if (["accept", "markPaid", "release", "cancel", "dispute"].includes(action)) {
    if (!order) return "Order not found.";
    if (order.network !== network.id) return "The order is on another network.";
    const fromAddress = account ? account.address : EVM.test(from) ? from : "";
    const isSeller = fromAddress && order.seller?.toLowerCase() === fromAddress.toLowerCase();
    const isBuyer = fromAddress && order.buyer?.toLowerCase() === fromAddress.toLowerCase();
    if (!account && consumer === "org") return "Register this wallet first.";
    if (action === "release" && !isSeller) return "Only the order's seller can release it.";
    if ((action === "accept" || action === "markPaid") && !isBuyer) return "Only the order's buyer can do that.";
    if (!isSeller && !isBuyer) return "This wallet is not a party to the order.";
    const tx = buildTransaction(env, network, action, args);
    later_(() => moveOrder(env, order.id, action, fromAddress));
    return tx;
  }
  if (!account) return "Register this wallet first.";
  const token = network.tokens.find((t) => t.symbol === args.token) ?? null;
  if (["approve", "deposit", "withdraw"].includes(action)) {
    if (!token) return "Unknown token on this network.";
    // Base units, as the server takes them.
    const amountUnits = /^\d+$/.test(String(args.amount ?? "")) ? String(args.amount) : null;
    if (!amountUnits || amountUnits === "0") return "Enter an amount above zero.";
    const st = chainState(env, account.id, network.id);
    const bal = (st.balances[token.symbol] ??= { free: 0n, locked: 0n });
    if (action === "withdraw" && BigInt(amountUnits) > bal.free) return "The free balance is lower than that.";
    const tx = buildTransaction(env, network, action, { ...args, amountUnits });
    if (action === "deposit") later_(() => { bal.free += BigInt(amountUnits); });
    if (action === "withdraw") later_(() => { bal.free -= BigInt(amountUnits); });
    return tx;
  }
  if (action === "setMatcher") {
    const token6 = network.tokens[0];
    const maxUnits = /^\d+$/.test(String(args.maxPerOrder ?? "")) ? String(args.maxPerOrder) : null;
    void token6;
    if (maxUnits === null) return "Enter the most one order may lock.";
    const autoSettle = args.autoSettle === true;
    if (autoSettle && s.offers.some((o) => o.accountId === account.id && o.side === "SELL_TOKEN" && o.active)) return "Automatic settlement is not offered to a wallet with active sell offers.";
    const tx = buildTransaction(env, network, action, { maxPerOrderUnits: maxUnits, autoSettle });
    later_(() => { chainState(env, account.id, network.id).matcher = maxUnits === "0" ? null : { maxPerOrderUnits: maxUnits, autoSettle }; });
    return tx;
  }
  if (action === "setOperator") {
    const operator = String(args.operator ?? "");
    const perms = Number(args.permissions ?? args.perms);
    if (!EVM.test(operator)) return "The bot's address is not an EVM address.";
    if (operator.toLowerCase() === account.address.toLowerCase()) return "A wallet cannot be its own bot.";
    if (!isValidMask(perms)) return "Unknown permissions.";
    const tx = buildTransaction(env, network, action, { operator, perms });
    later_(() => { chainState(env, account.id, network.id).operators[operator] = perms; });
    return tx;
  }
  return "Unknown action.";
}

/* --- Quotes and orders (also the public P2P app's and the charge page's) --- */

export function quoteFor(env: MockEnv, body: Record<string, unknown> | null, consumer: P2pConsumer): MockQuote | string {
  const side = str(body, "side");
  if (side !== "BUY" && side !== "SELL") return "Choose to buy or to sell.";
  const network = networkOf(env, str(body, "network") ?? "");
  if (!network) return "Unknown network.";
  const token = network.tokens.find((t) => t.symbol === str(body, "token"));
  if (!token) return "Unknown token on this network.";
  const currency = str(body, "currency") ?? "";
  const rail = str(body, "rail") ?? "";
  if (!isRailId(rail) || RAILS[rail].currency !== currency) return "That payment method does not pay in this currency.";
  const fiatIn = str(body, "fiatAmount");
  // The API takes a token amount in base units, as the server does.
  const tokenRaw = str(body, "tokenAmount");
  const tokenIn = tokenRaw && /^\d+$/.test(tokenRaw) ? fromBaseUnits(tokenRaw, token.decimals) : tokenRaw;
  const own = p2pStore(env).offers.filter((o) => o.active && o.network === network.id && o.token === token.symbol && o.currency === currency && o.rails.includes(rail) && o.side === (side === "BUY" ? "SELL_TOKEN" : "BUY_TOKEN"));
  // A merchant of the market quotes too, a little worse than the sample account's own offers.
  const marketPrice = (PRICES[currency] ?? 1) * (side === "BUY" ? 1.018 : 0.985);
  const candidates = [
    ...own.map((o) => ({ price: Number(o.price), min: Number(o.minFiat), max: Number(o.maxFiat), offerId: o.id as string | null, merchantAccountId: o.accountId as string | null, merchant: { displayName: "Lumio Exchange", completed: 312, completionRate: 0.981, medianReleaseSeconds: 185, disputesLost: 0 } })),
    ...MARKET_MERCHANTS.map((m, i) => ({ price: marketPrice * (1 + (side === "BUY" ? 1 : -1) * i * 0.004), min: 1, max: Number.MAX_SAFE_INTEGER, offerId: null, merchantAccountId: null, merchant: m })),
  ];
  const fiat = fiatIn ? Number(fiatIn) : null;
  const tok = tokenIn ? Number(tokenIn) : null;
  if ((fiat === null || !(fiat > 0)) && (tok === null || !(tok > 0))) return "Enter an amount.";
  const fits = candidates.filter((c) => {
    const f = fiat ?? (tok ?? 0) * c.price;
    return f >= c.min && f <= c.max;
  }).sort((a, b) => (side === "BUY" ? a.price - b.price : b.price - a.price));
  const best = fits[0];
  if (!best) return "No merchant can take this amount right now.";
  const fiatAmount = fiat !== null ? fiat : (tok ?? 0) * best.price;
  const tokenAmount = tok !== null ? tok : fiatAmount / best.price;
  const fee = tokenAmount * 0.003;
  const q: MockQuote = {
    id: uuid(`quote-${Date.now()}-${Math.random()}`),
    side, network: network.id, token: token.symbol, currency, rail,
    price: best.price.toFixed(currency === "BRL" || currency === "PEN" || currency === "MXN" ? 4 : 2),
    fiatAmount: fiatAmount.toFixed(fiatDecimals(currency)),
    tokenAmount: floorFixed(tokenAmount, 6),
    protocolFee: floorFixed(fee, 6),
    integratorFee: "0",
    netAmount: floorFixed(side === "BUY" ? tokenAmount - fee : fiatAmount, side === "BUY" ? 6 : fiatDecimals(currency)),
    merchant: { displayName: best.merchant.displayName, completed: best.merchant.completed, completionRate: best.merchant.completionRate, medianReleaseSeconds: best.merchant.medianReleaseSeconds, disputesLost: best.merchant.disputesLost },
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
    offerId: best.offerId, merchantAccountId: best.merchantAccountId, consumer,
  };
  p2pStore(env).quotes.set(q.id, q);
  return q;
}

/** Open an order from a fresh quote: a purchase is opened by the matcher (awaiting payment a moment
    later), a sale answers the seller's two unsigned transactions. */
export function orderFor(env: MockEnv, body: Record<string, unknown> | null, consumer: P2pConsumer, extra: Partial<MockOrder> = {}): MockOrder | string {
  const s = p2pStore(env);
  const q = s.quotes.get(str(body, "quoteId") ?? "");
  if (!q || q.consumer !== consumer) return "The quote expired. Ask for a new one.";
  if (Date.parse(q.expiresAt) < Date.now()) return "The quote expired. Ask for a new one.";
  const network = networkOf(env, q.network)!;
  const token = network.tokens.find((t) => t.symbol === q.token)!;
  const payer = (body?.payer ?? null) as { name?: string; document?: string; email?: string } | null;
  const payout = (body?.beneficiary ?? body?.payout ?? null) as { holderName?: string; document?: string; details?: Record<string, string> } | null;
  const recipient = str(body, "recipient") ?? "";
  const seller = str(body, "seller") ?? "";
  let kind: P2pOrderKind = (str(body, "kind") as P2pOrderKind) || (q.side === "BUY" ? "BUY" : "SELL");
  if (extra.kind) kind = extra.kind;
  if (merchantSells(kind)) {
    if (!EVM.test(recipient)) return "The recipient must be an EVM address.";
    if (!payer?.name?.trim() || !payer?.document?.trim()) return "The payer's name and document are required.";
    if (checkPayerDocument(q.currency, payer.document)) return "The payer's document is not valid.";
  } else {
    if (!EVM.test(seller)) return "The seller must be an EVM address.";
    if (!payout || Object.keys(checkBeneficiary(q.rail, { holderName: payout.holderName ?? "", document: payout.document ?? "", details: payout.details ?? {} })).length) return "The beneficiary is not valid.";
  }
  s.quotes.delete(q.id);
  const id = uuid(`p2p-order-${Date.now()}-${++s.seq}`);
  const ownMerchant = q.merchantAccountId ? s.accounts.find((a) => a.id === q.merchantAccountId) ?? null : null;
  const merchantAddress = ownMerchant?.address ?? evmAddress(`mm-${q.merchant.displayName}-${env}`);
  const ownMethod = ownMerchant ? s.methods.find((m) => m.accountId === ownMerchant.id && m.rail === q.rail && m.active) : null;
  const sells = merchantSells(kind);
  const tokenUnits = toBaseUnits(q.tokenAmount, token.decimals) ?? "0";
  const o: MockOrder = {
    id, ref: `0x${hex(id, 32)}`, kind, status: sells ? "pending" : "pending",
    network: q.network, token: q.token, tokenAmount: q.tokenAmount, fiatAmount: q.fiatAmount, currency: q.currency, rail: q.rail, price: q.price,
    feeBps: 30, integratorFeeBps: 0,
    buyer: sells ? recipient : merchantAddress,
    seller: sells ? merchantAddress : seller,
    bond: sells ? null : floorFixed(Number(q.tokenAmount) * 0.1, 6),
    merchant: q.merchant,
    deadlines: { acceptBy: sells ? null : later(5), payBy: sells ? later(30) : null, settleBy: null },
    paymentDetails: sells
      ? (ownMethod
        ? { rail: q.rail, holderName: ownMethod.holderName, document: ownMethod.document, details: ownMethod.details }
        : { rail: q.rail, holderName: `${q.merchant.displayName}`, document: q.currency === "BRL" ? "11222333000181" : "30714209879", details: q.rail === "br_pix" ? { keyType: "email", key: "pagos@example.com" } : q.rail === "mx_spei" ? { clabe: "002010077777777771" } : { alias: "cambio.andes.ars", cuit: "30714209879" } })
      : { rail: q.rail, holderName: payout!.holderName!, document: payout!.document ?? null, details: normalizeDetails(q.rail, payout!.details ?? {}) },
    payer: sells ? { name: payer!.name!.trim(), document: payer!.document!.trim() } : null,
    paidReference: null,
    onchainId: null,
    txs: {},
    transactions: sells ? undefined : [
      { ...buildTransaction(env, network, "approve", { token: token.symbol, amountUnits: tokenUnits }), description: "approve", action: "approve" },
      { chainId: network.chainId, to: network.contract, data: `0x9a2c8f1b${word(`0x${hex(id, 32)}`)}${word(seller)}${uintWord(tokenUnits)}`, value: "0", description: "openWithDeposit", action: "openWithDeposit" },
    ],
    chargeId: null, payoutBatchId: null, externalReference: str(body, "externalReference") ?? null,
    createdAt: nowIso(), updatedAt: nowIso(),
    consumer, merchantAccountId: ownMerchant?.id ?? null,
    payerEmail: payer?.email ?? null,
    ...extra,
  };
  s.orders.unshift(o);
  // A purchase: the matcher's open is indexed a moment later. A sale: once the seller's wallet sent
  // its two transactions (in mock mode, a little after the order was made).
  later_(() => {
    if (o.status !== "pending") return;
    o.status = sells ? "awaiting_payment" : "awaiting_acceptance";
    o.onchainId = String(2000 + s.seq);
    o.txs = { ...o.txs, open: evmTxHash(`open-${id}`) };
    o.transactions = undefined;
    if (sells) o.deadlines.payBy = later(30);
    else o.deadlines.acceptBy = later(5);
    o.updatedAt = nowIso();
    // A sale on the sample account's own offer waits for it; any other merchant accepts by itself.
    if (!sells && !ownMerchant) later_(() => moveOrder(env, o.id, "accept"), 6000);
  }, sells ? 2500 : 8000);
  return o;
}

export function clientOrderAction(env: MockEnv, o: MockOrder, action: string): string | null {
  if (action === "paid") {
    if (!merchantSells(o.kind) || o.status !== "awaiting_payment") return "Only an order waiting for payment can be marked paid.";
    later_(() => moveOrder(env, o.id, "paidByMatcher"), 2500);
    return null;
  }
  if (action === "cancel") {
    if (merchantSells(o.kind) ? o.status !== "awaiting_payment" : o.status !== "awaiting_acceptance") return "This order can no longer be cancelled.";
    later_(() => moveOrder(env, o.id, "cancel"), 2500);
    return null;
  }
  if (action === "dispute") {
    if (o.status !== "paid") return "Only a paid order can be disputed.";
    later_(() => moveOrder(env, o.id, "dispute"), 2500);
    return null;
  }
  return "Unknown action.";
}

/* --- Charges and payouts --- */

export const chargeById = (env: MockEnv, id: string) => p2pStore(env).charges.find((c) => c.id === id) ?? null;

function batchStatus(b: P2pPayoutBatch, env: MockEnv): P2pPayoutBatch {
  const s = p2pStore(env);
  const items: P2pPayoutItem[] = b.items.map((it) => {
    const o = it.orderId ? s.orders.find((x) => x.id === it.orderId) : null;
    return o ? { ...it, status: o.status } : it;
  });
  const live = items.filter((i) => !["completed", "cancelled", "expired", "resolved", "failed", "rejected"].includes(i.status));
  const done = items.filter((i) => i.status === "completed" || i.status === "resolved");
  const status = live.length ? "processing" : done.length === items.length ? "completed" : done.length ? "partial" : "failed";
  return { ...b, items, status };
}

/* --- The dashboard's routes (/api/p2p/*) --- */

const P = "/api/p2p";

export const routes: MockRoute[] = [
  route("GET", `${P}/market`, (req) => ok(apiMarket(req.env))),

  // Registered wallets.
  route("POST", `${P}/accounts/challenge`, (req) => {
    const address = str(req.body, "address") ?? "";
    if (!EVM.test(address)) return badRequest("The address must be an EVM address (0x and 40 hex characters).");
    if (accountByAddress(req.env, address)) return conflict("This wallet is already registered.");
    const id = uuid(`p2p-challenge-${Date.now()}-${Math.random()}`);
    const expiresAt = new Date(Date.now() + 10 * 60_000);
    p2pStore(req.env).challenges.set(id, { address, expiresAt: expiresAt.getTime(), used: false });
    // The server's message: what is registered, for whom, on which tier, until when.
    const message = [
      "Cosmos Pay P2P market",
      `Register wallet: ${address}`,
      `For: ${req.user.email}`,
      `Tier: ${req.env === "prod" ? "public" : "testnet"}`,
      `Nonce: ${hex(id, 16)}`,
      `Expires: ${expiresAt.toISOString()}`,
    ].join("\n");
    // No id: the register call names the address, and the server takes its open challenge.
    return created({ message, expiresAt: expiresAt.toISOString() });
  }),
  route("POST", `${P}/accounts`, (req) => {
    const s = p2pStore(req.env);
    const address = str(req.body, "address") ?? "";
    if (req.body && "challengeId" in req.body) return badRequest("property challengeId should not exist");
    const ch = [...s.challenges.values()].reverse().find((c) => c.address.toLowerCase() === address.toLowerCase() && !c.used && c.expiresAt > Date.now());
    if (!ch) return badRequest("The challenge expired or was used. Ask for a new one.");
    if (!/^0x[0-9a-fA-F]{130}$/.test(str(req.body, "signature") ?? "")) return badRequest("The signature is not an EIP-191 signature.");
    ch.used = true;
    const label = (str(req.body, "label") ?? "").trim().slice(0, 140) || null;
    const displayName = (str(req.body, "displayName") ?? "").trim();
    const a: P2pAccount = {
      id: uuid(`p2p-acc-${Date.now()}`), address: ch.address, label, verifiedAt: nowIso(), createdAt: nowIso(),
      merchant: displayName ? { displayName: displayName.slice(0, 40), status: "ACTIVE", stats: { completed: 0, cancelled: 0, disputesLost: 0, medianReleaseSeconds: null, lastActiveAt: null } } : null,
    };
    s.accounts.push(a);
    s.chains[a.id] = {};
    return created(apiAccount(req.env, a));
  }),
  route("GET", `${P}/accounts`, (req) => ok(page(p2pStore(req.env).accounts.map((a) => apiAccount(req.env, a)), req.url, 100))),
  route("GET", `${P}/accounts/:id`, (req) => {
    const a = p2pStore(req.env).accounts.find((x) => x.id === req.params.id);
    return a ? ok(apiAccount(req.env, a, true)) : notFound("Account not found");
  }),
  route("PATCH", `${P}/accounts/:id`, (req) => {
    const a = p2pStore(req.env).accounts.find((x) => x.id === req.params.id);
    if (!a) return notFound("Account not found");
    const label = str(req.body, "label");
    if (label !== undefined) a.label = label.trim().slice(0, 60) || null;
    if (req.body && "merchant" in req.body) return badRequest("property merchant should not exist");
    const displayName = str(req.body, "displayName");
    const status = str(req.body, "merchantStatus");
    if (displayName !== undefined || status !== undefined) {
      if (status && !["ACTIVE", "PAUSED"].includes(status)) return badRequest("merchantStatus must be ACTIVE or PAUSED.");
      if (a.merchant?.status === "SUSPENDED") return badRequest("This merchant is suspended. Contact support.");
      const name = (displayName ?? a.merchant?.displayName ?? "").trim();
      if (name.length < 2) return badRequest("A merchant needs a display name.");
      a.merchant = { displayName: name.slice(0, 40), status: (status as "ACTIVE" | "PAUSED") ?? a.merchant?.status ?? "ACTIVE", stats: a.merchant?.stats ?? { completed: 0, cancelled: 0, disputesLost: 0, medianReleaseSeconds: null, lastActiveAt: null } };
    }
    return ok(apiAccount(req.env, a));
  }),
  route("DELETE", `${P}/accounts/:id`, (req) => {
    const s = p2pStore(req.env);
    const a = s.accounts.find((x) => x.id === req.params.id);
    if (!a) return notFound("Account not found");
    const busy = s.orders.some((o) => o.merchantAccountId === a.id && !["completed", "cancelled", "expired", "resolved", "failed"].includes(o.status));
    if (busy) return conflict("This wallet has open orders. Remove it once they finish.");
    s.accounts = s.accounts.filter((x) => x.id !== a.id);
    s.methods = s.methods.filter((x) => x.accountId !== a.id);
    s.offers = s.offers.filter((x) => x.accountId !== a.id);
    return ok({ id: a.id, deleted: true });
  }),

  // Payment methods.
  route("GET", `${P}/payment-methods`, (req) => ok(page(p2pStore(req.env).methods.map(apiMethod), req.url, 100))),
  route("POST", `${P}/payment-methods`, (req) => {
    const s = p2pStore(req.env);
    const accountId = str(req.body, "accountId") ?? "";
    if (!isOwnAccount(req.env, accountId)) return badRequest("Choose one of your registered wallets.");
    const rail = str(req.body, "rail") ?? "";
    if (!isRailId(rail)) return badRequest("Unknown payment method.");
    if (req.body && ("document" in req.body || "active" in req.body)) return badRequest("property document should not exist");
    const details = (req.body?.details ?? {}) as Record<string, string>;
    const errors = checkAccount(rail, { holderName: str(req.body, "holderName") ?? "", details });
    if (Object.keys(errors).length) return badRequest(`Check ${Object.keys(errors).join(", ")}.`);
    const m: P2pPaymentMethod = {
      id: uuid(`pm-${Date.now()}`), accountId, currency: RAILS[rail].currency, rail,
      label: (str(req.body, "label") ?? "").trim().slice(0, 40) || null,
      holderName: (str(req.body, "holderName") ?? "").trim(), document: null,
      details: normalizeDetails(rail, details), active: true, createdAt: nowIso(),
    };
    s.methods.unshift(m);
    return created(apiMethod(m));
  }),
  route("PATCH", `${P}/payment-methods/:id`, (req) => {
    const m = p2pStore(req.env).methods.find((x) => x.id === req.params.id);
    if (!m) return notFound("Payment method not found");
    if (typeof req.body?.active === "boolean") m.active = req.body.active;
    const label = str(req.body, "label");
    if (label !== undefined) m.label = label.trim().slice(0, 40) || null;
    if (req.body && "document" in req.body) return badRequest("property document should not exist");
    if (req.body?.details || req.body?.holderName) {
      const details = (req.body?.details ?? m.details) as Record<string, string>;
      const holderName = str(req.body, "holderName") ?? m.holderName;
      const errors = checkAccount(m.rail, { holderName, details });
      if (Object.keys(errors).length) return badRequest(`Check ${Object.keys(errors).join(", ")}.`);
      Object.assign(m, { holderName: holderName.trim(), details: normalizeDetails(m.rail, details) });
    }
    return ok(apiMethod(m));
  }),
  route("DELETE", `${P}/payment-methods/:id`, (req) => {
    const s = p2pStore(req.env);
    if (!s.methods.some((x) => x.id === req.params.id)) return notFound("Payment method not found");
    s.methods = s.methods.filter((x) => x.id !== req.params.id);
    return ok({ id: req.params.id, deleted: true });
  }),

  // Offers.
  route("GET", `${P}/offers`, (req) => ok(page(p2pStore(req.env).offers.map((o) => apiOffer(req.env, o)), req.url, 100))),
  route("POST", `${P}/offers`, (req) => {
    const s = p2pStore(req.env);
    const b = req.body ?? {};
    const accountId = str(b, "accountId") ?? "";
    const account = s.accounts.find((a) => a.id === accountId);
    if (!account) return badRequest("Choose one of your registered wallets.");
    if (!account.merchant) return badRequest("Name this wallet as a merchant first.");
    const side = str(b, "side");
    if (side !== "SELL_TOKEN" && side !== "BUY_TOKEN") return badRequest("Choose whether the offer sells or buys tokens.");
    const network = networkOf(req.env, str(b, "network") ?? "");
    const offerToken = network?.tokens.find((t) => t.symbol === str(b, "token") || t.address.toLowerCase() === (str(b, "token") ?? "").toLowerCase());
    if (!network || !offerToken) return badRequest("Unknown network or token.");
    const currency = str(b, "currency") ?? "";
    const rails = Array.isArray(b.rails) ? (b.rails as unknown[]).filter((x): x is string => typeof x === "string") : [];
    if (!rails.length || rails.some((x) => !isRailId(x) || RAILS[x].currency !== currency)) return badRequest("Choose the payment methods for this currency.");
    if (side === "SELL_TOKEN" && rails.some((x) => !s.methods.some((m) => m.accountId === accountId && m.rail === x && m.active))) return badRequest("Add an active payment method for each rail first: buyers pay into it.");
    const price = Number(str(b, "price")); const min = Number(str(b, "minFiat")); const max = Number(str(b, "maxFiat"));
    if (!(price > 0)) return badRequest("Enter a price above zero.");
    if (!(min > 0) || !(max >= min)) return badRequest("The limits must be above zero, the maximum at least the minimum.");
    const ttl = Math.trunc(Number(b.priceTtlSeconds ?? 900));
    if (!(ttl >= 60 && ttl <= 86_400)) return badRequest("The price lasts between 1 minute and 1 day.");
    const o: P2pOffer = { id: uuid(`offer-${Date.now()}`), accountId, side, network: network.id, token: offerToken.symbol, currency, rails, price: String(str(b, "price")), priceUpdatedAt: nowIso(), priceTtlSeconds: ttl, minFiat: String(str(b, "minFiat")), maxFiat: String(str(b, "maxFiat")), active: b.active !== false, createdAt: nowIso() };
    s.offers.unshift(o);
    return created(apiOffer(req.env, o));
  }),
  route("PATCH", `${P}/offers/:id`, (req) => {
    const o = p2pStore(req.env).offers.find((x) => x.id === req.params.id);
    if (!o) return notFound("Offer not found");
    const b = req.body ?? {};
    if (typeof b.active === "boolean") o.active = b.active;
    if (b.price !== undefined) { if (!(Number(b.price) > 0)) return badRequest("Enter a price above zero."); o.price = String(b.price); o.priceUpdatedAt = nowIso(); }
    if (b.minFiat !== undefined) o.minFiat = String(b.minFiat);
    if (b.maxFiat !== undefined) o.maxFiat = String(b.maxFiat);
    if (b.priceTtlSeconds !== undefined) o.priceTtlSeconds = Math.trunc(Number(b.priceTtlSeconds));
    if (Array.isArray(b.rails)) o.rails = (b.rails as string[]).filter(isRailId);
    return ok(apiOffer(req.env, o));
  }),
  route("DELETE", `${P}/offers/:id`, (req) => {
    const s = p2pStore(req.env);
    if (!s.offers.some((x) => x.id === req.params.id)) return notFound("Offer not found");
    s.offers = s.offers.filter((x) => x.id !== req.params.id);
    return ok({ id: req.params.id, deleted: true });
  }),

  // Quotes and the client's orders.
  route("POST", `${P}/quotes`, (req) => {
    const q = quoteFor(req.env, req.body, "org");
    if (typeof q === "string") return badRequest(q);
    return created(apiQuote(req.env, q));
  }),
  route("GET", `${P}/orders`, (req) => {
    const kind = req.url.searchParams.get("kind");
    const status = req.url.searchParams.get("status");
    const rows = p2pStore(req.env).orders.filter((o) => o.consumer === "org" && (!kind || o.kind === kind) && (!status || o.status === status)).map((o) => ({ ...apiOrder(req.env, o, "client"), paymentDetails: null }));
    return ok(page(rows, req.url, 100));
  }),
  route("POST", `${P}/orders`, (req) => {
    const o = orderFor(req.env, req.body, "org");
    return typeof o === "string" ? badRequest(o) : created(apiOrder(req.env, o, "client"));
  }),
  route("GET", `${P}/orders/:id`, (req) => {
    const o = p2pStore(req.env).orders.find((x) => x.id === req.params.id && x.consumer === "org");
    return o ? ok(apiOrder(req.env, o, "client")) : notFound("Order not found");
  }),
  route("POST", `${P}/orders/:id/:action`, (req) => {
    const o = p2pStore(req.env).orders.find((x) => x.id === req.params.id && x.consumer === "org");
    if (!o) return notFound("Order not found");
    const err = clientOrderAction(req.env, o, req.params.action);
    if (err) return badRequest(err);
    if (req.params.action === "paid") o.paidReference = (str(req.body, "reference") ?? "").trim().slice(0, 140) || o.paidReference || null;
    return ok(apiOrder(req.env, o, "client"));
  }),

  // The merchant's orders.
  route("GET", `${P}/merchant/orders`, (req) => {
    const own = accountIds(req.env);
    const rows = p2pStore(req.env).orders.filter((o) => o.merchantAccountId && own.has(o.merchantAccountId)).map((o) => apiOrder(req.env, o, "merchant"));
    return ok(page(rows, req.url, 100));
  }),
  route("GET", `${P}/merchant/orders/:id`, (req) => {
    const own = accountIds(req.env);
    const o = p2pStore(req.env).orders.find((x) => x.id === req.params.id && x.merchantAccountId && own.has(x.merchantAccountId));
    return o ? ok(apiOrder(req.env, o, "merchant")) : notFound("Order not found");
  }),
  route("POST", `${P}/merchant/transfer-matches`, (req) => {
    const currency = (str(req.body, "currency") ?? "").toUpperCase();
    const amount = Number(str(req.body, "amount"));
    if (!currency || !(amount > 0)) return badRequest("A currency and an amount are required.");
    const name = (str(req.body, "payerName") ?? "").trim().toLowerCase();
    const doc = (str(req.body, "payerDocument") ?? "").replace(/\D/g, "");
    const own = accountIds(req.env);
    const s = p2pStore(req.env);
    const matches = s.orders
      .filter((o) => o.merchantAccountId && own.has(o.merchantAccountId) && merchantSells(o.kind) && ["awaiting_payment", "paid"].includes(o.status) && o.currency === currency && Math.abs(Number(o.fiatAmount) - amount) < 0.005)
      .map((o) => {
        // As the server scores it: 1 for the amount, 1 more for the name, 1 more for the document.
        const matchedOn = ["amount"];
        if (name && o.payer?.name.toLowerCase().includes(name)) matchedOn.push("name");
        if (doc && o.payer?.document.replace(/\D/g, "") === doc) matchedOn.push("document");
        const network = networkOf(req.env, o.network)!;
        const { action: _a, ...transaction } = buildTransaction(req.env, network, "release", { orderId: o.id });
        return { order: apiOrder(req.env, o, "merchant"), score: matchedOn.length, matchedOn, transaction };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
    return ok({ data: matches });
  }),

  // Unsigned transactions for the person's wallet.
  route("POST", `${P}/transactions`, (req) => {
    const tx = buildFor(req.env, req.body, "org");
    if (typeof tx === "string") return badRequest(tx);
    const { action: _a, ...answer } = tx;
    return ok(answer);
  }),

  // Charges.
  route("GET", `${P}/charges`, (req) => ok(page(p2pStore(req.env).charges.filter((c) => c.consumer === "org").map((c) => apiCharge(req.env, c)), req.url, 100))),
  route("POST", `${P}/charges`, (req) => {
    const s = p2pStore(req.env);
    const b = req.body ?? {};
    const currency = str(b, "currency") ?? "";
    if (!RAIL_IDS.some((id) => RAILS[id].currency === currency)) return badRequest("Unknown currency.");
    const fiat = str(b, "fiatAmount") ?? "";
    if (!(Number(fiat) > 0)) return badRequest("Enter an amount above zero.");
    const network = networkOf(req.env, str(b, "network") ?? "");
    if (!network || !network.tokens.some((t) => t.symbol === str(b, "token"))) return badRequest("Unknown network or token.");
    const recipient = s.accounts.find((a) => a.id === str(b, "recipient") || a.address.toLowerCase() === (str(b, "recipient") ?? "").toLowerCase());
    if (!recipient) return badRequest("The recipient must be one of your registered wallets.");
    const payeeName = (str(b, "payeeName") ?? "").trim();
    if (!/^[\p{L}\p{M}\p{N}][\p{L}\p{M}\p{N} .,&'()-]{1,59}$/u.test(payeeName)) return badRequest("payeeName must be 2 to 60 letters, digits, spaces and . , & ' ( ) -");
    const expiresAt = str(b, "expiresAt");
    if (expiresAt && !(Date.parse(expiresAt) > Date.now())) return badRequest("The expiry must be in the future.");
    if (expiresAt && Date.parse(expiresAt) > Date.now() + 30 * 86_400_000) return badRequest("A charge lasts 30 days at most.");
    const id = uuid(`p2p-charge-${Date.now()}`);
    const c = {
      id, currency, fiatAmount: Number(fiat).toFixed(fiatDecimals(currency)), network: network.id, token: str(b, "token")!, recipient: recipient.address,
      description: (str(b, "description") ?? "").trim().slice(0, 120) || null, status: "open" as const, payeeName,
      url: `${PAYMENTS_ORIGIN}/p2p/${id}`, qr: qrImage(id), multiUse: b.multiUse === true,
      expiresAt: expiresAt ?? new Date(Date.now() + 86_400_000).toISOString(), paidAt: null, orders: 0, createdAt: nowIso(), consumer: "org" as const,
    };
    s.charges.unshift(c);
    return created(apiCharge(req.env, c));
  }),
  route("GET", `${P}/charges/:id`, (req) => {
    const c = chargeById(req.env, req.params.id);
    if (!c || c.consumer !== "org") return notFound("Charge not found");
    return ok(apiCharge(req.env, c));
  }),
  route("DELETE", `${P}/charges/:id`, (req) => {
    const s = p2pStore(req.env);
    const c = chargeById(req.env, req.params.id);
    if (!c || c.consumer !== "org") return notFound("Charge not found");
    if (s.orders.some((o) => o.chargeId === c.id && !["completed", "cancelled", "expired", "resolved", "failed"].includes(o.status))) return conflict("A payer is paying this charge. Remove it once that order finishes.");
    if (c.status === "paid") return conflict("A paid charge is kept as a record.");
    s.charges = s.charges.filter((x) => x.id !== c.id);
    return ok({ id: c.id, deleted: true });
  }),

  // Payouts.
  route("GET", `${P}/payouts`, (req) => ok(page(p2pStore(req.env).payouts.map((b) => apiBatch(req.env, b, false)), req.url, 100))),
  route("GET", `${P}/payouts/:id`, (req) => {
    const b = p2pStore(req.env).payouts.find((x) => x.id === req.params.id);
    return b ? ok(apiBatch(req.env, b)) : notFound("Payout batch not found");
  }),
  route("POST", `${P}/payouts`, (req) => {
    const s = p2pStore(req.env);
    const b = req.body ?? {};
    const network = networkOf(req.env, str(b, "network") ?? "");
    const token = network?.tokens.find((t) => t.symbol === str(b, "token"));
    if (!network || !token) return badRequest("Unknown network or token.");
    const account = s.accounts.find((a) => a.id === str(b, "accountId"));
    if (!account) return badRequest("Choose the registered wallet the payouts are paid from.");
    if (!chainState(req.env, account.id, network.id).matcher) return badRequest("Authorise Cosmos Pay on this network first (Liquidity).");
    const items = Array.isArray(b.items) ? (b.items as Record<string, unknown>[]) : [];
    if (!items.length || items.length > 100) return badRequest("Send between 1 and 100 payouts.");
    const batch: P2pPayoutBatch = { id: uuid(`p2p-batch-${Date.now()}`), network: network.id, token: token.symbol, accountId: account.id, status: "processing", items: [], createdAt: nowIso() };
    items.forEach((item, index) => {
      const rail = String(item.rail ?? "");
      const currency = String(item.currency ?? "");
      const ben = (item.beneficiary ?? {}) as { holderName?: string; document?: string; details?: Record<string, string> };
      const base = { index, currency, fiatAmount: String(item.fiatAmount ?? ""), rail, beneficiaryName: ben.holderName ?? "", externalReference: (item.externalReference as string) ?? null };
      if (!isRailId(rail) || Object.keys(checkBeneficiary(rail, { holderName: ben.holderName ?? "", document: ben.document ?? "", details: ben.details ?? {} })).length) {
        batch.items.push({ ...base, orderId: null, status: "rejected", error: "The beneficiary's account is not valid." });
        return;
      }
      if (currency === "CLP" || currency === "PEN") {
        batch.items.push({ ...base, orderId: null, status: "rejected", error: "No merchant can pay this amount right now." });
        return;
      }
      const q = quoteFor(req.env, { side: "SELL", network: network.id, token: token.symbol, currency, rail, fiatAmount: base.fiatAmount }, "org");
      if (typeof q === "string") { batch.items.push({ ...base, orderId: null, status: "rejected", error: q }); return; }
      const o = orderFor(req.env, { quoteId: q.id, seller: account.address, payout: ben, externalReference: base.externalReference }, "org", { kind: "PAYOUT", transactions: undefined });
      if (typeof o === "string") { batch.items.push({ ...base, orderId: null, status: "rejected", error: o }); return; }
      o.payoutBatchId = batch.id;
      // The matcher opens it (no signature from the client); the merchant accepts and pays.
      later_(() => moveOrder(req.env, o.id, "markPaid"), 20_000);
      batch.items.push({ ...base, orderId: o.id, status: o.status, error: null });
    });
    s.payouts.unshift(batch);
    return created(apiBatch(req.env, batch));
  }),
];
