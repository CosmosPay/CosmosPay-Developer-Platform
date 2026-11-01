/* page-dates-build.ts: page-dates.ts bound to the dates this build read from git
   (`virtual:page-dates`, built by astro.config.mjs). The sitemap and the structured data of the
   company site and the gateway read a page's last change here. */
import { BUILT_AT, GIT_DATES } from "virtual:page-dates";
import { pageModified, type DateInput } from "@/lib/seo/page-dates";

export const PAGE_DATES: DateInput = { dates: GIT_DATES, built: BUILT_AT };

/** When the indexable page at `path` on `area`, in `lang`, last changed (ISO); null for a path that
 *  is not one. */
export function modifiedAt(area: "site" | "payments", path: string, lang: string): string | null {
  return pageModified(area, path, lang, PAGE_DATES);
}
