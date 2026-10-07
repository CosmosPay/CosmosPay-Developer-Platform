/* corsOrigins.test.ts — COSMOS_API_CORS_ORIGINS → the APISIX cors plugin (src/lib/apisix-upstream.ts).

   Two APISIX rules shape this, and production broke on each once:
   - `null` inside allow_origins fails its schema, so the route is rejected and the sync fails;
   - with allow_origins_by_regex set, APISIX matches ONLY the regexes and ignores
     allow_origins, so a regex list holding just `^null$` locks every named origin out.
   The checks below replay APISIX's own logic (schema pattern, regex-only matching). */
import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import { corsOrigins } from '@/lib/apisix-upstream';

// apisix/plugins/cors.lua: origins_pattern, the schema of allow_origins.
const APISIX_ORIGINS_PATTERN = /^(\*|\*\*|null|\w+:\/\/[^,]+(,\w+:\/\/[^,]+)*)$/;

// What APISIX does with a request Origin: regexes only when present, else the list.
function apisixAllows(conf: ReturnType<typeof corsOrigins>, origin: string): boolean {
  if (conf.allow_origins_by_regex) return new RegExp(conf.allow_origins_by_regex.join('|')).test(origin);
  return conf.allow_origins.split(',').includes(origin);
}

const PROD = 'https://cosmospay.lat,https://dev.cosmospay.lat,https://cosmospay.github.io,tauri://localhost,http://tauri.localhost,tauri://localhost:3000';

test('a list without null passes through unchanged, with no regex', () => {
  assert.deepEqual(corsOrigins(PROD), { allow_origins: PROD });
});

test('with null, every listed origin is still allowed, and so is null', () => {
  const conf = corsOrigins(`${PROD},null`);
  assert.match(conf.allow_origins, APISIX_ORIGINS_PATTERN);
  for (const origin of [...PROD.split(','), 'null']) {
    assert.ok(apisixAllows(conf, origin), `${origin} must stay allowed`);
  }
});

test('with null, nothing else gets in: the regexes are exact and dots are literal', () => {
  const conf = corsOrigins(`${PROD},null`);
  for (const origin of [
    'https://evil.example',
    'https://cosmospay.lat.evil.example',
    'https://xcosmospay.lat',
    'https://cosmospayXlat',
    'https://null.evil.example',
    'nullx',
    'http://cosmospay.lat',
  ]) {
    assert.ok(!apisixAllows(conf, origin), `${origin} must be refused`);
  }
});

test('blank and duplicate entries are dropped', () => {
  assert.deepEqual(corsOrigins(' https://a.example ,,https://a.example,null'), {
    allow_origins: 'https://a.example',
    allow_origins_by_regex: ['^https://a\\.example$', '^null$'],
  });
});
