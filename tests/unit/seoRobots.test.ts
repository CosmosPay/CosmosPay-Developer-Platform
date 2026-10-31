import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CONTENT_SIGNAL, robotsTxt } from '@/lib/seo/robots';
import { PAYMENTS_PAGE_PATHS } from '@/lib/payments/site-pages';

const ORIGINS = { site: 'https://cosmospay.lat', dev: 'https://dev.cosmospay.lat', payments: 'https://payments.cosmospay.lat' };

/* How Google reads one group: the longest matching rule wins, Allow on a tie; `*` is any run of
   characters and a final `$` anchors the end. Enough of RFC 9309 to check what the file means. */
function allowed(robots: string, url: string): boolean {
  const rules = robots
    .split('\n')
    .map((line) => /^(Allow|Disallow):\s*(\S*)/i.exec(line.trim()))
    .filter((m): m is RegExpExecArray => !!m && m[2] !== '')
    .map((m) => ({ allow: m[1].toLowerCase() === 'allow', path: m[2] }));
  const matches = (pattern: string) => {
    const anchored = pattern.endsWith('$');
    const body = (anchored ? pattern.slice(0, -1) : pattern).split('*').map((p) => p.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('.*');
    return new RegExp(`^${body}${anchored ? '$' : ''}`).test(url);
  };
  let best: { allow: boolean; path: string } | null = null;
  for (const rule of rules) {
    if (!matches(rule.path)) continue;
    if (!best || rule.path.length > best.path.length || (rule.path.length === best.path.length && rule.allow)) best = rule;
  }
  return best ? best.allow : true;
}

test('every domain states its content signals and its sitemaps', () => {
  for (const area of ['site', 'dev', 'payments'] as const) {
    const robots = robotsTxt(area, ORIGINS);
    assert.match(robots, /^User-agent: \*$/m, area);
    assert.ok(robots.includes(CONTENT_SIGNAL), area);
    assert.match(CONTENT_SIGNAL, /^Content-Signal: search=yes, ai-input=yes, ai-train=(yes|no)$/);
    assert.ok(robots.includes(`Sitemap: ${ORIGINS[area]}/sitemap.xml`), area);
  }
  assert.ok(robotsTxt('dev', ORIGINS).includes('Sitemap: https://dev.cosmospay.lat/docs/sitemap.xml'));
});

test('payments: its pages and everything they load are crawlable', () => {
  const robots = robotsTxt('payments', ORIGINS);
  for (const url of [
    '/',
    '/?lang=es',
    ...PAYMENTS_PAGE_PATHS,
    ...PAYMENTS_PAGE_PATHS.map((p) => `${p}?lang=zh`),
    '/_astro/PaymentsLayout.DA9AInrV.css',
    '/_astro/hoisted.js',
    '/fonts/OpenSauceOne-Regular.woff2',
    '/media/coin-ramp-poster.webp',
    '/media/brands/freighter.webp',
    '/brand/astronauta-pensando.svg',
    '/embed/cosmos-pay.js',
    '/favicon.svg',
    '/favicon-32x32.png',
    '/apple-touch-icon.png',
    '/android-chrome-512x512.png',
    '/og-image.png',
    '/site.webmanifest',
    '/sitemap.xml',
    '/llms.txt',
    '/.well-known/security.txt',
    '/.well-known/api-catalog',
  ]) {
    assert.ok(allowed(robots, url), url);
  }
});

test('payments: payment links, the SEP-7 handler, previews and private checkouts stay out', () => {
  const robots = robotsTxt('payments', ORIGINS);
  for (const url of ['/cmh4x2k9a0001l70g8v5q3z2w', '/cmh4x2k9a0001l70g8v5q3z2w?lang=es', '/pay?uri=web%2Bstellar%3Apay', '/preview/split', '/zk/cm1x2y3z4a5b6c7d8e9f0g1h2', '/contact', '/faq/extra', '/faqs']) {
    assert.ok(!allowed(robots, url), url);
  }
});

test('the company site is open but for the web wallet; the platform only opens its docs', () => {
  const site = robotsTxt('site', ORIGINS);
  for (const url of ['/', '/pricing?lang=es', '/swaps', '/tos', '/llms.txt']) assert.ok(allowed(site, url), url);
  assert.ok(!allowed(site, '/wallet/'));
  const dev = robotsTxt('dev', ORIGINS);
  for (const url of ['/docs/', '/docs/getting-started/', '/docs/llms.txt']) assert.ok(allowed(dev, url), url);
  for (const url of ['/login', '/dashboard', '/api/openapi.json', '/swagger', '/invite/abc']) assert.ok(!allowed(dev, url), url);
});
