/// <reference path="../.astro/types.d.ts" />
declare namespace App {
  // Note: 'import {} from ""' syntax does not work in .d.ts files.
  interface Locals {
    user: import("better-auth").User | null;
    session: import("better-auth").Session | null;
    /** The domain this request is served as (src/lib/hosts.ts), set by src/middleware.ts. */
    area: import("@/lib/hosts").Area;
    /** The public path, before any internal rewrite to /site or /payments. */
    publicPath: string;
    /** Company site and payments pages: ?lang= → cookie → Accept-Language → en (src/middleware.ts). */
    lang?: import("@/lib/payments/i18n").Locale;
  }
}

/** Injected by the Cosmos Wallet browser extension's content script. */
interface Window {
  cosmosWallet?: { requestPayment(uri: string): Promise<unknown> };
}
