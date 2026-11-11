import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  PAYMENTS_BASE_CSP,
  ZK_SCRIPT_POLICY_ENFORCED,
  inlineScriptHashes,
  scriptPolicy,
  scriptPolicyHeader,
  withScriptPolicy,
} from '@/lib/payments/csp';

const sha = (text: string) => `'sha256-${createHash('sha256').update(text, 'utf8').digest('base64')}'`;

test('every inline script a browser runs is hashed, and nothing else', () => {
  const html = [
    '<script>document.documentElement.classList.add("pl-anim");</script>',
    '<script type="module">import "/_astro/a.js";</script>',
    '<script type="text/javascript">one()</script>',
    '<SCRIPT TYPE="Module">two()</SCRIPT >',
    '<script type="application/ld+json">{"@context":"https://schema.org"}</script>',
    '<script type="application/json" id="checkout-i18n">{"a":"\\u003c"}</script>',
    '<script src="/embed/cosmos-pay.js" defer></script>',
    '<script type="module" src="/_astro/page.js"></script>',
    '<script data-src="x">three()</script>',
  ].join('\n');
  assert.deepEqual(inlineScriptHashes(html), [
    sha('document.documentElement.classList.add("pl-anim");'),
    sha('import "/_astro/a.js";'),
    sha('one()'),
    sha('two()'),
    sha('three()'),
  ]);
});

test('a script is hashed as the browser reads it: line endings normalised, repeats once', () => {
  const crlf = '<script>\r\n  a();\r\n  b();\r</script>';
  assert.deepEqual(inlineScriptHashes(crlf), [sha('\n  a();\n  b();\n')]);
  assert.deepEqual(inlineScriptHashes('<script>x()</script><script>x()</script>'), [sha('x()')]);
  assert.deepEqual(inlineScriptHashes('<p>no scripts</p>'), []);
});

test('the policy keeps the framing rules and allows only this origin, the nonce and the hashes', () => {
  const policy = scriptPolicy({ hashes: ["'sha256-AAA='"], nonce: 'n0nce', zk: false });
  assert.ok(policy.startsWith(PAYMENTS_BASE_CSP));
  assert.match(policy, /frame-ancestors 'none'/);
  assert.match(policy, /; script-src 'self' 'nonce-n0nce' 'sha256-AAA='; script-src-attr 'none'$/);
  assert.ok(!/unsafe-inline|unsafe-eval|wasm-unsafe-eval|\*|https:|data:|blob:/.test(policy.split('script-src')[1]), 'nothing wider');
  const zk = scriptPolicy({ hashes: [], nonce: 'n', zk: true });
  assert.match(zk, /script-src 'self' 'nonce-n' 'wasm-unsafe-eval'/);
  assert.match(zk, /worker-src 'self' blob:/);
  assert.ok(!/'unsafe-eval'/.test(zk));
});

test('the private checkout reports while it is not enforced; every other page enforces', () => {
  assert.equal(scriptPolicyHeader(false), 'Content-Security-Policy');
  assert.equal(scriptPolicyHeader(true), ZK_SCRIPT_POLICY_ENFORCED ? 'Content-Security-Policy' : 'Content-Security-Policy-Report-Only');
});

const page = (body: string, init: ResponseInit = {}) =>
  new Response(body, { status: 200, ...init, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Set-Cookie': 'a=1', ...(init.headers ?? {}) } });

test('an HTML page leaves with its policy and its body byte for byte', async () => {
  const body = '<html><head><script>go()</script></head><body>á</body></html>';
  const res = await withScriptPolicy(page(body, { headers: { 'Content-Security-Policy': PAYMENTS_BASE_CSP } }), { method: 'GET', zk: false });
  assert.equal(res.status, 200);
  assert.equal(await res.text(), body);
  assert.equal(res.headers.get('Set-Cookie'), 'a=1');
  const csp = res.headers.get('Content-Security-Policy')!;
  assert.ok(csp.includes(sha('go()')), csp);
  assert.match(csp, /'nonce-[A-Za-z0-9+/]{22}=='/);
  assert.equal(res.headers.get('Content-Security-Policy-Report-Only'), null);
});

test('each response gets its own nonce', async () => {
  const a = await withScriptPolicy(page('<p>a</p>'), { method: 'GET', zk: false });
  const b = await withScriptPolicy(page('<p>a</p>'), { method: 'GET', zk: false });
  const nonce = (r: Response) => /'nonce-([^']+)'/.exec(r.headers.get('Content-Security-Policy')!)![1];
  assert.notEqual(nonce(a), nonce(b));
});

test('the private checkout keeps the enforced base policy beside the reported one', async () => {
  const res = await withScriptPolicy(page('<script>prove()</script>'), { method: 'GET', zk: true });
  if (ZK_SCRIPT_POLICY_ENFORCED) return;
  assert.equal(res.headers.get('Content-Security-Policy'), PAYMENTS_BASE_CSP);
  assert.match(res.headers.get('Content-Security-Policy-Report-Only')!, /script-src 'self' 'nonce-[^']+' 'sha256-[^']+' 'wasm-unsafe-eval'/);
});

test('anything but a GET of an HTML page with a body is left as it was', async () => {
  const head = page('<script>a()</script>');
  assert.equal(await withScriptPolicy(head, { method: 'HEAD', zk: false }), head);
  const json = new Response('{}', { headers: { 'Content-Type': 'application/json' } });
  assert.equal(await withScriptPolicy(json, { method: 'GET', zk: false }), json);
  const js = new Response('x()', { headers: { 'Content-Type': 'text/javascript; charset=utf-8' } });
  assert.equal(await withScriptPolicy(js, { method: 'GET', zk: true }), js);
  const redirect = new Response(null, { status: 302, headers: { Location: '/x', 'Content-Type': 'text/html' } });
  assert.equal(await withScriptPolicy(redirect, { method: 'GET', zk: false }), redirect);
});
