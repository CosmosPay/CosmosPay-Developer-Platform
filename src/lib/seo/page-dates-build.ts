/* page-dates-build.ts: page-dates.ts bound to the dates this build read from git
   (`virtual:page-dates`, built by astro.config.mjs from scripts/page-dates.mjs). The sitemap, the
   structured data and the "Updated" line of the company site and the gateway read a page's last
   change here. */
import { BUILT_AT, GIT_BLOCKS, GIT_DATES } from "virtual:page-dates";
import { longDate, pageModified, type DateInput } from "@/lib/seo/page-dates";

export const PAGE_DATES: DateInput = { dates: GIT_DATES, blocks: GIT_BLOCKS, built: BUILT_AT };

/** When the indexable page at `path` on `area`, in `lang`, last changed (ISO); null for a path that
 *  is not one. */
export function modifiedAt(area: "site" | "payments", path: string, lang: string): string | null {
  return pageModified(area, path, lang, PAGE_DATES);
}

/** The line under the lede of a page that shows when it last changed (/faq, /compare, the network
 *  pages): `template` is the catalog's "Updated {date}" in the page's language. */
export function updatedByline(area: "site" | "payments", path: string, lang: string, template: string): { text: string; datetime: string } | undefined {
  const modified = modifiedAt(area, path, lang);
  return modified ? { text: template.replace("{date}", longDate(modified, lang)), datetime: modified } : undefined;
}
