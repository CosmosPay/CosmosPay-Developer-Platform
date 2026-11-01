/* lang-urls.ts: the indexable addresses of a page in every language, shared by the company site
   (cosmospay.lat) and the payments gateway (payments.cosmospay.lat).

   Every indexable page has ONE address per language: the bare path is English (and x-default),
   every other language is `?lang=<code>`. `?lang=en` is not an address of its own: the middleware
   answers it with a 301 to the bare path. A visitor who asks for the bare path while preferring
   another language (the `cosmospay-lang` cookie, which the nav's language switcher and a visit to
   a page's `?lang=` address set, or else the browser's Accept-Language) is sent there with a 302
   (`langRedirect`), only to a language the page is written in; crawlers always get the English
   page they asked for. On a page in another language every link to an indexable page carries
   that language (`localizeHref`). The layouts (canonical, hreflang, og:locale), sitemap.xml,
   robots.txt, llms.txt, the JSON-LD and the links all build their URLs here, so they always
   agree. Pure and free of catalogs (the nav imports it in the browser), so
   tests/unit/seoLangUrls.test.ts covers it. */

import { PAYMENTS_PAGE_PATHS } from "@/lib/payments/site-pages";

/** The language whose version of a page is its bare path. */
export const DEFAULT_LANG = "en";

/** The two hosts whose pages exist once per language. */
export type LangArea = "site" | "payments";

/** Their public origins (src/components/cosmos/lib/constants.ts SITE and PAYMENTS). */
export interface LangHosts {
  site: string;
  payments: string;
}

/** The languages the terms are written in (src/pages/site/tos.astro): any other shows English. */
export const TOS_LANGS: readonly string[] = ["en", "es"];

/* The company site's indexable pages and the languages each is written in (null: all of them). */
const SITE_PAGE_LANGS: Readonly<Record<string, readonly string[] | null>> = {
  "/": null,
  "/pricing": null,
  "/swaps": null,
  "/about": null,
  "/tos": TOS_LANGS,
};

/**
 * The languages the indexable page at `path` on `area` is written in: null when it is written in
 * every language, undefined when `path` is not an indexable page there (a payment link, /pay, a
 * preview: those resolve their language in place and keep their own links).
 */
export function pageLanguages(area: LangArea, path: string): readonly string[] | null | undefined {
  if (area === "site") return Object.hasOwn(SITE_PAGE_LANGS, path) ? SITE_PAGE_LANGS[path] : undefined;
  return path === "/" || PAYMENTS_PAGE_PATHS.includes(path) ? null : undefined;
}

/** The address of `path` on `origin` in `lang`: the bare path for English (or no language),
 *  `?lang=<code>` for any other: `https://payments…/faq?lang=es`. */
export function pageUrl(origin: string, path: string, lang?: string | null): string {
  const url = new URL(path, origin);
  if (lang && lang !== DEFAULT_LANG) url.searchParams.set("lang", lang);
  return url.href;
}

/** Open Graph wants language_TERRITORY: the market each language is written for. */
export const OG_LOCALES = { en: "en_US", es: "es_LA", pt: "pt_BR", fr: "fr_FR", de: "de_DE", hi: "hi_IN", zh: "zh_CN" } as const;

/** The Open Graph locale of a language code; English for one Open Graph has no market for. */
export function ogLocale(code: string): string {
  return (OG_LOCALES as Record<string, string>)[code] ?? OG_LOCALES.en;
}

/** The language a page was asked for in `?lang=`, when the page exists in it; null otherwise. */
export function explicitLang<T extends string>(asked: string | null | undefined, langs: readonly T[]): T | null {
  return langs.find((l) => l === asked) ?? null;
}

export interface Alternate {
  hreflang: string;
  href: string;
}

/** Every version of `path`: one per language (English at the bare path, the others at `?lang=`),
 *  then the bare path again as x-default. */
export function hreflangAlternates(origin: string, path: string, langs: readonly string[]): Alternate[] {
  return [...langs.map((l) => ({ hreflang: l, href: pageUrl(origin, path, l) })), { hreflang: "x-default", href: pageUrl(origin, path) }];
}

/**
 * The canonical URL of the version being shown. A language the page exists in names itself
 * (English is the bare path); the bare path names itself. A language the page is not written in
 * (a valid `?lang=` for the interface, while the page's own text exists in fewer languages, as
 * /tos) points at the first language of `langs`, the one it falls back to.
 */
