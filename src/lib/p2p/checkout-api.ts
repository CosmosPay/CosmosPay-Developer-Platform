/* What the hosted charge page (payments.cosmospay.lat/p2p/{chargeId}) reads from the Payments API
   through the gateway's keyless route (`/v1/p2p-checkout/*`, src/lib/apisix-keyless.ts), from the
   payer's browser, never through this server: the community server budgets these calls per
   client address.

     GET  /v1/p2p-checkout/charges/{id}           the charge's public projection
     POST /v1/p2p-checkout/charges/{id}/orders    the payer's order: {payerName, payerDocument,
                                                  payerEmail, rail} -> {order, payerToken}
     GET  /v1/p2p-checkout/orders/{id}            the order, with X-Payer-Token
     POST /v1/p2p-checkout/orders/{id}/paid       "I transferred" {reference?}, with X-Payer-Token

   This is a trust boundary, like parsePaymentLink: the page tells a payer where to send money,
   so every field is checked before it is shown, and a response that fails a check is "error",
   never half-shown. Bank details are plain strings of a bounded length; the page writes them as
   text only. Pure but for fetch, which callers may pass in (tests/unit/p2pCheckoutApi.test.ts). */
import { isRailId } from "@/lib/p2p/rails";
import { P2P_ORDER_STATUSES, type P2pOrderStatus } from "@/lib/p2p/types";

export type ChargeStatus = "open" | "paid" | "expired" | "cancelled";

export interface CheckoutCharge {
  id: string;
  currency: string;
  fiatAmount: string;
  description: string | null;
  merchantName: string | null;
  network: string;
  networkName: string | null;
  token: string;
  status: ChargeStatus;
  expiresAt: string | null;
  multiUse: boolean;
  rails: string[];
  tier: "mainnet" | "testnet";
  /* The payer's open order on this charge, when the API names it (a reload resumes it). */
  openOrderId: string | null;
}

export interface CheckoutAccount {
  rail: string;
  holderName: string;
  document: string | null;
  details: Record<string, string>;
}

export interface CheckoutOrder {
  id: string;
  status: P2pOrderStatus;
  currency: string;
  fiatAmount: string;
  rail: string;
  token: string;
  tokenAmount: string;
  network: string;
  payBy: string | null;
  paymentDetails: CheckoutAccount | null;
  paidReference: string | null;
  merchantName: string | null;
  releaseTx: string | null;
}

export type Result<T> =
  | { kind: "ok"; value: T }
  | { kind: "not-found" }
  | { kind: "error"; message?: string; status?: number; retryAfter?: number };

const ID = /^[a-z0-9][a-z0-9-]{7,63}$/i;
const CURRENCY = /^[A-Z]{3}$/;
const DECIMAL = /^\d{1,18}(\.\d{1,18})?$/;
const SYMBOL = /^[A-Za-z0-9.]{1,12}$/;
const NETWORK = /^[a-z0-9-]{1,40}$/;
const TX = /^0x[0-9a-fA-F]{64}$/;
const TOKEN = /^[A-Za-z0-9_-]{16,256}$/;
const KEY = /^[a-zA-Z]{1,24}$/;

const obj = (v: unknown): Record<string, unknown> | null => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null);
/* The API answers inside its envelope `{ data, code, status, message }`; accept either. */
const unwrap = (json: unknown) => {
  const o = obj(json);
  return o && "data" in o && obj(o.data) ? obj(o.data) : o;
};
const str = (v: unknown, re?: RegExp, max = 200) => (typeof v === "string" && v.length <= max && (!re || re.test(v)) ? v : null);
/* A line of text for the page: no control characters, bounded. */
const line = (v: unknown, max = 120) => (typeof v === "string" && v.trim() && v.length <= max && !/[\u0000-\u001f\u007f]/.test(v) ? v.trim() : null);
const date = (v: unknown) => (typeof v === "string" && Number.isFinite(Date.parse(v)) ? v : null);
const optional = <T>(v: unknown, read: (x: unknown) => T | null): T | null | undefined => (v === null || v === undefined ? null : read(v) ?? undefined);

