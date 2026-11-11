import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  API_CATALOG_TYPE,
  SECURITY_TXT_LIFETIME_DAYS,
  STELLAR_PUBNET_PASSPHRASE,
  STELLAR_TOML_HEADERS,
  apiCatalog,
  securityTxt,
  stellarToml,
} from '@/lib/seo/well-known';

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

test('stellar.toml (SEP-1) documents the organization and names no signing key, endpoint or account', () => {
  const text = stellarToml({ orgUrl: 'https://cosmospay.lat/', email: 'organization@cosmospay.lat', github: 'CosmosPay', twitter: 'CosmosPay' });
  const lines = text.split('\n');
  assert.ok(lines.includes('VERSION = "2.7.0"'));
  assert.ok(lines.includes(`NETWORK_PASSPHRASE = "${STELLAR_PUBNET_PASSPHRASE}"`));
  assert.equal(STELLAR_PUBNET_PASSPHRASE, 'Public Global Stellar Network ; September 2015');
  assert.ok(lines.includes('[DOCUMENTATION]'));
  assert.ok(lines.includes('ORG_NAME = "Cosmos Pay"'));
  assert.ok(lines.includes('ORG_URL = "https://cosmospay.lat"'), 'no trailing slash');
  assert.ok(lines.includes('ORG_OFFICIAL_EMAIL = "organization@cosmospay.lat"'));
  assert.ok(lines.includes('ORG_GITHUB = "CosmosPay"'));
  assert.ok(lines.includes('ORG_TWITTER = "CosmosPay"'));
  // Two recovery servers, two keys: their discovery stays on their own hosts.
  assert.ok(!/^(SIGNING_KEY|WEB_AUTH_ENDPOINT|TRANSFER_SERVER|KYC_SERVER|URI_REQUEST_SIGNING_KEY|ACCOUNTS)\b/m.test(text));
  assert.ok(!/^\[\[/m.test(text), 'no tables of currencies, servers or validators');
  assert.ok(!text.includes(String.fromCharCode(0x2014)), 'no em dash');
  assert.ok(text.endsWith('\n'));
  assert.equal(STELLAR_TOML_HEADERS['Access-Control-Allow-Origin'], '*', 'SEP-1 requires CORS for every origin');
  assert.match(STELLAR_TOML_HEADERS['Content-Type'], /^text\/plain/);
});

test('stellar.toml escapes TOML strings and refuses a value that would break its line', () => {
  const input = { orgUrl: 'https://cosmospay.lat', github: 'CosmosPay', twitter: 'CosmosPay' };
  const text = stellarToml({ ...input, email: 'a"b\\c@cosmospay.lat' });
  assert.ok(text.split('\n').includes('ORG_OFFICIAL_EMAIL = "a\\"b\\\\c@cosmospay.lat"'));
  assert.throws(() => stellarToml({ ...input, email: 'x@y.z\nSIGNING_KEY = "G"' }));
});

