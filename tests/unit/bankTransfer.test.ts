/* bankTransfer.test.ts: paying a charge in local money by bank transfer, on the payer page
   (src/lib/payments/fiat-request.ts): the payer's CUIT/CUIL or DNI checked before it is sent, the
   deposit instructions the server answers refused whole unless they match the contract (the CVU's
   check digits included, so a payer never copies a broken one), the server's refusals each mapped
   to its own message, and what the tab keeps after a reload (the instructions, never the
   document). Also the mock gateway's transfers (src/lib/mock/fiat-requests.ts): the demo charge
   goes open, processing, paid. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  cuitCheckOk,
  cvuOk,
  documentProblem,
  expiresIn,
  groupCvu,
  normalizeDocument,
  parseBankTransfer,
  parseFiatRequest,
  readStoredTransfer,
  startBankTransfer,
  transferAmountToCopy,
  transferHasCents,
  transferPhaseOf,
} from '@/lib/payments/fiat-request';
import { FIAT_FIXTURE_IDS, FIAT_SANDBOX_FIXTURE_IDS, PAID_AFTER_MS, TRANSFER_RECEIVED_MS, fiatRequestRoute } from '@/lib/mock/fiat-requests';

const ID = 'cmh4x2k9a0001l70g8v5q3z2w';

/* The BankTransfer the contract shows. */
function transfer(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'cmh4x9transfer0001l70g8v5q',
    status: 'awaiting_deposit',
    currency: 'ARS',
    amount: '15000',
    alias: 'cosmospay.qr',
    cvu: '0000003100000000000000',
    holder: 'Cosmos Pay',
    bank: null,
    documentHint: '…786',
    expiresAt: '2026-11-12T13:00:00.000Z',
    ...over,
  };
}

function fakeFetch(status: number, payload: unknown, headers: Record<string, string> = {}) {
  const calls: { url: string; init?: RequestInit }[] = [];
  const impl = (async (url: string, init?: RequestInit) => {
    calls.push({ url, init });
    return new Response(payload === undefined ? null : JSON.stringify(payload), { status, headers: { 'content-type': 'application/json', ...headers } });
  }) as unknown as typeof fetch;
  return { fetch: impl, calls };
}

/* ---- the document ---- */

test('a CUIT/CUIL is 11 digits whose last one is the check digit of the other ten', () => {
  // The contract's example, and real-shaped ones for a person and a company.
  for (const ok of ['20123456786', '20-12345678-6', '20.12345678.6', ' 20 12345678 6 ', '27-28033514-8', '30-71234567-1']) {
    assert.equal(documentProblem(ok), null, ok);
  }
  assert.ok(cuitCheckOk('20123456786'));
  assert.equal(documentProblem('20-12345678-5'), 'check');
  assert.equal(documentProblem('20-12345678-0'), 'check');
  assert.ok(!cuitCheckOk('2012345678'));
  // A prefix whose remainder leaves 10 has no valid check digit at all.
  for (let d = 0; d <= 9; d++) assert.ok(!cuitCheckOk(`2000000001${d}`), String(d));
});

test('a DNI is 7 or 8 digits; anything else says why it is not one', () => {
  for (const ok of ['1234567', '12345678', '12.345.678', '12 345 678']) assert.equal(documentProblem(ok), null, ok);
  assert.equal(documentProblem(''), 'empty');
  assert.equal(documentProblem('   '), 'empty');
  for (const bad of ['123456', '123456789', '1234567890', '123456789012', 'abc12345', '12345678a', '+12345678', '12_345_678']) {
    assert.equal(documentProblem(bad), 'shape', bad);
  }
  assert.equal(normalizeDocument('20-12345678-6'), '20123456786');
  assert.equal(normalizeDocument(' 12.345.678 '), '12345678');
  assert.equal(normalizeDocument('20-12345678-5'), null);
});

/* ---- the instructions ---- */

