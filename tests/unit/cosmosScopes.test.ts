/* cosmosScopes.test.ts — the scope catalog IS the API-key picker: a resource missing
   here is a scope the dashboard cannot grant at all. That gap is what refused every
   wallet-minted key at `/v1/pollar/**` with `insufficient_scope`, so the resources are
   pinned by name and not merely counted. */
import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import { COSMOS_ACTIONS, COSMOS_RESOURCES, COSMOS_SCOPES, cosmosScopeKey } from '@/lib/cosmos-scopes';

test('every resource the gateway enforces is grantable', () => {
  for (const resource of [
    'payments', 'swaps', 'liquidity', 'webhooks', 'products',
    'customers', 'kyc', 'onramp', 'offramp', 'pollar', 'activity',
  ]) {
    assert.ok((COSMOS_RESOURCES as readonly string[]).includes(resource), `${resource} is not grantable`);
  }
});

test('the catalog is the resource x action product, with no duplicates', () => {
  assert.equal(COSMOS_SCOPES.length, COSMOS_RESOURCES.length * COSMOS_ACTIONS.length);
  assert.equal(new Set(COSMOS_SCOPES).size, COSMOS_SCOPES.length);
  for (const r of COSMOS_RESOURCES) {
    for (const a of COSMOS_ACTIONS) assert.ok(COSMOS_SCOPES.includes(cosmosScopeKey(r, a)));
  }
});

test('read and write are distinct scopes', () => {
  assert.deepEqual([...COSMOS_ACTIONS], ['read', 'write']);
  assert.notEqual(cosmosScopeKey('payments', 'read'), cosmosScopeKey('payments', 'write'));
  assert.equal(cosmosScopeKey('payments', 'write'), 'payments:write');
});
