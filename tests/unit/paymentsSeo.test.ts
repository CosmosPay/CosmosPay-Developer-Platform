import { test } from 'node:test';
import assert from 'node:assert/strict';
import { OG_LOCALES, pageUrl } from '@/lib/payments/seo';
import { LOCALES } from '@/lib/payments/i18n';

const ORIGIN = 'https://payments.cosmospay.lat';

test('pageUrl gives the bare path when no language is asked (x-default)', () => {
  assert.equal(pageUrl(ORIGIN, '/'), 'https://payments.cosmospay.lat/');
  assert.equal(pageUrl(ORIGIN, '/faq', null), 'https://payments.cosmospay.lat/faq');
});

test('pageUrl puts the language in ?lang=, the parameter the language resolution reads first', () => {
  assert.equal(pageUrl(ORIGIN, '/faq', 'es'), 'https://payments.cosmospay.lat/faq?lang=es');
  assert.equal(pageUrl(ORIGIN, '/', 'de'), 'https://payments.cosmospay.lat/?lang=de');
});

test('pageUrl keeps the origin of the environment it is given', () => {
  assert.equal(pageUrl('http://payments.cosmospay.localhost:4332', '/fees', 'pt'), 'http://payments.cosmospay.localhost:4332/fees?lang=pt');
});

test('every gateway language has an Open Graph locale', () => {
  for (const { code } of LOCALES) assert.match(OG_LOCALES[code], /^[a-z]{2}_[A-Z]{2}$/, code);
});
