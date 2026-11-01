/* site-pages.ts: the payments gateway's content pages besides its home. One list for the router
   (src/lib/hosts.ts: these paths belong to the payments domain), robots.txt (they are indexable,
   unlike payment links and design previews), sitemap.xml (with hreflang), llms.txt and the
   structured data. Each has a page under src/pages/payments/ and its copy under `pages` in
   src/lib/payments/landing-i18n.ts. Pure, so the router's tests can import it. */
import { CHAINS, type Chain } from "@/lib/chains";

/* The topic pages, in the order the section bar (Subnav.astro) lists them. */
export const SECTION_PAGES = ["integrations", "swaps", "use-cases", "security", "fees", "compare", "faq"] as const;
/* One page per network a payment settles on (src/lib/chains.ts), at /stellar, /solana and
   /monad. The footer and the home's networks marquee link them, not the section bar. */
export const NETWORK_PAGES: readonly Chain[] = CHAINS;

export type SectionPage = (typeof SECTION_PAGES)[number];
export type NetworkPage = Chain;
export type PaymentsPage = SectionPage | NetworkPage;

export const PAYMENTS_PAGES: readonly PaymentsPage[] = [...SECTION_PAGES, ...NETWORK_PAGES];

export function isNetworkPage(page: string): page is NetworkPage {
  return (NETWORK_PAGES as readonly string[]).includes(page);
}

/** The public path of a gateway page: `/integrations`, `/stellar`. */
export function pagePath(page: PaymentsPage): string {
  return `/${page}`;
}

/** Every content path of the gateway besides `/`. */
export const PAYMENTS_PAGE_PATHS: readonly string[] = PAYMENTS_PAGES.map(pagePath);
