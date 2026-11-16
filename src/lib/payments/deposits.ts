/* deposits.ts: paying a payment link from another network, the hosted checkout's model of it.

   A link on a network with no wallet link of its own (every network but Stellar, Solana and Monad),
   or a mainnet link on one of those three that says `crossChainPayment`, can be paid with any token
   on any network the Payments API lists, through a deposit address made for that one payment: the
   payer picks a network and a token, names their own address there for a refund, sees what to send
   (the link's amount converted, Cosmos Pay's fee inside it), and gets the deposit address. The
   payment is converted and sent to the merchant; the link turns paid by itself. Nothing passes
   through Cosmos Pay. The keyless routes under `/v1/payment-links/{id}` (the community server's
   PaymentLinksController), called from the payer's browser like the read.

   Pure and unit-tested (tests/unit/paymentDeposits.test.ts): every answer is checked here, as
   parsePaymentLink checks the link, before the page writes any of it (as text, or as an attribute
   validated first: the QR, the wallet link, the explorer). Every function returns a value for
   every outcome and never throws. */
import { NETWORK_IDS, isNetwork, isNetworkAddress, networkName, type NetworkId } from "@/lib/chains";

/** A token the payer can pay with (the community server's CrossChainAsset). */
export interface DepositAsset {
  chain: NetworkId;
  chainName: string;
  symbol: string;
  assetId: string;
  decimals: number;
  contract: string | null;
  priceUsd: number | null;
}

export type DepositStatus =
  | "AWAITING_DEPOSIT"
  | "DEPOSIT_DETECTED"
  | "INCOMPLETE_DEPOSIT"
  | "PROCESSING"
  | "SUCCEEDED"
  | "REFUNDED"
  | "FAILED"
  | "EXPIRED";
export const DEPOSIT_STATUSES: readonly DepositStatus[] = [
  "AWAITING_DEPOSIT",
  "DEPOSIT_DETECTED",
  "INCOMPLETE_DEPOSIT",
  "PROCESSING",
  "SUCCEEDED",
  "REFUNDED",
  "FAILED",
  "EXPIRED",
];

export interface ChainTransaction {
  hash: string;
  /** An https page about it, or null when the server named none worth linking. */
  explorerUrl: string | null;
}

/** What the payer sends from where, and where it ends (the server's DepositQuote). */
export interface DepositQuote {
  origin: { chain: NetworkId; asset: string; assetId: string; contract: string | null; amount: string; minimum: string; amountUsd: string | null };
  destination: { chain: NetworkId; asset: string; contract: string | null; amount: string; amountUsd: string | null };
  /** Cosmos Pay's commission, in the origin token, already inside `origin.amount`. */
  fee: { bps: number; amount: string; asset: string };
  timeEstimateSeconds: number;
}

