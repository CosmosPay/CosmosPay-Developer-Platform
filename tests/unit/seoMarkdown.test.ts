import { test } from 'node:test';
import assert from 'node:assert/strict';
import { markdownAlternate, markdownLanguages, markdownOwners, markdownPath, markdownUrl, pageOfMarkdown, prefersMarkdown } from '@/lib/seo/markdown-urls';
import { AREA_LANGS, markdownHeaders, markdownRequest, pageDoc, pageMarkdown, versionLang } from '@/lib/seo/page-markdown';
import { renderBlocks, type MarkdownInput } from '@/lib/seo/markdown';
import { indexablePages } from '@/lib/seo/indexable';
import { pageUrl } from '@/lib/seo/lang-urls';
import { ESCROW_FEE_PCT, PLAN_IDS, PLAN_SPECS, PRIVATE_PAYMENT_FEE_PCT, swapFeePct } from '@/lib/plans';
import { LANDING } from '@/lib/payments/landing-i18n';
import { LEARN, guideCopy } from '@/lib/payments/learn/index';
import { GUIDES, PAYMENTS_PAGE_PATHS } from '@/lib/payments/site-pages';
import { messages } from '@/lib/i18n/messages/index';
import { NETWORK_IDS } from '@/lib/chains';
import { isSlashlessDocsLink } from '@/lib/urls';

const INPUT: MarkdownInput = {
  site: 'https://cosmospay.lat',
  dev: 'https://dev.cosmospay.lat',
  payments: 'https://payments.cosmospay.lat',
  api: 'https://api.cosmospay.lat/cosmos-api',
  profiles: { X: 'https://x.com/CosmosPay', LinkedIn: 'https://www.linkedin.com/company/cosmospay/' },
};
const AREAS = ['site', 'payments'] as const;

/* Every page of both hosts in every language it is written in, rendered once. */
const ALL = AREAS.flatMap((area) =>
  indexablePages(area).flatMap((page) =>
    page.langs.map((lang) => ({ area, path: page.path, lang, md: pageMarkdown(area, page.path, lang, INPUT) ?? '' })),
  ),
);
const md = (area: 'site' | 'payments', path: string, lang = 'en'): string => {
  const found = ALL.find((x) => x.area === area && x.path === path && x.lang === lang)?.md;
  assert.ok(found, `${area} ${path} ${lang}`);
  return found;
};

test('the Markdown address of a page is its address with .md, the home /index.md, one per language', () => {
  assert.equal(markdownPath('/'), '/index.md');
  assert.equal(markdownPath('/pricing'), '/pricing.md');
  assert.equal(markdownPath('/learn/accept-usdc-payments'), '/learn/accept-usdc-payments.md');
  assert.equal(pageOfMarkdown('/index.md'), '/');
  assert.equal(pageOfMarkdown('/pricing.md'), '/pricing');
  assert.equal(pageOfMarkdown('/learn/accept-usdc-payments.md'), '/learn/accept-usdc-payments');
  for (const path of ['/pricing', '/.md', '/learn/index.md', '/learn/.md', '/pricing.md.txt', 'pricing.md']) assert.equal(pageOfMarkdown(path), null, path);
  assert.equal(markdownUrl('https://cosmospay.lat', '/pricing', 'es'), 'https://cosmospay.lat/pricing.md?lang=es');
  assert.equal(markdownUrl('https://cosmospay.lat', '/pricing', 'en'), 'https://cosmospay.lat/pricing.md');
  assert.equal(markdownAlternate('https://payments.cosmospay.lat/?lang=pt'), 'https://payments.cosmospay.lat/index.md?lang=pt');
  assert.equal(markdownAlternate('https://payments.cosmospay.lat/faq'), 'https://payments.cosmospay.lat/faq.md');
});

