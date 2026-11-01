import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CATALOG_FILES,
  catalogBlockDates,
  catalogLinePaths,
  dayOf,
  gitIsoDate,
  longDate,
  newestDate,
  pageModified,
  parseBlame,
  paymentsSources,
  siteSources,
  statedDate,
  type DateInput,
} from '@/lib/seo/page-dates';
import { GUIDES, GUIDE_DATES, PAYMENTS_PAGE_PATHS } from '@/lib/payments/site-pages';
import { TOS_LAST_UPDATED } from '@/lib/seo/site-meta';
import fs from 'node:fs';
import path from 'node:path';

const LANGS = ['en', 'es', 'pt', 'fr', 'de', 'hi', 'zh'];
const BUILT = '2026-11-01T12:00:00.000Z';
const LANDING = 'src/lib/payments/landing-i18n.ts';

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

test('newestDate reads a catalog by its blocks: the block named and the ones under it, never its siblings', () => {
  const blocks = {
    [LANDING]: {
      'en.faq': '2026-10-02T10:00:00Z',
      'en.faq.escrow': '2026-10-20T10:00:00Z',
      'en.faqs': '2026-10-29T10:00:00Z',
      'en.pages.faq': '2026-10-10T10:00:00Z',
      'en.pages.fees': '2026-10-30T10:00:00Z',
      'es.faq': '2026-10-31T10:00:00Z',
    },
  };
  assert.equal(newestDate([`${LANDING}#en.faq`], {}, blocks), '2026-10-20T10:00:00Z');
  assert.equal(newestDate([`${LANDING}#en.pages.faq`], {}, blocks), '2026-10-10T10:00:00Z');
  assert.equal(newestDate([`${LANDING}#es.faq`], {}, blocks), '2026-10-31T10:00:00Z');
  assert.equal(newestDate([`${LANDING}#fr.faq`], {}, blocks), null);
  // The whole file's date is never a block's: a change to another page's copy dates nothing here.
  assert.equal(newestDate([`${LANDING}#en.faq`], { [LANDING]: '2026-11-01T10:00:00Z' }, blocks), '2026-10-20T10:00:00Z');
  assert.equal(newestDate([LANDING], { [LANDING]: '2026-11-01T10:00:00Z' }, blocks), '2026-11-01T10:00:00Z');
});

test('catalogLinePaths files each line under its keys, two levels deep, and skips comments and code', () => {
  const lines = [
    '/* A catalog. */',
    'import type { X } from "@/x";',
    '',
    'const en = {',
    '  meta: {',
    '    title: "Title",',
    '    description:',
    '      "Long text: with a colon",',
    '  },',
    '  // A note on the next key.',
    '  code: { copy: "Copy", copied: "Copied" },',
    '  /* The label beside escrow',
    '     wherever it shows. */',
    '  soon: "Coming soon",',
    '  pages: {',
    '    faq: { nav: "FAQ", title: "Questions" },',
    '    notes: [',
    '      "No monthly fee: none",',
    '    ],',
    '    "use-cases": {',
    '      deep: { a: "b" },',
    '    },',
    '  },',
    '};',
    'export type Messages = typeof en;',
    '',
    'const es: Messages = {',
    '  meta: { title: "Título" },',
    '};',
    'export default {',
    '  about: {',
    '    hero: "Hola",',
    '  },',
    '};',
    'export function f() {',
    '  return 1;',
    '}',
  ];
  assert.deepEqual(catalogLinePaths(lines), [
    null,
    null,
    null,
    null,
    'en.meta',
    'en.meta.title',
    'en.meta.description',
    'en.meta.description',
    'en.meta.description',
    null,
    'en.code',
    null,
    null,
    'en.soon',
    'en.pages',
    'en.pages.faq',
    'en.pages.notes',
    'en.pages.notes',
    'en.pages.notes',
    'en.pages.use-cases',
    'en.pages.use-cases',
    'en.pages.use-cases',
    'en.pages.use-cases',
    null,
    null,
    null,
    null,
    'es.meta',
    null,
    null,
    'default.about',
    'default.about.hero',
    'default.about.hero',
    null,
    null,
    null,
    null,
  ]);
  // CRLF checkouts read the same.
  assert.deepEqual(catalogLinePaths(['const en = {\r', '  faq: {\r', '    q: "x",\r', '  },\r', '};\r']), [null, 'en.faq', 'en.faq.q', 'en.faq.q', null]);
});

