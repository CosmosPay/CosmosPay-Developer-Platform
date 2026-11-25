/* p2p-direct.ts holds the payer page's model of paying a charge in local money "direct": by bank
   transfer to a verified person of the P2P marketplace, inside our own page instead of the
   marketplace's window. Pure, so tests/unit/p2pDirect.test.ts covers it under plain node; the
   browser script (src/scripts/payments/fiat-direct.ts) only wires it to the DOM.

   The flow, when the charge's public read says `p2pDirect: true` (the community server's
   `/v1/payment-links/fiat/{id}/direct/*` routes, keyless like the read):
     email -> 8-character code (the payer's session) -> [city and phone -> 4-digit phone code]
     -> [ID document in the verification's own tab, then review] -> the account they pay from
     -> the order: matching (finding who to transfer to), pay (the verified person's account, the
     exact amount, a deadline), confirming (the payer said they transferred), then completed,
     cancelled or disputed.

   It is the trust boundary for every answer, as fiat-request.ts is for the charge: each body is
   checked field by field and refused whole when it does not match the contract, and the account a
   payer copies into their bank must have its check digits right. The session the server answers is
   opaque (sealed on the server); it is the only thing the page keeps (sessionStorage, per charge),
   with the order's id. Nothing the payer types (email, phone, account, document) is kept or logged.

   Copy never names the marketplace or any identity-check vendor, and never says crypto, a token or
   "buy": the payer pays a seller by bank transfer to a verified person. */
import { cuitCheckOk, cvuOk } from "@/lib/payments/fiat-request";

/* ---- banks and accounts ---- */

/** The banks and wallets an Argentine account can be at, as the server's `bank` enum lists them. */
export const BANK_IDS = [
  "mercado_pago", "galicia", "santander", "macro", "bbva", "nacion", "ciudad", "provincia", "patagonia", "supervielle",
  "credicoop", "comafi", "hsbc", "citibank", "icbc", "itau", "brubank", "wilobank", "uala", "naranja_x", "lemon", "belo",
  "prex", "industrial",
] as const;
export type BankId = (typeof BANK_IDS)[number];

/* Proper names, the same in every language (data, not copy). */
const BANK_NAMES: Record<BankId, string> = {
  mercado_pago: "Mercado Pago",
  galicia: "Banco Galicia",
  santander: "Santander",
  macro: "Banco Macro",
  bbva: "BBVA",
  nacion: "Banco Nación",
  ciudad: "Banco Ciudad",
  provincia: "Banco Provincia",
  patagonia: "Banco Patagonia",
  supervielle: "Banco Supervielle",
  credicoop: "Banco Credicoop",
  comafi: "Banco Comafi",
  hsbc: "HSBC",
  citibank: "Citibank",
  icbc: "ICBC",
  itau: "Itaú",
  brubank: "Brubank",
  wilobank: "Wilobank",
  uala: "Ualá",
  naranja_x: "Naranja X",
  lemon: "Lemon",
  belo: "Belo",
  prex: "Prex",
  industrial: "Banco Industrial (BIND)",
};

export function isBankId(v: unknown): v is BankId {
  return typeof v === "string" && (BANK_IDS as readonly string[]).includes(v);
}

/** The bank's name, or null for an id this page does not know (a bank added on the server later). */
export function bankName(id: string | null | undefined): string | null {
  return isBankId(id) ? BANK_NAMES[id] : null;
}

/** Every bank for the select, by name in the payer's language. */
export function banksByName(lang: string): { id: BankId; name: string }[] {
  const collator = new Intl.Collator(lang, { sensitivity: "base" });
  return BANK_IDS.map((id) => ({ id, name: BANK_NAMES[id] })).sort((a, b) => collator.compare(a.name, b.name));
}

export const ACCOUNT_TYPES = ["savings", "checking"] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];
/** A person's tax id is a CUIL or, when they invoice, a CUIT: the same 11 digits either way. */
export const DOCUMENT_TYPES = ["CUIL", "CUIT"] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

/* ---- what the payer types ---- */

const str = (v: unknown): v is string => typeof v === "string";
const readableDate = (v: unknown): v is string => str(v) && Number.isFinite(Date.parse(v));
/* Control characters (line breaks included) and the bidirectional overrides that could make a
   name read as something else. */
