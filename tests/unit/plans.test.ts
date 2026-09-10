/* plans.test.ts — the plan table is what decides how many API keys an account may
   mint, whether it may go to mainnet, and the commission taken from every swap.
   Those are money and access decisions, so they are asserted here rather than
   trusted to a screen that reads them. */
import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import {
  PLAN_IDS,
  PLAN_LIMITS,
  PLAN_PRICE,
  PLAN_SPECS,
  atLimit,
  normalizePlan,
  planLimits,
  planSpec,
  planSwapFeeBps,
} from '@/lib/plans';

test('normalizePlan falls back to community for anything unknown', () => {
  for (const id of PLAN_IDS) assert.equal(normalizePlan(id), id);
  for (const bad of [undefined, null, '', 'COMMUNITY', 'free', 42, {}, ['growth']]) {
    assert.equal(normalizePlan(bad), 'community');
  }
});

test('every plan id has a spec, and the spec knows its own id', () => {
  for (const id of PLAN_IDS) {
    assert.ok(PLAN_SPECS[id], `${id} has no spec`);
    assert.equal(PLAN_SPECS[id].id, id);
  }
  assert.deepEqual(Object.keys(PLAN_SPECS).sort(), [...PLAN_IDS].sort());
});

test('the derived tables are derived, not a second copy', () => {
  for (const id of PLAN_IDS) {
    const s = PLAN_SPECS[id];
    assert.deepEqual(PLAN_LIMITS[id], {
      maxApiKeys: s.maxApiKeys,
      maxOrgs: s.maxOrgs,
      maxSeats: s.maxSeats,
      allowLive: s.mainnet,
    });
    assert.equal(PLAN_PRICE[id], s.price);
  }
});

/* A free plan that quietly charged nothing on swaps would be a hole in the only
   revenue the community tier has; a paid plan that charged more than its cheaper
   neighbour would be one the other way. Assert the ladder, not one number. */
test('swap commission never increases as the plan gets more expensive', () => {
  const bps = PLAN_IDS.map((id) => planSwapFeeBps(id));
  for (let i = 1; i < bps.length; i++) {
    assert.ok(bps[i] <= bps[i - 1], `${PLAN_IDS[i]} (${bps[i]}) charges more than ${PLAN_IDS[i - 1]} (${bps[i - 1]})`);
  }
  assert.equal(planSwapFeeBps('community'), 150);
  assert.equal(planSwapFeeBps('enterprise'), 0);
});

test('planSwapFeeBps charges the community rate for an unknown plan', () => {
  // The expensive default is the safe one: an unrecognised plan string must not
  // resolve to the free-est rate on the board.
  assert.equal(planSwapFeeBps('does-not-exist'), PLAN_SPECS.community.swapFeeBps);
  assert.equal(planSwapFeeBps(undefined), PLAN_SPECS.community.swapFeeBps);
});

test('planSpec and planLimits route through normalizePlan', () => {
  assert.equal(planSpec('nope'), PLAN_SPECS.community);
  assert.equal(planLimits(null), PLAN_LIMITS.community);
});

test('atLimit treats null as unlimited and blocks at (not after) the cap', () => {
  assert.equal(atLimit(null, 0), false);
  assert.equal(atLimit(null, 10_000), false);
  assert.equal(atLimit(2, 0), false);
  assert.equal(atLimit(2, 1), false);
  assert.equal(atLimit(2, 2), true, 'the 3rd key must be refused, not the 4th');
  assert.equal(atLimit(2, 3), true);
  assert.equal(atLimit(0, 0), true);
});
