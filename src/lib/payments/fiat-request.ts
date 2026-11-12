/* fiat-request.ts holds the payer page's model of a charge in local money ("charge with QR"):
   what `GET /v1/payment-links/fiat/{id}` answers (the community server's PublicPaymentRequest),
   the session `POST /v1/payment-links/fiat/{id}/sessions` opens, and every decision the page makes
   from them. Pure, so tests/unit/fiatRequest.test.ts covers it under plain node; the browser
   script (src/scripts/payments/fiat-request.ts) only wires it to the DOM.

   A seller shows a QR for an amount in local money; the buyer opens this page, picks a payment
   method and completes the payment in the P2P marketplace's hosted window, which delivers the
   crypto straight to the seller's own wallet. The page never learns or shows the seller's address:
   the server builds the window's URL with it. It is the trust boundary for both answers, as
   parsePaymentLink is for payment links: every field is checked, the window's URL must be https on
   one of the marketplace's own hosts, and a body that does not match the contract is refused whole.
   The marketplace is never named in copy (the hostnames below are code, not copy). */
import { knownRampChainName, methodName } from "@/lib/ramp-format";

export type FiatRequestStatus = "open" | "paid" | "expired" | "cancelled";
export const FIAT_REQUEST_STATUSES: readonly FiatRequestStatus[] = ["open", "paid", "expired", "cancelled"];

export interface FiatPaymentMethod {
  /** The market's id, sent back when the payer opens a session ("bank_tx_ar"). */
  id: string;
  /** The market's name for it, as it lists it ("CVU/CBU o Alias (ARS)"). */
  name: string;
}

export interface FiatRequest {
  id: string;
  network: "public" | "testnet";
  status: FiatRequestStatus;
  /** ISO 4217 code of the local money ("ARS"). */
  currency: string;
  /** Decimal in local money, at most two places ("15000"). */
  amount: string;
  /** The seller's note, one line; null when there is none. */
  description: string | null;
  /** EIP-155 id of the network the seller receives on. */
  chainId: number;
  /** The token the seller receives ("USDT0"). */
  token: string;
  tokenAddress: string;
  /** What the seller receives, estimated from the live market; null while it cannot be read. */
  estimatedAmountOut: string | null;
  /** The market's buy methods for the currency; empty while the market cannot be read. */
  paymentMethods: FiatPaymentMethod[];
  expiresAt: string;
  createdAt: string;
  paidAt: string | null;
}

/* Prisma `cuid()` (v1), like a payment link's id. Checked before any request, so a junk path is a
   404 here instead of a call that spends the payer's rate-limit budget. */
const FIAT_REQUEST_ID = /^c[a-z0-9]{20,31}$/;

export function isFiatRequestId(id: string | undefined | null): id is string {
  return typeof id === "string" && FIAT_REQUEST_ID.test(id);
}

/* Local money: a positive decimal with at most two places, as the server validates it. */
const FIAT_AMOUNT = /^(0|[1-9]\d{0,14})(\.\d{1,2})?$/;
const TOKEN_AMOUNT = /^(0|[1-9]\d{0,17})(\.\d{1,18})?$/;
const CURRENCY = /^[A-Z]{3}$/;
const EVM_ADDRESS = /^0x[0-9a-fA-F]{40}$/;
const METHOD_ID = /^[A-Za-z0-9_.:-]{1,64}$/;
/* Anything a one-line text cannot hold: control characters (line breaks included) and the
   bidirectional overrides that could make a description read as something else. */
const NOT_ONE_LINE = /[\u0000-\u001f\u007f-\u009f‪-‮⁦-⁩]/;
const DESCRIPTION_MAX = 140;
const TOKEN_MAX = 32;
const METHOD_NAME_MAX = 80;
/* The market lists a handful per currency; more than this is not an answer to trust. */
const METHODS_MAX = 50;
const REFERENCE = /^cp-[A-Za-z0-9-]{1,64}$/;

