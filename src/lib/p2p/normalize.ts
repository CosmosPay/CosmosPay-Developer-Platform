/* normalize.ts: the Payments API's P2P answers (the community server's `src/p2p` entities, OpenAPI
   tags p2p-market and p2p-checkout) turned into the shapes the screens read (src/lib/p2p/types.ts),
   and the screens' requests turned into the bodies its DTOs accept (they refuse unknown fields).

   What differs, and why the screens keep their own shapes: token amounts travel in base units
   (here, decimal strings in the token's decimals), `token` is the contract address with the symbol
   in `tokenSymbol` (here, the symbol), the parties are `buyerAddress` / `sellerAddress`, deadlines
   and transaction hashes are flat, the merchant's profile is flat on its account, an account's
   on-chain state is `networks` with operators as a map, and the market nests each currency's rails.
   Each function also takes the screens' own shape (mock mode's older answers, a cached value) and
   leaves it as it is, so it can run on anything. Pure; tests/unit/p2pNormalize.test.ts. */
import { fromBaseUnits, toBaseUnits } from "@/lib/p2p/amounts";
import type {
  P2pAccount, P2pAccountChain, P2pBankAccount, P2pCharge, P2pMarket, P2pMarketRail, P2pMerchantSummary, P2pOffer, P2pOrder,
  P2pPaymentMethod, P2pPayoutBatch, P2pPayoutItem, P2pQuote, P2pTransaction, P2pTransferMatch,
} from "@/lib/p2p/types";

type Obj = Record<string, any>;
const isObj = (v: unknown): v is Obj => !!v && typeof v === "object" && !Array.isArray(v);
const str = (v: unknown): string | null => (typeof v === "string" ? v : typeof v === "number" ? String(v) : null);
const iso = (v: unknown): string | null => {
  if (v === null || v === undefined || v === "") return null;
  const d = new Date(v as string);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};
const UNITS = /^\d+$/;
/** A token amount as a decimal string: base units converted with the token's decimals, a value
    already in decimals (it has a point, or no decimals are known) kept. */
function amount(v: unknown, decimals: number | null): string {
  const s = str(v) ?? "0";
  return decimals !== null && UNITS.test(s) ? fromBaseUnits(s, decimals) : s;
}

/* --- The market --- */

export function normalizeMarket(raw: unknown): P2pMarket | null {
  if (!isObj(raw) || !Array.isArray(raw.networks)) return null;
  const networks = raw.networks.filter(isObj).map((n: Obj) => ({
    id: String(n.id),
    name: String(n.name ?? n.id),
    chainId: Number(n.chainId),
    contract: String(n.contract ?? ""),
    explorer: str(n.explorer),
    rpcUrl: str(n.rpcUrl),
    nativeSymbol: str(n.nativeSymbol),
    tokens: (Array.isArray(n.tokens) ? n.tokens : []).filter(isObj).map((t: Obj) => ({ symbol: String(t.symbol), address: String(t.address), decimals: Number(t.decimals) })),
    paused: n.paused === true,
    protocolFeeBps: Number.isFinite(Number(n.protocolFeeBps)) ? Number(n.protocolFeeBps) : null,
  })).filter((n) => !n.paused);
  const currencies = (Array.isArray(raw.currencies) ? raw.currencies : []).filter(isObj);
  // The server nests each currency's rails (with their fields); the screens keep a flat list.
  const rails: P2pMarketRail[] = Array.isArray(raw.rails)
    ? raw.rails
    : currencies.flatMap((c: Obj) => (Array.isArray(c.rails) ? c.rails : []).filter(isObj).map((r: Obj) => ({
      id: String(r.id),
      currency: String(c.code),
      fields: (Array.isArray(r.fields) ? r.fields : []).filter(isObj).map((f: Obj) => ({ key: String(f.key ?? f.name), required: f.required !== false })),
    })));
  const w = isObj(raw.windows) ? raw.windows : {};
  const fees = networks.map((n) => n.protocolFeeBps).filter((x): x is number => x !== null);
  return {
    tier: raw.tier === "public" || raw.tier === "mainnet" ? "mainnet" : "testnet",
    networks: networks.map(({ paused: _p, protocolFeeBps: _f, ...n }) => n),
    currencies: currencies.map((c: Obj) => ({ code: String(c.code), rails: (Array.isArray(c.rails) ? c.rails : []).map((r: unknown) => (isObj(r) ? String(r.id) : String(r))) })),
    rails,
    protocolFeeBps: Number.isFinite(Number(raw.protocolFeeBps)) ? Number(raw.protocolFeeBps) : fees.length ? Math.max(...fees) : 0,
    windows: {
      paymentSeconds: Number(w.paymentSeconds ?? w.buyPaymentWindow ?? 1800),
      acceptSeconds: Number(w.acceptSeconds ?? w.sellAcceptWindow ?? 300),
      settleSeconds: Number(w.settleSeconds ?? w.sellSettleWindow ?? 0),
    },
    sellBondBps: Number(raw.sellBondBps ?? raw.bondBps ?? 0),
    matcher: str(raw.matcher) ?? "",
    maxPayoutItems: Number(raw.maxPayoutItems ?? 100),
  };
}

