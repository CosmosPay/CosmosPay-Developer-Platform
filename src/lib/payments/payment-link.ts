/* payment-link.ts holds the hosted checkout's model of a payment link: what
   `GET /v1/payment-links/{id}` answers (the community server's PublicPaymentLinkEntity)
   and every decision the page makes from it. Pure, so it is unit-tested under plain
   node; the browser script only wires it to the DOM. */
import { DEFAULT_CHECKOUT_THEME, isCheckoutTheme, type CheckoutTheme } from "@/lib/payments/checkout-themes";
import { CHAINS, CHAIN_NAMES, NATIVE_CODES, explorerTxUrl as chainExplorerTx, type Chain, type Tier } from "@/lib/chains";

// The chain vocabulary is src/lib/chains.ts's; re-exported for the checkout and the embed.
export { CHAINS, type Chain, type Tier };
export type LinkStatus = "PENDING" | "SUBMITTED" | "SUCCEEDED" | "FAILED" | "CANCELLED" | "EXPIRED";
export const LINK_STATUSES: readonly LinkStatus[] = ["PENDING", "SUBMITTED", "SUCCEEDED", "FAILED", "CANCELLED", "EXPIRED"];

export function isLinkStatus(value: unknown): value is LinkStatus {
  return typeof value === "string" && (LINK_STATUSES as readonly string[]).includes(value);
}

/**
 * A fee the merchant charges on this payment, paid to its own wallet in the same transaction
 * (the community server's `merchantFee`). `paidBy: "payer"` means the payer sends `amount`
 * plus it; `"recipient"` that it comes out of `amount`.
 */
export interface MerchantFee {
  bps: number;
  fixed: string;
  amount: string;
  asset: string;
  wallet: string;
  paidBy: "payer" | "recipient";
}

export interface PaymentLink {
  id: string;
  kind: "PAY" | "TX";
  chain: Chain;
  network: Tier;
  status: LinkStatus;
  /** Where the payer sends: always the address inside `uri`. */
  payTo: string;
  /** Decimal in the asset's units; null when the payer chooses. */
  amount: string | null;
  /** Asset code, or "native" for the chain's coin. */
  asset: string;
  assetIssuer: string | null;
  memo: string;
  msg: string | null;
  uri: string;
  qr: string;
  txHash: string | null;
  networkFee: string | null;
  expiresAt: string | null;
  createdAt: string;
  /** The design the merchant picked for this page. */
  checkoutTheme: CheckoutTheme;
  /** The merchant's own fee on this payment; null when there is none. */
  merchantFee: MerchantFee | null;
  /**
   * The payment cannot be one wallet link (a Stellar link with a merchant fee: SEP-7 `pay`
   * pays one account): the page asks for the payer's account and has the gateway build the
   * envelope with both payments (buildPayerTransaction). `uri` is this page then.
   */
  payerAccountRequired: boolean;
}

/* Prisma `cuid()` (v1): "c" + lowercase base36. Checked before any request so a mistyped
   or junk path is a 404 here instead of a call that spends the payer's rate-limit budget. */
const PAYMENT_LINK_ID = /^c[a-z0-9]{20,31}$/;

export function isPaymentLinkId(id: string | undefined | null): id is string {
  return typeof id === "string" && PAYMENT_LINK_ID.test(id);
}

/* The only schemes a payment URI may carry. Anything else (javascript:, data:, http:) is
   refused before it can become an href. */
