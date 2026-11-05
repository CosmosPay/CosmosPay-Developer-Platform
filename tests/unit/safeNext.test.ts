import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_NEXT, safeNextPath, safeReturnUrl } from '@/lib/safe-next';

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

const OURS = ['https://cosmospay.lat', 'https://dev.cosmospay.lat/', 'https://payments.cosmospay.lat'];
const HOME = 'https://cosmospay.lat';

test('safeReturnUrl keeps a page on one of our origins, query and fragment included', () => {
  assert.equal(safeReturnUrl('https://payments.cosmospay.lat/faq?lang=es#wallet', OURS, HOME), 'https://payments.cosmospay.lat/faq?lang=es#wallet');
  assert.equal(safeReturnUrl('https://dev.cosmospay.lat/dashboard', OURS, HOME), 'https://dev.cosmospay.lat/dashboard');
});

test('safeReturnUrl refuses anything off our origins', () => {
  const hostile = [
    'https://evil.example/',
    'https://payments.cosmospay.lat.evil.example/',
    'https://evil.example/?https://payments.cosmospay.lat',
    'http://payments.cosmospay.lat/faq',
    'https://payments.cosmospay.lat:8443/faq',
    'https://user:pass@payments.cosmospay.lat/faq',
    'https://user@payments.cosmospay.lat/faq',
    '/dashboard',
    '//evil.example',
    'javascript:alert(1)',
    'https://payments.cosmospay.lat/\u0000x',
    'not a url',
  ];
  for (const next of hostile) assert.equal(safeReturnUrl(next, OURS, HOME), HOME, next);
  assert.equal(safeReturnUrl(null, OURS, HOME), HOME);
  assert.equal(safeReturnUrl('', OURS, HOME), HOME);
});