/** A token's decimals on a network of the market (6, the stablecoins', when unknown). */
export function decimalsOf(market: P2pMarket | null | undefined, network: string, token: string): number {
  const t = market?.networks.find((n) => n.id === network)?.tokens.find((x) => x.symbol === token || x.address.toLowerCase() === token.toLowerCase());
  return t?.decimals ?? 6;
}

/* --- Accounts --- */

function normalizeChains(raw: Obj): P2pAccountChain[] | undefined {
  const list = Array.isArray(raw.chains) ? raw.chains : Array.isArray(raw.networks) ? raw.networks : null;
  if (!list) return undefined;
  return list.filter(isObj).map((c: Obj) => {
    const m = isObj(c.matcher) ? c.matcher : null;
    const cap = m ? str(m.maxPerOrderUnits ?? m.maxPerOrder) ?? "0" : "0";
    const ops = Array.isArray(c.operators)
      ? c.operators.filter(isObj).map((o: Obj) => ({ address: String(o.address), perms: Number(o.perms ?? o.permissions ?? 0) }))
      : isObj(c.operators) ? Object.entries(c.operators).map(([address, perms]) => ({ address, perms: Number(perms) })) : [];
    return {
      network: String(c.network ?? c.id),
      balances: (Array.isArray(c.balances) ? c.balances : []).filter(isObj).map((b: Obj) => ({
        token: String(b.token ?? b.address ?? ""),
        symbol: String(b.symbol ?? b.tokenSymbol ?? ""),
        decimals: Number(b.decimals ?? 6),
        freeUnits: str(b.freeUnits ?? b.amount) ?? "0",
        lockedUnits: str(b.lockedUnits ?? b.locked) ?? "0",
      })),
      // The server answers `"0"` for a seller that never authorised the matcher.
      matcher: m && cap !== "0" ? { maxPerOrderUnits: cap, autoSettle: m.autoSettle === true } : null,
      operators: ops.filter((o) => o.perms > 0),
    };
  });
}

export function normalizeAccount(raw: unknown): P2pAccount {
  const a = isObj(raw) ? raw : {};
  const merchant = isObj(a.merchant)
    ? a.merchant as P2pAccount["merchant"]
    : a.displayName
      ? {
        displayName: String(a.displayName),
        status: (a.merchantStatus === "PAUSED" || a.merchantStatus === "SUSPENDED" ? a.merchantStatus : "ACTIVE") as "ACTIVE" | "PAUSED" | "SUSPENDED",
        stats: {
          completed: Number(a.stats?.completedOrders ?? a.stats?.completed ?? 0),
          cancelled: Number(a.stats?.cancelledOrders ?? a.stats?.cancelled ?? 0),
          disputesLost: Number(a.stats?.disputesLost ?? 0),
          medianReleaseSeconds: a.stats?.medianReleaseSeconds ?? null,
          lastActiveAt: iso(a.lastActiveAt ?? a.stats?.lastActiveAt),
        },
      }
      : null;
  const chains = normalizeChains(a);
  return {
    id: String(a.id),
    address: String(a.address),
    label: str(a.label),
    verifiedAt: iso(a.verifiedAt) ?? iso(a.createdAt) ?? "",
    createdAt: iso(a.createdAt) ?? "",
    merchant,
    ...(chains ? { chains } : {}),
  };
}

