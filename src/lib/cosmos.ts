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

export type CosmosEnv = "dev" | "prod";

/** The APISIX consumer username that owns a user's payment intents. */
function consumerUsername(userId: string): string {
  return userId.includes(keyPrefix) ? userId : `${keyPrefix}${userId}`;
}

function baseUrl(): string {
  return COSMOS_API_URL.replace(/\/+$/, "");
}

export class CosmosApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "CosmosApiError";
    this.status = status;
  }
}

/* Low-level request. Attaches the gateway headers + consumer identity and unwraps
   the JSON body. Throws CosmosApiError (carrying the upstream status + message) on
   any non-2xx response so callers can surface a clean error. */
async function cosmosFetch<T>(
  userId: string,
  env: CosmosEnv,
  path: string,
  init: { method?: string; body?: unknown; query?: Record<string, string | number | undefined> } = {},
): Promise<T> {
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

/* ---- Read-only dashboard aggregates. ---- */
export const cosmosAnalytics = {
  summary: (userId: string, env: CosmosEnv) => cosmosFetch<any>(userId, env, "/v1/summary"),
  balances: (userId: string, env: CosmosEnv) => cosmosFetch<{ data: any[]; total: number }>(userId, env, "/v1/balances"),
  apiLogs: (userId: string, env: CosmosEnv) => cosmosFetch<{ data: any[]; total: number }>(userId, env, "/v1/logs"),
  webhookLogs: (userId: string, env: CosmosEnv) => cosmosFetch<{ data: any[]; total: number }>(userId, env, "/v1/logs/webhooks"),
};
