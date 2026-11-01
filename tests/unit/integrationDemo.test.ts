/* integrationDemo.test.ts covers the sample data of the integration options' demos
   (src/lib/payments/integration-demo.ts): the amount a visitor types, and the request, the
   answer and the webhook the API console prints. */
import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import {
  demoAmountLabel,
  demoCheckoutAddress,
  demoRequest,
  demoResponse,
  demoWebhook,
  isDemoAsset,
  parseDemoAmount,
  SAMPLE_LINK_ID,
} from '@/lib/payments/integration-demo';
import { isPaymentLinkId } from '@/lib/payments/payment-link';

const NOW = new Date('2026-10-25T14:20:31.456Z');

test('the sample link id is one the checkout accepts', () => {
  assert.ok(isPaymentLinkId(SAMPLE_LINK_ID));
});

test('an amount is read as the API spells it', () => {
  assert.deepEqual(parseDemoAmount('25'), { ok: true, amount: '25' });
  assert.deepEqual(parseDemoAmount('25.00'), { ok: true, amount: '25' });
  assert.deepEqual(parseDemoAmount(' 25,50 '), { ok: true, amount: '25.5' });
  assert.deepEqual(parseDemoAmount('007.1234567'), { ok: true, amount: '7.1234567' });
  assert.deepEqual(parseDemoAmount('0.5'), { ok: true, amount: '0.5' });
  // empty: the payer chooses
  assert.deepEqual(parseDemoAmount(''), { ok: true, amount: null });
  assert.deepEqual(parseDemoAmount('   '), { ok: true, amount: null });
});

test('an amount that is not one is refused', () => {
  for (const raw of ['0', '0.00', '-5', '1.12345678', 'abc', '1e3', '1.2.3', '.5', '5.', '1,000.50', '9999999999999']) {
    assert.deepEqual(parseDemoAmount(raw), { ok: false }, raw);
  }
});

test('the amount label has two decimals at least', () => {
  assert.equal(demoAmountLabel('25', 'USDC'), '25.00 USDC');
  assert.equal(demoAmountLabel('25.5', 'XLM'), '25.50 XLM');
  assert.equal(demoAmountLabel('7.1234567', 'USDC'), '7.1234567 USDC');
});

test('the assets', () => {
  assert.ok(isDemoAsset('USDC'));
  assert.ok(isDemoAsset('XLM'));
  assert.ok(!isDemoAsset('toString'));
  assert.ok(!isDemoAsset('EURC'));
});

test('the checkout address is the payments host and the link id', () => {
  assert.equal(demoCheckoutAddress('https://payments.cosmospay.lat'), `payments.cosmospay.lat/${SAMPLE_LINK_ID}`);
  assert.equal(demoCheckoutAddress('http://payments.cosmospay.localhost:4333', 'cabc'), 'payments.cosmospay.localhost:4333/cabc');
});

test('the request names the token only for a token, and leaves out what is empty', () => {
  assert.deepEqual(demoRequest({ amount: '25', asset: 'USDC', msg: 'Order #1001' }), {
    chain: 'stellar', destination: 'G…YOUR_ACCOUNT', amount: '25', assetCode: 'USDC', assetIssuer: 'GBBD47…LLFLA5', msg: 'Order #1001',
  });
  assert.deepEqual(demoRequest({ amount: null, asset: 'XLM', msg: '' }), { chain: 'stellar', destination: 'G…YOUR_ACCOUNT' });
});

test('the answer is a pending PAY intent with the API’s fields', () => {
  const res = demoResponse({ amount: '25', asset: 'USDC', msg: 'Order #1001' }, NOW);
  assert.equal(res.id, SAMPLE_LINK_ID);
  assert.equal(res.status, 'PENDING');
  assert.equal(res.asset, 'USDC');
  assert.equal(res.createdAt, '2026-10-25T14:20:31.000Z');
  assert.match(String(res.uri), /^web\+stellar:pay\?destination=.*&amount=25$/);
  const native = demoResponse({ amount: null, asset: 'XLM', msg: '' }, NOW);
  assert.equal(native.asset, 'native');
  assert.equal(native.assetIssuer, null);
  assert.equal(native.amount, null);
  assert.equal(native.msg, null);
  assert.doesNotMatch(String(native.uri), /amount=/);
});

test('the webhook is the succeeded event for the same intent', () => {
  const event = demoWebhook({ amount: '40', asset: 'USDC', msg: '' }, NOW) as { type: string; data: Record<string, string> };
  assert.equal(event.type, 'PAYMENT_INTENT_SUCCEEDED');
  assert.equal(event.data.id, SAMPLE_LINK_ID);
  assert.equal(event.data.status, 'SUCCEEDED');
  assert.equal(event.data.amount, '40');
  assert.equal((demoWebhook({ amount: null, asset: 'XLM', msg: '' }, NOW) as { data: { amount: string } }).data.amount, '25');
});
