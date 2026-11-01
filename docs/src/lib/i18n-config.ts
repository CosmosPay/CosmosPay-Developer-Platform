import { defineI18n } from 'fumadocs-core/i18n';

// URL-based docs i18n. The default language (en) stays unprefixed (/docs/sdk/...) and the
// others get a locale segment (/docs/es/sdk/...) via `hideLocale: 'default-locale'`. Per-locale
// content lives in dot-suffixed siblings (overview.es.mdx, meta.es.json, via `parser: 'dot'`),
// and any page without a translation falls back to English (`fallbackLanguage: 'en'`). The
// language codes mirror the portal's LangSelect (lib/i18n).
export const DOCS_LANGUAGES = ['en', 'es', 'fr', 'de', 'pt'] as const;
export type DocsLanguage = (typeof DOCS_LANGUAGES)[number];
export const DEFAULT_DOCS_LANGUAGE: DocsLanguage = 'en';

export const i18n = defineI18n({
  defaultLanguage: 'en',
  languages: [...DOCS_LANGUAGES],
  hideLocale: 'default-locale',
  parser: 'dot',
  fallbackLanguage: 'en',
});

/** The native language names shown in Fumadocs' own language UI (kept for completeness; the
 *  visible switcher is the Cosmos navbar's LangSelect). */
export const DOCS_LOCALE_ITEMS = [
  { locale: 'en', name: 'English' },
  { locale: 'es', name: 'Español' },
  { locale: 'pt', name: 'Português' },
  { locale: 'fr', name: 'Français' },
  { locale: 'de', name: 'Deutsch' },
];

export function isDocsLanguage(code: string | undefined): code is DocsLanguage {
  return Boolean(code) && (DOCS_LANGUAGES as readonly string[]).includes(code as string);
}

/** Split route segments into the language and the page slug. A leading non-default locale
 *  (`['es', 'sdk', ...]`) selects that language; anything else is a default-language slug.
 *  This keeps the default language at the unprefixed root (/docs/sdk/...) and the others under
 *  /docs/<lang>/..., which a static export needs (no middleware to rewrite locales). */
export function splitLocale(segments: string[] | undefined): { lang: DocsLanguage; slug: string[] } {
  const segs = segments ?? [];
  if (isDocsLanguage(segs[0]) && segs[0] !== DEFAULT_DOCS_LANGUAGE) {
    return { lang: segs[0], slug: segs.slice(1) };
  }
  return { lang: DEFAULT_DOCS_LANGUAGE, slug: segs };
}

/** Extract the active locale from a (basePath-stripped) pathname like `/es/sdk/...`. */
export function localeFromPath(pathname: string): DocsLanguage {
  const seg = pathname.split('/').filter(Boolean)[0];
  return (seg && (DOCS_LANGUAGES as readonly string[]).includes(seg) && seg !== 'en'
    ? seg
    : 'en') as DocsLanguage;
}

/** Rewrite a (basePath-stripped) pathname to a different locale, keeping the page path. */
export function relocalizePath(pathname: string, lang: string): string {
  const parts = pathname.split('/').filter(Boolean);
  if (parts[0] && (DOCS_LANGUAGES as readonly string[]).includes(parts[0]) && parts[0] !== 'en') {
    parts.shift();
  }
  const prefix = lang && lang !== 'en' ? [lang] : [];
  const joined = [...prefix, ...parts].join('/');
  return '/' + joined;
}
