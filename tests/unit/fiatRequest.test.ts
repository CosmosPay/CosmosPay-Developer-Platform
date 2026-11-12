/* fiatRequest.test.ts: the payer page of a charge in local money (src/lib/payments/fiat-request.ts),
   its trust boundary above all: the public read and the session's answer are refused whole unless
   they match the contract, and the secure window's URL is followed only on the marketplace's own
   hosts over https. Also the mock gateway's fixtures (src/lib/mock/fiat-requests.ts), which must
   be what the parser accepts, or mock mode shows an error page. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  WIDGET_HOSTS,
  fetchFiatRequest,
  fiatMethodName,
  fiatNetworkName,
  fiatPhaseOf,
  formatMoney,
  formatTokenAmount,
  isFiatRequestId,
  nextFiatPollDelay,
  openFiatSession,
  parseFiatRequest,
  preselectedMethod,
  readStoredSession,
  safeWidgetUrl,
} from '@/lib/payments/fiat-request';
import { FIAT_FIXTURE_IDS, PAID_AFTER_MS, fiatRequestRoute } from '@/lib/mock/fiat-requests';

const ID = 'cmh4x2k9a0001l70g8v5q3z2w';
const WIDGET = 'https://widget-testnet.eldorado.io/exchange?operation=BUY&externalReferenceId=cp-0f8c2a52-5c1e-4e8b-9a43-1d2f3e4a5b6c';

/* The body the community server answers (its PublicPaymentRequest), as the contract shows it. */
function body(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: ID,
    network: 'public',
    status: 'open',
    currency: 'ARS',
    amount: '15000',
    description: 'Table 4',
    chainId: 42161,
    token: 'USDT0',
    tokenAddress: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
    estimatedAmountOut: '8.91',
    paymentMethods: [{ id: 'bank_tx_ar', name: 'CVU/CBU o Alias (ARS)' }],
    methods: ['transfer', 'p2p'],
    expiresAt: '2026-11-13T12:00:00.000Z',
    createdAt: '2026-11-12T12:00:00.000Z',
    paidAt: null,
    ...over,
  };
}

function without(key: string): Record<string, unknown> {
  const b = body();
  delete b[key];
  return b;
}

function fakeFetch(status: number, payload: unknown, headers: Record<string, string> = {}): { fetch: typeof fetch; calls: { url: string; init?: RequestInit }[] } {
  const calls: { url: string; init?: RequestInit }[] = [];
  const impl = (async (url: string, init?: RequestInit) => {
    calls.push({ url, init });
    return new Response(payload === undefined ? null : JSON.stringify(payload), { status, headers: { 'content-type': 'application/json', ...headers } });
  }) as unknown as typeof fetch;
  return { fetch: impl, calls };
}

test('a charge id is a cuid, nothing else', () => {
  assert.ok(isFiatRequestId(ID));
  for (const bad of [undefined, null, '', 'abc', `C${ID.slice(1)}`, `${ID}/x`, `../${ID}`, `c${'a'.repeat(40)}`]) assert.ok(!isFiatRequestId(bad as string), String(bad));
});

test('the contract body parses into the charge, as sent', () => {
  const r = parseFiatRequest(body());
  assert.ok(r);
  assert.equal(r.id, ID);
  assert.equal(r.amount, '15000');
  assert.equal(r.currency, 'ARS');
  assert.equal(r.description, 'Table 4');
  assert.equal(r.chainId, 42161);
  assert.deepEqual(r.paymentMethods, [{ id: 'bank_tx_ar', name: 'CVU/CBU o Alias (ARS)' }]);
  // The nullable fields, null.
  const bare = parseFiatRequest(body({ description: null, estimatedAmountOut: null, paymentMethods: [] }));
  assert.ok(bare);
  assert.equal(bare.description, null);
  assert.equal(bare.estimatedAmountOut, null);
  assert.deepEqual(bare.paymentMethods, []);
  assert.deepEqual(r.methods, ['transfer', 'p2p']);
  for (const status of ['open', 'processing', 'paid', 'expired', 'cancelled']) {
    assert.ok(parseFiatRequest(body({ status, paidAt: status === 'paid' ? '2026-11-12T13:00:00.000Z' : null })), status);
  }
});