const URI_SCHEMES: Record<Chain, RegExp> = {
  stellar: /^web\+stellar:(pay|tx)\?/i,
  solana: /^solana:[1-9A-HJ-NP-Za-km-z]+/,
  monad: /^ethereum:0x[0-9a-fA-F]{40}/,
};
const QR_DATA_URL = /^data:image\/png;base64,[A-Za-z0-9+/=]+$/;
/* A link that builds its envelope for its payer points at the hosted checkout instead. */
const CHECKOUT_URI = /^https?:\/\/[^\s"'<>]+$/i;
const DECIMAL = /^\d+(\.\d+)?$/;

/* The merchant fee as the server sends it, or undefined when the body's one is malformed:
   it changes what the payer is told to pay, so a half-read fee voids the whole body. */
function parseMerchantFee(v: unknown): MerchantFee | null | undefined {
  if (v === undefined || v === null) return null;
  if (typeof v !== "object" || Array.isArray(v)) return undefined;
  const f = v as Record<string, unknown>;
  if (typeof f.bps !== "number" || !Number.isInteger(f.bps) || f.bps < 0) return undefined;
  for (const key of ["fixed", "amount"] as const) if (!str(f[key]) || !DECIMAL.test(f[key] as string)) return undefined;
  if (!str(f.asset) || !str(f.wallet) || !f.wallet) return undefined;
  if (f.paidBy !== "payer" && f.paidBy !== "recipient") return undefined;
  return { bps: f.bps, fixed: f.fixed as string, amount: f.amount as string, asset: f.asset, wallet: f.wallet, paidBy: f.paidBy };
}

const str = (v: unknown): v is string => typeof v === "string";
const strOrNull = (v: unknown): v is string | null => v === null || typeof v === "string";

/**
 * Validate a response body into a PaymentLink. Anything that does not match the contract
 * (an unknown chain, a URI with a foreign scheme, a QR that is not a PNG data URL) makes
 * the whole body invalid: a checkout page must not render a half-trusted payment.
 */
export function parsePaymentLink(body: unknown): PaymentLink | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  if (!str(b.id) || !isPaymentLinkId(b.id)) return null;
  if (b.kind !== "PAY" && b.kind !== "TX") return null;
  if (!CHAINS.includes(b.chain as Chain)) return null;
  if (b.network !== "public" && b.network !== "testnet") return null;
  if (!isLinkStatus(b.status)) return null;
  if (!str(b.payTo) || !b.payTo || !str(b.asset) || !str(b.memo) || !str(b.uri) || !str(b.qr) || !str(b.createdAt)) return null;
  if (!strOrNull(b.amount) || !strOrNull(b.assetIssuer) || !strOrNull(b.msg) || !strOrNull(b.txHash)) return null;
  if (!strOrNull(b.networkFee) || !strOrNull(b.expiresAt)) return null;
  // a deadline the page cannot read would break the countdown and the poll timing
  if (b.expiresAt !== null && !Number.isFinite(Date.parse(b.expiresAt))) return null;
  const chain = b.chain as Chain;
  const merchantFee = parseMerchantFee(b.merchantFee);
  if (merchantFee === undefined) return null;
  // Only a Stellar link with a fee builds its envelope for its payer; anything else claiming
  // it would hide the wallet link the payment needs.
  const payerAccountRequired = b.payerAccountRequired === true;
  if (payerAccountRequired && (chain !== "stellar" || !merchantFee || b.amount === null)) return null;
  if (payerAccountRequired ? !CHECKOUT_URI.test(b.uri) : !URI_SCHEMES[chain].test(b.uri)) return null;
  if (!QR_DATA_URL.test(b.qr)) return null;
  return {
    id: b.id,
    kind: b.kind,
    chain,
    network: b.network,
    status: b.status as LinkStatus,
    payTo: b.payTo,
    amount: b.amount,
    asset: b.asset,
    assetIssuer: b.assetIssuer,
    memo: b.memo,
    msg: b.msg,
    uri: b.uri,
    qr: b.qr,
    txHash: b.txHash,
    networkFee: b.networkFee,
    expiresAt: b.expiresAt,
    createdAt: b.createdAt,
    // Cosmetic, so it never invalidates a payment: a design this page does not know yet
    // (or a server that predates the field) draws the classic one.
    checkoutTheme: isCheckoutTheme(b.checkoutTheme) ? b.checkoutTheme : DEFAULT_CHECKOUT_THEME,
    merchantFee,
    payerAccountRequired,
  };
}

/* Exact decimal sum (no float): amounts settle payments, so 0.1 + 0.2 must be 0.3. */
function addDecimals(a: string, b: string): string {
  const [aw, af = ""] = a.split(".");
  const [bw, bf = ""] = b.split(".");
  const places = Math.max(af.length, bf.length);
  const sum = BigInt(aw + af.padEnd(places, "0")) + BigInt(bw + bf.padEnd(places, "0"));
  const digits = sum.toString().padStart(places + 1, "0");
  const whole = digits.slice(0, digits.length - places);
  const frac = places ? digits.slice(digits.length - places).replace(/0+$/, "") : "";
  return frac ? `${whole}.${frac}` : whole;
}

