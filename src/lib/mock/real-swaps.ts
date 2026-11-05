/* Swaps are never sample data, not even in mock mode (product owner, 2026-11-04: "no uses mock en
   ningún momento para los swaps, esos deben ser reales"). Every swap call the mock API receives
   (the dashboard's swap form through /api, and the public swap pages through the mock gateway,
   which forwards to the same routes) is answered by the real Cosmos Pay gateway, server to
   server, with the shared public key of the call's environment: the token list and its prices,
   the quotes, the swaps opened (a real unsigned transaction a wallet can decode and sign, or a
   real deposit address), their state, the signed transaction and the deposit. "prod" is mainnet,
   "dev" the test networks, exactly as the gateway answers the public key.

   What that costs, and why it is so: there is no organization behind the sample account, so the
   gateway charges the public consumer's commission, never a plan's; a plan's rate needs a real
   account (production). The records the public key opens are kept here, with their read token,
   for this server's life: the lists show those and nothing sampled, and a record is read,
   submitted or reported only with its token, which never reaches the browser.

   The gateway is COSMOS_MOCK_SWAP_GATEWAY (the platform's PUBLIC_PAYMENTS_API_URL shape, ending
   at the gateway's entry), production's by default. */
import { ApiStatus, jsonError } from "@/lib/http";
import { created, ok, page, type MockEnv, type MockRequest } from "@/lib/mock/http";
import { mockStore } from "@/lib/mock/store";

export const REAL_SWAP_GATEWAY = (process.env.COSMOS_MOCK_SWAP_GATEWAY || "https://api.cosmospay.lat/cosmos-api").replace(/\/+$/, "");

export type RealRecordKind = "swaps" | "cross" | "usdt0";

/* The gateway's path for each kind of record. */
const RECORD_PATH: Record<RealRecordKind, string> = { swaps: "swaps", cross: "cross-chain-swaps", usdt0: "usdt0/transfers" };

/* Kept in the mock store (globalThis), so a dev reload does not forget the swaps opened or the
   tokens that read them. */
interface RealSwapState {
  keys: Map<MockEnv, Promise<string>>;
  tokens: Map<string, string>;
  records: Record<MockEnv, Record<RealRecordKind, any[]>>;
}
const kept = () => mockStore<RealSwapState>("real-swaps", () => ({
  keys: new Map(),
  tokens: new Map(),
  records: { dev: { swaps: [], cross: [], usdt0: [] }, prod: { swaps: [], cross: [], usdt0: [] } },
}));

/* The shared public key of an environment, asked once; a failure is asked again next time. */
function publicKey(env: MockEnv): Promise<string> {
  let k = kept().keys.get(env);
  if (!k) {
    k = fetch(`${REAL_SWAP_GATEWAY}/v1/public-key?env=${env}`, { headers: { accept: "application/json" } })
      .then(async (r) => {
        const j = await r.json().catch(() => null);
        const key = (j?.data ?? j)?.apiKey;
        if (!r.ok || typeof key !== "string" || !key) throw new Error(j?.message || `The gateway gave no public key (${r.status})`);
        return key;
      })
      .catch((e) => {
        kept().keys.delete(env);
        throw e;
      });
    kept().keys.set(env, k);
  }
  return k;
}

/** The environment a call is for: the body's `environment` (creates and quotes), else the query's. */
export function realEnv(req: MockRequest): MockEnv {
  const e = req.body?.environment;
  return e === "prod" ? "prod" : e === "dev" ? "dev" : req.env;
}

/* The body the gateway reads: the platform's own fields (the organization, the environment) are
   the platform's, not the Payments API's. */
function gatewayBody(body: Record<string, unknown> | null): string | undefined {
  if (!body) return undefined;
  const { org: _org, environment: _environment, ...rest } = body;
  return JSON.stringify(rest);
}

const STATUS_OF: Record<number, ApiStatus> = { 401: ApiStatus.UNAUTHORIZED, 403: ApiStatus.FORBIDDEN, 404: ApiStatus.NOT_FOUND, 409: ApiStatus.CONFLICT, 422: ApiStatus.UNPROCESSABLE };
const bad = (code: number, message: string) => jsonError({ message, code, status: code >= 500 ? ApiStatus.INTERNAL_ERROR : STATUS_OF[code] ?? ApiStatus.BAD_REQUEST });

