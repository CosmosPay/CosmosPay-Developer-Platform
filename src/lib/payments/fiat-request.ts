/* fiat-request.ts holds the payer page's model of a charge in local money ("charge with QR"):
   what `GET /v1/payment-links/fiat/{id}` answers (the community server's PublicPaymentRequest),
   the session `POST /v1/payment-links/fiat/{id}/sessions` opens, the bank transfer
   `POST /v1/payment-links/fiat/{id}/transfers` starts, and every decision the page makes from
   them. Pure, so tests/unit/fiatRequest.test.ts covers it under plain node; the browser
   script (src/scripts/payments/fiat-request.ts) only wires it to the DOM.

   A seller shows a QR for an amount in local money; the buyer opens this page, picks a payment
   method and completes the payment in the P2P marketplace's hosted window, which delivers the
   crypto straight to the seller's own wallet. The page never learns or shows the seller's address:
   the server builds the window's URL with it. It is the trust boundary for both answers, as
   parsePaymentLink is for payment links: every field is checked, the window's URL must be https on
   one of the marketplace's own hosts, and a body that does not match the contract is refused whole.
   The marketplace is never named in copy (the hostnames below are code, not copy).

   Two ways to pay, the request's `methods`: `transfer` (the payer types their CUIT/CUIL or DNI and
   gets an alias and a CVU to send the exact amount to from an account in their own name; the
   server detects the deposit, the request reads `processing` while the token is on its way and
   `paid` once delivered) and `p2p` (the marketplace's window above). The bank-transfer provider is
   never named, in copy or here. */
import { knownRampChainName, methodName } from "@/lib/ramp-format";

/* `processing`: the money arrived by bank transfer and the token is on its way to the seller. Never
   expired (the deadline no longer applies once the money is in) and not cancellable. */
export type FiatRequestStatus = "open" | "processing" | "paid" | "expired" | "cancelled";
export const FIAT_REQUEST_STATUSES: readonly FiatRequestStatus[] = ["open", "processing", "paid", "expired", "cancelled"];

/** How a request can be paid, in the server's order of preference: a bank transfer to an alias
    and a CVU (`transfer`), or a local method in the P2P marketplace's window (`p2p`). */
export type FiatMethod = "transfer" | "p2p";
export const FIAT_METHODS: readonly FiatMethod[] = ["transfer", "p2p"];

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
  /** The ways it can be paid, preferred first; `["p2p"]` from a server that predates the transfer. */
  methods: FiatMethod[];
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

/* At most this many entries in `methods`: the server sends one or two today. */
const RAILS_MAX = 8;

/**
 * The request's `methods`: the known ones in the server's order, once each. A name this page does
 * not know (a rail added on the server later) is skipped, so the payer still gets the ones it can
 * offer. Absent: a server from before the bank transfer, where every request was paid in the
 * marketplace's window. Anything else is not the contract (null).
 */
function parseRails(v: unknown): FiatMethod[] | null {
  if (v === undefined) return ["p2p"];
  if (!Array.isArray(v) || v.length > RAILS_MAX || !v.every(str)) return null;
  return FIAT_METHODS.filter((m) => v.includes(m)).sort((a, b) => v.indexOf(a) - v.indexOf(b));
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
  const methods = parseRails(b.methods);
  if (!methods) return null;
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
    methods,
    expiresAt: b.expiresAt,
    createdAt: b.createdAt,
    paidAt: b.paidAt,
  };
}

/**
 * What the page shows. The stored status, with one correction: an open request past `expiresAt`
 * reads as expired before the next read says so (the server answers it expired too). A processing
 * one is never expired: the money is in.
 */
export type FiatPhase = "open" | "processing" | "paid" | "expired" | "cancelled";

export function fiatPhaseOf(req: Pick<FiatRequest, "status" | "expiresAt">, now: number = Date.now()): FiatPhase {
  if (req.status !== "open") return req.status;
  const ends = Date.parse(req.expiresAt);
  return Number.isFinite(ends) && ends <= now ? "expired" : "open";
}