export function canonicalUrl(origin: string, path: string, asked: string | null | undefined, langs: readonly string[], allLangs: readonly string[] = langs): string {
  if (!asked) return pageUrl(origin, path);
  if (langs.includes(asked)) return pageUrl(origin, path, asked);
  if (allLangs.includes(asked)) return pageUrl(origin, path, langs[0]);
  return pageUrl(origin, path);
}

/** The base subtag of a language value as people write it: `ES`, `pt-BR`, `zh_CN` → es, pt, zh. */
function baseOf(value: string): string {
  return value.trim().toLowerCase().split(/[-_]/)[0];
}

function decodeQueryPart(part: string): string | null {
  try {
    return decodeURIComponent(part.replace(/\+/g, " "));
  } catch {
    return null;
  }
}

const isLangPart = (part: string): boolean => decodeQueryPart(part.split("=")[0]) === "lang";

/**
 * The query string a page should have been asked with, when its `lang` parameter is not one the
 * pages take as written: a case or region variant becomes the language (`?lang=ES`, `?lang=pt-BR`
 * → `?lang=es`, `?lang=pt`), a value no page exists in is dropped (`?lang=xx`, `?lang=`), and a
 * repeated `lang` keeps its first usable value. With `defaultLang` (an indexable page, whose bare
 * path IS that language), naming it is dropped too: `?lang=en` → the bare path. Null when the
 * query is fine as it is, so only a wrong one is redirected. Every other parameter is kept byte
 * for byte (a SEP-7 URI in `/pay?uri=` must reach the page exactly as it was sent). Returns ""
 * when nothing is left.
 */
export function normalizeLangQuery(search: string, langs: readonly string[], defaultLang?: string): string | null {
  const raw = search.startsWith("?") ? search.slice(1) : search;
  if (!raw) return null;
  const parts = raw.split("&");
  const langParts = parts.filter(isLangPart);
  if (langParts.length === 0) return null;
  const values = langParts.map((part) => decodeQueryPart(part.slice(part.indexOf("=") + 1 || part.length)) ?? "");
  const found = values.map(baseOf).find((v) => langs.includes(v)) ?? null;
  const chosen = found === defaultLang ? null : found;
  if (langParts.length === 1 && chosen !== null && langParts[0] === `lang=${chosen}`) return null;
  const out: string[] = [];
  let placed = false;
  for (const part of parts) {
    if (!isLangPart(part)) {
      if (part) out.push(part);
      continue;
    }
    if (!placed && chosen) out.push(`lang=${chosen}`);
    placed = true;
  }
  return out.length ? `?${out.join("&")}` : "";
}

/**
 * The query string of the same page in `lang`: `lang=<code>` set (in place, or at the end),
 * or removed for the default language, whose version is the bare path. Every other parameter is
 * kept byte for byte. The nav's language switcher builds the address it reloads with this.
 */
export function langSearch(search: string, lang: string, defaultLang: string = DEFAULT_LANG): string {
  const raw = search.startsWith("?") ? search.slice(1) : search;
  const parts = raw ? raw.split("&").filter(Boolean) : [];
  const out: string[] = [];
  let placed = false;
  for (const part of parts) {
    if (!isLangPart(part)) {
      out.push(part);
      continue;
    }
    if (!placed && lang !== defaultLang) out.push(`lang=${encodeURIComponent(lang)}`);
    placed = true;
  }
  if (!placed && lang !== defaultLang) out.push(`lang=${encodeURIComponent(lang)}`);
  return out.length ? `?${out.join("&")}` : "";
}

/** The language a visitor asks for among `langs`: the language switcher's cookie, else the
 *  Accept-Language entry with the highest weight the pages exist in; null when neither names one.
 *  A cookie naming the default language is a choice too: it keeps the visitor on English. */
export function visitorLang(cookie: string | null | undefined, acceptLanguage: string | null | undefined, langs: readonly string[]): string | null {
  if (cookie && langs.includes(cookie)) return cookie;
  const wanted = (acceptLanguage ?? "")
    .split(",")
    .map((part, index) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params.map((p) => p.trim()).find((p) => p.startsWith("q="));
      return { base: baseOf(tag ?? ""), q: q ? Number(q.slice(2)) || 0 : 1, index };
    })
    .filter((x) => x.base && x.q > 0)
    .sort((a, b) => b.q - a.q || a.index - b.index);
  return wanted.find((w) => langs.includes(w.base))?.base ?? null;
}

