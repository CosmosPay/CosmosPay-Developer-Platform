/* The chain reads some proofs need, over each network's public node API. Server-only. The URLs
   come from the environment (WALLET_PROOF_*_RPC_URL, astro.config.mjs) and default to public
   mainnet endpoints:
   - NEAR (`query` view_access_key / view_account over JSON-RPC): whether the signing key is a
     full-access key of the account.
   - Aptos and Movement (REST `GET /accounts/{address}`): the account's authentication key.
   - Starknet (`starknet_call` over JSON-RPC): the account's own signature check.
   A node that cannot be reached, or answers what is not its API, throws ProofNetworkError: the
   route says the network could not be reached (and to try again), never that the proof failed. */
import type { NearRpc } from "@/lib/wallet-proofs/near";
import type { AptosAuthKeyReader } from "@/lib/wallet-proofs/aptos";
import type { StarknetCall } from "@/lib/wallet-proofs/starknet";

export class ProofNetworkError extends Error {}

const TIMEOUT_MS = 8000;

async function fetchJson(url: string, init?: RequestInit): Promise<{ status: number; body: unknown }> {
  let res: Response;
  try {
    res = await fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS), headers: { accept: "application/json", ...(init?.body ? { "content-type": "application/json" } : {}) } });
  } catch (err) {
    throw new ProofNetworkError(`Could not reach ${new URL(url).host}: ${(err as Error)?.message ?? "network error"}`);
  }
  const text = await res.text().catch(() => "");
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    throw new ProofNetworkError(`${new URL(url).host} answered ${res.status} with no JSON`);
  }
  return { status: res.status, body };
}

async function jsonRpc(url: string, method: string, params: unknown): Promise<{ result?: unknown; error?: unknown }> {
  const { status, body } = await fetchJson(url, { method: "POST", body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }) });
  if (!body || typeof body !== "object" || (!("result" in body) && !("error" in body))) {
    throw new ProofNetworkError(`${new URL(url).host} answered ${status} without a JSON-RPC result`);
  }
  return body as { result?: unknown; error?: unknown };
}

export function nearRpc(url: string): NearRpc {
  return async (method, params) => {
    const answer = await jsonRpc(url, method, params);
    // A node's internal or timeout errors are not an answer about the account.
    const name = (answer.error as { name?: string; cause?: { name?: string } } | undefined)?.cause?.name;
    if (answer.error && name && /TIMEOUT|INTERNAL|NO_SYNCED|UNAVAILABLE/i.test(name)) throw new ProofNetworkError(`NEAR node error: ${name}`);
    return answer as Awaited<ReturnType<NearRpc>>;
  };
}

export function aptosAuthKeyReader(baseUrl: string): AptosAuthKeyReader {
  const base = baseUrl.replace(/\/+$/, "");
  return async (address) => {
    const { status, body } = await fetchJson(`${base}/accounts/${encodeURIComponent(address)}`);
    if (status === 404) return null;
    const key = (body as { authentication_key?: unknown } | null)?.authentication_key;
    if (status === 200 && typeof key === "string") return key;
    throw new ProofNetworkError(`Aptos node answered ${status}`);
  };
}

export function starknetCaller(url: string): StarknetCall {
  return async (contract, selector, calldata) => {
    const answer = await jsonRpc(url, "starknet_call", { request: { contract_address: contract, entry_point_selector: selector, calldata }, block_id: "latest" });
    // An error here is the contract's (not deployed, no such entry point, reverted): no answer.
    if (answer.error) return null;
    return Array.isArray(answer.result) && answer.result.every((x) => typeof x === "string") ? (answer.result as string[]) : null;
  };
}