/**
 * One swap call, answered by the real gateway in the platform's envelope.
 * `record`: the id of the record the call is about (its token rides along); `opens`: the kind of
 * record a create opens, kept with its token; `kind`: a read whose answer refreshes the kept one.
 */
export async function realSwap(
  req: MockRequest,
  path: string,
  opts: { record?: string; opens?: RealRecordKind; kind?: RealRecordKind } = {},
): Promise<Response> {
  const env = realEnv(req);
  const method = req.method.toUpperCase();
  let key: string;
  try {
    key = await publicKey(env);
  } catch (e) {
    return bad(502, `The Cosmos Pay gateway is not answering (${(e as Error).message}).`);
  }
  const token = opts.record ? kept().tokens.get(opts.record) : undefined;
  if (opts.record && !token) return bad(404, "Swap not found");
  const body = method === "GET" ? undefined : gatewayBody(req.body);
  let res: Response;
  try {
    res = await fetch(`${REAL_SWAP_GATEWAY}/v1/${path}`, {
      method,
      body,
      headers: {
        accept: "application/json",
        authorization: `Bearer ${key}`,
        ...(body ? { "content-type": "application/json" } : {}),
        ...(token ? { "x-record-token": token } : {}),
      },
    });
  } catch (e) {
    return bad(502, `The Cosmos Pay gateway is not answering (${(e as Error).message}).`);
  }
  const j = await res.json().catch(() => null);
  if (!res.ok) return bad(res.status, j?.message || `The gateway answered ${res.status}`);
  const data = j && typeof j === "object" && "data" in j ? j.data : j;

  if (opts.opens && data && typeof data.id === "string") {
    const { publicToken, ...rec } = data;
    if (typeof publicToken === "string") kept().tokens.set(rec.id, publicToken);
    const list = kept().records[env][opts.opens];
    const at = list.findIndex((r) => r.id === rec.id);
    if (at >= 0) list[at] = rec; else list.unshift(rec);
    return created(rec, j?.message);
  }
  if (opts.kind && data && typeof data.id === "string") {
    const list = kept().records[env][opts.kind];
    const at = list.findIndex((r) => r.id === data.id);
    if (at >= 0) list[at] = data;
  }
  return ok(data, j?.message);
}

/** The records the public key opened in an environment, as the lists answer (a status filter too). */
export function realList(req: MockRequest, kind: RealRecordKind, keep: (r: any) => boolean = () => true): Response {
  const status = req.url.searchParams.get("status");
  const rows = kept().records[req.env][kind].filter((r) => keep(r) && (!status || r.status === status));
  return ok(page(rows, req.url));
}

/** Every record the public key opened, of one kind, in both environments (the admin's lists). */
export function realRecords(kind: RealRecordKind): any[] {
  return [...kept().records.prod[kind], ...kept().records.dev[kind]];
}

/** The records of an environment with their kind (the activity charts). */
export function realRecordsOf(env: MockEnv): { kind: RealRecordKind; rec: any }[] {
  return (Object.keys(kept().records[env]) as RealRecordKind[]).flatMap((kind) => kept().records[env][kind].map((rec) => ({ kind, rec })));
}

/* How a record ended, whatever its kind spells it. */
const DONE = new Set(["SUCCEEDED", "DELIVERED", "COMPLETED"]);
const FAILED = new Set(["FAILED", "EXPIRED", "REFUNDED", "CANCELLED"]);
export const realOutcome = (status: unknown): "done" | "failed" | "open" => (DONE.has(String(status)) ? "done" : FAILED.has(String(status)) ? "failed" : "open");

/** The path of a record of `kind`, for its reads and actions. */
export const recordPath = (kind: RealRecordKind, id: string, action = "") => `${RECORD_PATH[kind]}/${encodeURIComponent(id)}${action ? `/${action}` : ""}`;
