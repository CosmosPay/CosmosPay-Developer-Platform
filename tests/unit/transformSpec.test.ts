/**
 * docs/scripts/transform-spec.mjs — the docs site's view of the community server's spec.
 *
 * It rewrites auth for a public audience, and that rewrite is where the reference once
 * started telling readers to send an API key to routes that take none: an empty
 * `security: []` was treated as "nothing left" and deleted, so every public route inherited
 * the document-level key requirement.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { transformSpec } from '../../docs/scripts/transform-spec.mjs';

function spec(paths: Record<string, unknown>, tags: string[] = ['health']) {
  return {
    openapi: '3.0.0',
    info: { title: 't', version: '1', description: 'Send X-Gateway-Secret. Hello.' },
    servers: [{ url: 'http://localhost:{port}' }],
    security: [{ 'gateway-secret': [], consumer: [] }, { 'api-key': [] }],
    components: {
      securitySchemes: {
        'api-key': { type: 'http', scheme: 'bearer' },
        'gateway-secret': { type: 'apiKey', in: 'header', name: 'X-Gateway-Secret' },
        consumer: { type: 'apiKey', in: 'header', name: 'X-Consumer-Username' },
        'sep-token': { type: 'http', scheme: 'bearer' },
      },
    },
    paths: Object.fromEntries(
      Object.entries(paths).map(([p, op]) => [p, { get: { tags, responses: {}, ...(op as object) } }]),
    ),
  };
}

test('a public route keeps saying it needs nothing', () => {
  const out = transformSpec(spec({ '/v1/health/liveness': { security: [] } }));
  assert.deepEqual(out.paths['/v1/health/liveness'].get.security, []);
});

test("SEP-30's own token survives; the gateway's schemes do not", () => {
  const out = transformSpec(spec({ '/v1/sep30/accounts': { security: [{ 'sep-token': [] }] } }, ['recovery']));
  assert.deepEqual(out.paths['/v1/sep30/accounts'].get.security, [{ 'sep-token': [] }]);
  assert.deepEqual(Object.keys(out.components.securitySchemes).sort(), ['apiKey', 'sep-token']);
});

test('a route that only named internal schemes inherits the API key', () => {
  const out = transformSpec(spec({ '/v1/swaps': { security: [{ consumer: [] }] } }, ['swaps']));
  assert.equal(out.paths['/v1/swaps'].get.security, undefined);
  assert.deepEqual(out.security, [{ apiKey: [] }]);
});

test('the internal headers never reach the reference', () => {
  const out = transformSpec(
    spec({ '/v1/swaps': { parameters: [{ in: 'header', name: 'X-Gateway-Secret' }, { in: 'query', name: 'take' }] } }, ['swaps']),
  );
  assert.deepEqual(out.paths['/v1/swaps'].get.parameters, [{ in: 'query', name: 'take' }]);
  assert.doesNotMatch(out.info.description, /gateway/i);
});

test('a localhost-only server list becomes the public gateway', () => {
  assert.deepEqual(transformSpec(spec({})).servers, [{ url: 'https://api.cosmospay.lat/cosmos-api', description: 'Cosmos Pay API' }]);
});

test('a tag the docs do not describe is an error, not an untitled page', () => {
  assert.throws(() => transformSpec(spec({ '/v1/new': {} }, ['brand-new'])), /brand-new/);
});

test('the input is not mutated', () => {
  const input = spec({ '/v1/health/liveness': { security: [] } });
  const before = JSON.stringify(input);
  transformSpec(input);
  assert.equal(JSON.stringify(input), before);
});
