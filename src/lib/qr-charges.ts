/* qr-charges.ts: the dashboard's model of a charge in local money shown as a QR ("QR charges", the
   Fiat group's view, components/cosmos/dashboard/views/QrChargesView.tsx): what the community
   server's `POST /v1/onramp/p2p/payment-requests` takes (CreateP2pPaymentRequestDto) and answers
   (P2pPaymentRequestEntity), and every check the create dialog makes before sending it. The server
   checks the same terms against the live market; these keep a typo from reaching it and say why in
   the reader's language. Pure (no React, no DOM, no astro:env), so tests/unit/qrCharges.test.ts and
   the mock API (src/lib/mock/fiat-requests.ts) reach it.

   A seller shows the QR; the payer pays the amount in local money on the payer page, by bank
   transfer to an alias and a CVU (the charge reads `processing` while the token is on its way) or
   with a local method in the P2P marketplace's secure window, which delivers the token straight to
   the seller's own EVM account. Neither provider is named in copy. */
import { keccak_256 } from "@noble/hashes/sha3.js";
import { FIAT_METHODS, fiatPhaseOf, type FiatMethod, type FiatPhase, type FiatRequestStatus } from "@/lib/payments/fiat-request";

export type ChargeStatus = FiatRequestStatus;
export const CHARGE_STATUSES: readonly ChargeStatus[] = ["open", "processing", "paid", "expired", "cancelled"];

/** How a charge can be paid, and how it was: by bank transfer or with another method. */
export type ChargeMethod = FiatMethod;

/** A charge as its seller reads it (`GET /v1/onramp/p2p/payment-requests[/{id}]`). */
export interface QrCharge {
  id: string;
  network: "public" | "testnet";
  status: ChargeStatus;
  currency: string;
  amount: string;
  chainId: number;
  token: string;
  tokenAddress: string;
  tokenDecimals: number;
  address: string;
  description: string | null;
  estimatedAmountOut: string | null;
  /** The ways the payer can pay it, preferred first (absent from a server before bank transfers). */
  methods?: ChargeMethod[];
  url: string;
  qr: string;
  expiresAt: string;
  createdAt: string;
  paidAt: string | null;
  paidAmount: string | null;
  /** Null until paid, and when the delivery reported no transaction. */
  paidTxHash: string | null;
  /** How it was paid; null until paid (absent from a server before bank transfers). */
  paidMethod?: ChargeMethod | null;
}

/** What creating one sends (CreateP2pPaymentRequestDto). */
export interface ChargeBody {
  currency: string;
  amount: string;
  chainId: number;
  /** The token's contract on `chainId` (the zero address is the chain's own coin). */
  token: string;
  /** The seller's EVM account, EIP-55. */
  address: string;
  description?: string;
  expiresInMinutes: number;
}

/* ---- the amount: local money ---- */

/* At most two decimals, as the server validates a purchase in local money. */
const FIAT_AMOUNT = /^(0|[1-9]\d{0,14})(\.\d{1,2})?$/;

export type AmountProblem = "empty" | "shape" | "min";

/** Why `amount` cannot be charged (empty, not a positive amount with two decimals at most, under
    the currency's minimum), or null when it can. */
export function chargeAmountProblem(amount: string, minAmount?: string | number | null): AmountProblem | null {
  const a = amount.trim();
  if (!a) return "empty";
  if (!FIAT_AMOUNT.test(a) || !(Number(a) > 0)) return "shape";
  const min = Number(minAmount);
  if (minAmount !== null && minAmount !== undefined && minAmount !== "" && Number.isFinite(min) && Number(a) < min) return "min";
  return null;
}

/** About the token the amount buys at the market price: local money per USD stablecoin
    (`price`), times the token's USD price. Null without a price. */
export function chargeEstimate(amount: string, price: string | number | null | undefined, tokenUsd: number | null): number | null {
  const a = Number(amount);
  const p = Number(price);
  if (!tokenUsd || !(tokenUsd > 0) || !Number.isFinite(a) || !(a > 0) || !Number.isFinite(p) || !(p > 0)) return null;
  return a / (p * tokenUsd);
}

