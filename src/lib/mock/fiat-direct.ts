/* Mock mode's direct flow for a charge in local money: the gateway's keyless
   `/v1/payment-links/fiat/{id}/direct/*` routes (the community server's contract), answered for
   src/lib/mock/fiat-requests.ts, which owns the charges and calls directRoute for them. Every step
   of the payer page's direct flow works offline:

     login           any email answers a challenge; the code is any 8 letters and digits but
                     00000000 (400 invalid_code)
     identity        the charge decides who signs in: a returning payer (identity done, two saved
                     accounts) or a new one, who walks every step: city and phone (1111111111 answers
                     phone_taken, a phone that is not one 400 invalid_phone), the texted code 1234
                     (anything else invalid_code), the ID document (a link to example.com; it reads
                     `document` for DOCUMENT_MS, then `review` for REVIEW_MS, then done). An email whose
                     local part starts with `ready` signs in as a returning payer on any charge, one
                     starting with `rejected` ends the identity check rejected.
     orders          `matching` for MATCHING_MS, then `pay` (a fake verified person, a deadline
                     PAY_WINDOW_MS later; past it the order cancels itself), `confirming` once the
                     payer says they transferred (the charge turns processing), `completed`
                     CONFIRMING_MS later (the charge turns paid). Orders from the returning payer's
                     Brubank account end `disputed` instead (the charge stays processing). Cancel works
                     in `matching` and `pay`. Two open orders per payer at most (409 too_many_orders).

   Sessions are opaque random tokens kept here with the charge they belong to; a session for
   another charge, an unknown one or one past its hour answers 401 session_expired. Nothing the
   payer types is kept: the email only picks the profile, a typed account is reduced to its holder,
   bank and last digits. Kept on globalThis (mockStore): a hot reload keeps it, a restart resets it. */
import { mockStore } from "@/lib/mock/store";
import {
  BANK_IDS,
  normalizeAccount,
  normalizeCity,
  normalizeEmail,
  normalizeLoginCode,
  normalizePhone,
  normalizePhoneCode,
  type AccountInput,
  type DirectKycStep,
  type DirectOrderStatus,
} from "@/lib/payments/p2p-direct";

export const DIRECT_SESSION_MS = 60 * 60_000;
export const MATCHING_MS = 8_000;
export const PAY_WINDOW_MS = 30 * 60_000;
export const CONFIRMING_MS = 12_000;
export const DOCUMENT_MS = 10_000;
export const REVIEW_MS = 10_000;
/** The code the mock refuses, and the texted code it accepts (the sandbox's is always 1234 too). */
export const WRONG_LOGIN_CODE = "00000000";
export const PHONE_CODE = "1234";
const TAKEN_PHONE = "1111111111";
const DOCUMENT_URL = "https://example.com/";
const MAX_OPEN_ORDERS = 2;

/** Who signs in on a charge: someone whose identity is already checked, or someone new. */
export type DirectPersona = "returning" | "new";

/** The charge as this module needs it; fiat-requests.ts hands it over. */
export interface DirectCharge {
  id: string;
  amount: string;
  currency: string;
  /** The direct flow is on for this charge. */
  p2pDirect: boolean;
  /** Open, as the payer page reads it (not paid, expired, cancelled or processing). */
  open: boolean;
  /** Who signs in here unless the email says otherwise. */
  persona: DirectPersona;
}

interface MockAccount {
  id: string;
  holder: string;
  bank: string;
  hint: string;
  /** Mock only: this account's orders end disputed. */
  disputes: boolean;
}

interface MockPayer {
  /** Where the identity check stands, before the document's timing applies. */
  kyc: "details" | "phone" | "document" | "ready";
  /** When the ID document step was reached (its timing runs from there). */
  documentAt: number | null;
  /** The identity check ends rejected. */
  rejects: boolean;
  phoneError: "phone_taken" | "phone_invalid" | null;
  accounts: MockAccount[];
}

interface MockOrder {
  id: string;
  requestId: string;
  payer: string;
  amount: string;
  currency: string;
  createdAt: number;
  paidAt: number | null;
  cancelledAt: number | null;
  disputes: boolean;
}

