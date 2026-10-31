import { test } from 'node:test';
import assert from 'node:assert/strict';
import { paymentsEntries, siteEntries, sitemapXml } from '@/lib/seo/sitemap';
import { TOS_LAST_UPDATED } from '@/lib/seo/site-meta';
import { PAYMENTS_PAGE_PATHS } from '@/lib/payments/site-pages';

const ORIGINS = { site: 'https://cosmospay.lat', dev: 'https://dev.cosmospay.lat', payments: 'https://payments.cosmospay.lat' };

test('the company site lists every page in every language it is written in, /swaps included', () => {
  const entries = siteEntries(ORIGINS.site);
  const locs = entries.map((e) => e.loc);
  for (const path of ['/', '/pricing', '/swaps']) {
    const url = new URL(path, ORIGINS.site).href;
    assert.ok(locs.includes(url), `${path} x-default`);
    for (const lang of ['en', 'es', 'pt', 'fr', 'de', 'hi', 'zh']) assert.ok(locs.includes(`${url}?lang=${lang}`), `${path} ${lang}`);
  }
  // The terms exist in English and Spanish only.
  assert.deepEqual(locs.filter((l) => l.includes('/tos')), ['https://cosmospay.lat/tos?lang=en', 'https://cosmospay.lat/tos?lang=es', 'https://cosmospay.lat/tos']);
  assert.equal(new Set(locs).size, locs.length, 'no URL twice');
  assert.equal(entries.length, 3 * 8 + 3);
});

test('each entry names all the versions of its page, itself included', () => {
  for (const entry of [...siteEntries(ORIGINS.site), ...paymentsEntries(ORIGINS.payments)]) {
    assert.ok(entry.alternates.some((a) => a.href === entry.loc), entry.loc);
    assert.equal(entry.alternates.at(-1)?.hreflang, 'x-default');
  }
});

test('lastmod only where the page states a date', () => {
  const entries = siteEntries(ORIGINS.site);
  for (const e of entries) assert.equal(e.lastmod, e.loc.includes('/tos') ? TOS_LAST_UPDATED : undefined, e.loc);
  assert.ok(paymentsEntries(ORIGINS.payments).every((e) => e.lastmod === undefined));
});

test('the gateway lists its home and every content page in every language', () => {
  assert.equal(paymentsEntries(ORIGINS.payments).length, (1 + PAYMENTS_PAGE_PATHS.length) * 8);
});

test('the XML is a urlset with hreflang links, and the platform an index of the docs sitemap', () => {
  const site = sitemapXml('site', ORIGINS);
  assert.match(site, /^<\?xml version="1.0" encoding="UTF-8"\?>\n<urlset xmlns="http:\/\/www.sitemaps.org\/schemas\/sitemap\/0.9" xmlns:xhtml="http:\/\/www.w3.org\/1999\/xhtml">/);
  assert.ok(site.includes('<xhtml:link rel="alternate" hreflang="x-default" href="https://cosmospay.lat/swaps"/>'));
  assert.ok(site.includes(`<lastmod>${TOS_LAST_UPDATED}</lastmod>`));
  assert.ok(!site.includes('<changefreq>') && !site.includes('<priority>'));
  const dev = sitemapXml('dev', ORIGINS);
  assert.match(dev, /<sitemapindex xmlns="http:\/\/www.sitemaps.org\/schemas\/sitemap\/0.9">/);
  assert.ok(dev.includes('<loc>https://dev.cosmospay.lat/docs/sitemap.xml</loc>'));
  assert.ok(sitemapXml('payments', ORIGINS).includes('<loc>https://payments.cosmospay.lat/faq?lang=es</loc>'));
});
