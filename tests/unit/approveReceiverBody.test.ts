/* approveReceiverBody.test.ts — the body both receiver-approval proxies accept.

   `expected_version` is what pins an approval to the dossier the reviewer actually read:
   an edit leaves the receiver in `pending_review`, so without a version the approval
   lands on whatever is stored when the request arrives and the reviewer cannot tell.
   It must survive the schema (an approval that silently dropped it would look like it
   worked), and it must stay optional — a receiver read from a Payments deployment that
   predates the field carries no version to send. */
import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import { approveReceiverBodySchema } from '@/schemas/cosmos-resources';

test('keeps the version the reviewer read', () => {
  const parsed = approveReceiverBodySchema.parse({
    redirect_url: 'https://app.cosmospay.lat/kyc/return/org/dev/rcv_1',
    expected_version: 3,
  });

  assert.equal(parsed.expected_version, 3);
  assert.equal(parsed.redirect_url, 'https://app.cosmospay.lat/kyc/return/org/dev/rcv_1');
});

test('accepts a body without a version, so an older receiver still approves', () => {
  const parsed = approveReceiverBodySchema.parse({
    redirect_url: 'https://app.cosmospay.lat/kyc/return/org/dev/rcv_1',
  });

  assert.equal(parsed.expected_version, undefined);
});

test('refuses a version that is not a whole number at least 1', () => {
  for (const expected_version of [0, -1, 1.5, '3', null]) {
    assert.equal(
      approveReceiverBodySchema.safeParse({
        redirect_url: 'https://app.cosmospay.lat/kyc/return/org/dev/rcv_1',
        expected_version,
      }).success,
      false,
      `${String(expected_version)} should be refused`,
    );
  }
});

test('still refuses a redirect_url that is not an absolute URL', () => {
  assert.equal(
    approveReceiverBodySchema.safeParse({ redirect_url: 'not-a-url', expected_version: 1 }).success,
    false,
  );
});
