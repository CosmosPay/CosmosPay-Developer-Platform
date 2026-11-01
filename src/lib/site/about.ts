/* about.ts: what the company's About page (cosmospay.lat/about) links and lists besides its words
   (the platform catalogs' `about` block): the page that shows each product, the gateway's page for
   each network, the public repositories of the GitHub organization and the pages that prove what
   it says. src/pages/site/about.astro renders it and the page's Markdown version
   (src/lib/seo/site-markdown.ts) reads it too, so both list the same things in the same order.
   The sources of each fact are named in the page's header comment. Pure: the origins come in. */
import { docsLink, docsRoot } from "@/lib/urls";

export interface AboutOrigins {
  site: string;
  dev: string;
  payments: string;
}

/** The public repositories of github.com/CosmosPay (its profile lists the same ones). */
export const ABOUT_REPOS = [
  { key: "server", name: "CosmosPay-Community-Server" },
  { key: "platform", name: "CosmosPay-Developer-Platform" },
  { key: "sdk", name: "CosmosJS_SDK" },
  { key: "wallet", name: "CosmosPay-Wallet" },
  { key: "skill", name: "CosmosPay-Skill" },
] as const;

/** The networks a payment settles on, in the footer's order (its `networks` group names them). */
export const ABOUT_NETWORKS = ["stellar", "solana", "monad"] as const;

/** Where each part of the page leads, on the given origins. A check's links name their label in
 *  the catalog (`a` or `b` of `about.checks.items.<key>`). */
export function aboutLinks({ site, dev, payments }: AboutOrigins) {
  const docs = docsRoot(dev);
  return {
    // What Cosmos Pay makes, each with the page that shows it.
    products: [
      { key: "api", href: docs },
      { key: "checkout", href: `${payments}/integrations` },
      { key: "swaps", href: `${site}/swaps` },
      { key: "private", href: `${payments}/faq` },
      { key: "wallet", href: `${site}/#wallet` },
    ] as const,
    // The gateway's page for each network a payment settles on.
    networks: ABOUT_NETWORKS.map((id) => `${payments}/${id}`),
    checks: [
      { key: "keys", links: [{ label: "a", href: `${payments}/security` }] },
      { key: "rates", links: [{ label: "a", href: `${site}/pricing` }, { label: "b", href: `${payments}/compare` }] },
      { key: "docs", links: [{ label: "a", href: docs }, { label: "b", href: docsLink(docs, "/openapi.json") }] },
    ] as const,
    support: `${dev}/dashboard?view=support`,
  };
}
