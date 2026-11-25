/* org-wallets.ts: the wallets an organization receives payments in (Settings, "Wallets").
   Pure, so the API (src/pages/api/organizations/[id]/wallets) and the dashboard share it.

   A wallet is connected by proving it. The server issues a challenge (a random nonce, single use,
   valid for CHALLENGE_TTL_MS, kept in the database: src/lib/org-wallet-challenges.ts), the wallet
   signs `walletProofMessage`, which names the organization, the network, the address, the nonce
   and the challenge's life, and the server checks the signature against the address
   (src/lib/org-wallets-verify.ts) before it uses the challenge up and stores the wallet. A proof
   is good once: a replay finds its challenge used. Payment forms then offer only these wallets, and
   the API refuses any other receiving address (src/lib/org-wallets-store.ts, `orgHasWallet`).

   Every network a payment link settles on (PAYMENT_NETWORK_IDS) proves its wallets with the signature its
   wallets make (`WALLET_PROVIDERS`). Only an address that cannot sign a message at all is added by
   its address, typed twice (`addedByAddress`, stored as `provider: "address"`): a Bitcoin or
   Litecoin P2WSH address and a P2SH address on a network without SegWit (scripts, multisig in
   practice), a Bitcoin Cash P2SH address, a Zcash unified address (no message-signing standard)
   and an Aleo address (no verifier without a GPL-3.0 dependency). */
import { NETWORK_ADDRESS_RULES, isNetwork, networkName, type NetworkId } from "@/lib/chains";

/* What proved a wallet. A wallet that signs the proof message (`freighter`, `phantom`,
   `solflare`, `evm`), or the standard the signature follows on its network: `tip191` (Tron),
   `tonproof` (TON Connect), `nep413` (NEAR), `sui` (Sui personal message), `aip62` (Aptos and
   Movement), `snip12` (Starknet typed data), `cip30` (Cardano), `xrpl` (XRP Ledger keypairs),
   `bip322` (Bitcoin), `signmessage` (the Bitcoin family's compact signature,
   BIP-137 on Bitcoin). `address`: added by its address, with no signature (an address that cannot
   sign). A row with no provider was proven with a signed Stellar XDR. */
export type WalletProvider =
  | "freighter" | "phantom" | "solflare" | "evm"
  | "tip191" | "tonproof" | "nep413" | "sui" | "aip62" | "snip12" | "cip30" | "xrpl" | "bip322" | "signmessage"
  | "address";
export const WALLET_PROVIDER_IDS = [
  "freighter", "phantom", "solflare", "evm",
  "tip191", "tonproof", "nep413", "sui", "aip62", "snip12", "cip30", "xrpl", "bip322", "signmessage",
  "address",
] as const satisfies readonly WalletProvider[];

const EVM_PROOF: WalletProvider[] = ["evm"];
const SOLANA_PROOF: WalletProvider[] = ["phantom", "solflare"];
const SIGNMESSAGE: WalletProvider[] = ["signmessage"];

/* How an address is proven on each network: the wallets that can sign the proof message there
   (`evm` is whatever EIP-1193 wallet the browser injects, MetaMask, Rabby…, for every EVM
   network, Arc, Robinhood Chain and HyperCore included: one key, one address; Fogo's keys are
   Solana's), or the signature standard of the network's wallets. */
export const WALLET_PROVIDERS: Record<NetworkId, WalletProvider[]> = {
  stellar: ["freighter"],
  solana: SOLANA_PROOF,
  monad: EVM_PROOF, arc: EVM_PROOF,
  eth: EVM_PROOF, base: EVM_PROOF, arb: EVM_PROOF, op: EVM_PROOF, bsc: EVM_PROOF, pol: EVM_PROOF,
  avax: EVM_PROOF, gnosis: EVM_PROOF, bera: EVM_PROOF, scroll: EVM_PROOF, xlayer: EVM_PROOF,
  abs: EVM_PROOF, plasma: EVM_PROOF, hood: EVM_PROOF, hypercore: EVM_PROOF,
  fogo: SOLANA_PROOF,
  btc: ["bip322", "signmessage"],
  ltc: SIGNMESSAGE, doge: SIGNMESSAGE, bch: SIGNMESSAGE, dash: SIGNMESSAGE, zec: SIGNMESSAGE,
  xrp: ["xrpl"], tron: ["tip191"], ton: ["tonproof"], near: ["nep413"], sui: ["sui"],
  aptos: ["aip62"], movement: ["aip62"], starknet: ["snip12"], cardano: ["cip30"],
  // Aleo: no verifier here (the only one, snarkVM's WASM, is GPL-3.0, declined by the owner,
  // 2026-11-16): every Aleo address is added by its address.
  aleo: [],
};

/* Addresses that cannot sign a message, or none this app can verify, by their shape: a witness
   script (P2WSH: 32-byte program), a script hash where the network has no SegWit to wrap a single
   key in, Zcash's unified addresses, and every Aleo address. */
const CANNOT_SIGN: Partial<Record<NetworkId, RegExp>> = {
  btc: /^bc1q[02-9ac-hj-np-z]{58}$/i,
  ltc: /^ltc1q[02-9ac-hj-np-z]{58}$/i,
  doge: /^[A9]/,
  dash: /^7/,
  bch: /^(?:bitcoincash:)?p|^3/,
  zec: /^t3|^u1/,
  aleo: /^aleo1/i,
};

/** Whether a wallet with `address` on `network` is added by its address: it cannot sign a message. */
export function addedByAddress(network: NetworkId, address: string): boolean {
  return CANNOT_SIGN[network]?.test(address.trim()) ?? false;
}

/* How long a challenge can be signed and used, and how many one member may hold open in an
   organization (each is a row until it expires). */
export const CHALLENGE_TTL_MS = 10 * 60_000;
export const MAX_OPEN_CHALLENGES = 20;
/* How far ahead of the server's clock a wallet's own timestamp (TON's) may be. */
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

/** A challenge to prove a wallet: what the server issued, what the wallet signs over. */
export interface WalletChallenge {
  orgId: string;
  chain: NetworkId;
  /** The address the challenge is for; null on TON, whose wallet names it while signing. */
  address: string | null;
  /** 32 random bytes, hex. */
  nonce: string;
  issuedAt: string;
  expiresAt: string;
}

/** The text a wallet signs to be connected to an organization. */
export function walletProofMessage({ orgId, chain, address, nonce, issuedAt, expiresAt }: { orgId: string; chain: NetworkId; address: string; nonce: string; issuedAt: string; expiresAt: string }): string {
  return [
    "Cosmos Pay",
    "Connect this wallet to an organization to receive its payments.",
    `Organization: ${orgId}`,
    `Network: ${networkName(chain)}`,
    `Address: ${address}`,
    `Nonce: ${nonce}`,
    `Issued at: ${issuedAt}`,
    `Expires at: ${expiresAt}`,
  ].join("\n");
}

/** Whether a challenge can still be signed and used at `now`. */
export function isLiveChallenge(expiresAt: string, now: number = Date.now()): boolean {
  const t = Date.parse(expiresAt);
  return Number.isFinite(t) && now < t;
}

export const shortAddress = (a: string) => (a.length > 14 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a);