test('a CVU is 22 digits in two blocks, each ending in its own check digit', () => {
  // The contract's example, and a valid CBU.
  assert.ok(cvuOk('0000003100000000000000'));
  assert.ok(cvuOk('2850590940090418135201'));
  assert.ok(!cvuOk('0000003200000000000000'), 'first block');
  assert.ok(!cvuOk('0000003100000000000001'), 'second block');
  assert.ok(!cvuOk('000000310000000000000'), '21 digits');
  assert.ok(!cvuOk('0000003100000000000000 '));
  assert.equal(groupCvu('0000003100000000000000'), '0000 0031 0000 0000 0000 00');
});

test('the contract\'s instructions parse as sent, the document reduced to its last digits', () => {
  const t = parseBankTransfer(transfer());
  assert.ok(t);
  assert.equal(t.alias, 'cosmospay.qr');
  assert.equal(t.cvu, '0000003100000000000000');
  assert.equal(t.holder, 'Cosmos Pay');
  assert.equal(t.bank, null);
  assert.equal(t.documentHint, '786');
  assert.equal(parseBankTransfer(transfer({ documentHint: '786' }))?.documentHint, '786');
  assert.equal(parseBankTransfer(transfer({ documentHint: '***786' }))?.documentHint, '786');
  assert.equal(parseBankTransfer(transfer({ documentHint: null }))?.documentHint, null);
  assert.equal(parseBankTransfer(transfer({ holder: null, bank: 'Banco de Prueba' }))?.bank, 'Banco de Prueba');
  for (const status of ['awaiting_deposit', 'converting', 'completed', 'failed', 'expired']) assert.ok(parseBankTransfer(transfer({ status })), status);
});

test('instructions that do not match the contract are refused whole', () => {
  const cases: Record<string, unknown>[] = [
    { id: '' }, { id: 'a b' }, { status: 'pending' }, { status: null }, { currency: 'ars' }, { amount: 15000 }, { amount: '15000.123' }, { amount: '0' },
    { alias: 'abc' }, { alias: 'with space' }, { alias: 'a'.repeat(21) }, { alias: 'alias\n' },
    { cvu: '0000003100000000000001' }, { cvu: '123' }, { cvu: 22 },
    { holder: '' }, { holder: 'Line\nbreak' }, { bank: 7 },
    { documentHint: '20123456786' }, { documentHint: 'x' }, { documentHint: 42 },
    { expiresAt: 'soon' }, { expiresAt: null },
  ];
  for (const over of cases) assert.equal(parseBankTransfer(transfer(over)), null, JSON.stringify(over));
  for (const junk of [null, undefined, 'x', [], [transfer()]]) assert.equal(parseBankTransfer(junk), null, JSON.stringify(junk));
});

test('instructions past their deadline read expired; the amount copies as a bank form takes it', () => {
  const now = Date.parse('2026-11-12T12:00:00.000Z');
  assert.equal(transferPhaseOf({ status: 'awaiting_deposit', expiresAt: '2026-11-12T13:00:00.000Z' }, now), 'awaiting_deposit');
  assert.equal(transferPhaseOf({ status: 'awaiting_deposit', expiresAt: '2026-11-12T11:59:00.000Z' }, now), 'expired');
  assert.equal(transferPhaseOf({ status: 'converting', expiresAt: '2026-11-12T11:00:00.000Z' }, now), 'converting');
  assert.equal(transferAmountToCopy('15000'), '15000');
  assert.equal(transferAmountToCopy('15000.5'), '15000,50');
  assert.equal(transferAmountToCopy('48250.25'), '48250,25');
  assert.equal(transferAmountToCopy('15000.37'), '15000,37');
  // Cents the server added (to tell two transfers apart) must be sent: the page says so.
  assert.ok(transferHasCents('15000.37'));
  assert.ok(transferHasCents('15000.5'));
  assert.ok(!transferHasCents('15000'));
  assert.ok(!transferHasCents('15000.00'));
  assert.equal(parseBankTransfer(transfer({ amount: '15000.37' }))?.amount, '15000.37');
  assert.equal(expiresIn('2026-11-12T12:58:00.000Z', 'en', now), 'in 58 minutes');
  assert.equal(expiresIn('2026-11-12T14:00:00.000Z', 'en', now), 'in 2 hours');
  assert.match(expiresIn('2026-11-12T12:30:00.000Z', 'es', now) ?? '', /30 minutos/);
  assert.equal(expiresIn('2026-11-12T11:00:00.000Z', 'en', now), null);
});

