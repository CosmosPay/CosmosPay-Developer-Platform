/* org-wallets.ts: the wallets an organization receives payments in (Settings, "Wallets").
   Pure, so the API (src/pages/api/organizations/[id]/wallets) and the dashboard share it.

   A wallet is connected by proving it: it signs `walletProofMessage`, which names the
   organization, the network, the address and when it was issued. The server rebuilds the same
   text from the request, checks the signature against the address (src/lib/org-wallets-verify.ts)
   and that it is recent. A replayed proof can only connect the same wallet to the same
   organization again. Payment forms then offer only these wallets, and the API refuses any other
   receiving address (src/lib/org-wallets-store.ts, `orgHasWallet`).

   A wallet can be connected on every network a payment link settles on (NETWORK_IDS). Where this
   app verifies no message signature for the network's wallets (the Bitcoin family, XRP Ledger,
   Tron, TON, NEAR, Sui, Aptos, Movement, Starknet, Cardano, Aleo), a member who may connect
   wallets adds it by its address, typed twice, and it is listed as added without a signature
   (`provider: "address"`). */
import { NETWORK_ADDRESS_RULES, isNetwork, networkName, type NetworkId } from "@/lib/chains";

/* `address`: added by its address, with no signature (a network whose wallets this app cannot
   verify a signature from). */
export type WalletProvider = "freighter" | "phantom" | "solflare" | "evm" | "address";
export const WALLET_PROVIDER_IDS = ["freighter", "phantom", "solflare", "evm", "address"] as const satisfies readonly WalletProvider[];

const EVM_PROOF: WalletProvider[] = ["evm"];
const SOLANA_PROOF: WalletProvider[] = ["phantom", "solflare"];
const BY_ADDRESS: WalletProvider[] = ["address"];

/* How an address is proven on each network: the wallets that can sign the proof message there
   (`evm` is whatever EIP-1193 wallet the browser injects, MetaMask, Rabby…, for every EVM
   network, Robinhood Chain and HyperCore included: one key, one address; Fogo's keys are
   Solana's), or `address` where none can. */
export const WALLET_PROVIDERS: Record<NetworkId, WalletProvider[]> = {
  stellar: ["freighter"],
  solana: SOLANA_PROOF,
  monad: EVM_PROOF,
  eth: EVM_PROOF, base: EVM_PROOF, arb: EVM_PROOF, op: EVM_PROOF, bsc: EVM_PROOF, pol: EVM_PROOF,
  avax: EVM_PROOF, gnosis: EVM_PROOF, bera: EVM_PROOF, scroll: EVM_PROOF, xlayer: EVM_PROOF,
  abs: EVM_PROOF, plasma: EVM_PROOF, hood: EVM_PROOF, hypercore: EVM_PROOF,
  fogo: SOLANA_PROOF,
  btc: BY_ADDRESS, ltc: BY_ADDRESS, doge: BY_ADDRESS, bch: BY_ADDRESS, dash: BY_ADDRESS, zec: BY_ADDRESS,
  xrp: BY_ADDRESS, tron: BY_ADDRESS, ton: BY_ADDRESS, near: BY_ADDRESS, sui: BY_ADDRESS, aptos: BY_ADDRESS,
  movement: BY_ADDRESS, starknet: BY_ADDRESS, cardano: BY_ADDRESS, aleo: BY_ADDRESS,
};

/** Whether a wallet on `network` is connected by its address only (no signature this app verifies). */
export function addedByAddress(network: NetworkId): boolean {
  return WALLET_PROVIDERS[network].includes("address");
}

/* How long a signed proof stays acceptable, and how far ahead of the server's clock it may be. */
export const PROOF_MAX_AGE_MS = 10 * 60_000;
export const PROOF_MAX_SKEW_MS = 2 * 60_000;
export const WALLET_LABEL_MAX = 40;
/* Enough for any organization, and a bound on what one can store. */
export const MAX_ORG_WALLETS = 25;

export interface OrgWallet {
  id: string;
  chain: NetworkId;
  address: string;
  label: string | null;
  provider: WalletProvider | null;
  createdAt: string;
}

/** The address as stored and compared: hex ones (EVM and the like) are case-insensitive, the others are not. */
export function normalizeWalletAddress(chain: NetworkId, address: string): string {
  const a = address.trim();
  return isNetwork(chain) && NETWORK_ADDRESS_RULES[chain].hex ? a.toLowerCase() : a;
}

/** The text a wallet signs to be connected to an organization. */
export function walletProofMessage({ orgId, chain, address, issuedAt }: { orgId: string; chain: NetworkId; address: string; issuedAt: string }): string {
  return [
    "Cosmos Pay",
    "Connect this wallet to an organization to receive its payments.",
    `Organization: ${orgId}`,
    `Network: ${networkName(chain)}`,
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
