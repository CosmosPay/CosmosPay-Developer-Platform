/* payment-link.ts — the hosted checkout's model of a payment link: what
   `GET /v1/payment-links/{id}` answers (the community server's PublicPaymentLinkEntity)
   and every decision the page makes from it. Pure, so it is unit-tested under plain
   node; the browser script only wires it to the DOM. */
import { DEFAULT_CHECKOUT_THEME, isCheckoutTheme, type CheckoutTheme } from "@/lib/payments/checkout-themes";

export const CHAINS = ["stellar", "solana", "monad"] as const;
export type Chain = (typeof CHAINS)[number];
export type Tier = "public" | "testnet";
export type LinkStatus = "PENDING" | "SUBMITTED" | "SUCCEEDED" | "FAILED" | "CANCELLED" | "EXPIRED";
export const LINK_STATUSES: readonly LinkStatus[] = ["PENDING", "SUBMITTED", "SUCCEEDED", "FAILED", "CANCELLED", "EXPIRED"];

export function isLinkStatus(value: unknown): value is LinkStatus {
  return typeof value === "string" && (LINK_STATUSES as readonly string[]).includes(value);
}

export interface PaymentLink {
  id: string;
  kind: "PAY" | "TX";
  chain: Chain;
  network: Tier;
  status: LinkStatus;
  /** Where the payer sends — always the address inside `uri`. */
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

const str = (v: unknown): v is string => typeof v === "string";
const strOrNull = (v: unknown): v is string | null => v === null || typeof v === "string";

/**
 * Validate a response body into a PaymentLink. Anything that does not match the contract
 * — an unknown chain, a URI with a foreign scheme, a QR that is not a PNG data URL — makes
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
  if (!URI_SCHEMES[chain].test(b.uri)) return null;
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
  };
}

const NATIVE_SYMBOL: Record<Chain, string> = { stellar: "XLM", solana: "SOL", monad: "MON" };
const CHAIN_NAME: Record<Chain, string> = { stellar: "Stellar", solana: "Solana", monad: "Monad" };

export function assetSymbol(link: Pick<PaymentLink, "chain" | "asset">): string {
  return !link.asset || link.asset === "native" ? NATIVE_SYMBOL[link.chain] : link.asset;
}

export function chainName(chain: Chain): string {
  return CHAIN_NAME[chain];
}

/** "25.5 XLM", or null when the payer chooses the amount. */
export function amountLabel(link: Pick<PaymentLink, "chain" | "asset" | "amount">): string | null {
  return link.amount ? `${link.amount} ${assetSymbol(link)}` : null;
}

/** "GCALNQ…X7AOO" — enough of both ends to compare against the wallet's screen. */
export function shortAddress(address: string, head = 6, tail = 6): string {
  return address.length <= head + tail + 1 ? address : `${address.slice(0, head)}…${address.slice(-tail)}`;
}

/* Explorers, the same ones the wallet links (its src/constants/chains.ts). The hash is
   checked against the chain's alphabet so a crafted value can't become a different URL. */
const TX_HASH: Record<Chain, RegExp> = {
  stellar: /^[0-9a-f]{64}$/i,
  solana: /^[1-9A-HJ-NP-Za-km-z]{43,90}$/,
  monad: /^0x[0-9a-f]{64}$/i,
};
const EXPLORER_TX: Record<Chain, Record<Tier, (hash: string) => string>> = {
  stellar: {
    public: (h) => `https://stellar.expert/explorer/public/tx/${h}`,
    testnet: (h) => `https://stellar.expert/explorer/testnet/tx/${h}`,
  },
  solana: {
    public: (h) => `https://solscan.io/tx/${h}`,
    testnet: (h) => `https://explorer.solana.com/tx/${h}?cluster=devnet`,
  },
  monad: {
    public: (h) => `https://monadscan.com/tx/${h}`,
    testnet: (h) => `https://testnet.monadexplorer.com/tx/${h}`,
  },
};

export function explorerTxUrl(link: Pick<PaymentLink, "chain" | "network" | "txHash">): string | null {
  if (!link.txHash || !TX_HASH[link.chain].test(link.txHash)) return null;
  return EXPLORER_TX[link.chain][link.network](link.txHash);
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
   server — a payment verified later still moves it to SUCCEEDED — so an expired link keeps
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