test('every indexable page has a Markdown version on its own host, and nothing else does', () => {
  for (const area of AREAS) {
    for (const page of indexablePages(area)) {
      const langs = markdownLanguages(area, page.path);
      assert.notEqual(langs, undefined, `${area} ${page.path}`);
      assert.deepEqual(langs ?? AREA_LANGS[area], page.langs, `${area} ${page.path}`);
      assert.ok(markdownOwners(page.path).includes(area), page.path);
    }
  }
  // The company's /swaps is canonical on the gateway: its Markdown is the gateway's.
  assert.equal(markdownLanguages('site', '/swaps'), undefined);
  assert.deepEqual(markdownOwners('/swaps'), ['payments']);
  assert.deepEqual(markdownOwners('/'), ['site', 'payments']);
  assert.deepEqual(markdownLanguages('site', '/tos'), ['en', 'es']);
  for (const path of ['/pay', '/contact', '/cmh4x2k9a0001l70g8v5q3z2w', '/preview/classic', '/nope']) assert.deepEqual(markdownOwners(path), [], path);
});

test('only an Accept that names text/markdown at least as high as HTML gets the Markdown in place', () => {
  for (const accept of [
    'text/markdown',
    'text/markdown, text/html;q=0.9, */*;q=0.8',
    'text/markdown, text/html, */*',
    'text/plain, text/markdown;q=0.9, text/*;q=0.5',
    'TEXT/MARKDOWN; charset=utf-8',
  ]) {
    assert.ok(prefersMarkdown(accept), accept);
  }
  for (const accept of [
    null,
    '',
    '*/*',
    'text/*',
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'text/html, text/markdown;q=0.5',
    'text/markdown;q=0',
    'application/json',
  ]) {
    assert.ok(!prefersMarkdown(accept), String(accept));
  }
});

