import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newestDate, pageModified, paymentsSources, siteSources, statedDate, type DateInput } from '@/lib/seo/page-dates';
import { GUIDES, GUIDE_DATES, PAYMENTS_PAGE_PATHS } from '@/lib/payments/site-pages';
import { TOS_LAST_UPDATED } from '@/lib/seo/site-meta';
import fs from 'node:fs';
import path from 'node:path';

const LANGS = ['en', 'es', 'pt', 'fr', 'de', 'hi', 'zh'];
const BUILT = '2026-11-01T12:00:00.000Z';

test('newestDate takes the latest commit among the files, a trailing slash meaning a whole folder', () => {
  const dates = {
    'src/a.ts': '2026-10-01T10:00:00Z',
    'src/dir/b.tsx': '2026-10-05T10:00:00-03:00',
    'src/dir/sub/c.ts': '2026-10-03T10:00:00Z',
    'src/other.ts': '2026-10-30T10:00:00Z',
  };
  assert.equal(newestDate(['src/a.ts'], dates), '2026-10-01T10:00:00Z');
  assert.equal(newestDate(['src/a.ts', 'src/dir/'], dates), '2026-10-05T10:00:00-03:00');
  assert.equal(newestDate(['src/dir'], dates), null, 'without the slash it is one file');
  assert.equal(newestDate(['src/missing.ts'], dates), null);
  assert.equal(newestDate(['src/a.ts'], {}), null);
});

test('every indexable page has sources, and they exist in the repository', () => {
  const root = process.cwd();
  const check = (sources: string[] | null, label: string) => {
    assert.ok(sources && sources.length > 0, label);
    for (const source of sources) assert.ok(fs.existsSync(path.join(root, source)), `${label}: ${source}`);
  };
  for (const lang of LANGS) {
    for (const p of ['/', '/pricing', '/about', '/swaps', '/tos']) check(siteSources(p, lang), `site ${p} ${lang}`);
    for (const p of ['/', ...PAYMENTS_PAGE_PATHS]) check(paymentsSources(p, lang), `payments ${p} ${lang}`);
  }
  assert.equal(siteSources('/nope', 'en'), null);
  assert.equal(paymentsSources('/pay', 'en'), null);
  // Each language version of a page that reads the platform catalog follows that catalog.
  assert.ok(siteSources('/about', 'es')?.includes('src/lib/i18n/messages/es.ts'));
  assert.ok(!siteSources('/about', 'es')?.includes('src/lib/i18n/messages/en.ts'));
});

test('a date the page states wins: the terms and each guide', () => {
  assert.equal(statedDate('site', '/tos'), TOS_LAST_UPDATED);
  assert.equal(statedDate('site', '/about'), null);
  for (const g of GUIDES) assert.equal(statedDate('payments', `/learn/${g}`), GUIDE_DATES[g].modified, g);
  assert.equal(statedDate('payments', '/learn'), null, 'the hub states none');
  assert.equal(statedDate('payments', '/faq'), null);
});

test('pageModified: stated date, else the newest source commit, else the build; null for a non-page', () => {
  const input: DateInput = {
    built: BUILT,
    dates: {
      'src/pages/site/about.astro': '2026-10-30T10:00:00Z',
      'src/lib/i18n/messages/fr.ts': '2026-10-31T10:00:00Z',
      'src/components/payments/landing/StructuredData.astro': '2026-11-01T09:00:00Z',
      'src/pages/payments/compare.astro': '2026-09-01T10:00:00Z',
      'src/lib/payments/compare.ts': '2026-10-27T10:00:00Z',
    },
  };
  assert.equal(pageModified('site', '/about', 'en', input), '2026-10-30T10:00:00Z');
  assert.equal(pageModified('site', '/about', 'fr', input), '2026-10-31T10:00:00Z');
  assert.equal(pageModified('site', '/tos', 'es', input), TOS_LAST_UPDATED);
  assert.equal(pageModified('payments', '/compare', 'en', input), '2026-10-27T10:00:00Z', 'the rates it compares are its content');
  assert.equal(pageModified('payments', '/faq', 'en', input), BUILT, 'nothing known: the build');
  assert.equal(pageModified('payments', '/learn/accept-usdc-payments', 'en', input), GUIDE_DATES['accept-usdc-payments'].modified);
  assert.equal(pageModified('payments', '/pay', 'en', input), null);
  // Markup is not content: a change to the structured data alone dates no page.
  assert.notEqual(pageModified('payments', '/faq', 'en', input), '2026-11-01T09:00:00Z');
});