test('asking for the instructions posts the document and maps every refusal to its own outcome', async () => {
  const ok = fakeFetch(201, transfer());
  const res = await startBankTransfer('https://api.example/cosmos-api/', ID, '20123456786', ok.fetch);
  assert.equal(res.kind, 'ok');
  assert.equal(ok.calls[0].url, `https://api.example/cosmos-api/v1/payment-links/fiat/${ID}/transfers`);
  assert.equal(ok.calls[0].init?.method, 'POST');
  assert.deepEqual(JSON.parse(String(ok.calls[0].init?.body)), { document: '20123456786' });
  // The same document again answers the same instructions with 200.
  assert.equal((await startBankTransfer('https://api.example', ID, '12345678', fakeFetch(200, transfer()).fetch)).kind, 'ok');
  const kind = async (status: number, payload: unknown, headers: Record<string, string> = {}) =>
    (await startBankTransfer('https://api.example', ID, '12345678', fakeFetch(status, payload, headers).fetch)).kind;
  assert.equal(await kind(400, { code: 'invalid_document' }), 'invalid-document');
  assert.equal(await kind(400, { code: 'method_unavailable' }), 'method-unavailable');
  assert.equal(await kind(409, { code: 'request_closed' }), 'closed');
  assert.equal(await kind(404, { code: 'not_found' }), 'closed');
  assert.equal(await kind(503, { code: 'transfer_unavailable' }), 'unavailable');
  assert.equal(await kind(503, {}), 'unavailable');
  assert.equal(await kind(400, { code: 'validation_failed', message: ['document must be a string'] }), 'invalid-document');
  assert.equal(await kind(400, { message: 'Bad Request' }), 'error');
  assert.equal(await kind(500, null), 'error');
  assert.deepEqual(await startBankTransfer('https://api.example', ID, '12345678', fakeFetch(429, {}, { 'retry-after': '9' }).fetch), { kind: 'rate-limited', retryAfterMs: 9000 });
  // Instructions that are not the contract (a broken CVU) are an error: nothing is shown.
  assert.equal(await kind(201, transfer({ cvu: '0000003100000000000001' })), 'error');
  const thrown = (async () => { throw new Error('offline'); }) as unknown as typeof fetch;
  assert.equal((await startBankTransfer('https://api.example', ID, '12345678', thrown)).kind, 'error');
});

test('the tab keeps the instructions, checked again, for a day past their deadline', () => {
  const now = Date.parse('2026-11-12T12:00:00.000Z');
  const kept = JSON.stringify(parseBankTransfer(transfer()));
  assert.equal(readStoredTransfer(kept, now)?.cvu, '0000003100000000000000');
  assert.equal(readStoredTransfer(kept, Date.parse('2026-11-13T12:59:00.000Z'))?.alias, 'cosmospay.qr');
  assert.equal(readStoredTransfer(kept, Date.parse('2026-11-13T13:00:01.000Z')), null);
  assert.equal(readStoredTransfer(null, now), null);
  assert.equal(readStoredTransfer('{nope', now), null);
  assert.equal(readStoredTransfer(JSON.stringify({ ...transfer(), cvu: '1' }), now), null);
  // What is kept never holds the document: only its last digits.
  assert.ok(!kept.includes('20123456786') && !kept.includes('12345678'));
});

/* ---- the mock gateway's transfers (npm run dev:mock) ---- */

const json = (payload: unknown, status = 200) => new Response(payload === undefined ? null : JSON.stringify(payload), { status, headers: { 'content-type': 'application/json' } });
const get = (id: string) => fiatRequestRoute(new Request(`http://mock/v1/payment-links/fiat/${id}`), [id], json);
const post = (id: string, payload: unknown) =>
  fiatRequestRoute(new Request(`http://mock/v1/payment-links/fiat/${id}/transfers`, { method: 'POST', body: JSON.stringify(payload) }), [id, 'transfers'], json);

