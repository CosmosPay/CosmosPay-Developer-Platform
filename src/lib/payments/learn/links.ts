/* links.ts: where the guides' links lead. The catalogs (src/lib/payments/learn/<lang>.ts) give
   each link its label under `links`, keyed by one of these targets; URLs are not copy, so they live
   here. Gateway pages are same-origin paths (they render on the payments domain); the docs live on
   the platform (`docs` is its /docs root, src/components/cosmos/lib/constants.ts DOCS), each at its
   trailing-slash address (docsLink); the only
   external links are the sources of a claim about another company or of a standard it publishes
   (SOURCE_LINKS). Pure, so
   tests/unit/paymentsLearn.test.ts checks that every key the catalogs use leads somewhere. */
import { pagePath, type Guide } from "@/lib/payments/site-pages";
import { docsLink } from "@/lib/urls";

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
    gettingStarted: docsLink(docs, "/getting-started"),
    apiKeys: docsLink(docs, "/api-keys"),
    embed: docsLink(docs, "/embed"),
    paymentIntents: docsLink(docs, "/api/payment-intents"),
    paymentLinks: docsLink(docs, "/api/payment-links"),
    webhooks: docsLink(docs, "/sdk/server/webhooks"),
    // Primary sources for what the guides say about Circle's stablecoins (read 2026-11-01).
    circleUsdc: "https://www.circle.com/usdc",
    circleEurc: "https://www.circle.com/eurc",
    // The payment-request standards the guides name, at their publishers (read 2026-11-01).
    // docs.solanapay.com no longer resolves; the Solana Foundation hosts the spec on solana.com.
    sep7: "https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0007.md",
    solanaPay: "https://solana.com/docs/tools/solana-pay/specification/version1-1",
    eip681: "https://eips.ethereum.org/EIPS/eip-681",
  } as const;
}

/** The targets that leave Cosmos Pay: each is the primary source of a claim the guides make. */
export const SOURCE_LINKS = ["circleUsdc", "circleEurc", "sep7", "solanaPay", "eip681"] as const;

export type LearnLink = keyof ReturnType<typeof learnHrefs>;

/** A link that leaves Cosmos Pay's own sites (it opens with rel="noopener"). */
export function isExternal(href: string): boolean {
  return /^https:\/\//.test(href) && !/^https:\/\/([a-z0-9-]+\.)*cosmospay\.lat(\/|$)/.test(href);
}