/** One deposit address made for this payment, and how it went (the server's PaymentDeposit). */
export interface PaymentDeposit {
  id: string;
  paymentLinkId: string;
  status: DepositStatus;
  originChain: NetworkId;
  originAsset: string;
  originContract: string | null;
  /** Send exactly this; any surplus is refunded to `refundTo`. */
  amountIn: string;
  minAmountIn: string;
  destinationChain: NetworkId;
  destinationAsset: string;
  destinationContract: string | null;
  amountOut: string;
  feeBps: number;
  feeAmount: string;
  refundTo: string;
  depositAddress: string;
  /** Must be attached to the deposit when set. */
  depositMemo: string | null;
  /** A wallet link in the origin network's own standard; null where there is none. */
  depositUri: string | null;
  qr: string;
  amountOutPaid: string | null;
  refundedAmount: string | null;
  originTxHashes: ChainTransaction[];
  destinationTxHashes: ChainTransaction[];
  timeEstimateSeconds: number;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

const DECIMAL = /^\d+(\.\d+)?$/;
const QR_DATA_URL = /^data:image\/png;base64,[A-Za-z0-9+/=]+$/;
/* Prisma `cuid()`, as a payment link's id. */
const RECORD_ID = /^c[a-z0-9]{20,31}$/;
/* A symbol or 1Click's asset id: printable, no spaces, bounded. */
const TOKEN_TEXT = /^[\x21-\x7e]{1,200}$/;
/* A memo a deposit carries: digits or short printable text. */
const MEMO = /^[\x21-\x7e]{1,64}$/;
/* The wallet links a deposit may carry, one standard per origin network family (SEP-7 `pay`,
   Solana Pay, EIP-681, BIP-21 and its copies, TON transfer links, CIP-13). javascript:, data:,
   http: and anything else are refused before they can become an href. */
const DEPOSIT_URI = /^(?:web\+stellar:pay\?|solana:[1-9A-HJ-NP-Za-km-z]{32,44}(?:\?|$)|ethereum:0x[0-9a-fA-F]{40}|(?:bitcoin|litecoin|dogecoin|bitcoincash|dash|zcash):[A-Za-z0-9:]+\?amount=|ton:\/\/transfer\/|web\+cardano:addr1)/;

const str = (v: unknown): v is string => typeof v === "string";
const strOrNull = (v: unknown): v is string | null => v === null || typeof v === "string";
const decimal = (v: unknown): v is string => str(v) && DECIMAL.test(v);
const iso = (v: unknown): v is string => str(v) && Number.isFinite(Date.parse(v));
const count = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v) && v >= 0;
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
/* A body inside the dashboard proxy's `{ data }` envelope, or bare. */
const unwrap = (body: unknown): unknown => (record(body) && record(body.data) && !("id" in body) ? body.data : body);

export function isPaymentDepositId(id: unknown): id is string {
  return str(id) && RECORD_ID.test(id);
}

/** An https URL, or null: an explorer link is followed only when it is one. */
export function httpsUrl(value: unknown): string | null {
  if (!str(value) || value.length > 2048) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password ? url.href : null;
  } catch {
    return null;
  }
}

function parseAsset(v: unknown): DepositAsset | null {
  if (!record(v) || !isNetwork(v.chain)) return null;
  if (!str(v.symbol) || !TOKEN_TEXT.test(v.symbol) || !str(v.assetId) || !TOKEN_TEXT.test(v.assetId)) return null;
  if (!count(v.decimals) || v.decimals > 36) return null;
  if (!strOrNull(v.contract) || (v.contract !== null && !TOKEN_TEXT.test(v.contract))) return null;
  const price = typeof v.priceUsd === "number" && Number.isFinite(v.priceUsd) && v.priceUsd > 0 ? v.priceUsd : null;
  return {
    chain: v.chain,
    chainName: networkName(v.chain),
    symbol: v.symbol,
    assetId: v.assetId,
    decimals: v.decimals,
    contract: v.contract,
    priceUsd: price,
  };
}

/**
 * The tokens the payer can pay with: every well-formed entry on a network this app knows, in
 * the order the networks are named, a network's coin first. A malformed entry is dropped (it is
 * one option of many), never the list.
 */
export function parseDepositAssets(body: unknown): DepositAsset[] {
  const b = unwrap(body);
  const list = record(b) && Array.isArray(b.data) ? b.data : Array.isArray(b) ? b : [];
  const seen = new Set<string>();
  const assets: DepositAsset[] = [];
  for (const entry of list) {
    const asset = parseAsset(entry);
    if (!asset || seen.has(asset.assetId)) continue;
    seen.add(asset.assetId);
    assets.push(asset);
  }
  const order = new Map(NETWORK_IDS.map((id, i) => [id, i]));
  return assets.sort(
    (a, b) =>
      a.chainName.localeCompare(b.chainName, "en") ||
      (order.get(a.chain) ?? 0) - (order.get(b.chain) ?? 0) ||
      Number(a.contract !== null) - Number(b.contract !== null) ||
      a.symbol.localeCompare(b.symbol, "en"),
  );
}

/** The networks a list of tokens spans, by name. */
export function depositNetworks(assets: readonly DepositAsset[]): NetworkId[] {
  return [...new Set(assets.map((a) => a.chain))].sort((a, b) => networkName(a).localeCompare(networkName(b), "en"));
}

/** What a request names a token by: its contract, else `native` for the network's coin. */
export function assetRef(asset: Pick<DepositAsset, "contract">): string {
  return asset.contract ?? "native";
}