test('a body missing any field is refused whole', () => {
  // `methods` alone may be missing: a server from before the bank transfer, paid in the window only.
  for (const key of Object.keys(body())) if (key !== 'methods') assert.equal(parseFiatRequest(without(key)), null, key);
  assert.deepEqual(parseFiatRequest(without('methods'))?.methods, ['p2p']);
  for (const junk of [null, undefined, 'x', 42, [], [body()]]) assert.equal(parseFiatRequest(junk), null, JSON.stringify(junk));
});

test('a field of the wrong type or shape is refused whole', () => {
  const cases: Record<string, unknown>[] = [
    { id: 'not-a-cuid' },
    { id: 42 },
    { network: 'mainnet' },
    { currency: 'ars' },
    { currency: 'PESO' },
    { amount: 15000 },
    { amount: '15000.123' },
    { amount: '-5' },
    { amount: '0' },
    { amount: '1e5' },
    { amount: '' },
    { description: 42 },
    { description: '' },
    { description: 'a'.repeat(141) },
    { description: 'line one\nline two' },
    { description: 'pay to ‮evil' },
    { chainId: '42161' },
    { chainId: 0 },
    { chainId: 1.5 },
    { token: '' },
    { token: 7 },
    { tokenAddress: '0x123' },
    { tokenAddress: 'GCALNQQBXAPZ2WIRSDDBMSTAKCUH5SG6U76YBFLQLIXJTF7FE5AX7AOO' },
    { estimatedAmountOut: 8.91 },
    { estimatedAmountOut: 'about 9' },
    { paymentMethods: null },
    { paymentMethods: {} },
    { paymentMethods: [{ id: 'bank_tx_ar' }] },
    { paymentMethods: [{ id: '', name: 'Bank' }] },
    { paymentMethods: [{ id: 'bank tx', name: 'Bank' }] },
    { paymentMethods: [{ id: 'bank_tx_ar', name: '' }] },
    { paymentMethods: [{ id: 'bank_tx_ar', name: 'Bank\nTransfer' }] },
    { paymentMethods: [{ id: 'a', name: 'A' }, { id: 'a', name: 'B' }] },
    { paymentMethods: ['bank_tx_ar'] },
    { paymentMethods: Array.from({ length: 51 }, (_, i) => ({ id: `m${i}`, name: `M${i}` })) },
    { methods: 'transfer' },
    { methods: null },
    { methods: [1] },
    { methods: ['transfer', null] },
    { methods: Array.from({ length: 9 }, () => 'p2p') },
    { expiresAt: 'tomorrow' },
    { expiresAt: null },
    { createdAt: 0 },
    { paidAt: 'yesterday' },
  ];
  for (const over of cases) assert.equal(parseFiatRequest(body(over)), null, JSON.stringify(over));
});

test('the ways to pay keep the server order, once each, and skip a rail this page does not know', () => {
  assert.deepEqual(parseFiatRequest(body({ methods: ['p2p', 'transfer'] }))?.methods, ['p2p', 'transfer']);
  assert.deepEqual(parseFiatRequest(body({ methods: ['transfer'] }))?.methods, ['transfer']);
  assert.deepEqual(parseFiatRequest(body({ methods: ['card', 'transfer', 'transfer'] }))?.methods, ['transfer']);
  assert.deepEqual(parseFiatRequest(body({ methods: [] }))?.methods, []);
});

test('an unknown status is refused, whatever its case', () => {
  for (const status of ['OPEN', 'pending', 'failed', 'refunded', '', null]) assert.equal(parseFiatRequest(body({ status })), null, String(status));
});