/* How long to wait before reading the request again. Expired and cancelled are not final on the
   server (a payment the marketplace completes later still marks the request paid: the money
   arrived), so they keep being read, slowly. Paid is final: polling stops. A payer who opened the
   window waits at the open cadence whatever the deadline says, and so does one whose transfer
   arrived (processing) until the token is delivered. The server budgets this read per address;
   5 s is 12 a minute. */
const POLL_MS: Record<FiatPhase, number | null> = { open: 5_000, processing: 5_000, expired: 30_000, cancelled: 30_000, paid: null };
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

/* ---- paying by bank transfer ---- */

/**
 * Why the document a payer typed cannot identify their transfer, or null when it can: their CUIT or
 * CUIL (11 digits whose last one is the check digit of the other ten) or their DNI (7 or 8 digits).
 * Dashes, dots and spaces are how people write them and do not count. The server checks it again.
 */
export type DocumentProblem = "empty" | "shape" | "check";

const DOCUMENT_SEPARATORS = /[\s.-]/g;
const CUIT_WEIGHTS = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];

/** The CUIT/CUIL check digit (modulo 11 over the first ten digits) is right. */
export function cuitCheckOk(digits: string): boolean {
  if (!/^\d{11}$/.test(digits)) return false;
  const sum = CUIT_WEIGHTS.reduce((acc, w, i) => acc + w * Number(digits[i]), 0);
  const check = 11 - (sum % 11);
  const expected = check === 11 ? 0 : check;
  // A remainder of 1 leaves no valid digit: no CUIT is issued with it.
  return expected !== 10 && expected === Number(digits[10]);
}

export function documentProblem(input: string): DocumentProblem | null {
  const raw = input.trim();
  if (!raw) return "empty";
  const digits = raw.replace(DOCUMENT_SEPARATORS, "");
  if (!/^\d+$/.test(digits)) return "shape";
  if (digits.length === 11) return cuitCheckOk(digits) ? null : "check";
  return digits.length === 7 || digits.length === 8 ? null : "shape";
}

/** The document as sent: its digits only, or null when it is not one (documentProblem). */
export function normalizeDocument(input: string): string | null {
  return documentProblem(input) === null ? input.trim().replace(DOCUMENT_SEPARATORS, "") : null;
}

/** Where a transfer stands. `expired` is read from `expiresAt`: the server never stores it. */
export type BankTransferStatus = "awaiting_deposit" | "converting" | "completed" | "failed" | "expired";
const TRANSFER_STATUSES: readonly BankTransferStatus[] = ["awaiting_deposit", "converting", "completed", "failed", "expired"];

/** The deposit instructions `POST /v1/payment-links/fiat/{id}/transfers` answers. Never carries
    the payer's document, only its last digits to show it back. */
export interface BankTransfer {
  id: string;
  status: BankTransferStatus;
  /** ISO 4217, ARS today. */
  currency: string;
  /** The exact amount to transfer, in local money. It can differ from the charge's amount by a
      few cents (the server tells two transfers of the same payer apart by them): the page always
      shows and copies this one, never the charge's. */
  amount: string;
  alias: string;
  /** 22 digits. */
  cvu: string;
  /** The account holder's name, when the server names it. */
  holder: string | null;
  /** The bank or wallet that holds the account, when the server names it. */
  bank: string | null;
  /** The last digits of the document the transfer is for ("786"); null when not sent. */
  documentHint: string | null;
  expiresAt: string;
}

const TRANSFER_ID = /^[A-Za-z0-9_-]{1,64}$/;
/* An alias, as Argentine banks take it: 6 to 20 letters, digits, dots and hyphens. */
const ALIAS = /^[A-Za-z0-9.-]{6,20}$/;
const NAME_MAX = 80;

