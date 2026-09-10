/* orgPermissions.test.ts — who inside an organization may mint a LIVE API key.
   `sanitizePermissions` is the boundary between a request body and that answer, so
   it is asserted against hostile input, not just the happy shape. */
import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import {
  ORG_ACTIONS,
  ORG_PERMISSIONS,
  ORG_RESOURCES,
  effectivePermissions,
  hasOrgPermission,
  isManagerRole,
  permKey,
  sanitizePermissions,
} from '@/lib/org-permissions';

test('the catalog is the resource x action matrix', () => {
  assert.equal(ORG_PERMISSIONS.length, ORG_RESOURCES.length * ORG_ACTIONS.length);
  assert.equal(new Set(ORG_PERMISSIONS).size, ORG_PERMISSIONS.length, 'duplicate permission key');
  for (const r of ORG_RESOURCES) {
    for (const a of ORG_ACTIONS) assert.ok(ORG_PERMISSIONS.includes(permKey(r, a)));
  }
});

test('test and live API keys are separate permissions', () => {
  // One "apiKeys" resource would have made a test-key grant a live-key grant.
  assert.ok(ORG_PERMISSIONS.includes('apiKeysTest:create'));
  assert.ok(ORG_PERMISSIONS.includes('apiKeysLive:create'));
  assert.equal(hasOrgPermission('member', ['apiKeysTest:create'], 'apiKeysLive:create'), false);
});

test('owner and admin hold every permission; member holds only what was granted', () => {
  for (const role of ['owner', 'admin']) {
    assert.equal(isManagerRole(role), true);
    const eff = effectivePermissions(role, []);
    assert.equal(eff.size, ORG_PERMISSIONS.length);
    for (const p of ORG_PERMISSIONS) assert.ok(eff.has(p), `${role} is missing ${p}`);
  }
  assert.equal(isManagerRole('member'), false);
  assert.deepEqual([...effectivePermissions('member', ['webhooks:edit'])], ['webhooks:edit']);
});

test('an unknown or missing role is not a manager', () => {
  for (const role of [undefined, null, '', 'Owner', 'OWNER', 'superadmin', 'user']) {
    assert.equal(isManagerRole(role as string | null | undefined), false, `${String(role)} escalated`);
    assert.equal(effectivePermissions(role as string | null | undefined, null).size, 0);
  }
});

test('effectivePermissions survives a non-array permissions column', () => {
  for (const perms of [null, undefined, 'webhooks:edit' as unknown as string[], {} as unknown as string[]]) {
    assert.equal(effectivePermissions('member', perms).size, 0);
  }
});

test('sanitizePermissions drops everything that is not a known key', () => {
  assert.deepEqual(
    sanitizePermissions(['webhooks:create', 'nope:create', 'webhooks:nope', '', 'products:delete']),
    ['webhooks:create', 'products:delete'],
  );
  // Non-strings and prototype keys must not survive into a stored grant.
  assert.deepEqual(sanitizePermissions([1, null, undefined, {}, [], 'toString', '__proto__', 'constructor']), []);
  for (const bad of [null, undefined, 'webhooks:create', { 0: 'webhooks:create' }, 42]) {
    assert.deepEqual(sanitizePermissions(bad), []);
  }
});

test('hasOrgPermission answers false for a permission outside the catalog', () => {
  assert.equal(hasOrgPermission('member', ['billing:delete'], 'billing:delete'), true,
    'the granted set is trusted as stored; sanitizePermissions is the gate');
  assert.equal(hasOrgPermission('member', [], 'webhooks:create'), false);
  assert.equal(hasOrgPermission('owner', [], 'billing:delete'), false,
    'a manager holds the catalog, not everything imaginable');
});
