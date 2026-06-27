'use client';
import SearchDialog from '@/components/search';
import { RootProvider } from 'fumadocs-ui/provider/next';
import { type ReactNode, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { DOCS_TRANSLATIONS } from '@/lib/docs-i18n';
import { initLang } from '@/lib/i18n/index';
import {
  DOCS_LANGUAGES,
  DOCS_LOCALE_ITEMS,
  localeFromPath,
  relocalizePath,
} from '@/lib/i18n-config';

const BASE = '/docs';

function readCookieLang(): string {
  if (typeof document === 'undefined') return 'en';
  const m = document.cookie.match(/(?:^|;\s*)cosmospay-lang=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : 'en';
}

function setCookieLang(lang: string) {
  document.cookie = `cosmospay-lang=${lang};path=/;max-age=31536000;samesite=lax`;
}

/** Hard-navigate to the same page in another locale (reliable in a static export). */
function navigateToLocale(lang: string) {
  if (typeof window === 'undefined') return;
  let p = window.location.pathname; // includes /docs and a trailing slash
  if (p.startsWith(BASE)) p = p.slice(BASE.length) || '/';
  const target = relocalizePath(p.replace(/\/+$/, '') || '/', lang);
  const withSlash = target.endsWith('/') ? target : target + '/';
  const full = `${BASE}${withSlash}`.replace(/\/{2,}/g, '/');
  if (full !== window.location.pathname) window.location.assign(full);
}

export function Provider({ children }: { children: ReactNode }) {
  // The docs content is URL-routed: en at the root, other locales under /<lang>/. The active
  // locale therefore comes from the path, not a cookie.
  const pathname = usePathname();
  const locale = localeFromPath(pathname);

  // Seed the shared Cosmos i18n store with the URL locale *synchronously during render* (the
  // pattern initLang() is built for), so the navbar's LangSelect chip and menu labels reflect
  // the active language. Without this the store starts at 'en' on every static page load, so
  // the chip wrongly showed "EN" on a localized page. Runs before the child <DocsNav> renders.
  initLang(locale);

  // On arrival, reconcile with the portal's shared `cosmospay-lang` choice:
  //  - landed on the default (en) URL but the user picked another language on the portal →
  //    forward to that localized URL once, so the docs follow the navbar selection;
  //  - otherwise the URL wins and we align the cookie to it (so returning to the portal keeps
  //    the same language).
  useEffect(() => {
    const cookie = readCookieLang();
    if (locale === 'en' && cookie !== 'en' && (DOCS_LANGUAGES as readonly string[]).includes(cookie)) {
      navigateToLocale(cookie);
      return;
    }
    setCookieLang(locale);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The visible switcher is the Cosmos navbar's LangSelect; it writes the cookie and
  // broadcasts `cosmospay:lang`. On the docs a language change navigates to the localized URL.
  useEffect(() => {
    const onLang = (e: Event) => {
      const detail = (e as CustomEvent).detail as string | undefined;
      const lang = detail && (DOCS_LANGUAGES as readonly string[]).includes(detail) ? detail : locale;
      navigateToLocale(lang);
    };
    window.addEventListener('cosmospay:lang', onLang);
    return () => window.removeEventListener('cosmospay:lang', onLang);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Single theme system (next-themes) writing BOTH `.dark` (Fumadocs) and `data-theme`
  // (cosmos.css) from one toggle, sharing the portal's `cosmospay-theme` storage key. i18n
  // localizes the Fumadocs UI chrome to the active URL locale.
  return (
    <RootProvider
      theme={{
        attribute: ['class', 'data-theme'],
        defaultTheme: 'light',
        enableSystem: false,
        storageKey: 'cosmospay-theme',
        disableTransitionOnChange: true,
      }}
      i18n={{
        locale,
        locales: DOCS_LOCALE_ITEMS,
        translations: DOCS_TRANSLATIONS[locale],
      }}
      search={{ SearchDialog }}
    >
      {children}
    </RootProvider>
  );
}