/* Crawlers and link previews: they are never redirected by language (they normally send no
   Accept-Language either, so this is a second guard, not the rule). */
const CRAWLER = /bot\b|crawl|spider|slurp|facebookexternalhit|embedly|linkpreview|lighthouse|headlesschrome|inspectiontool|mediapartners|chatgpt-user|perplexity|claude-user/i;

export function isCrawler(userAgent: string | null | undefined): boolean {
  return !!userAgent && CRAWLER.test(userAgent);
}

export interface LangRedirectRequest {
  method: string;
  /** The public path as asked (kept as it came). */
  pathname: string;
  /** The query as asked, with its leading "?" (or ""). */
  search: string;
  cookie?: string | null;
  acceptLanguage?: string | null;
  userAgent?: string | null;
}

/**
 * Where a visitor who asked for an indexable page's bare (English) address should go instead:
 * the same path and query with `lang=<code>` appended, for the language the switcher's cookie
 * names, else the one Accept-Language prefers. Null (serve the English page) for anything but a
 * GET, a query that already names a language, a crawler, no preference, or English. The target
 * names its language, so it is never redirected again: no loop. The caller only asks this for
 * indexable pages; payment links and the other noindex pages resolve their language in place.
 */
export function langRedirect(req: LangRedirectRequest, langs: readonly string[], defaultLang: string = DEFAULT_LANG): string | null {
  if (req.method.toUpperCase() !== "GET") return null;
  const raw = req.search.startsWith("?") ? req.search.slice(1) : req.search;
  if (raw.split("&").some(isLangPart)) return null;
  if (isCrawler(req.userAgent)) return null;
  const lang = visitorLang(req.cookie, req.acceptLanguage, langs);
  if (!lang || lang === defaultLang) return null;
  return `${req.pathname}${langSearch(req.search, lang, defaultLang)}`;
}

/* `origin` with no trailing slash, and whether `href` is on it (the origin itself, or a path,
   query or fragment under it). */
const trimOrigin = (origin: string): string => origin.replace(/\/+$/, "");
const onOrigin = (href: string, origin: string): boolean =>
  href === origin || href.startsWith(`${origin}/`) || href.startsWith(`${origin}?`) || href.startsWith(`${origin}#`);

/**
 * A link as a page in `lang` writes it: a link to an indexable page of the company site or the
 * gateway (absolute, or a path on `here`, the host the page is on) carries `?lang=<lang>`, so a
 * visitor and a crawler stay in the language they are reading. English links stay bare (English
 * is the bare path), and so does a link to a page not written in `lang` (the terms in French:
 * their English version is the canonical one). Links to anything else (a payment link, /pay, the
 * docs, another site, a fragment of the same page) are returned as given. The fragment and every
 * other query parameter are kept byte for byte. Every link the nav, the footer and the pages of
 * both hosts draw goes through here (constants.ts `langHref`, `landingData().href`).
 */
export function localizeHref(href: string, lang: string | null | undefined, hosts: LangHosts, here?: LangArea): string {
  if (!lang || lang === DEFAULT_LANG) return href;
  const site = trimOrigin(hosts.site);
  const payments = trimOrigin(hosts.payments);
  let prefix = "";
  let areas: LangArea[];
  if (onOrigin(href, site) || onOrigin(href, payments)) {
    prefix = onOrigin(href, site) ? site : payments;
    // One host may serve both areas (a local single-host setup): then the path decides.
    areas = [...(onOrigin(href, site) ? (["site"] as const) : []), ...(onOrigin(href, payments) ? (["payments"] as const) : [])];
  } else if (here && href.startsWith("/") && !href.startsWith("//")) {
    areas = [here];
  } else {
    return href;
  }
  const rest = href.slice(prefix.length);
  const cut = rest.search(/[?#]/);
  const path = (cut < 0 ? rest : rest.slice(0, cut)) || "/";
  const tail = cut < 0 ? "" : rest.slice(cut);
  const hashAt = tail.indexOf("#");
  const query = hashAt < 0 ? tail : tail.slice(0, hashAt);
  const hash = hashAt < 0 ? "" : tail.slice(hashAt);
  const written = areas.map((area) => pageLanguages(area, path)).find((langs) => langs !== undefined);
  if (written === undefined || (written !== null && !written.includes(lang))) return href;
  return `${prefix}${path}${langSearch(query, lang)}${hash}`;
}