/**
 * What the payer sends: `amount`, plus the merchant fee when the payer pays it on top.
 * Null when the payer chooses the amount.
 */
export function payerTotal(link: Pick<PaymentLink, "amount" | "merchantFee">): string | null {
  if (!link.amount) return null;
  return link.merchantFee?.paidBy === "payer" ? addDecimals(link.amount, link.merchantFee.amount) : link.amount;
}

/** A Stellar account address (G…, 56 characters of base32). The gateway checks the checksum. */
export function isStellarAccount(value: string): boolean {
  return /^G[A-Z2-7]{55}$/.test(value.trim());
}

/* Horizon, per network: a payer who signs with Freighter on this page submits here. */
export const HORIZON_URL: Record<Tier, string> = {
  public: "https://horizon.stellar.org",
  testnet: "https://horizon-testnet.stellar.org",
};

/**
 * Submits a signed envelope to the link's network, for a payer who signed it with Freighter
 * here (a wallet scanning the QR submits on its own). True once Horizon accepts it; the page
 * then follows the link, which the server settles from the ledger. Never throws.
 */
export async function submitSignedTransaction(
  network: Tier,
  signedXdr: string,
  fetchImpl: typeof fetch = fetch,
): Promise<boolean> {
  try {
    const res = await fetchImpl(`${HORIZON_URL[network]}/transactions`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
      body: `tx=${encodeURIComponent(signedXdr)}`,
    });
    return res.ok;
  } catch {
    return false;
  }
}

export type PayerTransactionResult =
  | { kind: "ok"; uri: string; qr: string; xdr: string }
  | { kind: "invalid" }
  | { kind: "closed" }
  | { kind: "rate-limited"; retryAfterMs: number }
  | { kind: "error" };

/**
 * Has the gateway build the envelope `account` signs for a link with a merchant fee (both
 * payments and the link's memo): `POST /v1/payment-links/{id}/transaction`, keyless like the
 * read. Its answer is checked as the read is: a `web+stellar:tx` link, a PNG QR, a base64
 * envelope. Never throws.
 */
export async function buildPayerTransaction(
  apiBase: string,
  id: string,
  account: string,
  fetchImpl: typeof fetch = fetch,
): Promise<PayerTransactionResult> {
  try {
    const res = await fetchImpl(`${apiBase.replace(/\/+$/, "")}/v1/payment-links/${encodeURIComponent(id)}/transaction`, {
      method: "POST",
      headers: { accept: "application/json", "content-type": "application/json" },
      body: JSON.stringify({ account: account.trim() }),
      cache: "no-store",
    });
    if (res.status === 429) {
      const seconds = Number(res.headers.get("retry-after"));
      return { kind: "rate-limited", retryAfterMs: Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : 30_000 };
    }
    if (res.status === 400) {
      const body = (await res.json().catch(() => null)) as { code?: unknown } | null;
      return body?.code === "invalid_state_transition" ? { kind: "closed" } : { kind: "invalid" };
    }
    if (!res.ok) return { kind: "error" };
    const b = (await res.json()) as Record<string, unknown>;
    if (!str(b.uri) || !/^web\+stellar:tx\?/i.test(b.uri)) return { kind: "error" };
    if (!str(b.qr) || !QR_DATA_URL.test(b.qr)) return { kind: "error" };
    if (!str(b.xdr) || !/^[A-Za-z0-9+/=]+$/.test(b.xdr)) return { kind: "error" };
    return { kind: "ok", uri: b.uri, qr: b.qr, xdr: b.xdr };
  } catch {
    return { kind: "error" };
  }
}

export function assetSymbol(link: Pick<PaymentLink, "chain" | "asset">): string {
  return !link.asset || link.asset === "native" ? NATIVE_CODES[link.chain] : link.asset;
}

export function chainName(chain: Chain): string {
  return CHAIN_NAMES[chain];
}

/** "25.5 XLM", or null when the payer chooses the amount. */
export function amountLabel(link: Pick<PaymentLink, "chain" | "asset" | "amount">): string | null {
  return link.amount ? `${link.amount} ${assetSymbol(link)}` : null;
}

/** "GCALNQ…X7AOO": enough of both ends to compare against the wallet's screen. */
export function shortAddress(address: string, head = 6, tail = 6): string {
  return address.length <= head + tail + 1 ? address : `${address.slice(0, head)}…${address.slice(-tail)}`;
}

