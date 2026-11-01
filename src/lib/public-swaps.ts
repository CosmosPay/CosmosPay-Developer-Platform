/* public-swaps.ts: what the public swap page (src/components/cosmos/swaps/PublicSwaps.tsx, on the
   gateway's /swaps and the company site's) shows besides its words: the three calls of the public
   swap API and how many networks its USDT0 line names before the routes arrive. The Markdown
   version of the page (src/lib/seo/payments-markdown.ts) reads the same values. Pure. */

/** The calls the page shows, in its order: the shared public key, a quote between networks and a
 *  quote for USDT0 out of Stellar. `base` is the gateway's API base (PUBLIC_PAYMENTS_API_URL). */
export function publicSwapCalls(base: string): { key: "key" | "cross" | "usdt0"; code: string }[] {
  const root = base.replace(/\/+$/, "");
  return [
    { key: "key", code: `curl "${root}/v1/public-key?env=prod"` },
    {
      key: "cross",
      code: `curl -X POST "${root}/v1/cross-chain-swaps/quote" \\\n  -H "Authorization: Bearer $PUBLIC_KEY" -H "Content-Type: application/json" \\\n  -d '{"originChain":"stellar","originAsset":"XLM","destinationChain":"solana","destinationAsset":"SOL","amount":"100","recipient":"<solana address>","refundTo":"<stellar account>"}'`,
    },
    {
      key: "usdt0",
      code: `curl -X POST "${root}/v1/usdt0/quote" \\\n  -H "Authorization: Bearer $PUBLIC_KEY" -H "Content-Type: application/json" \\\n  -d '{"to":"eth","amount":"100"}'`,
    },
  ];
}

/** The networks besides Ethereum that USDT0's line names until the API's routes arrive (the
 *  server-rendered page, and its Markdown version, which loads no routes). Once they load, the
 *  page counts them. */
export const USDT0_OTHER_NETWORKS_BEFORE_ROUTES = 20;

/** How many networks besides Ethereum USDT0's line names: the routes the API answered, less
 *  Ethereum's, or the server-rendered count before they arrive. */
export function usdt0OtherNetworks(routes: readonly unknown[] | null): number {
  return routes ? Math.max(routes.length - 1, 0) : USDT0_OTHER_NETWORKS_BEFORE_ROUTES;
}
