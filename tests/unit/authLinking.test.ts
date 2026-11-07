import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { ACCOUNT_LINKING, AUTH_ERROR_PATH, authErrorKind, displayCode, type AuthErrorKind } from '@/lib/auth-linking';
import { messages } from '@/lib/i18n/messages/index';
import { ownerOf } from '@/lib/hosts';

const AUTH_SOURCE = readFileSync(path.join(import.meta.dirname, '..', '..', 'src', 'lib', 'auth.ts'), 'utf8');

test('an Authentik sign-in links by email only when both sides are verified, never to another address', () => {
  assert.equal(ACCOUNT_LINKING.enabled, true);
  // The local-row gate stays at Better Auth's default (on): it stops a row someone created first
  // with a victim's unconfirmed address from receiving the victim's identity.
  assert.equal('requireLocalEmailVerified' in ACCOUNT_LINKING, false, 'the local verification gate stays on');
  assert.equal('trustedProviders' in ACCOUNT_LINKING, false, 'no provider is trusted to skip the verification');
  assert.equal('allowDifferentEmails' in ACCOUNT_LINKING, false, 'a link never moves a user to another address');
});

test('auth.ts hands that policy to Better Auth and trusts no provider (the 2026-10-11 takeovers)', () => {
  assert.match(AUTH_SOURCE, /accountLinking:\s*ACCOUNT_LINKING/);
  assert.doesNotMatch(AUTH_SOURCE, /trustedProviders\s*:/);
  assert.match(AUTH_SOURCE, /errorURL:\s*new URL\(AUTH_ERROR_PATH, BETTER_AUTH_URL\)/);
});

test("a failed sign-in's code picks what the page says", () => {
  const cases: Array<[string | null, AuthErrorKind]> = [
    ['account_not_linked', 'notLinked'],
    ['unable_to_link_account', 'notLinked'],
    ['email_not_verified', 'notLinked'],
    ['ACCOUNT_NOT_LINKED', 'notLinked'],
    ['email_not_found', 'noEmail'],
    ['email_does_not_match', 'noEmail'],
    ['access_denied', 'cancelled'],
    ['invalid_code', 'generic'],
    ['', 'generic'],
    [null, 'generic'],
  ];
  for (const [code, kind] of cases) assert.equal(authErrorKind(code), kind, String(code));
});

test('the code shown to quote to support keeps letters, digits and underscores only', () => {
  assert.equal(displayCode('account_not_linked'), 'account_not_linked');
  assert.equal(displayCode('<script>alert(1)</script>'), 'scriptalert1script');
  assert.equal(displayCode('x'.repeat(200))?.length, 64);
  assert.equal(displayCode(''), null);
  assert.equal(displayCode(null), null);
});

test('every language says what to do for every kind of failure', () => {
  const kinds: AuthErrorKind[] = ['notLinked', 'noEmail', 'cancelled', 'generic'];
  for (const [lang, catalog] of Object.entries(messages as Record<string, typeof messages.en>)) {
    const t = catalog.signInError;
    for (const key of [...kinds, 'title', 'retry', 'support'] as const) assert.ok(t[key]?.trim(), `${lang} signInError.${key}`);
    assert.ok(t.code.includes('{code}'), `${lang} signInError.code names the code`);
  }
});

test('the error page is the platform\'s, under /login, on every domain', () => {
  assert.equal(AUTH_ERROR_PATH, '/login/error');
  assert.equal(ownerOf(AUTH_ERROR_PATH), 'dev');
});
