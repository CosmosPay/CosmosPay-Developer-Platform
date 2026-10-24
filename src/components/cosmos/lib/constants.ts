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

/** The platform's sign-in, landing on `next` (a path on the platform) afterwards. */
export function loginTo(next: string): string {
  return loginUrl(DEV, next);
}

/** The hosted checkout page of one payment link. */
export function checkoutUrl(id: string): string {
  return `${PAYMENTS}/${encodeURIComponent(id)}`;
}
