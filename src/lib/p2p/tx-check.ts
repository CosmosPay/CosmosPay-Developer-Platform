/* tx-check.ts: a transaction the API built is checked before a wallet is asked to send it. The
   person approves it in their wallet, but a wallet shows a contract call as bytes, so the page
   checks what it can read first: the chain is the order's network, the target is the market
   contract of that network (or, for the approval before a sale, the token being sold), nothing
   is paid in the native coin, and the data is a call. Anything else is refused, never sent.
   Pure; tests/unit/p2pTxCheck.test.ts. */
import type { P2pNetwork, P2pTransaction } from "@/lib/p2p/types";

const ADDRESS = /^0x[0-9a-fA-F]{40}$/;
const DATA = /^0x[0-9a-fA-F]{8,}$/;
const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

export type TxProblem = "shape" | "chain" | "target" | "value";

/** Why `tx` must not be sent for `network` (null when it may). `approveToken` is the token an
    approval may target (a sale's first step); every other step targets the market contract. */
export function checkTransaction(tx: unknown, network: Pick<P2pNetwork, "chainId" | "contract" | "tokens">, approveToken?: string | null): TxProblem | null {
  const t = tx as Partial<P2pTransaction> | null;
  if (!t || typeof t !== "object" || typeof t.to !== "string" || !ADDRESS.test(t.to) || typeof t.data !== "string" || !DATA.test(t.data)) return "shape";
  if (t.chainId !== network.chainId) return "chain";
  if (t.value !== undefined && t.value !== "0" && t.value !== "0x0" && t.value !== "0x00") return "value";
  const isApprove = t.action === "approve" || t.description === "approve" || t.data.slice(0, 10).toLowerCase() === "0x095ea7b3";
  if (isApprove) {
    const token = approveToken ? network.tokens.find((x) => same(x.address, approveToken) || x.symbol === approveToken) : null;
    if (!token || !same(t.to, token.address)) return "target";
    // The spender (the first argument) must be the market contract.
    const spender = `0x${t.data.slice(10, 74).slice(-40)}`;
    return same(spender, network.contract) ? null : "target";
  }
  return same(t.to, network.contract) ? null : "target";
}

/** The wallet's chain description for `network`, so it can add a network it does not know. */
export function evmChainOf(network: Pick<P2pNetwork, "chainId" | "name" | "rpcUrl" | "nativeSymbol" | "explorer">) {
  if (!network.rpcUrl || !/^https:\/\//.test(network.rpcUrl)) return undefined;
  const symbol = network.nativeSymbol || "ETH";
  return {
    chainId: network.chainId,
    chainName: network.name,
    nativeCurrency: { name: symbol, symbol, decimals: 18 },
    rpcUrls: [network.rpcUrl],
    ...(network.explorer && /^https:\/\//.test(network.explorer) ? { blockExplorerUrls: [network.explorer] } : {}),
  };
}

/** A transaction's page on the network's explorer (https only), else null. */
export function explorerTx(network: Pick<P2pNetwork, "explorer"> | null | undefined, hash: string | null | undefined): string | null {
  if (!network?.explorer || !hash || !/^0x[0-9a-fA-F]{64}$/.test(hash) || !/^https:\/\//.test(network.explorer)) return null;
  return `${network.explorer.replace(/\/+$/, "")}/tx/${hash}`;
}
