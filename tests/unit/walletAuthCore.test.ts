/* walletAuthCore.test.ts — the rules of the wallet's own sign-in (src/lib/wallet-auth-core.ts).

   Each of these decides who gets an account, whose backup comes back, or what a signature
   has to cover. The dangerous direction is always the permissive one — an unverified email
   accepted, a stale token honoured, a weak box stored — so that is the side asserted. */
import { strict as assert } from 'node:assert';
import { createHash } from 'node:crypto';
import { test } from 'node:test';

import {
  BACKUP_MIN_ITERATIONS,
  SESSION_TTL_MS,
  SIGNED_AT_SKEW_MS,
  authorizationUrl,
  backupMessage,
  callbackUrl,
  finishMessage,
  githubIdentity,
  googleIdentity,
  isBackupBox,
  issueSessionToken,
  pkceMatches,
  readSessionToken,
  signedAtFresh,
  sixDigitCode,
} from '@/lib/wallet-auth-core';

const SECRET = 'test-secret-with-enough-entropy-for-hkdf';

/* ---------------------------------- PKCE ---------------------------------- */

// RFC 7636 appendix B, verbatim: the published vector, not one computed by the code under test.
const RFC_VERIFIER = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
const RFC_CHALLENGE = 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM';

test('PKCE accepts the RFC 7636 test vector', () => {
  assert.equal(pkceMatches(RFC_VERIFIER, RFC_CHALLENGE), true);
});

test('PKCE refuses any other verifier, including the challenge itself', () => {
  assert.equal(pkceMatches(RFC_VERIFIER + 'x', RFC_CHALLENGE), false);
  // `plain` would accept this; S256 is the only method there is here.
  assert.equal(pkceMatches(RFC_CHALLENGE, RFC_CHALLENGE), false);
  assert.equal(pkceMatches('', RFC_CHALLENGE), false);
});

/* ------------------------------- providers -------------------------------- */

test('the authorization URL carries the state, the redirect and the scopes', () => {
  const url = new URL(
    authorizationUrl('google', { clientId: 'cid', redirectUri: callbackUrl('https://dev.cosmospay.lat/', 'google'), state: 'st' }),
  );
  assert.equal(url.origin + url.pathname, 'https://accounts.google.com/o/oauth2/v2/auth');
  assert.equal(url.searchParams.get('state'), 'st');
  assert.equal(url.searchParams.get('redirect_uri'), 'https://dev.cosmospay.lat/api/wallet/auth/oauth/callback/google');
  assert.equal(url.searchParams.get('response_type'), 'code');
  assert.match(url.searchParams.get('scope') ?? '', /\bemail\b/);
  // Always ask which account: a wallet must not silently take whichever one is signed in.
  assert.equal(url.searchParams.get('prompt'), 'select_account');
});

test('Google: only a verified email is an identity', () => {
  const base = { sub: '123', email: 'Ada@Example.com', name: 'Ada', picture: 'https://x.test/a.png' };
  const ok = googleIdentity({ ...base, email_verified: true });
  assert.deepEqual(ok, {
    ok: true,
    identity: { email: 'ada@example.com', name: 'Ada', avatar: 'https://x.test/a.png', subject: '123' },
  });
  assert.deepEqual(googleIdentity({ ...base, email_verified: false }), { ok: false, error: 'email_unverified' });
  // A string "true" is not `true`: the claim has to be exactly what OIDC says it is.
  assert.deepEqual(googleIdentity({ ...base, email_verified: 'true' }), { ok: false, error: 'email_unverified' });
  assert.deepEqual(googleIdentity({ email: 'a@b.c', email_verified: true }), { ok: false, error: 'profile_invalid' });
});

test('Google: a non-https avatar is dropped, not rendered', () => {
  const r = googleIdentity({ sub: '1', email: 'a@b.c', email_verified: true, picture: 'javascript:alert(1)' });
  assert.equal(r.ok && r.identity.avatar, null);
});

test('GitHub: the verified primary email wins; the public profile email never counts', () => {
  const user = { id: 42, login: 'ada', name: null, email: 'public@elsewhere.test', avatar_url: 'https://gh.test/a' };
  const emails = [
    { email: 'old@example.com', verified: true, primary: false },
    { email: 'Main@Example.com', verified: true, primary: true },
  ];
  assert.deepEqual(githubIdentity(user, emails), {
    ok: true,
    identity: { email: 'main@example.com', name: 'ada', avatar: 'https://gh.test/a', subject: '42' },
  });
});

