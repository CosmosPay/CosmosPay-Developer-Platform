import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  INDEXNOW_ENDPOINT,
  MAX_URLS_PER_REQUEST,
  changedSince,
  describeStatus,
  inBatches,
  isIndexNowKey,
  isKeyFilePath,
  isSubmittableOrigin,
  keyFileBody,
  keyFileMatches,
  keyFilePath,
  onHost,
  parseSitemap,
  parseW3cDate,
  submissionPayload,
} from '@/lib/seo/indexnow';
import { sitemapIndexXml, sitemapXml } from '@/lib/seo/sitemap';

const KEY = '0f1e2d3c4b5a69788796a5b4c3d2e1f0';
const ORIGINS = { site: 'https://cosmospay.lat', dev: 'https://dev.cosmospay.lat', payments: 'https://payments.cosmospay.lat' };

test('a key is 8 to 128 letters, digits and dashes, as the protocol says', () => {
  for (const key of [KEY, 'abcdefgh', 'A1-b2-C3-d4', 'x'.repeat(128)]) assert.ok(isIndexNowKey(key), key);
  for (const key of [undefined, null, '', 'abcdefg', 'x'.repeat(129), 'abc_defgh', 'abc defgh', 'abcdefgh.txt', 'abcdefgh/', 42]) {
    assert.ok(!isIndexNowKey(key), String(key));
  }
});

test('the key file sits at the root, named after the key, and only the configured key answers', () => {
  assert.equal(keyFilePath(KEY), `/${KEY}.txt`);
  assert.ok(isKeyFilePath(`/${KEY}.txt`));
  assert.ok(isKeyFilePath('/ABCDEFGH-1.txt'), 'any case: hosts.ts matches the lowercased path');
  for (const path of ['/robots.txt', '/llms.txt', '/short.txt', `/${KEY}.TXT`, `/docs/${KEY}.txt`, `/${KEY}.txt/x`, `/${KEY}`, `/${KEY}.txt.bak`, `/${'x'.repeat(129)}.txt`]) {
    assert.ok(!isKeyFilePath(path), path);
  }
  assert.equal(keyFileBody(KEY, KEY), KEY);
  assert.equal(keyFileBody('0f1e2d3c', KEY), null, 'another name is a 404');
  assert.equal(keyFileBody(KEY.toUpperCase(), KEY), null, 'the name is compared exactly');
  assert.equal(keyFileBody(KEY, undefined), null, 'no key configured: a 404');
  assert.equal(keyFileBody('', ''), null);
  assert.equal(keyFileBody('short', 'short'), null, 'a key the protocol refuses is never served');
  assert.ok(keyFileMatches(`${KEY}\n`, KEY));
  assert.ok(!keyFileMatches('<!DOCTYPE html>', KEY));
});

