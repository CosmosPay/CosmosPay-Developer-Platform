import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_NEXT, safeNextPath } from '@/lib/safe-next';

test('safeNextPath keeps same-origin paths with their query', () => {
  assert.equal(safeNextPath('/dashboard'), '/dashboard');
  assert.equal(safeNextPath('/dashboard?view=settings'), '/dashboard?view=settings');
  assert.equal(safeNextPath('/invite/abc'), '/invite/abc');
});

test('safeNextPath refuses anything that could leave the origin', () => {
  const hostile = [
    '//evil.example',
    '/\\evil.example',
    'https://evil.example',
    'javascript:alert(1)',
    'dashboard',
    '/\tevil', // browsers strip tabs and newlines, which turns this into //evil
  ];
  for (const next of hostile) assert.equal(safeNextPath(next), DEFAULT_NEXT, next);
});

test('safeNextPath falls back when next is missing', () => {
  assert.equal(safeNextPath(null), DEFAULT_NEXT);
  assert.equal(safeNextPath(''), DEFAULT_NEXT);
  assert.equal(safeNextPath(undefined, '/onboarding'), '/onboarding');
});
