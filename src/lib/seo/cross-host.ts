/* cross-host.ts: company-site pages whose canonical version is the gateway's page at the same
   path. /swaps exists on both hosts (the product owner keeps both: src/lib/hosts.ts DUAL_PATHS),
   and the two are near duplicates, so cosmospay.lat/swaps names payments.cosmospay.lat/swaps
   canonical in the same language, lists no hreflang of its own and stays out of the company
   sitemap; the gateway's page is the one search engines index. Pure, so
   tests/unit/seoLangUrls.test.ts covers it. */
import { canonicalUrl } from "@/lib/seo/lang-urls";

/** The company site's paths whose canonical lives on the gateway. */
export const SITE_PATHS_CANONICAL_ON_PAYMENTS: readonly string[] = ["/swaps"];

/** The gateway's address that a company-site page names canonical, in the language shown (the
 *  bare path for English); null for a page that is canonical on the company site itself. */
export function crossHostCanonical(
  path: string,
  asked: string | null | undefined,
  langs: readonly string[],
  allLangs: readonly string[],
  payments: string,
): string | null {
  return SITE_PATHS_CANONICAL_ON_PAYMENTS.includes(path) ? canonicalUrl(payments, path, asked, langs, allLangs) : null;
}
