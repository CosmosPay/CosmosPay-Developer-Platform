/* apiKeyLabels.test.ts: an API key's scopes must fit in one APISIX label (256 characters, no
   whitespace). The JSON form did not for 17 scopes or more, so "Admin" keys failed with a 500. */
import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import { LABEL_MAX, PermissionsLabelTooLongError, encodePermissionsLabel, parsePermissionsLabel } from '@/lib/api-key-labels';
import { COSMOS_SCOPES } from '@/lib/cosmos-scopes';
// A copy of WALLET_KEY_SCOPES (src/lib/wallet-provisioning.ts imports Prisma, which unit tests do not load).
const WALLET_KEY_SCOPES = ['swaps:read', 'swaps:write', 'liquidity:read', 'liquidity:write', 'payments:read', 'payments:write', 'kyc:read', 'kyc:write', 'onramp:read', 'onramp:write', 'offramp:read', 'offramp:write', 'activity:read', 'activity:write'];

test('the full catalog fits in one label', () => {
  assert.ok(JSON.stringify(COSMOS_SCOPES).length > LABEL_MAX, 'the old JSON form is over the limit');
  const label = encodePermissionsLabel(COSMOS_SCOPES);
  assert.ok(label.length <= LABEL_MAX, `${label.length} characters`);
  assert.match(label, /^\S+$/);
});

test('every subset of the catalog round-trips', () => {
  for (let size = 0; size <= COSMOS_SCOPES.length; size++) {
    const scopes = COSMOS_SCOPES.slice(0, size);
    assert.deepEqual(parsePermissionsLabel(encodePermissionsLabel(scopes)).sort(), [...scopes].sort());
  }
  const writeOnly = ['webhooks:write', 'payments:read'];
  assert.equal(encodePermissionsLabel(writeOnly), 'webhooks:w,payments:r');
  assert.deepEqual(parsePermissionsLabel('webhooks:w,payments:r'), ['webhooks:write', 'payments:read']);
});

test('the wallet scope set fits and round-trips', () => {
  assert.deepEqual(parsePermissionsLabel(encodePermissionsLabel(WALLET_KEY_SCOPES)).sort(), [...WALLET_KEY_SCOPES].sort());
});

test('labels written before keep working', () => {
  assert.deepEqual(parsePermissionsLabel('["payments:read","swaps:write"]'), ['payments:read', 'swaps:write']);
  assert.deepEqual(parsePermissionsLabel('[]'), []);
});

test('an unreadable label grants nothing', () => {
  for (const raw of [undefined, null, '', '[not json', '{"a":1}', 'payments:x', 'payments:rw,', 'payments read', 42]) {
    assert.deepEqual(parsePermissionsLabel(raw), [], String(raw));
  }
});

test('a scope outside resource:action keeps the JSON form, and an oversized one is refused', () => {
  assert.equal(encodePermissionsLabel(['payments:read', 'pollar:*']), '["payments:read","pollar:*"]');
  const many = Array.from({ length: 30 }, (_, i) => `custom-${i}:*`);
  assert.throws(() => encodePermissionsLabel(many), PermissionsLabelTooLongError);
});

test('duplicates are folded', () => {
  assert.equal(encodePermissionsLabel(['payments:read', 'payments:read', 'payments:write']), 'payments:rw');
});
