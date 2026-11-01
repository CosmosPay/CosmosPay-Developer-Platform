import { test } from 'node:test';
import assert from 'node:assert/strict';
import { OG_IMAGE_HEIGHT, OG_IMAGE_WIDTH, ogCard, ogCards, ogFile } from '@/lib/seo/og-images';
import { indexablePages } from '@/lib/seo/indexable';
import { pageDoc } from '@/lib/seo/page-markdown';
import { robotsTxt } from '@/lib/seo/robots';
import { OgFonts } from '@/lib/og/fonts';
import { cardSvg, renderCard } from '@/lib/og/render';
import { fitTitle } from '@/lib/og/text';

const ORIGINS = { site: 'https://cosmospay.lat', dev: 'https://dev.cosmospay.lat', payments: 'https://payments.cosmospay.lat' };
const INPUT = { ...ORIGINS, api: 'https://api.cosmospay.lat/cosmos-api', profiles: {} };

/* Loaded once for the file: decoding the fonts is the slow part. */
const fontsReady = OgFonts.load();

/** The width and height a PNG's IHDR states, after checking the signature. */
function pngSize(png: Buffer): { width: number; height: number } {
  assert.deepEqual([...png.subarray(0, 8)], [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 'PNG signature');
  assert.equal(png.subarray(12, 16).toString('latin1'), 'IHDR');
  return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
}

test('every indexable page has a card in every language it is written in, each its own file', () => {
  const cards = ogCards();
  const expected = (['site', 'payments'] as const).flatMap((area) => indexablePages(area).flatMap((page) => page.langs.map((lang) => `${area} ${page.path} ${lang}`)));
  assert.deepEqual(
    cards.map((c) => `${c.area} ${c.path} ${c.lang}`),
    expected,
  );
  assert.equal(new Set(cards.map((c) => c.file)).size, cards.length, 'one file per card');
  for (const card of cards) {
    assert.equal(card.file, ogFile(card.area, card.path, card.lang));
    assert.match(card.file, /^(site|payments)\/[a-z0-9-]+\.(en|es|pt|fr|de|hi|zh)\.png$/, card.file);
    assert.ok(card.title.trim(), `${card.file}: a title`);
    assert.ok(!/\u{2014}/u.test(card.title + card.alt), `${card.file}: no em dash`);
  }
  // The gateway's home, and nothing else, highlights words of its hero.
  assert.deepEqual(
    cards.filter((c) => c.mark).map((c) => c.file),
    cards.filter((c) => c.area === 'payments' && c.path === '/').map((c) => c.file),
  );
});

test("a card's title is the page's own h1 in its language, its label the host's", () => {
  for (const card of ogCards()) {
    const doc = pageDoc(card.area, card.path, card.lang, INPUT);
    const h1 = doc?.blocks.find((b) => b.kind === 'h' && b.level === 1);
    assert.ok(h1 && h1.kind === 'h', `${card.file}: the page has an h1`);
    // The card sets the hero's two lines on two lines, and Chinese without the space the code
    // puts between the hero's halves.
    const flat = (s: string) => s.replace(/\s+/g, ' ').replace(/(?<=[\p{Script=Han}\u{3000}-\u{303f}]) (?=[\p{Script=Han}\u{3000}-\u{303f}])/gu, '');
    assert.equal(flat(card.title), flat(h1.text), card.file);
    assert.equal(card.lang, doc?.lang);
    assert.equal(card.label, card.area === 'payments' ? 'Payments' : undefined);
    assert.equal(card.host, card.area === 'payments' ? 'payments.cosmospay.lat' : 'cosmospay.lat');
    assert.equal(card.alt, `${card.area === 'payments' ? 'Cosmos Pay Payments' : 'Cosmos Pay'}: ${card.title.replace(/\s*\n\s*/g, ' ')}`);
  }
  assert.equal(ogCard('payments', '/', 'zh')?.title.split('\n')[0], '接受稳定币支付。');
  assert.equal(ogCard('payments', '/', 'en')?.mark, 'stablecoins');
});

test('pages without a card of their own: unregistered paths, languages a page is not written in', () => {
  assert.equal(ogCard('site', '/tos', 'fr'), null, 'the terms exist in English and Spanish');
  assert.ok(ogCard('site', '/tos', 'es'));
  assert.equal(ogCard('site', '/swaps', 'en'), null, "the company /swaps names the gateway's page canonical");
  assert.ok(ogCard('payments', '/swaps', 'en'));
  for (const path of ['/pay', '/preview/classic', '/cmh4x2k9a0001l70g8v5q3z2w', '/zk/abc', '/contact']) {
    assert.equal(ogCard('payments', path, 'en'), null, path);
  }
  assert.equal(ogCard('site', '/dashboard', 'en'), null);
});

test('every title fits its card in every language, with a glyph for every character', async () => {
  const fonts = await fontsReady;
  for (const card of ogCards()) {
    // Throws when the title does not fit three lines at the smallest size, or when a character
    // has no glyph in any face (tofu).
    const svg = await cardSvg(card, fonts);
    assert.match(svg, new RegExp(`^<svg [^>]*width="${OG_IMAGE_WIDTH}" height="${OG_IMAGE_HEIGHT}"`), card.file);
    assert.ok(!/NaN|undefined|Infinity/.test(svg.replace(/href="data:[^"]*"/g, '')), `${card.file}: well-formed geometry`);
  }
});

test('a title is refused rather than drawn with a missing glyph or past its box', async () => {
  const fonts = await fontsReady;
  const box = { width: 1056, maxLines: 3, sizes: [80, 60, 44] };
  assert.throws(() => fitTitle('Pagos en \u{1F600}', fonts, { weight: 600, tracking: -0.035 }, box, 'es'), /no face has/);
  assert.throws(() => fitTitle('word '.repeat(80), fonts, { weight: 600, tracking: -0.035 }, box, 'en'), /does not fit/);
  // Hindi and Chinese set in their Noto faces; Latin words inside them stay in the brand face.
  // Chinese is opened slice by slice: prepare() loads the ones a text needs.
  await fonts.prepare('在 Stellar 上收款', 600);
  const hi = fitTitle('Stellar पर भुगतान लें', fonts, { weight: 600, tracking: -0.035 }, box, 'hi');
  const zh = fitTitle('在 Stellar 上收款', fonts, { weight: 600, tracking: -0.035 }, box, 'zh');
  for (const fitted of [hi, zh]) {
    assert.equal(fitted.lines.length, 1);
    assert.equal(fitted.size, 80);
  }
  // A long title steps down in size and balances its lines.
  const long = fitTitle('Qu’est-ce qu’une passerelle de paiement en stablecoins ?', fonts, { weight: 600, tracking: -0.035 }, { ...box, sizes: [80, 76, 72, 68, 64] }, 'fr');
  assert.ok(long.lines.length <= 3);
  assert.ok(long.lines.at(-1)?.text.endsWith('stablecoins ?'), 'the question mark stays with its word');
  const widths = long.lines.map((l) => l.width);
  assert.ok(Math.min(...widths) > 0.5 * Math.max(...widths), `balanced: ${widths.map(Math.round).join(', ')}`);
});

test('a card renders as a 1200x630 PNG on either host, in Latin, Devanagari and Chinese', async () => {
  const fonts = await fontsReady;
  for (const [area, path, lang] of [
    ['payments', '/', 'en'],
    ['payments', '/', 'hi'],
    ['payments', '/stellar', 'zh'],
    ['payments', '/learn/stablecoin-payment-gateway', 'fr'],
    ['site', '/', 'en'],
    ['site', '/pricing', 'hi'],
    ['site', '/about', 'zh'],
  ] as const) {
    const card = ogCard(area, path, lang);
    assert.ok(card, `${area} ${path} ${lang}`);
    const png = await renderCard(card, fonts);
    assert.deepEqual(pngSize(png), { width: OG_IMAGE_WIDTH, height: OG_IMAGE_HEIGHT }, card.file);
    // Social previews (WhatsApp in particular) drop images much over 300 KB.
    assert.ok(png.length < 300 * 1024, `${card.file}: ${png.length} bytes`);
  }
});

test('the payments robots.txt lets crawlers fetch the cards (Vite serves them under /_astro/)', () => {
  const robots = robotsTxt('payments', ORIGINS);
  assert.ok(robots.split('\n').includes('Allow: /_astro/'));
  assert.ok(!robots.split('\n').some((line) => /^Disallow: \/_astro/.test(line)));
});