/**
 * The marketplace's hosted window, production and sandbox. The only hosts a widget URL may name:
 * the page navigates the payer there, so a URL anywhere else (a lookalike, an http one, a
 * `javascript:` one) is refused before it can become a navigation or an href.
 */
export const WIDGET_HOSTS: readonly string[] = ["widget.eldorado.io", "widget-testnet.eldorado.io"];

const str = (v: unknown): v is string => typeof v === "string";
const readableDate = (v: unknown): v is string => str(v) && Number.isFinite(Date.parse(v));
const oneLine = (v: string, max: number) => v.trim() !== "" && v.length <= max && !NOT_ONE_LINE.test(v);

/** `url` when it is an https URL on one of WIDGET_HOSTS (default port, no credentials), else null. */
export function safeWidgetUrl(url: unknown): string | null {
  if (!str(url) || url.length > 4096) return null;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:" || parsed.port !== "" || parsed.username !== "" || parsed.password !== "") return null;
  if (!WIDGET_HOSTS.includes(parsed.hostname)) return null;
  return parsed.href;
}

function parseMethods(v: unknown): FiatPaymentMethod[] | null {
  if (!Array.isArray(v) || v.length > METHODS_MAX) return null;
  const seen = new Set<string>();
  const out: FiatPaymentMethod[] = [];
  for (const item of v) {
    if (!item || typeof item !== "object" || Array.isArray(item)) return null;
    const m = item as Record<string, unknown>;
    if (!str(m.id) || !METHOD_ID.test(m.id) || seen.has(m.id)) return null;
    if (!str(m.name) || !oneLine(m.name, METHOD_NAME_MAX)) return null;
    seen.add(m.id);
    out.push({ id: m.id, name: m.name });
  }
  return out;
}

/**
 * Validate a response body into a FiatRequest. Anything that does not match the contract (an
 * unknown status, an amount the server would never store, a description over one line, a
 * malformed method) makes the whole body invalid: a payment page must not render a half-trusted
 * charge.
 */
export function parseFiatRequest(body: unknown): FiatRequest | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const b = body as Record<string, unknown>;
  if (!str(b.id) || !isFiatRequestId(b.id)) return null;
  if (b.network !== "public" && b.network !== "testnet") return null;
  if (!FIAT_REQUEST_STATUSES.includes(b.status as FiatRequestStatus)) return null;
  if (!str(b.currency) || !CURRENCY.test(b.currency)) return null;
  if (!str(b.amount) || !FIAT_AMOUNT.test(b.amount) || !(Number(b.amount) > 0)) return null;
  if (b.description !== null && (!str(b.description) || !oneLine(b.description, DESCRIPTION_MAX))) return null;
  if (typeof b.chainId !== "number" || !Number.isSafeInteger(b.chainId) || b.chainId <= 0) return null;
  if (!str(b.token) || !oneLine(b.token, TOKEN_MAX)) return null;
  if (!str(b.tokenAddress) || !EVM_ADDRESS.test(b.tokenAddress)) return null;
  if (b.estimatedAmountOut !== null && (!str(b.estimatedAmountOut) || !TOKEN_AMOUNT.test(b.estimatedAmountOut))) return null;
  const paymentMethods = parseMethods(b.paymentMethods);
  if (!paymentMethods) return null;
  // A deadline the page cannot read would break the expiry and the poll timing.
  if (!readableDate(b.expiresAt) || !readableDate(b.createdAt)) return null;
  if (b.paidAt !== null && !readableDate(b.paidAt)) return null;
  return {
    id: b.id,
    network: b.network,
    status: b.status as FiatRequestStatus,
    currency: b.currency,
    amount: b.amount,
    description: b.description === null ? null : b.description.trim(),
    chainId: b.chainId,
    token: b.token.trim(),
    tokenAddress: b.tokenAddress,
    estimatedAmountOut: b.estimatedAmountOut,
    paymentMethods,
    expiresAt: b.expiresAt,
    createdAt: b.createdAt,
    paidAt: b.paidAt,
  };
}