test('parses a urlset: each <loc> with its lastmod, never the hreflang alternates', () => {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<!-- <url><loc>https://cosmospay.lat/commented-out</loc></url> -->
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
  <url>
    <loc>https://payments.cosmospay.lat/fees?lang=es&amp;x=1</loc>
    <lastmod>2026-10-30T12:00:00.000Z</lastmod>
    <xhtml:link rel="alternate" hreflang="en" href="https://payments.cosmospay.lat/fees?lang=en"/>
  </url>
  <url><loc>
    https://payments.cosmospay.lat/faq
  </loc><changefreq>weekly</changefreq></url>
  <url><loc><![CDATA[https://payments.cosmospay.lat/a&b]]></loc></url>
  <url><lastmod>2026-10-30</lastmod></url>
  <url><loc>https://payments.cosmospay.lat/&#x63;ompare</loc></url>
</urlset>`;
  assert.deepEqual(parseSitemap(xml), {
    kind: 'urlset',
    entries: [
      { loc: 'https://payments.cosmospay.lat/fees?lang=es&x=1', lastmod: '2026-10-30T12:00:00.000Z' },
      { loc: 'https://payments.cosmospay.lat/faq' },
      { loc: 'https://payments.cosmospay.lat/a&b' },
      { loc: 'https://payments.cosmospay.lat/compare' },
    ],
  });
});

test('parses a sitemap index, prefixed or not, and refuses what is not a sitemap', () => {
  assert.deepEqual(parseSitemap(sitemapIndexXml(['https://dev.cosmospay.lat/docs/sitemap.xml'])), {
    kind: 'index',
    entries: [{ loc: 'https://dev.cosmospay.lat/docs/sitemap.xml' }],
  });
  const prefixed = `<sm:sitemapindex xmlns:sm="http://www.sitemaps.org/schemas/sitemap/0.9"><sm:sitemap><sm:loc>https://x.example/a.xml</sm:loc><sm:lastmod>2026-10-01</sm:lastmod></sm:sitemap></sm:sitemapindex>`;
  assert.deepEqual(parseSitemap(prefixed), { kind: 'index', entries: [{ loc: 'https://x.example/a.xml', lastmod: '2026-10-01' }] });
  assert.equal(parseSitemap('<!DOCTYPE html><html><body>404</body></html>'), null);
  assert.equal(parseSitemap(''), null);
  assert.deepEqual(parseSitemap('<urlset></urlset>'), { kind: 'urlset', entries: [] });
});

test("reads this app's own sitemaps: every entry of the site and the gateway, the platform's index", () => {
  for (const area of ['site', 'payments'] as const) {
    const parsed = parseSitemap(sitemapXml(area, ORIGINS));
    assert.equal(parsed?.kind, 'urlset', area);
    const locs = parsed!.entries.map((e) => e.loc);
    assert.equal(locs.length, (sitemapXml(area, ORIGINS).match(/<loc>/g) ?? []).length, area);
    assert.ok(locs.every((l) => l.startsWith(`${ORIGINS[area]}/`)), area);
    const { kept, foreign } = onHost(parsed!.entries, ORIGINS[area]);
    assert.equal(kept.length, locs.length, `${area}: every URL is on its host, once`);
    assert.deepEqual(foreign, []);
  }
  const tos = parseSitemap(sitemapXml('site', ORIGINS))!.entries.find((e) => e.loc.includes('/tos'));
  assert.ok(tos?.lastmod && parseW3cDate(tos.lastmod) !== null, 'the terms state their date');
  assert.deepEqual(parseSitemap(sitemapXml('dev', ORIGINS)), { kind: 'index', entries: [{ loc: 'https://dev.cosmospay.lat/docs/sitemap.xml' }] });
});

test('keeps only the URLs on the submitted host, each once', () => {
  const { kept, foreign } = onHost(
    [
      { loc: 'https://dev.cosmospay.lat/docs/', lastmod: '2026-10-30' },
      { loc: 'https://DEV.cosmospay.lat/docs/' },
      { loc: 'http://dev.cosmospay.lat/docs/es/' },
      { loc: 'https://dev.cosmospay.lat:443/docs/sdk/' },
      { loc: 'https://cosmospay.lat/pricing' },
      { loc: 'https://dev.cosmospay.lat.evil.example/docs/' },
      { loc: 'https://dev.cosmospay.lat:8443/docs/' },
      { loc: 'ftp://dev.cosmospay.lat/docs/' },
      { loc: '/docs/relative' },
    ],
    'https://dev.cosmospay.lat',
  );
  assert.deepEqual(kept, [
    { loc: 'https://dev.cosmospay.lat/docs/', lastmod: '2026-10-30' },
    { loc: 'http://dev.cosmospay.lat/docs/es/' },
    { loc: 'https://dev.cosmospay.lat/docs/sdk/' },
  ]);
  assert.deepEqual(foreign, [
    'https://cosmospay.lat/pricing',
    'https://dev.cosmospay.lat.evil.example/docs/',
    'https://dev.cosmospay.lat:8443/docs/',
    'ftp://dev.cosmospay.lat/docs/',
    '/docs/relative',
  ]);
});

test('lastmod and --since read W3C dates; a bare date is midnight UTC', () => {
  assert.equal(parseW3cDate('2026-10-31'), Date.UTC(2026, 9, 31));
  assert.equal(parseW3cDate('2026-10'), Date.UTC(2026, 9, 1));
  assert.equal(parseW3cDate('2026'), Date.UTC(2026, 0, 1));
  assert.equal(parseW3cDate('2026-10-31T10:30:00.123Z'), Date.UTC(2026, 9, 31, 10, 30, 0, 123));
  assert.equal(parseW3cDate('2026-10-31T10:30-03:00'), Date.UTC(2026, 9, 31, 13, 30));
  assert.equal(parseW3cDate(' 2026-10-31T10:30:00+00:00 '), Date.UTC(2026, 9, 31, 10, 30));
  for (const value of ['', 'yesterday', '31/10/2026', '2026-10-31T10:30', '2026-10-31 10:30Z', '2026-13-01', '2026-02-30T00:00:00Z']) {
    assert.equal(parseW3cDate(value), null, value);
  }
});

test('--since keeps what changed on or after the date and says what it left out', () => {
  const entries = [
    { loc: 'https://dev.cosmospay.lat/docs/a/', lastmod: '2026-10-31T09:00:00.000Z' },
    { loc: 'https://dev.cosmospay.lat/docs/b/', lastmod: '2026-10-31' },
    { loc: 'https://dev.cosmospay.lat/docs/c/', lastmod: '2026-10-30T23:59:59Z' },
    { loc: 'https://dev.cosmospay.lat/docs/d/' },
    { loc: 'https://dev.cosmospay.lat/docs/e/', lastmod: 'soon' },
  ];
  const { changed, older, undated } = changedSince(entries, Date.UTC(2026, 9, 31));
  assert.deepEqual(changed.map((e) => e.loc.slice(-3)), ['/a/', '/b/']);
  assert.deepEqual(older.map((e) => e.loc.slice(-3)), ['/c/']);
  assert.deepEqual(undated.map((e) => e.loc.slice(-3)), ['/d/', '/e/']);
});

test('batches hold at most 10,000 URLs, in order', () => {
  assert.equal(MAX_URLS_PER_REQUEST, 10_000);
  assert.deepEqual(inBatches([]), []);
  const urls = Array.from({ length: 20_001 }, (_, i) => `https://cosmospay.lat/${i}`);
  const batches = inBatches(urls);
  assert.deepEqual(batches.map((b) => b.length), [10_000, 10_000, 1]);
  assert.deepEqual(batches.flat(), urls);
  assert.deepEqual(inBatches(urls.slice(0, 10_000)).map((b) => b.length), [10_000]);
  assert.deepEqual(inBatches([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);
  assert.throws(() => inBatches([1], 0), RangeError);
});

test("a submission names the host, the key and the key file at the host's root", () => {
  assert.equal(INDEXNOW_ENDPOINT, 'https://api.indexnow.org/indexnow');
  assert.deepEqual(submissionPayload('https://payments.cosmospay.lat/', KEY, ['https://payments.cosmospay.lat/fees']), {
    host: 'payments.cosmospay.lat',
    key: KEY,
    keyLocation: `https://payments.cosmospay.lat/${KEY}.txt`,
    urlList: ['https://payments.cosmospay.lat/fees'],
  });
});

test('only a public https origin is submitted', () => {
  for (const origin of ['https://cosmospay.lat', 'https://dev.cosmospay.lat', 'https://payments.cosmospay.lat/']) assert.ok(isSubmittableOrigin(origin), origin);
  for (const origin of ['http://cosmospay.lat', 'http://localhost:4321', 'https://localhost', 'http://payments.cosmospay.localhost:4321', 'https://dev.cosmospay.localhost', 'https://127.0.0.1', 'https://[::1]', 'https://intranet', 'not a url']) {
    assert.ok(!isSubmittableOrigin(origin), origin);
  }
});

test("every answer IndexNow documents reads as what it means", () => {
  assert.deepEqual(describeStatus(200), { ok: true, meaning: 'OK: URLs received' });
  assert.equal(describeStatus(202).ok, true);
  assert.match(describeStatus(202).meaning, /key validation pending/);
  for (const [status, words] of [[400, /invalid format/], [403, /key not valid/], [422, /not on this host/], [429, /Too many requests/]] as const) {
    assert.equal(describeStatus(status).ok, false, String(status));
    assert.match(describeStatus(status).meaning, words, String(status));
  }
  assert.deepEqual(describeStatus(500), { ok: false, meaning: 'HTTP 500' });
});