const NOT_ONE_LINE = /[\u0000-\u001f\u007f-\u009f‪-‮⁦-⁩]/;
const oneLine = (v: string, max: number) => v.trim() !== "" && v.length <= max && !NOT_ONE_LINE.test(v);
const EMAIL = /^[^\s@<>()",;:\\[\]]+@[^\s@<>()",;:\\[\]]+\.[^\s@<>()",;:\\[\]]{2,}$/;
const SEPARATORS = /[\s.()-]/g;
const NAME_MAX = 80;

/** The email as sent (trimmed), or null when it cannot be one. */
export function normalizeEmail(input: string): string | null {
  const email = input.trim();
  return email.length <= 254 && EMAIL.test(email) ? email : null;
}

/** The emailed code as sent: its letters and digits (spaces and dashes a payer may paste dropped), at
    least 8 of them; null when it cannot be one. Case is kept: the code is the server's. */
export function normalizeLoginCode(input: string): string | null {
  const code = input.replace(/[\s-]/g, "");
  return /^[A-Za-z0-9]{8,32}$/.test(code) ? code : null;
}

/** The 4 digits a text message brought, or null. */
export function normalizePhoneCode(input: string): string | null {
  const code = input.replace(/\s/g, "");
  return /^\d{4}$/.test(code) ? code : null;
}

/** The city the payer lives in, one line; null when empty or not a line. */
export function normalizeCity(input: string): string | null {
  const city = input.trim().replace(/\s+/g, " ");
  return city.length >= 2 && oneLine(city, NAME_MAX) ? city : null;
}

/**
 * The payer's mobile number as the server takes it: digits with an optional `+`. A local number is
 * the area code and the number, 10 digits without the 0 or the 15 ("387 412 3456"); the server adds
 * +54. A number with its country code ("+54 9 387 412 3456", "54 9 387…") keeps it. Spaces, dots,
 * dashes and parentheses are how people write it and do not count. Null when it cannot be one.
 */
export function normalizePhone(input: string): string | null {
  const raw = input.trim().replace(SEPARATORS, "");
  if (/^\+\d{8,15}$/.test(raw)) return raw;
  if (/^[1-9]\d{9}$/.test(raw)) return raw;
  if (/^54\d{10,11}$/.test(raw)) return `+${raw}`;
  return null;
}

export type InputProblem = "empty" | "shape" | "check";

/** Why a CVU or CBU cannot be the payer's account: 22 digits whose two check digits are right. */
export function cbuProblem(input: string): InputProblem | null {
  const digits = input.replace(SEPARATORS, "");
  if (!digits) return "empty";
  if (!/^\d{22}$/.test(digits)) return "shape";
  return cvuOk(digits) ? null : "check";
}

/** Why a CUIT/CUIL cannot be the account holder's: 11 digits whose last is the check digit. */
export function cuitProblem(input: string): InputProblem | null {
  const digits = input.replace(SEPARATORS, "");
  if (!digits) return "empty";
  if (!/^\d{11}$/.test(digits)) return "shape";
  return cuitCheckOk(digits) ? null : "check";
}

/** The account holder's name: one line, at least one letter. */
export function holderProblem(input: string): InputProblem | null {
  const name = input.trim();
  if (!name) return "empty";
  return name.length >= 3 && oneLine(name, NAME_MAX) && /\p{L}/u.test(name) ? null : "shape";
}

/** The account the payer types, as the form holds it. */
export interface AccountInput {
  holder: string;
  cbu: string;
  documentType: string;
  document: string;
  bank: string;
  accountType: string;
}

/** The account as `POST .../direct/orders` takes it. */
export interface DirectAccountBody {
  holder: string;
  cbu: string;
  documentType: DocumentType;
  document: string;
  bank: BankId;
  accountType: AccountType;
}

export type AccountField = keyof AccountInput;

/** Each field the payer still has to fix, in the form's order, with why. Empty when it can be sent. */
export function accountProblems(input: AccountInput): { field: AccountField; problem: InputProblem }[] {
  const out: { field: AccountField; problem: InputProblem }[] = [];
  const add = (field: AccountField, problem: InputProblem | null) => {
    if (problem) out.push({ field, problem });
  };
  add("holder", holderProblem(input.holder));
  add("cbu", cbuProblem(input.cbu));
  add("documentType", (DOCUMENT_TYPES as readonly string[]).includes(input.documentType) ? null : "empty");
  add("document", cuitProblem(input.document));
  add("bank", isBankId(input.bank) ? null : "empty");
  add("accountType", (ACCOUNT_TYPES as readonly string[]).includes(input.accountType) ? null : "empty");
  return out;
}

/** The account as sent, or null while any field has a problem (accountProblems). */
export function normalizeAccount(input: AccountInput): DirectAccountBody | null {
  if (accountProblems(input).length) return null;
  return {
    holder: input.holder.trim().replace(/\s+/g, " "),
    cbu: input.cbu.replace(SEPARATORS, ""),
    documentType: input.documentType as DocumentType,
    document: input.document.replace(SEPARATORS, ""),
    bank: input.bank as BankId,
    accountType: input.accountType as AccountType,
  };
}

/* ---- what the server answers ---- */

/* The session: AES-GCM sealed on the server, base64url. Opaque here. */
const SESSION = /^[A-Za-z0-9_-]{16,4096}$/;
const CHALLENGE_MAX = 512;
const ID = /^[A-Za-z0-9._:-]{1,128}$/;
const BANK_ID_SHAPE = /^[a-z0-9_]{1,40}$/;
/* An alias, as Argentine banks take it: 6 to 20 letters, digits, dots and hyphens. */
const ALIAS = /^[A-Za-z0-9.-]{6,20}$/;
/* What `hint` shows of a saved account: its CVU/CBU's last digits or its alias. */
const HINT = /^[A-Za-z0-9.-]{2,20}$/;
const FIAT_AMOUNT = /^(0|[1-9]\d{0,14})(\.\d{1,2})?$/;
const USD_AMOUNT = /^(0|[1-9]\d{0,14})(\.\d{1,8})?$/;
const CURRENCY = /^[A-Z]{3}$/;
const ACCOUNTS_MAX = 50;

export interface DirectChallenge {
  /** Opaque: sent back with the code. */
  challenge: string;
  /** The email had no profile yet: this login also creates it. */
  newAccount: boolean;
}

export function parseDirectChallenge(body: unknown): DirectChallenge | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const b = body as Record<string, unknown>;
  if (!str(b.challenge) || !oneLine(b.challenge, CHALLENGE_MAX)) return null;
  if (typeof b.newAccount !== "boolean") return null;
  return { challenge: b.challenge, newAccount: b.newAccount };
}

