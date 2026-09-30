/* cosmos.ts — server-to-server client for the Cosmos Pay Payments API
   (the community NestJS service, see comos-pay-community-server).

   In production every request to that service must arrive through the APISIX
   gateway, which injects a shared `X-Gateway-Secret` plus the authenticated
   consumer identity (`X-Consumer-Username`, `X-Consumer-Env`). Our dashboard is a
   trusted backend (it already holds the APISIX admin key), so instead of round-
   tripping through the data plane we call the Payments API directly and present
   those same headers ourselves — scoping every payment intent to the signed-in
   user's consumer (`cosmos_<userId>`), exactly as a real API key would. */
import { COSMOS_API_URL, COSMOS_GATEWAY_SECRET } from "astro:env/server";
import { keyPrefix } from "@/utils/apisix";
import { isSafeUpstreamPath } from "@/lib/upstream-path";
import { upstreamBaseUrls } from "@/lib/apisix-upstream";

export type CosmosEnv = "dev" | "prod";

/** The APISIX consumer username that owns a user's payment intents. */
function consumerUsername(userId: string): string {
  return userId.includes(keyPrefix) ? userId : `${keyPrefix}${userId}`;
}

/* Round-robin across the replicas `COSMOS_API_URL` lists, the same set APISIX balances
   across. A single entry — every deployment until replicas — always returns itself. */
const BASE_URLS = upstreamBaseUrls(COSMOS_API_URL);
let nextBase = 0;
function baseUrl(): string {
  if (BASE_URLS.length === 0) return "";
  const url = BASE_URLS[nextBase % BASE_URLS.length];
  nextBase = (nextBase + 1) % BASE_URLS.length;
  return url;
}

export class CosmosApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "CosmosApiError";
    this.status = status;
  }
}

/** Refuse a path that would escape its feature prefix. See {@link isSafeUpstreamPath}. */
function assertNoTraversal(path: string): void {
  if (!isSafeUpstreamPath(path)) throw new CosmosApiError("Invalid path", 400);
}

/* Low-level request. Attaches the gateway headers + consumer identity and unwraps
   the JSON body. Throws CosmosApiError (carrying the upstream status + message) on
   any non-2xx response so callers can surface a clean error. */
