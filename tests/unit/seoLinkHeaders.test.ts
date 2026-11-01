import { test } from 'node:test';
import assert from 'node:assert/strict';
import { discoveryLinks, pageMarkdownLink, type PageMarkdownInput } from '@/lib/seo/link-headers';

const DOCS = 'https://dev.cosmospay.lat/docs/';
const ORIGINS = { site: 'https://cosmospay.lat', payments: 'https://payments.cosmospay.lat' };
const ALL = ['en', 'es', 'pt', 'fr', 'de', 'hi', 'zh'];

const markdown = (input: Partial<PageMarkdownInput> & Pick<PageMarkdownInput, 'area' | 'path'>) =>
  pageMarkdownLink({ asked: null, langs: null, allLangs: ALL, origins: ORIGINS, ...input });

test('the links name the host llms.txt, the API catalog, the OpenAPI document, the docs, the sitemap and the Markdown version', () => {
  const links = discoveryLinks({ docs: DOCS, markdown: 'https://cosmospay.lat/index.md' });
  assert.deepEqual(links, [
    '</llms.txt>; rel="describedby"; type="text/plain"',
    '</.well-known/api-catalog>; rel="api-catalog"',
    '<https://dev.cosmospay.lat/docs/openapi.json>; rel="service-desc"; type="application/json"',
    '<https://dev.cosmospay.lat/docs/>; rel="service-doc"',
    '</sitemap.xml>; rel="sitemap"',
    '<https://cosmospay.lat/index.md>; rel="alternate"; type="text/markdown"',
  ]);
  // A docs root given without its slash still links the docs at their canonical address.
  assert.deepEqual(discoveryLinks({ docs: 'https://dev.cosmospay.lat/docs', markdown: null }).slice(2, 4), links.slice(2, 4));
  assert.equal(discoveryLinks({ docs: DOCS, markdown: null }).length, 5);
});

test('every value is one RFC 8288 link-value: a URI reference in angle brackets, then quoted parameters', () => {
  for (const link of discoveryLinks({ docs: DOCS, markdown: 'https://payments.cosmospay.lat/faq.md?lang=es' })) {
    assert.match(link, /^<[^<>\s]+>(; [a-z]+="[^"]+")+$/, link);
    assert.ok(!link.includes(', '), link);
  }
});

test('the Markdown version is the one the page itself names: its canonical address with .md', () => {
  assert.equal(markdown({ area: 'site', path: '/' }), 'https://cosmospay.lat/index.md');
  assert.equal(markdown({ area: 'payments', path: '/' }), 'https://payments.cosmospay.lat/index.md');
  assert.equal(markdown({ area: 'site', path: '/pricing', asked: 'es' }), 'https://cosmospay.lat/pricing.md?lang=es');
  assert.equal(markdown({ area: 'payments', path: '/faq', asked: 'zh' }), 'https://payments.cosmospay.lat/faq.md?lang=zh');
  assert.equal(
    markdown({ area: 'payments', path: '/learn/accept-usdc-payments', asked: 'pt' }),
    'https://payments.cosmospay.lat/learn/accept-usdc-payments.md?lang=pt',
  );
  // The terms exist in English and Spanish: their French address shows (and names) the English.
  assert.equal(markdown({ area: 'site', path: '/tos', asked: 'fr', langs: ['en', 'es'] }), 'https://cosmospay.lat/tos.md');
  assert.equal(markdown({ area: 'site', path: '/tos', asked: 'es', langs: ['en', 'es'] }), 'https://cosmospay.lat/tos.md?lang=es');
  // The company's /swaps is canonical on the gateway, and so is its Markdown version.
  assert.equal(markdown({ area: 'site', path: '/swaps', asked: 'pt' }), 'https://payments.cosmospay.lat/swaps.md?lang=pt');
  assert.equal(markdown({ area: 'payments', path: '/swaps' }), 'https://payments.cosmospay.lat/swaps.md');
});
