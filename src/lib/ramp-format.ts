/* ramp-format.ts: how the P2P ramps name what they show, shared by the dashboard's ramp widget
   (components/cosmos/dashboard/components/RampWidget.tsx) and the payments domain's payer page for
   a charge in local money (src/scripts/payments/fiat-request.ts, vanilla TS). Pure: no React, no
   DOM, no astro:env, so both can import it and tests/unit/fiatRequest.test.ts reaches it. */

/** A network as the marketplace's market lists it (`GET .../p2p/market` `networks`). */
export interface RampNetworkName {
  chainId: number;
  name: string;
}

/* The marketplace's networks by EIP-155 id: their name, the dashboard's network id for the logo
   (`NetworkMark`, `TokenMark`'s badge; a network without artwork keeps its initial) and the
   explorer an account opens on. */
export const RAMP_CHAINS: Readonly<Record<number, { name: string; mark: string; explorer: string }>> = {
  1: { name: "Ethereum", mark: "eth", explorer: "https://etherscan.io" },
  10: { name: "Optimism", mark: "op", explorer: "https://optimistic.etherscan.io" },
  56: { name: "BNB Chain", mark: "bsc", explorer: "https://bscscan.com" },
  130: { name: "Unichain", mark: "unichain", explorer: "https://uniscan.xyz" },
  137: { name: "Polygon", mark: "pol", explorer: "https://polygonscan.com" },
  480: { name: "World Chain", mark: "world", explorer: "https://worldscan.org" },
  8453: { name: "Base", mark: "base", explorer: "https://basescan.org" },
  42161: { name: "Arbitrum", mark: "arb", explorer: "https://arbiscan.io" },
  42220: { name: "Celo", mark: "celo", explorer: "https://celoscan.io" },
  43114: { name: "Avalanche", mark: "avax", explorer: "https://snowtrace.io" },
  81457: { name: "Blast", mark: "blast", explorer: "https://blastscan.io" },
  421614: { name: "Arbitrum Sepolia", mark: "arb", explorer: "https://sepolia.arbiscan.io" },
};

/** A network's name: the market's own when it was read, else ours, else "Chain <id>". */
export const rampChainName = (chainId: number | null | undefined, networks?: readonly RampNetworkName[]) =>
  networks?.find((n) => n.chainId === chainId)?.name ?? RAMP_CHAINS[Number(chainId)]?.name ?? `Chain ${chainId ?? ""}`;

/** A network's name when this module knows it, else null (the caller words the fallback). */
export const knownRampChainName = (chainId: number): string | null => RAMP_CHAINS[chainId]?.name ?? null;

export const rampChainMark = (chainId: number | null | undefined) => RAMP_CHAINS[Number(chainId)]?.mark ?? `chain-${chainId}`;

/** An account's page on its network's explorer, or null for a network without one here. */
export const rampExplorer = (chainId: number, address: string) => {
  const base = RAMP_CHAINS[chainId]?.explorer;
  return base ? `${base}/address/${address}` : null;
};

/** A transaction's page on its network's explorer (a charge's delivery), or null for a network
    without one here or a hash that is not one. */
export const rampTxExplorer = (chainId: number, hash: string | null | undefined) => {
  const base = RAMP_CHAINS[chainId]?.explorer;
  return base && hash && /^0x[0-9a-fA-F]{64}$/.test(hash) ? `${base}/tx/${hash}` : null;
};

/** A currency's name in the reader's language (the market's English one when the runtime has none). */
export function currencyName(id: string, lang: string, fallback?: string): string {
  try {
    const name = new Intl.DisplayNames([lang], { type: "currency" }).of(id);
    if (name && name !== id) return name.charAt(0).toLocaleUpperCase(lang) + name.slice(1);
  } catch {
    /* an unknown language tag or a runtime without DisplayNames: the fallback below */
  }
  return fallback || id;
}

/** A payment method's name without the currency the market appends ("Nequi (COP)"). */
export const methodName = (name: string, currency: string) => name.replace(new RegExp(`\\s*\\(${currency.replace(/[^A-Za-z]/g, "")}\\)$`), "");
