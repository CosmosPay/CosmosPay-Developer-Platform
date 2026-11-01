/* indexable.ts: the indexable pages of the company site and the gateway, each with the languages
   it is written in, in the order the sitemap lists them. Read from the registry the rest of the
   SEO plumbing uses: the company site's pages and their languages (src/lib/seo/site-meta.ts, less
   the pages whose canonical version is the gateway's: src/lib/seo/cross-host.ts) and the
   gateway's (its home and src/lib/payments/site-pages.ts, every page in all its languages). The
   sitemap, llms-full.txt and the Markdown versions of the pages all list these. Pure. */
import { PAYMENTS_PAGE_PATHS } from "@/lib/payments/site-pages";
import { LOCALES as PAYMENTS_LOCALES } from "@/lib/payments/i18n";
import { SITE_PATHS_CANONICAL_ON_PAYMENTS } from "@/lib/seo/cross-host";
import { PAGE_LANGS, SITE_PAGE_PATHS, type SitePage } from "@/lib/seo/site-meta";

export type IndexableArea = "site" | "payments";

export interface IndexablePage {
  path: string;
  /** The languages its text is written in, English first. */
  langs: readonly string[];
}

const SITE_ORDER: readonly SitePage[] = ["home", "pricing", "swaps", "tos", "about"];

/** The indexable pages of `area`, in sitemap order. */
export function indexablePages(area: IndexableArea): IndexablePage[] {
  if (area === "site") {
    return SITE_ORDER.map((page) => ({ path: SITE_PAGE_PATHS[page], langs: PAGE_LANGS[page] })).filter(
      (page) => !SITE_PATHS_CANONICAL_ON_PAYMENTS.includes(page.path),
    );
  }
  const langs = PAYMENTS_LOCALES.map((l) => l.code);
  return ["/", ...PAYMENTS_PAGE_PATHS].map((path) => ({ path, langs }));
}