/* ---- the receiving address: an EVM account ---- */

const EVM_SHAPE = /^0x[0-9a-fA-F]{40}$/;

/** The address with its EIP-55 checksum (the capitals keccak-256 of the lowercase hex asks for). */
export function toChecksumAddress(address: string): string {
  const hex = address.slice(2).toLowerCase();
  const hash = keccak_256(new TextEncoder().encode(hex));
  let out = "0x";
  for (let i = 0; i < 40; i++) {
    const nibble = (hash[i >> 1] >> (i % 2 === 0 ? 4 : 0)) & 0x0f;
    out += nibble >= 8 ? hex[i].toUpperCase() : hex[i];
  }
  return out;
}

export type AddressProblem = "empty" | "shape" | "checksum";

/** Why `input` is not an EVM account: empty, not 0x and 40 hex digits, or mixed case that fails
    its EIP-55 checksum (a mistyped character). One case only (all lower or all upper) carries no
    checksum and is accepted, as wallets and explorers do. Null when it is one. */
export function evmAddressProblem(input: string): AddressProblem | null {
  const a = input.trim();
  if (!a) return "empty";
  if (!EVM_SHAPE.test(a)) return "shape";
  const body = a.slice(2);
  const oneCase = body === body.toLowerCase() || body === body.toUpperCase();
  if (!oneCase && toChecksumAddress(a) !== a) return "checksum";
  return null;
}

/** The account in its EIP-55 form, or null when it is not one. */
export function normalizeEvmAddress(input: string): string | null {
  return evmAddressProblem(input) === null ? toChecksumAddress(input.trim()) : null;
}

/** The same EVM account, whatever the case of either spelling. */
export const sameEvmAccount = (a: string | null | undefined, b: string | null | undefined) =>
  !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase();

/* ---- the description: one line the payer reads ---- */

export const DESCRIPTION_MAX = 140;
/* Control characters (line breaks included) and the bidirectional embeddings, overrides and
   isolates that could make a description read as something else (the payer page refuses them too,
   src/lib/payments/fiat-request.ts). */
const NOT_ONE_LINE = /[\u0000-\u001f\u007f-\u009f‪-‮⁦-⁩]/;

export type DescriptionProblem = "long" | "line";

/** Why the description cannot be sent (over 140 characters once trimmed, or not one line), or
    null. Empty is fine: it is optional. */
export function descriptionProblem(input: string): DescriptionProblem | null {
  const d = input.trim();
  if (!d) return null;
  if (NOT_ONE_LINE.test(d)) return "line";
  if (d.length > DESCRIPTION_MAX) return "long";
  return null;
}

/* ---- the expiry ---- */

/** How long a charge can be paid, in minutes: 1 hour, 24 hours, 7 days, 30 days (the server's
    maximum). The server takes 5 to 43200; the dialog offers these. */
export const EXPIRY_PRESETS = [60, 1440, 10080, 43200] as const;
export type ExpiryPreset = (typeof EXPIRY_PRESETS)[number];
export const DEFAULT_EXPIRY: ExpiryPreset = 1440;
export const EXPIRY_MIN = 5;
export const EXPIRY_MAX = 43200;

export function isExpiryPreset(minutes: unknown): minutes is ExpiryPreset {
  return typeof minutes === "number" && (EXPIRY_PRESETS as readonly number[]).includes(minutes);
}

/** Minutes the server accepts: a whole number from 5 to 43200. */
export const expiryOk = (minutes: unknown) =>
  typeof minutes === "number" && Number.isInteger(minutes) && minutes >= EXPIRY_MIN && minutes <= EXPIRY_MAX;

/* ---- the request ---- */

