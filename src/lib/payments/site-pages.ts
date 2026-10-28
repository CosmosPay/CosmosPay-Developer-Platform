/* site-pages.ts: the payments gateway's content pages besides its home, in the order its
   section navigation lists them. One list for the router (src/lib/hosts.ts: these paths belong
   to the payments domain), robots.txt (they are indexable, unlike payment links and design
   previews) and sitemap.xml. Each has a page under src/pages/payments/ and its copy under
   `pages` in src/lib/payments/landing-i18n.ts. Pure, so the router's tests can import it. */

export const PAYMENTS_PAGES = ["integrations", "swaps", "use-cases", "security", "fees", "faq"] as const;
export type PaymentsPage = (typeof PAYMENTS_PAGES)[number];

/** The public path of a gateway page: `/integrations`. */
export function pagePath(page: PaymentsPage): string {
  return `/${page}`;
}

/** Every content path of the gateway besides `/`. */
export const PAYMENTS_PAGE_PATHS: readonly string[] = PAYMENTS_PAGES.map(pagePath);
