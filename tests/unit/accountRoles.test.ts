/* accountRoles.test.ts — the ladder that decides "you may only assign a role strictly
   below your own". An off-by-one here is a privilege escalation, so the ordering is
   asserted as an ordering rather than as four remembered numbers. */
import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import { ACCOUNT_ROLES, roleLevel } from '@/lib/account-roles';

test('the ladder is strictly increasing in the order it is declared', () => {
  for (let i = 1; i < ACCOUNT_ROLES.length; i++) {
    assert.ok(
      roleLevel(ACCOUNT_ROLES[i]) > roleLevel(ACCOUNT_ROLES[i - 1]),
      `${ACCOUNT_ROLES[i]} does not outrank ${ACCOUNT_ROLES[i - 1]}`,
    );
  }
  assert.ok(roleLevel('owner') > roleLevel('admin'));
  assert.ok(roleLevel('admin') > roleLevel('support'));
  assert.ok(roleLevel('support') > roleLevel('user'));
});

test('an unknown, empty or missing role sits at the bottom rung', () => {
  const floor = roleLevel('user');
  for (const bad of [undefined, null, '', 'root', 'Owner', 'OWNER', 'superuser']) {
    assert.equal(roleLevel(bad), floor, `${String(bad)} did not fall back to user`);
  }
});

test('case matters — "Admin" is not admin', () => {
  // The column is written by the app in lowercase; accepting a capitalised variant
  // would make a role check pass for a string no writer of this code produces.
  assert.ok(roleLevel('Admin') < roleLevel('admin'));
});
