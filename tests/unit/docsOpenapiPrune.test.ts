/**
 * docs/src/lib/openapi-prune.ts: the OpenAPI document an API reference page hands its client
 * component, reduced to that page's operations.
 *
 * The client props are serialized into the page's HTML, and handing over the whole document made
 * every API page carry the whole API (about 620 KB). A pruned document that lost a component one
 * of its operations reaches would break that page in the browser (fumadocs resolves `$ref`s
 * lazily, while rendering), so every `$ref` left in it must resolve.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { pruneOpenAPIDocument } from '../../docs/src/lib/openapi-prune.ts';

type Json = Record<string, unknown>;

function refsOf(node: unknown, out: string[] = []): string[] {
  if (Array.isArray(node)) node.forEach((item) => refsOf(item, out));
  else if (node && typeof node === 'object') {
    for (const [key, value] of Object.entries(node)) {
      if (key === '$ref' && typeof value === 'string') out.push(value);
      else refsOf(value, out);
    }
  }
  return out;
}

function resolves(doc: Json, ref: string): boolean {
  let node: unknown = doc;
  for (const segment of ref.slice(2).split('/')) {
    const key = segment.replace(/~1/g, '/').replace(/~0/g, '~');
    if (!node || typeof node !== 'object' || !(key in node)) return false;
    node = (node as Json)[key];
  }
  return true;
}

const spec: Json = {
  openapi: '3.1.0',
  info: { title: 'API', version: '1', description: 'A long description nobody renders.' },
  servers: [{ url: 'https://api.example.com' }],
  security: [{ bearer: [] }],
  tags: [{ name: 'a' }, { name: 'b' }],
  externalDocs: { url: 'https://example.com' },
  paths: {
    '/a/{id}': {
      parameters: [{ $ref: '#/components/parameters/Id' }],
      get: {
        tags: ['a'],
        responses: {
          '200': { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/A' } } } },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
      delete: { tags: ['b'], responses: { '204': { description: 'Gone' } } },
    },
    '/b': {
      post: {
        tags: ['b'],
        requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/B' } } } },
        responses: { '201': { description: 'Created' } },
      },
    },
  },
  webhooks: {
    paid: { post: { requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/Event' } } } } } },
    other: { post: { requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/B' } } } } } },
  },
  components: {
    securitySchemes: { bearer: { type: 'http', scheme: 'bearer' } },
    parameters: { Id: { name: 'id', in: 'path', required: true, schema: { type: 'string' } } },
    responses: { Unauthorized: { description: 'No key', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } } },
    schemas: {
      A: { type: 'object', properties: { child: { $ref: '#/components/schemas/Child' }, list: { type: 'array', items: { $ref: '#/components/schemas/A' } } } },
      Child: { allOf: [{ $ref: '#/components/schemas/Leaf' }] },
      Leaf: { type: 'string' },
      Error: { type: 'object', properties: { message: { type: 'string' } } },
      B: { type: 'object', properties: { b: { type: 'string' } } },
      Event: { type: 'object', properties: { id: { type: 'string' } } },
      Unused: { type: 'object' },
    },
  },
};

test('keeps the operations of the page and the path-level fields they inherit', () => {
  const out = pruneOpenAPIDocument(spec, { operations: [{ path: '/a/{id}', method: 'get' }] }) as Json;
  assert.deepEqual(Object.keys(out.paths as Json), ['/a/{id}']);
  const item = (out.paths as Json)['/a/{id}'] as Json;
  assert.deepEqual(Object.keys(item).sort(), ['get', 'parameters']);
  assert.equal(out.webhooks, undefined);
});

test('follows references transitively, and nothing else', () => {
  const out = pruneOpenAPIDocument(spec, { operations: [{ path: '/a/{id}', method: 'GET' }] }) as Json;
  const components = out.components as Record<string, Json>;
  assert.deepEqual(Object.keys(components.schemas).sort(), ['A', 'Child', 'Error', 'Leaf']);
  assert.deepEqual(Object.keys(components.responses), ['Unauthorized']);
  assert.deepEqual(Object.keys(components.parameters), ['Id']);
  for (const ref of refsOf(out)) assert.ok(resolves(out, ref), `${ref} resolves`);
});

test('keeps the security schemes and what the UI reads at the top, drops the rest', () => {
  const out = pruneOpenAPIDocument(spec, { operations: [{ path: '/b', method: 'post' }] }) as Json;
  assert.deepEqual((out.components as Json).securitySchemes, (spec.components as Json).securitySchemes);
  assert.deepEqual(out.info, { title: 'API', version: '1' });
  assert.deepEqual(out.servers, spec.servers);
  assert.deepEqual(out.security, spec.security);
  assert.equal(out.openapi, '3.1.0');
  assert.equal(out.tags, undefined);
  assert.equal(out.externalDocs, undefined);
});

test('keeps the webhooks of the page', () => {
  const out = pruneOpenAPIDocument(spec, { webhooks: [{ name: 'paid', method: 'post' }] }) as Json;
  assert.deepEqual(Object.keys(out.webhooks as Json), ['paid']);
  assert.deepEqual(Object.keys((out.components as Record<string, Json>).schemas), ['Event']);
  assert.deepEqual(out.paths, {});
});

test('leaves the document it was given untouched', () => {
  const before = JSON.stringify(spec);
  pruneOpenAPIDocument(spec, { operations: [{ path: '/a/{id}', method: 'get' }] });
  assert.equal(JSON.stringify(spec), before);
});

test('every API reference page of docs/openapi.json gets a document whose references all resolve', () => {
  const doc = JSON.parse(fs.readFileSync(new URL('../../docs/openapi.json', import.meta.url), 'utf8')) as Json;
  const byTag = new Map<string, { path: string; method: string }[]>();
  for (const [path, item] of Object.entries(doc.paths as Record<string, Json>)) {
    for (const [method, op] of Object.entries(item)) {
      const tags = (op as { tags?: string[] })?.tags;
      for (const tag of tags ?? []) byTag.set(tag, [...(byTag.get(tag) ?? []), { path, method }]);
    }
  }
  assert.ok(byTag.size > 10);
  const full = JSON.stringify(doc).length;
  for (const [tag, operations] of byTag) {
    const out = pruneOpenAPIDocument(doc, { operations }) as Json;
    const methods = new Set(['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace']);
    const kept = Object.values(out.paths as Record<string, Json>).reduce(
      (n, item) => n + Object.keys(item).filter((key) => methods.has(key)).length,
      0,
    );
    assert.equal(kept, operations.length, `${tag}: every operation kept`);
    for (const ref of refsOf(out)) assert.ok(resolves(out, ref), `${tag}: ${ref} resolves`);
    assert.ok(JSON.stringify(out).length < full / 4, `${tag}: a fraction of the document`);
  }
});