export interface DirectSession {
  session: string;
  expiresAt: string;
}

export function parseDirectSession(body: unknown): DirectSession | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const b = body as Record<string, unknown>;
  if (!str(b.session) || !SESSION.test(b.session) || !readableDate(b.expiresAt)) return null;
  return { session: b.session, expiresAt: b.expiresAt };
}

export type DirectKycStep = "details" | "phone" | "document" | "review" | "rejected" | "ready";
export const DIRECT_KYC_STEPS: readonly DirectKycStep[] = ["details", "phone", "document", "review", "rejected", "ready"];
export type DirectKycError = "phone_taken" | "phone_invalid";

export interface DirectKyc {
  step: DirectKycStep;
  /** Where the ID check runs (its own tab), in the `document` step; https only. */
  documentUrl: string | null;
  /** Why the details were refused, in the `details` step. */
  error: DirectKycError | null;
  /** What the payer may still pay this month, in USD; null when unknown. */
  limitUsd: string | null;
}

/** `url` when it is an https URL with no credentials (where the ID check runs), else null. */
export function safeDocumentUrl(url: unknown): string | null {
  if (!str(url) || url.length > 4096) return null;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:" || parsed.username !== "" || parsed.password !== "") return null;
  return parsed.href;
}

export function parseDirectKyc(body: unknown): DirectKyc | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const b = body as Record<string, unknown>;
  if (!DIRECT_KYC_STEPS.includes(b.step as DirectKycStep)) return null;
  if (b.documentUrl !== null && b.documentUrl !== undefined && !str(b.documentUrl)) return null;
  // A link that is not https is never opened: the step shows without it, and the next read may bring one.
  const documentUrl = safeDocumentUrl(b.documentUrl);
  const error = b.error === undefined ? null : b.error;
  if (error !== null && error !== "phone_taken" && error !== "phone_invalid") return null;
  const limitUsd = b.limitUsd === undefined ? null : b.limitUsd;
  if (limitUsd !== null && (!str(limitUsd) || !USD_AMOUNT.test(limitUsd))) return null;
  return { step: b.step as DirectKycStep, documentUrl, error, limitUsd };
}

