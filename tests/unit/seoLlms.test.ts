import { test } from 'node:test';
import assert from 'node:assert/strict';
import { paymentsLlmsTxt, siteLlmsTxt, type LlmsInput } from '@/lib/seo/llms';
import { ESCROW_FEE_PCT, PLAN_IDS, PLAN_SPECS, PRIVATE_PAYMENT_FEE_PCT, swapFeePct } from '@/lib/plans';
import { PAYMENTS_PAGE_PATHS } from '@/lib/payments/site-pages';
import { NETWORK_IDS } from '@/lib/chains';
import { isSlashlessDocsLink } from '@/lib/urls';

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
    // A docs page is linked at its trailing-slash address: the slashless one is a 301.
    for (const href of links) assert.ok(!isSlashlessDocsLink(href, `${INPUT.dev}/docs/`), `${name}: ${href}`);
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

test('the gateway file links every content page at its English (bare) address, and its other languages', () => {
  for (const path of PAYMENTS_PAGE_PATHS) assert.ok(files.payments.includes(`(https://payments.cosmospay.lat${path})`), path);
  for (const lang of ['es', 'pt', 'fr', 'de', 'hi', 'zh']) assert.ok(files.payments.includes(`https://payments.cosmospay.lat/?lang=${lang}`), lang);
  for (const [name, text] of Object.entries(files)) assert.ok(!text.includes('lang=en'), `${name}: English has no ?lang=`);
});

test('the custody facts hold for every service, and the networks count is the computed one', () => {
  for (const text of Object.values(files)) {
    assert.match(text, /on Monad each payment goes to a deposit address made for it, which can only forward it/);
    assert.match(text, /Cosmos Pay holds no key to it/);
    assert.doesNotMatch(text, /nobody holds|never pass through/i);
  }
  assert.match(files.site, /a swap between networks waits at a NEAR Intents deposit address/);
  assert.ok(files.site.includes(`across ${NETWORK_IDS.length} networks`));
  assert.doesNotMatch(files.site, /\d+\+ networks/);
});

test('the company file points developers at the docs, the OpenAPI document and the SDK', () => {
  for (const url of [
    'https://dev.cosmospay.lat/docs/llms.txt',
    'https://dev.cosmospay.lat/docs/openapi.json',
    'https://dev.cosmospay.lat/docs/api/',
    'https://www.npmjs.com/package/@cosmosapp/pay_sdk',
    'https://cosmospay.lat/.well-known/api-catalog',
    'https://cosmospay.lat/about',
  ]) {
    assert.ok(files.site.includes(url), url);
  }
  assert.ok(files.payments.includes('https://cosmospay.lat/about)'));
});

test('each file links the auth.md of its host, and the company file the agent skill and its index', () => {
  assert.ok(files.site.includes('(https://cosmospay.lat/auth.md)'));
  assert.ok(files.payments.includes('(https://payments.cosmospay.lat/auth.md)'));
  for (const text of Object.values(files)) assert.match(text, /there is no OAuth flow for agents/);
  assert.ok(files.site.includes('(https://github.com/CosmosPay/CosmosPay-Skill)'));
  assert.ok(files.site.includes('(https://cosmospay.lat/.well-known/agent-skills/index.json)'));
});

test('escrow is offered at its price but every line that names it says it is coming soon', () => {
  for (const [name, text] of Object.entries(files)) {
    // Escrow.com is the provider escrow's rate is compared against, not our escrow.
    const lines = text.split('\n').filter((line) => /escrow/i.test(line.replace(/Escrow\.com/g, '')));
    assert.ok(lines.length > 0, name);
    for (const line of lines) assert.match(line, /coming soon/, `${name}: ${line}`);
  }
});
