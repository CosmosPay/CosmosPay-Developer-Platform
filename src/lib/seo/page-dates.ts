/* page-dates.ts: when each indexable page of the company site and the gateway last changed, for
   the WebPage's `dateModified` in its JSON-LD, the `lastmod` of its sitemap entry and the
   "Updated" line some pages show.

   A page's date is the newest git commit among its OWN sources: the page itself, the components
   that draw its own sections, its copy in the language shown and the data it renders (plans.ts,
   compare.ts...). The copy of most pages lives in catalogs every page imports (one file holds the
   whole gateway in seven languages), so a catalog counts by its blocks, not as a file: the block
   of keys the page reads, in the language shown (`landing-i18n.ts#es.faq`: the Spanish FAQ), dated
   by the newest commit that touched one of its lines (`git blame`). Shared chrome (the nav, the
   footer, the section bar, the final call, the layouts and the structured data) is left out:
   changing it, or how a page is marked up, does not change what the page says.

   The dates are read once per build by scripts/page-dates.mjs (through the `virtual:page-dates`
   module astro.config.mjs builds); without git history (no repository, or a shallow clone such
   as CI's) every page dates to the build. A page that states its own date (the terms, each guide)
   keeps it. Pure, so tests/unit/seoPageDates.test.ts covers it. */
import { GUIDE_DATES, guideOf, pagePath, PAYMENTS_PAGES, type PaymentsPage } from "@/lib/payments/site-pages";
import { TOS_LAST_UPDATED } from "@/lib/seo/site-meta";

/** When each block of a catalog file last changed: file → block path (`en.faq`, `es.pages.faq`,
 *  `default.about`) → ISO date. */
export type BlockDates = Readonly<Record<string, Readonly<Record<string, string>>>>;

export interface DateInput {
  /** Each tracked file (repository-relative, forward slashes) and its last commit date (ISO). */
  dates: Readonly<Record<string, string>>;
  /** The blocks of the catalog files (CATALOG_FILES) and their last commit dates. */
  blocks?: BlockDates;
  /** When the build ran (ISO): the date of every page when git could not answer. */
  built: string;
}

const LANGS = ["en", "es", "pt", "fr", "de", "hi", "zh"] as const;
const LANDING_COPY = "src/lib/payments/landing-i18n.ts";
const platformCatalog = (lang: string): string => `src/lib/i18n/messages/${lang}.ts`;
const learnCatalog = (lang: string): string => `src/lib/payments/learn/${lang}.ts`;

/** The catalogs dated by block: each holds the copy of many pages, so a page reads its own blocks
 *  of them. scripts/page-dates.mjs blames exactly these files. */
export const CATALOG_FILES: readonly string[] = [LANDING_COPY, ...LANGS.map(platformCatalog), ...LANGS.map(learnCatalog)];

/* ---------- catalogs as blocks ---------- */

