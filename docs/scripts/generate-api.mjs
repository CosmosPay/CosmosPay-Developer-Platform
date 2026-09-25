// Generate the Payments API reference from the community server's OpenAPI spec.
//
// The spec is the server's, passed through transform-spec.mjs (tag headings, the public
// gateway URL, public-facing auth) before fumadocs-openapi writes one MDX page per tag into
// content/docs/api.
//
// Must run with cwd = the docs/ project (the `input: ['./openapi.json']` here must match
// the one in src/lib/openapi.ts so generated <APIPage document> ids resolve at render).
import fs from 'node:fs';
import path from 'node:path';
import { createOpenAPI } from 'fumadocs-openapi/server';
import { generateFiles } from 'fumadocs-openapi';
import { GATEWAY_DEFAULT, TAGS, transformSpec } from './transform-spec.mjs';

const SRC =
  process.env.OPENAPI_SRC ||
  path.resolve(import.meta.dirname, '../../..', 'comos-pay-community-server/openapi/openapi.json');
const SPEC_OUT = path.resolve(import.meta.dirname, '..', 'openapi.json');
const OUT = path.resolve(import.meta.dirname, '..', 'content/docs/api');
const GATEWAY = process.env.COSMOS_API_BASE || GATEWAY_DEFAULT;

// The API reference is GENERATED from the external community-server's openapi.json. That repo is
// only on dev/build machines; on a production box it's absent and we don't want the docs to depend
// on it. The generated content/docs/api + openapi.json are committed, so just skip here.
if (!fs.existsSync(SRC)) {
  console.warn(`[generate-api] OpenAPI source not found at ${SRC} — keeping the committed content/docs/api + openapi.json as-is.`);
  process.exit(0);
}

// Every change to the server's spec lives in transform-spec.mjs, which the check script
// (scripts/check-api-spec.mjs) runs too — so what is written here is exactly what CI
// expects to find committed.
const spec = transformSpec(JSON.parse(fs.readFileSync(SRC, 'utf8')), { gateway: GATEWAY });
fs.writeFileSync(SPEC_OUT, `${JSON.stringify(spec, null, 2)}\n`);
console.log(`[generate-api] wrote spec -> ${SPEC_OUT} (from ${SRC})`);

fs.rmSync(OUT, { recursive: true, force: true });

const openapi = createOpenAPI({ input: ['./openapi.json'] });
await generateFiles({
  input: openapi,
  output: OUT,
  per: 'tag',
  meta: false,
});

// Build our own meta.json (ordered) + an index landing page with cards.
const order = TAGS.map((t) => t.name);
const titleOf = Object.fromEntries(TAGS.map((t) => [t.name, t.title]));
const generated = fs
  .readdirSync(OUT)
  .filter((f) => f.endsWith('.mdx'))
  .map((f) => f.replace(/\.mdx$/, ''));
const ordered = [...order.filter((s) => generated.includes(s)), ...generated.filter((s) => !order.includes(s))];

fs.writeFileSync(
  path.join(OUT, 'meta.json'),
  JSON.stringify(
    { title: 'API Reference', description: 'Cosmos Pay Payments REST API', pages: ['index', ...ordered] },
    null,
    2,
  ) + '\n',
  'utf8',
);

const cards = ordered
  .map((s) => `  <Card title=${JSON.stringify(titleOf[s] || s)} href=${JSON.stringify(`/api/${s}`)} />`)
  .join('\n');
const index = `---
title: API Reference
description: The Cosmos Pay Payments REST API (OpenAPI). Endpoints are versioned under /v1 and authenticated with your secret API key.
---

The **Payments API** is a REST API for Stellar payment intents and the resources around them.
All paths are versioned (\`/v1/...\`). Authenticate every request with your secret API key in the
\`Authorization\` header:

\`\`\`http
Authorization: Bearer <your-api-key>
\`\`\`

Need a key? See [API keys](/api-keys). In practice you call the API through the
[SDK](/sdk/server/overview), which sets this header for you.

<Cards>
${cards}
</Cards>
`;
fs.writeFileSync(path.join(OUT, 'index.mdx'), index, 'utf8');

console.log(`[generate-api] ${ordered.length} tag pages -> ${OUT}: ${ordered.join(', ')}`);