async function cosmosFetch<T>(
  userId: string,
  env: CosmosEnv,
  path: string,
  init: {
    method?: string;
    body?: unknown;
    query?: Record<string, string | number | undefined>;
    // Organization context for swaps. `swapFeeBps` is the org plan's commission — the
    // Payments API takes it from this trusted header, NEVER from the request body, so a
    // caller can't change the fee. Resolved server-side via orgSwapContext().
    org?: string;
    swapFeeBps?: number;
    // The END USER's address, for a call the platform makes on their behalf (the
    // social-login bridge). The Payments service keys its rate limits on the peer
    // it sees, and for a direct server-to-server call that peer is this process --
    // so without this every social login in the world shares one bucket and the
    // twentieth user in ten minutes is refused because of the nineteen before them.
    // It sets X-Forwarded-For, which that service reads with `trust proxy = 1`:
    // the rightmost entry, i.e. exactly what we put here and nothing a client
    // prepended. Never pass a value a request body supplied.
    clientIp?: string;
  } = {},
): Promise<T> {
  assertNoTraversal(path);
  const url = new URL(baseUrl() + path);
  if (init.query) {
    for (const [k, v] of Object.entries(init.query)) {
      if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
    }
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    // Identify the caller exactly as the gateway would after key-auth.
    "X-Consumer-Username": consumerUsername(userId),
    // Drives the Stellar network upstream: dev → testnet, prod → public.
    "X-Consumer-Env": env,
    // The dashboard is the owner console: it has already enforced the platform's
    // own org-permissions before reaching here, so it acts with full scope. The
    // separate API-key scopes (read/write) only restrict external key holders.
    "X-Consumer-Role": "admin",
    // Mark as an internal management-console call so it's excluded from the API
    // request log (which should only show real API-key usage, not dashboard traffic).
    "X-Cosmos-Internal": "1",
  };
  // Only sent when configured — but the community server always enforces it now, so
  // COSMOS_GATEWAY_SECRET must be set (and match) for these calls to succeed.
  if (COSMOS_GATEWAY_SECRET) headers["X-Gateway-Secret"] = COSMOS_GATEWAY_SECRET;
  // Swap context. The fee is the org plan's rate, enforced server-side — presented here
  // exactly as the APISIX consumer forwarder would for an API-key caller.
  if (init.org) headers["X-Consumer-Org"] = init.org;
  if (init.swapFeeBps !== undefined) headers["X-Plan-Swap-Fee-Bps"] = String(init.swapFeeBps);
  if (init.clientIp) headers["X-Forwarded-For"] = init.clientIp;

  let res: Response;
  try {
    res = await fetch(url, {
      method: init.method ?? "GET",
      headers,
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
  } catch {
    throw new CosmosApiError("Could not reach the Payments service", 502);
  }

  let json: any = null;
  try { json = await res.json(); } catch { /* empty / non-JSON */ }

  if (!res.ok) {
    const msg =
      (json && (json.message || (Array.isArray(json.message) ? json.message.join(", ") : null))) ||
      `Payments request failed (${res.status})`;
    throw new CosmosApiError(typeof msg === "string" ? msg : `Payments request failed (${res.status})`, res.status);
  }

  return json as T;
}

/* Generic reverse-proxy to the Payments API for whole feature prefixes (BlindPay:
   kyc / onramp / offramp), so the dashboard can expose them without a hand-written route
   per endpoint. Presents the same gateway identity headers as cosmosFetch and forwards
   the method, query (minus our control params), and body — including multipart bodies
   like KYC document uploads (passed through untouched). Returns the parsed JSON + status;
   throws CosmosApiError on a non-2xx so callers map it to a clean error. */
export async function proxyCosmosRequest(opts: {
  userId: string;
  env: CosmosEnv;
  path: string; // upstream path WITHOUT the /v1 prefix, e.g. "kyc/receivers/re_x/wallets"
  method: string;
  searchParams?: URLSearchParams;
  // Forward the incoming request's body verbatim (JSON or multipart). Mutually
  // exclusive with `bodyJson`, which forwards an already-parsed JSON value (use it
  // when the caller consumed the request body, e.g. to validate it first).
  request?: Request;
  bodyJson?: unknown;
  // The signed-in account's platform role ("owner" / "admin"), set for the global
  // owner-only admin endpoints. Callers MUST have verified the account holds it first --
  // this only forwards the label for the Payments service's audit trail, it neither
  // decides nor unlocks anything. What admits the call there is the pair every request
  // from this service already carries: the gateway secret plus X-Cosmos-Internal, which
  // APISIX strips from client requests. There is no separate admin secret any more.
  adminRole?: string;
  // Extra trusted, server-to-server headers (e.g. role-derived cooldowns). These are only
  // honored upstream alongside X-Cosmos-Internal, which APISIX strips from client requests,
  // so an external API key can never forge them. Never use for caller-controlled values.
  extraHeaders?: Record<string, string>;
}): Promise<{ status: number; json: any }> {
  assertNoTraversal(opts.path);
  const url = new URL(`${baseUrl()}/v1/${opts.path.replace(/^\/+/, "")}`);
  if (opts.searchParams) {
    for (const [k, v] of opts.searchParams) {
      // `org`/`env` are dashboard control params, not upstream query.
      if (k === "org" || k === "env") continue;
      url.searchParams.set(k, v);
    }
  }

  const method = opts.method.toUpperCase();

  const headers: Record<string, string> = {
    "X-Consumer-Username": consumerUsername(opts.userId),
    "X-Consumer-Env": opts.env,
    "X-Consumer-Role": "admin",
    "X-Cosmos-Internal": "1",
  };
  if (COSMOS_GATEWAY_SECRET) headers["X-Gateway-Secret"] = COSMOS_GATEWAY_SECRET;
  if (opts.adminRole) headers["X-Cosmos-Admin-Role"] = opts.adminRole;
  if (opts.extraHeaders) {
    for (const [k, v] of Object.entries(opts.extraHeaders)) headers[k] = v;
  }

  let body: BodyInit | undefined;
  if (method !== "GET" && method !== "HEAD" && method !== "DELETE") {
    if (opts.bodyJson !== undefined) {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(opts.bodyJson);
    } else if (opts.request) {
      const contentType = opts.request.headers.get("content-type") ?? "";
      if (contentType.includes("application/json")) {
        const text = await opts.request.text();
        headers["Content-Type"] = "application/json";
        body = text && text.trim() ? text : undefined;
      } else if (contentType) {
        // multipart/form-data, etc. (e.g. KYC document upload) — forward as-is.
        headers["Content-Type"] = contentType;
        body = await opts.request.arrayBuffer();
      }
    }
  }

  let res: Response;
  try {
    res = await fetch(url, { method, headers, body });
  } catch {
    throw new CosmosApiError("Could not reach the Payments service", 502);
  }

  let json: any = null;
  try {
    json = await res.json();
  } catch {
    /* empty / non-JSON */
  }
  if (!res.ok) {
    const msg =
      (json && (json.message || (Array.isArray(json.message) ? json.message.join(", ") : null))) ||
      `Payments request failed (${res.status})`;
    throw new CosmosApiError(typeof msg === "string" ? msg : `Payments request failed (${res.status})`, res.status);
  }
  return { status: res.status, json };
}

/* ---- Entity shape returned by the Payments API (see its OpenAPI spec). ---- */
export interface PaymentIntent {
  id: string;
  kind: "TX" | "PAY";
  status: "PENDING" | "SUBMITTED" | "SUCCEEDED" | "FAILED" | "CANCELLED" | "EXPIRED";
  network: string;
  source: string | null;
  destination: string;
  amount: string | null;
  asset: string;
  assetIssuer: string | null;
  memo: string;
  msg: string | null;
  callback: string | null;
  xdr: string | null;
  uri: string;      // SEP-7 deep link
  qr: string;       // PNG data URL of the SEP-7 URI
  txHash: string | null;
  reference: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentIntentList {
  data: PaymentIntent[];
  total: number;
  take: number;
  skip: number;
}

export interface CreatePayInput {
  destination: string;
  amount?: string;
  assetCode?: string;
  assetIssuer?: string;
  memo?: string;
  msg?: string;
  callback?: string;
}

export interface CreateTxInput extends CreatePayInput {
  source: string;
  amount: string;
}

export interface ListIntentsQuery {
  status?: string;
  take?: number;
  skip?: number;
}

/* ---- High-level operations, each scoped to a user's consumer. ---- */
export const cosmos = {
  /** SEP-7 `pay` intent — no source, just a payment link + QR (no XDR). */
  createPay: (userId: string, env: CosmosEnv, input: CreatePayInput) =>
    cosmosFetch<PaymentIntent>(userId, env, "/v1/payment-intents/pay", { method: "POST", body: input }),

  /** SEP-7 `tx` intent — source known, returns an unsigned XDR + tx URI + QR. */
  createTx: (userId: string, env: CosmosEnv, input: CreateTxInput) =>
    cosmosFetch<PaymentIntent>(userId, env, "/v1/payment-intents/tx", { method: "POST", body: input }),

  list: (userId: string, env: CosmosEnv, query: ListIntentsQuery = {}) =>
    cosmosFetch<PaymentIntentList>(userId, env, "/v1/payment-intents", { query: { status: query.status, take: query.take, skip: query.skip } }),

  get: (userId: string, env: CosmosEnv, id: string) =>
    cosmosFetch<PaymentIntent>(userId, env, `/v1/payment-intents/${encodeURIComponent(id)}`),

  update: (userId: string, env: CosmosEnv, id: string, patch: { status?: string; txHash?: string; reference?: string }) =>
    cosmosFetch<PaymentIntent>(userId, env, `/v1/payment-intents/${encodeURIComponent(id)}`, { method: "PATCH", body: patch }),

  remove: (userId: string, env: CosmosEnv, id: string) =>
    cosmosFetch<{ id: string; deleted: boolean }>(userId, env, `/v1/payment-intents/${encodeURIComponent(id)}`, { method: "DELETE" }),

  validate: (userId: string, env: CosmosEnv, id: string, txHash: string) =>
    cosmosFetch<{ valid: boolean; status: string; reason: string | null; paymentIntent?: PaymentIntent }>(
      userId, env, `/v1/payment-intents/${encodeURIComponent(id)}/validate`, { method: "POST", body: { txHash } }),
};

/* ---- Webhook endpoints (integrator notifications). ---- */
export interface WebhookEndpoint {
  id: string;
  url: string;
  description: string | null;
  enabled: boolean;
  eventTypes: string[];
  createdAt: string;
  updatedAt: string;
  secret?: string; // only returned on create / rotate
}

export const cosmosWebhooks = {
  list: (userId: string, env: CosmosEnv) =>
    cosmosFetch<WebhookEndpoint[]>(userId, env, "/v1/webhooks"),
  get: (userId: string, env: CosmosEnv, id: string) =>
    cosmosFetch<WebhookEndpoint>(userId, env, `/v1/webhooks/${encodeURIComponent(id)}`),
  create: (userId: string, env: CosmosEnv, body: { url: string; description?: string; eventTypes?: string[] }) =>
    cosmosFetch<WebhookEndpoint>(userId, env, "/v1/webhooks", { method: "POST", body }),
  update: (userId: string, env: CosmosEnv, id: string, body: { url?: string; description?: string; enabled?: boolean; eventTypes?: string[] }) =>
    cosmosFetch<WebhookEndpoint>(userId, env, `/v1/webhooks/${encodeURIComponent(id)}`, { method: "PATCH", body }),
  remove: (userId: string, env: CosmosEnv, id: string) =>
    cosmosFetch<{ id: string; deleted: boolean }>(userId, env, `/v1/webhooks/${encodeURIComponent(id)}`, { method: "DELETE" }),
  rotateSecret: (userId: string, env: CosmosEnv, id: string) =>
    cosmosFetch<WebhookEndpoint>(userId, env, `/v1/webhooks/${encodeURIComponent(id)}/rotate-secret`, { method: "POST" }),
  ping: (userId: string, env: CosmosEnv, id: string) =>
    cosmosFetch<{ ok: boolean; responseStatus: number | null; error: string | null }>(userId, env, `/v1/webhooks/${encodeURIComponent(id)}/ping`, { method: "POST" }),
  deliveries: (userId: string, env: CosmosEnv, id: string, query: { status?: string; take?: number; skip?: number } = {}) =>
    cosmosFetch<{ data: any[]; total: number; take: number; skip: number }>(userId, env, `/v1/webhooks/${encodeURIComponent(id)}/deliveries`, { query: { status: query.status, take: query.take, skip: query.skip } }),
  redeliver: (userId: string, env: CosmosEnv, id: string, deliveryId: string) =>
    cosmosFetch<any>(userId, env, `/v1/webhooks/${encodeURIComponent(id)}/deliveries/${encodeURIComponent(deliveryId)}/redeliver`, { method: "POST" }),
};

/* ---- Products (catalog items / price links). ---- */
export interface Product {
  id: string;
  name: string;
  description: string | null;
  amount: string | null;
  asset: string;
  kind: string;
  active: boolean;
  reference: string | null;
  createdAt: string;
  updatedAt: string;
}

export const cosmosProducts = {
  list: (userId: string, env: CosmosEnv) =>
    cosmosFetch<{ data: Product[]; total: number }>(userId, env, "/v1/products"),
  create: (userId: string, env: CosmosEnv, body: Partial<Product> & { name: string; assetCode?: string }) =>
    cosmosFetch<Product>(userId, env, "/v1/products", { method: "POST", body }),
  update: (userId: string, env: CosmosEnv, id: string, body: Record<string, unknown>) =>
    cosmosFetch<Product>(userId, env, `/v1/products/${encodeURIComponent(id)}`, { method: "PATCH", body }),
  remove: (userId: string, env: CosmosEnv, id: string) =>
    cosmosFetch<{ id: string; deleted: boolean }>(userId, env, `/v1/products/${encodeURIComponent(id)}`, { method: "DELETE" }),
};

/* ---- Customers (merchant-managed, with derived payment stats). ---- */
export interface Customer {
  id: string;
  name: string;
  alias: string | null;
  note: string | null;
  email: string | null;
  account: string | null;
  reference: string | null;
  payments?: number;
  succeeded?: number;
  total?: string;
  createdAt: string;
  updatedAt: string;
}

export const cosmosCustomers = {
  list: (userId: string, env: CosmosEnv) =>
    cosmosFetch<{ data: Customer[]; total: number }>(userId, env, "/v1/customers"),
  create: (userId: string, env: CosmosEnv, body: { name: string; alias?: string; note?: string; email?: string; account?: string; reference?: string }) =>
    cosmosFetch<Customer>(userId, env, "/v1/customers", { method: "POST", body }),
  update: (userId: string, env: CosmosEnv, id: string, body: Record<string, unknown>) =>
    cosmosFetch<Customer>(userId, env, `/v1/customers/${encodeURIComponent(id)}`, { method: "PATCH", body }),
  remove: (userId: string, env: CosmosEnv, id: string) =>
    cosmosFetch<{ id: string; deleted: boolean }>(userId, env, `/v1/customers/${encodeURIComponent(id)}`, { method: "DELETE" }),
};

/* ---- Same-chain swaps: Stellar path payments by default, Solana through Jupiter and
   Monad through Kuru Flow with `chain`. The Payments API quotes, builds the unsigned
   transaction, and relays the signed one. The swap commission is the calling org's
   plan rate — passed via the trusted X-Plan-Swap-Fee-Bps header (orgSwapContext),
   never in the body, so it can't be bypassed. ---- */
export type SwapChain = "stellar" | "solana" | "monad";
export interface SwapAssetAmount {
  asset: string;
  issuer: string | null;
  amount: string;
}
export interface SwapQuote {
  network: string;
  /** Solana and Monad quotes only. */
  chain?: "solana" | "monad";
  provider?: "jupiter" | "kuru";
  source: SwapAssetAmount;
  fee: { asset: string; issuer: string | null; amount: string; bps: number; wallet: string | null };
  swap: SwapAssetAmount;
  destination: { asset: string; issuer: string | null; estimated: string; minimum: string; slippageBps: number };
  path: { code: string; issuer: string | null }[];
}
export interface Swap {
  id: string;
  status: "PENDING" | "SUBMITTED" | "SUCCEEDED" | "FAILED" | "EXPIRED";
  network: string;
  source: string;
  destination: string;
  sendAsset: string;
  sendAssetIssuer: string | null;
  sendAmount: string;
  feeAmount: string;
  feeBps: number;
  swapAmount: string;
  destAsset: string;
  destAssetIssuer: string | null;
  destEstimated: string;
  destMin: string;
  slippageBps: number;
  path: { code: string; issuer: string | null }[];
  memo: string | null;
  /** On-chain commission label ("Cosmos Swap Commission") when one was taken. */
  commissionMemo: string | null;
  xdr: string;
  uri: string;
  txHash: string;
  qr: string;
  createdAt: string;
  updatedAt: string;
}
/** A Solana (Jupiter) or Monad (Kuru Flow) swap. */
export interface ChainSwap {
  id: string;
  chain: "solana" | "monad";
  network: string;
  provider: "jupiter" | "kuru";
  status: Swap["status"];
  source: string;
  sendAsset: string;
  sendAmount: string;
  destAsset: string;
  destEstimated: string;
  destMin: string;
  feeBps: number;
  /** In the destination asset: taken from the output. */
  feeAmount: string;
  slippageBps: number;
  path: { code: string; issuer: string | null }[];
  /** Solana: { encoding: "base64", data }; Monad: { to, data, value, chainId }. */
  transaction: Record<string, unknown>;
  /** Monad ERC-20 sales with a short allowance: the approve call to send first. */
  approval: Record<string, unknown> | null;
  txHash: string | null;
  idempotencyKey: string | null;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}
export interface SwapList {
  data: (Swap | ChainSwap)[];
  total: number;
  take: number;
  skip: number;
}
export interface SwapSubmitOutcome {
  submitted: boolean;
  status: Swap["status"];
  txHash?: string;
  reason?: string;
  resultCodes?: string[];
  swap: Swap | ChainSwap;
}
export interface QuoteSwapInput {
  chain?: SwapChain;
  amount: string;
  sourceAssetCode?: string;
  sourceAssetIssuer?: string;
  destAssetCode: string;
  destAssetIssuer?: string;
  slippageBps?: number;
}
export interface CreateSwapInput extends QuoteSwapInput {
  source: string;
  destination?: string;
  memo?: string;
}

/* Each method takes the org + the org plan's swapFeeBps (resolved by the route via
   orgSwapContext) — the fee is never sourced from the caller's body. */
export const cosmosSwaps = {
  quote: (userId: string, env: CosmosEnv, org: string, swapFeeBps: number, body: QuoteSwapInput) =>
    cosmosFetch<SwapQuote>(userId, env, "/v1/swaps/quote", { method: "POST", body, org, swapFeeBps }),
  create: (userId: string, env: CosmosEnv, org: string, swapFeeBps: number, body: CreateSwapInput) =>
    cosmosFetch<Swap | ChainSwap>(userId, env, "/v1/swaps", { method: "POST", body, org, swapFeeBps }),
  list: (userId: string, env: CosmosEnv, org: string, query: { chain?: SwapChain; status?: string; take?: number; skip?: number } = {}) =>
    cosmosFetch<SwapList>(userId, env, "/v1/swaps", { query: { chain: query.chain, status: query.status, take: query.take, skip: query.skip }, org }),
  get: (userId: string, env: CosmosEnv, org: string, id: string) =>
    cosmosFetch<Swap | ChainSwap>(userId, env, `/v1/swaps/${encodeURIComponent(id)}`, { org }),
  /** `{ signedXdr }` for a Stellar swap, `{ signedTransaction }` for Solana / Monad. */
  submit: (userId: string, env: CosmosEnv, org: string, id: string, body: { signedXdr: string } | { signedTransaction: string }) =>
    cosmosFetch<SwapSubmitOutcome>(userId, env, `/v1/swaps/${encodeURIComponent(id)}/submit`, { method: "POST", body, org }),
};

/* ---- Cross-chain swaps between Stellar, Solana and Monad, settled by NEAR Intents.
   Mainnet only upstream: a dev key can list assets and quote, creating is refused.
   The commission is the org plan's rate, via the same trusted header as swaps. ---- */
export interface CrossChainAsset {
  chain: SwapChain;
  symbol: string;
  assetId: string;
  decimals: number;
  contract: string | null;
}
export interface CrossChainQuote {
  network: string;
  origin: { chain: SwapChain; asset: string; assetId: string; contract: string | null; amount: string; amountUsd: string | null };
  destination: { chain: SwapChain; asset: string; assetId: string; contract: string | null; amount: string; amountUsd: string | null; minimum: string };
  fee: { bps: number; amount: string; asset: string };
  slippageBps: number;
  timeEstimateSeconds: number;
}
export interface CrossChainSwap {
  id: string;
  status: "AWAITING_DEPOSIT" | "DEPOSIT_DETECTED" | "INCOMPLETE_DEPOSIT" | "PROCESSING" | "SUCCEEDED" | "REFUNDED" | "FAILED" | "EXPIRED";
  providerStatus: string;
  network: string;
  originChain: SwapChain;
  originAsset: string;
  originContract: string | null;
  destinationChain: SwapChain;
  destinationAsset: string;
  destinationContract: string | null;
  amountIn: string;
  feeBps: number;
  feeAmount: string;
  amountOutEstimated: string;
  amountOutMin: string;
  slippageBps: number;
  recipient: string;
  refundTo: string;
  depositAddress: string;
  depositMemo: string | null;
  depositUri: string;
  qr?: string;
  depositTxHash: string | null;
  amountOut: string | null;
  refundedAmount: string | null;
  originTxHashes: { hash: string; explorerUrl: string }[] | null;
  destinationTxHashes: { hash: string; explorerUrl: string }[] | null;
  timeEstimateSeconds: number;
  correlationId: string;
  quoteSignature: string;
  idempotencyKey: string | null;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}
export interface CrossChainSwapList {
  data: CrossChainSwap[];
  total: number;
  take: number;
  skip: number;
}
export interface CrossChainSwapInput {
  originChain: SwapChain;
  originAsset: string;
  destinationChain: SwapChain;
  destinationAsset: string;
  amount: string;
  recipient: string;
  refundTo: string;
  slippageBps?: number;
}

export const cosmosCrossChainSwaps = {
  assets: (userId: string, env: CosmosEnv, org: string) =>
    cosmosFetch<{ data: CrossChainAsset[] }>(userId, env, "/v1/cross-chain-swaps/assets", { org }),
  quote: (userId: string, env: CosmosEnv, org: string, swapFeeBps: number, body: CrossChainSwapInput) =>
    cosmosFetch<CrossChainQuote>(userId, env, "/v1/cross-chain-swaps/quote", { method: "POST", body, org, swapFeeBps }),
  create: (userId: string, env: CosmosEnv, org: string, swapFeeBps: number, body: CrossChainSwapInput) =>
    cosmosFetch<CrossChainSwap>(userId, env, "/v1/cross-chain-swaps", { method: "POST", body, org, swapFeeBps }),
  list: (userId: string, env: CosmosEnv, org: string, query: { status?: string; take?: number; skip?: number } = {}) =>
    cosmosFetch<CrossChainSwapList>(userId, env, "/v1/cross-chain-swaps", { query: { status: query.status, take: query.take, skip: query.skip }, org }),
  get: (userId: string, env: CosmosEnv, org: string, id: string) =>
    cosmosFetch<CrossChainSwap>(userId, env, `/v1/cross-chain-swaps/${encodeURIComponent(id)}`, { org }),
  reportDeposit: (userId: string, env: CosmosEnv, org: string, id: string, txHash: string) =>
    cosmosFetch<CrossChainSwap>(userId, env, `/v1/cross-chain-swaps/${encodeURIComponent(id)}/deposit`, { method: "POST", body: { txHash }, org }),
};

/* ---- Stellar AMM liquidity pools. Non-custodial like swaps: the Payments API
   prices a deposit/withdraw against the pool's on-chain reserves, builds the
   unsigned XDR (plus a pool-share changeTrust when needed) and relays the signed
   envelope. Liquidity operations carry the same plan commission as swaps,
   skimmed from both assets and reported in the fee* fields. ---- */
export interface LiquidityReserve {
  asset: string;
  issuer: string | null;
  amount: string;
}
export interface LiquidityPool {
  id: string;
  network: string;
  feeBp: number;
  totalTrustlines: string;
  totalShares: string;
  reserves: LiquidityReserve[];
}
export interface LiquidityPoolList {
  data: LiquidityPool[];
  cursor: string | null;
}
export interface LiquidityPosition {
  poolId: string;
  shares: string;
  totalShares: string;
  shareOfPoolBps: number;
  reserves: LiquidityReserve[];
  redeemable: LiquidityReserve[];
}
export interface LiquidityPositionList {
  account: string;
  network: string;
  data: LiquidityPosition[];
}
export interface LiquidityOperation {
  id: string;
  kind: "DEPOSIT" | "WITHDRAW";
  status: Swap["status"];
  network: string;
  source: string;
  poolId: string;
  assetA: string;
  assetAIssuer: string | null;
  assetB: string;
  assetBIssuer: string | null;
  amountA: string;
  amountB: string;
  shares: string | null;
  minPrice: string | null;
  maxPrice: string | null;
  slippageBps: number;
  /** Plan commission (bps) taken from both assets — 0 when none applies. */
  feeBps: number;
  feeAmountA: string;
  feeAmountB: string;
  feeWallet: string | null;
  /** On-chain commission label ("Cosmos Liquidity Commission") when taken. */
  commissionMemo: string | null;
  xdr: string;
  uri: string;
  txHash: string;
  qr: string;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}
export interface LiquidityOperationList {
  data: LiquidityOperation[];
  total: number;
  take: number;
  skip: number;
}
export interface LiquiditySubmitOutcome {
  submitted: boolean;
  status: LiquidityOperation["status"];
  txHash?: string;
  reason?: string;
  resultCodes?: string[];
  operation: LiquidityOperation;
}
export interface DepositLiquidityInput {
  source: string;
  assetACode?: string;
  assetAIssuer?: string;
  assetBCode?: string;
  assetBIssuer?: string;
  maxAmountA: string;
  maxAmountB?: string;
  slippageBps?: number;
  memo?: string;
}
export interface WithdrawLiquidityInput {
  source: string;
  poolId: string;
  shares: string;
  slippageBps?: number;
  memo?: string;
}

export const cosmosLiquidity = {
  pools: (
    userId: string,
    env: CosmosEnv,
    org: string,
    query: { assetACode?: string; assetAIssuer?: string; assetBCode?: string; assetBIssuer?: string; account?: string; cursor?: string; limit?: number } = {},
  ) =>
    cosmosFetch<LiquidityPoolList>(userId, env, "/v1/liquidity-pools", { query: { ...query }, org }),
  pool: (userId: string, env: CosmosEnv, org: string, id: string) =>
    cosmosFetch<LiquidityPool>(userId, env, `/v1/liquidity-pools/${encodeURIComponent(id)}`, { org }),
  positions: (userId: string, env: CosmosEnv, org: string, account: string) =>
    cosmosFetch<LiquidityPositionList>(userId, env, "/v1/liquidity-pools/positions", { query: { account }, org }),
  deposit: (userId: string, env: CosmosEnv, org: string, body: DepositLiquidityInput) =>
    cosmosFetch<LiquidityOperation>(userId, env, "/v1/liquidity-pools/deposit", { method: "POST", body, org }),
  withdraw: (userId: string, env: CosmosEnv, org: string, body: WithdrawLiquidityInput) =>
    cosmosFetch<LiquidityOperation>(userId, env, "/v1/liquidity-pools/withdraw", { method: "POST", body, org }),
  operations: (userId: string, env: CosmosEnv, org: string, query: { kind?: string; status?: string; take?: number; skip?: number } = {}) =>
    cosmosFetch<LiquidityOperationList>(userId, env, "/v1/liquidity-pools/operations", { query: { ...query }, org }),
  operation: (userId: string, env: CosmosEnv, org: string, id: string) =>
    cosmosFetch<LiquidityOperation>(userId, env, `/v1/liquidity-pools/operations/${encodeURIComponent(id)}`, { org }),
  submit: (userId: string, env: CosmosEnv, org: string, id: string, signedXdr: string) =>
    cosmosFetch<LiquiditySubmitOutcome>(userId, env, `/v1/liquidity-pools/operations/${encodeURIComponent(id)}/submit`, { method: "POST", body: { signedXdr }, org }),
};

/* ---- Read-only dashboard aggregates. ---- */
export const cosmosAnalytics = {
  summary: (userId: string, env: CosmosEnv) => cosmosFetch<any>(userId, env, "/v1/summary"),
  balances: (userId: string, env: CosmosEnv) => cosmosFetch<{ data: any[]; total: number }>(userId, env, "/v1/balances"),
  apiLogs: (userId: string, env: CosmosEnv) => cosmosFetch<{ data: any[]; total: number }>(userId, env, "/v1/logs"),
  webhookLogs: (userId: string, env: CosmosEnv) => cosmosFetch<{ data: any[]; total: number }>(userId, env, "/v1/logs/webhooks"),
};

/* ---- Client activity (telemetry reported by the wallet + this dashboard). ----
   The write side is buffered in @/lib/activity; these are the raw calls. Scoped
   `activity:write` / `activity:read` upstream, so the internal gateway identity
   this module presents (role `admin`) satisfies them the same way it does the
   payments scopes. */
export interface ActivityEventPayload {
  type: string;
  source?: string;
  level?: string;
  category?: string;
  message?: string;
  props?: Record<string, unknown>;
  durationMs?: number;
  sessionId?: string;
  distinctId?: string;
  appVersion?: string;
  platform?: string;
  network?: string;
  occurredAt?: string;
  eventId?: string;
}

export interface ActivityQuery {
  source?: string;
  level?: string;
  category?: string;
  type?: string;
  network?: string;
  since?: string;
  until?: string;
  take?: number;
  skip?: number;
}

export const cosmosActivity = {
  /* Report a batch. `clientIp` is only set for the anonymous wallet path, where
     the address that matters is the wallet's and not this process's. */
  ingest: (userId: string, env: CosmosEnv, events: ActivityEventPayload[], clientIp?: string) =>
    cosmosFetch<{ accepted: number; duplicates: number }>(userId, env, "/v1/activity/events", {
      method: "POST",
      body: { events },
      clientIp,
    }),

  list: (userId: string, env: CosmosEnv, query: ActivityQuery = {}) =>
    cosmosFetch<{ data: any[]; total: number; take: number; skip: number }>(userId, env, "/v1/activity/events", {
      query: { ...query },
    }),

  summary: (userId: string, env: CosmosEnv, query: { days?: number; source?: string } = {}) =>
    cosmosFetch<any>(userId, env, "/v1/activity/summary", { query: { ...query } }),
};

/* ------------------------------ asset registry ----------------------------- */

