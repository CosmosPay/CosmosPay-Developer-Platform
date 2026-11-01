import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LOCALES } from '@/lib/payments/i18n';
import { GUIDE_CONFIG, GUIDE_KEYS, LEARN, guideCopy } from '@/lib/payments/learn/index';
import { isExternal, learnHrefs } from '@/lib/payments/learn/links';
import { GUIDES, GUIDE_DATES, LEARN_PAGES, PAYMENTS_PAGE_PATHS, guideOf, pagePath } from '@/lib/payments/site-pages';

/* The guides (/learn and /learn/<slug>): what search engines read first (the <title> and the meta
   description) fits what they show, in every language; every link leads somewhere; every block the
   page draws has its words. */

const TITLE_MAX = 60;
const DESCRIPTION_MAX = 155;
const SUFFIX = ' | Cosmos Pay';
const EM_DASH = String.fromCharCode(0x2014);

for (const { code } of LOCALES) {
  test(`guides (${code}): titles fit ${TITLE_MAX} characters and descriptions ${DESCRIPTION_MAX}`, () => {
    const t = LEARN[code];
    const pages = [
      { name: 'hub', meta: t.hub.meta, description: t.hub.description },
      ...GUIDES.map((guide) => ({ name: guide, ...guideCopy(t, guide) })),
    ];
    for (const p of pages) {
      assert.ok(p.meta.length <= TITLE_MAX, `${code} ${p.name}: title is ${p.meta.length} characters: ${p.meta}`);
      assert.ok(p.meta.endsWith(SUFFIX), `${code} ${p.name}: title ends with "${SUFFIX}"`);
      assert.ok(p.description.length <= DESCRIPTION_MAX, `${code} ${p.name}: description is ${p.description.length} characters`);
      // Chinese says in about half the characters what the alphabetic languages do.
      assert.ok(p.description.length >= (code === 'zh' ? 30 : 70), `${code} ${p.name}: description says too little`);
    }
  });

  test(`guides (${code}): each title keeps the words people search for`, () => {
    const t = LEARN[code];
    assert.match(guideCopy(t, 'accept-usdc-payments').meta, /USDC/);
    assert.match(guideCopy(t, 'whatsapp-payment-links').meta, /WhatsApp/);
    const networks = guideCopy(t, 'stellar-vs-solana-vs-monad').meta;
    for (const name of ['Stellar', 'Solana', 'Monad']) assert.ok(networks.includes(name), `${code}: ${name}`);
  });

  test(`guides (${code}): no em dash`, () => {
    assert.ok(!JSON.stringify(LEARN[code]).includes(EM_DASH));
  });
}

test('the English titles name the searched topic', () => {
  assert.match(guideCopy(LEARN.en, 'accept-usdc-payments').meta, /accept USDC payments online/i);
  assert.match(guideCopy(LEARN.en, 'whatsapp-payment-links').meta, /payment links on WhatsApp/i);
  assert.match(guideCopy(LEARN.en, 'stablecoin-payment-gateway').meta, /stablecoin payment gateway/i);
  assert.match(LEARN.en.hub.meta, /stablecoin payment guides/i);
});

test('each guide answers first: its English lede is two or three sentences', () => {
  for (const guide of GUIDES) {
    const sentences = guideCopy(LEARN.en, guide).lede.split(/(?<=[.?!])\s+/).filter(Boolean);
    assert.ok(sentences.length >= 2 && sentences.length <= 3, `${guide}: ${sentences.length} sentences`);
  }
});

test('every guide is registered: a catalog entry, a config, dates and a routed path', () => {
  assert.deepEqual(Object.keys(GUIDE_KEYS).sort(), [...GUIDES].sort());
  assert.deepEqual(Object.values(GUIDE_KEYS).sort(), Object.keys(LEARN.en.guides).sort());
  assert.deepEqual(Object.keys(GUIDE_CONFIG).sort(), [...GUIDES].sort());
  for (const page of LEARN_PAGES) assert.ok(PAYMENTS_PAGE_PATHS.includes(pagePath(page)), page);
  for (const guide of GUIDES) {
    assert.equal(guideOf(`learn/${guide}`), guide);
    const { published, modified } = GUIDE_DATES[guide];
    assert.match(published, /^\d{4}-\d{2}-\d{2}$/);
    assert.match(modified, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(modified >= published, guide);
  }
  assert.equal(guideOf('learn'), null);
  assert.equal(guideOf('learn/nope'), null);
});

test('every block a guide draws has its words, and steps are a HowTo only where the page shows them', () => {
  for (const guide of GUIDES) {
    const cfg = GUIDE_CONFIG[guide];
    const copy = guideCopy(LEARN.en, guide);
    const blocks = cfg.order.filter((k) => k !== 'steps' && k !== 'table');
    assert.deepEqual([...blocks].sort(), Object.keys(copy.sections).sort(), `${guide}: every section drawn once`);
    assert.equal(cfg.order.includes('steps'), Boolean(copy.steps), `${guide}: steps`);
    assert.equal(cfg.order.includes('table'), guide === 'stellar-vs-solana-vs-monad', `${guide}: table`);
    if (cfg.howTo) assert.ok(copy.steps && Object.keys(copy.steps.items).length >= 3, `${guide}: a HowTo needs its steps`);
    for (const key of Object.keys(cfg.mocks)) assert.ok(cfg.order.includes(key), `${guide}: mock beside ${key}`);
    for (const related of cfg.related) assert.notEqual(related, guide);
  }
});

test('every link in the guides leads somewhere, and only sources leave Cosmos Pay', () => {
  const hrefs = learnHrefs('https://dev.cosmospay.lat/docs');
  const used = new Set<string>();
  const walk = (value: unknown, at: string) => {
    if (!value || typeof value !== 'object') return;
    for (const [k, v] of Object.entries(value)) {
      if (k === 'links') for (const key of Object.keys(v as object)) used.add(`${at}:${key}`);
      else walk(v, `${at}.${k}`);
    }
  };
  walk(LEARN.en, 'en');
  assert.ok(used.size > 10);
  for (const entry of used) {
    const key = entry.split(':').at(-1) as keyof typeof hrefs;
    assert.ok(key in hrefs, `${entry} has no target`);
  }
  for (const [key, href] of Object.entries(hrefs)) {
    if (isExternal(href)) assert.ok(key.startsWith('circle'), `${key} leaves the site`);
    else assert.ok(href.startsWith('/') || href.startsWith('https://dev.cosmospay.lat/docs/'), key);
  }
  for (const guide of GUIDES) assert.ok(Object.values(hrefs).includes(pagePath(`learn/${guide}`) as never), guide);
});