/**
 * A CBU or CVU: 22 digits in two blocks (8 and 14), each ending in the check digit of the digits
 * before it (weights 3, 1, 7, 9 repeating from the last of them). A payer copies it into their bank,
 * so a mistyped one from a misconfigured server is refused here instead of shown.
 */
export function cvuOk(cvu: string): boolean {
  if (!/^\d{22}$/.test(cvu)) return false;
  const blockOk = (block: string) => {
    const body = block.slice(0, -1);
    const weights = [3, 1, 7, 9];
    let sum = 0;
    for (let i = 0; i < body.length; i++) sum += Number(body[body.length - 1 - i]) * weights[i % 4];
    return (10 - (sum % 10)) % 10 === Number(block[block.length - 1]);
  };
  return blockOk(cvu.slice(0, 8)) && blockOk(cvu.slice(8));
}

/* The last digits of `documentHint` ("…786", "***786" or "786"); null when there is none, undefined
   when it is not a hint. */
function hintDigits(v: unknown): string | null | undefined {
  if (v === null || v === undefined) return null;
  if (!str(v) || v.length > 16) return undefined;
  const m = /^[^\d]{0,4}(\d{2,4})$/.exec(v.trim());
  return m ? m[1] : undefined;
}

/** Validate the server's BankTransfer; null when any field does not match the contract. */
export function parseBankTransfer(body: unknown): BankTransfer | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const b = body as Record<string, unknown>;
  if (!str(b.id) || !TRANSFER_ID.test(b.id)) return null;
  if (!TRANSFER_STATUSES.includes(b.status as BankTransferStatus)) return null;
  if (!str(b.currency) || !CURRENCY.test(b.currency)) return null;
  if (!str(b.amount) || !FIAT_AMOUNT.test(b.amount) || !(Number(b.amount) > 0)) return null;
  if (!str(b.alias) || !ALIAS.test(b.alias)) return null;
  if (!str(b.cvu) || !cvuOk(b.cvu)) return null;
  if (b.holder !== null && b.holder !== undefined && (!str(b.holder) || !oneLine(b.holder, NAME_MAX))) return null;
  if (b.bank !== null && b.bank !== undefined && (!str(b.bank) || !oneLine(b.bank, NAME_MAX))) return null;
  const documentHint = hintDigits(b.documentHint);
  if (documentHint === undefined) return null;
  if (!readableDate(b.expiresAt)) return null;
  return {
    id: b.id,
    status: b.status as BankTransferStatus,
    currency: b.currency,
    amount: b.amount,
    alias: b.alias,
    cvu: b.cvu,
    holder: str(b.holder) ? b.holder.trim() : null,
    bank: str(b.bank) ? b.bank.trim() : null,
    documentHint,
    expiresAt: b.expiresAt,
  };
}

/** The transfer's status as the page reads it: still awaiting a deposit past `expiresAt` is expired. */
export function transferPhaseOf(transfer: Pick<BankTransfer, "status" | "expiresAt">, now: number = Date.now()): BankTransferStatus {
  if (transfer.status !== "awaiting_deposit") return transfer.status;
  const ends = Date.parse(transfer.expiresAt);
  return Number.isFinite(ends) && ends <= now ? "expired" : "awaiting_deposit";
}

export type BankTransferResult =
  | { kind: "ok"; transfer: BankTransfer }
  /** 400 `invalid_document` (or `validation_failed`): not a CUIT/CUIL or DNI the server accepts. */
  | { kind: "invalid-document" }
  /** 400 `method_unavailable`: this charge cannot be paid by bank transfer (any more). */
  | { kind: "method-unavailable" }
  /** 409 `request_closed` (or 404): processing, paid, expired or cancelled since the last read. */
  | { kind: "closed" }
  /** 503 `transfer_unavailable`: bank transfers are down or not set up right now. */
  | { kind: "unavailable" }
  | { kind: "rate-limited"; retryAfterMs: number }
  | { kind: "error" };