test('the mock fixtures offer each combination of ways to pay', async () => {
  const methods = async (id: string) => parseFiatRequest(await (await get(id)).json())?.methods;
  assert.deepEqual(await methods(FIAT_FIXTURE_IDS.openArs), ['transfer', 'p2p']);
  assert.deepEqual(await methods(FIAT_FIXTURE_IDS.transferOnly), ['transfer']);
  assert.deepEqual(await methods(FIAT_FIXTURE_IDS.openCop), ['p2p']);
  assert.equal(parseFiatRequest(await (await get(FIAT_FIXTURE_IDS.processing)).json())?.status, 'processing');
});

test('the mock answers instructions as the server would, and refuses what it refuses', async () => {
  const id = FIAT_FIXTURE_IDS.transferOnly;
  const code = async (res: Response) => ((await res.json()) as { code?: string }).code;
  let res = await post(id, { document: '20-12345678-5' });
  assert.equal(res.status, 400);
  assert.equal(await code(res), 'invalid_document');
  res = await post(FIAT_FIXTURE_IDS.openCop, { document: '20-12345678-6' });
  assert.equal(res.status, 400);
  assert.equal(await code(res), 'method_unavailable');
  res = await post(FIAT_FIXTURE_IDS.processing, { document: '20-12345678-6' });
  assert.equal(res.status, 409);
  assert.equal(await code(res), 'request_closed');
  res = await post(id, { document: '99.999.999' });
  assert.equal(res.status, 503);
  assert.equal(await code(res), 'transfer_unavailable');

  res = await post(id, { document: '20-12345678-6' });
  assert.equal(res.status, 201);
  const raw = await res.text();
  const first = parseBankTransfer(JSON.parse(raw));
  assert.ok(first);
  assert.equal(first.amount, '48250.50');
  assert.equal(first.documentHint, '678');
  assert.ok(!raw.includes('12345678'), 'the document never comes back');
  // The same person (the DNI inside the CUIT) gets the same instructions; another one, new ones.
  const again = await post(id, { document: '12345678' });
  assert.equal(again.status, 200);
  assert.equal(parseBankTransfer(await again.json())?.id, first.id);
  const other = await post(id, { document: '27-28033514-8' });
  assert.equal(other.status, 201);
  assert.notEqual(parseBankTransfer(await other.json())?.id, first.id);
});

test('the mock has a transfer whose amount carries cents the charge does not', async () => {
  const id = FIAT_SANDBOX_FIXTURE_IDS.open;
  const charge = parseFiatRequest(await (await get(id)).json());
  assert.equal(charge?.amount, '12500');
  const res = await post(id, { document: '20-12345678-6' });
  assert.equal(res.status, 201);
  const t = parseBankTransfer(await res.json());
  assert.equal(t?.amount, '12500.37');
  assert.ok(t && transferHasCents(t.amount));
});

test('the demo charge goes open, processing, paid after a transfer is started', async () => {
  const id = FIAT_FIXTURE_IDS.openArs;
  const res = await post(id, { document: '12345678' });
  assert.equal(res.status, 201);
  const status = async () => parseFiatRequest(await (await get(id)).json())?.status;
  assert.equal(await status(), 'open');
  const realNow = Date.now;
  try {
    Date.now = () => realNow() + TRANSFER_RECEIVED_MS + 500;
    assert.equal(await status(), 'processing');
    // A processing charge takes no new instructions.
    assert.equal((await post(id, { document: '27-28033514-8' })).status, 409);
    Date.now = () => realNow() + PAID_AFTER_MS + 500;
    const paid = parseFiatRequest(await (await get(id)).json());
    assert.equal(paid?.status, 'paid');
    assert.ok(paid?.paidAt);
  } finally {
    Date.now = realNow;
  }
});