test('the secure window is followed only over https, on the marketplace\'s own hosts', () => {
  assert.deepEqual([...WIDGET_HOSTS].sort(), ['widget-testnet.eldorado.io', 'widget.eldorado.io']);
  assert.equal(safeWidgetUrl(WIDGET), WIDGET);
  assert.equal(safeWidgetUrl('https://widget.eldorado.io/exchange?a=1'), 'https://widget.eldorado.io/exchange?a=1');
  for (const bad of [
    'http://widget.eldorado.io/exchange',
    'https://widget.eldorado.io.evil.example/exchange',
    'https://evil.example/https://widget.eldorado.io',
    'https://eldorado.io/exchange',
    'https://api.eldorado.io/exchange',
    'https://WIDGET.eldorado.io@evil.example/',
    'https://user:pass@widget.eldorado.io/',
    'https://widget.eldorado.io:8443/',
    'javascript:alert(1)//widget.eldorado.io',
    'data:text/html,widget.eldorado.io',
    '//widget.eldorado.io/exchange',
    '/exchange',
    '',
    42,
    null,
  ]) {
    assert.equal(safeWidgetUrl(bad), null, String(bad));
  }
});

test('the page reads the charge from the keyless route and refuses a foreign answer', async () => {
  const ok = fakeFetch(200, body());
  const read = await fetchFiatRequest('https://api.example/cosmos-api/', ID, ok.fetch);
  assert.equal(read.kind, 'ok');
  assert.equal(ok.calls[0].url, `https://api.example/cosmos-api/v1/payment-links/fiat/${ID}`);
  assert.equal((await fetchFiatRequest('https://api.example', ID, fakeFetch(404, { message: 'nope' }).fetch)).kind, 'not-found');
  assert.deepEqual(await fetchFiatRequest('https://api.example', ID, fakeFetch(429, {}, { 'retry-after': '7' }).fetch), { kind: 'rate-limited', retryAfterMs: 7000 });
  assert.equal((await fetchFiatRequest('https://api.example', ID, fakeFetch(500, {}).fetch)).kind, 'error');
  // Another charge's body, or a malformed one, is not this charge.
  assert.equal((await fetchFiatRequest('https://api.example', ID, fakeFetch(200, body({ id: 'cmh4x2k9a0001l70g8v5q3zzz' })).fetch)).kind, 'error');
  assert.equal((await fetchFiatRequest('https://api.example', ID, fakeFetch(200, body({ status: 'weird' })).fetch)).kind, 'error');
  const thrown = (async () => { throw new Error('offline'); }) as unknown as typeof fetch;
  assert.equal((await fetchFiatRequest('https://api.example', ID, thrown)).kind, 'error');
});

test('opening a session posts the method and checks the window it answers', async () => {
  const ok = fakeFetch(201, { widgetUrl: WIDGET, reference: 'cp-0f8c2a52-5c1e-4e8b-9a43-1d2f3e4a5b6c' });
  const opened = await openFiatSession('https://api.example', ID, 'bank_tx_ar', ok.fetch);
  assert.deepEqual(opened, { kind: 'ok', widgetUrl: WIDGET, reference: 'cp-0f8c2a52-5c1e-4e8b-9a43-1d2f3e4a5b6c' });
  assert.equal(ok.calls[0].url, `https://api.example/v1/payment-links/fiat/${ID}/sessions`);
  assert.equal(ok.calls[0].init?.method, 'POST');
  assert.deepEqual(JSON.parse(String(ok.calls[0].init?.body)), { paymentMethod: 'bank_tx_ar' });
  // A window anywhere else, or no reference, is an error: the page navigates nowhere.
  for (const answer of [
    { widgetUrl: 'http://widget.eldorado.io/exchange', reference: 'cp-1' },
    { widgetUrl: 'https://evil.example/exchange', reference: 'cp-1' },
    { widgetUrl: WIDGET },
    { widgetUrl: WIDGET, reference: 'ref-1' },
    null,
  ]) {
    assert.equal((await openFiatSession('https://api.example', ID, 'bank_tx_ar', fakeFetch(201, answer).fetch)).kind, 'error', JSON.stringify(answer));
  }
  assert.equal((await openFiatSession('https://api.example', ID, 'x', fakeFetch(409, { code: 'request_closed' }).fetch)).kind, 'closed');
  assert.equal((await openFiatSession('https://api.example', ID, 'x', fakeFetch(400, { message: 'bad method' }).fetch)).kind, 'method');
  assert.deepEqual(await openFiatSession('https://api.example', ID, 'x', fakeFetch(429, {}, { 'retry-after': '60' }).fetch), { kind: 'rate-limited', retryAfterMs: 60_000 });
  assert.equal((await openFiatSession('https://api.example', ID, 'x', fakeFetch(503, {}).fetch)).kind, 'error');
});

