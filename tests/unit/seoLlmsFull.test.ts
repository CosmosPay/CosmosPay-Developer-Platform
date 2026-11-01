import { test } from 'node:test';
import assert from 'node:assert/strict';
import { llmsFullDocs, llmsFullTxt } from '@/lib/seo/llms-full';
import { paymentsLlmsTxt, siteLlmsTxt, type LlmsInput } from '@/lib/seo/llms';
import { indexablePages } from '@/lib/seo/indexable';
import { pageUrl } from '@/lib/seo/lang-urls';
import { ESCROW_FEE_PCT, PLAN_IDS, PLAN_SPECS, PRIVATE_PAYMENT_FEE_PCT, swapFeePct } from '@/lib/plans';
import { PAYMENTS_PAGE_PATHS } from '@/lib/payments/site-pages';
import type { MarkdownInput } from '@/lib/seo/markdown';

const ORIGINS = { site: 'https://cosmospay.lat', dev: 'https://dev.cosmospay.lat', payments: 'https://payments.cosmospay.lat' };
const INPUT: MarkdownInput = { ...ORIGINS, api: 'https://api.cosmospay.lat/cosmos-api', profiles: { X: 'https://x.com/CosmosPay' } };
const LLMS: LlmsInput = {
  ...ORIGINS,
  wallet: { webApp: 'https://cosmospay.lat/wallet/', chromeStore: 'https://chromewebstore.google.com/detail/jibiahkbhhmddnahglhffkejcfhalbgj' },
  profiles: { X: 'https://x.com/CosmosPay' },
};
const files = { site: llmsFullTxt('site', INPUT), payments: llmsFullTxt('payments', INPUT) };

test('each file opens with its H1, the summary of its llms.txt and how to read the rest', () => {
  assert.match(files.site, /^# Cosmos Pay\n\n> Cosmos Pay runs non-custodial payments/);
  assert.match(files.payments, /^# Cosmos Pay Payments\n\n> Cosmos Pay Payments lets businesses accept stablecoins/);
  assert.ok(files.site.includes('The short index is https://cosmospay.lat/llms.txt.'));
  assert.ok(files.payments.includes('the home is https://payments.cosmospay.lat/index.md'));
});

test('every indexable page of the host is there once, in sitemap order, under its title and English address', () => {
  for (const area of ['site', 'payments'] as const) {
    const pages = indexablePages(area);
    const docs = llmsFullDocs(area, INPUT);
    assert.deepEqual(
      docs.map((d) => d.url),
      pages.map((p) => pageUrl(ORIGINS[area], p.path)),
      area,
    );
    let at = 0;
    for (const doc of docs) {
      const found = files[area].indexOf(`\n## ${doc.title}\n\nURL: ${doc.url}\n\n> ${doc.description}\n\n### `, at);
      assert.ok(found > at, `${area}: ${doc.url}`);
      at = found;
    }
    assert.equal(files[area].match(/^## /gm)?.length, pages.length, `${area}: one ## per page`);
    assert.equal(files[area].match(/^URL: /gm)?.length, pages.length, `${area}: one address per page`);
  }
  assert.equal(llmsFullDocs('payments', INPUT).length, 1 + PAYMENTS_PAGE_PATHS.length);
  // The company's /swaps is canonical on the gateway, so it is the gateway's file that has it.
  assert.ok(!files.site.includes('URL: https://cosmospay.lat/swaps'));
  assert.ok(files.payments.includes('URL: https://payments.cosmospay.lat/swaps\n'));
});

test('English only, no em dash, every link absolute', () => {
  for (const [name, text] of Object.entries(files)) {
    assert.doesNotMatch(text, /—/, name);
    assert.ok(!text.includes('lang=en'), name);
    for (const line of text.split('\n').filter((l) => l.startsWith('URL: '))) assert.doesNotMatch(line, /\?lang=/, `${name}: ${line}`);
    for (const href of [...text.matchAll(/\]\(([^)]+)\)/g)].map((m) => m[1])) assert.match(href, /^(https:\/\/|mailto:)/, `${name}: ${href}`);
  }
});

test('the rates are the ones src/lib/plans.ts charges', () => {
  for (const id of PLAN_IDS) {
    const spec = PLAN_SPECS[id];
    for (const text of Object.values(files)) {
      if (spec.perTx !== 'Custom') assert.ok(text.includes(spec.perTx), id);
      assert.ok(text.includes(swapFeePct(id)), `${id} swap`);
    }
  }
  assert.ok(files.site.includes(`- **Per-transaction fee**: ${PLAN_SPECS.starter.perTx} *`));
  assert.ok(files.payments.includes(`- **Starter**: ${PLAN_SPECS.starter.perTx} per payment, ${swapFeePct('starter')} per swap`));
  for (const text of Object.values(files)) {
    assert.ok(text.includes(`${ESCROW_FEE_PCT}%`));
    assert.ok(text.includes(`${PRIVATE_PAYMENT_FEE_PCT}%`));
  }
});

test('escrow is offered at its price, and every mention says it is coming soon', () => {
  for (const [name, text] of Object.entries(files)) {
    const lines = text.split('\n');
    const named = lines.map((line, i) => ({ line, i })).filter(({ line }) => /escrow/i.test(line.replace(/Escrow\.com/g, '')));
    assert.ok(named.length > 0, name);
    for (const { line, i } of named) {
      const next = lines.slice(i + 1).find((l) => l.trim() !== '') ?? '';
      // The escrow question's answer opens with the label.
      assert.ok(/coming soon/i.test(line) || (/^#+ /.test(line) && /coming soon/i.test(next)), `${name}: ${line}`);
    }
  }
});

test('each llms.txt points at its llms-full.txt and at the Markdown version of its pages', () => {
  const site = siteLlmsTxt(LLMS);
  const payments = paymentsLlmsTxt(LLMS);
  assert.ok(site.includes('(https://cosmospay.lat/llms-full.txt)'));
  assert.ok(site.includes('https://cosmospay.lat/pricing.md') && site.includes('https://cosmospay.lat/index.md') && site.includes('https://cosmospay.lat/pricing.md?lang=es'));
  assert.ok(payments.includes('(https://payments.cosmospay.lat/llms-full.txt)'));
  assert.ok(payments.includes('https://payments.cosmospay.lat/faq.md') && payments.includes('https://payments.cosmospay.lat/index.md'));
});