/**
 * What the page shows. The stored status, with one correction: an open request past `expiresAt`
 * reads as expired before the next read says so (the server answers it expired too).
 */
export type FiatPhase = "open" | "paid" | "expired" | "cancelled";

export function fiatPhaseOf(req: Pick<FiatRequest, "status" | "expiresAt">, now: number = Date.now()): FiatPhase {
  if (req.status !== "open") return req.status;
  const ends = Date.parse(req.expiresAt);
  return Number.isFinite(ends) && ends <= now ? "expired" : "open";
}

/* How long to wait before reading the request again. Expired and cancelled are not final on the
   server (a payment the marketplace completes later still marks the request paid: the money
   arrived), so they keep being read, slowly. Paid is final: polling stops. A payer who opened the
   window waits at the open cadence whatever the deadline says. The server budgets this read per
   address; 5 s is 12 a minute. */
const POLL_MS: Record<FiatPhase, number | null> = { open: 5_000, expired: 30_000, cancelled: 30_000, paid: null };
export const WAITING_POLL_MS = 5_000;

export function nextFiatPollDelay(phase: FiatPhase, waiting = false): number | null {
  if (phase === "paid") return null;
  return waiting && phase !== "cancelled" ? WAITING_POLL_MS : POLL_MS[phase];
}

/**
 * The locale a currency's amount is written in: the page's language in the currency's country
 * (es + ARS is es-AR: "$ 15.000"), so the grouping and the symbol's place are the ones its payer
 * reads every day. ISO 4217 codes start with the country's ISO 3166 code, except the
 * supranational ones (XAF, XOF, EUR...), which keep the page's language alone.
 */
function moneyLocale(currency: string, lang: string): string {
  const region = currency.slice(0, 2);
  return currency.startsWith("X") || currency === "EUR" ? lang : `${lang}-${region}`;
}

/** "$ 15.000" (es, ARS), "$15,000" (en, ARS): no decimals for a whole amount, two otherwise. */
export function formatMoney(amount: string, currency: string, lang: string): string {
  const value = Number(amount);
  const decimals = amount.includes(".") ? 2 : 0;
  for (const locale of [moneyLocale(currency, lang), lang]) {
    try {
      return new Intl.NumberFormat(locale, {
        style: "currency",
        currency,
        currencyDisplay: "narrowSymbol",
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }).format(value);
    } catch {
      /* a tag the runtime refuses: the next one */
    }
  }
  return `${amount} ${currency}`;
}

/** A token amount in the page's language ("8,91" in Spanish), every decimal the server sent kept. */
export function formatTokenAmount(amount: string, lang: string): string {
  const decimals = Math.min((amount.split(".")[1] ?? "").length, 18);
  try {
    return new Intl.NumberFormat(lang, { minimumFractionDigits: 0, maximumFractionDigits: decimals }).format(Number(amount));
  } catch {
    return amount;
  }
}

/** The network's name, or null when this page does not know it (the copy words the fallback). */
export function fiatNetworkName(chainId: number): string | null {
  return knownRampChainName(chainId);
}

/** A payment method's name without the currency the market appends ("CVU/CBU o Alias"). */
export function fiatMethodName(method: FiatPaymentMethod, currency: string): string {
  return methodName(method.name, currency) || method.name;
}

/** The method to preselect: the only one there is, or the one the payer already chose. */
export function preselectedMethod(methods: readonly FiatPaymentMethod[], chosen: string | null): string | null {
  if (chosen && methods.some((m) => m.id === chosen)) return chosen;
  return methods.length === 1 ? methods[0].id : null;
}

export type FiatFetchResult =
  | { kind: "ok"; request: FiatRequest }
  | { kind: "not-found" }
  | { kind: "rate-limited"; retryAfterMs: number }
  | { kind: "error" };

