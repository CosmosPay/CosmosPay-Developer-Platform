/* The public P2P app's client (payments.cosmospay.lat/p2p): every call goes to this app's own
   server route on the same origin (/p2p/api/*, src/pages/payments/p2p/api/[...path].ts), which
   binds the visitor to their wallet and holds the integrator key. The browser holds no key: only
   the session cookie, which it cannot read.

   What comes back is checked before the page uses it: the market's contracts, tokens and chain
   ids (a transaction is checked against them before a wallet sends it, tx-check.ts), and an
   order's bank account (the same reader as the hosted charge page). Pure but for fetch
   (tests/unit/p2pAppApi.test.ts). */
import { parseAccount } from "@/lib/p2p/checkout-api";
import { P2P_ORDER_STATUSES, type P2pMarket, type P2pNetwork, type P2pOrder, type P2pQuote, type P2pTransaction } from "@/lib/p2p/types";

export const APP_API = "/p2p/api";

export class AppApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "AppApiError";
    this.status = status;
  }
}

const ADDRESS = /^0x[0-9a-fA-F]{40}$/;
const obj = (v: unknown): Record<string, unknown> | null => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null);
const httpsOrNull = (v: unknown) => (typeof v === "string" && /^https:\/\/[^\s]+$/.test(v) ? v : null);

/** The market, keeping only networks whose contract, chain id and tokens are well formed. */
export function parseMarket(json: unknown): P2pMarket | null {
  const o = obj(json);
  if (!o || !Array.isArray(o.networks) || !Array.isArray(o.currencies)) return null;
  const networks: P2pNetwork[] = [];
  for (const n of o.networks) {
    const x = obj(n);
    if (!x || typeof x.id !== "string" || !/^[a-z0-9-]{1,40}$/.test(x.id) || typeof x.name !== "string" || !Number.isInteger(x.chainId) || (x.chainId as number) <= 0) continue;
    if (typeof x.contract !== "string" || !ADDRESS.test(x.contract) || !Array.isArray(x.tokens)) continue;
    const tokens = x.tokens
      .map(obj)
      .filter((t): t is Record<string, unknown> => !!t && typeof t.symbol === "string" && /^[A-Za-z0-9.]{1,12}$/.test(t.symbol) && typeof t.address === "string" && ADDRESS.test(t.address) && Number.isInteger(t.decimals) && (t.decimals as number) >= 0 && (t.decimals as number) <= 36)
      .map((t) => ({ symbol: t.symbol as string, address: t.address as string, decimals: t.decimals as number }));
    if (!tokens.length) continue;
    networks.push({
      id: x.id, name: x.name.slice(0, 60), chainId: x.chainId as number, contract: x.contract, tokens,
      explorer: httpsOrNull(x.explorer), rpcUrl: httpsOrNull(x.rpcUrl),
      nativeSymbol: typeof x.nativeSymbol === "string" && /^[A-Z0-9]{1,8}$/.test(x.nativeSymbol) ? x.nativeSymbol : null,
    });
  }
  const currencies = o.currencies
    .map(obj)
    .filter((c): c is Record<string, unknown> => !!c && typeof c.code === "string" && /^[A-Z]{3}$/.test(c.code) && Array.isArray(c.rails))
    .map((c) => ({ code: c.code as string, rails: (c.rails as unknown[]).filter((r): r is string => typeof r === "string" && /^[a-z0-9_]{2,40}$/.test(r)) }))
    .filter((c) => c.rails.length > 0);
  const windows = obj(o.windows);
  return {
    tier: o.tier === "testnet" ? "testnet" : "mainnet",
    networks,
    currencies,
    rails: Array.isArray(o.rails) ? (o.rails as P2pMarket["rails"]) : [],
    protocolFeeBps: Number.isInteger(o.protocolFeeBps) ? (o.protocolFeeBps as number) : 0,
    windows: {
      paymentSeconds: Number(windows?.paymentSeconds) || 1800,
      acceptSeconds: Number(windows?.acceptSeconds) || 300,
      settleSeconds: Number(windows?.settleSeconds) || 0,
    },
    sellBondBps: Number.isInteger(o.sellBondBps) ? (o.sellBondBps as number) : 0,
    matcher: typeof o.matcher === "string" && ADDRESS.test(o.matcher) ? o.matcher : "",
  };
}

/** An order, or null when its identity, status or amounts are malformed; a bank account that is
    not well formed is dropped (the page then shows none rather than a doubtful one). */
