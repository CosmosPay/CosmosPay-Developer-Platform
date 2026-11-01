import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { ADDRESS_PATTERNS, CHAINS, TOKEN_PRESETS } from '@/lib/chains';
import { standardAssets } from '@/lib/stellar-assets';
import { CREATE_PAY_PATH, NETWORK_WALLETS, PAYMENTS_API_SERVER, networkPresets, payLinkBody, payLinkCurl } from '@/lib/payments/network-pages';
import { NETWORK_PAGES, PAYMENTS_PAGES, SECTION_PAGES, isNetworkPage, pagePath } from '@/lib/payments/site-pages';
import { LANDING } from '@/lib/payments/landing-i18n';
import { LOCALES } from '@/lib/payments/i18n';

const root = path.resolve(import.meta.dirname, '..', '..');
const spec = JSON.parse(readFileSync(path.join(root, 'docs', 'openapi.json'), 'utf8')) as {
  servers: { url: string }[];
  paths: Record<string, Record<string, { requestBody?: { content: Record<string, { schema: { $ref: string } }> } }>>;
  components: { schemas: Record<string, { properties: Record<string, { enum?: string[] }>; required?: string[] }> };
};
const createPay = spec.paths[CREATE_PAY_PATH]?.post;
const dto = spec.components.schemas[createPay?.requestBody?.content['application/json'].schema.$ref.split('/').at(-1) ?? ''];

test('there is one gateway page per network a payment settles on, and every page is registered once', () => {
  assert.deepEqual([...NETWORK_PAGES], [...CHAINS]);
  for (const chain of CHAINS) assert.ok(isNetworkPage(chain) && PAYMENTS_PAGES.includes(chain), chain);
  assert.ok(SECTION_PAGES.every((p) => !isNetworkPage(p)));
  assert.equal(new Set(PAYMENTS_PAGES).size, PAYMENTS_PAGES.length);
  assert.deepEqual(NETWORK_PAGES.map(pagePath), ['/stellar', '/solana', '/monad']);
});

test('the sample request is the Payments API spec’s create-pay request', () => {
  assert.equal(PAYMENTS_API_SERVER, spec.servers[0].url);
  assert.ok(createPay && dto, 'POST /v1/payment-intents/pay and its body are in docs/openapi.json');
  for (const chain of CHAINS) {
    const body = payLinkBody(chain);
    for (const key of Object.keys(body)) assert.ok(key in dto.properties, `${chain}: ${key} is a CreatePayPaymentIntentDto field`);
    for (const key of dto.required ?? []) assert.ok(key in body, `${chain}: ${key} is required`);
    assert.ok(dto.properties.chain.enum?.includes(body.chain), chain);
    assert.match(body.assetIssuer, ADDRESS_PATTERNS[chain], `${chain}: the sample's asset is a real address`);
    assert.match(body.amount, /^\d+(\.\d+)?$/);
    const curl = payLinkCurl(chain);
    assert.ok(curl.startsWith(`curl ${spec.servers[0].url}${CREATE_PAY_PATH} `), chain);
    assert.deepEqual(JSON.parse(curl.slice(curl.indexOf("-d '") + 4, curl.lastIndexOf("'"))), body, `${chain}: the curl body is the JSON body`);
  }
  // Monad takes no wallet message and needs an amount (the spec's msg and amount descriptions).
  assert.ok(!('msg' in payLinkBody('monad')));
  assert.match(dto.properties.msg ? JSON.stringify(dto.properties.msg) : '', /Not supported on Monad/);
});

test('the presets are the verified ones, mainnet first, each address linked to its explorer', () => {
  const stellar = networkPresets('stellar');
  assert.deepEqual(
    stellar.map((r) => `${r.tier}:${r.code}`),
    [...standardAssets('public').map((a) => `public:${a.code}`), ...standardAssets('testnet').map((a) => `testnet:${a.code}`)],
  );
  // The Stellar page's FAQ names these mainnet presets by their issuer.
  for (const [code, issuer] of [['USDC', 'Circle'], ['EURC', 'Circle'], ['USDT0', 'Tether']]) {
    assert.ok(stellar.some((r) => r.tier === 'public' && r.code === code && r.issuer === issuer), code);
  }
  for (const chain of ['solana', 'monad'] as const) {
    const rows = networkPresets(chain);
    for (const tier of ['public', 'testnet'] as const) {
      const tokens = rows.filter((r) => r.tier === tier && r.address);
      assert.deepEqual(tokens.map((r) => r.address), TOKEN_PRESETS[chain][tier].map((p) => p.issuer), `${chain} ${tier}`);
    }
  }
  // Monad's test network has no USDC preset; the page says so.
  assert.ok(!networkPresets('monad').some((r) => r.tier === 'testnet' && r.code === 'USDC'));
  for (const chain of CHAINS) {
    for (const r of networkPresets(chain)) {
      if (r.address) assert.match(r.explorer ?? '', /^https:\/\//, `${chain} ${r.code}`);
      else assert.equal(r.explorer, null);
    }
  }
});

test('the wallets a network page names are on the home’s wallet marquee and in the FAQ', () => {
  const faq = LANDING.en.faq.wallets.a;
  for (const chain of CHAINS) for (const name of NETWORK_WALLETS[chain]) assert.ok(faq.includes(name), name);
});

test('every new gateway page has a search title of 60 characters or less with the network or topic, and a description of 155 or less', () => {
  for (const { code } of LOCALES) {
    const pages = LANDING[code].pages;
    for (const key of ['stellar', 'solana', 'monad', 'compare'] as const) {
      const page = pages[key];
      assert.ok(page.meta.length <= 60, `${code}.${key}.meta is ${page.meta.length}: ${page.meta}`);
      assert.ok(page.meta.endsWith(' | Cosmos Pay'), `${code}.${key}.meta`);
      assert.ok(page.lede.length <= 155, `${code}.${key}.lede is ${page.lede.length}`);
      if (key !== 'compare') {
        const name = key.charAt(0).toUpperCase() + key.slice(1);
        assert.ok(page.meta.includes(name) && page.title.includes(name), `${code}.${key} names ${name}`);
      }
    }
  }
});

test('the network copy keeps its placeholders in every language', () => {
  for (const { code } of LOCALES) {
    const n = LANDING[code].network;
    for (const key of ['factsTitle', 'codeTitle', 'faqTitle'] as const) assert.match(n[key], /\{network\}/, `${code}.network.${key}`);
    assert.match(LANDING[code].networks.stellar.faq.private.a, /\{rate\}/, code);
  }
});
