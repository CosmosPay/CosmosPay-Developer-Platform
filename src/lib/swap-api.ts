/* What the swap widget and the swap screens call, in two flavours with the same bodies (the
   Payments API's):
   - orgSwapApi: the dashboard's, through the platform's proxies under /api, for an organization in
     an environment (its plan's commission, its members' permissions).
   - publicSwapApi: the public swap pages', straight to the gateway from the visitor's browser with
     the shared public key (GET /v1/public-key, keyless), so no account is needed. Its commission is
     the public consumer's plan, and the server confines the key to building, submitting and reading
     a swap by its id, never listing anyone's. Every visitor shares that key, so a record it creates
     comes back with a `publicToken`; only the visitor holding it can read, submit or report that
     record (`X-Record-Token`), and the token lives in this page's memory, never in the URL. Mainnet.
   Routes: "dex" a chain's own market (/v1/swaps), "near" NEAR Intents (/v1/cross-chain-swaps),
   "usdt0" LayerZero's OFT out of Stellar (/v1/usdt0). Records: "same", "cross", "usdt0". */
import { crossChainSwaps as crossApi, swaps as swapsApi, usdt0 as usdt0Api } from "@/lib/api-client";
import type { NearAsset } from "@/lib/swap-catalog";
import type { Usdt0Route } from "@/lib/usdt0";

export type SwapRouteKind = "dex" | "near" | "usdt0";
export type SwapRecordKind = "same" | "cross" | "usdt0";
type Body = Record<string, unknown>;

export interface SwapApi {
  assets(): Promise<NearAsset[]>;
  usdt0Routes(): Promise<Usdt0Route[]>;
  quote(kind: SwapRouteKind, body: Body): Promise<any>;
  create(kind: SwapRouteKind, body: Body): Promise<any>;
  get(kind: SwapRecordKind, id: string): Promise<any>;
  submit(kind: "same" | "usdt0", id: string, body: Record<string, string>): Promise<any>;
  reportDeposit(id: string, txHash: string): Promise<any>;
}

const asList = (res: unknown): NearAsset[] => {
  const r = res as { data?: unknown } | unknown[] | null;
  const list = Array.isArray(r) ? r : Array.isArray((r as { data?: unknown })?.data) ? (r as { data: unknown[] }).data : [];
  return list as NearAsset[];
};
const routesOf = (res: unknown) => ((res as { routes?: Usdt0Route[] } | null)?.routes ?? []);

export function orgSwapApi(orgId: string, env: string): SwapApi {
  const scoped = (body: Body) => ({ org: orgId, environment: env, ...body });
  return {
    assets: () => crossApi.assets(orgId, env).then(asList),
    usdt0Routes: () => usdt0Api.routes(orgId, env).then(routesOf),
    quote: (kind, body) => (kind === "near" ? crossApi.quote : kind === "usdt0" ? usdt0Api.quote : swapsApi.quote)(scoped(body)),
    create: (kind, body) => (kind === "near" ? crossApi.create : kind === "usdt0" ? usdt0Api.create : swapsApi.create)(scoped(body)),
    get: (kind, id) => (kind === "cross" ? crossApi.get : kind === "usdt0" ? usdt0Api.get : swapsApi.get)(id, orgId, env),
    submit: (kind, id, body) => (kind === "usdt0" ? usdt0Api.submit : swapsApi.submit)(id, orgId, env, body),
    reportDeposit: (id, txHash) => crossApi.reportDeposit(id, orgId, env, txHash),
  };
}

export class PublicSwapError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export function publicSwapApi(apiBase: string, env: "prod" | "dev" = "prod"): SwapApi {
  const base = apiBase.replace(/\/+$/, "");
  let key: Promise<string> | null = null;
  // The shared public key, fetched once per page; a failure is retried on the next call.
  const publicKey = () =>
    (key ??= fetch(`${base}/v1/public-key?env=${env}`, { headers: { accept: "application/json" }, cache: "no-store" })
      .then(async (r) => {
        const j = await r.json().catch(() => null);
        const k = (j?.data ?? j)?.apiKey;
        if (!r.ok || typeof k !== "string" || !k) throw new PublicSwapError(j?.message || "The public key is unavailable", r.status);
        return k;
      })
      .catch((e) => { key = null; throw e; }));
  // Each record's read token, from its create response.
  const tokens = new Map<string, string>();
  const call = async (path: string, init: { method?: string; body?: string; record?: string } = {}) => {
    const k = await publicKey();
    const token = init.record ? tokens.get(init.record) : undefined;
    const r = await fetch(`${base}${path}`, {
      method: init.method ?? "GET",
      body: init.body,
      headers: {
        accept: "application/json",
        ...(init.body ? { "content-type": "application/json" } : {}),
        authorization: `Bearer ${k}`,
        ...(token ? { "x-record-token": token } : {}),
      },
      cache: "no-store",
    });
    const j = await r.json().catch(() => null);
    if (!r.ok) throw new PublicSwapError(j?.message || `Request failed (${r.status})`, r.status);
    return j && typeof j === "object" && "data" in j ? j.data : j;
  };
  const post = (path: string, body: Body, record?: string) => call(path, { method: "POST", body: JSON.stringify(body), record });
  // A created record's token is kept for its later calls and not handed to the screens.
  const keep = (rec: any) => {
    if (rec && typeof rec.id === "string" && typeof rec.publicToken === "string") {
      tokens.set(rec.id, rec.publicToken);
      const { publicToken: _token, ...rest } = rec;
      return rest;
    }
    return rec;
  };
  const record = (kind: SwapRecordKind) => (kind === "cross" ? "cross-chain-swaps" : kind === "usdt0" ? "usdt0/transfers" : "swaps");
  return {
    assets: () => call("/v1/cross-chain-swaps/assets").then(asList),
    usdt0Routes: () => call("/v1/usdt0/routes").then(routesOf),
    quote: (kind, body) => post(kind === "near" ? "/v1/cross-chain-swaps/quote" : kind === "usdt0" ? "/v1/usdt0/quote" : "/v1/swaps/quote", body),
    create: (kind, body) => post(kind === "near" ? "/v1/cross-chain-swaps" : kind === "usdt0" ? "/v1/usdt0/transfers" : "/v1/swaps", body).then(keep),
    get: (kind, id) => call(`/v1/${record(kind)}/${encodeURIComponent(id)}`, { record: id }),
    submit: (kind, id, body) => post(`/v1/${record(kind)}/${encodeURIComponent(id)}/submit`, body, id),
    reportDeposit: (id, txHash) => post(`/v1/cross-chain-swaps/${encodeURIComponent(id)}/deposit`, { txHash }, id),
  };
}
