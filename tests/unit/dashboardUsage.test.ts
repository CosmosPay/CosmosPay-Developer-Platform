/* dashboardUsage.test.ts: the overview's quick links (src/lib/dashboard-usage.ts). They start from
   the defaults, a view earns a place with recent use, old use fades, and a view the viewer may
   not open never shows. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HALF_LIFE_MS, QUICK_DEFAULTS, parseUsage, quickLinks, recordUse, type Usage } from '@/lib/dashboard-usage';

const NOW = Date.UTC(2026, 9, 26, 12);
const all = () => true;
const use = (u: Usage, key: string, times: number, at = NOW) => {
  let out = u;
  for (let i = 0; i < times; i++) out = recordUse(out, key, at);
  return out;
};

test('with no use the defaults show, in their order', () => {
  assert.deepEqual(quickLinks({}, all, NOW), QUICK_DEFAULTS);
});

test('a view used often enough leads, and the defaults fill the rest', () => {
  const u = use(use({}, 'payments', 5), 'swaps', 4);
  assert.deepEqual(quickLinks(u, all, NOW), ['payments', 'swaps', 'docs', 'developers']);
});

test('one or two visits do not displace a default', () => {
  assert.deepEqual(quickLinks(use({}, 'liquidity', 2), all, NOW), QUICK_DEFAULTS);
});

test('a default that is used is not listed twice', () => {
  const u = use({}, 'developers', 6);
  assert.deepEqual(quickLinks(u, all, NOW), ['developers', 'docs', 'webhook', 'logs']);
});

test('use fades: a burst a few months ago no longer counts', () => {
  const old = use({}, 'customers', 10, NOW - 6 * HALF_LIFE_MS);
  assert.deepEqual(quickLinks(old, all, NOW), QUICK_DEFAULTS);
  // and the decayed weight carries into the next use
  const again = recordUse(old, 'customers', NOW);
  assert.ok(again.customers.n > 1 && again.customers.n < 1.2);
});

test('a view the viewer may not open never shows, nor the overview or the account', () => {
  const u = use(use(use({}, 'adminPayments', 9), 'overview', 9), 'account', 9);
  const eligible = (k: string) => k !== 'adminPayments' && k !== 'webhook';
  assert.deepEqual(quickLinks(u, eligible, NOW), ['docs', 'developers', 'logs']);
  assert.equal(recordUse({}, 'overview', NOW).overview, undefined);
});

test('a stored value that is not ours is dropped', () => {
  assert.deepEqual(parseUsage('not json'), {});
  assert.deepEqual(parseUsage('[1,2]'), {});
  assert.deepEqual(parseUsage(null), {});
  assert.deepEqual(parseUsage(JSON.stringify({ payments: { n: 2, at: NOW }, bad: { n: 'x', at: 1 }, neg: { n: -1, at: 1 } })), { payments: { n: 2, at: NOW } });
});
