/* apiKeyRole.test.ts: no API key minted or forwarded by this platform is `admin`.

   The Payments API reads `X-Consumer-Role: admin` as the platform's own key (no scope
   checks, KYC review sign-off, the fiat kill-switch). The create and update bodies used to
   accept `role: "admin"` from the caller, so any account could mint one for its own
   organization; the forwarder then sent it on. */
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { forwardedKeyAuth, isMintableKeyRole, keyAccess } from '@/lib/api-key-role';
import { COSMOS_SCOPES } from '@/lib/cosmos-scopes';
import { createApiKeyBodySchema, updateApiKeyBodySchema } from '@/schemas/api-keys';

const create = (body: object) => createApiKeyBodySchema.safeParse({ org: 'org_1', ...body });

test('creating a key refuses a role the caller picks', () => {
  for (const role of ['admin', 'public', 'owner', 'ADMIN']) {
    assert.equal(create({ role }).success, false, `role ${role} was accepted`);
  }
});

test('updating a key refuses a role the caller picks', () => {
  for (const role of ['admin', 'public']) {
    assert.equal(updateApiKeyBodySchema.safeParse({ permissions: [], role }).success, false);
  }
});

test('a body without a role, or with the deprecated "user", still parses', () => {
  const none = create({ permissions: ['payments:read'] });
  assert.equal(none.success, true);
  assert.equal(none.success && none.data.role, undefined);
  const user = create({ permissions: ['payments:read'], role: 'user' });
  assert.equal(user.success, true);
});

test('only user and public keys can be minted', () => {
  assert.equal(isMintableKeyRole('user'), true);
  assert.equal(isMintableKeyRole('public'), true);
  for (const role of ['admin', 'owner', '', null, undefined, 1]) {
    assert.equal(isMintableKeyRole(role), false);
  }
});

test('the forwarder never sends admin, whatever the label says', () => {
  for (const label of ['admin', 'ADMIN', 'user', 'owner', '', null, undefined, 'public']) {
    const { role } = forwardedKeyAuth(label, ['payments:read']);
    assert.notEqual(role, 'admin', `label ${String(label)} forwarded admin`);
  }
});

test('a legacy admin key keeps every scope of its organization, as user', () => {
  const auth = forwardedKeyAuth('admin', []);
  assert.equal(auth.role, 'user');
  assert.deepEqual([...auth.permissions].sort(), [...COSMOS_SCOPES].sort());
});

test('user and public keys forward exactly the scopes they hold', () => {
  assert.deepEqual(forwardedKeyAuth('user', ['payments:read']), { role: 'user', permissions: ['payments:read'] });
  assert.deepEqual(forwardedKeyAuth('public', ['swaps:write']), { role: 'public', permissions: ['swaps:write'] });
  assert.deepEqual(forwardedKeyAuth(undefined, []), { role: 'user', permissions: [] });
});

test('the consumer forwarder and the key routes take the role from these rules, not from labels or bodies', () => {
  // src/utils/apisix.ts and the routes read astro:env, so they cannot be imported here; their
  // wiring is pinned by source instead. Each line below is what let an admin key through.
  const read = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
  const apisix = read('src/utils/apisix.ts');
  assert.match(apisix, /const auth = forwardedKeyAuth\(/);
  assert.match(apisix, /r: auth\.role,/);
  assert.doesNotMatch(apisix, /r: parseApiKeyRole\(/);
  assert.match(apisix, /if \(!isMintableKeyRole\(role\)\)/);
  assert.doesNotMatch(read('src/pages/api/api-keys/index.ts'), /body\.data\.role/);
  assert.doesNotMatch(read('src/pages/api/api-keys/[id]/index.ts'), /body\.data\.role/);
});

test('a key row shows full access for every scope or a legacy admin key, and user otherwise', () => {
  assert.equal(keyAccess({ role: 'user', permissions: [...COSMOS_SCOPES] }), 'admin');
  assert.equal(keyAccess({ role: 'admin', permissions: [] }), 'admin');
  assert.equal(keyAccess({ role: 'user', permissions: COSMOS_SCOPES.slice(1) }), 'user');
  assert.equal(keyAccess({ role: 'user' }), 'user');
});
