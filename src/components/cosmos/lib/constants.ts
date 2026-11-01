/* The three origins this app answers on, and the routes the islands link to.
   One deployment serves cosmospay.lat (company site), dev.cosmospay.lat (the platform) and
   payments.cosmospay.lat (hosted checkout); src/middleware.ts routes each request by host
   (src/lib/hosts.ts). A link that may be rendered on another domain than its target is
   absolute, so it never takes a redirect hop. */
import { PUBLIC_BETTER_AUTH_URL, PUBLIC_PAYMENTS_URL, PUBLIC_SITE_URL } from "astro:env/client";
import { loginUrl, normalizeOrigin } from "@/lib/urls";
import { localizeHref } from "@/lib/seo/lang-urls";

export const SITE = normalizeOrigin(PUBLIC_SITE_URL);
/* The platform's origin is the auth origin: Better Auth is served there. */
export const DEV = normalizeOrigin(PUBLIC_BETTER_AUTH_URL);
export const PAYMENTS = normalizeOrigin(PUBLIC_PAYMENTS_URL);

export const HOME = SITE;
export const PRICING = `${SITE}/pricing`;
export const TERMS = `${SITE}/tos`;
export const ABOUT = `${SITE}/about`;
export const DASH = `${DEV}/dashboard`;
export const DOCS = `${DEV}/docs`;
export const LOGIN = loginUrl(DEV);

/* The company's social profiles (the footer's icons). */
export const SOCIAL = {
  x: "https://x.com/CosmosPay",
  instagram: "https://www.instagram.com/cosmospay.lat/",
  discord: "https://discord.gg/Yb5MNcqQsp",
  whatsapp: "https://wa.me/5493874732727",
  linkedin: "https://www.linkedin.com/company/cosmospay/",
} as const;

/** Each profile's name, as the About page writes it beside its glyph (and its Markdown version
 *  lists it). */
export const SOCIAL_NAMES: Record<keyof typeof SOCIAL, string> = { x: "X", instagram: "Instagram", discord: "Discord", whatsapp: "WhatsApp", linkedin: "LinkedIn" };

/** The domain a nav or footer is drawn on (src/lib/hosts.ts names the same three areas). */
export type Area = "site" | "dev" | "payments";

/** A link in the language of the page that draws it (`lang`): a link to an indexable page of the
 *  company site or the gateway carries `?lang=<lang>` (English stays bare; anything else as given:
 *  localizeHref in src/lib/seo/lang-urls.ts). `area` is the domain the page is on, for paths. */
export function langHref(href: string, lang?: string | null, area?: Area): string {
  return localizeHref(href, lang, { site: SITE, payments: PAYMENTS }, area === "site" || area === "payments" ? area : undefined);
}

/** On the payments gateway its own links stay on it: a link into PAYMENTS becomes a
 * same-origin path there, so the logo, Pricing and the product links never leave the
 * gateway for the company site. Elsewhere the link is returned as given. Either way it is in
 * the page's language (`lang`, langHref). */
export function localHref(href: string, area?: Area, lang?: string | null): string {
  if (area === "payments" && (href === PAYMENTS || href.startsWith(`${PAYMENTS}/`))) return langHref(href.slice(PAYMENTS.length) || "/", lang, area);
  // The public swaps exist on the company site too (src/pages/site/swaps.astro): there they stay local.
  if (area === "site" && href === `${PAYMENTS}/swaps`) return langHref("/swaps", lang, area);
  return langHref(href, lang, area);
}

/** The logo's target: the home of the domain the bar is on (the gateway's on payments). */
export function homeFor(area?: Area, lang?: string | null): string {
  return langHref(area === "payments" ? "/" : HOME, lang, area);
}

/** Pricing: the gateway's own pricing page on payments (/fees), the company's elsewhere. */
export function pricingFor(area?: Area, lang?: string | null): string {
  return langHref(area === "payments" ? "/fees" : PRICING, lang, area);
}

/** The platform's sign-in, landing on `next` (a path on the platform) afterwards. */
export function loginTo(next: string): string {
  return loginUrl(DEV, next);
}

/** The hosted checkout page of one payment link. */
export function checkoutUrl(id: string): string {
  return `${PAYMENTS}/${encodeURIComponent(id)}`;
}
