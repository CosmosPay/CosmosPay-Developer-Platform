/* config.ts — the two addresses the embed needs, inlined by scripts/build-embed.mjs (esbuild
   `define`) from the same variables the app inlines: PUBLIC_PAYMENTS_URL and
   PUBLIC_PAYMENTS_API_URL. The bundle runs on a merchant's page, so it cannot read them at
   runtime; a different environment is a different build of public/embed/cosmos-pay.js.

   Only the element modules import this file. The pure modules take these values as
   arguments, so they load under plain node for the unit tests, where nothing defines them. */
declare const __COSMOS_PAY_PAYMENTS_ORIGIN__: string;
declare const __COSMOS_PAY_API_URL__: string;

/** The payments site's origin, e.g. `https://payments.cosmospay.lat` (no path, no slash). */
export const PAYMENTS_ORIGIN: string = __COSMOS_PAY_PAYMENTS_ORIGIN__;
/** The gateway including its entry prefix, e.g. `https://api.cosmospay.lat/cosmos-api`. */
export const PAYMENTS_API_URL: string = __COSMOS_PAY_API_URL__;
