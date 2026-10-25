import { test } from 'node:test';
import assert from 'node:assert/strict';
import { areasOf, ownerOf, routeRequest, type Origins, type RouteRequest } from '@/lib/hosts';

const PROD: Origins = {
  site: 'https://cosmospay.lat',
  dev: 'https://dev.cosmospay.lat',
  payments: 'https://payments.cosmospay.lat',
};
const LINK = '/cmh4x2k9a0001l70g8v5q3z2w';

const req = (hostname: string, pathname: string, search = '', method = 'GET'): RouteRequest => ({ hostname, pathname, search, method });
const route = (hostname: string, pathname: string, search = '', method = 'GET') => routeRequest(req(hostname, pathname, search, method), PROD);

test('ownerOf assigns every public path to one domain', () => {
  assert.equal(ownerOf('/'), 'home');
  assert.equal(ownerOf('/pricing'), 'site');
  assert.equal(ownerOf('/tos'), 'site');
  assert.equal(ownerOf('/pay'), 'payments');
  assert.equal(ownerOf(LINK), 'payments');
  assert.equal(ownerOf('/preview/ticket'), 'payments');
  for (const p of ['/integrations', '/use-cases', '/security', '/fees', '/faq']) assert.equal(ownerOf(p), 'payments', p);
  for (const p of ['/login', '/dashboard', '/onboarding', '/invite/abc', '/kyc/return/o/e/r', '/swagger', '/docs', '/docs/api', '/api/auth/get-session']) {
    assert.equal(ownerOf(p), 'dev', p);
  }
  assert.equal(ownerOf('/dashboards'), null, 'a prefix match needs a path boundary');
  assert.equal(ownerOf('/nope'), null);
});

test('cosmospay.lat renders only the company site', () => {
  assert.deepEqual(route('cosmospay.lat', '/'), { kind: 'rewrite', area: 'site', path: '/site' });
  assert.deepEqual(route('cosmospay.lat', '/pricing'), { kind: 'rewrite', area: 'site', path: '/site/pricing' });
  assert.deepEqual(route('cosmospay.lat', '/tos/'), { kind: 'rewrite', area: 'site', path: '/site/tos' });
  assert.deepEqual(route('cosmospay.lat', '/dashboard', '?view=settings'), {
    kind: 'redirect', location: 'https://dev.cosmospay.lat/dashboard?view=settings', status: 301,
  });
  assert.deepEqual(route('cosmospay.lat', '/pay', '?uri=web%2Bstellar%3Apay'), {
    kind: 'redirect', location: 'https://payments.cosmospay.lat/pay?uri=web%2Bstellar%3Apay', status: 301,
  });
  assert.deepEqual(route('cosmospay.lat', '/nope'), { kind: 'not-found', area: 'site' });
});

test('dev.cosmospay.lat renders the platform and redirects the rest', () => {
  assert.deepEqual(route('dev.cosmospay.lat', '/'), { kind: 'pass', area: 'dev' });
  assert.deepEqual(route('dev.cosmospay.lat', '/dashboard'), { kind: 'pass', area: 'dev' });
  assert.deepEqual(route('dev.cosmospay.lat', '/api/payment-intents'), { kind: 'pass', area: 'dev' });
  assert.deepEqual(route('dev.cosmospay.lat', '/pricing'), { kind: 'redirect', location: 'https://cosmospay.lat/pricing', status: 301 });
  assert.deepEqual(route('dev.cosmospay.lat', '/tos'), { kind: 'redirect', location: 'https://cosmospay.lat/tos', status: 301 });
  // Browsers registered https://dev.cosmospay.lat/pay?uri=%s as their web+stellar: handler.
  assert.deepEqual(route('dev.cosmospay.lat', '/pay', '?uri=web%2Bstellar%3Apay%3Fdestination%3DG'), {
    kind: 'redirect', location: 'https://payments.cosmospay.lat/pay?uri=web%2Bstellar%3Apay%3Fdestination%3DG', status: 301,
  });
  // The platform renders its own 404 for paths nobody owns.
  assert.deepEqual(route('dev.cosmospay.lat', '/nope'), { kind: 'pass', area: 'dev' });
});

test('payments.cosmospay.lat renders its landing and the checkout pages', () => {
  assert.deepEqual(route('payments.cosmospay.lat', LINK), { kind: 'rewrite', area: 'payments', path: `/payments${LINK}` });
  assert.deepEqual(route('payments.cosmospay.lat', '/pay'), { kind: 'rewrite', area: 'payments', path: '/payments/pay' });
  assert.deepEqual(route('payments.cosmospay.lat', '/'), { kind: 'rewrite', area: 'payments', path: '/payments' });
  assert.deepEqual(route('payments.cosmospay.lat', '/preview/split'), { kind: 'rewrite', area: 'payments', path: '/payments/preview/split' });
  assert.deepEqual(route('payments.cosmospay.lat', '/fees'), { kind: 'rewrite', area: 'payments', path: '/payments/fees' });
  assert.deepEqual(route('cosmospay.lat', '/faq'), { kind: 'redirect', location: 'https://payments.cosmospay.lat/faq', status: 301 });
  assert.deepEqual(route('cosmospay.lat', '/preview/split'), { kind: 'redirect', location: 'https://payments.cosmospay.lat/preview/split', status: 301 });
  assert.deepEqual(route('payments.cosmospay.lat', '/login', '?next=%2Fdashboard'), {
    kind: 'redirect', location: 'https://dev.cosmospay.lat/login?next=%2Fdashboard', status: 301,
  });
  assert.deepEqual(route('payments.cosmospay.lat', '/pricing'), { kind: 'redirect', location: 'https://cosmospay.lat/pricing', status: 301 });
  assert.deepEqual(route('payments.cosmospay.lat', '/not-a-link'), { kind: 'not-found', area: 'payments' });
});

