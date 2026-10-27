import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loginUrl, normalizeOrigin } from '@/lib/urls';
import { isSafeNextPath } from '@/lib/safe-next';

test('normalizeOrigin drops trailing slashes and whitespace', () => {
  assert.equal(normalizeOrigin(' https://dev.cosmospay.lat/// '), 'https://dev.cosmospay.lat');
  assert.equal(normalizeOrigin('https://dev.cosmospay.lat'), 'https://dev.cosmospay.lat');
});

test('loginUrl points at the platform sign-in', () => {
  assert.equal(loginUrl('https://dev.cosmospay.lat/'), 'https://dev.cosmospay.lat/login');
});

test('loginUrl carries a same-origin next path, encoded', () => {
  assert.equal(
    loginUrl('https://dev.cosmospay.lat', '/dashboard?view=settings'),
    'https://dev.cosmospay.lat/login?next=%2Fdashboard%3Fview%3Dsettings',
  );
});

test('loginUrl drops a next that would leave the platform', () => {
  for (const next of ['//evil.example', '/\\evil.example', 'https://evil.example', 'dashboard', '']) {
    assert.equal(loginUrl('https://dev.cosmospay.lat', next), 'https://dev.cosmospay.lat/login', next);
  }
});

test('isSafeNextPath accepts only single-slash paths', () => {
  assert.equal(isSafeNextPath('/'), true);
  assert.equal(isSafeNextPath('/dashboard'), true);
  assert.equal(isSafeNextPath('//host'), false);
  assert.equal(isSafeNextPath('/\\host'), false);
  assert.equal(isSafeNextPath('javascript:alert(1)'), false);
});
