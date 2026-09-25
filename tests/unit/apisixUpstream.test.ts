/* apisixUpstream.test.ts — the pure half of the APISIX route sync (src/lib/apisix-upstream.ts).

   The single-upstream case is asserted first and most carefully: it is what every deployment
   already runs, and a change that "added replicas" by altering the one node it produces would
   move production's gateway with nothing else in the build noticing. */
import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import { normalizeUpstreamHost, rewriteLeavesPath, routeHost, upstreamNodes } from '@/lib/apisix-upstream';

test('one upstream produces exactly the node it always did', () => {
  assert.deepEqual(upstreamNodes('http://localhost:3000'), { 'localhost:3000': 1 });
  assert.deepEqual(upstreamNodes('"community:3000"'), { 'community:3000': 1 });
  assert.deepEqual(upstreamNodes('https://api.example.com'), { 'api.example.com:443': 1 });
  assert.equal(normalizeUpstreamHost('http://api.example.com'), 'api.example.com:80');
});

test('a comma-separated list is one equal-weight node per replica', () => {
  assert.deepEqual(upstreamNodes('10.0.0.1:3000, 10.0.0.2:3000 ,10.0.0.3:3000'), {
    '10.0.0.1:3000': 1,
    '10.0.0.2:3000': 1,
    '10.0.0.3:3000': 1,
  });
});

test('empty entries are skipped and duplicates do not double a share', () => {
  assert.deepEqual(upstreamNodes('a:1,,a:1, '), { 'a:1': 1 });
  assert.deepEqual(upstreamNodes(''), {});
});

test('the default rewrite leaves the stellar.toml path alone', () => {
  assert.equal(rewriteLeavesPath('^/cosmos-api/(.*)', '/.well-known/stellar.toml'), true);
  assert.equal(rewriteLeavesPath('^/(.*)', '/.well-known/stellar.toml'), false);
  // A pattern JS cannot compile is treated as touching it: refuse on a doubt.
  assert.equal(rewriteLeavesPath('(', '/.well-known/stellar.toml'), false);
});

test('a route host is a bare lowercase hostname, whatever was pasted', () => {
  assert.equal(routeHost('https://Recovery-A.example.com/cosmos-api'), 'recovery-a.example.com');
  assert.equal(routeHost('recovery-b.example.com:8443'), 'recovery-b.example.com');
  assert.equal(routeHost('recovery-b.example.com'), 'recovery-b.example.com');
});
