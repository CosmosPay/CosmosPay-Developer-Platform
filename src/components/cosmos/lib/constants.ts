/* The three origins this app answers on, and the routes the islands link to.
   One deployment serves cosmospay.lat (company site), dev.cosmospay.lat (the platform) and
   payments.cosmospay.lat (hosted checkout); src/middleware.ts routes each request by host
   (src/lib/hosts.ts). A link that may be rendered on another domain than its target is
   absolute, so it never takes a redirect hop. */
import { PUBLIC_BETTER_AUTH_URL, PUBLIC_PAYMENTS_URL, PUBLIC_SITE_URL } from "astro:env/client";
import { loginUrl, normalizeOrigin } from "@/lib/urls";

export const SITE = normalizeOrigin(PUBLIC_SITE_URL);
/* The platform's origin is the auth origin: Better Auth is served there. */
export const DEV = normalizeOrigin(PUBLIC_BETTER_AUTH_URL);
export const PAYMENTS = normalizeOrigin(PUBLIC_PAYMENTS_URL);

export const HOME = SITE;
export const PRICING = `${SITE}/pricing`;
export const TERMS = `${SITE}/tos`;
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

/** The domain a nav or footer is drawn on (src/lib/hosts.ts names the same three areas). */
export type Area = "site" | "dev" | "payments";

/** On the payments gateway its own links stay on it: a link into PAYMENTS becomes a
 * same-origin path there, so the logo, Pricing and the product links never leave the
 * gateway for the company site. Elsewhere the link is returned as given. */
export function localHref(href: string, area?: Area): string {
  if (area === "payments" && (href === PAYMENTS || href.startsWith(`${PAYMENTS}/`))) return href.slice(PAYMENTS.length) || "/";
  return href;
}

/** The logo's target: the home of the domain the bar is on (the gateway's on payments). */
export function homeFor(area?: Area): string {
  return area === "payments" ? "/" : HOME;
}

/** Pricing: the gateway's own pricing section on payments, the pricing page elsewhere. */
export function pricingFor(area?: Area): string {
  return area === "payments" ? "/#pricing" : PRICING;
}

/** The platform's sign-in, landing on `next` (a path on the platform) afterwards. */
export function loginTo(next: string): string {
  return loginUrl(DEV, next);
}

/** The hosted checkout page of one payment link. */
export function checkoutUrl(id: string): string {
  return `${PAYMENTS}/${encodeURIComponent(id)}`;
}