test('every page in every language it is written in is a document: its title, its address, its sections', () => {
  for (const { area, path, lang, md: text } of ALL) {
    const doc = pageDoc(area, path, lang, INPUT);
    assert.ok(doc && text, `${area} ${path} ${lang}`);
    assert.equal(doc.url, pageUrl(INPUT[area], path, lang), `${area} ${path} ${lang}`);
    assert.ok(text.startsWith(`# ${doc.title}\n\nURL: ${doc.url}\n\n> `), `${area} ${path} ${lang}`);
    assert.equal(text.match(/^## /gm)?.length, 1, `${area} ${path} ${lang}: one h1 for the page`);
    assert.ok(text.split('\n').filter((l) => /^#{3,6} /.test(l)).length >= 1, `${area} ${path} ${lang}: sections`);
    assert.ok(!/^#{7,}/m.test(text), `${area} ${path} ${lang}: heading depth`);
    assert.doesNotMatch(text, /—/, `${area} ${path} ${lang}: no em dash`);
    assert.doesNotMatch(text, /\{\w+\}/, `${area} ${path} ${lang}: no placeholder left`);
    assert.doesNotMatch(text, /undefined|\[object Object\]/, `${area} ${path} ${lang}`);
  }
  // 4 company pages (/tos in two languages) and every gateway page in seven.
  assert.equal(ALL.length, 3 * 7 + 2 + (1 + PAYMENTS_PAGE_PATHS.length) * 7);
  // A language a page is not written in has no document of its own.
  assert.equal(pageDoc('site', '/tos', 'fr', INPUT), null);
  assert.equal(pageDoc('site', '/swaps', 'en', INPUT), null);
  assert.equal(pageDoc('payments', '/pay', 'en', INPUT), null);
});

test('links are absolute, and a page in another language links the pages in that language', () => {
  for (const { area, path, lang, md: text } of ALL) {
    const links = [...text.matchAll(/\]\(([^)]+)\)/g)].map((m) => m[1]);
    // The terms are text only.
    if (path !== '/tos') assert.ok(links.length > 0, `${area} ${path} ${lang}`);
    for (const href of links) assert.match(href, /^(https:\/\/|mailto:)/, `${area} ${path} ${lang}: ${href}`);
    assert.ok(!text.includes('lang=en'), `${area} ${path} ${lang}: English has no ?lang=`);
  }
  assert.ok(md('payments', '/', 'es').includes('(https://payments.cosmospay.lat/faq?lang=es)'));
  assert.ok(md('payments', '/fees', 'pt').includes('(https://cosmospay.lat/pricing?lang=pt)'));
  assert.ok(md('site', '/about', 'de').includes('(https://payments.cosmospay.lat/stellar?lang=de)'));
  // An English page links the bare addresses.
  assert.ok(md('payments', '/', 'en').includes('(https://payments.cosmospay.lat/faq)'));
});

test('/faq, /compare and the network pages say when they last changed, as the page does under its lede', () => {
  const dated: MarkdownInput = { ...INPUT, modified: (area, path) => (area === 'payments' && path !== '/fees' ? '2026-10-31T21:08:08-03:00' : null) };
  for (const path of ['/faq', '/compare', '/stellar', '/solana', '/monad']) {
    const en = pageMarkdown('payments', path, 'en', dated) ?? '';
    assert.match(en, /\n\nUpdated October 31, 2026\n\n/, path);
    // Right under the lede: the page's h1 (a level down in the document), its lede, then the date.
    const blocks = en.split('\n\n');
    assert.equal(blocks.findIndex((b) => b.startsWith('Updated ')), blocks.findIndex((b) => b.startsWith('## ')) + 2, path);
    for (const lang of ['es', 'pt', 'fr', 'de', 'hi', 'zh']) {
      const text = pageMarkdown('payments', path, lang, dated) ?? '';
      assert.ok(text.includes(LANDING[lang as keyof typeof LANDING].pages.updated.replace('{date}', new Intl.DateTimeFormat(lang, { dateStyle: 'long', timeZone: 'UTC' }).format(new Date('2026-10-31T00:00:00Z')))), `${path} ${lang}`);
    }
  }
  // Other pages show no date, and without the dates nothing is said.
  assert.doesNotMatch(pageMarkdown('payments', '/security', 'en', dated) ?? '', /Updated /);
  assert.doesNotMatch(md('payments', '/faq'), /Updated /);
});

test('every link to the docs names its page with the trailing slash (a slashless one is a 301)', () => {
  let docsLinks = 0;
  for (const { area, path, lang, md: text } of ALL) {
    for (const [, href] of text.matchAll(/\]\(([^)]+)\)/g)) {
      if (!href.startsWith(`${INPUT.dev}/docs`)) continue;
      docsLinks++;
      assert.ok(!isSlashlessDocsLink(href, `${INPUT.dev}/docs/`), `${area} ${path} ${lang}: ${href}`);
    }
  }
  assert.ok(docsLinks > 50, `only ${docsLinks} docs links checked`);
  assert.ok(md('site', '/about').includes('(https://dev.cosmospay.lat/docs/)'));
  assert.ok(md('payments', '/stellar').includes('(https://dev.cosmospay.lat/docs/api/payment-intents/)'));
  assert.ok(md('payments', '/integrations').includes('(https://dev.cosmospay.lat/docs/embed/)'));
});

test('the plans and every service rate come from src/lib/plans.ts', () => {
  const pricing = md('site', '/pricing');
  for (const [i, id] of PLAN_IDS.entries()) {
    const spec = PLAN_SPECS[id];
    if (i < 3) assert.ok(pricing.includes(`- **Per-transaction fee**: ${spec.perTx} *`), id);
    assert.ok(pricing.includes(`- **Swap commission**: ${swapFeePct(id)}`), `${id} swap`);
    const monthly = /^\$(\d+)\/mo$/.exec(spec.price)?.[1];
    if (monthly) assert.ok(pricing.includes(`- **Monthly fee**: $${monthly}/mo`), `${id} monthly`);
  }
  assert.ok(pricing.includes(`| Per-transaction fee | ${PLAN_IDS.map((id) => (PLAN_SPECS[id].perTx === 'Custom' ? 'Custom' : PLAN_SPECS[id].perTx)).join(' | ')} |`));
  assert.ok(pricing.includes(`| Swap commission | ${PLAN_IDS.map((id) => swapFeePct(id)).join(' | ')} |`));
  assert.ok(pricing.includes(`+${ESCROW_FEE_PCT}%`) && pricing.includes(`${PRIVATE_PAYMENT_FEE_PCT}%`));
  assert.ok(pricing.includes(`and its API charge ${swapFeePct('community')}`), 'the FAQ quotes the public rate');
  for (const lang of AREA_LANGS.payments) {
    const fees = md('payments', '/fees', lang);
    for (const id of PLAN_IDS) {
      const spec = PLAN_SPECS[id];
      assert.ok(spec.perTx === 'Custom' || fees.includes(spec.perTx), `${lang} ${id}`);
      assert.ok(fees.includes(swapFeePct(id)), `${lang} ${id} swap`);
    }
  }
  const stats = md('site', '/');
  assert.ok(stats.includes(`- ${PLAN_SPECS.starter.perTx.split(' + ')[0]} + ${PLAN_SPECS.starter.perTx.split(' + ')[1]} per payment on Starter`));
  assert.ok(stats.includes(`- ${NETWORK_IDS.length} networks to swap between`));
});

test('escrow is named only beside its "coming soon", in every language', () => {
  const ESCROW = /escrow|एस्क्रो|担保/i;
  for (const { area, path, lang, md: text } of ALL) {
    const labels = [LANDING[lang as keyof typeof LANDING].soon, messages[lang as keyof typeof messages].pricing.soon].map((l) => l.toLowerCase());
    const lines = text.split('\n');
    lines.forEach((line, i) => {
      if (!ESCROW.test(line.replace(/Escrow\.com/g, ''))) return;
      // A question whose answer opens with the label (the escrow FAQ) counts as labelled.
      const next = lines.slice(i + 1).find((l) => l.trim() !== '') ?? '';
      const labelled = (l: string) => labels.some((label) => l.toLowerCase().includes(label));
      assert.ok(labelled(line) || (/^#+ /.test(line) && labelled(next)), `${area} ${path} ${lang}: ${line}`);
    });
  }
});

test('each page carries what its page shows: every question, fact and guide, in order', () => {
  for (const lang of AREA_LANGS.payments) {
    const t = LANDING[lang as keyof typeof LANDING];
    const faq = md('payments', '/faq', lang);
    let at = 0;
    for (const key of ['what', 'wallet', 'account', 'wallets', 'assets', 'custody', 'service', 'escrow', 'zk', 'expiry', 'refunds', 'testing', 'designs'] as const) {
      const found = faq.indexOf(`### ${t.faq[key].q}\n\n${t.faq[key].a}`, at);
      assert.ok(found > at, `${lang} faq ${key}`);
      at = found;
    }
    const keys = Object.keys(t.faq).filter((k) => k !== 'title' && k !== 'titleBold');
    assert.equal(keys.length, 13, 'a new question needs its place in landing-content.ts');
    const security = md('payments', '/security', lang);
    for (const key of ['onchain', 'keys', 'framing', 'environments', 'expiry', 'docs'] as const) assert.ok(security.includes(t.security[key].title), `${lang} ${key}`);
    const hub = md('payments', '/learn', lang);
    for (const guide of GUIDES) assert.ok(hub.includes(guideCopy(LEARN[lang as keyof typeof LEARN], guide).title), `${lang} ${guide}`);
  }
  const home = md('payments', '/');
  for (const name of ['Pollar', 'Freighter', 'Phantom', 'EURC', 'USDT0']) assert.ok(home.includes(name), name);
  const stellar = md('payments', '/stellar');
  assert.match(stellar, /curl https:\/\/api\.cosmospay\.lat\/cosmos-api\/v1\/payment-intents\/pay/);
  assert.ok(stellar.includes('GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN'), 'the USDC preset, from stellar-assets.ts');
  const swaps = md('payments', '/swaps');
  assert.ok(swaps.includes('curl "https://api.cosmospay.lat/cosmos-api/v1/public-key?env=prod"'));
  assert.ok(swaps.includes(`${NETWORK_IDS.length} networks`));
  const terms = md('site', '/tos', 'es');
  assert.ok(terms.includes('## Términos y Condiciones de Uso') && terms.includes('Última actualización: 2026-10-09'));
  const about = md('site', '/about');
  assert.ok(about.includes('[X](https://x.com/CosmosPay)') && about.includes('Cosmos Network (ATOM)'));
});

test('a Markdown address answers its version, or a 301 to its one address', () => {
  const ask = (area: 'site' | 'payments', path: string, search = '') => markdownRequest(area, path, search, INPUT[area], INPUT);
  const doc = (answer: ReturnType<typeof ask>) => {
    assert.equal(answer.kind, 'doc');
    return answer.kind === 'doc' ? answer.doc : null;
  };
  assert.equal(doc(ask('site', '/pricing.md'))?.lang, 'en');
  assert.equal(doc(ask('site', '/pricing.md', '?lang=es'))?.lang, 'es');
  assert.equal(doc(ask('payments', '/index.md', '?lang=zh'))?.url, 'https://payments.cosmospay.lat/?lang=zh');
  assert.equal(doc(ask('payments', '/learn/accept-usdc-payments.md', '?lang=hi'))?.lang, 'hi');
  const answer = ask('site', '/pricing.md');
  assert.ok(answer.kind === 'doc' && answer.markdown.startsWith('# Plans and pricing | Cosmos Pay\n\nURL: https://cosmospay.lat/pricing\n'));
  assert.deepEqual(ask('site', '/pricing.md', '?lang=en'), { kind: 'redirect', location: 'https://cosmospay.lat/pricing.md' });
  assert.deepEqual(ask('site', '/pricing.md', '?lang=ES'), { kind: 'redirect', location: 'https://cosmospay.lat/pricing.md?lang=es' });
  assert.deepEqual(ask('site', '/pricing.md', '?lang=xx'), { kind: 'redirect', location: 'https://cosmospay.lat/pricing.md' });
  assert.deepEqual(ask('site', '/tos.md', '?lang=fr'), { kind: 'redirect', location: 'https://cosmospay.lat/tos.md' });
  assert.equal(doc(ask('site', '/tos.md', '?lang=es'))?.lang, 'es');
  assert.deepEqual(ask('payments', '/FAQ.md', '?lang=de'), { kind: 'redirect', location: 'https://payments.cosmospay.lat/faq.md?lang=de' });
  for (const [area, path] of [['site', '/swaps.md'], ['site', '/faq.md'], ['payments', '/pricing.md'], ['payments', '/learn/index.md'], ['payments', '/pay.md'], ['site', '/index']] as const) {
    assert.deepEqual(ask(area, path), { kind: 'not-found' }, `${area} ${path}`);
  }
  assert.equal(versionLang('site', '/tos', '?lang=fr'), 'en');
  assert.equal(versionLang('payments', '/faq', '?lang=fr'), 'fr');
  const pricing = doc(ask('site', '/pricing.md', '?lang=es'));
  assert.ok(pricing);
  assert.deepEqual(markdownHeaders(pricing), {
    'Content-Type': 'text/markdown; charset=utf-8',
    'Content-Language': 'es',
    Link: '<https://cosmospay.lat/pricing?lang=es>; rel="canonical"',
    'X-Content-Type-Options': 'nosniff',
  });
});

test('the renderer keeps copy as text: headings by depth, escaped starts, tables and fences', () => {
  const out = renderBlocks(
    [
      { kind: 'h', level: 1, text: '1. Who we are' },
      { kind: 'p', text: '+ 18¢ per transaction *' },
      { kind: 'ul', items: ['- a dash', 'plain'] },
      { kind: 'table', head: ['a|b', ''], rows: [['x\ny', 'z']] },
      { kind: 'code', code: 'const a = "```";\n', lang: 'ts' },
      { kind: 'ul', items: [] },
      { kind: 'h', level: 9, text: 'deep' },
    ],
    2,
  );
  assert.equal(
    out,
    ['## 1. Who we are', '\\+ 18¢ per transaction *', '- \\- a dash\n- plain', '| a\\|b | - |\n| --- | --- |\n| x y | z |', '````ts\nconst a = "```";\n````', '###### deep'].join('\n\n'),
  );
});