/** The charge's projection, or null when anything is malformed. */
export function parseCheckoutCharge(json: unknown): CheckoutCharge | null {
  const o = unwrap(json);
  if (!o) return null;
  const status = o.status;
  if (status !== "open" && status !== "paid" && status !== "expired" && status !== "cancelled") return null;
  const rails = Array.isArray(o.rails) ? o.rails.filter((r): r is string => typeof r === "string" && /^[a-z0-9_]{2,40}$/.test(r)) : null;
  const description = optional(o.description, (x) => line(x, 200));
  const merchantName = optional(o.merchantName, (x) => line(x, 80));
  const networkName = optional(o.networkName, (x) => line(x, 60));
  const expiresAt = optional(o.expiresAt, date);
  const openOrderId = optional(o.openOrderId ?? (obj(o.order)?.id), (x) => str(x, ID));
  const c = {
    id: str(o.id, ID),
    currency: str(o.currency, CURRENCY),
    fiatAmount: str(o.fiatAmount, DECIMAL),
    network: str(o.network, NETWORK),
    token: str(o.token, SYMBOL),
  };
  if (Object.values(c).some((v) => v === null) || !rails || !rails.length) return null;
  if ([description, merchantName, networkName, expiresAt, openOrderId].some((v) => v === undefined)) return null;
  return {
    ...(c as { id: string; currency: string; fiatAmount: string; network: string; token: string }),
    description: description ?? null,
    merchantName: merchantName ?? null,
    networkName: networkName ?? null,
    status,
    expiresAt: expiresAt ?? null,
    multiUse: o.multiUse === true,
    rails,
    tier: o.tier === "testnet" ? "testnet" : "mainnet",
    openOrderId: openOrderId ?? null,
  };
}

/** A bank account the payer is told to pay into: a known rail (or a plain id), a holder, and its
    details as short single-line strings under plain keys. */
export function parseAccount(v: unknown): CheckoutAccount | null {
  const o = obj(v);
  if (!o) return null;
  const rail = str(o.rail, /^[a-z0-9_]{2,40}$/);
  const holderName = line(o.holderName, 80);
  const raw = obj(o.details);
  if (!rail || !holderName || !raw) return null;
  const details: Record<string, string> = {};
  for (const [k, value] of Object.entries(raw)) {
    if (!KEY.test(k)) return null;
    const v2 = line(value, 80);
    if (v2 === null) return null;
    details[k] = v2;
  }
  if (!Object.keys(details).length) return null;
  const document = optional(o.document, (x) => line(x, 30));
  if (document === undefined) return null;
  return { rail, holderName, document: document ?? null, details };
}

/** The payer's order, or null when anything is malformed. */
export function parseCheckoutOrder(json: unknown): CheckoutOrder | null {
  const o = unwrap(json);
  if (!o) return null;
  const status = (P2P_ORDER_STATUSES as readonly string[]).includes(String(o.status)) ? (o.status as P2pOrderStatus) : null;
  const deadlines = obj(o.deadlines);
  const payBy = optional(o.payBy ?? deadlines?.payBy, date);
  const pd = o.paymentDetails === null || o.paymentDetails === undefined ? null : parseAccount(o.paymentDetails);
  if (o.paymentDetails != null && !pd) return null;
  const paidReference = optional(o.paidReference, (x) => line(x, 60));
  const merchant = obj(o.merchant);
  const merchantName = optional(o.merchantName ?? merchant?.displayName, (x) => line(x, 80));
  const releaseTx = optional(obj(o.txs)?.release, (x) => str(x, TX));
  const c = {
    id: str(o.id, ID),
    currency: str(o.currency, CURRENCY),
    fiatAmount: str(o.fiatAmount, DECIMAL),
    rail: str(o.rail, /^[a-z0-9_]{2,40}$/),
    token: str(o.token, SYMBOL),
    tokenAmount: str(o.tokenAmount, DECIMAL),
    network: str(o.network, NETWORK),
  };
  if (!status || Object.values(c).some((v) => v === null)) return null;
  if ([payBy, paidReference, merchantName, releaseTx].some((v) => v === undefined)) return null;
  return {
    ...(c as Omit<CheckoutOrder, "status" | "payBy" | "paymentDetails" | "paidReference" | "merchantName" | "releaseTx">),
    status,
    payBy: payBy ?? null,
    paymentDetails: pd,
    paidReference: paidReference ?? null,
    merchantName: merchantName ?? null,
    releaseTx: releaseTx ?? null,
  };
}

