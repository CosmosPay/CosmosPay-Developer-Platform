/* links.ts: where the guides' links lead. The catalogs (src/lib/payments/learn/<lang>.ts) give
   each link its label under `links`, keyed by one of these targets; URLs are not copy, so they live
   here. Gateway pages are same-origin paths (they render on the payments domain); the docs live on
   the platform (`docs` is its /docs root, src/components/cosmos/lib/constants.ts DOCS); the only
   external links are the sources of a claim about another company. Pure, so
   tests/unit/paymentsLearn.test.ts checks that every key the catalogs use leads somewhere. */
import { pagePath, type Guide } from "@/lib/payments/site-pages";

const guide = (slug: Guide): string => pagePath(`learn/${slug}`);

export function learnHrefs(docs: string) {
  return {
    // The gateway's own pages.
    fees: "/fees",
    compare: "/compare",
    integrations: "/integrations",
    linkDemo: "/integrations#integration-links",
    security: "/security",
    faq: "/faq",
    stellar: "/stellar",
    solana: "/solana",
    monad: "/monad",
    // The guides.
    learn: "/learn",
    acceptGuide: guide("accept-usdc-payments"),
    whatsappGuide: guide("whatsapp-payment-links"),
    gatewayGuide: guide("stablecoin-payment-gateway"),
    networksGuide: guide("stellar-vs-solana-vs-monad"),
    // The docs (each path is a page of docs/content/docs).
    gettingStarted: `${docs}/getting-started/`,
    apiKeys: `${docs}/api-keys/`,
    embed: `${docs}/embed/`,
    paymentIntents: `${docs}/api/payment-intents/`,
    paymentLinks: `${docs}/api/payment-links/`,
    webhooks: `${docs}/sdk/server/webhooks/`,
    // Primary sources for what the guides say about Circle's stablecoins (read 2026-11-01).
    circleUsdc: "https://www.circle.com/usdc",
    circleEurc: "https://www.circle.com/eurc",
  } as const;
}

export type LearnLink = keyof ReturnType<typeof learnHrefs>;

/** A link that leaves Cosmos Pay's own sites (it opens with rel="noopener"). */
export function isExternal(href: string): boolean {
  return /^https:\/\//.test(href) && !/^https:\/\/([a-z0-9-]+\.)*cosmospay\.lat(\/|$)/.test(href);
}
