import { test } from 'node:test';
import assert from 'node:assert/strict';
import { paymentsEntries, siteEntries, sitemapXml } from '@/lib/seo/sitemap';
import { TOS_LAST_UPDATED } from '@/lib/seo/site-meta';
import { GUIDES, GUIDE_DATES, PAYMENTS_PAGE_PATHS } from '@/lib/payments/site-pages';
import type { DateInput } from '@/lib/seo/page-dates';

const ORIGINS = { site: 'https://cosmospay.lat', dev: 'https://dev.cosmospay.lat', payments: 'https://payments.cosmospay.lat' };

test('the company site lists every page once per language it is written in: English bare, the others ?lang=', () => {
  const entries = siteEntries(ORIGINS.site);
  const locs = entries.map((e) => e.loc);
  for (const path of ['/', '/pricing', '/about']) {
    const url = new URL(path, ORIGINS.site).href;
    assert.ok(locs.includes(url), `${path} English`);
    for (const lang of ['es', 'pt', 'fr', 'de', 'hi', 'zh']) assert.ok(locs.includes(`${url}?lang=${lang}`), `${path} ${lang}`);
  }
  assert.ok(!locs.some((l) => l.includes('lang=en')), 'English has no ?lang=');
  // /swaps is canonical on the gateway: not in the company sitemap.
  assert.ok(!locs.some((l) => new URL(l).pathname === '/swaps'));
  // The terms exist in English and Spanish only.
  assert.deepEqual(locs.filter((l) => l.includes('/tos')), ['https://cosmospay.lat/tos', 'https://cosmospay.lat/tos?lang=es']);
  assert.equal(new Set(locs).size, locs.length, 'no URL twice');
  assert.equal(entries.length, 3 * 7 + 2);
});

test('each entry names all the versions of its page, itself included', () => {
  for (const entry of [...siteEntries(ORIGINS.site), ...paymentsEntries(ORIGINS.payments)]) {
    assert.ok(entry.alternates.some((a) => a.href === entry.loc), entry.loc);
    assert.equal(entry.alternates.at(-1)?.hreflang, 'x-default');
  }
});

test('without the build dates, lastmod only where the page states a date', () => {
  const entries = siteEntries(ORIGINS.site);
  for (const e of entries) assert.equal(e.lastmod, e.loc.includes('/tos') ? TOS_LAST_UPDATED : undefined, e.loc);
  // On the gateway only the guides state a date (when each was last updated).
  for (const e of paymentsEntries(ORIGINS.payments)) {
    const guide = GUIDES.find((g) => new URL(e.loc).pathname === `/learn/${g}`);
    assert.equal(e.lastmod, guide ? GUIDE_DATES[guide].modified : undefined, e.loc);
  }
});

test('with the build dates every entry has a lastmod: the stated one, its sources last commit, else the build', () => {
  const dates: DateInput = {
    built: '2026-11-01T12:00:00.000Z',
    dates: {
      'src/pages/site/about.astro': '2026-10-30T10:00:00-03:00',
      'src/lib/i18n/messages/es.ts': '2026-10-31T09:00:00-03:00',
      'src/lib/i18n/messages/en.ts': '2026-10-20T09:00:00-03:00',
      'src/pages/payments/faq.astro': '2026-10-25T09:00:00-03:00',
      'src/lib/payments/landing-i18n.ts': '2026-10-28T09:00:00-03:00',
    },
  };
  const site = siteEntries(ORIGINS.site, dates);
  for (const e of site) assert.ok(e.lastmod, e.loc);
  const lastmod = (loc: string) => [...site, ...paymentsEntries(ORIGINS.payments, dates)].find((e) => e.loc === loc)?.lastmod;
  assert.equal(lastmod('https://cosmospay.lat/about'), '2026-10-30T10:00:00-03:00');
  assert.equal(lastmod('https://cosmospay.lat/about?lang=es'), '2026-10-31T09:00:00-03:00', 'each language by its own catalog');
  assert.equal(lastmod('https://cosmospay.lat/tos?lang=es'), TOS_LAST_UPDATED, 'a stated date wins');
  assert.equal(lastmod('https://payments.cosmospay.lat/faq'), '2026-10-28T09:00:00-03:00');
  assert.equal(lastmod('https://payments.cosmospay.lat/learn/accept-usdc-payments'), GUIDE_DATES['accept-usdc-payments'].modified);
  assert.equal(lastmod('https://cosmospay.lat/pricing'), '2026-10-20T09:00:00-03:00');
  assert.equal(siteEntries(ORIGINS.site, { built: '2026-11-01T12:00:00.000Z', dates: {} })[0].lastmod, '2026-11-01T12:00:00.000Z', 'no git: the build');
});

test('the gateway lists its home and every content page in every language, English at the bare path', () => {
  const entries = paymentsEntries(ORIGINS.payments);
  assert.equal(entries.length, (1 + PAYMENTS_PAGE_PATHS.length) * 7);
  const locs = entries.map((e) => e.loc);
  assert.ok(locs.includes('https://payments.cosmospay.lat/faq'));
  assert.ok(!locs.some((l) => l.includes('lang=en')));
  assert.equal(new Set(locs).size, locs.length, 'no URL twice');
});

test('the XML is a urlset with hreflang links, and the platform an index of the docs sitemap', () => {
  const site = sitemapXml('site', ORIGINS);
  assert.match(site, /^<\?xml version="1.0" encoding="UTF-8"\?>\n<urlset xmlns="http:\/\/www.sitemaps.org\/schemas\/sitemap\/0.9" xmlns:xhtml="http:\/\/www.w3.org\/1999\/xhtml">/);
  assert.ok(site.includes('<xhtml:link rel="alternate" hreflang="x-default" href="https://cosmospay.lat/about"/>'));
  assert.ok(site.includes('<xhtml:link rel="alternate" hreflang="en" href="https://cosmospay.lat/about"/>'));
  assert.ok(!site.includes('/swaps'), 'the company /swaps is canonical on the gateway');
  assert.ok(site.includes('<loc>https://cosmospay.lat/about?lang=zh</loc>'));
  assert.ok(site.includes('<xhtml:link rel="alternate" hreflang="es" href="https://cosmospay.lat/about?lang=es"/>'));
  assert.ok(site.includes(`<lastmod>${TOS_LAST_UPDATED}</lastmod>`));
  assert.ok(!site.includes('<changefreq>') && !site.includes('<priority>'));
  const dev = sitemapXml('dev', ORIGINS);
  assert.match(dev, /<sitemapindex xmlns="http:\/\/www.sitemaps.org\/schemas\/sitemap\/0.9">/);
  assert.ok(dev.includes('<loc>https://dev.cosmospay.lat/docs/sitemap.xml</loc>'));
  const payments = sitemapXml('payments', ORIGINS);
  assert.ok(payments.includes('<loc>https://payments.cosmospay.lat/faq?lang=es</loc>'));
  assert.ok(payments.includes('<loc>https://payments.cosmospay.lat/swaps</loc>'));
  assert.ok(!payments.includes('lang=en'));
});
