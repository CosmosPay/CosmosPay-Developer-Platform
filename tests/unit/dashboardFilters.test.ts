import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  activeCount,
  countBy,
  inRange,
  matchesQuery,
  rangeStart,
  readFilters,
  writeFilters,
} from '@/lib/dashboard-filters';

const NOW = new Date(2026, 9, 25, 15, 30);

test('rangeStart: today is local midnight, the others roll back from now', () => {
  assert.equal(rangeStart('any', NOW), null);
  assert.deepEqual(rangeStart('today', NOW), new Date(2026, 9, 25));
  assert.equal(rangeStart('7d', NOW)?.getTime(), NOW.getTime() - 7 * 86_400_000);
  assert.equal(rangeStart('90d', NOW)?.getTime(), NOW.getTime() - 90 * 86_400_000);
});

test('inRange keeps rows inside the window and drops undated ones when a range is set', () => {
  assert.equal(inRange(new Date(2026, 9, 25, 1).toISOString(), 'today', NOW), true);
  assert.equal(inRange(new Date(2026, 9, 24, 23).toISOString(), 'today', NOW), false);
  assert.equal(inRange(new Date(2026, 9, 20).toISOString(), '7d', NOW), true);
  assert.equal(inRange(null, '7d', NOW), false);
  assert.equal(inRange(null, 'any', NOW), true);
  assert.equal(inRange('not a date', '30d', NOW), false);
});

test('matchesQuery needs every word, in any case and order', () => {
  const fields = ['cmvn5q', 'GAKEX4XYZ', 'USDC', null, 42];
  assert.equal(matchesQuery(fields, ''), true);
  assert.equal(matchesQuery(fields, 'usdc gakex'), true);
  assert.equal(matchesQuery(fields, 'gakex usdc'), true);
  assert.equal(matchesQuery(fields, '42'), true);
  assert.equal(matchesQuery(fields, 'usdc xlm'), false);
});

test('countBy counts each value and skips empty keys', () => {
  const rows = [{ s: 'PENDING' }, { s: 'SUCCEEDED' }, { s: 'PENDING' }, { s: '' }];
  assert.deepEqual(countBy(rows, (r) => r.s), { PENDING: 2, SUCCEEDED: 1 });
});

const DEFAULTS = { q: '', status: 'all', chain: 'all', date: 'any' };
const ALLOWED = { status: ['all', 'PENDING', 'SUCCEEDED'], chain: ['all', 'stellar', 'solana'], date: ['any', '7d'] };

test('readFilters takes known values and falls back to the defaults', () => {
  assert.deepEqual(readFilters('?view=payments&status=SUCCEEDED&chain=solana&q=usdc', DEFAULTS, ALLOWED), {
    q: 'usdc', status: 'SUCCEEDED', chain: 'solana', date: 'any',
  });
  assert.deepEqual(readFilters('?status=HACKED&date=<script>', DEFAULTS, ALLOWED), DEFAULTS);
  assert.equal(readFilters(`?q=${'x'.repeat(500)}`, DEFAULTS, ALLOWED).q.length, 120);
});

test('writeFilters keeps a plain list on a plain URL', () => {
  const params = new URLSearchParams('view=payments&status=PENDING');
  writeFilters(params, { q: 'abc', status: 'all', chain: 'solana', date: 'any' }, DEFAULTS);
  assert.equal(params.toString(), 'view=payments&q=abc&chain=solana');
});

test('activeCount counts the filters that differ from their defaults', () => {
  assert.equal(activeCount(DEFAULTS, DEFAULTS), 0);
  assert.equal(activeCount({ ...DEFAULTS, q: 'x', date: '7d' }, DEFAULTS), 2);
});