/** One of the payer's saved accounts: never its full number, only a hint. */
export interface DirectSavedAccount {
  id: string;
  holder: string;
  /** The server's bank id; null when it names none. bankName() reads it. */
  bank: string | null;
  /** The CVU/CBU's last digits or the alias. */
  hint: string;
}

export function parseDirectAccounts(body: unknown): DirectSavedAccount[] | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const list = (body as Record<string, unknown>).accounts;
  if (!Array.isArray(list) || list.length > ACCOUNTS_MAX) return null;
  const seen = new Set<string>();
  const out: DirectSavedAccount[] = [];
  for (const item of list) {
    if (!item || typeof item !== "object" || Array.isArray(item)) return null;
    const a = item as Record<string, unknown>;
    if (!str(a.id) || !ID.test(a.id) || seen.has(a.id)) return null;
    if (!str(a.holder) || !oneLine(a.holder, NAME_MAX)) return null;
    if (a.bank !== null && (!str(a.bank) || !BANK_ID_SHAPE.test(a.bank))) return null;
    if (!str(a.hint) || !HINT.test(a.hint)) return null;
    seen.add(a.id);
    out.push({ id: a.id, holder: a.holder.trim(), bank: a.bank, hint: a.hint });
  }
  return out;
}

export type DirectOrderStatus = "matching" | "pay" | "confirming" | "completed" | "cancelled" | "disputed";
export const DIRECT_ORDER_STATUSES: readonly DirectOrderStatus[] = ["matching", "pay", "confirming", "completed", "cancelled", "disputed"];

/** The verified person the payer transfers to. */
export interface DirectPayTo {
  holder: string;
  /** 22 digits with right check digits; null when the server names none (or a broken one). */
  cbu: string | null;
  alias: string | null;
  /** The server's bank id; null when it names none. */
  bank: string | null;
}

export interface DirectOrder {
  id: string;
  status: DirectOrderStatus;
  /** The exact amount to transfer, in local money. */
  amount: string;
  currency: string;
  /** Only in `pay` and `confirming`. */
  payTo: DirectPayTo | null;
  /** In `pay`, the deadline to transfer (the order cancels itself after it); in `confirming`, when
      the payer may ask for help. */
  dueAt: string | null;
  createdAt: string;
}

/* The account to transfer to. A CVU/CBU whose check digits are wrong is dropped (never shown for a
   payer to copy), an alias that is not one too; with neither left there is nothing to transfer to. */
function parsePayTo(v: unknown): DirectPayTo | null | undefined {
  if (v === null || v === undefined) return null;
  if (typeof v !== "object" || Array.isArray(v)) return undefined;
  const p = v as Record<string, unknown>;
  if (!str(p.holder) || !oneLine(p.holder, NAME_MAX)) return undefined;
  const cbu = str(p.cbu) && cvuOk(p.cbu) ? p.cbu : null;
  const alias = str(p.alias) && ALIAS.test(p.alias) ? p.alias : null;
  if (!cbu && !alias) return undefined;
  const bank = str(p.bank) && BANK_ID_SHAPE.test(p.bank) ? p.bank : null;
  return { holder: p.holder.trim(), cbu, alias, bank };
}

