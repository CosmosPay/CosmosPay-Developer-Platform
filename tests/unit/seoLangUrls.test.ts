import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canonicalUrl, explicitLang, hreflangAlternates, normalizeLangQuery, ogLocale, pageUrl } from '@/lib/seo/lang-urls';
import { LOCALES as SITE_LOCALES } from '@/lib/i18n/locales';
import { LOCALES as PAYMENTS_LOCALES } from '@/lib/payments/i18n';

const SITE = 'https://cosmospay.lat';
const LANGS = ['en', 'es', 'pt', 'fr', 'de', 'hi', 'zh'];

test('the company site and the gateway speak the same seven languages', () => {
  assert.deepEqual(SITE_LOCALES.map((l) => l.code), LANGS);
  assert.deepEqual(PAYMENTS_LOCALES.map((l) => l.code), LANGS);
  for (const code of LANGS) assert.match(ogLocale(code), /^[a-z]{2}_[A-Z]{2}$/, code);
  assert.equal(ogLocale('xx'), 'en_US');
});

test('pageUrl puts the language in ?lang= and keeps the bare path for x-default', () => {
  assert.equal(pageUrl(SITE, '/'), 'https://cosmospay.lat/');
  assert.equal(pageUrl(SITE, '/pricing', 'es'), 'https://cosmospay.lat/pricing?lang=es');
});

test('explicitLang takes only a language the page exists in, as written', () => {
  assert.equal(explicitLang('es', LANGS), 'es');
  assert.equal(explicitLang('ES', LANGS), null);
  assert.equal(explicitLang('xx', LANGS), null);
  assert.equal(explicitLang(null, LANGS), null);
  assert.equal(explicitLang('fr', ['en', 'es']), null);
});

test('hreflangAlternates lists every language and then x-default at the bare path', () => {
  const alternates = hreflangAlternates(SITE, '/pricing', LANGS);
  assert.equal(alternates.length, 8);
  assert.deepEqual(alternates[1], { hreflang: 'es', href: 'https://cosmospay.lat/pricing?lang=es' });
  assert.deepEqual(alternates.at(-1), { hreflang: 'x-default', href: 'https://cosmospay.lat/pricing' });
  assert.deepEqual(hreflangAlternates(SITE, '/tos', ['en', 'es']).map((a) => a.hreflang), ['en', 'es', 'x-default']);
});

test('each version names itself canonical; a language the text is not written in names the fallback', () => {
  assert.equal(canonicalUrl(SITE, '/pricing', null, LANGS), 'https://cosmospay.lat/pricing');
  assert.equal(canonicalUrl(SITE, '/pricing', 'zh', LANGS), 'https://cosmospay.lat/pricing?lang=zh');
  assert.equal(canonicalUrl(SITE, '/tos', 'es', ['en', 'es'], LANGS), 'https://cosmospay.lat/tos?lang=es');
  assert.equal(canonicalUrl(SITE, '/tos', 'fr', ['en', 'es'], LANGS), 'https://cosmospay.lat/tos?lang=en');
  assert.equal(canonicalUrl(SITE, '/tos', 'xx', ['en', 'es'], LANGS), 'https://cosmospay.lat/tos');
});

test('normalizeLangQuery leaves a query the pages take as it is', () => {
  for (const search of ['', '?', '?lang=es', '?lang=en&utm_source=x', '?utm_source=x', '?uri=web%2Bstellar%3Apay&lang=pt']) {
    assert.equal(normalizeLangQuery(search, LANGS), null, search);
  }
});

test('normalizeLangQuery turns a variant into the language and drops a value no page exists in', () => {
  assert.equal(normalizeLangQuery('?lang=ES', LANGS), '?lang=es');
  assert.equal(normalizeLangQuery('?lang=pt-BR', LANGS), '?lang=pt');
  assert.equal(normalizeLangQuery('?lang=zh_CN', LANGS), '?lang=zh');
  assert.equal(normalizeLangQuery('?lang=%65s', LANGS), '?lang=es');
  assert.equal(normalizeLangQuery('?lang=xx', LANGS), '');
  assert.equal(normalizeLangQuery('?lang=', LANGS), '');
  assert.equal(normalizeLangQuery('?lang', LANGS), '');
  assert.equal(normalizeLangQuery('?lang=es&lang=fr', LANGS), '?lang=es');
  assert.equal(normalizeLangQuery('?lang=xx&lang=fr', LANGS), '?lang=fr');
});

test('normalizeLangQuery keeps every other parameter byte for byte, in place', () => {
  assert.equal(normalizeLangQuery('?uri=web%2Bstellar%3Apay%3Fdestination%3DG&lang=xx', LANGS), '?uri=web%2Bstellar%3Apay%3Fdestination%3DG');
  assert.equal(normalizeLangQuery('?a=1&lang=DE&b=a+b', LANGS), '?a=1&lang=de&b=a+b');
});
