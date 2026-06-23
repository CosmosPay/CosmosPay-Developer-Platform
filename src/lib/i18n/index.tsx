/* i18n/index.tsx — lightweight, SSR-safe multilanguage store for the Cosmos Pay frontend.
   - Locale is read from the `cosmospay-lang` cookie on the server (so SSR + first client
     render agree → no hydration mismatch) and persisted to both cookie + localStorage.
   - Components subscribe via useT()/useLang(); LangSelect flips the locale live with setLang(). */
import { useSyncExternalStore } from "react";
import { messages } from "@/lib/i18n/messages/index";

export const DEFAULT_LOCALE = "en";

/* code → { label (nav chip), name (native), flag (Flag svg key) } */
export const LOCALES = [
  { code: "en", label: "EN", name: "English", flag: "EN" },
  { code: "es", label: "ES", name: "Español", flag: "ES" },
  { code: "pt", label: "PT", name: "Português", flag: "PT" },
  { code: "fr", label: "FR", name: "Français", flag: "FR" },
  { code: "de", label: "DE", name: "Deutsch", flag: "DE" },
];

const STORAGE_KEY = "cosmospay-lang";

/* Module-level current locale. On the server it is set per-render from the page's
   `lang` prop via initLang(); on the client it is also seeded from the prop so the
   first client snapshot matches the server HTML. */
let current = DEFAULT_LOCALE;
let userSelected = false; // set once the user picks a language (client-side)
const listeners = new Set();

function isValid(code) {
  return !!(code && messages[code]);
}

/* Called synchronously at the top of each root component render with the SSR lang
   prop. Keeps server + first client snapshot identical, avoiding hydration mismatch.
   Once the user has actively chosen a language via setLang(), the SSR prop is ignored
   so re-renders don't revert their choice. */
export function initLang(code) {
  if (!userSelected && isValid(code)) {
    current = code;
  }
  return current;
}

export function getLang() {
  return current;
}

export function setLang(code) {
  if (!isValid(code) || code === current) return;
  userSelected = true;
  current = code;
  try {
    localStorage.setItem(STORAGE_KEY, code);
    document.cookie = `${STORAGE_KEY}=${code};path=/;max-age=31536000;samesite=lax`;
    document.documentElement.setAttribute("lang", code);
  } catch (e) {}
  listeners.forEach((fn) => fn());
}

function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
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

/* Returns the full message catalog for the active locale (falls back to English). */
export function useT() {
  const lang = useLang();
  return messages[lang] || messages[DEFAULT_LOCALE];
}

/* Interpolate {placeholder} tokens in a catalog string. */
export function fmt(str, vars = {}) {
  return String(str).replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
}