/** The body to create a charge, or null when a term is not one the server would take. */
export function chargeBody(draft: {
  currency: string;
  amount: string;
  minAmount?: string | number | null;
  chainId: number | null | undefined;
  token: string | null | undefined;
  address: string;
  description?: string;
  expiresInMinutes: number;
}): ChargeBody | null {
  if (!/^[A-Z]{3}$/.test(draft.currency)) return null;
  if (chargeAmountProblem(draft.amount, draft.minAmount) !== null) return null;
  if (typeof draft.chainId !== "number" || !Number.isSafeInteger(draft.chainId) || draft.chainId <= 0) return null;
  if (!draft.token || !EVM_SHAPE.test(draft.token)) return null;
  const address = normalizeEvmAddress(draft.address);
  if (!address) return null;
  const description = (draft.description ?? "").trim();
  if (descriptionProblem(description) !== null) return null;
  if (!expiryOk(draft.expiresInMinutes)) return null;
  return {
    currency: draft.currency,
    amount: draft.amount.trim(),
    chainId: draft.chainId,
    token: draft.token,
    address,
    ...(description ? { description } : {}),
    expiresInMinutes: draft.expiresInMinutes,
  };
}

/* ---- reading one back ---- */

/** What the dashboard shows: the stored status, with an open charge past its deadline read as
    expired before the next read says so (the server answers it expired too). */
export function chargePhase(charge: Pick<QrCharge, "status" | "expiresAt">, now: number = Date.now()): FiatPhase {
  return fiatPhaseOf(charge, now);
}

/** An open charge is read again while its detail is open, and so is a processing one until the
    token is delivered; paid is final, and expired or cancelled ones change only if a payment
    already under way completes (the list shows that). */
export const CHARGE_POLL_MS = 5_000;
export const chargeIsLive = (charge: Pick<QrCharge, "status" | "expiresAt">, now: number = Date.now()) => {
  const phase = chargePhase(charge, now);
  return phase === "open" || phase === "processing";
};

/** Only an open charge can still be paid (its QR and link shown) or cancelled. */
export const chargeIsPayable = (charge: Pick<QrCharge, "status" | "expiresAt">, now: number = Date.now()) => chargePhase(charge, now) === "open";

/** The charge's methods the dashboard knows, in the server's order; a server from before bank
    transfers answers none, and every charge was paid with another method then. */
export function chargeMethods(charge: Pick<QrCharge, "methods">): ChargeMethod[] {
  const list: readonly string[] = Array.isArray(charge.methods) ? charge.methods : ["p2p"];
  return FIAT_METHODS.filter((m) => list.includes(m)).sort((a, b) => list.indexOf(a) - list.indexOf(b));
}

/** How a paid charge was paid, when the server says. */
export function chargePaidMethod(charge: Pick<QrCharge, "status" | "paidMethod">): ChargeMethod | null {
  return charge.status === "paid" && (charge.paidMethod === "transfer" || charge.paidMethod === "p2p") ? charge.paidMethod : null;
}

const QR_DATA_URL = /^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/;
/* A QR of a short URL is a few kilobytes; anything near this is not one. */
const QR_MAX = 512 * 1024;

/** The API's QR when it is a PNG data URL, else null (never an image from anywhere else). */
export function safeQrDataUrl(qr: unknown): string | null {
  return typeof qr === "string" && qr.length <= QR_MAX && QR_DATA_URL.test(qr) ? qr : null;
}

/** The payer page's address when it is one (`/fiat/<id>` of this charge, over https, or http on a
    local host in development), else null: it becomes a link and a copied value. */
export function safeChargeUrl(url: unknown, id: string): string | null {
  if (typeof url !== "string" || url.length > 2048) return null;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  const local = parsed.hostname === "localhost" || parsed.hostname.endsWith(".localhost");
  if (parsed.protocol !== "https:" && !(parsed.protocol === "http:" && local)) return null;
  if (parsed.username || parsed.password) return null;
  if (parsed.pathname !== `/fiat/${id}`) return null;
  return parsed.href;
}
