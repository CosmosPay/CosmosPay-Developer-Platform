import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canonicalUrl, explicitLang, hreflangAlternates, isCrawler, langRedirect, langSearch, localizeHref, normalizeLangQuery, ogLocale, pageLanguages, pageUrl, visitorLang } from '@/lib/seo/lang-urls';
import { crossHostCanonical } from '@/lib/seo/cross-host';
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

test('pageUrl: English is the bare path, every other language ?lang=', () => {
  assert.equal(pageUrl(SITE, '/'), 'https://cosmospay.lat/');
  assert.equal(pageUrl(SITE, '/', 'en'), 'https://cosmospay.lat/');
  assert.equal(pageUrl(SITE, '/pricing', 'en'), 'https://cosmospay.lat/pricing');
  assert.equal(pageUrl(SITE, '/pricing', 'es'), 'https://cosmospay.lat/pricing?lang=es');
});

test('explicitLang takes only a language the page exists in, as written', () => {
  assert.equal(explicitLang('es', LANGS), 'es');
  assert.equal(explicitLang('ES', LANGS), null);
  assert.equal(explicitLang('xx', LANGS), null);
  assert.equal(explicitLang(null, LANGS), null);
  assert.equal(explicitLang('fr', ['en', 'es']), null);
});

test('hreflangAlternates: English and x-default are the bare path, the others ?lang=', () => {
  const alternates = hreflangAlternates(SITE, '/pricing', LANGS);
  assert.equal(alternates.length, 8);
  assert.deepEqual(alternates[0], { hreflang: 'en', href: 'https://cosmospay.lat/pricing' });
  assert.deepEqual(alternates[1], { hreflang: 'es', href: 'https://cosmospay.lat/pricing?lang=es' });
  assert.deepEqual(alternates.at(-1), { hreflang: 'x-default', href: 'https://cosmospay.lat/pricing' });
  assert.ok(!alternates.some((a) => a.href.includes('lang=en')), 'no ?lang=en anywhere');
  assert.deepEqual(hreflangAlternates(SITE, '/tos', ['en', 'es']).map((a) => a.hreflang), ['en', 'es', 'x-default']);
});

test('each version names itself canonical; English and a language the text is not written in name the bare path', () => {
  assert.equal(canonicalUrl(SITE, '/pricing', null, LANGS), 'https://cosmospay.lat/pricing');
  assert.equal(canonicalUrl(SITE, '/pricing', 'en', LANGS), 'https://cosmospay.lat/pricing');
  assert.equal(canonicalUrl(SITE, '/pricing', 'zh', LANGS), 'https://cosmospay.lat/pricing?lang=zh');
  assert.equal(canonicalUrl(SITE, '/tos', 'es', ['en', 'es'], LANGS), 'https://cosmospay.lat/tos?lang=es');
  assert.equal(canonicalUrl(SITE, '/tos', 'fr', ['en', 'es'], LANGS), 'https://cosmospay.lat/tos');
  assert.equal(canonicalUrl(SITE, '/tos', 'xx', ['en', 'es'], LANGS), 'https://cosmospay.lat/tos');
});

