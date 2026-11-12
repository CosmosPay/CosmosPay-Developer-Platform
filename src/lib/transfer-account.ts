/* transfer-account.ts: the dashboard's model of the organization's bank-transfer account (QR
   charges' "Bank transfers" card, components/cosmos/dashboard/components/TransferAccountCard.tsx).
   A charge in pesos can be paid by bank transfer only once the seller has their own receiving
   account: the seller activates it with their tax details, the payment provider verifies them on a
   form it hosts, and once approved the account has its own alias and CVU in the seller's name, so
   the payer's money lands there. The community server's `GET /v1/onramp/transfer/account` answers
   the account (TransferAccount) and `POST` starts it; both go through the dashboard's /api/onramp
   proxy. The provider is never named in copy.

   Pure (no React, no DOM, no astro:env), so tests/unit/transferAccount.test.ts and the mock API
   (src/lib/mock/transfer-account.ts) reach it. Every value the card shows or opens is checked here:
   the verification link is followed only over https (http on a local host in development), the
   alias and the CVU only when they are ones (the CVU's check digits included). */
import { cuitCheckOk, cvuOk } from "@/lib/payments/fiat-request";

export type TransferAccountStatus = "none" | "pending" | "in_review" | "approved" | "rejected";
export const TRANSFER_ACCOUNT_STATUSES: readonly TransferAccountStatus[] = ["none", "pending", "in_review", "approved", "rejected"];

export type TransferAccountType = "person" | "company";
export const TRANSFER_ACCOUNT_TYPES: readonly TransferAccountType[] = ["person", "company"];

/** The account as the server answers it. */
export interface TransferAccount {
  status: TransferAccountStatus;
  type: TransferAccountType | null;
  /** The account holder's name, as the payer sees it on the transfer. */
  name: string | null;
  /** The provider's hosted verification form, while pending or in review. */
  verificationUrl: string | null;
  /** Why it was rejected. */
  reason: string | null;
  /** The receiving alias and CVU once approved. */
  alias: string | null;
  cvu: string | null;
  bank: string | null;
  updatedAt: string | null;
}

/** What activating sends (`POST /v1/onramp/transfer/account`). */
export interface TransferAccountBody {
  type: TransferAccountType;
  name: string;
  /** CUIT or CUIL, digits only. */
  taxId: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
  /** YYYY-MM-DD; people only. */
  dateOfBirth?: string;
}

const str = (v: unknown): v is string => typeof v === "string";
const NOT_ONE_LINE = /[\u0000-\u001f\u007f-\u009f‪-‮⁦-⁩]/;
const oneLine = (v: string, max: number) => v.trim() !== "" && v.trim().length <= max && !NOT_ONE_LINE.test(v);
const ALIAS = /^[A-Za-z0-9.-]{6,20}$/;
const NAME_MAX = 120;
const REASON_MAX = 500;

/** The verification form's address when it can be opened: https (http only on a local host in
    development), no credentials in it; else null. */
export function safeVerificationUrl(url: unknown): string | null {
  if (!str(url) || url.length > 2048) return null;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  const local = parsed.hostname === "localhost" || parsed.hostname.endsWith(".localhost");
  if (parsed.protocol !== "https:" && !(parsed.protocol === "http:" && local)) return null;
  if (parsed.username || parsed.password) return null;
  return parsed.href;
}

/** The server's TransferAccount, every field checked; null when it is not one. An approved
    account must carry a valid alias and CVU, or the card would show one a payer cannot use. */
export function parseTransferAccount(body: unknown): TransferAccount | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const b = body as Record<string, unknown>;
  if (!TRANSFER_ACCOUNT_STATUSES.includes(b.status as TransferAccountStatus)) return null;
  const nullable = (v: unknown, ok: (s: string) => boolean) => v === null || v === undefined || (str(v) && ok(v));
  if (!(b.type === null || b.type === undefined || TRANSFER_ACCOUNT_TYPES.includes(b.type as TransferAccountType))) return null;
  if (!nullable(b.name, (v) => oneLine(v, NAME_MAX))) return null;
  if (!nullable(b.reason, (v) => v.trim() !== "" && v.length <= REASON_MAX)) return null;
  if (!nullable(b.alias, (v) => ALIAS.test(v))) return null;
  if (!nullable(b.cvu, (v) => cvuOk(v))) return null;
  if (!nullable(b.bank, (v) => oneLine(v, NAME_MAX))) return null;
  if (!nullable(b.updatedAt, (v) => Number.isFinite(Date.parse(v)))) return null;
  const status = b.status as TransferAccountStatus;
  if (status === "approved" && (!str(b.alias) || !str(b.cvu))) return null;
  return {
    status,
    type: (b.type as TransferAccountType | null | undefined) ?? null,
    name: str(b.name) ? b.name.trim() : null,
    // A link the card cannot open safely is as good as none: the card says to refresh.
    verificationUrl: safeVerificationUrl(b.verificationUrl),
    reason: str(b.reason) ? b.reason.trim() : null,
    alias: str(b.alias) ? b.alias : null,
    cvu: str(b.cvu) ? b.cvu : null,
    bank: str(b.bank) ? b.bank.trim() : null,
    updatedAt: str(b.updatedAt) ? b.updatedAt : null,
  };
}

