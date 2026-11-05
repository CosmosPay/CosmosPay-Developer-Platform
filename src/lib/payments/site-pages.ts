/* site-pages.ts: the payments gateway's content pages besides its home. One list for the router
   (src/lib/hosts.ts: these paths belong to the payments domain), robots.txt (they are indexable,
   unlike payment links and design previews), sitemap.xml (with hreflang), llms.txt and the
   structured data. Each has a page under src/pages/payments/ and its copy under `pages` in
   src/lib/payments/landing-i18n.ts (the guides: src/lib/payments/learn/). Pure, so the router's
   tests can import it. */
import { CHAINS, type Chain } from "@/lib/chains";

/* The topic pages, in the order the section bar (Subnav.astro) lists them. */
export const SECTION_PAGES = ["integrations", "swaps", "use-cases", "security", "fees", "compare", "faq"] as const;
/* One page per network a payment settles on (src/lib/chains.ts), at /stellar, /solana and
   /monad. The footer and the home's networks marquee link them, not the section bar. */
export const NETWORK_PAGES: readonly Chain[] = CHAINS;

/* The guides (/learn/<slug>), in the order the hub (/learn) lists them. The slugs are the words
   people search for, in English in every language (URLs are not copy). */
export const GUIDES = [
  "accept-usdc-payments",
  "whatsapp-payment-links",
  "stablecoin-payment-gateway",
  "stellar-vs-solana-vs-monad",
  "accept-usdc-with-solana-pay",
  "confirm-stablecoin-payments",
  "usdt0-from-stellar",
  "accept-usdc-on-stellar",
  "accept-usdc-on-monad",
  "crypto-payment-button",
  "cross-chain-swaps",
  "crypto-donations",
] as const;
export type Guide = (typeof GUIDES)[number];
export type GuidePage = `learn/${Guide}`;
/* The hub that lists them, then the guides: the section bar's last item and the footer's
   Resources group link the hub. */
export type LearnPage = "learn" | GuidePage;
export const LEARN_PAGES: readonly LearnPage[] = ["learn", ...GUIDES.map((g): GuidePage => `learn/${g}`)];

/* The day each guide was first published and last changed (ISO dates). The page shows the
   second, its JSON-LD states both and the sitemap gives it as lastmod: change it with the text. */
export const GUIDE_DATES: Record<Guide, { published: string; modified: string }> = {
  "accept-usdc-payments": { published: "2026-11-01", modified: "2026-11-03" },
  "whatsapp-payment-links": { published: "2026-11-01", modified: "2026-11-01" },
  "stablecoin-payment-gateway": { published: "2026-11-01", modified: "2026-11-03" },
  "stellar-vs-solana-vs-monad": { published: "2026-11-01", modified: "2026-11-03" },
  "accept-usdc-with-solana-pay": { published: "2026-11-02", modified: "2026-11-02" },
  "confirm-stablecoin-payments": { published: "2026-11-02", modified: "2026-11-02" },
  "usdt0-from-stellar": { published: "2026-11-02", modified: "2026-11-02" },
  "accept-usdc-on-stellar": { published: "2026-11-02", modified: "2026-11-02" },
  "accept-usdc-on-monad": { published: "2026-11-02", modified: "2026-11-02" },
  "crypto-payment-button": { published: "2026-11-02", modified: "2026-11-02" },
  "cross-chain-swaps": { published: "2026-11-02", modified: "2026-11-03" },
  "crypto-donations": { published: "2026-11-02", modified: "2026-11-02" },
};

/* The guides each network page links at its end: the comparison and the general USDC guide, plus
   the guide that is about that network. NetworkPage.astro and its Markdown twin read the same list. */
export const NETWORK_GUIDES: Record<Chain, readonly Guide[]> = {
  stellar: ["accept-usdc-on-stellar", "stellar-vs-solana-vs-monad", "usdt0-from-stellar"],
  solana: ["accept-usdc-with-solana-pay", "stellar-vs-solana-vs-monad", "accept-usdc-payments"],
  monad: ["accept-usdc-on-monad", "stellar-vs-solana-vs-monad", "accept-usdc-payments"],
};

/* The guides /integrations and /swaps link at their end (the page and its Markdown twin). */
export const INTEGRATIONS_GUIDES: readonly Guide[] = ["crypto-payment-button", "accept-usdc-payments", "whatsapp-payment-links"];
export const SWAPS_GUIDES: readonly Guide[] = ["cross-chain-swaps", "usdt0-from-stellar"];

export type SectionPage = (typeof SECTION_PAGES)[number];
export type NetworkPage = Chain;
export type PaymentsPage = SectionPage | NetworkPage | LearnPage;

export const PAYMENTS_PAGES: readonly PaymentsPage[] = [...SECTION_PAGES, ...NETWORK_PAGES, ...LEARN_PAGES];

export function isNetworkPage(page: string): page is NetworkPage {
  return (NETWORK_PAGES as readonly string[]).includes(page);
}

export function isLearnPage(page: string): page is LearnPage {
  return (LEARN_PAGES as readonly string[]).includes(page);
}

/** The guide a page is, or null for the hub and every other page. */
export function guideOf(page: string): Guide | null {
  const slug = page.startsWith("learn/") ? page.slice("learn/".length) : "";
  return (GUIDES as readonly string[]).includes(slug) ? (slug as Guide) : null;
}

/** The public path of a gateway page: `/integrations`, `/stellar`, `/learn/accept-usdc-payments`. */
export function pagePath(page: PaymentsPage): string {
  return `/${page}`;
}

/** Every content path of the gateway besides `/`. */
export const PAYMENTS_PAGE_PATHS: readonly string[] = PAYMENTS_PAGES.map(pagePath);
