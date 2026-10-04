/* consoleMarker.test.ts — the X-Cosmos-Internal marker is one contract across two
   repositories: this console mints it, the Payments service verifies it, and no
   toolchain sees both. The vector below is pinned on BOTH sides (the service's
   `src/admin/console-marker.spec.ts` holds the same literal), so a change to the
   label, the format or the MAC on one side alone fails a test instead of shipping a
   console whose every admin call answers 403. */
import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import { consoleMarker } from '@/lib/console-marker';

const SECRET = 'topsecret-topsecret-topsecret-topsecret';
const VECTOR =
  'v1.1790000000.d1b1d44235db836a61ef8b314a304580bb46f4f879fa4e9ad3ba2c242b26e125';

test('mints the vector the Payments service pins', () => {
  assert.equal(consoleMarker(SECRET, 1_790_000_000_000), VECTOR);
});

test('truncates to whole seconds, as the service reads them', () => {
  assert.equal(consoleMarker(SECRET, 1_790_000_000_999), VECTOR);
});

test('is keyed by the secret: another secret mints another MAC', () => {
  assert.notEqual(consoleMarker('another-gateway-secret-entirely', 1_790_000_000_000), VECTOR);
});

test('is never the bare marker the service now refuses', () => {
  assert.match(consoleMarker(SECRET), /^v1\.\d+\.[0-9a-f]{64}$/);
});