async function errorCode(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as Record<string, unknown> | null;
    return str(body?.code) ? body.code : "";
  } catch {
    return "";
  }
}

/**
 * Asks for this charge's deposit instructions for the payer's document (keyless, like the read).
 * The same document answers the same transfer (200), a new one creates it (201): both are the
 * instructions. Never throws.
 */
export async function startBankTransfer(
  apiBase: string,
  id: string,
  document: string,
  fetchImpl: typeof fetch = fetch,
): Promise<BankTransferResult> {
  try {
    const res = await fetchImpl(`${base(apiBase, id)}/transfers`, {
      method: "POST",
      headers: { accept: "application/json", "content-type": "application/json" },
      body: JSON.stringify({ document }),
      cache: "no-store",
    });
    if (res.status === 429) return { kind: "rate-limited", retryAfterMs: retryAfter(res) };
    if (!res.ok) {
      const code = await errorCode(res);
      // The body is the document alone: a `validation_failed` is the document's shape too.
      if (code === "invalid_document" || code === "validation_failed") return { kind: "invalid-document" };
      if (code === "method_unavailable") return { kind: "method-unavailable" };
      if (code === "transfer_unavailable") return { kind: "unavailable" };
      if (code === "request_closed" || res.status === 409 || res.status === 404) return { kind: "closed" };
      if (res.status === 503) return { kind: "unavailable" };
      return { kind: "error" };
    }
    const transfer = parseBankTransfer(await res.json());
    return transfer ? { kind: "ok", transfer } : { kind: "error" };
  } catch {
    return { kind: "error" };
  }
}

/* A transfer is shown again after a reload while its money may still arrive: the server still
   matches a deposit for a day after the instructions expire. */
const STORED_TRANSFER_GRACE_MS = 24 * 60 * 60_000;

/** The transfer this tab kept (sessionStorage, per charge), checked as the server's answer is. */
export function readStoredTransfer(raw: string | null, now: number = Date.now()): BankTransfer | null {
  if (!raw) return null;
  try {
    const transfer = parseBankTransfer(JSON.parse(raw));
    if (!transfer || Date.parse(transfer.expiresAt) + STORED_TRANSFER_GRACE_MS <= now) return null;
    return transfer;
  } catch {
    return null;
  }
}

/**
 * The amount as a bank's transfer form takes it: no grouping, a decimal comma, two decimals when
 * there are cents ("15000", "15000,50"). The rail is Argentine, and Argentine banks write it so.
 */
export function transferAmountToCopy(amount: string): string {
  const [whole, cents] = amount.split(".");
  return cents === undefined ? whole : `${whole},${cents.padEnd(2, "0")}`;
}

/** The amount carries cents other than zero ("15000.37"): the payer must send them too, or the
    deposit is not matched to this transfer. */
export function transferHasCents(amount: string): boolean {
  const cents = amount.split(".")[1] ?? "";
  return /[1-9]/.test(cents);
}

/** A CVU in groups of four digits to read it ("0000 0031 …"); the copy button copies it whole. */
export function groupCvu(cvu: string): string {
  return cvu.replace(/(\d{4})(?=\d)/g, "$1 ");
}

/** "in 58 minutes", "in 2 hours", in the page's language; null once past. */
export function expiresIn(expiresAt: string, lang: string, now: number = Date.now()): string | null {
  const ms = Date.parse(expiresAt) - now;
  if (!Number.isFinite(ms) || ms <= 0) return null;
  const minutes = Math.max(1, Math.ceil(ms / 60_000));
  try {
    const rtf = new Intl.RelativeTimeFormat(lang, { numeric: "always" });
    return minutes < 90 ? rtf.format(minutes, "minute") : rtf.format(Math.round(minutes / 60), "hour");
  } catch {
    return null;
  }
}