export function parseOrder(json: unknown): P2pOrder | null {
  const o = obj(json);
  if (!o || typeof o.id !== "string" || !/^[a-z0-9][a-z0-9-]{7,63}$/i.test(o.id)) return null;
  if (!(P2P_ORDER_STATUSES as readonly string[]).includes(String(o.status))) return null;
  if (o.kind !== "BUY" && o.kind !== "SELL" && o.kind !== "CHARGE" && o.kind !== "PAYOUT") return null;
  for (const k of ["network", "token", "tokenAmount", "fiatAmount", "currency", "rail"] as const) if (typeof o[k] !== "string") return null;
  const deadlines = obj(o.deadlines) ?? {};
  const d = (v: unknown) => (typeof v === "string" && Number.isFinite(Date.parse(v)) ? v : null);
  const transactions = Array.isArray(o.transactions) ? (o.transactions as P2pTransaction[]) : undefined;
  return {
    ...(o as unknown as P2pOrder),
    buyer: typeof o.buyer === "string" ? o.buyer : null,
    seller: typeof o.seller === "string" ? o.seller : null,
    deadlines: { acceptBy: d(deadlines.acceptBy), payBy: d(deadlines.payBy), settleBy: d(deadlines.settleBy) },
    paymentDetails: o.paymentDetails ? parseAccount(o.paymentDetails) : null,
    transactions,
    merchant: obj(o.merchant) && typeof obj(o.merchant)!.displayName === "string" ? (o.merchant as P2pOrder["merchant"]) : null,
  };
}

export function parseQuote(json: unknown): P2pQuote | null {
  const o = obj(json);
  if (!o || typeof o.id !== "string" || (o.side !== "BUY" && o.side !== "SELL")) return null;
  for (const k of ["price", "fiatAmount", "tokenAmount", "protocolFee", "netAmount", "expiresAt", "network", "token", "currency", "rail"] as const) if (typeof o[k] !== "string") return null;
  const m = obj(o.merchant);
  if (!m || typeof m.displayName !== "string") return null;
  return { ...(o as unknown as P2pQuote), integratorFee: typeof o.integratorFee === "string" ? o.integratorFee : "0" };
}

type Fetch = typeof fetch;

async function request<T>(path: string, init: RequestInit, parse: (data: unknown) => T | null, f: Fetch): Promise<T> {
  let res: Response;
  try {
    res = await f(`${APP_API}/${path}`, { ...init, credentials: "same-origin", cache: "no-store", headers: { Accept: "application/json", ...(init.body ? { "Content-Type": "application/json" } : {}) } });
  } catch {
    throw new AppApiError("", 0);
  }
  const json = obj(await res.json().catch(() => null));
  if (!res.ok) {
    const message = typeof json?.message === "string" && json.message.length <= 300 ? json.message : "";
    throw new AppApiError(message, res.status);
  }
  const value = parse(json && "data" in json ? json.data : json);
  if (value === null) throw new AppApiError("", 502);
  return value;
}

const post = (body: unknown): RequestInit => ({ method: "POST", body: JSON.stringify(body ?? {}) });
const any = (v: unknown) => (v === undefined ? null : v);

export interface AppSessionInfo { address: string; expiresAt: string }
const parseSession = (v: unknown): AppSessionInfo | null => {
  const o = obj(v);
  return o && typeof o.address === "string" && ADDRESS.test(o.address) && typeof o.expiresAt === "string" ? { address: o.address, expiresAt: o.expiresAt } : null;
};

export function appApi(f: Fetch = (...a) => fetch(...a)) {
  return {
    challenge: (address: string) => request("session/challenge", post({ address }), (v) => { const o = obj(v); return o && typeof o.id === "string" && typeof o.message === "string" ? { id: o.id, message: o.message } : null; }, f),
    signIn: (challengeId: string, signature: string) => request("session", post({ challengeId, signature }), parseSession, f),
    session: () => request("session", { method: "GET" }, parseSession, f),
    signOut: () => request("session", { method: "DELETE" }, any, f),
    market: () => request("market", { method: "GET" }, parseMarket, f),
    quote: (body: Record<string, unknown>) => request("quotes", post(body), parseQuote, f),
    createOrder: (body: Record<string, unknown>) => request("orders", post(body), parseOrder, f),
    orders: () => request("orders", { method: "GET" }, (v) => (Array.isArray(v) ? (v.map(parseOrder).filter(Boolean) as P2pOrder[]) : null), f),
    order: (id: string) => request(`orders/${encodeURIComponent(id)}`, { method: "GET" }, parseOrder, f),
    act: (id: string, action: "paid" | "cancel" | "dispute", body: Record<string, unknown> = {}) => request(`orders/${encodeURIComponent(id)}/${action}`, post(body), parseOrder, f),
    transaction: (orderId: string, action: "release" | "cancel" | "dispute") => request("transactions", post({ orderId, action }), (v) => (obj(v) ? (v as P2pTransaction) : null), f),
  };
}
