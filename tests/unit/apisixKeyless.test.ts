/* apisixKeyless.test.ts: the keyless APISIX routes' URIs and the public payment-link read's
   CORS (src/lib/apisix-keyless.ts).

   Two failures this guards, both silent in production:
   - two routes listing the same URI, which leaves the answer to their priorities (the
     payment-link read used to ride the callback route, with the wallet's CORS list);
   - a cors plugin APISIX rejects (`*` with credentials) or one that admits credentials for
     every origin. */
import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import {
  callbackRouteUris,
  entryPrefix,
  PAYMENT_LINKS_CORS,
  PAYMENT_LINKS_METHODS,
  paymentLinksRouteUris,
  ZK_CHECKOUT_CORS,
  ZK_CHECKOUT_METHODS,
  zkCheckoutRouteUris,
} from '@/lib/apisix-keyless';

// apisix/plugins/cors.lua: origins_pattern, the schema of allow_origins.
const APISIX_ORIGINS_PATTERN = /^(\*|\*\*|null|\w+:\/\/[^,]+(,\w+:\/\/[^,]+)*)$/;

test('the entry prefix drops quotes, the wildcard and trailing slashes', () => {
  assert.equal(entryPrefix('/cosmos-api/*'), '/cosmos-api');
  assert.equal(entryPrefix('"/cosmos-api/*"'), '/cosmos-api');
  assert.equal(entryPrefix(' /cosmos-api/ '), '/cosmos-api');
});

test('the callback route serves the sign-in callback and the public key, not payment links', () => {
  assert.deepEqual(callbackRouteUris('/cosmos-api/*'), [
    '/cosmos-api/v1/wallet/auth/oauth/callback/*',
    '/cosmos-api/v1/public-key',
  ]);
  assert.ok(!callbackRouteUris('/cosmos-api/*').some((uri) => uri.includes('/payment-links')));
});

test('the payment-link read has its own route, and no URI is listed by two routes', () => {
  assert.deepEqual(paymentLinksRouteUris('/cosmos-api/*'), ['/cosmos-api/v1/payment-links/*']);
  const callback = new Set(callbackRouteUris('/cosmos-api/*'));
  for (const uri of paymentLinksRouteUris('/cosmos-api/*')) assert.ok(!callback.has(uri), uri);
});

test('the payment-link route is the read and its preflight only', () => {
  assert.deepEqual(PAYMENT_LINKS_METHODS, ['GET', 'OPTIONS']);
  assert.equal(PAYMENT_LINKS_CORS.allow_methods, 'GET,OPTIONS');
});

test('its CORS admits any origin, without credentials, in a shape APISIX accepts', () => {
  assert.equal(PAYMENT_LINKS_CORS.allow_origins, '*');
  assert.match(PAYMENT_LINKS_CORS.allow_origins, APISIX_ORIGINS_PATTERN);
  // APISIX refuses `*` with credentials, and credentials for every origin must never be on.
  assert.equal(PAYMENT_LINKS_CORS.allow_credential, false);
  assert.ok(!('allow_origins_by_regex' in PAYMENT_LINKS_CORS));
  // A 429 must tell the page when to come back (fetchPaymentLink reads Retry-After).
  assert.match(PAYMENT_LINKS_CORS.expose_headers, /(^|,)Retry-After(,|$)/);
});

test('the ZK checkout has its own prefix, apart from every authenticated ZK route', () => {
  assert.deepEqual(zkCheckoutRouteUris('/cosmos-api/*'), ['/cosmos-api/v1/zk-checkout/*']);
  // The authenticated routes live under /v1/zk-payments: a keyless prefix there would take them.
  for (const uri of zkCheckoutRouteUris('/cosmos-api/*')) assert.ok(!uri.includes('/zk-payments'), uri);
  const others = new Set([...callbackRouteUris('/cosmos-api/*'), ...paymentLinksRouteUris('/cosmos-api/*')]);
  for (const uri of zkCheckoutRouteUris('/cosmos-api/*')) assert.ok(!others.has(uri), uri);
});

test('the ZK checkout route is its read, its confirm and the preflight, any origin without credentials', () => {
  assert.deepEqual(ZK_CHECKOUT_METHODS, ['GET', 'POST', 'OPTIONS']);
  assert.equal(ZK_CHECKOUT_CORS.allow_methods, 'GET,POST,OPTIONS');
  assert.match(ZK_CHECKOUT_CORS.allow_origins, APISIX_ORIGINS_PATTERN);
  assert.equal(ZK_CHECKOUT_CORS.allow_credential, false);
  assert.match(ZK_CHECKOUT_CORS.allow_headers, /(^|,)Content-Type(,|$)/);
});