export function parseDepositQuote(body: unknown): DepositQuote | null {
  const b = unwrap(body);
  if (!record(b) || !record(b.origin) || !record(b.destination) || !record(b.fee)) return null;
  const o = b.origin;
  const d = b.destination;
  const f = b.fee;
  if (!isNetwork(o.chain) || !str(o.asset) || !TOKEN_TEXT.test(o.asset) || !str(o.assetId) || !strOrNull(o.contract)) return null;
  if (!decimal(o.amount) || !decimal(o.minimum) || !strOrNull(o.amountUsd)) return null;
  if (!isNetwork(d.chain) || !str(d.asset) || !TOKEN_TEXT.test(d.asset) || !strOrNull(d.contract) || !decimal(d.amount) || !strOrNull(d.amountUsd)) return null;
  if (!count(f.bps) || !decimal(f.amount) || !str(f.asset)) return null;
  if (!count(b.timeEstimateSeconds)) return null;
  const usd = (v: string | null) => (v !== null && DECIMAL.test(v) ? v : null);
  return {
    origin: { chain: o.chain, asset: o.asset, assetId: o.assetId, contract: o.contract, amount: o.amount, minimum: o.minimum, amountUsd: usd(o.amountUsd) },
    destination: { chain: d.chain, asset: d.asset, contract: d.contract, amount: d.amount, amountUsd: usd(d.amountUsd) },
    fee: { bps: f.bps, amount: f.amount, asset: f.asset },
    timeEstimateSeconds: b.timeEstimateSeconds,
  };
}

function parseTransactions(v: unknown): ChainTransaction[] | null {
  if (v === null || v === undefined) return [];
  if (!Array.isArray(v)) return null;
  const out: ChainTransaction[] = [];
  for (const t of v) {
    if (!record(t) || !str(t.hash) || !TOKEN_TEXT.test(t.hash)) return null;
    out.push({ hash: t.hash, explorerUrl: httpsUrl(t.explorerUrl) });
  }
  return out;
}

/**
 * Validate a deposit. Anything that does not match the contract voids the whole body: the page
 * shows an address to send money to, so a deposit address that is not one of its origin network,
 * a wallet link with a foreign scheme or a QR that is not a PNG is never shown.
 */
export function parsePaymentDeposit(body: unknown): PaymentDeposit | null {
  const b = unwrap(body);
  if (!record(b)) return null;
  if (!isPaymentDepositId(b.id) || !isPaymentDepositId(b.paymentLinkId)) return null;
  if (!str(b.status) || !(DEPOSIT_STATUSES as readonly string[]).includes(b.status)) return null;
  if (!isNetwork(b.originChain) || !isNetwork(b.destinationChain)) return null;
  if (!str(b.originAsset) || !TOKEN_TEXT.test(b.originAsset) || !str(b.destinationAsset) || !TOKEN_TEXT.test(b.destinationAsset)) return null;
  if (!strOrNull(b.originContract) || !strOrNull(b.destinationContract)) return null;
  for (const key of ["amountIn", "minAmountIn", "amountOut", "feeAmount"] as const) if (!decimal(b[key])) return null;
  for (const key of ["amountOutPaid", "refundedAmount"] as const) if (b[key] !== null && b[key] !== undefined && !decimal(b[key])) return null;
  if (!count(b.feeBps) || !count(b.timeEstimateSeconds)) return null;
  if (!str(b.refundTo) || !isNetworkAddress(b.originChain, b.refundTo)) return null;
  if (!str(b.depositAddress) || !isNetworkAddress(b.originChain, b.depositAddress)) return null;
  if (!strOrNull(b.depositMemo) || (b.depositMemo !== null && !MEMO.test(b.depositMemo))) return null;
  if (!strOrNull(b.depositUri) || (b.depositUri !== null && !DEPOSIT_URI.test(b.depositUri))) return null;
  if (!str(b.qr) || !QR_DATA_URL.test(b.qr)) return null;
  if (!iso(b.expiresAt) || !iso(b.createdAt) || !iso(b.updatedAt)) return null;
  const originTxHashes = parseTransactions(b.originTxHashes);
  const destinationTxHashes = parseTransactions(b.destinationTxHashes);
  if (!originTxHashes || !destinationTxHashes) return null;
  return {
    id: b.id,
    paymentLinkId: b.paymentLinkId,
    status: b.status as DepositStatus,
    originChain: b.originChain,
    originAsset: b.originAsset,
    originContract: b.originContract,
    amountIn: b.amountIn as string,
    minAmountIn: b.minAmountIn as string,
    destinationChain: b.destinationChain,
    destinationAsset: b.destinationAsset,
    destinationContract: b.destinationContract,
    amountOut: b.amountOut as string,
    feeBps: b.feeBps,
    feeAmount: b.feeAmount as string,
    refundTo: b.refundTo,
    depositAddress: b.depositAddress,
    depositMemo: b.depositMemo,
    depositUri: b.depositUri,
    qr: b.qr,
    amountOutPaid: (b.amountOutPaid as string | null | undefined) ?? null,
    refundedAmount: (b.refundedAmount as string | null | undefined) ?? null,
    originTxHashes,
    destinationTxHashes,
    timeEstimateSeconds: b.timeEstimateSeconds,
    expiresAt: b.expiresAt,
    createdAt: b.createdAt,
    updatedAt: b.updatedAt,
  };
}