/* --- Payment methods, offers --- */

export function normalizeMethod(raw: unknown): P2pPaymentMethod {
  const m = isObj(raw) ? raw : {};
  const details = isObj(m.details) ? Object.fromEntries(Object.entries(m.details).map(([k, v]) => [k, String(v)])) : {};
  return {
    id: String(m.id), accountId: String(m.accountId), currency: String(m.currency), rail: String(m.rail),
    label: str(m.label), holderName: String(m.holderName ?? ""), document: str(m.document),
    details, active: m.active !== false, createdAt: iso(m.createdAt) ?? "",
    ...(m.summary ? { summary: String(m.summary) } : {}),
  } as P2pPaymentMethod;
}

export function normalizeOffer(raw: unknown): P2pOffer {
  const o = isObj(raw) ? raw : {};
  return {
    id: String(o.id), accountId: String(o.accountId), side: o.side === "BUY_TOKEN" ? "BUY_TOKEN" : "SELL_TOKEN",
    network: String(o.network), token: String(o.tokenSymbol ?? o.token), currency: String(o.currency),
    rails: Array.isArray(o.rails) ? o.rails.map(String) : [],
    price: String(o.price), priceUpdatedAt: iso(o.priceUpdatedAt) ?? iso(o.updatedAt) ?? "", priceTtlSeconds: Number(o.priceTtlSeconds ?? 600),
    minFiat: String(o.minFiat), maxFiat: String(o.maxFiat), active: o.active !== false, createdAt: iso(o.createdAt) ?? "",
  };
}

/* --- Quotes and orders --- */

function merchantSummary(raw: unknown): P2pMerchantSummary | null {
  if (!isObj(raw)) return null;
  return {
    displayName: String(raw.displayName ?? ""),
    completed: Number(raw.completed ?? raw.completedOrders ?? 0),
    completionRate: raw.completionRate === undefined || raw.completionRate === null ? null : Number(raw.completionRate),
    medianReleaseSeconds: raw.medianReleaseSeconds === undefined || raw.medianReleaseSeconds === null ? null : Number(raw.medianReleaseSeconds),
    ...(raw.disputesLost !== undefined ? { disputesLost: Number(raw.disputesLost) } : {}),
  };
}

/** A quote: amounts in the token's decimals (`decimals` when the answer does not say). */
export function normalizeQuote(raw: unknown, decimals: number | null = null): P2pQuote {
  const q = isObj(raw) ? raw : {};
  const d = q.tokenDecimals !== undefined ? Number(q.tokenDecimals) : decimals;
  return {
    id: String(q.id), side: q.side === "SELL" ? "SELL" : "BUY", network: String(q.network), token: String(q.tokenSymbol ?? q.token),
    currency: String(q.currency), rail: String(q.rail), price: String(q.price), fiatAmount: String(q.fiatAmount),
    tokenAmount: amount(q.tokenAmount, d), protocolFee: amount(q.protocolFee, d), integratorFee: amount(q.integratorFee, d), netAmount: amount(q.netAmount, d),
    merchant: merchantSummary(q.merchant) ?? { displayName: "", completed: 0, completionRate: null, medianReleaseSeconds: null },
    expiresAt: iso(q.expiresAt) ?? "",
  };
}

function bankAccount(raw: unknown): P2pBankAccount | null {
  if (!isObj(raw)) return null;
  return {
    rail: String(raw.rail ?? ""), holderName: String(raw.holderName ?? ""), document: str(raw.document),
    details: isObj(raw.details) ? Object.fromEntries(Object.entries(raw.details).map(([k, v]) => [k, String(v)])) : {},
  };
}

