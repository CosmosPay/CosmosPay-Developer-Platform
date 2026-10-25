/* options.ts — the embed's attributes and the URLs it builds from them. Pure: no DOM and no
   build-time constants, so tests/unit/embedOptions.test.ts loads it under plain node. */
import { isPaymentLinkId, type LinkStatus } from "@/lib/payments/payment-link";
import { EMBED_LOCALES, type EmbedLocale } from "@/embed/i18n";

export type EmbedTheme = "light" | "dark" | "auto";
const THEMES: readonly EmbedTheme[] = ["light", "dark", "auto"];
export const DEFAULT_THEME: EmbedTheme = "light";
export const DEFAULT_LANG: EmbedLocale = "en";

/**
 * The `link` attribute as a payment link id, or null when it is missing or not one. Checked
 * before any request or popup, as the hosted checkout's route does, so a typo never spends
 * the payer's read budget or opens a window onto a 404.
 */
export function parseLinkId(value: string | null | undefined): string | null {
  const id = (value ?? "").trim();
  return isPaymentLinkId(id) ? id : null;
}

/** `light` (the default), `dark`, or `auto` (follows the payer's colour scheme). */
export function parseTheme(value: string | null | undefined): EmbedTheme {
  const theme = (value ?? "").trim().toLowerCase();
  return (THEMES as readonly string[]).includes(theme) ? (theme as EmbedTheme) : DEFAULT_THEME;
}

/** A language tag's base subtag, if the embed ships it: `es-AR` -> `es`, `ja` -> null. */
export function supportedLang(tag: string | null | undefined): EmbedLocale | null {
  const base = (tag ?? "").trim().toLowerCase().split(/[-_]/)[0];
  return (EMBED_LOCALES as readonly string[]).includes(base) ? (base as EmbedLocale) : null;
}

/**
 * The language to draw in: the element's `lang` attribute when the embed ships it, else the
 * first of the browser's languages it ships (`navigator.languages`), else English.
 */
export function resolveLang(attribute: string | null | undefined, preferred: readonly string[] = []): EmbedLocale {
  const explicit = supportedLang(attribute);
  if (explicit) return explicit;
  for (const tag of preferred) {
    const lang = supportedLang(tag);
    if (lang) return lang;
  }
  return DEFAULT_LANG;
}

/**
 * The hosted checkout for a link: `{origin}/{id}`. `lang` only when the merchant set one on
 * the element: the checkout otherwise picks the payer's own language (cookie, then
 * Accept-Language), which is the better guess.
 */
export function checkoutUrl(paymentsOrigin: string, id: string, lang: EmbedLocale | null = null): string {
  const url = new URL(`/${encodeURIComponent(id)}`, paymentsOrigin);
  if (lang) url.searchParams.set("lang", lang);
  return url.href;
}

export interface WindowFrame {
  screenX: number;
  screenY: number;
  outerWidth: number;
  outerHeight: number;
}

export const POPUP_WIDTH = 480;
export const POPUP_HEIGHT = 780;

/**
 * The `window.open` features for the checkout popup: 480×780, centred on the merchant's
 * window, never placed off the top-left of the screen. No `noopener`: the button needs the
 * window it opened to recognise its messages, and the checkout needs its opener to send them.
 */
export function popupFeatures(frame: WindowFrame, width = POPUP_WIDTH, height = POPUP_HEIGHT): string {
  const finite = (n: number) => (Number.isFinite(n) ? n : 0);
  const left = Math.max(0, Math.round(finite(frame.screenX) + (finite(frame.outerWidth) - width) / 2));
  const top = Math.max(0, Math.round(finite(frame.screenY) + (finite(frame.outerHeight) - height) / 2));
  return `popup=yes,width=${width},height=${height},left=${left},top=${top}`;
}

/** `demo` is a boolean attribute: present (with any value but "false") it is on. */
export function isDemo(value: string | null | undefined): boolean {
  return value !== null && value !== undefined && value.trim().toLowerCase() !== "false";
}

/**
 * The sample checkout a `demo` button opens: the payments site's design preview, which no one
 * can pay (its QR encodes a "sample" notice and its wallet buttons are inert).
 */
export function previewUrl(paymentsOrigin: string, lang: EmbedLocale | null = null): string {
  const url = new URL("/preview/classic", paymentsOrigin);
  if (lang) url.searchParams.set("lang", lang);
  return url.href;
}

/** The states a `demo` checkout plays, and how long it stays in each (ms); then it starts over. */
export const DEMO_SEQUENCE: readonly { status: LinkStatus; ms: number }[] = [
  { status: "PENDING", ms: 7_000 },
  { status: "SUBMITTED", ms: 2_500 },
  { status: "SUCCEEDED", ms: 5_000 },
];

/** The window name: one popup per link, so a second click finds the first window. */
export function popupName(id: string): string {
  return `cosmospay-${id}`;
}
