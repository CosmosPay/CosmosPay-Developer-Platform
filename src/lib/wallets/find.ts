/* The wallets this browser can sign with, through the SDK's wallets module
   (@cosmosapp/pay_sdk/wallets): every Stellar wallet (Freighter, xBull, Rabet, LOBSTR, Albedo,
   Cosmos Pay Wallet, Hana, OneKey, Bitget, D'CENT...), every EVM wallet that announces itself
   (MetaMask, Rabby, Coinbase Wallet...) and every Solana wallet (Phantom, Solflare, Backpack...).
   The page never sees a key: each wallet shows the transaction, the person approves it there, and
   only the signature (or, on an EVM chain, the sent transaction's hash) comes back. Everything here
   loads on first use, so a screen that never signs does not carry it. */
import type {
  AnyWallet,
  DiscoveredEvmWallet,
  Ecosystem,
  SolanaWallet,
  StellarWallet,
} from "@cosmosapp/pay_sdk/wallets";
import { WALLET_WEB } from "@/lib/payments/urls";

export type { AnyWallet, DiscoveredEvmWallet, Ecosystem, SolanaWallet, StellarWallet };

let sdk: ReturnType<typeof load> | null = null;
function load() {
  return import("@cosmosapp/pay_sdk/wallets");
}
export const walletsSdk = () => (sdk ??= load());

/* Albedo's library, once imported, takes over every web+stellar: link on the page (it listens to
   document clicks), which would send the swap's "Open in wallet" link to Albedo for everyone. So it
   is imported only when someone picks Albedo. */
const albedo = {
  publicKey: async (params?: { token?: string }) => (await import("@albedo-link/intent")).default.publicKey(params ?? {}),
  tx: async (params: Record<string, unknown>) => (await import("@albedo-link/intent")).default.tx(params),
};

async function stellarWallets(): Promise<StellarWallet[]> {
  const [w, freighter, lobstr] = await Promise.all([
    walletsSdk(),
    import("@stellar/freighter-api"),
    import("@lobstrco/signer-extension-api"),
  ]);
  const wallets = await w.discoverStellarWallets({
    injected: {
      freighter,
      lobstr: lobstr.default ?? lobstr,
      albedo,
      // The hosted Cosmos Pay Wallet: no install, its own approval window.
      cosmos: WALLET_WEB ? { walletUrl: WALLET_WEB } : undefined,
    },
  });
  // Cosmos Pay's own wallet first: the SDK lists it last so integrations keep their order.
  return [...wallets.filter((x) => x.id === "stellar:cosmos"), ...wallets.filter((x) => x.id !== "stellar:cosmos")];
}

/** The wallets of one ecosystem in this browser (empty outside one). */
export async function findWallets(ecosystem: "stellar"): Promise<StellarWallet[]>;
export async function findWallets(ecosystem: "evm"): Promise<DiscoveredEvmWallet[]>;
export async function findWallets(ecosystem: "solana"): Promise<SolanaWallet[]>;
export async function findWallets(ecosystem: Ecosystem): Promise<AnyWallet[]>;
export async function findWallets(ecosystem: Ecosystem): Promise<AnyWallet[]> {
  if (typeof window === "undefined") return [];
  if (ecosystem === "stellar") return stellarWallets();
  const w = await walletsSdk();
  if (ecosystem === "evm") return w.discoverEvmWallets(window);
  return w.discoverSolanaWallets(window);
}

/** Two addresses of one chain are the same account (EVM addresses ignore case). */
export function sameAccount(ecosystem: Ecosystem, a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return true;
  return ecosystem === "evm" ? a.toLowerCase() === b.toLowerCase() : a === b;
}
