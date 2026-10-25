/* apisix-keyless.ts is the pure half of the keyless APISIX routes (src/utils/apisix.ts): which
   gateway URIs each one serves, and the CORS the public payment-link read answers with.

   Kept apart from the admin calls for the same reason as apisix-upstream.ts: these are the
   decisions that fail silently in production (a URI two routes both match, a CORS header a
   browser refuses), and none of them needs `astro:env` or a network to be checked:
   tests/unit/apisixKeyless.test.ts reaches them directly. */

/* Where the community server serves the callback, relative to the gateway entry:
   `/v1/wallet/auth/oauth/callback/{provider}`, the redirect URI registered with each
   provider (WALLET_AUTH_PUBLIC_BASE_URL over there). The trailing `*` in the URI covers the
   segment it appends. */
export const WALLET_AUTH_CALLBACK_PATH = '/v1/wallet/auth/oauth/callback/';

/* Where the community server serves the shared public key to a wallet with no account
   (`GET /v1/public-key`, `@Public()` over there). Keyless by definition: the caller holds no
   key yet. It rides the callback route because it wants exactly that route's shape (GET,
   CORS for the wallet's origins, consumer headers scrubbed), and it is an exact path, so
   nothing under it loses its authentication. It used to be served from this platform
   (the old `/api/public-key`), which put the platform in front of every anonymous wallet. */
export const PUBLIC_KEY_PATH = '/v1/public-key';

/* Where the community server serves the payer's view of one payment link
   (`GET /v1/payment-links/{id}`, `@Public()` over there). Read from the payer's BROWSER, with
   no key, by the hosted checkout on payments.cosmospay.lat AND by the embedded checkout
   (`<cosmos-pay-checkout>`, public/embed/cosmos-pay.js) on any merchant's site: the server
   budgets that read per client address, so it cannot be proxied through one server. That
   second caller is why it has a route of its own: its CORS must admit every origin, which the
   wallet routes' list must not. The prefix holds no route that needs a consumer, and one
   added later still fails closed at the server's guard. */
export const PAYMENT_LINKS_PATH = '/v1/payment-links/';

/* `/cosmos-api/*` -> `/cosmos-api`. The entry is a wildcard URI; the sibling routes
   build their own paths under the same prefix. */
export function entryPrefix(entry: string): string {
  return entry.trim().replace(/["']/g, '').replace(/\/+\*?$/, '');
}

/* The gateway URIs the callback route is served on -- the wallet sign-in's callback and its
   appended segment, and the public-key read. NOT the payment-link read: that one has its own
   route (paymentLinksRouteUris), and two routes matching one URI would leave the answer to
   their priorities. */
export function callbackRouteUris(entry: string): string[] {
  const prefix = entryPrefix(entry);
  return [`${prefix}${WALLET_AUTH_CALLBACK_PATH}*`, `${prefix}${PUBLIC_KEY_PATH}`];
}

/* The gateway URI of the public payment-link read. */
export function paymentLinksRouteUris(entry: string): string[] {
  return [`${entryPrefix(entry)}${PAYMENT_LINKS_PATH}*`];
}

/* The read and its preflight. Anything else under the prefix still meets the key-auth route. */
export const PAYMENT_LINKS_METHODS = ['GET', 'OPTIONS'];

/* The cors plugin of the payment-link route: ANY origin, because a merchant's own site reads
   the link (the embedded checkout) and there is no list of merchants to keep here.

   `*` is safe on this route in a way it would not be on the others, for three reasons that
   must all stay true:
     - it is keyless: no cookie, API key or session is read, and the proxy-rewrite strips
       `Authorization` / `apikey` / the consumer headers anyway;
     - `allow_credential` is false, so a browser never attaches cookies to the request and
       APISIX can answer the literal `*` (it refuses `*` together with credentials);
     - what it answers is the payer's view of one link, which anyone holding the id may read
       (that is what a payment link is for).

   Exactly one party writes these headers: the community server sets no CORS on
   `/v1/payment-links/*` (its sepCors covers only the SEP prefixes). If it ever does, this
   plugin must go, as on the SEP route: two `Access-Control-Allow-Origin` headers make a
   browser refuse the response.

   `Retry-After` and the RateLimit-* headers are exposed so a 429 tells the page when to come
   back (fetchPaymentLink reads `Retry-After`). */
/* The ZK checkout (payments.cosmospay.lat/zk/{id}): the payer's browser reads one ZK payment
   (`GET /v1/zk-checkout/{id}`) and reports the two confidential transfers that pay it
   (`POST /v1/zk-checkout/{id}/confirm`), both `@Public()` and budgeted per client address on the
   community server, so they cannot go through one server either. Its own prefix, because nothing
   under it needs a consumer: every authenticated ZK route stays under `/v1/zk-payments`, which a
   keyless prefix route would otherwise swallow. The confirm call proves nothing by itself: the
   server checks both transactions on-chain before it marks a payment paid. */
export const ZK_CHECKOUT_PATH = '/v1/zk-checkout/';

/* The gateway URI of the ZK checkout's public read and confirm. */
export function zkCheckoutRouteUris(entry: string): string[] {
  return [`${entryPrefix(entry)}${ZK_CHECKOUT_PATH}*`];
}

export const ZK_CHECKOUT_METHODS = ['GET', 'POST', 'OPTIONS'];

/* Any origin, no credentials, for the same reasons as PAYMENT_LINKS_CORS: keyless, nothing
   secret in the answer (the payer's view of one ZK payment), and the confirm POST carries only
   transaction hashes the chain already made public. Content-Type is allowed for the JSON body. */
export const ZK_CHECKOUT_CORS = {
  allow_origins: '*',
  allow_methods: ZK_CHECKOUT_METHODS.join(','),
  allow_headers: 'Accept,Content-Type',
  expose_headers: 'Retry-After,RateLimit-Limit,RateLimit-Remaining,RateLimit-Reset',
  allow_credential: false,
  max_age: 86400,
} as const;

export const PAYMENT_LINKS_CORS = {
  allow_origins: '*',
  allow_methods: PAYMENT_LINKS_METHODS.join(','),
  allow_headers: 'Accept,Content-Type',
  expose_headers: 'Retry-After,RateLimit-Limit,RateLimit-Remaining,RateLimit-Reset',
  allow_credential: false,
  max_age: 86400,
} as const;
