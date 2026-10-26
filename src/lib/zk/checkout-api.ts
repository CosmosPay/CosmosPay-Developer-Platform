/* What the ZK pages read from the Payments API through the gateway's keyless route
   (`/v1/zk-checkout/*`, src/lib/apisix-keyless.ts), from the payer's or merchant's browser, never
   through this server: the community server budgets these calls per client address.

   This is a trust boundary, like parsePaymentLink: every field is checked before it reaches the
   page or the prover. A payment that fails a check is "error", never half-shown. The RPC URL must
   be https (the page sends signed transactions to it), the addresses must be Stellar accounts, the
   token a contract, the amounts plain decimals. Pure, so it is unit-tested (tests/unit/zkCheckoutApi.test.ts). */

export type ZkCheckoutStatus = "PENDING" | "SUCCEEDED" | "EXPIRED";

export interface ZkNetworkConfig {
  enabled: boolean;
  network: string;
  rpcUrl: string;
  networkPassphrase: string;
  token: { contractId: string; symbol: string; decimals: number; deployedAtLedger: number };
  verifier: string;
  auditorRegistry: string;
  auditorId: number;
  feeBps: number;
  feeAccount: string;
}

/** A merchant fee on a ZK payment: a third transfer, of `amount` XLM to `wallet`. */
export interface ZkMerchantFee {
  amount: string;
  wallet: string;
  paidBy: "recipient" | "payer";
}

export interface ZkCheckout extends ZkNetworkConfig {
  id: string;
  status: ZkCheckoutStatus;
  amount: string;
  netAmount: string;
  feeAmount: string;
  /** Null without one; with one, the payer makes three transfers, not two. */
  merchantFee: ZkMerchantFee | null;
  recipient: string;
  description: string | null;
  expiresAt: string;
  paymentTxHash: string | null;
  feeTxHash: string | null;
}

const ACCOUNT = /^G[A-Z2-7]{55}$/;
const CONTRACT = /^C[A-Z2-7]{55}$/;
const DECIMAL = /^\d+(\.\d{1,7})?$/;
const ID = /^[a-z0-9]{20,40}$/;
const TX = /^[0-9a-f]{64}$/;
const STATUSES: readonly ZkCheckoutStatus[] = ["PENDING", "SUCCEEDED", "EXPIRED"];

const obj = (v: unknown): Record<string, unknown> | null => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null);
/* The API answers inside its envelope `{ data, code, status, message }`; accept either. */
const unwrap = (json: unknown) => {
  const o = obj(json);
  return o && "data" in o && obj(o.data) ? obj(o.data) : o;
};
const str = (v: unknown, re?: RegExp) => (typeof v === "string" && (!re || re.test(v)) ? v : null);
const int = (v: unknown, min = 0) => (typeof v === "number" && Number.isInteger(v) && v >= min ? v : null);
const httpsUrl = (v: unknown) => {
  const s = str(v);
  if (!s) return null;
  try {
    const u = new URL(s);
    return u.protocol === "https:" ? s : null;
  } catch {
    return null;
  }
};

/** A network's ZK setup, or null when anything is malformed. `enabled: false` is valid. */
export function parseZkConfig(json: unknown): ZkNetworkConfig | null {
  const o = unwrap(json);
  if (!o || typeof o.enabled !== "boolean") return null;
  const token = obj(o.token);
  const cfg = {
    enabled: o.enabled,
    network: str(o.network),
    rpcUrl: httpsUrl(o.rpcUrl),
    networkPassphrase: str(o.networkPassphrase),
    token: token && {
      contractId: str(token.contractId, CONTRACT),
      symbol: str(token.symbol, /^[A-Z0-9]{1,12}$/),
      decimals: int(token.decimals),
      deployedAtLedger: int(token.deployedAtLedger),
    },
    verifier: str(o.verifier, CONTRACT),
    auditorRegistry: str(o.auditorRegistry, CONTRACT),
    auditorId: int(o.auditorId),
    feeBps: int(o.feeBps),
    feeAccount: str(o.feeAccount, ACCOUNT),
  };
  if (!cfg.enabled) return null;
  const t = cfg.token;
  if (!cfg.network || !cfg.rpcUrl || !cfg.networkPassphrase || !t || !t.contractId || !t.symbol || t.decimals === null || t.deployedAtLedger === null) return null;
  if (!cfg.verifier || !cfg.auditorRegistry || cfg.auditorId === null || cfg.feeBps === null || !cfg.feeAccount) return null;
  return cfg as ZkNetworkConfig;
}

/* The merchant fee, null when there is none, undefined when it is malformed: it is a transfer
   the payer makes, so a half-read one voids the whole payment. */