export function parseDirectOrder(body: unknown): DirectOrder | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const b = body as Record<string, unknown>;
  if (!str(b.id) || !ID.test(b.id)) return null;
  if (!DIRECT_ORDER_STATUSES.includes(b.status as DirectOrderStatus)) return null;
  const status = b.status as DirectOrderStatus;
  if (!str(b.amount) || !FIAT_AMOUNT.test(b.amount) || !(Number(b.amount) > 0)) return null;
  if (!str(b.currency) || !CURRENCY.test(b.currency)) return null;
  if (b.dueAt !== null && b.dueAt !== undefined && !readableDate(b.dueAt)) return null;
  if (!readableDate(b.createdAt)) return null;
  const payTo = parsePayTo(b.payTo);
  if (payTo === undefined) return null;
  const showsAccount = status === "pay" || status === "confirming";
  // Paying needs someone to pay: a `pay` without the account is not an answer to act on.
  if (status === "pay" && !payTo) return null;
  return {
    id: b.id,
    status,
    amount: b.amount,
    currency: b.currency,
    payTo: showsAccount ? payTo : null,
    dueAt: str(b.dueAt) ? b.dueAt : null,
    createdAt: b.createdAt,
  };
}

/* ---- what the page shows ---- */

/** The step of the flow the page is on. `loading` while it reads what the session allows. */
export type DirectStep =
  | "loading"
  | "email"
  | "code"
  | Exclude<DirectKycStep, "ready">
  | "account"
  | DirectOrderStatus;

/* An order in one of these is over: shown without a session. */
const ORDER_DONE: readonly DirectOrderStatus[] = ["completed", "cancelled", "disputed"];

export interface DirectState {
  /** A session is held. */
  session: boolean;
  /** A code was sent and is awaited. */
  challenge: boolean;
  kyc: DirectKyc | null;
  order: DirectOrder | null;
  /** The payer asked to change the phone number while its code was awaited. */
  editingPhone?: boolean;
}

/** The identity check's step as a page step: ready means choosing the account. */
export function kycStepView(step: DirectKycStep): DirectStep {
  return step === "ready" ? "account" : step;
}

/** Where the flow stands, from what the page holds. An order decides first (the ones that are over
    need no session to be shown); without a session, the email and its code; then the identity. */
export function directStepOf(s: DirectState): DirectStep {
  if (s.order && ORDER_DONE.includes(s.order.status)) return s.order.status;
  if (!s.session) return s.challenge ? "code" : "email";
  if (s.order) return s.order.status;
  if (!s.kyc) return "loading";
  if (s.kyc.step === "phone" && s.editingPhone) return "details";
  return kycStepView(s.kyc.step);
}

/** An order the payer started and that is not over for them: the page follows it whatever the
    charge's deadline says (money may be on its way). A disputed one stays on screen too. */
export function orderFollowed(order: DirectOrder | null): boolean {
  return !!order && order.status !== "completed" && order.status !== "cancelled";
}

/* How often each step reads the server again: finding someone every 4 s, the ID check every 5 s
   while the page is visible, the review and the transfer more slowly (the order cancels itself at
   its deadline; the read notices). The server budgets these routes at 30 a minute per address. */
const DIRECT_POLL_MS: Partial<Record<DirectStep, number>> = {
  document: 5_000,
  review: 10_000,
  matching: 4_000,
  pay: 10_000,
  confirming: 5_000,
};

export function directPollDelay(step: DirectStep): number | null {
  return DIRECT_POLL_MS[step] ?? null;
}

/** The time left until `dueAt`, as a clock ("14:05", "1:02:03"); null once past or without one. */
export function countdown(dueAt: string | null, now: number = Date.now()): string | null {
  if (!dueAt) return null;
  const ms = Date.parse(dueAt) - now;
  if (!Number.isFinite(ms) || ms <= 0) return null;
  const total = Math.ceil(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

/* ---- what the tab keeps ---- */

/** What this tab keeps per charge so a reload resumes: the opaque session (until it expires) and the
    order's id. Never anything the payer typed. */
export interface StoredDirect {
  session: string | null;
  expiresAt: string | null;
  orderId: string | null;
}

/** The stored value read back, checked as the server's answers are; a session past its expiry is
    dropped (the order's id stays, to resume it after signing in again). Null when nothing is left. */
export function readStoredDirect(raw: string | null, now: number = Date.now()): StoredDirect | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as Record<string, unknown>;
    if (!v || typeof v !== "object" || Array.isArray(v)) return null;
    const live = str(v.session) && SESSION.test(v.session) && readableDate(v.expiresAt) && Date.parse(v.expiresAt) > now;
    const orderId = str(v.orderId) && ID.test(v.orderId) ? v.orderId : null;
    const stored: StoredDirect = {
      session: live ? (v.session as string) : null,
      expiresAt: live ? (v.expiresAt as string) : null,
      orderId,
    };
    return stored.session || stored.orderId ? stored : null;
  } catch {
    return null;
  }
}

