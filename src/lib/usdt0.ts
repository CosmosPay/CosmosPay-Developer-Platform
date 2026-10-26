/* USDT0, Tether's omnichain USDT, out of Stellar: LayerZero's OFT moves it 1:1 to the networks the
   Payments API lists (GET /v1/usdt0/routes), as native USDT on Ethereum (Tether's adapter there
   unlocks real USDT) and as USDT0 on the others. The holder signs one Soroban transaction and pays
   LayerZero's fee in XLM. Stellar mainnet only: USDT0 does not exist on testnet. Pure. */

/* The classic asset on Stellar mainnet (its SAC is CBSJZEIO…26YF; src/lib/stellar-assets.ts). */
export const USDT0_STELLAR = { code: "USDT0", issuer: "GATISXX6BZ6NC7IKQBY37CJD4SOZL3CYZJWXEDG6JVIY4WBS6KXJHN6Q" } as const;

/* One destination the OFT reaches from Stellar. */
export interface Usdt0Route {
  /** The platform's network id (src/lib/chains.ts). */
  chain: string;
  name: string;
  /** LayerZero endpoint id. */
  eid: number;
  /** What arrives: native USDT on Ethereum, USDT0 elsewhere. */
  receives: "USDT" | "USDT0";
}

/* What GET /v1/usdt0/routes answers. */
export interface Usdt0Routes {
  available: boolean;
  routes: Usdt0Route[];
}

export const isUsdt0OnStellar = (t: { chain: string; symbol: string; contract: string | null }) =>
  t.chain === "stellar" && t.symbol === USDT0_STELLAR.code && t.contract === USDT0_STELLAR.issuer;

/* Every destination takes an EVM address. */
export const isEvmAddress = (v: string) => /^0x[0-9a-fA-F]{40}$/.test(v.trim());

/* The OFT shares 6 decimals and Stellar has 7: the seventh never crosses (it stays in the
   account). The amount that leaves, as a decimal string, or null when nothing would. */
export function bridgedAmount(amount: string): string | null {
  const m = /^(\d+)(?:\.(\d+))?$/.exec(amount.trim());
  if (!m) return null;
  const sixth = `${m[1]}.${(m[2] ?? "").padEnd(6, "0").slice(0, 6)}`.replace(/\.?0+$/, "") || "0";
  return Number(sixth) > 0 ? sixth : null;
}