function transaction(raw: unknown, action?: string): P2pTransaction | null {
  if (!isObj(raw) || typeof raw.to !== "string" || typeof raw.data !== "string") return null;
  return { chainId: Number(raw.chainId), to: raw.to, data: raw.data, value: str(raw.value) ?? "0", description: str(raw.description) ?? undefined, action: str(raw.action) ?? action };
}

/** An order, from either list (the client's or the merchant's) or its detail. On the merchant's
    view the account to pay is the beneficiary's (a sale or payout) and the order's `role` says so. */
export function normalizeOrder(raw: unknown, decimals: number | null = null): P2pOrder {
  const o = isObj(raw) ? raw : {};
  const d = o.tokenDecimals !== undefined ? Number(o.tokenDecimals) : decimals;
  const merchantView = o.merchantSide !== undefined || o.merchantAccountId !== undefined;
  const dl = isObj(o.deadlines) ? o.deadlines : {};
  const bond = amount(o.bond, d);
  const txs = isObj(o.txs) ? o.txs : isObj(o.txHashes) ? o.txHashes : {};
  const txList = Array.isArray(o.transactions) ? o.transactions : [];
  // A sale's two steps come in order: the approval, then the opening deposit.
  const steps = txList.map((t: unknown, i: number) => transaction(t, i === 0 ? "approve" : "openWithDeposit")).filter((t): t is P2pTransaction => !!t);
  return {
    id: String(o.id), ref: str(o.ref) ?? undefined,
    kind: (["BUY", "SELL", "CHARGE", "PAYOUT"].includes(o.kind) ? o.kind : "BUY") as P2pOrder["kind"],
    status: String(o.status) as P2pOrder["status"],
    network: String(o.network), token: String(o.tokenSymbol ?? o.token),
    tokenAmount: amount(o.tokenAmount, d), fiatAmount: String(o.fiatAmount), currency: String(o.currency), rail: String(o.rail), price: String(o.price),
    feeBps: Number(o.feeBps ?? o.protocolFeeBps ?? 0), integratorFeeBps: Number(o.integratorFeeBps ?? 0),
    buyer: str(o.buyer ?? o.buyerAddress), seller: str(o.seller ?? o.sellerAddress),
    bond: bond === "0" ? null : bond,
    merchant: merchantSummary(o.merchant),
    role: o.role === "merchant" || merchantView ? "merchant" : "client",
    deadlines: {
      acceptBy: iso(dl.acceptBy ?? o.acceptDeadline),
      payBy: iso(dl.payBy ?? o.paymentDeadline),
      settleBy: iso(dl.settleBy ?? o.settleDeadline),
    },
    paymentDetails: bankAccount(merchantView && o.beneficiary ? o.beneficiary : o.paymentDetails),
    payer: isObj(o.payer) ? { name: String(o.payer.name ?? ""), document: String(o.payer.document ?? "") } : null,
    paidReference: str(o.paidReference), onchainId: str(o.onchainId),
    txs: Object.fromEntries(Object.entries(txs).filter(([, h]) => typeof h === "string" && h)) as P2pOrder["txs"],
    transactions: steps.length ? steps : undefined,
    chargeId: str(o.chargeId), payoutBatchId: str(o.payoutBatchId), externalReference: str(o.externalReference),
    createdAt: iso(o.createdAt) ?? "", updatedAt: iso(o.updatedAt) ?? undefined,
  };
}

export function normalizeTransferMatches(raw: unknown): P2pTransferMatch[] {
  const list = isObj(raw) ? (Array.isArray(raw.data) ? raw.data : Array.isArray(raw.matches) ? raw.matches : []) : Array.isArray(raw) ? raw : [];
  return list.filter(isObj).map((m: Obj) => ({ order: normalizeOrder(m.order), score: Number(m.score ?? 0), transaction: transaction(m.transaction, "release")!, matchedOn: Array.isArray(m.matchedOn) ? m.matchedOn.map(String) : [] })).filter((m) => m.transaction) as P2pTransferMatch[];
}