test('an open charge past its deadline reads expired; paid stops the reads, the rest slow down', () => {
  const now = Date.parse('2026-11-12T12:00:00.000Z');
  assert.equal(fiatPhaseOf({ status: 'open', expiresAt: '2026-11-12T13:00:00.000Z' }, now), 'open');
  assert.equal(fiatPhaseOf({ status: 'open', expiresAt: '2026-11-12T11:59:59.000Z' }, now), 'expired');
  assert.equal(fiatPhaseOf({ status: 'paid', expiresAt: '2026-11-12T11:00:00.000Z' }, now), 'paid');
  assert.equal(fiatPhaseOf({ status: 'cancelled', expiresAt: '2026-11-12T13:00:00.000Z' }, now), 'cancelled');
  // The transfer arrived: never expired, read at the open cadence until delivered.
  assert.equal(fiatPhaseOf({ status: 'processing', expiresAt: '2026-11-12T11:00:00.000Z' }, now), 'processing');
  assert.equal(nextFiatPollDelay('processing'), 5_000);
  assert.equal(nextFiatPollDelay('open'), 5_000);
  assert.equal(nextFiatPollDelay('expired'), 30_000);
  assert.equal(nextFiatPollDelay('cancelled'), 30_000);
  assert.equal(nextFiatPollDelay('paid'), null);
  // A payer waiting on the window keeps the open cadence past the deadline.
  assert.equal(nextFiatPollDelay('expired', true), 5_000);
  assert.equal(nextFiatPollDelay('paid', true), null);
  assert.equal(nextFiatPollDelay('cancelled', true), 30_000);
});

test('money is written as its payers read it, and token amounts in the page language', () => {
  assert.equal(formatMoney('15000', 'ARS', 'es').replace(/\s/g, ' '), '$ 15.000');
  assert.equal(formatMoney('15000', 'ARS', 'en'), '$15,000');
  assert.equal(formatMoney('52000.5', 'COP', 'es').replace(/\s/g, ' '), '$ 52.000,50');
  assert.match(formatMoney('99.99', 'BRL', 'pt'), /^R\$\s99,99$/);
  assert.match(formatMoney('10', 'EUR', 'de'), /^10\s€$/);
  assert.equal(formatTokenAmount('8.91', 'es'), '8,91');
  assert.equal(formatTokenAmount('8.91', 'en'), '8.91');
  assert.equal(formatTokenAmount('1234.5', 'en'), '1,234.5');
});

test('networks, methods and the preselected method', () => {
  assert.equal(fiatNetworkName(42161), 'Arbitrum');
  assert.equal(fiatNetworkName(999999), null);
  assert.equal(fiatMethodName({ id: 'bank_tx_ar', name: 'CVU/CBU o Alias (ARS)' }, 'ARS'), 'CVU/CBU o Alias');
  assert.equal(fiatMethodName({ id: 'x', name: 'Nequi' }, 'COP'), 'Nequi');
  const one = [{ id: 'bank_tx_ar', name: 'Bank' }];
  const three = [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }, { id: 'c', name: 'C' }];
  assert.equal(preselectedMethod(one, null), 'bank_tx_ar');
  assert.equal(preselectedMethod(three, null), null);
  assert.equal(preselectedMethod(three, 'b'), 'b');
  assert.equal(preselectedMethod(three, 'gone'), null);
  assert.equal(preselectedMethod([], null), null);
});