const base = (apiBase: string, id: string) => `${apiBase.replace(/\/+$/, "")}/v1/payment-links/fiat/${encodeURIComponent(id)}`;

function retryAfter(res: Response): number {
  const seconds = Number(res.headers.get("retry-after"));
  return Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : 30_000;
}

/** Read one charge from the gateway. Never throws: every outcome is a value the page renders. */
export async function fetchFiatRequest(apiBase: string, id: string, fetchImpl: typeof fetch = fetch): Promise<FiatFetchResult> {
  try {
    const res = await fetchImpl(base(apiBase, id), { headers: { accept: "application/json" }, cache: "no-store" });
    if (res.status === 404) return { kind: "not-found" };
    if (res.status === 429) return { kind: "rate-limited", retryAfterMs: retryAfter(res) };
    if (!res.ok) return { kind: "error" };
    const request = parseFiatRequest(await res.json());
    return request && request.id === id ? { kind: "ok", request } : { kind: "error" };
  } catch {
    return { kind: "error" };
  }
}

export type FiatSessionResult =
  | { kind: "ok"; widgetUrl: string; reference: string }
  /** 409 `request_closed`: paid, expired or cancelled since the page last read it. */
  | { kind: "closed" }
  /** 400: the market does not offer that method for the currency (any more). */
  | { kind: "method" }
  | { kind: "rate-limited"; retryAfterMs: number }
  | { kind: "error" };

/**
 * Opens the marketplace session that pays this charge with `paymentMethod`: keyless like the read.
 * The answer is checked before the page navigates anywhere: the window's URL must be one of
 * WIDGET_HOSTS over https. Never throws.
 */
export async function openFiatSession(
  apiBase: string,
  id: string,
  paymentMethod: string,
  fetchImpl: typeof fetch = fetch,
): Promise<FiatSessionResult> {
  try {
    const res = await fetchImpl(`${base(apiBase, id)}/sessions`, {
      method: "POST",
      headers: { accept: "application/json", "content-type": "application/json" },
      body: JSON.stringify({ paymentMethod }),
      cache: "no-store",
    });
    if (res.status === 409) return { kind: "closed" };
    if (res.status === 400) return { kind: "method" };
    if (res.status === 404) return { kind: "closed" };
    if (res.status === 429) return { kind: "rate-limited", retryAfterMs: retryAfter(res) };
    if (!res.ok) return { kind: "error" };
    const body = (await res.json()) as Record<string, unknown> | null;
    const widgetUrl = safeWidgetUrl(body?.widgetUrl);
    if (!widgetUrl || !str(body?.reference) || !REFERENCE.test(body.reference)) return { kind: "error" };
    return { kind: "ok", widgetUrl, reference: body.reference };
  } catch {
    return { kind: "error" };
  }
}

/** What the page keeps (sessionStorage, this tab only) so a reload goes back to waiting. */
export interface StoredFiatSession {
  widgetUrl: string;
  reference: string;
  method: string;
  openedAt: number;
}

/* A window opened longer ago than this is not waited on after a reload: the payer starts again. */
const STORED_SESSION_MS = 60 * 60_000;

/** The stored session read back, checked as the server's answer is; null when unusable. */
export function readStoredSession(raw: string | null, now: number = Date.now()): StoredFiatSession | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as Record<string, unknown>;
    const widgetUrl = safeWidgetUrl(v.widgetUrl);
    if (!widgetUrl || !str(v.reference) || !REFERENCE.test(v.reference) || !str(v.method) || !METHOD_ID.test(v.method)) return null;
    if (typeof v.openedAt !== "number" || !(now - v.openedAt >= 0 && now - v.openedAt < STORED_SESSION_MS)) return null;
    return { widgetUrl, reference: v.reference, method: v.method, openedAt: v.openedAt };
  } catch {
    return null;
  }
}