/** Verification still running: the card offers the form and a refresh. */
export const transferAccountWaiting = (status: TransferAccountStatus) => status === "pending" || status === "in_review";

/** A new account can be started: none yet, or the last one was rejected. */
export const transferAccountCanStart = (status: TransferAccountStatus) => status === "none" || status === "rejected";

/* ---- the activation form ---- */

/* The first two digits of a CUIT or CUIL say who holds it: people 20, 23, 24 and 27, companies
   30, 33 and 34. */
const PERSON_PREFIXES = ["20", "23", "24", "27"];
const COMPANY_PREFIXES = ["30", "33", "34"];

export type TaxIdProblem = "empty" | "shape" | "check" | "kind";

/** Why `input` is not a CUIT/CUIL this kind of holder has (empty, not 11 digits, a wrong check
    digit, a person's number for a company or the other way round), or null. */
export function taxIdProblem(input: string, type: TransferAccountType): TaxIdProblem | null {
  const raw = input.trim();
  if (!raw) return "empty";
  const digits = raw.replace(/[\s.-]/g, "");
  if (!/^\d{11}$/.test(digits)) return "shape";
  if (!cuitCheckOk(digits)) return "check";
  const prefixes = type === "company" ? COMPANY_PREFIXES : PERSON_PREFIXES;
  return prefixes.includes(digits.slice(0, 2)) ? null : "kind";
}

const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,253}\.[^\s@]{2,}$/;
/* An international number: an optional +, then 8 to 15 digits; spaces, dashes and brackets are
   how people write it and do not count. */
const PHONE_DIGITS = /^\+?\d{8,15}$/;
/* An Argentine postal code: four digits, or the CPA (a province letter, four digits, three
   letters). */
const POSTAL = /^(\d{4}|[A-Za-z]\d{4}[A-Za-z]{3})$/;
const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export const emailOk = (v: string) => v.trim().length <= 254 && EMAIL.test(v.trim());
export const normalizePhone = (v: string) => v.trim().replace(/[\s().-]/g, "");
export const phoneOk = (v: string) => PHONE_DIGITS.test(normalizePhone(v));
export const postalCodeOk = (v: string) => POSTAL.test(v.trim());

/** Why a date of birth cannot be sent: not a real date, or a holder younger than 18 or older than
    120. Null when it can. */
export function birthDateProblem(v: string, now: Date = new Date()): "empty" | "shape" | "age" | null {
  const raw = v.trim();
  if (!raw) return "empty";
  const m = DATE.exec(raw);
  if (!m) return "shape";
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(y, mo - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== mo - 1 || date.getUTCDate() !== d) return "shape";
  const age = now.getUTCFullYear() - y - (now.getUTCMonth() < mo - 1 || (now.getUTCMonth() === mo - 1 && now.getUTCDate() < d) ? 1 : 0);
  return age >= 18 && age <= 120 ? null : "age";
}

export interface TransferAccountDraft {
  type: TransferAccountType;
  name: string;
  taxId: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
  dateOfBirth: string;
}

export const emptyTransferAccountDraft = (): TransferAccountDraft => ({
  type: "person", name: "", taxId: "", email: "", phone: "", address: "", city: "", postalCode: "", dateOfBirth: "",
});

/** The body to activate the account, or null while a field is not one the server takes. */
export function transferAccountBody(draft: TransferAccountDraft, now: Date = new Date()): TransferAccountBody | null {
  if (!TRANSFER_ACCOUNT_TYPES.includes(draft.type)) return null;
  if (!oneLine(draft.name, NAME_MAX)) return null;
  if (taxIdProblem(draft.taxId, draft.type) !== null) return null;
  if (!emailOk(draft.email) || !phoneOk(draft.phone)) return null;
  if (!oneLine(draft.address, NAME_MAX) || !oneLine(draft.city, 80) || !postalCodeOk(draft.postalCode)) return null;
  if (draft.type === "person" && birthDateProblem(draft.dateOfBirth, now) !== null) return null;
  return {
    type: draft.type,
    name: draft.name.trim(),
    taxId: draft.taxId.trim().replace(/[\s.-]/g, ""),
    email: draft.email.trim(),
    phone: normalizePhone(draft.phone),
    address: draft.address.trim(),
    city: draft.city.trim(),
    postalCode: draft.postalCode.trim().toUpperCase(),
    ...(draft.type === "person" ? { dateOfBirth: draft.dateOfBirth.trim() } : {}),
  };
}

/** The steps of the activation form, each valid on its own: who holds the account, how to reach
    them, where they are. */
export function transferAccountStepOk(draft: TransferAccountDraft, step: number, now: Date = new Date()): boolean {
  if (step === 0) {
    return oneLine(draft.name, NAME_MAX) && taxIdProblem(draft.taxId, draft.type) === null
      && (draft.type === "company" || birthDateProblem(draft.dateOfBirth, now) === null);
  }
  if (step === 1) return emailOk(draft.email) && phoneOk(draft.phone);
  return oneLine(draft.address, NAME_MAX) && oneLine(draft.city, 80) && postalCodeOk(draft.postalCode);
}
