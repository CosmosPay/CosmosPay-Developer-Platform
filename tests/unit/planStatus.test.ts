/* planStatus.test.ts: an organization's plan standing (src/lib/plan-status.ts) and its colour on
   the overview's account card: green while active, yellow when paused or a payment is overdue,
   red when suspended. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_PLAN_STATUS, PLAN_STATUSES, isPlanStatus, planStatusOf, planStatusTone } from '@/lib/plan-status';

test('the four standings, active by default', () => {
  assert.deepEqual([...PLAN_STATUSES], ['active', 'paused', 'past_due', 'suspended']);
  assert.equal(DEFAULT_PLAN_STATUS, 'active');
});

test('each standing has its colour', () => {
  assert.equal(planStatusTone('active'), 'ok');
  assert.equal(planStatusTone('paused'), 'warn');
  assert.equal(planStatusTone('past_due'), 'warn');
  assert.equal(planStatusTone('suspended'), 'bad');
});

test('a stored value that is not a standing reads as active', () => {
  assert.equal(isPlanStatus('paused'), true);
  assert.equal(isPlanStatus('PAUSED'), false);
  assert.equal(planStatusOf(undefined), 'active');
  assert.equal(planStatusOf('cancelled'), 'active');
  assert.equal(planStatusOf('suspended'), 'suspended');
});
