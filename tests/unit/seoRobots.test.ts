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
    // Each page's share card (src/lib/seo/og-image-urls.ts: fingerprinted by Vite under /_astro/).
    '/_astro/home.en.CDxk2uXQ.png',
    '/_astro/learn-accept-usdc-payments.hi.B7a_9fQe.png',
    '/site.webmanifest',
    '/sitemap.xml',
    '/llms.txt',
    '/llms-full.txt',
    '/index.md',
    '/index.md?lang=hi',
    ...PAYMENTS_PAGE_PATHS.map((p) => `${p}.md`),
    ...PAYMENTS_PAGE_PATHS.map((p) => `${p}.md?lang=es`),
    '/.well-known/security.txt',
    '/.well-known/api-catalog',
  ]) {
    assert.ok(allowed(robots, url), url);
  }
});

test('payments: an indexable page stays open with any query string and at its trailing-slash form', () => {
  const robots = robotsTxt('payments', ORIGINS);
  for (const url of [
    // The links assistants and newsletters share carry tracking parameters.
    '/faq?utm_source=chatgpt.com',
    '/?utm_source=perplexity',
    '/?utm_source=perplexity&lang=es',
    '/stellar?lang=es&utm_medium=referral',
    '/learn/accept-usdc-payments?utm_source=chatgpt.com',
    '/compare?ref=newsletter',
    '/faq.md?utm_source=chatgpt.com',
    '/index.md?utm_source=claude.ai',
    // The trailing-slash forms answer a 301 to the page, which a crawler must fetch to follow.
    '/faq/',
    '/learn/',
    '/learn/?lang=pt',
    '/faq/?utm_source=chatgpt.com',
    '/learn/stellar-vs-solana-vs-monad/',
    '/fees.md/',
    ...PAYMENTS_PAGE_PATHS.map((p) => `${p}/`),
    ...PAYMENTS_PAGE_PATHS.map((p) => `${p}?utm_source=chatgpt.com`),
    ...PAYMENTS_PAGE_PATHS.map((p) => `${p}.md?utm_source=chatgpt.com`),
  ]) {
    assert.ok(allowed(robots, url), url);
  }
  // The same parameters never open anything else.
  for (const url of [
    '/cmh4x2k9a0001l70g8v5q3z2w?utm_source=chatgpt.com',
    '/cmh4x2k9a0001l70g8v5q3z2w/',
    '/pay?utm_source=chatgpt.com',
    '/pay/',
    '/preview/split?utm_source=chatgpt.com',
    '/preview/',
    '/zk/cm1x2y3z4a5b6c7d8e9f0g1h2?utm_source=chatgpt.com',
    '/contact?utm_source=chatgpt.com',
    '/contact/',
    '/faq/extra?utm_source=chatgpt.com',
    '/faq//',
    '/faqs?utm_source=chatgpt.com',
    '/learn/index.md?utm_source=chatgpt.com',
    '/learnx',
  ]) {
    assert.ok(!allowed(robots, url), url);
  }
});

test('payments: payment links, the SEP-7 handler, previews and private checkouts stay out', () => {
  const robots = robotsTxt('payments', ORIGINS);
  for (const url of [
    '/cmh4x2k9a0001l70g8v5q3z2w',
    '/cmh4x2k9a0001l70g8v5q3z2w?lang=es',
    '/cmh4x2k9a0001l70g8v5q3z2w.md',
    '/pay?uri=web%2Bstellar%3Apay',
    '/pay.md',
    '/preview/split',
    '/preview/split.md',
    '/zk/cm1x2y3z4a5b6c7d8e9f0g1h2',
    '/contact',
    '/faq/extra',
    '/faqs',
    '/faq.mdx',
    '/learn/index.md',
  ]) {
    assert.ok(!allowed(robots, url), url);
  }
});

test('the company site is open but for the web wallet; the platform only opens its docs', () => {
  const site = robotsTxt('site', ORIGINS);
  for (const url of ['/', '/pricing?lang=es', '/swaps', '/tos', '/llms.txt', '/llms-full.txt', '/index.md', '/pricing.md?lang=es', '/tos.md']) {
    assert.ok(allowed(site, url), url);
  }
  assert.ok(!allowed(site, '/wallet/'));
  const dev = robotsTxt('dev', ORIGINS);
  for (const url of ['/docs/', '/docs/getting-started/', '/docs/llms.txt']) assert.ok(allowed(dev, url), url);
  for (const url of ['/login', '/dashboard', '/api/openapi.json', '/swagger', '/invite/abc']) assert.ok(!allowed(dev, url), url);
});

test('the IndexNow key file is crawlable on every domain, and the payments domain names it', () => {
  const key = '0f1e2d3c4b5a69788796a5b4c3d2e1f0';
  for (const area of ['site', 'dev', 'payments'] as const) {
    const robots = robotsTxt(area, ORIGINS, key);
    assert.ok(allowed(robots, `/${key}.txt`), area);
  }
  const payments = robotsTxt('payments', ORIGINS, key);
  assert.ok(payments.split('\n').includes(`Allow: /${key}.txt$`));
  // Only that file: anything else still stays out, the key's own name included.
  for (const url of [`/${key}.txt?x=1`, `/${key}.txt/`, `/${key}`, '/0123456789abcdef.txt', '/cmh4x2k9a0001l70g8v5q3z2w']) {
    assert.ok(!allowed(payments, url), url);
  }
  // No key configured, or one the protocol refuses: no line, and nothing else changes.
  assert.equal(robotsTxt('payments', ORIGINS, undefined), robotsTxt('payments', ORIGINS));
  assert.equal(robotsTxt('payments', ORIGINS, 'short'), robotsTxt('payments', ORIGINS));
  assert.equal(robotsTxt('payments', ORIGINS, '../etc/passwd'), robotsTxt('payments', ORIGINS));
  assert.ok(!allowed(robotsTxt('payments', ORIGINS), `/${key}.txt`));
  for (const area of ['site', 'dev'] as const) assert.equal(robotsTxt(area, ORIGINS, key), robotsTxt(area, ORIGINS), area);
});
