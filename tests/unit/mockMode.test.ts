/* mockMode.test.ts: mock mode (`npm run dev:mock`, src/lib/mock). It must never switch on outside
   the dev server, its options fall back to safe defaults, and its router matches the API's paths
   the way the real routes do. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isMockMode, isOn, mockOptions } from '@/lib/mock/mode';
import { matchPath, page } from '@/lib/mock/http';

test('mock mode stays off outside the dev server, whatever COSMOS_MOCK says', () => {
  const before = process.env.COSMOS_MOCK;
  process.env.COSMOS_MOCK = '1';
  try {
    // No Vite here: import.meta.env.DEV is not true, as in a production build.
    assert.equal(isMockMode(), false);
  } finally {
    if (before === undefined) delete process.env.COSMOS_MOCK;
    else process.env.COSMOS_MOCK = before;
  }
});

test('the switch reads the usual spellings of on', () => {
  for (const v of ['1', 'true', 'ON', ' yes ']) assert.equal(isOn(v), true, v);
  for (const v of [undefined, '', '0', 'false', 'off', 'mock']) assert.equal(isOn(v), false, String(v));
});

test('options default to an owner on Growth, with no latency', () => {
  assert.deepEqual(mockOptions({}), { role: 'owner', plan: 'growth', fresh: false, latencyMs: 0 });
});

test('options take what the script passes and refuse anything else', () => {
  assert.deepEqual(
    mockOptions({ COSMOS_MOCK_ROLE: 'User', COSMOS_MOCK_PLAN: 'starter', COSMOS_MOCK_FRESH: '1', COSMOS_MOCK_LATENCY: '800' }),
    { role: 'user', plan: 'starter', fresh: true, latencyMs: 800 },
  );
  assert.deepEqual(
    mockOptions({ COSMOS_MOCK_ROLE: 'root', COSMOS_MOCK_PLAN: 'free', COSMOS_MOCK_LATENCY: '-5' }),
    { role: 'owner', plan: 'growth', fresh: false, latencyMs: 0 },
  );
  assert.equal(mockOptions({ COSMOS_MOCK_LATENCY: '999999' }).latencyMs, 10_000);
});

test('paths match segment by segment, with decoded parameters', () => {
  assert.deepEqual(matchPath('/api/customers', '/api/customers'), {});
  assert.deepEqual(matchPath('/api/customers', '/api/customers/'), {});
  assert.deepEqual(matchPath('/api/customers/:id', '/api/customers/abc%20d'), { id: 'abc d' });
  assert.deepEqual(matchPath('/api/organizations/:id/members/:userId', '/api/organizations/o1/members/u2'), { id: 'o1', userId: 'u2' });
  assert.equal(matchPath('/api/customers/:id', '/api/customers'), null);
  assert.equal(matchPath('/api/customers/:id', '/api/customers/a/wallets'), null);
  assert.equal(matchPath('/api/customers', '/api/products'), null);
});

test('a catch-all takes the rest of the path, and needs at least one segment', () => {
  assert.deepEqual(matchPath('/api/admin/:rest*', '/api/admin/receivers/r1/approve'), { rest: 'receivers/r1/approve' });
  assert.equal(matchPath('/api/admin/:rest*', '/api/admin'), null);
});

test('a page is cut as the Payments API cuts its lists', () => {
  const rows = Array.from({ length: 45 }, (_, i) => i);
  assert.deepEqual(page(rows, new URL('http://x/?take=10&skip=40')), { data: [40, 41, 42, 43, 44], total: 45, take: 10, skip: 40 });
  assert.equal(page(rows, new URL('http://x/')).data.length, 20);
  assert.equal(page(rows, new URL('http://x/?take=500')).take, 100);
});