/** The answer to opening the payer's order: the order and the token that reads it again. */
export function parseCreatedOrder(json: unknown): { order: CheckoutOrder; payerToken: string } | null {
  const o = unwrap(json);
  const order = parseCheckoutOrder(o?.order);
  const payerToken = str(o?.payerToken, TOKEN);
  return order && payerToken ? { order, payerToken } : null;
}

type Fetch = typeof fetch;

async function call<T>(f: Fetch, url: string, init: RequestInit, parse: (json: unknown) => T | null): Promise<Result<T>> {
  let res: Response;
  try {
    res = await f(url, { ...init, cache: "no-store", credentials: "omit", headers: { Accept: "application/json", ...(init.body ? { "Content-Type": "application/json" } : {}), ...(init.headers as Record<string, string> | undefined) } });
  } catch {
    return { kind: "error" };
  }
  const json = await res.json().catch(() => null);
  if (res.status === 404) return { kind: "not-found" };
  if (!res.ok) {
    const retry = Number(res.headers.get("retry-after"));
    // The server's words, which name no provider; only a short single line is shown.
    const message = line(obj(json)?.message, 200) ?? undefined;
    return { kind: "error", status: res.status, ...(message ? { message } : {}), ...(Number.isFinite(retry) && retry > 0 ? { retryAfter: retry } : {}) };
  }
  const value = parse(json);
  return value === null ? { kind: "error" } : { kind: "ok", value };
}

const base = (apiBase: string) => `${apiBase.replace(/\/+$/, "")}/v1/p2p-checkout`;
const enc = encodeURIComponent;

export const fetchCharge = (apiBase: string, id: string, f: Fetch = fetch) =>
  call(f, `${base(apiBase)}/charges/${enc(id)}`, { method: "GET" }, parseCheckoutCharge);

export const openChargeOrder = (apiBase: string, id: string, body: { payerName: string; payerDocument: string; payerEmail: string; rail: string }, f: Fetch = fetch) =>
  call(f, `${base(apiBase)}/charges/${enc(id)}/orders`, { method: "POST", body: JSON.stringify(body) }, parseCreatedOrder);

export const fetchChargeOrder = (apiBase: string, orderId: string, payerToken: string, f: Fetch = fetch) =>
  call(f, `${base(apiBase)}/orders/${enc(orderId)}`, { method: "GET", headers: { "X-Payer-Token": payerToken } }, parseCheckoutOrder);

export const reportChargePaid = (apiBase: string, orderId: string, payerToken: string, reference: string, f: Fetch = fetch) =>
  call(f, `${base(apiBase)}/orders/${enc(orderId)}/paid`, { method: "POST", headers: { "X-Payer-Token": payerToken }, body: JSON.stringify(reference.trim() ? { reference: reference.trim().slice(0, 60) } : {}) }, parseCheckoutOrder);

/** Whether a rail is one this page can name (a field label per key); an unknown one still shows
    its details by key. */
export const knownRail = (rail: string) => isRailId(rail);

/* The payer's order on a charge, kept for this tab so a reload resumes it (sessionStorage, keyed
   by charge; the token reads only that order). */
const STORE = (chargeId: string) => `cosmospay-p2p-charge:${chargeId}`;
export function savedOrder(chargeId: string): { orderId: string; payerToken: string } | null {
  try {
    const raw = JSON.parse(sessionStorage.getItem(STORE(chargeId)) ?? "null");
    return raw && ID.test(String(raw.orderId)) && TOKEN.test(String(raw.payerToken)) ? { orderId: raw.orderId, payerToken: raw.payerToken } : null;
  } catch {
    return null;
  }
}
export function saveOrder(chargeId: string, value: { orderId: string; payerToken: string } | null) {
  try {
    if (value) sessionStorage.setItem(STORE(chargeId), JSON.stringify(value));
    else sessionStorage.removeItem(STORE(chargeId));
  } catch {
    /* private mode: the order lives in memory for this page only */
  }
}
