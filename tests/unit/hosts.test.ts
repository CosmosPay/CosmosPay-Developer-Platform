import { test } from 'node:test';
import assert from 'node:assert/strict';
import { areasOf, canonicalPath, ownerOf, routeRequest, type Origins, type RouteRequest } from '@/lib/hosts';

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
  assert.equal(ownerOf('/contact'), 'payments');
  assert.equal(ownerOf(LINK), 'payments');
  assert.equal(ownerOf('/preview/ticket'), 'payments');
  for (const p of ['/zk/cm1x2y3z4a5b6c7d8e9f0g1h2', '/zk/bb/0.87.0/index.js']) assert.equal(ownerOf(p), 'payments', p);
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
  assert.deepEqual(route('cosmospay.lat', '/tos'), { kind: 'rewrite', area: 'site', path: '/site/tos' });
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
  assert.deepEqual(route('payments.cosmospay.lat', '/contact', '', 'POST'), { kind: 'rewrite', area: 'payments', path: '/payments/contact' });
  assert.deepEqual(route('cosmospay.lat', '/faq'), { kind: 'redirect', location: 'https://payments.cosmospay.lat/faq', status: 301 });
  assert.deepEqual(route('cosmospay.lat', '/preview/split'), { kind: 'redirect', location: 'https://payments.cosmospay.lat/preview/split', status: 301 });
  assert.deepEqual(route('payments.cosmospay.lat', '/zk/cm1x2y3z4a5b6c7d8e9f0g1h2'), { kind: 'rewrite', area: 'payments', path: '/payments/zk/cm1x2y3z4a5b6c7d8e9f0g1h2' });
  assert.deepEqual(route('dev.cosmospay.lat', '/zk/cm1x2y3z4a5b6c7d8e9f0g1h2'), {
    kind: 'redirect', location: 'https://payments.cosmospay.lat/zk/cm1x2y3z4a5b6c7d8e9f0g1h2', status: 301,
  });
  assert.deepEqual(route('payments.cosmospay.lat', '/login', '?next=%2Fdashboard'), {
    kind: 'redirect', location: 'https://dev.cosmospay.lat/login?next=%2Fdashboard', status: 301,
  });
  assert.deepEqual(route('payments.cosmospay.lat', '/pricing'), { kind: 'redirect', location: 'https://cosmospay.lat/pricing', status: 301 });
  assert.deepEqual(route('payments.cosmospay.lat', '/not-a-link'), { kind: 'not-found', area: 'payments' });
});

test("the prover's files answer on the platform as well, where the dashboard proves", () => {
  const file = '/zk/bb/0.87.0/main.worker.js';
  assert.deepEqual(route('payments.cosmospay.lat', file), { kind: 'rewrite', area: 'payments', path: `/payments${file}` });
  assert.deepEqual(route('dev.cosmospay.lat', file), { kind: 'rewrite', area: 'dev', path: `/payments${file}` });
  assert.deepEqual(route('cosmospay.lat', file), { kind: 'redirect', location: `https://payments.cosmospay.lat${file}`, status: 301 });
  // Only the prover's files, exactly /zk/bb/{version}/{file}: the rest of /zk stays on the payments domain.
  assert.deepEqual(route('dev.cosmospay.lat', '/zk/bbx'), { kind: 'redirect', location: 'https://payments.cosmospay.lat/zk/bbx', status: 301 });
  assert.deepEqual(route('dev.cosmospay.lat', '/zk/bb/0.87.0/a/b.js'), {
    kind: 'redirect', location: 'https://payments.cosmospay.lat/zk/bb/0.87.0/a/b.js', status: 301,
  });
});