test('the company /swaps names the gateway /swaps canonical, in the same language; other pages name themselves', () => {
  const PAY = 'https://payments.cosmospay.lat';
  assert.equal(crossHostCanonical('/swaps', null, LANGS, LANGS, PAY), 'https://payments.cosmospay.lat/swaps');
  assert.equal(crossHostCanonical('/swaps', 'es', LANGS, LANGS, PAY), 'https://payments.cosmospay.lat/swaps?lang=es');
  for (const path of ['/', '/pricing', '/about', '/tos']) assert.equal(crossHostCanonical(path, 'es', LANGS, LANGS, PAY), null, path);
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

test('on an indexable page ?lang=en (in any spelling) goes to the bare path, the rest of the query untouched', () => {
  assert.equal(normalizeLangQuery('?lang=en', LANGS, 'en'), '');
  assert.equal(normalizeLangQuery('?lang=EN', LANGS, 'en'), '');
  assert.equal(normalizeLangQuery('?lang=en-US', LANGS, 'en'), '');
  assert.equal(normalizeLangQuery('?utm_source=x&lang=en&a=b+c%2F', LANGS, 'en'), '?utm_source=x&a=b+c%2F');
  assert.equal(normalizeLangQuery('?lang=en&lang=es', LANGS, 'en'), '', 'the first usable value decides');
  assert.equal(normalizeLangQuery('?lang=es', LANGS, 'en'), null);
  assert.equal(normalizeLangQuery('?lang=DE', LANGS, 'en'), '?lang=de');
  // Without the default (a payment link, /pay), ?lang=en is an explicit choice and stays.
  assert.equal(normalizeLangQuery('?uri=web%2Bstellar%3Apay&lang=en', LANGS), null);
});

test('langSearch sets the language in place, adds it at the end, or drops it for English', () => {
  assert.equal(langSearch('', 'es'), '?lang=es');
  assert.equal(langSearch('', 'en'), '');
  assert.equal(langSearch('?lang=es', 'en'), '');
  assert.equal(langSearch('?lang=es', 'fr'), '?lang=fr');
  assert.equal(langSearch('?a=1&lang=es&b=a+b%2F', 'de'), '?a=1&lang=de&b=a+b%2F');
  assert.equal(langSearch('?a=1&lang=es&b=2', 'en'), '?a=1&b=2');
  assert.equal(langSearch('?uri=web%2Bstellar%3Apay%3Famount%3D1', 'pt'), '?uri=web%2Bstellar%3Apay%3Famount%3D1&lang=pt');
  assert.equal(langSearch('?lang=es&lang=fr', 'zh'), '?lang=zh', 'one lang left');
});

test('visitorLang: the switcher cookie first, then the highest weighted Accept-Language the pages exist in', () => {
  assert.equal(visitorLang(null, null, LANGS), null);
  assert.equal(visitorLang(null, '', LANGS), null);
  assert.equal(visitorLang('fr', 'es-AR,es;q=0.9', LANGS), 'fr');
  assert.equal(visitorLang('en', 'es-AR,es;q=0.9', LANGS), 'en', 'English chosen in the switcher wins');
  assert.equal(visitorLang('xx', 'es-AR,es;q=0.9', LANGS), 'es', 'a cookie naming no language is ignored');
  assert.equal(visitorLang(null, 'ja,de;q=0.8,en;q=0.9', LANGS), 'en');
  assert.equal(visitorLang(null, 'pt-BR;q=0.5,zh-CN', LANGS), 'zh');
  assert.equal(visitorLang(null, 'ja,ko', LANGS), null);
  assert.equal(visitorLang(null, 'es;q=0', LANGS), null);
});

test('crawlers are told apart from browsers', () => {
  for (const ua of [
    'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
    'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)',
    'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GPTBot/1.1; +https://openai.com/gptbot)',
    'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; ClaudeBot/1.0; +claudebot@anthropic.com)',
    'facebookexternalhit/1.1',
    'Mozilla/5.0 (compatible; Bytespider; spider-feedback@bytedance.com)',
  ]) {
    assert.ok(isCrawler(ua), ua);
  }
  for (const ua of [null, '', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36', 'curl/8.9.1']) {
    assert.ok(!isCrawler(ua), String(ua));
  }
});

const CHROME = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36';
const ask = (over: Partial<Parameters<typeof langRedirect>[0]>) => langRedirect({ method: 'GET', pathname: '/pricing', search: '', userAgent: CHROME, ...over }, LANGS);

test('langRedirect sends a visitor asking for another language from the bare path to its address', () => {
  assert.equal(ask({ acceptLanguage: 'es-AR,es;q=0.9,en;q=0.8' }), '/pricing?lang=es');
  assert.equal(ask({ cookie: 'fr', acceptLanguage: 'es' }), '/pricing?lang=fr');
  assert.equal(ask({ pathname: '/', cookie: 'zh' }), '/?lang=zh');
  assert.equal(ask({ search: '?utm_source=x&b=a+b%2F', acceptLanguage: 'de' }), '/pricing?utm_source=x&b=a+b%2F&lang=de', 'the query is kept byte for byte');
});

test('langRedirect never redirects English, crawlers, non-GET requests or an address that names a language', () => {
  assert.equal(ask({}), null, 'no preference: the English page');
  assert.equal(ask({ acceptLanguage: 'en-US,en;q=0.9,es;q=0.8' }), null);
  assert.equal(ask({ acceptLanguage: 'ja' }), null);
  assert.equal(ask({ cookie: 'en', acceptLanguage: 'es' }), null, 'English picked in the switcher');
  assert.equal(ask({ acceptLanguage: 'es', userAgent: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' }), null);
  assert.equal(ask({ acceptLanguage: 'es', userAgent: null }), '/pricing?lang=es', 'no user agent is still a visitor');
  for (const method of ['HEAD', 'POST', 'PUT', 'OPTIONS']) assert.equal(ask({ method, acceptLanguage: 'es' }), null, method);
  assert.equal(ask({ search: '?lang=fr', acceptLanguage: 'es' }), null, 'the address names a language: no loop');
  assert.equal(ask({ search: '?a=1&lang=de', cookie: 'es' }), null);
});

const HOSTS = { site: 'https://cosmospay.lat', payments: 'https://payments.cosmospay.lat' };

test('pageLanguages: the indexable pages of each host and the languages each is written in', () => {
  assert.equal(pageLanguages('site', '/'), null);
  assert.equal(pageLanguages('site', '/pricing'), null);
  assert.deepEqual(pageLanguages('site', '/tos'), ['en', 'es']);
  assert.equal(pageLanguages('site', '/faq'), undefined);
  assert.equal(pageLanguages('payments', '/faq'), null);
  assert.equal(pageLanguages('payments', '/learn/accept-usdc-payments'), null);
  for (const path of ['/pay', '/contact', '/preview/classic', '/cmh4x2k9a0001l70g8v5q3z2w', '/zk/x']) assert.equal(pageLanguages('payments', path), undefined, path);
});

test('localizeHref: a link to an indexable page carries the language of the page that draws it', () => {
  // Same host, as a path.
  assert.equal(localizeHref('/faq', 'es', HOSTS, 'payments'), '/faq?lang=es');
  assert.equal(localizeHref('/', 'zh', HOSTS, 'payments'), '/?lang=zh');
  assert.equal(localizeHref('/integrations#integration-links', 'fr', HOSTS, 'payments'), '/integrations?lang=fr#integration-links');
  assert.equal(localizeHref('/#pricing', 'de', HOSTS, 'payments'), '/?lang=de#pricing');
  // Absolute, on either host.
  assert.equal(localizeHref('https://cosmospay.lat/pricing', 'pt', HOSTS), 'https://cosmospay.lat/pricing?lang=pt');
  assert.equal(localizeHref('https://cosmospay.lat', 'hi', HOSTS), 'https://cosmospay.lat/?lang=hi');
  assert.equal(localizeHref('https://cosmospay.lat/#wallet', 'es', HOSTS), 'https://cosmospay.lat/?lang=es#wallet');
  assert.equal(localizeHref('https://payments.cosmospay.lat/compare', 'es', HOSTS, 'site'), 'https://payments.cosmospay.lat/compare?lang=es');
  // Other parameters stay byte for byte; a language already there is replaced.
  assert.equal(localizeHref('/faq?utm_source=x&b=a+b%2F#q', 'es', HOSTS, 'payments'), '/faq?utm_source=x&b=a+b%2F&lang=es#q');
  assert.equal(localizeHref('/faq?lang=fr', 'es', HOSTS, 'payments'), '/faq?lang=es');
});

test('localizeHref leaves English, other pages, other hosts and fragments as they are', () => {
  for (const lang of [null, undefined, '', 'en']) assert.equal(localizeHref('https://cosmospay.lat/pricing', lang, HOSTS), 'https://cosmospay.lat/pricing', String(lang));
  // A page not written in the language: its English version is the canonical one.
  assert.equal(localizeHref('https://cosmospay.lat/tos', 'fr', HOSTS), 'https://cosmospay.lat/tos');
  assert.equal(localizeHref('https://cosmospay.lat/tos', 'es', HOSTS), 'https://cosmospay.lat/tos?lang=es');
  for (const href of [
    '/pay?uri=web%2Bstellar%3Apay',
    '/preview/classic?lang=es',
    '/cmh4x2k9a0001l70g8v5q3z2w',
    '/contact',
    'https://dev.cosmospay.lat/docs/',
    'https://dev.cosmospay.lat/login?next=%2Fdashboard%3Fview%3Dpayments',
    'https://github.com/CosmosPay',
    'mailto:organization@cosmospay.lat',
    '#contact',
    '//cosmospay.lat/pricing',
    'https://cosmospay.lat.evil.example/pricing',
    'https://cosmospay.lat/wallet/',
  ]) {
    assert.equal(localizeHref(href, 'es', HOSTS, 'payments'), href, href);
  }
  // A path without a host to resolve it on is left alone.
  assert.equal(localizeHref('/faq', 'es', HOSTS), '/faq');
  // A path is read on the host the page is on: /pricing is a page on the company site only.
  assert.equal(localizeHref('/pricing', 'es', HOSTS, 'site'), '/pricing?lang=es');
  assert.equal(localizeHref('/pricing', 'es', HOSTS, 'payments'), '/pricing');
});

test('one host serving both areas (a local setup): the path decides', () => {
  const local = { site: 'http://localhost:4321', payments: 'http://localhost:4321' };
  assert.equal(localizeHref('http://localhost:4321/faq', 'es', local), 'http://localhost:4321/faq?lang=es');
  assert.equal(localizeHref('http://localhost:4321/pricing', 'es', local), 'http://localhost:4321/pricing?lang=es');
});

test('langRedirect only sends a visitor to a language the page is written in', () => {
  const tos = (over: Partial<Parameters<typeof langRedirect>[0]>) => langRedirect({ method: 'GET', pathname: '/tos', search: '', userAgent: CHROME, ...over }, ['en', 'es']);
  assert.equal(tos({ acceptLanguage: 'fr-FR,fr;q=0.9' }), null, 'a French browser stays on the English terms');
  assert.equal(tos({ cookie: 'fr' }), null);
  assert.equal(tos({ acceptLanguage: 'fr-FR,fr;q=0.9,es;q=0.8' }), '/tos?lang=es', 'its next language the terms are written in');
  assert.equal(tos({ acceptLanguage: 'es-AR' }), '/tos?lang=es');
});