/* ---- talking to the server ---- */

/** Every way a call can fail, as the page tells them apart. */
export type DirectFailure =
  /** 401: the session expired or is not this charge's: sign in again. */
  | "session-expired"
  /** 409 `request_closed`: paid, expired or cancelled since the last read. */
  | "closed"
  /** 400 `method_unavailable`: the charge no longer takes this way. */
  | "method-unavailable"
  /** 503 `p2p_unavailable`: down or not set up right now. */
  | "unavailable"
  /** 503 `no_sellers`: nobody to transfer to right now. */
  | "no-sellers"
  /** 409 `kyc_required`: the identity check is not done. */
  | "kyc-required"
  /** 409 `too_many_orders`: the payer has other transfers open. */
  | "too-many-orders"
  /** 409 `order_not_payable` / `order_not_cancellable`: the order moved on. */
  | "order-moved"
  /** 404 on an order route: not this charge's order. */
  | "not-found"
  | "invalid-email"
  | "invalid-code"
  | "invalid-phone"
  | "invalid-account"
  /** 400 `rejected` or another refusal the page has no words of its own for. */
  | "rejected"
  | "rate-limited"
  | "error";

export type DirectResult<T> = { kind: "ok"; value: T } | { kind: "fail"; failure: DirectFailure; retryAfterMs: number | null };

const CODES: Record<string, DirectFailure> = {
  session_expired: "session-expired",
  request_closed: "closed",
  method_unavailable: "method-unavailable",
  p2p_unavailable: "unavailable",
  no_sellers: "no-sellers",
  kyc_required: "kyc-required",
  too_many_orders: "too-many-orders",
  order_not_payable: "order-moved",
  order_not_cancellable: "order-moved",
  invalid_email: "invalid-email",
  invalid_code: "invalid-code",
  invalid_phone: "invalid-phone",
  invalid_account: "invalid-account",
  invalid_cbu: "invalid-account",
  invalid_document: "invalid-account",
  invalid_bank: "invalid-account",
  rejected: "rejected",
};

/**
 * The failure a refusal means. `invalid` is what a generic validation refusal (400 with
 * `validation_failed` or no code) means for that call: the body was the payer's email, code, phone
 * or account, and that is what they fix.
 */
export function directFailureOf(status: number, code: string, invalid: DirectFailure = "rejected"): DirectFailure {
  if (status === 401) return "session-expired";
  if (status === 429) return "rate-limited";
  const known = CODES[code];
  if (known) return known;
  if (status === 404) return "not-found";
  if (status === 400) return invalid;
  if (status === 409) return "closed";
  if (status === 503) return "unavailable";
  return "error";
}

/** The `Accept-Language` the login sends, so the code's email is in a language the payer reads:
    the server writes Spanish, English and Portuguese, and English for the page's other languages. */
export function loginLanguage(lang: string): string {
  return lang === "es" || lang === "pt" ? lang : "en";
}

const base = (apiBase: string, id: string) =>
  `${apiBase.replace(/\/+$/, "")}/v1/payment-links/fiat/${encodeURIComponent(id)}/direct`;

function retryAfter(res: Response): number {
  const seconds = Number(res.headers.get("retry-after"));
  return Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : 30_000;
}

async function errorCode(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as Record<string, unknown> | null;
    return str(body?.code) ? body.code : "";
  } catch {
    return "";
  }
}

interface CallOptions {
  method?: "GET" | "POST";
  session?: string | null;
  body?: unknown;
  lang?: string;
  /** What a generic validation refusal means for this call. */
  invalid?: DirectFailure;
}