test('a stored session comes back only as the server would have answered it, and not forever', () => {
  const now = Date.parse('2026-11-12T12:00:00.000Z');
  const good = { widgetUrl: WIDGET, reference: 'cp-1', method: 'bank_tx_ar', openedAt: now - 60_000 };
  assert.deepEqual(readStoredSession(JSON.stringify(good), now), good);
  assert.equal(readStoredSession(null, now), null);
  assert.equal(readStoredSession('{not json', now), null);
  assert.equal(readStoredSession(JSON.stringify({ ...good, widgetUrl: 'https://evil.example/' }), now), null);
  assert.equal(readStoredSession(JSON.stringify({ ...good, method: 'a b' }), now), null);
  assert.equal(readStoredSession(JSON.stringify({ ...good, openedAt: now - 2 * 3_600_000 }), now), null);
  assert.equal(readStoredSession(JSON.stringify({ ...good, openedAt: now + 60_000 }), now), null);
});

/* ---- the mock gateway's charges (npm run dev:mock) ---- */

const json = (payload: unknown, status = 200) => new Response(payload === undefined ? null : JSON.stringify(payload), { status, headers: { 'content-type': 'application/json' } });
const get = (id: string) => fiatRequestRoute(new Request(`http://mock/v1/payment-links/fiat/${id}`), [id], json);
const post = (id: string, payload: unknown) =>
  fiatRequestRoute(new Request(`http://mock/v1/payment-links/fiat/${id}/sessions`, { method: 'POST', body: JSON.stringify(payload) }), [id, 'sessions'], json);

test('every mock charge is one the page accepts, in the state its id names', async () => {
  const expected: Record<string, string> = {
    openArs: 'open', openCop: 'open', transferOnly: 'open', processing: 'processing', paid: 'paid', paidTransfer: 'paid', expired: 'expired', cancelled: 'cancelled',
  };
  for (const [name, id] of Object.entries(FIAT_FIXTURE_IDS)) {
    assert.ok(isFiatRequestId(id), id);
    const res = await get(id);
    const parsed = parseFiatRequest(await res.json());
    assert.ok(parsed, id);
    assert.equal(parsed.status, expected[name], id);
  }
  assert.equal((await get('cmh4x2k9a0001l70g8v5q3z2w')).status, 404);
  // The seller's address and the mock's own bookkeeping stay out of the public read.
  const raw = await (await get(FIAT_FIXTURE_IDS.openArs)).json();
  assert.ok(!('address' in raw) && !('sessionOpenedAt' in raw));
});

test('a mock session opens the sandbox window, refuses a closed charge or a foreign method, and pays later', async () => {
  const id = FIAT_FIXTURE_IDS.openCop;
  assert.equal((await post(id, { paymentMethod: 'bank_tx_ar' })).status, 400);
  assert.equal((await post(FIAT_FIXTURE_IDS.paid, { paymentMethod: 'bank_tx_ar' })).status, 409);
  const res = await post(id, { paymentMethod: 'app_nequi_co' });
  assert.equal(res.status, 201);
  const opened = await res.json();
  assert.equal(safeWidgetUrl(opened.widgetUrl), opened.widgetUrl);
  assert.equal(new URL(opened.widgetUrl).hostname, 'widget-testnet.eldorado.io');
  assert.match(opened.reference, /^cp-/);
  assert.equal(new URL(opened.widgetUrl).searchParams.get('externalReferenceId'), opened.reference);
  // Still open right after; paid once PAID_AFTER_MS have passed since the first session.
  assert.equal((await (await get(id)).json()).status, 'open');
  const realNow = Date.now;
  Date.now = () => realNow() + PAID_AFTER_MS + 1_000;
  try {
    const paid = parseFiatRequest(await (await get(id)).json());
    assert.equal(paid?.status, 'paid');
    assert.ok(paid?.paidAt);
  } finally {
    Date.now = realNow;
  }
});
