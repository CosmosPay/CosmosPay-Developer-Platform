/* metaDescriptions.test.ts: the meta description of every indexable page, in every language, read
   from the same source its page hands the layout (with the placeholders the page fills, filled):
   present, whole (no `{placeholder}` left), free of em dashes and spaced dashes, unique on its
   host, and at most 160 characters (code points), the length a search result shows before
   cutting it. The pages come from the lists that route and index them (SITE_PAGE_PATHS,
   PAYMENTS_PAGES), so a new page or language is checked as soon as it exists, and a page with
   no known source fails until it gets one here. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { messages } from '@/lib/i18n/messages/index';
import { SITE_LANGS, SITE_PAGE_PATHS, siteMeta, type SitePage } from '@/lib/seo/site-meta';
import { LANDING, pageMeta, type CopyPage } from '@/lib/payments/landing-i18n';
import { LOCALES, type Locale } from '@/lib/payments/i18n';
import { LEARN, guideCopy } from '@/lib/payments/learn/index';
import { PAYMENTS_PAGES, guideOf, type PaymentsPage } from '@/lib/payments/site-pages';
import { NETWORK_IDS } from '@/lib/chains';

const MAX = 160;
const length = (text: string) => [...text].length;
// Written as code points, so this file holds no em or en dash of its own.
const EM_DASH = String.fromCodePoint(0x2014);
const SPACED_DASH = new RegExp(String.raw`\s[${String.fromCodePoint(0x2013)}-]\s`);

/** What src/pages/site/<page>.astro passes as its description: the search copy of site-meta.ts,
 *  or for /swaps its catalog's, with `{n}` filled from NETWORK_IDS as swaps.astro does. */
function siteDescription(page: SitePage, lang: string): string {
  if (page === 'swaps') {
    const catalog = (messages as Record<string, typeof messages.en>)[lang] ?? messages.en;
    return catalog.swapsPage.metaDescription.replace(/\{n\}/g, String(NETWORK_IDS.length));
  }
  return siteMeta(page, lang).description;
}

/* The gateway's content and network pages by path, and the `pages` entry their copy is. */
const COPY_PAGES: Record<string, CopyPage> = {
  integrations: 'integrations',
  'use-cases': 'useCases',
  security: 'security',
  fees: 'fees',
  faq: 'faq',
  swaps: 'swaps',
  compare: 'compare',
  stellar: 'stellar',
  solana: 'solana',
  monad: 'monad',
};

/** What a gateway page passes to PaymentsLayout and LandingHead: pageMeta() for the home, the
 *  content pages and the network pages, the guides' own copy for /learn and each guide. */
function paymentsDescription(page: PaymentsPage | 'home', lang: Locale): string {
  if (page === 'home') return pageMeta(LANDING[lang], 'home').description;
  if (page === 'learn') return LEARN[lang].hub.description;
  const guide = guideOf(page);
  if (guide) return guideCopy(LEARN[lang], guide).description;
  const key = COPY_PAGES[page];
  assert.ok(key, `the gateway page /${page} has no known description source: add it to COPY_PAGES`);
  return pageMeta(LANDING[lang], key).description;
}

function check(where: string, description: string): void {
  assert.ok(description.trim().length > 0, `${where}: no description`);
  assert.ok(!description.includes('{'), `${where}: a placeholder is left: ${description}`);
  assert.ok(!description.includes(EM_DASH), `${where}: em dash`);
  assert.doesNotMatch(description, SPACED_DASH, `${where}: a spaced dash stands in for punctuation`);
  assert.ok(length(description) <= MAX, `${where}: ${length(description)} characters, over ${MAX}: ${description}`);
}

function assertUnique(host: string, lang: string, descriptions: Map<string, string>): void {
  const seen = new Map<string, string>();
  for (const [page, description] of descriptions) {
    const other = seen.get(description);
    assert.ok(!other, `${host} ${lang}: ${page} repeats the description of ${other}`);
    seen.set(description, page);
  }
}

test('the company site: every page has its own description of 160 characters or less in every language', () => {
  const pages = Object.keys(SITE_PAGE_PATHS) as SitePage[];
  assert.ok(pages.length >= 5, 'the site lists its pages');
  for (const lang of SITE_LANGS) {
    const descriptions = new Map<string, string>();
    for (const page of pages) {
      const description = siteDescription(page, lang);
      check(`cosmospay.lat${SITE_PAGE_PATHS[page]} (${lang})`, description);
      descriptions.set(page, description);
    }
    assertUnique('cosmospay.lat', lang, descriptions);
  }
});

test('the payments gateway: the home, every content, network and guide page has its own description of 160 characters or less in every language', () => {
  const pages: (PaymentsPage | 'home')[] = ['home', ...PAYMENTS_PAGES];
  for (const { code } of LOCALES) {
    assert.ok(LANDING[code] && LEARN[code], `${code} has the gateway's copy`);
    const descriptions = new Map<string, string>();
    for (const page of pages) {
      const description = paymentsDescription(page, code);
      check(`payments.cosmospay.lat/${page === 'home' ? '' : page} (${code})`, description);
      descriptions.set(page, description);
    }
    assertUnique('payments.cosmospay.lat', code, descriptions);
  }
});

test('the network count in the swaps descriptions is the one cross-chain swaps reach', () => {
  const count = String(NETWORK_IDS.length);
  for (const lang of SITE_LANGS) assert.ok(siteDescription('swaps', lang).includes(count), `cosmospay.lat/swaps (${lang}) names ${count} networks`);
  for (const { code } of LOCALES) assert.ok(paymentsDescription('swaps', code).includes(count), `payments /swaps (${code}) names ${count} networks`);
});