const ROOT = /^(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\b[^=]*=\s*\{/;
const DEFAULT_ROOT = /^export\s+default\s*\{/;
const KEY = /^( +)(?:([A-Za-z_$][\w$]*)|"([^"]+)"|'([^']+)')\??\s*:/;

/**
 * Where each line of a catalog file belongs: the dotted path of the object keys it sits under, at
 * most two keys below the file's top-level object (`const en = {` is `en`, `export default {` is
 * `default`): `en.faq`, `en.pages.faq`, `default.about.hero`. Keys are read by indentation (two
 * spaces a level, as the catalogs are formatted); a deeper line belongs to the key above it.
 * Comments, blank lines and lines outside a top-level object belong nowhere (null): they change
 * no page.
 */
export function catalogLinePaths(lines: readonly string[]): (string | null)[] {
  let root: string | null = null;
  let keys: string[] = [];
  let inComment = false;
  return lines.map((raw) => {
    const line = raw.replace(/\r$/, "");
    const trimmed = line.trim();
    if (inComment) {
      if (trimmed.includes("*/")) inComment = false;
      return null;
    }
    if (trimmed.startsWith("/*")) {
      inComment = !trimmed.includes("*/", 2);
      return null;
    }
    if (trimmed === "" || trimmed.startsWith("//")) return null;
    if (!/^\s/.test(line)) {
      const name = DEFAULT_ROOT.test(line) ? "default" : ROOT.exec(line)?.[1] ?? null;
      root = name;
      keys = [];
      return null;
    }
    if (root === null) return null;
    const key = KEY.exec(line);
    const depth = key ? key[1].length / 2 : 0;
    if (key && Number.isInteger(depth) && depth >= 1 && depth <= 2) keys = [...keys.slice(0, depth - 1), key[2] ?? key[3] ?? key[4]];
    return keys.length ? [root, ...keys].join(".") : null;
  });
}

/** The newest date of each block of a catalog file, from the date of each of its lines (null for a
 *  line git does not date, such as one not committed yet). */
export function catalogBlockDates(lines: readonly string[], lineDates: readonly (string | null)[]): Record<string, string> {
  const paths = catalogLinePaths(lines);
  const out: Record<string, string> = {};
  paths.forEach((path, i) => {
    const date = lineDates[i];
    if (!path || !date) return;
    if (!out[path] || Date.parse(date) > Date.parse(out[path])) out[path] = date;
  });
  return out;
}

/** A commit's committer time (Unix seconds) and zone (`-0300`) as an ISO date in that zone, as
 *  `git log --format=%cI` writes it: 2026-11-01T02:29:44-03:00. */
export function gitIsoDate(seconds: number, zone: string): string {
  const match = /^([+-])(\d{2})(\d{2})$/.exec(zone);
  const offset = match ? (match[1] === "-" ? -1 : 1) * (Number(match[2]) * 60 + Number(match[3])) : 0;
  const local = new Date((seconds + offset * 60) * 1000).toISOString().slice(0, 19);
  return `${local}${match ? `${match[1]}${match[2]}:${match[3]}` : "Z"}`;
}

/** `git blame --porcelain` output as each line's text and the date of the commit that last
 *  touched it (null for a line not committed yet). */
export function parseBlame(porcelain: string): { lines: string[]; dates: (string | null)[] } {
  const commits = new Map<string, { time?: number; zone?: string }>();
  const lines: string[] = [];
  const dates: (string | null)[] = [];
  let current: { time?: number; zone?: string } | undefined;
  let sha = "";
  for (const row of porcelain.split("\n")) {
    if (row.startsWith("\t")) {
      lines.push(row.slice(1).replace(/\r$/, ""));
      const info = commits.get(sha);
      dates.push(!/^0+$/.test(sha) && info?.time !== undefined ? gitIsoDate(info.time, info.zone ?? "+0000") : null);
      continue;
    }
    const header = /^([0-9a-f]{40}) \d+ \d+/.exec(row);
    if (header) {
      sha = header[1];
      current = commits.get(sha) ?? {};
      commits.set(sha, current);
      continue;
    }
    if (row.startsWith("committer-time ") && current) current.time = Number(row.slice("committer-time ".length));
    else if (row.startsWith("committer-tz ") && current) current.zone = row.slice("committer-tz ".length).trim();
  }
  return { lines, dates };
}

/* ---------- a page's date ---------- */

/** The newest date among `sources`; null when git knows none of them. A source ending in "/"
 *  stands for every file under it; `file#block` for one block of a catalog file (and the blocks
 *  under it: `#en.pages` covers `en.pages.faq`). */
export function newestDate(sources: readonly string[], dates: Readonly<Record<string, string>>, blocks: BlockDates = {}): string | null {
  let newest: string | null = null;
  let newestTime = -Infinity;
  const consider = (date: string) => {
    const time = Date.parse(date);
    if (Number.isFinite(time) && time > newestTime) {
      newest = date;
      newestTime = time;
    }
  };
  const files = sources.filter((s) => !s.includes("#"));
  for (const [file, date] of Object.entries(dates)) {
    if (files.some((s) => (s.endsWith("/") ? file.startsWith(s) : file === s))) consider(date);
  }
  for (const source of sources) {
    const cut = source.indexOf("#");
    if (cut < 0) continue;
    const block = source.slice(cut + 1);
    for (const [path, date] of Object.entries(blocks[source.slice(0, cut)] ?? {})) {
      if (path === block || path.startsWith(`${block}.`)) consider(date);
    }
  }
  return newest;
}

/* A page's blocks of a catalog, in one language. */
const gatewayCopy = (lang: string, ...blocks: string[]): string[] => blocks.map((b) => `${LANDING_COPY}#${lang}.${b}`);
const platformCopy = (lang: string, ...blocks: string[]): string[] => blocks.map((b) => `${platformCatalog(lang)}#default.${b}`);
const PLANS = "src/lib/plans.ts";
const PUBLIC_SWAPS = ["src/components/cosmos/swaps/", "src/lib/public-swaps.ts"];
const section = (...names: string[]): string[] => names.map((n) => `src/components/payments/landing/sections/${n}.astro`);

/** The files and catalog blocks the company site's page at `path` is made from, in `lang`. */
export function siteSources(path: string, lang: string): string[] | null {
  switch (path) {
    case "/":
      return ["src/pages/site/index.astro", "src/components/cosmos/Landing.tsx", "src/components/cosmos/marketing/", ...platformCopy(lang, "landing"), PLANS];
    case "/pricing":
      return ["src/pages/site/pricing.astro", "src/components/cosmos/Pricing.tsx", "src/components/cosmos/pricing/", ...platformCopy(lang, "pricing"), PLANS];
    case "/about":
      return ["src/pages/site/about.astro", "src/lib/site/about.ts", ...platformCopy(lang, "about")];
    case "/swaps":
      return ["src/pages/site/swaps.astro", ...PUBLIC_SWAPS, ...platformCopy(lang, "swapsPage"), PLANS];
    case "/tos":
      return ["src/pages/site/tos.astro", "src/lib/site/terms.ts"];
    default:
      return null;
  }
}

/* Each gateway page's own sections, catalog blocks (besides its header, `pages.<key>`) and data. */
const NETWORK = {
  sections: ["NetworkFacts", "NetworkAssets", "Pricing", "NetworkCode", "Faq"],
  data: ["src/components/payments/landing/NetworkPage.astro", "src/lib/payments/network-pages.ts", "src/lib/chains.ts", PLANS],
};
const PAYMENTS_OWN: Record<Exclude<PaymentsPage, "learn" | `learn/${string}`> | "home", { key?: string; sections: string[]; copy: string[]; data?: string[] }> = {
  home: {
    sections: ["Hero", "Marks", "Benefits", "How", "Paths", "Pricing", "Security", "Faq"],
    copy: ["meta", "hero", "marks", "benefits", "settle", "how", "paths", "pricing", "security", "faq", "pages.notes"],
    data: [PLANS],
  },
  integrations: { sections: ["Integrations", "Developers", "Paths"], copy: ["integrations", "developers", "devTabs", "paths"], data: ["src/lib/payments/integration-demo.ts"] },
  swaps: { sections: [], copy: [], data: [...PUBLIC_SWAPS, PLANS] },
  "use-cases": { key: "useCases", sections: ["Uses", "Compare"], copy: ["useCases", "compare"] },
  security: { sections: ["Security"], copy: ["security"] },
  fees: { sections: ["Pricing"], copy: ["pricing", "calc"], data: [PLANS] },
  compare: { sections: ["CompareRates"], copy: ["comparePage"], data: ["src/lib/payments/compare.ts", PLANS] },
  faq: { sections: ["Faq"], copy: ["faq"] },
  stellar: { sections: NETWORK.sections, copy: ["network", "networks.stellar", "pricing"], data: [...NETWORK.data, "src/lib/stellar-assets.ts"] },
  solana: { sections: NETWORK.sections, copy: ["network", "networks.solana", "pricing"], data: NETWORK.data },
  monad: { sections: NETWORK.sections, copy: ["network", "networks.monad", "pricing"], data: NETWORK.data },
};

/** The files and catalog blocks the gateway's page at `path` is made from, in `lang`. */
export function paymentsSources(path: string, lang: string): string[] | null {
  const page = path === "/" ? "home" : PAYMENTS_PAGES.find((p) => pagePath(p) === path);
  if (!page) return null;
  if (page === "learn") return ["src/pages/payments/learn/index.astro", "src/components/payments/learn/GuideList.astro", `${learnCatalog(lang)}#${lang}.hub`];
  if (guideOf(page)) return ["src/components/payments/learn/GuidePage.astro", `src/pages/payments/${page}.astro`, `${learnCatalog(lang)}#${lang}.guides`, "src/lib/payments/learn/index.ts"];
  const own = PAYMENTS_OWN[page as keyof typeof PAYMENTS_OWN];
  const file = page === "home" ? "src/pages/payments/index.astro" : `src/pages/payments/${page}.astro`;
  const header = page === "home" ? [] : [`pages.${own.key ?? page}`];
  // The public swaps widget reads the platform catalog of the language shown.
  const platform = page === "swaps" ? platformCopy(lang, "swapsPage") : [];
  return [file, ...section(...own.sections), ...gatewayCopy(lang, ...header, ...own.copy), ...platform, ...(own.data ?? [])];
}

/** The date a page states for itself, which wins over git: the terms' "last updated" and each
 *  guide's. */
export function statedDate(area: "site" | "payments", path: string): string | null {
  if (area === "site") return path === "/tos" ? TOS_LAST_UPDATED : null;
  const page = PAYMENTS_PAGES.find((p) => pagePath(p) === path);
  const guide = page ? guideOf(page) : null;
  return guide ? GUIDE_DATES[guide].modified : null;
}

/** The newer of two ISO dates (either may be null). */
function newer(a: string | null, b: string | null): string | null {
  if (!a || !b) return a ?? b;
  return Date.parse(b) > Date.parse(a) ? b : a;
}

/**
 * When the page at `path` on `area`, in `lang`, last changed: the date it states, else the
 * newest commit among its own sources, else the build. The guides' hub lists the guides, so a
 * guide's change (its stated date) is the hub's too. Null for a path that is not an indexable page.
 */
export function pageModified(area: "site" | "payments", path: string, lang: string, input: DateInput): string | null {
  const stated = statedDate(area, path);
  if (stated) return stated;
  const sources = area === "site" ? siteSources(path, lang) : paymentsSources(path, lang);
  if (!sources) return null;
  const own = newestDate(sources, input.dates, input.blocks);
  if (area === "payments" && path === pagePath("learn")) {
    const guides = Object.values(GUIDE_DATES).reduce<string | null>((latest, d) => newer(latest, d.modified), null);
    return newer(own, guides) ?? input.built;
  }
  return own ?? input.built;
}

/** The calendar day of an ISO date as it is written (`2026-11-01T02:29:44-03:00` is
 *  `2026-11-01`, the day where the commit was made), for a `<time>` and a visible date. */
export function dayOf(iso: string): string {
  return /^\d{4}-\d{2}-\d{2}/.exec(iso)?.[0] ?? new Date(iso).toISOString().slice(0, 10);
}

/** A day (or an ISO date's day) as the reader's language writes it in full: "November 1, 2026",
 *  "1 de noviembre de 2026". */
export function longDate(iso: string, lang: string): string {
  return new Intl.DateTimeFormat(lang, { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${dayOf(iso)}T00:00:00Z`));
}