interface DirectStore {
  challenges: Record<string, { requestId: string; persona: DirectPersona; rejects: boolean }>;
  sessions: Record<string, { requestId: string; payer: string; expiresAt: number }>;
  payers: Record<string, MockPayer>;
  orders: Record<string, MockOrder>;
  seq: number;
}

const store = () => mockStore<DirectStore>("fiat-direct", () => ({ challenges: {}, sessions: {}, payers: {}, orders: {}, seq: 0 }));

/* The verified person a mock order pays: a CVU with right check digits, an alias and a bank. */
const PAY_TO = { holder: "Lucía Fernández", cbu: "0000003100001234567891", alias: "lucia.fernandez.mp", bank: "mercado_pago" };

function returningAccounts(): MockAccount[] {
  return [
    { id: "pd-mock-galicia", holder: "Martín Gómez", bank: "galicia", hint: "6782", disputes: false },
    { id: "pd-mock-brubank", holder: "Martín Gómez", bank: "brubank", hint: "4521", disputes: true },
  ];
}

function newPayer(persona: DirectPersona, rejects: boolean): MockPayer {
  return persona === "returning"
    ? { kyc: "ready", documentAt: null, rejects: false, phoneError: null, accounts: returningAccounts() }
    : { kyc: "details", documentAt: null, rejects, phoneError: null, accounts: [] };
}

/** A token shaped like the server's (base64url), random so it cannot be guessed. */
function token(bytes = 32): string {
  const raw = crypto.getRandomValues(new Uint8Array(bytes));
  return Buffer.from(raw).toString("base64url");
}

/* ---- the identity check ---- */

/** The Kyc the server answers, with the ID document's timing applied. */
function kycOf(p: MockPayer, now: number) {
  let step: DirectKycStep = p.kyc;
  if (p.kyc === "document" && p.documentAt !== null) {
    if (now >= p.documentAt + DOCUMENT_MS + REVIEW_MS) step = p.rejects ? "rejected" : "ready";
    else if (now >= p.documentAt + DOCUMENT_MS) step = "review";
  }
  if (step === "ready" && p.kyc !== "ready") p.kyc = "ready";
  return {
    step,
    documentUrl: step === "document" ? DOCUMENT_URL : null,
    error: step === "details" ? p.phoneError : null,
    limitUsd: step === "ready" ? "9850.00" : null,
  };
}

/* ---- orders ---- */

/** The order's status now, with its timing applied (as the marketplace moves it). */
function statusOf(o: MockOrder, now: number): DirectOrderStatus {
  if (o.cancelledAt !== null) return "cancelled";
  if (o.paidAt !== null) {
    if (now < o.paidAt + CONFIRMING_MS) return "confirming";
    return o.disputes ? "disputed" : "completed";
  }
  if (now < o.createdAt + MATCHING_MS) return "matching";
  // An accepted order nobody paid cancels itself at its deadline.
  if (now >= o.createdAt + MATCHING_MS + PAY_WINDOW_MS) return "cancelled";
  return "pay";
}

/** The Order the server answers: the verified person only in `pay` and `confirming`. */
function orderView(o: MockOrder, now: number) {
  const status = statusOf(o, now);
  const accepted = o.createdAt + MATCHING_MS;
  const dueAt = status === "pay" ? accepted + PAY_WINDOW_MS : status === "confirming" ? (o.paidAt ?? now) + CONFIRMING_MS : null;
  return {
    id: o.id,
    status,
    amount: o.amount,
    currency: o.currency,
    payTo: status === "pay" || status === "confirming" ? PAY_TO : null,
    dueAt: dueAt === null ? null : new Date(dueAt).toISOString(),
    createdAt: new Date(o.createdAt).toISOString(),
  };
}

/**
 * How the charge's direct orders move it, for fiat-requests.ts's settle: the first time a payer
 * said they transferred (the charge reads processing from then) and the first completion (paid).
 */
