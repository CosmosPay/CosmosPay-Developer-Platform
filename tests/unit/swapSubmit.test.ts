/* swapSubmit.test.ts: what a swap's submit takes (src/schemas/swaps.ts) and when the screens ask
   again (src/lib/swap-api.ts). A Monad swap a browser wallet sent itself is submitted by its hash
   (EVM wallets only send, they never hand a signed transaction back), and a hash the Payments API's
   node does not know yet is a 400 `transaction_not_found` that records nothing: ask again. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { submitSwapBodySchema } from '@/schemas/swaps';
import { isRetryLater, OrgSwapError, PublicSwapError } from '@/lib/swap-api';

const HASH = `0x${'ab'.repeat(32)}`;

test('a submit takes exactly one of signedXdr, signedTransaction or txHash', () => {
  assert.ok(submitSwapBodySchema.safeParse({ signedXdr: 'AAAA' }).success);
  assert.ok(submitSwapBodySchema.safeParse({ signedTransaction: 'AQAB' }).success);
  assert.ok(submitSwapBodySchema.safeParse({ txHash: HASH }).success);
  assert.ok(!submitSwapBodySchema.safeParse({}).success);
  assert.ok(!submitSwapBodySchema.safeParse({ signedTransaction: 'AQAB', txHash: HASH }).success);
  assert.ok(!submitSwapBodySchema.safeParse({ signedXdr: 'AAAA', txHash: HASH }).success);
});

test('a txHash is a 0x-prefixed 32-byte hex hash', () => {
  assert.ok(!submitSwapBodySchema.safeParse({ txHash: 'ab'.repeat(32) }).success);
  assert.ok(!submitSwapBodySchema.safeParse({ txHash: `0x${'ab'.repeat(31)}` }).success);
  assert.ok(!submitSwapBodySchema.safeParse({ txHash: `0x${'zz'.repeat(32)}` }).success);
  assert.equal(submitSwapBodySchema.parse({ txHash: ` ${HASH} ` }).txHash, HASH);
});

test('only a 400 transaction_not_found is asked again', () => {
  const later = "No transaction with this hash on the service's node. Retry in a few seconds; nothing was recorded.";
  // The public pages read the gateway's code; the dashboard's proxy keeps only the message.
  assert.ok(isRetryLater(new PublicSwapError(later, 400, 'transaction_not_found')));
  assert.ok(isRetryLater(new OrgSwapError(later, 400, 400)));
  assert.ok(!isRetryLater(new PublicSwapError('txHash is not the call built for this swap: to', 400, 'validation_failed')));
  assert.ok(!isRetryLater(new PublicSwapError(later, 502, 'bad_gateway')));
  assert.ok(!isRetryLater(new Error(later)));
  assert.ok(!isRetryLater(null));
});
