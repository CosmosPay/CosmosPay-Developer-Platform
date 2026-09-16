/* sealedBox.test.ts — the box a social login's Pollar session waits in while the person
   proves the account's inbox with an emailed code. A session is a bearer credential for a
   custodial wallet, so what matters is that nothing but the right secret AND the right
   purpose opens it, and that a modified box is refused rather than decrypted into
   something else. */
import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import { openJson, sealJson } from '@/lib/sealed-box';

const SECRET = 'test-secret-with-enough-entropy-for-hkdf';
const PURPOSE = 'social-login-held-session';

test('round-trips a value under the same secret and purpose', () => {
  const value = { session: { access_token: 'at_1' }, activated: true, activationAmount: null };
  assert.deepEqual(openJson(sealJson(value, SECRET, PURPOSE), SECRET, PURPOSE), value);
});

test('never stores the value in the clear', () => {
  const sealed = sealJson({ access_token: 'at_secret_value' }, SECRET, PURPOSE);
  const body = Buffer.from(sealed.split('.')[3] ?? '', 'base64url').toString('utf8');
  assert.equal(sealed.includes('at_secret_value'), false);
  assert.equal(body.includes('at_secret_value'), false);
});

test('does not open under another secret or for another purpose', () => {
  const sealed = sealJson({ a: 1 }, SECRET, PURPOSE);
  assert.equal(openJson(sealed, 'another-secret-entirely', PURPOSE), null);
  assert.equal(openJson(sealed, SECRET, 'another-purpose'), null);
});

test('refuses a modified box instead of decrypting it to something else', () => {
  const parts = sealJson({ a: 1 }, SECRET, PURPOSE).split('.');
  const body = Buffer.from(parts[3] ?? '', 'base64url');
  body[0] = (body[0] ?? 0) ^ 0xff;
  assert.equal(openJson([parts[0], parts[1], parts[2], body.toString('base64url')].join('.'), SECRET, PURPOSE), null);
});

test('refuses a truncated tag rather than checking less', () => {
  const parts = sealJson({ a: 1 }, SECRET, PURPOSE).split('.');
  const shortTag = Buffer.from(parts[2] ?? '', 'base64url').subarray(0, 4).toString('base64url');
  assert.equal(openJson([parts[0], parts[1], shortTag, parts[3]].join('.'), SECRET, PURPOSE), null);
});

test('seals the same value differently every time', () => {
  assert.notEqual(sealJson({ a: 1 }, SECRET, PURPOSE), sealJson({ a: 1 }, SECRET, PURPOSE));
});

test('returns null for anything that is not a box', () => {
  for (const junk of ['', 'v1', 'v2.a.b.c', 'v1.a.b.c.d', 'not a box at all']) {
    assert.equal(openJson(junk, SECRET, PURPOSE), null);
  }
});