test('catalogBlockDates keeps the newest date of each block and ignores lines git does not date', () => {
  const lines = ['const en = {', '  faq: {', '    a: "1",', '    b: "2",', '  },', '  hero: "x",', '};'];
  const dates = [null, '2026-10-01T00:00:00Z', '2026-10-05T00:00:00Z', null, '2026-10-02T00:00:00Z', '2026-09-01T00:00:00Z', null];
  assert.deepEqual(catalogBlockDates(lines, dates), {
    'en.faq': '2026-10-01T00:00:00Z',
    'en.faq.a': '2026-10-05T00:00:00Z',
    'en.faq.b': '2026-10-02T00:00:00Z',
    'en.hero': '2026-09-01T00:00:00Z',
  });
});

test('parseBlame reads git blame --porcelain: each line with its commit date, in the commit zone', () => {
  const a = '1'.repeat(40);
  const b = '2'.repeat(40);
  const none = '0'.repeat(40);
  const porcelain = [
    `${a} 1 1 2`,
    'author A',
    'committer-time 1761960584',
    'committer-tz -0300',
    'filename x.ts',
    '\tconst en = {',
    `${a} 2 2`,
    '\t  faq: {',
    `${b} 3 3 1`,
    'committer-time 1761000000',
    'committer-tz +0000',
    'filename x.ts',
    '\t    q: "x",\r',
    `${none} 4 4 1`,
    'committer-time 1761999999',
    'committer-tz +0000',
    'filename x.ts',
    '\t  },',
    '',
  ].join('\n');
  const { lines, dates } = parseBlame(porcelain);
  assert.deepEqual(lines, ['const en = {', '  faq: {', '    q: "x",', '  },']);
  assert.deepEqual(dates, ['2025-10-31T22:29:44-03:00', '2025-10-31T22:29:44-03:00', '2025-10-20T22:40:00+00:00', null]);
  assert.equal(gitIsoDate(1761960584, '+0530'), '2025-11-01T06:59:44+05:30');
});

test('every indexable page has its own sources, which exist, and none is a whole shared catalog', () => {
  const root = process.cwd();
  const blocksOf = new Map<string, Set<string>>();
  const blocks = (file: string) => {
    if (!blocksOf.has(file)) {
      const lines = fs.readFileSync(path.join(root, file), 'utf8').split('\n');
      blocksOf.set(file, new Set(catalogLinePaths(lines).filter((p): p is string => !!p)));
    }
    return blocksOf.get(file)!;
  };
  const check = (sources: string[] | null, label: string) => {
    assert.ok(sources && sources.length > 0, label);
    for (const source of sources) {
      const [file, block] = source.split('#');
      assert.ok(fs.existsSync(path.join(root, file)), `${label}: ${source}`);
      if (CATALOG_FILES.includes(file)) assert.ok(block, `${label}: ${file} counts by its blocks, never whole`);
      if (block) {
        assert.ok(CATALOG_FILES.includes(file), `${label}: ${file} is not dated by blocks`);
        assert.ok([...blocks(file)].some((p) => p === block || p.startsWith(`${block}.`)), `${label}: no block ${source}`);
      }
      // Shared parts every gateway page draws are not a page's own source.
      for (const shared of ['src/components/payments/landing/data.ts', 'src/lib/payments/landing-content.ts', 'src/components/payments/landing/PageHeader.astro', 'src/components/payments/landing/sections/', 'src/lib/seo/site-meta.ts']) {
        assert.notEqual(file, shared, `${label}: ${shared} is shared`);
      }
    }
  };
  for (const lang of LANGS) {
    for (const p of ['/', '/pricing', '/about', '/swaps', '/tos']) check(siteSources(p, lang), `site ${p} ${lang}`);
    for (const p of ['/', ...PAYMENTS_PAGE_PATHS]) check(paymentsSources(p, lang), `payments ${p} ${lang}`);
  }
  assert.equal(siteSources('/nope', 'en'), null);
  assert.equal(paymentsSources('/pay', 'en'), null);
  // Each language version follows its own copy, and only the page's blocks of it.
  assert.ok(siteSources('/about', 'es')?.includes('src/lib/i18n/messages/es.ts#default.about'));
  assert.ok(!siteSources('/about', 'es')?.some((s) => s.startsWith('src/lib/i18n/messages/en.ts')));
  assert.deepEqual(
    paymentsSources('/faq', 'fr')?.filter((s) => s.includes('#')),
    [`${LANDING}#fr.pages.faq`, `${LANDING}#fr.faq`],
  );
  assert.ok(paymentsSources('/stellar', 'en')?.includes(`${LANDING}#en.networks.stellar`));
  assert.ok(!paymentsSources('/stellar', 'en')?.includes(`${LANDING}#en.networks.solana`));
});