test('the internal mounts are never served as addresses', () => {
  assert.deepEqual(route('dev.cosmospay.lat', '/site/pricing'), { kind: 'redirect', location: 'https://cosmospay.lat/pricing', status: 301 });
  assert.deepEqual(route('cosmospay.lat', '/site'), { kind: 'redirect', location: 'https://cosmospay.lat/', status: 301 });
  assert.deepEqual(route('cosmospay.lat', `/payments${LINK}`), { kind: 'redirect', location: `https://payments.cosmospay.lat${LINK}`, status: 301 });
  assert.deepEqual(route('payments.cosmospay.lat', '/payments/pay', '?uri=x'), { kind: 'redirect', location: 'https://payments.cosmospay.lat/pay?uri=x', status: 301 });
});

test('an encoded, doubled or case-varied mount is still a mount', () => {
  // Routing on the raw pathname would let these render a payments page on another domain,
  // without the payments domain's anti-framing headers.
  assert.deepEqual(route('dev.cosmospay.lat', `/%70ayments${LINK}`), { kind: 'redirect', location: `https://payments.cosmospay.lat${LINK}`, status: 301 });
  assert.deepEqual(route('dev.cosmospay.lat', `//payments${LINK}`), { kind: 'redirect', location: `https://payments.cosmospay.lat${LINK}`, status: 301 });
  assert.deepEqual(route('dev.cosmospay.lat', '/payments%2Fpay'), { kind: 'redirect', location: 'https://payments.cosmospay.lat/pay', status: 301 });
  assert.deepEqual(route('cosmospay.lat', '/SITE/pricing'), { kind: 'redirect', location: 'https://cosmospay.lat/pricing', status: 301 });
  assert.deepEqual(route('dev.cosmospay.lat', '/%5Csite%5Ctos'), { kind: 'redirect', location: 'https://cosmospay.lat/tos', status: 301 });
});

test('an owned path is recognized however it is spelled', () => {
  assert.deepEqual(route('cosmospay.lat', '/%70ricing'), { kind: 'rewrite', area: 'site', path: '/site/pricing' });
  assert.deepEqual(route('cosmospay.lat', '//dashboard'), { kind: 'redirect', location: 'https://dev.cosmospay.lat/dashboard', status: 301 });
});

test('a malformed encoding is a 404, never a pass', () => {
  assert.deepEqual(route('payments.cosmospay.lat', '/%E0%A4%A'), { kind: 'not-found', area: 'payments' });
  assert.deepEqual(route('dev.cosmospay.lat', '/%'), { kind: 'not-found', area: 'dev' });
});

test('a non-GET request keeps its method across the redirect', () => {
  assert.deepEqual(route('cosmospay.lat', '/api/auth/sign-out', '', 'POST'), {
    kind: 'redirect', location: 'https://dev.cosmospay.lat/api/auth/sign-out', status: 308,
  });
});

test('www goes to the apex, path and query kept', () => {
  assert.deepEqual(route('www.cosmospay.lat', '/pricing', '?lang=es'), { kind: 'redirect', location: 'https://cosmospay.lat/pricing?lang=es', status: 301 });
});

test('robots.txt and sitemap.xml answer on every domain, as that domain', () => {
  assert.deepEqual(route('cosmospay.lat', '/robots.txt'), { kind: 'pass', area: 'site' });
  assert.deepEqual(route('payments.cosmospay.lat', '/sitemap.xml'), { kind: 'pass', area: 'payments' });
  assert.deepEqual(route('dev.cosmospay.lat', '/robots.txt'), { kind: 'pass', area: 'dev' });
});

test('an unknown host is the platform', () => {
  assert.deepEqual([...areasOf('127.0.0.1', PROD)], ['dev']);
  assert.deepEqual(route('127.0.0.1', '/api/openapi.json'), { kind: 'pass', area: 'dev' });
  assert.equal(route('127.0.0.1', '/pricing').kind, 'redirect');
});

test('one host configured for every area serves all of them without redirect loops', () => {
  const local: Origins = { site: 'http://localhost:4321', dev: 'http://localhost:4321/', payments: 'http://localhost:4321' };
  const r = (path: string, search = '') => routeRequest(req('localhost', path, search), local);
  assert.deepEqual(r('/'), { kind: 'rewrite', area: 'site', path: '/site' });
  assert.deepEqual(r('/pricing'), { kind: 'rewrite', area: 'site', path: '/site/pricing' });
  assert.deepEqual(r('/dashboard'), { kind: 'pass', area: 'dev' });
  assert.deepEqual(r(LINK), { kind: 'rewrite', area: 'payments', path: `/payments${LINK}` });
  assert.deepEqual(r('/site/tos'), { kind: 'redirect', location: 'http://localhost:4321/tos', status: 301 });
});
