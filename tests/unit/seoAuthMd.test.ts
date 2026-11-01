import { test } from 'node:test';
import assert from 'node:assert/strict';
import { authMd } from '@/lib/seo/auth-md';
import { swapFeePct } from '@/lib/plans';
import { isSlashlessDocsLink } from '@/lib/urls';

const INPUT = {
  site: 'https://cosmospay.lat',
  dev: 'https://dev.cosmospay.lat',
  payments: 'https://payments.cosmospay.lat',
  apiBase: 'https://api.cosmospay.lat/cosmos-api',
  contact: 'organization@cosmospay.lat',
};
const text = authMd(INPUT);

test('it opens with an H1 that names auth.md, as the convention and the readiness check ask', () => {
  assert.match(text, /^# Cosmos Pay auth\.md\n\n\S/);
  assert.equal((text.match(/^# /gm) ?? []).length, 1);
  assert.ok(text.endsWith('\n'));
});

test('it says plainly that there is no OAuth flow for agents, and names the two methods', () => {
  assert.match(text, /Cosmos Pay has no OAuth or OpenID Connect flow for agents today/);
  assert.match(text, /^Authorization: Bearer <API key>$/m);
  assert.match(text, /^## Method 1: an API key from the dashboard$/m);
  assert.match(text, /^## Method 2: the shared public key \(no account\)$/m);
  // Nothing that implies the discovery documents the product does not have.
  assert.doesNotMatch(text, /oauth-authorization-server|oauth-protected-resource|agent_auth|register_uri|mcp|agent-card/i);
});

test('the API key: made by a person in the dashboard, never their password, the prefixes and scopes the code uses', () => {
  assert.ok(text.includes('Cosmos Pay Payments API (https://api.cosmospay.lat/cosmos-api/v1)'));
  assert.ok(text.includes('sign in to the developer platform at https://dev.cosmospay.lat'));
  assert.match(text, /Authentik/);
  assert.match(text, /Never ask a person for their password/);
  assert.match(text, /`dv_` keys are test keys/);
  assert.match(text, /`prod_` keys are live keys \(mainnet\)/);
  assert.match(text, /`resource:action`/);
  assert.match(text, /403 `insufficient_scope`/);
});

test('the shared public key: where it comes from, what it reaches, its record token and its rate', () => {
  assert.ok(text.includes('GET https://api.cosmospay.lat/cosmos-api/v1/public-key?env=prod'));
  assert.ok(text.includes('`{ "env": "prod", "apiKey": "<key>" }`'));
  assert.match(text, /`x-cosmos-public-key: true`/);
  assert.match(text, /`publicToken`/);
  assert.match(text, /Send it as `X-Record-Token`/);
  assert.ok(text.includes(`Its swaps pay the public commission, ${swapFeePct('community')} per swap`));
});

test('webhooks: the signature header and its HMAC-SHA256 over the timestamp and the raw body', () => {
  assert.ok(text.includes('`X-Cosmos-Signature: t=<unix seconds>,v1=<hex>`'));
  assert.ok(text.includes('HMAC-SHA256 of `<t>.<raw body>`'));
  assert.match(text, /`whsec_\.\.\.`/);
});

test('links are absolute, docs pages at their trailing-slash address, and nothing uses an em dash', () => {
  assert.doesNotMatch(text, /\u2014/);
  const links = [...text.matchAll(/\]\(([^)]+)\)/g)].map((m) => m[1]);
  assert.ok(links.length >= 10);
  for (const href of links) assert.match(href, /^https:\/\//, href);
  for (const href of links) assert.ok(!isSlashlessDocsLink(href, `${INPUT.dev}/docs/`), href);
  for (const url of [
    'https://dev.cosmospay.lat/docs/api-keys/',
    'https://dev.cosmospay.lat/docs/sdk/server/authentication/',
    'https://dev.cosmospay.lat/docs/api/public-key/',
    'https://dev.cosmospay.lat/docs/sdk/server/webhooks/',
    'https://dev.cosmospay.lat/docs/openapi.json',
    'https://dev.cosmospay.lat/docs/llms.txt',
    'https://cosmospay.lat/llms.txt',
    'https://payments.cosmospay.lat/llms.txt',
    'https://cosmospay.lat/.well-known/api-catalog',
    'https://cosmospay.lat/.well-known/agent-skills/index.json',
    'https://github.com/CosmosPay/CosmosPay-Skill',
  ]) {
    assert.ok(links.includes(url), url);
  }
});