/* The explorer for the transaction (src/lib/chains.ts checks the hash first). */
export function explorerTxUrl(link: Pick<PaymentLink, "chain" | "network" | "txHash">): string | null {
  return chainExplorerTx(link.chain, link.network, link.txHash);
}

/**
 * What the page shows. Mostly the stored status, with one correction: an unpaid link past
 * `expiresAt` reads PENDING until the server's observer sweeps it, and telling a payer to
 * pay a link that is already dead is worse than calling it expired a few seconds early.
 */
export type Phase = "open" | "processing" | "paid" | "failed" | "cancelled" | "expired";

export function phaseOf(link: Pick<PaymentLink, "status" | "expiresAt">, now: number = Date.now()): Phase {
  switch (link.status) {
    case "SUBMITTED": return "processing";
    case "SUCCEEDED": return "paid";
    case "FAILED": return "failed";
    case "CANCELLED": return "cancelled";
    case "EXPIRED": return "expired";
    default: {
      const ends = link.expiresAt ? Date.parse(link.expiresAt) : NaN;
      return Number.isFinite(ends) && ends <= now ? "expired" : "open";
    }
  }
}

/* How long to wait before reading the link again, by phase. EXPIRED is not final on the
   server (a payment verified later still moves it to SUCCEEDED), so an expired link keeps
   being read, just slowly. Paid, failed and cancelled are final: polling stops.
   The server allows 60 reads a minute per address; 5 s is 12. */
const POLL_MS: Partial<Record<Phase, number>> = { open: 5_000, processing: 3_000, expired: 30_000 };

export function nextPollDelay(phase: Phase): number | null {
  return POLL_MS[phase] ?? null;
}

/** Only a Stellar `pay` link can go to the Cosmos Wallet extension's requestPayment. */
export function canPayWithExtension(link: Pick<PaymentLink, "chain" | "kind" | "uri">): boolean {
  return link.chain === "stellar" && link.kind === "PAY" && /^web\+stellar:pay\?/i.test(link.uri);
}

/** The web wallet reads `?uri=web+stellar:…` itself; it has no Solana or Monad intake. */
export function webWalletUrl(base: string, link: Pick<PaymentLink, "chain" | "uri">): string | null {
  if (link.chain !== "stellar") return null;
  const url = new URL(base);
  url.searchParams.set("uri", link.uri);
  return url.href;
}

export type FetchResult =
  | { kind: "ok"; link: PaymentLink }
  | { kind: "not-found" }
  | { kind: "rate-limited"; retryAfterMs: number }
  | { kind: "error" };

/** Read one link from the gateway. Never throws: every outcome is a value the page renders. */
export async function fetchPaymentLink(
  apiBase: string,
  id: string,
  fetchImpl: typeof fetch = fetch,
): Promise<FetchResult> {
  try {
    const res = await fetchImpl(`${apiBase.replace(/\/+$/, "")}/v1/payment-links/${encodeURIComponent(id)}`, {
      headers: { accept: "application/json" },
      cache: "no-store",
    });
    if (res.status === 404) return { kind: "not-found" };
    if (res.status === 429) {
      const seconds = Number(res.headers.get("retry-after"));
      return { kind: "rate-limited", retryAfterMs: Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : 30_000 };
    }
    if (!res.ok) return { kind: "error" };
    const link = parsePaymentLink(await res.json());
    return link && link.id === id ? { kind: "ok", link } : { kind: "error" };
  } catch {
    return { kind: "error" };
  }
}

/**
 * The checkout's countdown to `expiresAt`: "MM:SS" under an hour, "HH:MM:SS" from there,
 * never negative. Null when the link has no deadline.
 */
export function countdown(expiresAt: string | null, now: number = Date.now()): { digits: string; seconds: number } | null {
  const ends = expiresAt ? Date.parse(expiresAt) : NaN;
  if (!Number.isFinite(ends)) return null;
  const seconds = Math.max(0, Math.floor((ends - now) / 1000));
  const two = (n: number) => String(n).padStart(2, "0");
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return { digits: h > 0 ? `${two(h)}:${two(m)}:${two(s)}` : `${two(m)}:${two(s)}`, seconds };
}
