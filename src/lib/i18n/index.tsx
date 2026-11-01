/* i18n/index.tsx: lightweight, SSR-safe multilanguage store for the Cosmos Pay frontend.
   - Locale is read from the `cosmospay-lang` cookie on the server (so SSR + first client
     render agree → no hydration mismatch) and persisted to both cookie + localStorage.
   - Components subscribe via useT()/useLang(); LangSelect flips the locale live with setLang().
   - The browser downloads only the catalogs it uses: the page's language (<html lang>) before
     any island renders, and another one when the visitor picks it. The server holds all seven,
     so the HTML it renders does not depend on any of this. */
import { Fragment, use, useSyncExternalStore, type ReactNode } from "react";
import type { messages } from "@/lib/i18n/messages/index";

export const DEFAULT_LOCALE = "en";

/* The languages the picker offers (src/lib/i18n/locales.ts, a plain module so tests can read it). */
export { LOCALES } from "@/lib/i18n/locales";

const STORAGE_KEY = "cosmospay-lang";

type Catalog = (typeof messages)[keyof typeof messages];

/* One chunk per language: the client build splits each catalog into its own file, so a page
   no longer ships all seven (about 150 KB of compressed JavaScript) to show one. */
const LOADERS: Record<string, () => Promise<{ default: Catalog }>> = {
  en: () => import("@/lib/i18n/messages/en"),
  es: () => import("@/lib/i18n/messages/es"),
  pt: () => import("@/lib/i18n/messages/pt"),
  fr: () => import("@/lib/i18n/messages/fr"),
  de: () => import("@/lib/i18n/messages/de"),
  hi: () => import("@/lib/i18n/messages/hi"),
  zh: () => import("@/lib/i18n/messages/zh"),
};

/* The catalogs at hand, and the downloads in flight (one promise per language, so React's
   use() sees the same promise on every render while it waits). */
const catalogs: Partial<Record<string, Catalog>> = {};
const loading: Partial<Record<string, Promise<Catalog>>> = {};

function isValid(code: string | null | undefined): code is string {
  return !!code && Object.hasOwn(LOADERS, code);
}

/* Fetch a language's catalog (once); a failed download is forgotten so a later pick retries. */
export function loadCatalog(code: string): Promise<Catalog> {
  const ready = catalogs[code];
  if (ready) return Promise.resolve(ready);
  if (!isValid(code)) return Promise.reject(new Error(`No catalog for language "${code}"`));
  return (loading[code] ??= LOADERS[code]().then(
    (mod) => (catalogs[code] = mod.default),
    (err) => {
      delete loading[code];
      throw err;
    },
  ));
}

/* Checked at run time, not with import.meta.env.SSR: the docs (Next.js) build copies this
   module (docs/scripts/sync-portal-ui.mjs) and has no import.meta.env. */
if (typeof window === "undefined") {
  /* Every render on the server may be in any language: hold them all before the first one, so
     a render never waits for a catalog (the language is module state shared by requests). */
  Object.assign(catalogs, (await import("@/lib/i18n/messages/index")).messages);
} else {
  /* The page was rendered in <html lang>; its islands render in that language first, so its
     catalog must be here before they hydrate. Awaiting it here holds every island's module
     (they all import this one) until it is, and the first client render matches the HTML. */
  const first = document.documentElement.lang;
  await loadCatalog(isValid(first) ? first : DEFAULT_LOCALE);
}

/* Module-level current locale. On the server it is set per-render from the page's
   `lang` prop via initLang(); on the client it is also seeded from the prop so the
   first client snapshot matches the server HTML. */
let current = DEFAULT_LOCALE;
let requested = DEFAULT_LOCALE; // the last language asked for (setLang), while its catalog loads
let userSelected = false; // set once the user picks a language (client-side)
const listeners = new Set<() => void>();

/* Called synchronously at the top of each root component render with the SSR lang
   prop. Keeps server + first client snapshot identical, avoiding hydration mismatch.
   Once the user has actively chosen a language via setLang(), the SSR prop is ignored
   so re-renders don't revert their choice. */
export function initLang(code?: string | null) {
  if (!userSelected && isValid(code)) {
    current = code;
    requested = code;
  }
  return current;
}

export function getLang() {
  return current;
}

function apply(code: string) {
  userSelected = true;
  current = code;
  try {
    localStorage.setItem(STORAGE_KEY, code);
    document.cookie = `${STORAGE_KEY}=${code};path=/;max-age=31536000;samesite=lax`;
    document.documentElement.setAttribute("lang", code);
  } catch (e) {}
  listeners.forEach((fn) => fn());
}

/* Switch the language: at once when its catalog is here, otherwise as soon as it arrives
   (unless another language was picked meanwhile). A catalog that cannot be downloaded leaves
   the page in its current language. */
export function setLang(code: string) {
  if (!isValid(code)) return;
  requested = code;
  if (code === current) return;
  if (catalogs[code]) {
    apply(code);
    return;
  }
  loadCatalog(code).then(
    () => {
      if (requested === code && code !== current) apply(code);
    },
    () => {},
  );
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
function getSnapshot() {
  return current;
}
function getServerSnapshot() {
  return current;
}

export function useLang() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/* Returns the full message catalog for the active locale. The page's language is always here
   (see above); an island rendering in another one waits for its catalog (use()). */
export function useT(): Catalog {
  const lang = useLang();
  return catalogs[lang] ?? use(loadCatalog(lang));
}

/* Interpolate {placeholder} tokens in a catalog string. */
export function fmt(str: unknown, vars: Record<string, unknown> = {}) {
  return String(str).replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
}

/* The same with elements in place of the tokens (an address as a link, a transaction): the
   pieces to render, so a translated sentence keeps its links where its language puts them. */
export function fmtNodes(str: string, vars: Record<string, ReactNode> = {}): ReactNode[] {
  return String(str).split(/(\{\w+\})/g).map((part, i) => {
    const token = /^\{(\w+)\}$/.exec(part);
    return <Fragment key={i}>{token && token[1] in vars ? vars[token[1]] : part}</Fragment>;
  });
}