/** One call to the direct routes. Never throws: every outcome is a value the page renders. */
async function call<T>(
  url: string,
  opts: CallOptions,
  parse: (body: unknown) => T | null,
  fetchImpl: typeof fetch,
): Promise<DirectResult<T>> {
  const headers: Record<string, string> = { accept: "application/json" };
  if (opts.body !== undefined) headers["content-type"] = "application/json";
  if (opts.session) headers["x-payer-session"] = opts.session;
  if (opts.lang) headers["accept-language"] = opts.lang;
  try {
    const res = await fetchImpl(url, {
      method: opts.method ?? "GET",
      headers,
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
      cache: "no-store",
    });
    if (res.status === 429) return { kind: "fail", failure: "rate-limited", retryAfterMs: retryAfter(res) };
    if (!res.ok) return { kind: "fail", failure: directFailureOf(res.status, await errorCode(res), opts.invalid), retryAfterMs: null };
    const value = parse(await res.json());
    return value === null ? { kind: "fail", failure: "error", retryAfterMs: null } : { kind: "ok", value };
  } catch {
    return { kind: "fail", failure: "error", retryAfterMs: null };
  }
}

/** Sends the payer's email a code (and creates their profile the first time). */
export function directLogin(apiBase: string, id: string, email: string, lang: string, fetchImpl: typeof fetch = fetch) {
  return call(`${base(apiBase, id)}/login`, { method: "POST", body: { email }, lang: loginLanguage(lang), invalid: "invalid-email" }, parseDirectChallenge, fetchImpl);
}

/** Trades the emailed code for the payer's session. */
export function directVerify(apiBase: string, id: string, challenge: string, code: string, fetchImpl: typeof fetch = fetch) {
  return call(`${base(apiBase, id)}/login/verify`, { method: "POST", body: { challenge, code }, invalid: "invalid-code" }, parseDirectSession, fetchImpl);
}

/** Where the payer's identity check stands. */
export function directKyc(apiBase: string, id: string, session: string, fetchImpl: typeof fetch = fetch) {
  return call(`${base(apiBase, id)}/kyc`, { session }, parseDirectKyc, fetchImpl);
}

/** The city and phone (the country is always Argentina): a code is texted to the phone. */
export function directKycDetails(apiBase: string, id: string, session: string, details: { city: string; phone: string }, fetchImpl: typeof fetch = fetch) {
  return call(`${base(apiBase, id)}/kyc/details`, { method: "POST", session, body: details, invalid: "invalid-phone" }, parseDirectKyc, fetchImpl);
}

/** The texted code. */
export function directKycPhone(apiBase: string, id: string, session: string, code: string, fetchImpl: typeof fetch = fetch) {
  return call(`${base(apiBase, id)}/kyc/phone`, { method: "POST", session, body: { code }, invalid: "invalid-code" }, parseDirectKyc, fetchImpl);
}

/** The payer's saved accounts, numbers reduced to a hint. */
export function directAccounts(apiBase: string, id: string, session: string, fetchImpl: typeof fetch = fetch) {
  return call(`${base(apiBase, id)}/accounts`, { session }, parseDirectAccounts, fetchImpl);
}

/** Starts the order: from a saved account, or from one the payer typed (sent once, never kept). */
export function directCreateOrder(
  apiBase: string,
  id: string,
  session: string,
  from: { accountId: string } | { account: DirectAccountBody },
  fetchImpl: typeof fetch = fetch,
) {
  return call(`${base(apiBase, id)}/orders`, { method: "POST", session, body: from, invalid: "invalid-account" }, parseDirectOrder, fetchImpl);
}

/** One order of this charge. */
export function directOrder(apiBase: string, id: string, session: string, orderId: string, fetchImpl: typeof fetch = fetch) {
  return call(`${base(apiBase, id)}/orders/${encodeURIComponent(orderId)}`, { session }, parseDirectOrder, fetchImpl);
}

/** The payer says the transfer is done: the verified person checks it arrived. */
export function directOrderPaid(apiBase: string, id: string, session: string, orderId: string, fetchImpl: typeof fetch = fetch) {
  return call(`${base(apiBase, id)}/orders/${encodeURIComponent(orderId)}/paid`, { method: "POST", session }, parseDirectOrder, fetchImpl);
}

/** Cancels an order not paid yet. */
export function directOrderCancel(apiBase: string, id: string, session: string, orderId: string, fetchImpl: typeof fetch = fetch) {
  return call(`${base(apiBase, id)}/orders/${encodeURIComponent(orderId)}/cancel`, { method: "POST", session }, parseDirectOrder, fetchImpl);
}