test('a date the page states wins: the terms and each guide', () => {
  assert.equal(statedDate('site', '/tos'), TOS_LAST_UPDATED);
  assert.equal(statedDate('site', '/about'), null);
  for (const g of GUIDES) assert.equal(statedDate('payments', `/learn/${g}`), GUIDE_DATES[g].modified, g);
  assert.equal(statedDate('payments', '/learn'), null, 'the hub states none');
  assert.equal(statedDate('payments', '/faq'), null);
});

test('pageModified: stated date, else the newest commit among its own sources, else the build', () => {
  const input: DateInput = {
    built: BUILT,
    dates: {
      'src/pages/site/about.astro': '2026-10-30T10:00:00Z',
      // A whole catalog's last commit is another page's change: it dates nothing by itself.
      [LANDING]: '2026-11-01T08:00:00Z',
      'src/lib/i18n/messages/fr.ts': '2026-11-01T08:00:00Z',
      'src/components/payments/landing/StructuredData.astro': '2026-11-01T09:00:00Z',
      'src/components/payments/landing/sections/FinalCta.astro': '2026-11-01T09:30:00Z',
      'src/pages/payments/compare.astro': '2026-09-01T10:00:00Z',
      'src/lib/payments/compare.ts': '2026-10-27T10:00:00Z',
      'src/components/payments/landing/sections/Faq.astro': '2026-10-12T10:00:00Z',
    },
    blocks: {
      'src/lib/i18n/messages/fr.ts': { 'default.about': '2026-10-31T10:00:00Z', 'default.dash': '2026-11-01T08:00:00Z' },
      [LANDING]: { 'en.faq.escrow': '2026-10-20T10:00:00Z', 'en.pages.fees': '2026-11-01T08:00:00Z', 'es.pages.faq': '2026-10-25T10:00:00Z' },
    },
  };
  assert.equal(pageModified('site', '/about', 'en', input), '2026-10-30T10:00:00Z');
  assert.equal(pageModified('site', '/about', 'fr', input), '2026-10-31T10:00:00Z', 'its French copy, not the dashboard strings beside it');
  assert.equal(pageModified('site', '/tos', 'es', input), TOS_LAST_UPDATED);
  assert.equal(pageModified('payments', '/compare', 'en', input), '2026-10-27T10:00:00Z', 'the rates it compares are its content');
  assert.equal(pageModified('payments', '/faq', 'en', input), '2026-10-20T10:00:00Z', 'its questions, not another page\'s copy or the final call');
  assert.equal(pageModified('payments', '/faq', 'es', input), '2026-10-25T10:00:00Z');
  assert.equal(pageModified('payments', '/security', 'en', input), BUILT, 'nothing known: the build');
  assert.equal(pageModified('payments', '/learn/accept-usdc-payments', 'en', input), GUIDE_DATES['accept-usdc-payments'].modified);
  assert.equal(pageModified('payments', '/pay', 'en', input), null);
  // The hub lists the guides: the newest guide's date when its own sources are older.
  const newestGuide = Object.values(GUIDE_DATES).map((d) => d.modified).sort().at(-1);
  assert.equal(pageModified('payments', '/learn', 'en', { ...input, dates: { 'src/pages/payments/learn/index.astro': '2026-01-01T00:00:00Z' } }), newestGuide);
});

test('a visible date is the day the ISO date names, in the reader\'s language', () => {
  assert.equal(dayOf('2026-11-01T02:29:44-03:00'), '2026-11-01');
  assert.equal(dayOf('2026-11-01'), '2026-11-01');
  assert.equal(longDate('2026-11-01T02:29:44-03:00', 'en'), 'November 1, 2026');
  assert.equal(longDate('2026-11-01T23:59:00-03:00', 'es'), '1 de noviembre de 2026');
  for (const lang of LANGS) assert.match(longDate('2026-10-31T10:00:00Z', lang), /2026/, lang);
});