test('GitHub: an unverified primary falls back to a verified one, and none means no identity', () => {
  const user = { id: 7, login: 'x' };
  const fallback = githubIdentity(user, [
    { email: 'primary@x.test', verified: false, primary: true },
    { email: 'second@x.test', verified: true, primary: false },
  ]);
  assert.equal(fallback.ok && fallback.identity.email, 'second@x.test');
  assert.deepEqual(githubIdentity(user, [{ email: 'p@x.test', verified: false, primary: true }]), {
    ok: false,
    error: 'email_unverified',
  });
  assert.deepEqual(githubIdentity(user, null), { ok: false, error: 'email_unverified' });
});

/* ----------------------------- session token ------------------------------ */

const IDENTITY = { email: 'ada@example.com', name: 'Ada', avatar: null, method: 'google' as const };

test('a session token round-trips the identity it was issued for', () => {
  const now = Date.now();
  assert.deepEqual(readSessionToken(issueSessionToken(IDENTITY, SECRET, now), SECRET, now), IDENTITY);
});

test('a session token dies at its expiry', () => {
  const now = Date.now();
  const token = issueSessionToken(IDENTITY, SECRET, now);
  assert.notEqual(readSessionToken(token, SECRET, now + SESSION_TTL_MS - 1), null);
  assert.equal(readSessionToken(token, SECRET, now + SESSION_TTL_MS + 1), null);
});

test('a session token does not open under another secret, and cannot be edited', () => {
  const token = issueSessionToken(IDENTITY, SECRET);
  assert.equal(readSessionToken(token, 'another-secret-entirely'), null);
  const parts = token.split('.');
  const body = Buffer.from(parts[3] ?? '', 'base64url');
  body[0] = (body[0] ?? 0) ^ 0x01;
  assert.equal(readSessionToken([parts[0], parts[1], parts[2], body.toString('base64url')].join('.'), SECRET), null);
  assert.equal(readSessionToken('not-a-token', SECRET), null);
});

/* ------------------------------- signatures ------------------------------- */

test('the finish and backup messages are distinct and pinned byte for byte', () => {
  // The wallet builds these same strings; a drift on either side is a sign-in that cannot finish.
  assert.equal(
    finishMessage(' Ada@Example.com ', 'GABC', '2026-09-19T12:00:00.000Z'),
    'Cosmos Pay Wallet sign-in\nemail: ada@example.com\naccount: GABC\nat: 2026-09-19T12:00:00.000Z',
  );
  const box = '{"v":2}';
  assert.equal(
    backupMessage('GABC', box, '2026-09-19T12:00:00.000Z'),
    `Cosmos Pay Wallet backup\naccount: GABC\nbox: ${createHash('sha256').update(box).digest('hex')}\nat: 2026-09-19T12:00:00.000Z`,
  );
});

test('a signed timestamp is accepted only inside the skew window, and only in ISO UTC', () => {
  const now = Date.parse('2026-09-19T12:00:00.000Z');
  assert.equal(signedAtFresh('2026-09-19T12:00:00.000Z', now), true);
  assert.equal(signedAtFresh(new Date(now - SIGNED_AT_SKEW_MS + 1000).toISOString(), now), true);
  assert.equal(signedAtFresh(new Date(now - SIGNED_AT_SKEW_MS - 1000).toISOString(), now), false);
  assert.equal(signedAtFresh(new Date(now + SIGNED_AT_SKEW_MS + 1000).toISOString(), now), false);
  assert.equal(signedAtFresh('2026-09-19 12:00:00', now), false);
  assert.equal(signedAtFresh('1758283200', now), false);
});

/* --------------------------------- backup --------------------------------- */

const b64 = (n: number) => Buffer.alloc(n, 7).toString('base64');
const box = (patch: Record<string, unknown> = {}) =>
  JSON.stringify({ v: 2, salt: b64(16), iv: b64(12), data: b64(64), iter: 1_000_000, ...patch });

test('a box shaped like the wallet writes it is accepted', () => {
  assert.equal(isBackupBox(box()), true);
});

test('a box below the KDF floor is refused — it would sit here close to plaintext', () => {
  assert.equal(isBackupBox(box({ iter: BACKUP_MIN_ITERATIONS - 1 })), false);
  assert.equal(isBackupBox(box({ iter: undefined })), false);
  assert.equal(isBackupBox(box({ iter: '1000000' })), false);
});

test('anything that is not the wallet box is refused', () => {
  assert.equal(isBackupBox(box({ v: 1 })), false);
  assert.equal(isBackupBox(box({ iv: b64(16) })), false);
  assert.equal(isBackupBox(box({ salt: b64(4) })), false);
  assert.equal(isBackupBox(box({ data: 'not base64!' })), false);
  assert.equal(isBackupBox('the seed words in plain text'), false);
  assert.equal(isBackupBox('[]'), false);
  assert.equal(isBackupBox(box({ data: b64(9000) })), false);
});

test('codes are six digits', () => {
  for (let i = 0; i < 50; i++) assert.match(sixDigitCode(), /^\d{6}$/);
});
