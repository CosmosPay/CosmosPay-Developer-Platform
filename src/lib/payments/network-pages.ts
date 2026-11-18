/* network-pages.ts: what the gateway's network pages (/stellar, /solana, /monad, /arc) show that is
   not copy: the assets offered by name on each network (the dashboard's presets, every address
   verified: src/lib/stellar-assets.ts and src/lib/chains.ts), the wallets named for it (a subset
   of the home's wallet marquee, src/components/payments/landing/data.ts) and the request that
   creates a payment link there (the Payments API's CreatePayPaymentIntentDto in
   docs/openapi.json). The words are in src/lib/payments/landing-i18n.ts (`network`, `networks`).
   Pure, so tests/unit/paymentsNetworkPages.test.ts checks it against the spec and the presets. */
import { NATIVE_CODES, TOKEN_PRESETS, explorerAccountUrl, isEvmChain, offersNativeCoin, type Chain, type Tier } from "@/lib/chains";
import { standardAssets } from "@/lib/stellar-assets";

/** The Payments API's base URL, as docs/openapi.json's `servers` names it. */
export const PAYMENTS_API_SERVER = "https://api.cosmospay.lat/cosmos-api";
/** The route that creates a payment link on any of the networks with a wallet link of their own. */
export const CREATE_PAY_PATH = "/v1/payment-intents/pay";

export interface PresetRow {
  tier: Tier;
  code: string;
  /** The issuer (Stellar), mint (Solana) or contract (Monad, Arc); null for the network's own coin. */
  address: string | null;
  /** Who issues it, where the presets say (Circle, Tether); null otherwise. */
  issuer: string | null;
  /** The address on the network's explorer; null for the network's own coin. */
  explorer: string | null;
}

const TIERS: readonly Tier[] = ["public", "testnet"];

/** The assets the dashboard offers by name on a network, mainnet first, its own coin first (none
 *  on Arc, whose coin is the USDC its first preset charges). */
export function networkPresets(chain: Chain): PresetRow[] {
  return TIERS.flatMap((tier): PresetRow[] => {
    if (chain === "stellar") {
      return standardAssets(tier).map((a) => ({
        tier,
        code: a.code,
        address: a.issuer,
        issuer: a.issuer ? a.issuerName : null,
        explorer: explorerAccountUrl("stellar", tier, a.issuer),
      }));
    }
    const native: PresetRow[] = offersNativeCoin(chain) ? [{ tier, code: NATIVE_CODES[chain], address: null, issuer: null, explorer: null }] : [];
    const tokens = TOKEN_PRESETS[chain][tier].map((p): PresetRow => ({
      tier,
      code: p.code,
      address: p.issuer,
      issuer: null,
      explorer: explorerAccountUrl(chain, tier, p.issuer),
    }));
    return [...native, ...tokens];
  });
}

/* The wallets each page names, as the gateway's FAQ names them ("Which wallets can my customers
   use?"); their logos come from the home's wallet marquee. Monad's and Arc's pages name none: any
   EVM wallet that reads EIP-681 links pays there. */
export const NETWORK_WALLETS: Record<Chain, readonly string[]> = {
  stellar: ["Cosmos Pay Wallet", "Freighter", "LOBSTR", "xBull", "Albedo", "Rabet"],
  solana: ["Phantom", "Solflare"],
  monad: [],
  arc: [],
};

/* What a sample request names as the merchant's address: an obvious placeholder in each
   network's shape. */
const SAMPLE_DESTINATION: Record<Chain, string> = {
  stellar: "G…YOUR_STELLAR_ACCOUNT",
  solana: "YOUR_SOLANA_ADDRESS",
  monad: "0x…YOUR_MONAD_ADDRESS",
  arc: "0x…YOUR_ARC_ADDRESS",
};

/** The mainnet USDC preset of a network, the asset every sample charges in. */
export function mainnetUsdc(chain: Chain): PresetRow {
  const row = networkPresets(chain).find((r) => r.tier === "public" && r.code === "USDC");
  if (!row) throw new Error(`no mainnet USDC preset on ${chain}`);
  return row;
}

/**
 * The body that creates a payment link for 25 USDC on a network: the fields
 * CreatePayPaymentIntentDto defines. Monad and Arc take no wallet message (`msg`), so their
 * samples have none; an amount is required there and given everywhere.
 */
export function payLinkBody(chain: Chain): Record<string, string> {
  const usdc = mainnetUsdc(chain);
  return {
    chain,
    destination: SAMPLE_DESTINATION[chain],
    amount: "25",
    assetCode: usdc.code,
    assetIssuer: usdc.address ?? "",
    ...(isEvmChain(chain) ? {} : { msg: "Order #1001" }),
  };
}

/** The same request as a curl call, the way the docs show REST calls. */
export function payLinkCurl(chain: Chain): string {
  const body = JSON.stringify(payLinkBody(chain), null, 2)
    .split("\n")
    .map((line, i) => (i === 0 ? line : `  ${line}`))
    .join("\n");
  return `curl ${PAYMENTS_API_SERVER}${CREATE_PAY_PATH} \\
  -H "Authorization: Bearer $COSMOS_PAY_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '${body}'`;
}
