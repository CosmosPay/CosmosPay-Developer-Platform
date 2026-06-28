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

// The API reference is GENERATED from the external community-server's openapi.json. That repo is
// only on dev/build machines; on a production box it's absent and we don't want the docs to depend
// on it. The generated content/docs/api + openapi.json are committed, so just skip here.
if (!fs.existsSync(SRC)) {
  console.warn(`[generate-api] OpenAPI source not found at ${SRC} — keeping the committed content/docs/api + openapi.json as-is.`);
  process.exit(0);
}

const spec = JSON.parse(fs.readFileSync(SRC, 'utf8'));
spec.tags = TAGS.map((t) => ({ name: t.name, description: t.description }));
if (!Array.isArray(spec.servers) || spec.servers.length === 0) {
  spec.servers = [{ url: GATEWAY, description: 'Cosmos Pay API' }];
}

// Public-facing auth only. The source spec documents the INTERNAL gateway handshake
// (`X-Gateway-Secret` + `X-Consumer-Username`), which APISIX injects and external callers never
// see. Replace it with the single scheme developers actually use: their secret API key in the
// `Authorization: Bearer <apiKey>` header. Also strip any internal header params / per-op
// security so nothing about the gateway leaks into the reference, even if the spec adds more.
const INTERNAL_SCHEMES = new Set(['gateway-secret', 'consumer']);
const INTERNAL_HEADERS = new Set(['x-gateway-secret', 'x-consumer-username']);
spec.components = spec.components || {};
spec.components.securitySchemes = {
  apiKey: {
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'API key',
    description: 'Your Cosmos Pay secret API key, sent as `Authorization: Bearer <apiKey>`.',
  },
};
spec.security = [{ apiKey: [] }];

// The server's top-level `info.description` also narrates the internal gateway handshake; drop
// any sentence that mentions it and state the public auth instead. (Rendered atop every tag page.)
if (spec.info && typeof spec.info.description === 'string') {
  const kept = spec.info.description
    .split(/(?<=\.)\s+/)
    .filter((s) => !/x-gateway-secret|x-consumer-username|apisix|gateway/i.test(s));
  spec.info.description = [
    ...kept,
    'Authenticate every request with your secret API key in the `Authorization: Bearer <apiKey>` header.',
  ]
    .join(' ')
    .trim();
}

for (const methods of Object.values(spec.paths || {})) {
  for (const op of Object.values(methods)) {
    if (!op || typeof op !== 'object') continue;
    if (Array.isArray(op.security)) {
      op.security = op.security.filter((s) => !Object.keys(s).some((k) => INTERNAL_SCHEMES.has(k)));
      if (op.security.length === 0) delete op.security;
    }
    if (Array.isArray(op.parameters)) {
      op.parameters = op.parameters.filter(
        (p) => !(p && p.in === 'header' && INTERNAL_HEADERS.has(String(p.name).toLowerCase())),
      );
    }
  }
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
