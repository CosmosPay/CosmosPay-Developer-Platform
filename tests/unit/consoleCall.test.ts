/* consoleCall.test.ts — who may call the console legs (src/lib/console-call.ts).

   These legs make this platform email a stranger and mint an account with two live API
   keys, and the check below is the whole of their authorization. The dangerous direction is
   always the permissive one — an unset secret admitting everybody, a prefix accepted — so
   that is the side asserted. */
import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import {
  CONSOLE_INTERNAL_HEADER,
  CONSOLE_SECRET_HEADER,
  RECOVERY_SECRET_HEADER,
  fallbackName,
  isConsoleCall,
  isRecoveryConsoleCall,
  recoverySecrets,
} from '@/lib/console-call';

/* ---------------------------- the console legs ---------------------------- */

/*
 * `isConsoleCall` decides who may make this platform send a stranger an email and mint an
 * account with two live API keys. The permissive direction is the dangerous one, so it is
 * the side asserted — and the first case below is the one that would have been a hole on
 * every deployment that had never heard of the community server.
 */
const CONSOLE_SECRET = 'a-console-secret-long-enough-to-be-real';

function headers(values: Record<string, string>): Headers {
  return new Headers(values);
}

const goodHeaders = () =>
  headers({ [CONSOLE_INTERNAL_HEADER]: '1', [CONSOLE_SECRET_HEADER]: CONSOLE_SECRET });

test('an unconfigured secret admits nobody, not everybody', () => {
  assert.equal(isConsoleCall(goodHeaders(), ''), false);
  assert.equal(isConsoleCall(goodHeaders(), '   '), false);
  // The shape that would match if an empty secret were compared to an empty header.
  assert.equal(isConsoleCall(headers({ [CONSOLE_INTERNAL_HEADER]: '1' }), ''), false);
});

test('the community server is admitted', () => {
  assert.equal(isConsoleCall(goodHeaders(), CONSOLE_SECRET), true);
  assert.equal(isConsoleCall(headers({ [CONSOLE_INTERNAL_HEADER]: 'true', [CONSOLE_SECRET_HEADER]: CONSOLE_SECRET }), CONSOLE_SECRET), true);
});

test('both signals are required — each answers a different question', () => {
  // A leaked secret presented without the stripped marker: a client through the gateway.
  assert.equal(isConsoleCall(headers({ [CONSOLE_SECRET_HEADER]: CONSOLE_SECRET }), CONSOLE_SECRET), false);
  // The marker with no secret: a forged header from anywhere.
  assert.equal(isConsoleCall(headers({ [CONSOLE_INTERNAL_HEADER]: '1' }), CONSOLE_SECRET), false);
});

test('a marker that says "not internal" is not a marker', () => {
  for (const value of ['0', 'false', 'no', '']) {
    assert.equal(
      isConsoleCall(headers({ [CONSOLE_INTERNAL_HEADER]: value, [CONSOLE_SECRET_HEADER]: CONSOLE_SECRET }), CONSOLE_SECRET),
      false,
      `marker ${JSON.stringify(value)} must not grant`,
    );
  }
});

test('a wrong secret is refused, including a prefix of the right one', () => {
  const wrong = (v: string) =>
    isConsoleCall(headers({ [CONSOLE_INTERNAL_HEADER]: '1', [CONSOLE_SECRET_HEADER]: v }), CONSOLE_SECRET);
  assert.equal(wrong(CONSOLE_SECRET.slice(0, -1)), false);
  assert.equal(wrong(`${CONSOLE_SECRET}x`), false);
  assert.equal(wrong(CONSOLE_SECRET.toUpperCase()), false);
  assert.equal(wrong(''), false);
});

/* ------------------------- the recovery-code leg -------------------------- */

/*
 * `isRecoveryConsoleCall` decides who may make this platform send "recover your wallet"
 * mail. Two recovery servers, each with its own secret, so the configured value is a list —
 * and the cases that matter are the ones where a list that is empty, or holds only junk,
 * would otherwise match an absent header.
 */
const SECRET_A = 'recovery-a-secret-0123456789abcdef-long';
const SECRET_B = 'recovery-b-secret-fedcba9876543210-long';
const BOTH = `${SECRET_A}, ${SECRET_B}`;

const recovery = (value?: string) =>
  headers(value === undefined ? {} : { [RECOVERY_SECRET_HEADER]: value });

test('an unset secret list admits nobody', () => {
  assert.equal(isRecoveryConsoleCall(recovery(SECRET_A), ''), false);
  assert.equal(isRecoveryConsoleCall(recovery(''), ''), false);
  assert.equal(isRecoveryConsoleCall(recovery(), ''), false);
  assert.equal(isRecoveryConsoleCall(recovery(), ' , ,'), false);
});

test('entries shorter than the floor are ignored, not honoured', () => {
  assert.deepEqual(recoverySecrets('short, also-short'), []);
  assert.equal(isRecoveryConsoleCall(recovery('short'), 'short'), false);
  assert.deepEqual(recoverySecrets(`short,${SECRET_A}`), [SECRET_A]);
});

test('a wrong secret is refused, including a prefix and an absent header', () => {
  assert.equal(isRecoveryConsoleCall(recovery(), BOTH), false);
  assert.equal(isRecoveryConsoleCall(recovery(''), BOTH), false);
  assert.equal(isRecoveryConsoleCall(recovery(SECRET_A.slice(0, -1)), BOTH), false);
  assert.equal(isRecoveryConsoleCall(recovery(`${SECRET_A}x`), BOTH), false);
  assert.equal(isRecoveryConsoleCall(recovery(BOTH), BOTH), false);
  // The gateway secret header is a different credential and never stands in for this one.
  assert.equal(isRecoveryConsoleCall(headers({ [CONSOLE_SECRET_HEADER]: SECRET_A }), BOTH), false);
});

test('either configured recovery server is admitted', () => {
  assert.equal(isRecoveryConsoleCall(recovery(SECRET_A), BOTH), true);
  assert.equal(isRecoveryConsoleCall(recovery(SECRET_B), BOTH), true);
  assert.equal(isRecoveryConsoleCall(recovery(SECRET_A), SECRET_A), true);
});

/* ------------------------------ display name ------------------------------ */

test('the fallback name prefers the given one, then the mailbox', () => {
  assert.equal(fallbackName('ada@example.com', ' Ada '), 'Ada');
  assert.equal(fallbackName('ada@example.com', null), 'ada');
  assert.equal(fallbackName('ada@example.com', '   '), 'ada');
});
