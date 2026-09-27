// Fail when the docs site's Payments API spec (docs/openapi.json) is not what the community
// server serves today.
//
// docs/openapi.json is committed — production builds without the server repo next to it —
// so nothing refreshed it when the server changed, and the reference could describe routes,
// fields and auth the server no longer has. This recomputes it from the server's spec with the
// SAME transform generate-api uses (docs/scripts/transform-spec.mjs) and compares.
//
// Source, first match wins:
//   1. OPENAPI_SRC — a file path or an http(s) URL
//   2. ../comos-pay-community-server/openapi/openapi.json — the sibling checkout
// With neither it says so and exits 0: a production box has no server repo and nothing to check.
//
// Fix a failure with `npm run docs:api` (or a full `npm run docs:build`) and commit the result.
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { transformSpec } from '../docs/scripts/transform-spec.mjs';

const root = path.resolve(import.meta.dirname, '..');
const DOCS_SPEC = path.join(root, 'docs', 'openapi.json');
const SIBLING = path.resolve(root, '..', 'comos-pay-community-server', 'openapi', 'openapi.json');

async function readSource() {
  const src = process.env.OPENAPI_SRC;
  if (src && /^https?:\/\//i.test(src)) {
    const res = await fetch(src, { headers: { accept: 'application/json' } });
    if (!res.ok) throw new Error(`${src} answered ${res.status}`);
    return { from: src, text: await res.text() };
  }
  const file = src ? path.resolve(src) : SIBLING;
  return existsSync(file) ? { from: file, text: readFileSync(file, 'utf8') } : null;
}

/** The first few differing paths, so a failure names what drifted instead of just "differs". */
function differences(a, b, at = '', out = []) {
  if (out.length >= 10) return out;
  if (isDeepStrictEqual(a, b)) return out;
  if (a && b && typeof a === 'object' && typeof b === 'object' && !Array.isArray(a) && !Array.isArray(b)) {
    for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) differences(a[key], b[key], `${at}/${key}`, out);
    return out;
  }
  out.push(at || '/');
  return out;
}

const source = await readSource();
if (!source) {
  console.warn('[check-api-spec] no community-server spec reachable (set OPENAPI_SRC) — skipped.');
  process.exit(0);
}

const expected = transformSpec(JSON.parse(source.text), {
  gateway: process.env.COSMOS_API_BASE || undefined,
});
const committed = JSON.parse(readFileSync(DOCS_SPEC, 'utf8'));

if (!isDeepStrictEqual(expected, committed)) {
  console.error(`[check-api-spec] docs/openapi.json does not match ${source.from}. First differences:`);
  for (const d of differences(expected, committed)) console.error(`  ${d}`);
  console.error('Run `npm run docs:api` and commit docs/openapi.json + docs/content/docs/api.');
  process.exit(1);
}
console.log(`[check-api-spec] docs/openapi.json matches ${source.from}.`);
