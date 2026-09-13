/* upstreamPath.test.ts — the feature-prefix proxies (/api/kyc, /api/onramp, /api/offramp)
   build an upstream path by pasting a catch-all param behind a fixed prefix. `new URL`
   then normalizes it, so one `..` segment would land the caller on /v1/admin — every
   tenant's data. That used to bounce off the Payments service's admin credential; the
   credential is gone, so this check is the thing standing there now. */
import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import { isSafeUpstreamPath } from '@/lib/upstream-path';

test('ordinary proxy paths are allowed', () => {
  for (const path of [
    'kyc',
    'kyc/receivers',
    'kyc/receivers/re_abc123/wallets',
    'onramp/quotes',
    'offramp/payouts/po_1',
    '/v1/payment-intents/pi_1',
    // A dot INSIDE a segment is not a traversal.
    'kyc/receivers/re..1',
    'kyc/receivers/file.json',
  ]) {
    assert.equal(isSafeUpstreamPath(path), true, `${path} should be allowed`);
  }
});

test('a traversal segment is refused, whichever separator spells it', () => {
  for (const path of [
    'kyc/../admin/summary',
    'kyc/..',
    '../admin/summary',
    'kyc/./../admin/summary',
    'kyc/receivers/../../admin/payins',
    // WHATWG URL folds backslashes into slashes for http(s), so these escape too.
    'kyc\\..\\admin/summary',
    'kyc/..\\admin/summary',
  ]) {
    assert.equal(isSafeUpstreamPath(path), false, `${path} should be refused`);
  }
});
