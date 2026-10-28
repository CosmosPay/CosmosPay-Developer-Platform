/* updateCustomerBody.test.ts: the body a customer's edit sends. The form sends every field as it
   stands, so a customer with no email must save (an empty email clears it), and a wrong address
   must still be refused. */
import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import { updateCustomerBodySchema } from '@/schemas/cosmos-resources';

test('an empty email saves and clears it; null too', () => {
  const empty = updateCustomerBodySchema.safeParse({ name: 'Acme', alias: '', email: '', note: '' });
  assert.equal(empty.success, true);
  assert.equal(empty.success && empty.data.email, '');
  assert.equal(updateCustomerBodySchema.safeParse({ email: null }).success, true);
});

test('an email that is not one is still refused', () => {
  assert.equal(updateCustomerBodySchema.safeParse({ email: 'not-an-email' }).success, false);
  assert.equal(updateCustomerBodySchema.safeParse({ email: 'billing@acme.com' }).success, true);
});
