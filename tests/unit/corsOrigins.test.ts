/* corsOrigins.test.ts — COSMOS_API_CORS_ORIGINS → the APISIX cors plugin (src/lib/apisix-upstream.ts).

   APISIX rejects `null` inside allow_origins (only the whole value may be `null`), and a
   rejected route means the sync fails and the gateway keeps its old CORS. */
import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import { corsOrigins } from '@/lib/apisix-upstream';

// APISIX's own schema for allow_origins (apisix/plugins/cors.lua, origins_pattern).
const APISIX_ORIGINS_PATTERN = /^(\*|\*\*|null|\w+:\/\/[^,]+(,\w+:\/\/[^,]+)*)$/;

test('a list without null passes through unchanged', () => {
  assert.deepEqual(corsOrigins('https://cosmospay.lat,https://dev.cosmospay.lat'), {
    allow_origins: 'https://cosmospay.lat,https://dev.cosmospay.lat',
  });
});

test('null moves to an exact regex, and what is left is a list APISIX accepts', () => {
  const out = corsOrigins('https://cosmospay.lat, tauri://localhost ,null');
  assert.deepEqual(out, {
    allow_origins: 'https://cosmospay.lat,tauri://localhost',
    allow_origins_by_regex: ['^null$'],
  });
  assert.match(out.allow_origins, APISIX_ORIGINS_PATTERN);
  assert.ok(new RegExp(out.allow_origins_by_regex![0]).test('null'));
  assert.ok(!new RegExp(out.allow_origins_by_regex![0]).test('https://null.example'));
});

test('empty entries are dropped; a list of only null still names one origin', () => {
  assert.deepEqual(corsOrigins('null,,'), { allow_origins: 'https://cosmospay.lat', allow_origins_by_regex: ['^null$'] });
});
