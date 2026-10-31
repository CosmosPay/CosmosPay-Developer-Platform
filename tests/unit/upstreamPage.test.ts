/**
 * The rows of a Payments API list, whether it answers a page or (an older route) a bare array.
 * The webhooks list moved to a page and the dashboard read the page as the list: its table
 * stayed empty with endpoints registered.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pageRows } from '@/lib/upstream-page';

test('a page gives its rows', () => {
  const rows = [{ id: 'we_1' }, { id: 'we_2' }];
  assert.deepEqual(pageRows({ data: rows, total: 2, take: 100, skip: 0 } as { data: typeof rows }), rows);
});

test('a bare array is the list itself', () => {
  const rows = [{ id: 'we_1' }];
  assert.equal(pageRows(rows), rows);
});

test('nothing usable gives no rows, never the envelope', () => {
  assert.deepEqual(pageRows(null), []);
  assert.deepEqual(pageRows(undefined), []);
  assert.deepEqual(pageRows({}), []);
  assert.deepEqual(pageRows({ data: null }), []);
});
