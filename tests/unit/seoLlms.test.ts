import { test } from 'node:test';
import assert from 'node:assert/strict';
import { paymentsLlmsTxt, siteLlmsTxt, type LlmsInput } from '@/lib/seo/llms';
import { ESCROW_FEE_PCT, PLAN_IDS, PLAN_SPECS, PRIVATE_PAYMENT_FEE_PCT, swapFeePct } from '@/lib/plans';
import { PAYMENTS_PAGE_PATHS } from '@/lib/payments/site-pages';

const INPUT: LlmsInput = {
  site: 'https://cosmospay.lat',
  dev: 'https://dev.cosmospay.lat',
  payments: 'https://payments.cosmospay.lat',
  wallet: { webApp: 'https://cosmospay.lat/wallet/', chromeStore: 'https://chromewebstore.google.com/detail/x/jibiahkbhhmddnahglhffkejcfhalbgj' },
  profiles: { LinkedIn: 'https://www.linkedin.com/company/cosmospay/', X: 'https://x.com/CosmosPay' },
};

const files = { site: siteLlmsTxt(INPUT), payments: paymentsLlmsTxt(INPUT) };

test('each file opens with its H1 and a one-paragraph summary (llmstxt.org)', () => {
  assert.match(files.site, /^# Cosmos Pay\n\n> \S/);
  assert.match(files.payments, /^# Cosmos Pay Payments\n\n> \S/);
});

test('links are absolute Markdown links, and nothing uses an em dash', () => {
  for (const [name, text] of Object.entries(files)) {
    assert.doesNotMatch(text, /—/, name);
    const links = [...text.matchAll(/\]\(([^)]+)\)/g)].map((m) => m[1]);
    assert.ok(links.length > 10, name);
    for (const href of links) assert.match(href, /^https:\/\//, `${name}: ${href}`);
  }
});

test('the rates are the ones src/lib/plans.ts charges', () => {
  for (const id of PLAN_IDS) {
    assert.ok(files.site.includes(PLAN_SPECS[id].perTx === 'Custom' ? 'Enterprise custom' : PLAN_SPECS[id].perTx), id);
    assert.ok(files.site.includes(swapFeePct(id)), `${id} swap`);
  }
  assert.ok(files.site.includes('Starter 1.5% + 18¢ with no monthly fee'));
  assert.ok(files.site.includes('Essentials 1.12% + 18¢ and $33 per month'));
  for (const text of Object.values(files)) {
    assert.ok(text.includes(`${ESCROW_FEE_PCT}%`));
    assert.ok(text.includes(`${PRIVATE_PAYMENT_FEE_PCT}%`));
  }
});

test('the gateway file links every content page, in English, and its other languages', () => {
  for (const path of PAYMENTS_PAGE_PATHS) assert.ok(files.payments.includes(`https://payments.cosmospay.lat${path}?lang=en`), path);
  for (const lang of ['es', 'pt', 'fr', 'de', 'hi', 'zh']) assert.ok(files.payments.includes(`https://payments.cosmospay.lat/?lang=${lang}`), lang);
});

test('the company file points developers at the docs, the OpenAPI document and the SDK', () => {
  for (const url of [
    'https://dev.cosmospay.lat/docs/llms.txt',
    'https://dev.cosmospay.lat/docs/openapi.json',
    'https://dev.cosmospay.lat/docs/api/',
    'https://www.npmjs.com/package/@cosmosapp/pay_sdk',
    'https://cosmospay.lat/.well-known/api-catalog',
  ]) {
    assert.ok(files.site.includes(url), url);
  }
});