export function directProgress(requestId: string, now = Date.now()): { paidAt: number | null; completedAt: number | null } {
  let paidAt: number | null = null;
  let completedAt: number | null = null;
  for (const o of Object.values(store().orders)) {
    if (o.requestId !== requestId || o.paidAt === null || o.cancelledAt !== null) continue;
    paidAt = paidAt === null ? o.paidAt : Math.min(paidAt, o.paidAt);
    if (!o.disputes && now >= o.paidAt + CONFIRMING_MS) {
      const at = o.paidAt + CONFIRMING_MS;
      completedAt = completedAt === null ? at : Math.min(completedAt, at);
    }
  }
  return { paidAt, completedAt };
}

/* ---- the routes ---- */

type Json = (body: unknown, status?: number) => Response;

const error = (json: Json, status: number, code: string, message: string) => json({ statusCode: status, code, message }, status);

async function bodyOf(request: Request): Promise<Record<string, unknown>> {
  const body = (await request.json().catch(() => null)) as unknown;
  return body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>) : {};
}

const text = (v: unknown) => (typeof v === "string" ? v : "");

/** The session's payer, or null (401 session_expired). */
function sessionPayer(request: Request, charge: DirectCharge, now: number): string | null {
  const s = store().sessions[request.headers.get("x-payer-session") ?? ""];
  return s && s.requestId === charge.id && s.expiresAt > now ? s.payer : null;
}

/**
 * `.../fiat/{id}/direct/*`: `path` is what follows `direct` (`["login"]`, `["orders", "<id>", "paid"]`).
 * The checks run in the server's order: the flow on for the charge, the charge open (but for reading
 * an order, which outlives it), the session, then the body.
 */
