/* publicKeyScopes.test.ts: what the shared public key may do (src/lib/public-key-scopes.ts).

   Two silent failures this guards:
   - a scope added to the list that never reaches the keys already minted (their value is in
     every wallet, so they are re-labelled, never rotated): the drift check must list them;
   - a list APISIX refuses as a label value (no spaces, at most 256 characters), which would
     leave the credential with its old scopes and nothing failing loudly. */
import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import { COSMOS_SCOPES } from '@/lib/cosmos-scopes';
import { credentialsWithStaleScopes, PUBLIC_KEY_SCOPES } from '@/lib/public-key-scopes';

test('the public key buys and sells with local money, and still cannot touch identity or merchant data', () => {
  for (const scope of ['onramp:read', 'onramp:write', 'offramp:read', 'offramp:write']) {
    assert.ok(PUBLIC_KEY_SCOPES.includes(scope), `${scope} is missing`);
  }
  for (const scope of [
    'kyc:read', 'kyc:write', 'activity:read',
    'webhooks:read', 'webhooks:write', 'products:read', 'products:write',
    'customers:read', 'customers:write', 'plugins:read', 'plugins:write',
  ]) {
    assert.ok(!PUBLIC_KEY_SCOPES.includes(scope), `${scope} must not be on the public key`);
  }
});

test('every public scope is one the catalog grants, listed once', () => {
  assert.equal(new Set(PUBLIC_KEY_SCOPES).size, PUBLIC_KEY_SCOPES.length);
  for (const scope of PUBLIC_KEY_SCOPES) assert.ok(COSMOS_SCOPES.includes(scope), `${scope} is not a scope`);
});

test('the list fits an APISIX label value', () => {
  const label = JSON.stringify(PUBLIC_KEY_SCOPES);
  assert.ok(label.length <= 256, `${label.length} characters`);
  assert.ok(!/\s/.test(label));
});

test('the drift check lists only the credentials whose scopes differ, order aside', () => {
  const wanted = ['swaps:read', 'onramp:read'];
  const stale = credentialsWithStaleScopes(
    [
      { id: 'same', scopes: ['swaps:read', 'onramp:read'] },
      { id: 'reordered', scopes: ['onramp:read', 'swaps:read'] },
      { id: 'missing-one', scopes: ['swaps:read'] },
      { id: 'one-too-many', scopes: ['swaps:read', 'onramp:read', 'kyc:read'] },
      { id: 'none', scopes: [] },
    ],
    wanted,
  );
  assert.deepEqual(stale, ['missing-one', 'one-too-many', 'none']);
});

test('a key minted before the ramp scopes is listed against the current list', () => {
  const beforeTheRamp = PUBLIC_KEY_SCOPES.filter((s) => !s.startsWith('onramp:') && !s.startsWith('offramp:'));
  assert.deepEqual(
    credentialsWithStaleScopes([
      { id: 'dev', scopes: beforeTheRamp },
      { id: 'prod', scopes: [...PUBLIC_KEY_SCOPES] },
    ]),
    ['dev'],
  );
});
