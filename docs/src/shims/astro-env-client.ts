// Shim for Astro's `astro:env/client` virtual module so the portal's auth-client (reused
// here for the shared navbar/session) resolves inside the Next build. These map to Next's
// NEXT_PUBLIC_* env vars. An empty BETTER_AUTH_URL makes the better-auth client use the
// current origin, which is exactly right, since the docs are served from the same origin
// as the portal (dev.cosmospay.lat/docs), so the session cookie is shared automatically.
export const PUBLIC_BETTER_AUTH_URL = process.env.NEXT_PUBLIC_BETTER_AUTH_URL ?? '';
export const PUBLIC_GA_ID = process.env.NEXT_PUBLIC_GA_ID ?? '';
// The company and payments sites (the navbar's logo, Pricing and sign-out links). Same
// defaults as the portal's astro.config.mjs.
export const PUBLIC_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://cosmospay.lat';
export const PUBLIC_PAYMENTS_URL = process.env.NEXT_PUBLIC_PAYMENTS_URL || 'https://payments.cosmospay.lat';
// The Payments API's base (the WebAPI node's serviceUrl, lib/payments/urls.ts) and the web wallet,
// with the portal's defaults.
export const PUBLIC_PAYMENTS_API_URL = process.env.NEXT_PUBLIC_PAYMENTS_API_URL || 'https://api.cosmospay.lat/cosmos-api';
export const PUBLIC_WALLET_WEB_URL = process.env.NEXT_PUBLIC_WALLET_WEB_URL || 'https://cosmospay.lat/wallet/';
export const PUBLIC_GOOGLE_SITE_VERIFICATION =
  process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION ?? '';