test('a dot segment that survives the decode is a 404, never a way out of a mount', () => {
  // `%252e%252e` decodes to `%2e%2e`, which `new URL` resolves as `..` when the rewrite is applied.
  for (const p of ['/zk/bb/%252e%252e/%252e%252e/site/tos', '/zk/bb/0.87.0/%252E%252e', '/zk/bb/.%252e/x', '/zk/bb/%252e/x']) {
    assert.deepEqual(route('dev.cosmospay.lat', p), { kind: 'not-found', area: 'dev' }, p);
  }
  for (const p of ['/zk/%252e%252e/%252e%252e/site/tos', '/preview/%252e%252e/%252e%252e/dashboard']) {
    assert.deepEqual(route('payments.cosmospay.lat', p), { kind: 'not-found', area: 'payments' }, p);
  }
  assert.equal(canonicalPath('/zk/bb/%252e%252e'), null);
  // What the URL parser reads differently from the router: it drops tabs and newlines (`.%09.` is
  // `..` to it), and a decoded `?` or `#` would end the path.
  for (const p of ['/zk/bb/.%09./.%0a./site/tos', '/zk/bb/0.87.0/a%3f', '/zk/bb/0.87.0/a%23b', '/zk/%00x']) {
    assert.equal(canonicalPath(p), null, p);
    assert.equal(route('dev.cosmospay.lat', p).kind, 'not-found', p);
  }
  assert.equal(canonicalPath('/docs/v1.2/guide'), '/docs/v1.2/guide');
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

test('robots.txt, sitemap.xml, llms.txt and the /.well-known files answer on every domain, as that domain', () => {
  for (const path of ['/robots.txt', '/sitemap.xml', '/llms.txt', '/.well-known/security.txt', '/.well-known/api-catalog']) {
    assert.deepEqual(route('cosmospay.lat', path), { kind: 'pass', area: 'site' }, path);
    assert.deepEqual(route('payments.cosmospay.lat', path), { kind: 'pass', area: 'payments' }, path);
    assert.deepEqual(route('dev.cosmospay.lat', path), { kind: 'pass', area: 'dev' }, path);
  }
  // Any other /.well-known path is nobody's: a 404 on the site and the gateway.
  assert.deepEqual(route('cosmospay.lat', '/.well-known/nope'), { kind: 'not-found', area: 'site' });
});

test('a page of the site or the gateway asked with a trailing slash is a 301 to its one address', () => {
  assert.deepEqual(route('cosmospay.lat', '/pricing/'), { kind: 'redirect', location: 'https://cosmospay.lat/pricing', status: 301 });
  assert.deepEqual(route('cosmospay.lat', '/tos/', '?lang=es'), { kind: 'redirect', location: 'https://cosmospay.lat/tos?lang=es', status: 301 });
  assert.deepEqual(route('cosmospay.lat', '/swaps//'), { kind: 'redirect', location: 'https://cosmospay.lat/swaps', status: 301 });
  assert.deepEqual(route('payments.cosmospay.lat', '/faq/'), { kind: 'redirect', location: 'https://payments.cosmospay.lat/faq', status: 301 });
  assert.deepEqual(route('payments.cosmospay.lat', '/swaps/', '?lang=de'), { kind: 'redirect', location: 'https://payments.cosmospay.lat/swaps?lang=de', status: 301 });
  assert.deepEqual(route('payments.cosmospay.lat', `${LINK}/`), { kind: 'redirect', location: `https://payments.cosmospay.lat${LINK}`, status: 301 });
  assert.deepEqual(route('cosmospay.lat', '/pricing/', '', 'HEAD'), { kind: 'redirect', location: 'https://cosmospay.lat/pricing', status: 301 });
  // The home is "/" already; a form's POST keeps its target; the platform keeps its paths.
  assert.deepEqual(route('cosmospay.lat', '/'), { kind: 'rewrite', area: 'site', path: '/site' });
  assert.deepEqual(route('payments.cosmospay.lat', '/contact/', '', 'POST'), { kind: 'rewrite', area: 'payments', path: '/payments/contact' });
  assert.deepEqual(route('dev.cosmospay.lat', '/dashboard/'), { kind: 'pass', area: 'dev' });
  assert.deepEqual(route('dev.cosmospay.lat', '/docs/getting-started/'), { kind: 'pass', area: 'dev' });
  // Someone else's page with a slash still goes straight to its owner, in one hop.
  assert.deepEqual(route('payments.cosmospay.lat', '/pricing/'), { kind: 'redirect', location: 'https://cosmospay.lat/pricing', status: 301 });
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

test('/swaps is served by the gateway and by the company site, each its own; the platform sends it to the gateway', () => {
  assert.deepEqual(route('payments.cosmospay.lat', '/swaps'), { kind: 'rewrite', area: 'payments', path: '/payments/swaps' });
  assert.deepEqual(route('cosmospay.lat', '/swaps'), { kind: 'rewrite', area: 'site', path: '/site/swaps' });
  assert.deepEqual(route('dev.cosmospay.lat', '/swaps', '?x=1'), { kind: 'redirect', location: 'https://payments.cosmospay.lat/swaps?x=1', status: 301 });
});
