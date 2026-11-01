import { test } from 'node:test';
import assert from 'node:assert/strict';
import { API_CATALOG_TYPE, SECURITY_TXT_LIFETIME_DAYS, apiCatalog, securityTxt } from '@/lib/seo/well-known';

const NOW = new Date('2026-10-31T15:20:00Z');
const CANONICALS = ['https://cosmospay.lat/.well-known/security.txt', 'https://payments.cosmospay.lat/.well-known/security.txt'];

test('security.txt has the RFC 9116 fields, its contact as a mailto: URI', () => {
  const text = securityTxt({ now: NOW, contact: 'organization@cosmospay.lat', canonicals: CANONICALS, languages: ['en', 'es'] });
  assert.match(text, /^Contact: mailto:organization@cosmospay\.lat$/m);
  assert.match(text, /^Preferred-Languages: en, es$/m);
  for (const url of CANONICALS) assert.ok(text.includes(`Canonical: ${url}`), url);
  assert.ok(!/^(Encryption|Policy|Acknowledgments|Hiring):/m.test(text), 'nothing the source does not have');
  assert.equal((text.match(/^Expires:/gm) ?? []).length, 1);
  assert.ok(text.endsWith('\n'));
});

test('security.txt expires less than a year after it is served', () => {
  const text = securityTxt({ now: NOW, contact: 'https://example.com/report', canonicals: CANONICALS, languages: ['en'] });
  const expires = new Date(/^Expires: (.+)$/m.exec(text)![1]);
  assert.equal(expires.toISOString(), '2027-04-29T00:00:00.000Z');
  const days = (expires.getTime() - NOW.getTime()) / 86_400_000;
  assert.ok(days > 0 && days < 365 && Math.round(days) <= SECURITY_TXT_LIFETIME_DAYS);
  assert.match(text, /^Contact: https:\/\/example\.com\/report$/m);
});

test('the API catalog is an RFC 9727 linkset naming the API, its OpenAPI document and its docs', () => {
  assert.equal(API_CATALOG_TYPE, 'application/linkset+json; profile="https://www.rfc-editor.org/info/rfc9727"');
  const catalog = apiCatalog({
    self: 'https://cosmospay.lat/.well-known/api-catalog',
    apiBase: 'https://api.cosmospay.lat/cosmos-api',
    docs: 'https://dev.cosmospay.lat/docs/',
  });
  const [index, api] = catalog.linkset as [Record<string, unknown>, Record<string, unknown>];
  assert.equal(index.anchor, 'https://cosmospay.lat/.well-known/api-catalog');
  assert.deepEqual((index.item as { href: string }[]).map((i) => i.href), ['https://api.cosmospay.lat/cosmos-api']);
  assert.equal(api.anchor, 'https://api.cosmospay.lat/cosmos-api');
  assert.equal((api['service-desc'] as { href: string }[])[0].href, 'https://dev.cosmospay.lat/docs/openapi.json');
  assert.equal((api['service-doc'] as { href: string }[])[0].href, 'https://dev.cosmospay.lat/docs/api/');
});
