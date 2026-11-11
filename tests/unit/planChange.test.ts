/* planChange.test.ts: an account never puts itself on a plan whose fee nothing bills.

   `PATCH /api/account/plan` used to accept any enabled plan from a regular account whenever
   ALLOW_USER_PLAN_CHANGES was on (its default), so an account could move itself to
   Enterprise (0.07% swaps instead of Starter's 0.65%, no limits) and pay nothing: no
   billing provider exists yet. A plan with a fee comes from billing or an operator. */
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import {
  canChangeOwnPlanWith,
  isSelfServicePlan,
  ownPlanChangeRefusal,
  selfServicePlanIds,
} from '@/lib/plan-change';
import { PLAN_IDS, PLAN_SPECS } from '@/lib/plans';

const open = { plansEnabled: true, allowUserPlanChanges: true, enabledPlans: [...PLAN_IDS] };

test('a regular account may not put itself on a plan with a fee, even with self-service on', () => {
  for (const plan of ['essentials', 'growth', 'enterprise']) {
    assert.equal(ownPlanChangeRefusal(open, 'user', plan), 'billed', plan);
    assert.equal(ownPlanChangeRefusal(open, 'support', plan), 'billed', plan);
  }
});

test('a regular account may still move itself to Starter (the way down)', () => {
  assert.equal(ownPlanChangeRefusal(open, 'user', 'starter'), null);
});

test('an operator (owner or admin) may set any enabled plan on itself', () => {
  for (const role of ['owner', 'admin']) {
    for (const plan of PLAN_IDS) assert.equal(ownPlanChangeRefusal(open, role, plan), null, `${role} ${plan}`);
  }
});

test('with self-service off, only operators change their plan', () => {
  const closed = { ...open, allowUserPlanChanges: false };
  assert.equal(ownPlanChangeRefusal(closed, 'user', 'starter'), 'disabled');
  assert.equal(ownPlanChangeRefusal(closed, 'admin', 'growth'), null);
  assert.equal(canChangeOwnPlanWith({ ...open, plansEnabled: false }, 'owner'), false);
});

test('a plan missing from ENABLED_PLANS is unavailable, a legacy one too', () => {
  const onlyStarter = { ...open, enabledPlans: ['starter'] };
  assert.equal(ownPlanChangeRefusal(onlyStarter, 'admin', 'growth'), 'unavailable');
  assert.equal(ownPlanChangeRefusal(open, 'user', 'community'), 'unavailable');
});

test('every plan with a monthly or custom price is billed, and only those', () => {
  for (const id of PLAN_IDS) {
    // Starter's price IS its per-payment rate; the others name a monthly or custom fee.
    const fixedFee = PLAN_SPECS[id].price !== PLAN_SPECS[id].perTx || PLAN_SPECS[id].price === 'Custom';
    assert.equal(PLAN_SPECS[id].billed, fixedFee, id);
    assert.equal(isSelfServicePlan(id), !fixedFee, id);
  }
  assert.equal(PLAN_SPECS.community.billed, false);
});

test('the plan route applies this rule (it reads astro:env, so its wiring is pinned by source)', () => {
  const route = readFileSync(new URL('../../src/pages/api/account/plan.ts', import.meta.url), 'utf8');
  assert.match(route, /const refusal = ownPlanRefusal\(role, body\.data\.plan\);/);
  assert.match(route, /if \(refusal\) return jsonForbidden/);
  // What let a regular account pick any enabled plan.
  assert.doesNotMatch(route, /enabledPlanIds\(\)\.includes\(body\.data\.plan\)/);
});

test('the pickers offer a regular account only the self-service plans', () => {
  assert.deepEqual(selfServicePlanIds(PLAN_IDS, 'user'), ['starter']);
  assert.deepEqual(selfServicePlanIds(PLAN_IDS, 'owner'), [...PLAN_IDS]);
});