function parseZkMerchantFee(v: unknown): ZkMerchantFee | null | undefined {
  if (v === undefined || v === null) return null;
  const f = obj(v);
  if (!f) return undefined;
  const amount = str(f.amount, DECIMAL);
  const wallet = str(f.wallet, ACCOUNT);
  const paidBy = f.paidBy === "payer" || f.paidBy === "recipient" ? f.paidBy : null;
  if (!amount || !wallet || !paidBy || !/[1-9]/.test(amount)) return undefined;
  return { amount, wallet, paidBy };
}

/** The payer's view of one ZK payment, or null when anything is malformed or it is another id. */
export function parseZkCheckout(json: unknown, expectedId: string): ZkCheckout | null {
  const o = unwrap(json);
  if (!o) return null;
  const config = parseZkConfig({ ...o, enabled: true });
  const id = str(o.id, ID);
  const status = STATUSES.find((s) => s === o.status) ?? null;
  const amount = str(o.amount, DECIMAL);
  const netAmount = str(o.netAmount, DECIMAL);
  const feeAmount = str(o.feeAmount, DECIMAL);
  const recipient = str(o.recipient, ACCOUNT);
  const merchantFee = parseZkMerchantFee(o.merchantFee);
  if (merchantFee === undefined) return null;
  const expiresAt = str(o.expiresAt);
  if (!config || !id || id !== expectedId || !status || !amount || !netAmount || !feeAmount || !recipient || !expiresAt || !Number.isFinite(Date.parse(expiresAt))) return null;
  const description = o.description === null || o.description === undefined ? null : str(o.description);
  if (description !== null && description.length > 140) return null;
  const tx = (v: unknown) => (v === null || v === undefined ? null : str(v, TX));
  return {
    ...config,
    id,
    status,
    amount,
    netAmount,
    feeAmount,
    merchantFee,
    recipient,
    description,
    expiresAt,
    paymentTxHash: tx(o.paymentTxHash),
    feeTxHash: tx(o.feeTxHash),
  };
}

export type ZkFetch<T> = { kind: "ok"; value: T } | { kind: "not-found" } | { kind: "rate-limited"; retryAfterMs: number } | { kind: "error"; message?: string };

const base = (apiBase: string) => apiBase.replace(/\/+$/, "");

async function read<T>(res: Response, parse: (json: unknown) => T | null): Promise<ZkFetch<T>> {
  if (res.status === 404) return { kind: "not-found" };
  if (res.status === 429) {
    const seconds = Number(res.headers.get("retry-after"));
    return { kind: "rate-limited", retryAfterMs: Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : 30_000 };
  }
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const message = typeof obj(json)?.message === "string" ? (obj(json)!.message as string) : undefined;
    return { kind: "error", message };
  }
  const value = parse(json);
  return value ? { kind: "ok", value } : { kind: "error" };
}

export async function fetchZkCheckout(apiBase: string, id: string, fetchImpl: typeof fetch = fetch): Promise<ZkFetch<ZkCheckout>> {
  try {
    const res = await fetchImpl(`${base(apiBase)}/v1/zk-checkout/${encodeURIComponent(id)}`, { headers: { accept: "application/json" }, cache: "no-store" });
    return await read(res, (json) => parseZkCheckout(json, id));
  } catch {
    return { kind: "error" };
  }
}

export async function fetchZkConfig(apiBase: string, network: "testnet" | "public", fetchImpl: typeof fetch = fetch): Promise<ZkFetch<ZkNetworkConfig>> {
  try {
    const res = await fetchImpl(`${base(apiBase)}/v1/zk-checkout/config?network=${network}`, { headers: { accept: "application/json" }, cache: "no-store" });
    return await read(res, parseZkConfig);
  } catch {
    return { kind: "error" };
  }
}

/** Report the transfers that pay `id` (three with a merchant fee); the server checks each on-chain before it answers. */
export async function confirmZkCheckout(
  apiBase: string,
  id: string,
  hashes: { paymentTxHash: string; feeTxHash: string; merchantFeeTxHash?: string },
  fetchImpl: typeof fetch = fetch,
): Promise<ZkFetch<ZkCheckout>> {
  if (!Object.values(hashes).every((h) => h === undefined || TX.test(h))) return { kind: "error" };
  try {
    const res = await fetchImpl(`${base(apiBase)}/v1/zk-checkout/${encodeURIComponent(id)}/confirm`, {
      method: "POST",
      headers: { accept: "application/json", "content-type": "application/json" },
      body: JSON.stringify(hashes),
    });
    return await read(res, (json) => parseZkCheckout(json, id));
  } catch {
    return { kind: "error" };
  }
}
