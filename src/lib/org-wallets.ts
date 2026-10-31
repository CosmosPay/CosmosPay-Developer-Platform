/* org-wallets.ts: the wallets an organization receives payments in (Settings, "Wallets").
   Pure, so the API (src/pages/api/organizations/[id]/wallets) and the dashboard share it.

   A wallet is connected by proving it: it signs `walletProofMessage`, which names the
   organization, the network, the address and when it was issued. The server rebuilds the same
   text from the request, checks the signature against the address (src/lib/org-wallets-verify.ts)
   and that it is recent. A replayed proof can only connect the same wallet to the same
   organization again. Payment forms then offer only these wallets, and the API refuses any other
   receiving address (src/lib/org-wallets-store.ts, `orgHasWallet`). */
import { CHAIN_NAMES, type Chain } from "@/lib/chains";

export type WalletProvider = "freighter" | "phantom" | "solflare" | "evm";

/* The wallets that can prove an address on each network. `evm` is whatever EIP-1193 wallet the
   browser injects (MetaMask, Rabby…); Monad is an EVM chain. */
export const WALLET_PROVIDERS: Record<Chain, WalletProvider[]> = {
  stellar: ["freighter"],
  solana: ["phantom", "solflare"],
  monad: ["evm"],
};

/* How long a signed proof stays acceptable, and how far ahead of the server's clock it may be. */
export const PROOF_MAX_AGE_MS = 10 * 60_000;
export const PROOF_MAX_SKEW_MS = 2 * 60_000;
export const WALLET_LABEL_MAX = 40;
/* Enough for any organization, and a bound on what one can store. */
export const MAX_ORG_WALLETS = 25;

export interface OrgWallet {
  id: string;
  chain: Chain;
  address: string;
  label: string | null;
  provider: WalletProvider | null;
  createdAt: string;
}

/** The address as stored and compared: EVM addresses are case-insensitive, the others are not. */
export function normalizeWalletAddress(chain: Chain, address: string): string {
  const a = address.trim();
  return chain === "monad" ? a.toLowerCase() : a;
}

/** The text a wallet signs to be connected to an organization. */
export function walletProofMessage({ orgId, chain, address, issuedAt }: { orgId: string; chain: Chain; address: string; issuedAt: string }): string {
  return [
    "Cosmos Pay",
    "Connect this wallet to an organization to receive its payments.",
    `Organization: ${orgId}`,
    `Network: ${CHAIN_NAMES[chain]}`,
    `Address: ${address}`,
    `Issued at: ${issuedAt}`,
  ].join("\n");
}

/** Whether a proof issued at `issuedAt` (ISO) is still acceptable at `now`. */
export function isFreshProof(issuedAt: string, now: number = Date.now()): boolean {
  const t = Date.parse(issuedAt);
  if (!Number.isFinite(t)) return false;
  return t <= now + PROOF_MAX_SKEW_MS && now - t <= PROOF_MAX_AGE_MS;
}

export const shortAddress = (a: string) => (a.length > 14 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a);
