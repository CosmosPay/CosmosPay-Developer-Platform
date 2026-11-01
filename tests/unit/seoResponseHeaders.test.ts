import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HSTS, REFERRER_POLICY, responseHeaders } from '@/lib/seo/response-headers';

const html = (headers: Record<string, string> = {}) => new Response('<p>hi</p>', { headers: { 'Content-Type': 'text/html', ...headers } });

test('HTML leaves with its charset, HSTS on https, and a Referrer-Policy', () => {
  const res = responseHeaders(html(), { https: true, negotiatedLang: false });
  assert.equal(res.headers.get('Content-Type'), 'text/html; charset=utf-8');
  assert.equal(res.headers.get('Strict-Transport-Security'), HSTS);
  assert.equal(res.headers.get('Referrer-Policy'), REFERRER_POLICY);
  assert.equal(res.headers.get('Vary'), null);
});

test('no HSTS on a plain-http origin (local development)', () => {
  const res = responseHeaders(html(), { https: false, negotiatedLang: false });
  assert.equal(res.headers.get('Strict-Transport-Security'), null);
});

test('a page whose language follows the visitor varies on Accept-Language and Cookie, keeping what it had', () => {
  const res = responseHeaders(html({ Vary: 'Origin' }), { https: true, negotiatedLang: true });
  assert.equal(res.headers.get('Vary'), 'Origin, Accept-Language, Cookie');
  const again = responseHeaders(res, { https: true, negotiatedLang: true });
  assert.equal(again.headers.get('Vary'), 'Origin, Accept-Language, Cookie');
});

test('a page with a Markdown version varies on Accept too, and only its HTML does', () => {
  const page = responseHeaders(html(), { https: true, negotiatedLang: true, negotiatedType: true });
  assert.equal(page.headers.get('Vary'), 'Accept-Language, Cookie, Accept');
  const named = responseHeaders(html(), { https: true, negotiatedLang: false, negotiatedType: true });
  assert.equal(named.headers.get('Vary'), 'Accept');
  const markdown = responseHeaders(new Response('# x', { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } }), {
    https: true,
    negotiatedLang: false,
    negotiatedType: true,
  });
  assert.equal(markdown.headers.get('Vary'), null);
  assert.equal(markdown.headers.get('Content-Type'), 'text/markdown; charset=utf-8');
});

test('headers already set are left alone, and a non-HTML response gets no charset or Vary', () => {
  const res = responseHeaders(
    new Response('{}', { headers: { 'Content-Type': 'application/json', 'Referrer-Policy': 'no-referrer', 'Strict-Transport-Security': 'max-age=60' } }),
    { https: true, negotiatedLang: true },
  );
  assert.equal(res.headers.get('Content-Type'), 'application/json');
  assert.equal(res.headers.get('Referrer-Policy'), 'no-referrer');
  assert.equal(res.headers.get('Strict-Transport-Security'), 'max-age=60');
  assert.equal(res.headers.get('Vary'), null);
  const charset = responseHeaders(html({ 'Content-Type': 'text/html; charset=iso-8859-1' }), { https: false, negotiatedLang: false });
  assert.equal(charset.headers.get('Content-Type'), 'text/html; charset=iso-8859-1');
});

test('an HTML page takes the Link values it does not carry yet; any other answer keeps its own', () => {
  const links = ['</llms.txt>; rel="describedby"; type="text/plain"', '</.well-known/api-catalog>; rel="api-catalog"'];
  const page = responseHeaders(html(), { https: true, negotiatedLang: false, links });
  assert.equal(page.headers.get('Link'), links.join(', '));
  const again = responseHeaders(page, { https: true, negotiatedLang: false, links });
  assert.equal(again.headers.get('Link'), links.join(', '));
  const preload = responseHeaders(html({ Link: '</x.css>; rel="preload"; as="style"' }), { https: true, negotiatedLang: false, links });
  assert.equal(preload.headers.get('Link'), ['</x.css>; rel="preload"; as="style"', ...links].join(', '));
  // The API catalog's own Link to itself (src/pages/.well-known/api-catalog.ts) stays as it is.
  const catalog = new Response('{}', {
    headers: { 'Content-Type': 'application/linkset+json', Link: '<https://cosmospay.lat/.well-known/api-catalog>; rel="api-catalog"' },
  });
  assert.equal(responseHeaders(catalog, { https: true, negotiatedLang: false, links }).headers.get('Link'), '<https://cosmospay.lat/.well-known/api-catalog>; rel="api-catalog"');
  assert.equal(responseHeaders(html(), { https: true, negotiatedLang: false }).headers.get('Link'), null);
});

test('a response with immutable headers is copied, status and body kept', async () => {
  const original = Response.redirect('https://cosmospay.lat/', 301);
  assert.throws(() => original.headers.set('X-Test', '1'));
  const res = responseHeaders(original, { https: true, negotiatedLang: false });
  assert.notEqual(res, original);
  assert.equal(res.status, 301);
  assert.equal(res.headers.get('Location'), 'https://cosmospay.lat/');
  assert.equal(res.headers.get('Strict-Transport-Security'), HSTS);
});
