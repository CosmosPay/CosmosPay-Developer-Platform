/* page-dates.ts: when each indexable page of the company site and the gateway last changed, for
   the WebPage's `dateModified` in its JSON-LD and the `lastmod` of its sitemap entry.

   A page's date is the newest git commit date among the files its content comes from: the page
   itself, the components that draw its sections, its copy (the catalog of the language shown,
   or the one file that holds every language) and the data it renders (plans.ts, chains.ts...).
   SEO plumbing (layouts, structured data, the head) is left out: changing how a page is marked up
   does not change the page. The commit dates are read once at build (the `virtual:page-dates`
   module that astro.config.mjs builds from `git log`); without git history (no repository, or a
   shallow clone such as CI's) every page dates to the build. A page that states its own date
   (the terms, each guide) keeps it. Pure, so tests/unit/seoPageDates.test.ts covers it. */
import { GUIDE_DATES, guideOf, pagePath, PAYMENTS_PAGES, type PaymentsPage } from "@/lib/payments/site-pages";
import { TOS_LAST_UPDATED } from "@/lib/seo/site-meta";

export interface DateInput {
  /** Each tracked file (repository-relative, forward slashes) and its last commit date (ISO). */
  dates: Readonly<Record<string, string>>;
  /** When the build ran (ISO): the date of every page when git could not answer. */
  built: string;
}

/** The newest date among `sources` (a source ending in "/" stands for every file under it);
 *  null when git knows none of them. */
export function newestDate(sources: readonly string[], dates: Readonly<Record<string, string>>): string | null {
  let newest: string | null = null;
  let newestTime = -Infinity;
  for (const [file, date] of Object.entries(dates)) {
    if (!sources.some((s) => (s.endsWith("/") ? file.startsWith(s) : file === s))) continue;
    const time = Date.parse(date);
    if (Number.isFinite(time) && time > newestTime) {
      newest = date;
      newestTime = time;
    }
  }
  return newest;
}

const catalog = (lang: string): string => `src/lib/i18n/messages/${lang}.ts`;
const LANDING_COPY = "src/lib/payments/landing-i18n.ts";
const LANDING_PARTS = [
  "src/components/payments/landing/sections/",
  "src/components/payments/landing/data.ts",
  "src/lib/payments/landing-content.ts",
  "src/components/payments/landing/PageHeader.astro",
];
const PUBLIC_SWAPS = ["src/components/cosmos/swaps/", "src/lib/public-swaps.ts"];
const PLANS = "src/lib/plans.ts";

/** The files the company site's page at `path` is made from, in `lang`. */
export function siteSources(path: string, lang: string): string[] | null {
  switch (path) {
    case "/":
      return ["src/pages/site/index.astro", "src/components/cosmos/Landing.tsx", "src/components/cosmos/marketing/", catalog(lang), PLANS];
    case "/pricing":
      return ["src/pages/site/pricing.astro", "src/components/cosmos/Pricing.tsx", "src/components/cosmos/pricing/", "src/lib/seo/site-meta.ts", catalog(lang), PLANS];
    case "/about":
      return ["src/pages/site/about.astro", "src/lib/site/about.ts", "src/lib/seo/site-meta.ts", catalog(lang)];
    case "/swaps":
      return ["src/pages/site/swaps.astro", ...PUBLIC_SWAPS, catalog(lang), PLANS];
    case "/tos":
      return ["src/pages/site/tos.astro", "src/lib/site/terms.ts"];
    default:
      return null;
  }
}

/* What a gateway page renders besides its sections and its copy. */
const PAYMENTS_EXTRA: Partial<Record<PaymentsPage | "home", string[]>> = {
  home: [PLANS],
  fees: [PLANS],
  compare: [PLANS, "src/lib/payments/compare.ts"],
  integrations: ["src/lib/payments/integration-demo.ts"],
  swaps: [...PUBLIC_SWAPS, PLANS],
};
const NETWORK_SOURCES = ["src/components/payments/landing/NetworkPage.astro", "src/lib/payments/network-pages.ts", "src/lib/stellar-assets.ts", "src/lib/chains.ts", PLANS];

/** The files the gateway's page at `path` is made from, in `lang`. */
export function paymentsSources(path: string, lang: string): string[] | null {
  if (path === "/") return ["src/pages/payments/index.astro", ...LANDING_PARTS, LANDING_COPY, ...(PAYMENTS_EXTRA.home ?? [])];
  const page = PAYMENTS_PAGES.find((p) => pagePath(p) === path);
  if (!page) return null;
  if (page === "learn") return ["src/pages/payments/learn/index.astro", "src/components/payments/learn/", `src/lib/payments/learn/${lang}.ts`, "src/lib/payments/learn/index.ts", ...LANDING_PARTS];
  if (guideOf(page)) return ["src/components/payments/learn/", `src/lib/payments/learn/${lang}.ts`, "src/lib/payments/learn/index.ts"];
  const own = [`src/pages/payments/${page}.astro`, ...LANDING_PARTS, LANDING_COPY];
  if (page === "stellar" || page === "solana" || page === "monad") return [...own, ...NETWORK_SOURCES];
  // The public swaps widget reads the platform catalog of the language shown.
  if (page === "swaps") return [...own, catalog(lang), ...(PAYMENTS_EXTRA.swaps ?? [])];
  return [...own, ...(PAYMENTS_EXTRA[page] ?? [])];
}

/** The date a page states for itself, which wins over git: the terms' "last updated" and each
 *  guide's. */
export function statedDate(area: "site" | "payments", path: string): string | null {
  if (area === "site") return path === "/tos" ? TOS_LAST_UPDATED : null;
  const page = PAYMENTS_PAGES.find((p) => pagePath(p) === path);
  const guide = page ? guideOf(page) : null;
  return guide ? GUIDE_DATES[guide].modified : null;
}

/**
 * When the page at `path` on `area`, in `lang`, last changed: the date it states, else the
 * newest commit among its sources, else the build. Null for a path that is not an indexable page.
 */
export function pageModified(area: "site" | "payments", path: string, lang: string, input: DateInput): string | null {
  const stated = statedDate(area, path);
  if (stated) return stated;
  const sources = area === "site" ? siteSources(path, lang) : paymentsSources(path, lang);
  if (!sources) return null;
  return newestDate(sources, input.dates) ?? input.built;
}