/** How sure a match is, 0 to 1: the server scores 1 (the amount) to 3 (and the name and document). */
export const matchConfidence = (score: number) => Math.min(1, Math.max(0, score / 3));

/* --- Charges and payouts --- */

export function normalizeCharge(raw: unknown): P2pCharge {
  const c = isObj(raw) ? raw : {};
  return {
    id: String(c.id), currency: String(c.currency), fiatAmount: String(c.fiatAmount), network: String(c.network),
    token: String(c.tokenSymbol ?? c.token), recipient: String(c.recipientAddress ?? c.recipient ?? ""),
    description: str(c.description), status: (["open", "paid", "expired", "cancelled"].includes(c.status) ? c.status : "open"),
    url: String(c.url ?? ""), qr: str(c.qr), multiUse: c.multiUse === true, expiresAt: iso(c.expiresAt),
    paidAt: iso(c.paidAt), orders: Number(c.orders ?? c.paidCount ?? 0), createdAt: iso(c.createdAt) ?? "",
  };
}

export function normalizePayoutBatch(raw: unknown, decimals: number | null = null): P2pPayoutBatch {
  const b = isObj(raw) ? raw : {};
  let items: P2pPayoutItem[];
  if (Array.isArray(b.items)) items = b.items as P2pPayoutItem[];
  else {
    const opened = (Array.isArray(b.orders) ? b.orders : []).filter(isObj).map((o: Obj, i: number) => {
      const order = normalizeOrder(o, decimals);
      return {
        index: Number(o.index ?? i), orderId: order.id, status: order.status, currency: order.currency, fiatAmount: order.fiatAmount, rail: order.rail,
        beneficiaryName: String((isObj(o.beneficiary) && o.beneficiary.holderName) || order.paymentDetails?.holderName || "-"),
        externalReference: order.externalReference ?? null, error: null,
      } as P2pPayoutItem;
    });
    const failed = (Array.isArray(b.failedItems) ? b.failedItems : []).filter(isObj).map((f: Obj) => ({
      index: Number(f.index), orderId: null, status: "rejected" as const, currency: String(f.currency ?? ""), fiatAmount: String(f.fiatAmount ?? ""),
      rail: String(f.rail ?? ""), beneficiaryName: String(f.holderName ?? "-"), externalReference: str(f.externalReference), error: str(f.reason ?? f.error),
    }));
    items = [...opened, ...failed].sort((x, y) => x.index - y.index);
  }
  const status = b.status === "partially_completed" ? "partial" : (["processing", "completed", "partial", "failed"].includes(b.status) ? b.status : "processing");
  return {
    id: String(b.id), network: String(b.network), token: String(b.tokenSymbol ?? b.token), accountId: String(b.accountId ?? ""),
    status, items, itemCount: Number(b.itemCount ?? items.length), createdAt: iso(b.createdAt) ?? "",
  } as P2pPayoutBatch;
}

/* --- Requests: the bodies the server's DTOs take --- */

/** The transaction builder's arguments: token amounts in base units, a bot's permissions by name
    of the server's field. */
export function txArgs(action: string, args: Record<string, unknown>, decimals: number): Record<string, unknown> {
  const out: Record<string, unknown> = { ...args };
  if ((action === "approve" || action === "deposit" || action === "withdraw") && typeof args.amount === "string") {
    out.amount = toBaseUnits(args.amount, decimals) ?? args.amount;
  }
  if (action === "setMatcher" && typeof args.maxPerOrder === "string") out.maxPerOrder = toBaseUnits(args.maxPerOrder, decimals) ?? args.maxPerOrder;
  if (action === "setOperator" && "perms" in args) {
    out.permissions = args.perms;
    delete out.perms;
  }
  if (action !== "markPaid") delete out.reference;
  return out;
}
