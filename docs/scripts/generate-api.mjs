// Generate the Payments API reference from the community server's OpenAPI spec.
//
// The NestJS server emits openapi/openapi.json with NO root `tags` definitions and NO
// `servers`, so we inject both (titles/descriptions per tag + the gateway base URL) before
// handing it to fumadocs-openapi, which writes one MDX page per tag into content/docs/api.
//
// Must run with cwd = the docs/ project (the `input: ['./openapi.json']` here must match
// the one in src/lib/openapi.ts so generated <APIPage document> ids resolve at render).
import fs from 'node:fs';
import path from 'node:path';
import { createOpenAPI } from 'fumadocs-openapi/server';
import { generateFiles } from 'fumadocs-openapi';

const SRC =
  process.env.OPENAPI_SRC ||
  path.resolve(import.meta.dirname, '../../..', 'comos-pay-community-server/openapi/openapi.json');
const SPEC_OUT = path.resolve(import.meta.dirname, '..', 'openapi.json');
const OUT = path.resolve(import.meta.dirname, '..', 'content/docs/api');
const GATEWAY = process.env.COSMOS_API_BASE || 'https://api.cosmospay.lat/cosmos-api';

// Tag order + human titles/descriptions. The source spec only references these names in
// operations; we supply the definitions so each tag page has a proper heading.
const TAGS = [
  {
    name: 'payment-intents',
    title: 'Payment Intents',
    description: 'Create, fetch, update, cancel and validate Stellar (SEP-7) payment intents.',
  },
  {
    name: 'webhooks',
    title: 'Webhooks',
    description: 'Register endpoints, manage them, and inspect delivery attempts for payment events.',
  },
  { name: 'products', title: 'Products', description: 'CRUD for your product catalog.' },
  { name: 'customers', title: 'Customers', description: 'CRUD for customers and their payment stats.' },
  {
    name: 'analytics',
    title: 'Analytics',
    description: 'Account summary, balances and operational logs.',
  },
  { name: 'health', title: 'Health', description: 'Liveness and readiness probes.' },
];

const spec = JSON.parse(fs.readFileSync(SRC, 'utf8'));
spec.tags = TAGS.map((t) => ({ name: t.name, description: t.description }));
if (!Array.isArray(spec.servers) || spec.servers.length === 0) {
  spec.servers = [{ url: GATEWAY, description: 'Cosmos Pay APISIX gateway' }];
}
fs.writeFileSync(SPEC_OUT, JSON.stringify(spec, null, 2));
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
description: The Cosmos Pay Payments REST API (OpenAPI). Endpoints are versioned under /v1 and reached through the APISIX gateway.
---

The **Payments API** is a REST API for Stellar payment intents and the resources around them.
All paths are versioned (\`/v1/...\`) and must arrive through the APISIX gateway: a valid
\`X-Gateway-Secret\` header plus an authenticated consumer (\`X-Consumer-Username\`). In practice
you call it through the [SDK](/sdk/overview), which handles auth for you.

<Cards>
${cards}
</Cards>
`;
fs.writeFileSync(path.join(OUT, 'index.mdx'), index, 'utf8');

console.log(`[generate-api] ${ordered.length} tag pages -> ${OUT}: ${ordered.join(', ')}`);