/** How the page reads a deposit, one word per state it draws. */
export type DepositPhase = "awaiting" | "incomplete" | "converting" | "paid" | "refunded" | "failed" | "expired";

export function depositPhase(deposit: Pick<PaymentDeposit, "status" | "expiresAt">, now: number = Date.now()): DepositPhase {
  switch (deposit.status) {
    case "DEPOSIT_DETECTED":
    case "PROCESSING":
      return "converting";
    case "INCOMPLETE_DEPOSIT":
      return "incomplete";
    case "SUCCEEDED":
      return "paid";
    case "REFUNDED":
      return "refunded";
    case "FAILED":
      return "failed";
    case "EXPIRED":
      return "expired";
    default:
      // Waiting, but past its deadline: nothing sent now would be converted.
      return Date.parse(deposit.expiresAt) <= now ? "expired" : "awaiting";
  }
}

/* How long to wait before reading the deposit again. Expired is not final on the server (a
   deposit that lands late is refunded, and the row follows it), so it is read slowly; paid,
   refunded and failed are final. The server budgets these reads per address, as the link's. */
const DEPOSIT_POLL_MS: Partial<Record<DepositPhase, number>> = { awaiting: 5_000, incomplete: 5_000, converting: 4_000, expired: 30_000 };

export function nextDepositPollDelay(phase: DepositPhase): number | null {
  return DEPOSIT_POLL_MS[phase] ?? null;
}

/** "about 2 min", in the page's language, from a time estimate in seconds. */
export function durationLabel(seconds: number, lang: string): string {
  const minutes = Math.max(1, Math.round(seconds / 60));
  try {
    return new Intl.NumberFormat(lang, { style: "unit", unit: "minute", unitDisplay: "short" }).format(minutes);
  } catch {
    return `${minutes} min`;
  }
}

/* -------------------------------------------------------------- requests */

/** Why a request did not give an answer the page can use. */
export type DepositFailure =
  | { kind: "not-found" }
  /** The link cannot be paid this way (400 validation_failed on the asset list). */
  | { kind: "unavailable" }
  /** The link is no longer open. */
  | { kind: "closed" }
  /** Refused (a minimum this route has, a token it cannot take now, a refund address): the server's own words. */
  | { kind: "refused"; message: string }
  /** 409: this payer (client address) has its open deposits on the link already. */
  | { kind: "busy" }
  | { kind: "rate-limited"; retryAfterMs: number }
  | { kind: "error" };

export type DepositResult<T> = { kind: "ok"; value: T } | DepositFailure;

/* The server's message, as one line of text the page may show (it names no provider). */
function serverMessage(body: unknown): string {
  const raw = record(body) ? (Array.isArray(body.message) ? body.message.join(" ") : body.message) : null;
  const text = str(raw) ? raw.replace(/[\u0000-\u001f\u007f]+/g, " ").trim() : "";
  return text.length > 300 ? `${text.slice(0, 299)}…` : text;
}

