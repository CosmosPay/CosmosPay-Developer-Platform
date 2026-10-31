/* lang-urls.ts: the indexable addresses of a page in every language, shared by the company site
   (cosmospay.lat) and the payments gateway (payments.cosmospay.lat).

   Every indexable page exists once per language at `?lang=<code>` (the language resolution reads
   it first: src/middleware.ts, resolveLocale in src/lib/payments/i18n.ts); the bare path follows
   the visitor (cookie, then Accept-Language) and stands as x-default. The layouts (canonical,
   hreflang, og:locale), sitemap.xml, robots.txt and the JSON-LD all build their URLs here, so
   they always agree. Pure, so tests/unit/seoLangUrls.test.ts covers it. */

/** The address of `path` on `origin`, in `lang` when given: `https://payments…/faq?lang=es`. */
export function pageUrl(origin: string, path: string, lang?: string | null): string {
  const url = new URL(path, origin);
  if (lang) url.searchParams.set("lang", lang);
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

/** Every version of `path`: one per language at `?lang=`, then the bare path as x-default. */
export function hreflangAlternates(origin: string, path: string, langs: readonly string[]): Alternate[] {
  return [...langs.map((l) => ({ hreflang: l, href: pageUrl(origin, path, l) })), { hreflang: "x-default", href: pageUrl(origin, path) }];
}

/**
 * The canonical URL of the version being shown. A language the page exists in names itself;
 * the bare path names itself (x-default). A language the page is not written in (a valid
 * `?lang=` for the interface, while the page's own text exists in fewer languages, as /tos)
 * points at the first language of `langs`, the one it falls back to.
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

/**
 * The query string a page should have been asked with, when its `lang` parameter is not one the
 * pages take as written: a case or region variant becomes the language (`?lang=ES`, `?lang=pt-BR`
 * → `?lang=es`, `?lang=pt`), a value no page exists in is dropped (`?lang=xx`, `?lang=`), and a
 * repeated `lang` keeps its first usable value. Null when the query is fine as it is, so only a
 * wrong one is redirected. Every other parameter is kept byte for byte (a SEP-7 URI in `/pay?uri=`
 * must reach the page exactly as it was sent). Returns "" when nothing is left.
 */
export function normalizeLangQuery(search: string, langs: readonly string[]): string | null {
  const raw = search.startsWith("?") ? search.slice(1) : search;
  if (!raw) return null;
  const parts = raw.split("&");
  const isLang = (part: string) => decodeQueryPart(part.split("=")[0]) === "lang";
  const langParts = parts.filter(isLang);
  if (langParts.length === 0) return null;
  const values = langParts.map((part) => decodeQueryPart(part.slice(part.indexOf("=") + 1 || part.length)) ?? "");
  if (langParts.length === 1 && langs.includes(values[0]) && langParts[0] === `lang=${values[0]}`) return null;
  const chosen = values.map(baseOf).find((v) => langs.includes(v)) ?? null;
  const out: string[] = [];
  let placed = false;
  for (const part of parts) {
    if (!isLang(part)) {
      if (part) out.push(part);
      continue;
    }
    if (!placed && chosen) out.push(`lang=${chosen}`);
    placed = true;
  }
  return out.length ? `?${out.join("&")}` : "";
}
