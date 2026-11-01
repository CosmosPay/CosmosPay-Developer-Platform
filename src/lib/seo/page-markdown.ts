/* page-markdown.ts: the Markdown version of an indexable page of the company site or the gateway
   (the builders: site-markdown.ts and payments-markdown.ts), and what a request for one answers:
   the document in the language its address names, or a 301 to the one address of that language
   (src/lib/seo/markdown-urls.ts has the scheme). src/pages/[...page].md.ts serves it, and the
   middleware hands the same document to a GET of the page itself that asks for text/markdown.
   Pure, so tests/unit/seoMarkdown.test.ts covers it. */
import { DEFAULT_LANG, explicitLang, normalizeLangQuery } from "@/lib/seo/lang-urls";
import { markdownLanguages, pageOfMarkdown, type MarkdownArea } from "@/lib/seo/markdown-urls";
import { renderPage, type MarkdownInput, type PageDoc } from "@/lib/seo/markdown";
import { SITE_LANGS } from "@/lib/seo/site-meta";
import { PAYMENTS_LANGS, paymentsPageDoc } from "@/lib/seo/payments-markdown";
import { sitePageDoc } from "@/lib/seo/site-markdown";

/** Every language a host's pages speak (a page may be written in fewer). */
export const AREA_LANGS: Record<MarkdownArea, readonly string[]> = { site: SITE_LANGS, payments: PAYMENTS_LANGS };

/** The page at `path` on `area` in `lang` as a document; null when it has no Markdown version
 *  there or is not written in that language. */
export function pageDoc(area: MarkdownArea, path: string, lang: string, input: MarkdownInput): PageDoc | null {
  return area === "site" ? sitePageDoc(path, lang, input) : paymentsPageDoc(path, lang, input);
}

/** The page's Markdown, as its own document (its title the `#`). */
export function pageMarkdown(area: MarkdownArea, path: string, lang: string, input: MarkdownInput): string | null {
  const doc = pageDoc(area, path, lang, input);
  return doc ? renderPage(doc, 1) : null;
}

/** The language of the version a page's address shows: the `lang` it names when the page is
 *  written in it, else English (the bare path; /tos?lang=fr shows the English terms). */
export function versionLang(area: MarkdownArea, path: string, search: string): string {
  const written = markdownLanguages(area, path) ?? AREA_LANGS[area];
  const asked = explicitLang(new URLSearchParams(search).get("lang"), AREA_LANGS[area]);
  return asked && written.includes(asked) ? asked : DEFAULT_LANG;
}

export type MarkdownAnswer =
  | { kind: "doc"; doc: PageDoc; markdown: string }
  | { kind: "redirect"; location: string }
  | { kind: "not-found" };

/**
 * What a GET of a Markdown address answers on `area` (whose origin is `origin`): the page in the
 * language its `?lang=` names (English bare), or a 301 to the one address of that version: the
 * path in lowercase, `?lang=` as the pages take it (`ES` → `es`, `en` and unknown values dropped),
 * and a language the page is not written in dropped too (its version is the English one). Any
 * other parameter is kept as it came. Not found for a path that is no page's Markdown there.
 */
export function markdownRequest(area: MarkdownArea, pathname: string, search: string, origin: string, input: MarkdownInput): MarkdownAnswer {
  const lower = pathname.toLowerCase();
  const page = pageOfMarkdown(lower);
  if (page === null) return { kind: "not-found" };
  const written = markdownLanguages(area, page);
  if (written === undefined) return { kind: "not-found" };
  const langs = written ?? AREA_LANGS[area];
  const base = origin.replace(/\/+$/, "");
  // The query as the pages take it; then a language this page is not written in leaves it.
  let query = normalizeLangQuery(search, AREA_LANGS[area], DEFAULT_LANG) ?? search;
  const asked = new URLSearchParams(query).get("lang");
  if (asked && !langs.includes(asked)) query = normalizeLangQuery(query, langs, DEFAULT_LANG) ?? query;
  if (lower !== pathname || query !== search) return { kind: "redirect", location: `${base}${lower}${query}` };
  const doc = pageDoc(area, page, versionLang(area, page, search), input);
  return doc ? { kind: "doc", doc, markdown: renderPage(doc, 1) } : { kind: "not-found" };
}

/** The headers a Markdown version leaves with: its type, its language, the HTML page it is a
 *  version of as its canonical (search engines index the page, not the copy). The caller adds
 *  how long it may be kept: its own address is public, a negotiated answer private. */
export function markdownHeaders(doc: PageDoc): Record<string, string> {
  return {
    "Content-Type": "text/markdown; charset=utf-8",
    "Content-Language": doc.lang,
    Link: `<${doc.url}>; rel="canonical"`,
    "X-Content-Type-Options": "nosniff",
  };
}