async function call<T>(
  fetchImpl: typeof fetch,
  url: string,
  init: RequestInit,
  parse: (body: unknown) => T | null,
  on400: "unavailable" | "refused" = "refused",
): Promise<DepositResult<T>> {
  try {
    const res = await fetchImpl(url, { ...init, cache: "no-store", headers: { accept: "application/json", ...(init.body ? { "content-type": "application/json" } : {}) } });
    if (res.status === 404) return { kind: "not-found" };
    if (res.status === 429) {
      const seconds = Number(res.headers.get("retry-after"));
      return { kind: "rate-limited", retryAfterMs: Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : 30_000 };
    }
    if (res.status === 409) return { kind: "busy" };
    // Any other refusal (a 400 of ours, the route's own refusal of a minimum or a token) says why
    // in the server's words, which name no provider; a 5xx is a failure to retry.
    if (res.status >= 400 && res.status < 500) {
      const body = await res.json().catch(() => null);
      const code = record(body) ? body.code : null;
      if (code === "invalid_state_transition") return { kind: "closed" };
      if (on400 === "unavailable") return { kind: "unavailable" };
      return { kind: "refused", message: serverMessage(body) };
    }
    if (!res.ok) return { kind: "error" };
    const value = parse(await res.json());
    return value === null ? { kind: "error" } : { kind: "ok", value };
  } catch {
    return { kind: "error" };
  }
}

const linkBase = (apiBase: string, id: string) => `${apiBase.replace(/\/+$/, "")}/v1/payment-links/${encodeURIComponent(id)}`;

/** What the payer can pay this link with: `GET /v1/payment-links/{id}/deposit-assets`. */
export function fetchDepositAssets(apiBase: string, id: string, fetchImpl: typeof fetch = fetch): Promise<DepositResult<DepositAsset[]>> {
  return call(fetchImpl, `${linkBase(apiBase, id)}/deposit-assets`, { method: "GET" }, (body) => {
    const assets = parseDepositAssets(body);
    return assets.length ? assets : null;
  }, "unavailable");
}

export interface DepositChoice {
  originChain: NetworkId;
  /** The token, by its contract or `native`. */
  originAsset: string;
  /** The payer's own address on `originChain`, where a refund goes. */
  refundTo: string;
}

const choiceBody = (c: DepositChoice) => JSON.stringify({ originChain: c.originChain, originAsset: c.originAsset, refundTo: c.refundTo.trim() });

/** What paying from `choice` costs: `POST /v1/payment-links/{id}/quote` (a price; nothing is made). */
export function quoteDeposit(apiBase: string, id: string, choice: DepositChoice, fetchImpl: typeof fetch = fetch): Promise<DepositResult<DepositQuote>> {
  return call(fetchImpl, `${linkBase(apiBase, id)}/quote`, { method: "POST", body: choiceBody(choice) }, parseDepositQuote);
}

/** A deposit address for this payment: `POST /v1/payment-links/{id}/deposits`. */
export function createDeposit(apiBase: string, id: string, choice: DepositChoice, fetchImpl: typeof fetch = fetch): Promise<DepositResult<PaymentDeposit>> {
  return call(fetchImpl, `${linkBase(apiBase, id)}/deposits`, { method: "POST", body: choiceBody(choice) }, (body) => {
    const deposit = parsePaymentDeposit(body);
    return deposit && deposit.paymentLinkId === id ? deposit : null;
  });
}

/** One deposit of this link, as it stands: `GET /v1/payment-links/{id}/deposits/{depositId}`. */
export function fetchDeposit(apiBase: string, id: string, depositId: string, fetchImpl: typeof fetch = fetch): Promise<DepositResult<PaymentDeposit>> {
  if (!isPaymentDepositId(depositId)) return Promise.resolve({ kind: "not-found" });
  return call(fetchImpl, `${linkBase(apiBase, id)}/deposits/${encodeURIComponent(depositId)}`, { method: "GET" }, (body) => {
    const deposit = parsePaymentDeposit(body);
    return deposit && deposit.id === depositId && deposit.paymentLinkId === id ? deposit : null;
  });
}