export async function directRoute(request: Request, charge: DirectCharge, path: string[], json: Json, now = Date.now()): Promise<Response> {
  const s = store();
  const [head, orderId, action] = path;
  const method = request.method;
  if (!charge.p2pDirect) return error(json, 400, "method_unavailable", "This payment request cannot be paid this way");
  const readsOrder = method === "GET" && head === "orders" && !!orderId;
  const movesOrder = method === "POST" && head === "orders" && !!orderId;
  if (!charge.open && !readsOrder && !movesOrder) return error(json, 409, "request_closed", "The payment request is closed");

  if (method === "POST" && head === "login" && !orderId) {
    const body = await bodyOf(request);
    const email = normalizeEmail(text(body.email));
    if (!email) return error(json, 400, "validation_failed", "email must be an email address");
    const local = email.split("@")[0].toLowerCase();
    const persona: DirectPersona = local.startsWith("ready") ? "returning" : charge.persona;
    const challenge = `mock-${token(18)}`;
    s.challenges[challenge] = { requestId: charge.id, persona, rejects: local.startsWith("rejected") };
    return json({ challenge, newAccount: persona === "new" }, 200);
  }
  if (method === "POST" && head === "login" && orderId === "verify") {
    const body = await bodyOf(request);
    const pending = s.challenges[text(body.challenge)];
    const code = normalizeLoginCode(text(body.code));
    if (!pending || pending.requestId !== charge.id || !code || code === WRONG_LOGIN_CODE) {
      return error(json, 400, "invalid_code", "The code is not valid");
    }
    delete s.challenges[text(body.challenge)];
    // A returning payer is the same profile on every login; a new one starts over each time.
    const payer = pending.persona === "returning" ? "returning" : `new-${++s.seq}`;
    s.payers[payer] ??= newPayer(pending.persona, pending.rejects);
    const session = token();
    const expiresAt = now + DIRECT_SESSION_MS;
    s.sessions[session] = { requestId: charge.id, payer, expiresAt };
    return json({ session, expiresAt: new Date(expiresAt).toISOString() }, 200);
  }

  const payerKey = sessionPayer(request, charge, now);
  if (!payerKey) return error(json, 401, "session_expired", "The session expired");
  const payer = s.payers[payerKey];

  if (method === "GET" && head === "kyc" && !orderId) return json(kycOf(payer, now));
  if (method === "POST" && head === "kyc" && orderId === "details") {
    const body = await bodyOf(request);
    const phone = normalizePhone(text(body.phone));
    if (!normalizeCity(text(body.city)) || !phone) return error(json, 400, "invalid_phone", "phone must be an Argentine mobile number");
    const step = kycOf(payer, now).step;
    if (step !== "details" && step !== "phone") return json(kycOf(payer, now));
    if (phone.replace(/^\+54/, "") === TAKEN_PHONE) {
      payer.kyc = "details";
      payer.phoneError = "phone_taken";
    } else {
      payer.kyc = "phone";
      payer.phoneError = null;
    }
    return json(kycOf(payer, now));
  }
  if (method === "POST" && head === "kyc" && orderId === "phone") {
    const body = await bodyOf(request);
    if (payer.kyc !== "phone") return json(kycOf(payer, now));
    if (normalizePhoneCode(text(body.code)) !== PHONE_CODE) return error(json, 400, "invalid_code", "The code is not valid");
    payer.kyc = "document";
    payer.documentAt = now;
    return json(kycOf(payer, now));
  }
  if (method === "GET" && head === "accounts" && !orderId) {
    return json({ accounts: payer.accounts.map(({ id, holder, bank, hint }) => ({ id, holder, bank, hint })) });
  }

  if (method === "POST" && head === "orders" && !orderId) {
    if (kycOf(payer, now).step !== "ready") return error(json, 409, "kyc_required", "The identity check is not complete");
    const body = await bodyOf(request);
    let account: MockAccount | undefined;
    if (typeof body.accountId === "string") {
      account = payer.accounts.find((a) => a.id === body.accountId);
    } else if (body.account && typeof body.account === "object") {
      const a = body.account as Record<string, unknown>;
      const input: AccountInput = {
        holder: text(a.holder), cbu: text(a.cbu), documentType: text(a.documentType), document: text(a.document), bank: text(a.bank), accountType: text(a.accountType),
      };
      const typed = normalizeAccount(input);
      if (typed && typed.cbu === input.cbu && typed.document === input.document) {
        // Saved as the marketplace would, reduced here to what the page may see again.
        account = { id: `pd-mock-${++s.seq}`, holder: typed.holder, bank: typed.bank, hint: typed.cbu.slice(-4), disputes: false };
        if (!payer.accounts.some((x) => x.bank === account!.bank && x.hint === account!.hint)) payer.accounts.push(account);
      }
    }
    if (!account || !(BANK_IDS as readonly string[]).includes(account.bank)) return error(json, 400, "invalid_account", "The account is not valid");
    const open = Object.values(s.orders).filter((o) => o.payer === payerKey && ["matching", "pay", "confirming"].includes(statusOf(o, now)));
    if (open.length >= MAX_OPEN_ORDERS) return error(json, 409, "too_many_orders", "Too many orders in progress");
    const order: MockOrder = {
      id: `mock-order-${token(9)}`,
      requestId: charge.id,
      payer: payerKey,
      amount: charge.amount,
      currency: charge.currency,
      createdAt: now,
      paidAt: null,
      cancelledAt: null,
      disputes: account.disputes,
    };
    s.orders[order.id] = order;
    return json(orderView(order, now), 201);
  }

  const order = orderId ? s.orders[orderId] : undefined;
  if (!order || order.requestId !== charge.id || order.payer !== payerKey) return error(json, 404, "not_found", "Order not found");
  if (method === "GET" && !action) return json(orderView(order, now));
  if (method === "POST" && action === "paid") {
    if (statusOf(order, now) !== "pay") return error(json, 409, "order_not_payable", "The order cannot be marked paid");
    order.paidAt = now;
    return json(orderView(order, now));
  }
  if (method === "POST" && action === "cancel") {
    const status = statusOf(order, now);
    if (status !== "matching" && status !== "pay") return error(json, 409, "order_not_cancellable", "The order cannot be cancelled");
    order.cancelledAt = now;
    return json(orderView(order, now));
  }
  return error(json, 404, "not_found", "Not found");
}
