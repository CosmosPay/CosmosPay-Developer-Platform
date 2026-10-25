/* plans.test.ts — the plan table is what decides how many API keys an account may
   mint, whether it may go to mainnet, and the commission taken from every swap.
   Those are money and access decisions, so they are asserted here rather than
   trusted to a screen that reads them. */
import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import {
  ALL_PLAN_IDS,
  DEFAULT_PLAN_ID,
  PLAN_IDS,
  PLAN_LIMITS,
  PLAN_PRICE,
  PLAN_SPECS,
  atLimit,
  isOfferedPlan,
  normalizePlan,
  planLimits,
  planSpec,
  planSwapFeeBps,
} from '@/lib/plans';

/* The free plan ("community") is no longer offered, but the accounts on it were not
   migrated: it must stay a known plan with its own limits, and never be offered again. */
test('the offered plans are the known ones minus the legacy free plan, in ladder order', () => {
  assert.deepEqual(PLAN_IDS, ['starter', 'essentials', 'growth', 'enterprise']);
  assert.deepEqual(ALL_PLAN_IDS, ['community', ...PLAN_IDS]);
  assert.equal(isOfferedPlan('community'), false);
  for (const id of PLAN_IDS) assert.equal(isOfferedPlan(id), true);
  for (const bad of [undefined, null, '', 'free', 'COMMUNITY', 42]) assert.equal(isOfferedPlan(bad), false);
});

test('new accounts start on starter, an offered plan', () => {
  assert.equal(DEFAULT_PLAN_ID, 'starter');
  assert.ok(isOfferedPlan(DEFAULT_PLAN_ID));
});

test('normalizePlan keeps legacy plans and falls back to the default for anything unknown', () => {
  for (const id of ALL_PLAN_IDS) assert.equal(normalizePlan(id), id);
  assert.equal(normalizePlan('community'), 'community');
  for (const bad of [undefined, null, '', 'COMMUNITY', 'free', 42, {}, ['growth']]) {
    assert.equal(normalizePlan(bad), DEFAULT_PLAN_ID);
  }
});

test('every plan id has a spec, and the spec knows its own id', () => {
  for (const id of ALL_PLAN_IDS) {
    assert.ok(PLAN_SPECS[id], `${id} has no spec`);
    assert.equal(PLAN_SPECS[id].id, id);
  }
  assert.deepEqual(Object.keys(PLAN_SPECS).sort(), [...ALL_PLAN_IDS].sort());
});

test('the derived tables are derived, not a second copy', () => {
  for (const id of ALL_PLAN_IDS) {
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

/* The legacy free plan's swap rate is still the only revenue its accounts bring, and it
   is the shared public wallet key's rate (src/lib/public-key.ts); a paid plan that charged
   more than its cheaper neighbour would be a hole the other way. Assert the ladder, not
   one number. */
test('swap commission never increases as the plan gets more expensive', () => {
  const bps = ALL_PLAN_IDS.map((id) => planSwapFeeBps(id));
  for (let i = 1; i < bps.length; i++) {
    assert.ok(bps[i] <= bps[i - 1], `${ALL_PLAN_IDS[i]} (${bps[i]}) charges more than ${ALL_PLAN_IDS[i - 1]} (${bps[i - 1]})`);
  }
  // 0.5% down to 0.03%: whole bps only (the Payments API and the aggregators refuse
  // fractions), and never 0 — every plan pays something on a swap.
  assert.equal(planSwapFeeBps('community'), 50);
  assert.equal(planSwapFeeBps('enterprise'), 3);
  for (const [i, b] of bps.entries()) {
    assert.ok(Number.isInteger(b) && b > 0, `${ALL_PLAN_IDS[i]} must charge whole, non-zero bps (got ${b})`);
  }
});

test('planSwapFeeBps charges the default plan rate for an unknown plan', () => {
  // The expensive default is the safe one: an unrecognised plan string must not
  // resolve to a cheaper rate than any plan on offer.
  const highestOffered = Math.max(...PLAN_IDS.map((id) => PLAN_SPECS[id].swapFeeBps));
  assert.equal(planSwapFeeBps('does-not-exist'), PLAN_SPECS[DEFAULT_PLAN_ID].swapFeeBps);
  assert.equal(planSwapFeeBps(undefined), PLAN_SPECS[DEFAULT_PLAN_ID].swapFeeBps);
  assert.equal(planSwapFeeBps(undefined), highestOffered);
});

test('planSpec and planLimits route through normalizePlan', () => {
  assert.equal(planSpec('nope'), PLAN_SPECS.starter);
  assert.equal(planLimits(null), PLAN_LIMITS.starter);
  assert.equal(planLimits('community'), PLAN_LIMITS.community);
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
