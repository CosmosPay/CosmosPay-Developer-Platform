/* embedProtocol.test.ts: the message the hosted checkout posts to the window that opened it,
   and the filter <cosmos-pay-button> runs on every `message` event (src/lib/payments/embed-protocol.ts).

   The filter is the button's whole defence: anything that passes it becomes a
   `cosmospay:status` / `cosmospay:paid` event on the merchant's page. So each check is
   exercised on its own (origin, source window, shape, status, id) with everything else
   right, to prove no single one is redundant. */
import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import {
  isPaidStatus,
  MESSAGE_SOURCE,
  MESSAGE_TYPE,
  PAID_EVENT,
  readStatusMessage,
  STATUS_EVENT,
  statusMessage,
} from '@/lib/payments/embed-protocol';
import { LINK_STATUSES } from '@/lib/payments/payment-link';

const ORIGIN = 'https://payments.cosmospay.lat';
const ID = 'cmh4x2k9a0001l70g8v5q3z2w';
const popup = { name: 'the popup' };
const expected = { origin: ORIGIN, source: popup, id: ID };

function event(over: Partial<{ origin: string; source: unknown; data: unknown }> = {}) {
  return { origin: ORIGIN, source: popup, data: statusMessage(ID, 'SUCCEEDED'), ...over };
}

test('the checkout posts the id and the status, and nothing else', () => {
  const message = statusMessage(ID, 'PENDING');
  assert.deepEqual(message, { source: 'cosmos-pay', type: 'status', id: ID, status: 'PENDING' });
  assert.deepEqual(Object.keys(message).sort(), ['id', 'source', 'status', 'type']);
  assert.equal(MESSAGE_SOURCE, 'cosmos-pay');
  assert.equal(MESSAGE_TYPE, 'status');
});

test('a message from the popup, on the payments origin, in shape, is read back', () => {
  assert.deepEqual(readStatusMessage(event(), expected), { id: ID, status: 'SUCCEEDED' });
  for (const status of LINK_STATUSES) {
    assert.deepEqual(readStatusMessage(event({ data: statusMessage(ID, status) }), expected), { id: ID, status });
  }
});

test('any other origin is refused, look-alikes and null included', () => {
  for (const origin of [
    'https://evil.example',
    'http://payments.cosmospay.lat',
    'https://payments.cosmospay.lat.evil.example',
    'https://payments.cosmospay.lat:8443',
    'https://dev.cosmospay.lat',
    'null',
    '',
  ]) {
    assert.equal(readStatusMessage(event({ origin }), expected), null, origin);
  }
  // A misconfigured element (no origin) accepts nothing rather than everything.
  assert.equal(readStatusMessage(event({ origin: '' }), { ...expected, origin: '' }), null);
});

test('only the window the element opened counts, not another one on the same origin', () => {
  assert.equal(readStatusMessage(event({ source: { name: 'another tab' } }), expected), null);
  assert.equal(readStatusMessage(event({ source: null }), expected), null);
  // Before any popup is open there is no source to match, so nothing matches.
  assert.equal(readStatusMessage(event({ source: null }), { ...expected, source: null }), null);
  assert.equal(readStatusMessage(event({ source: undefined }), { ...expected, source: undefined }), null);
});

test('the shape is exact: source, type, a link id and a known status', () => {
  const bad: unknown[] = [
    null,
    undefined,
    'SUCCEEDED',
    42,
    [],
    [statusMessage(ID, 'SUCCEEDED')],
    {},
    { ...statusMessage(ID, 'SUCCEEDED'), source: 'someone-else' },
    { ...statusMessage(ID, 'SUCCEEDED'), type: 'paid' },
    { source: 'cosmos-pay', type: 'status', id: ID },
    { source: 'cosmos-pay', type: 'status', status: 'SUCCEEDED' },
    { ...statusMessage(ID, 'SUCCEEDED'), status: 'PAID' },
    { ...statusMessage(ID, 'SUCCEEDED'), status: 'succeeded' },
    { ...statusMessage(ID, 'SUCCEEDED'), id: 'not-a-link-id' },
    { ...statusMessage(ID, 'SUCCEEDED'), id: 42 },
  ];
  for (const data of bad) assert.equal(readStatusMessage(event({ data }), expected), null, JSON.stringify(data));
});

test('a message for another link is refused', () => {
  const other = 'cmh4x2k9a0001l70g8v5q3z2x';
  assert.equal(readStatusMessage(event({ data: statusMessage(other, 'SUCCEEDED') }), expected), null);
});

test('extra fields are not passed on', () => {
  const data = { ...statusMessage(ID, 'SUCCEEDED'), uri: 'web+stellar:pay?destination=G…', amount: '10' };
  assert.deepEqual(readStatusMessage(event({ data }), expected), { id: ID, status: 'SUCCEEDED' });
});

test('only SUCCEEDED is paid', () => {
  assert.deepEqual(LINK_STATUSES.filter(isPaidStatus), ['SUCCEEDED']);
  assert.equal(STATUS_EVENT, 'cosmospay:status');
  assert.equal(PAID_EVENT, 'cosmospay:paid');
});
