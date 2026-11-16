import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  assetRef,
  createDeposit,
  depositNetworks,
  depositPhase,
  fetchDeposit,
  fetchDepositAssets,
  httpsUrl,
  isPayerAmount,
  isPayerEmail,
  nextDepositPollDelay,
  parseDepositAssets,
  parseDepositQuote,
  parseDepositRoutes,
  parsePaymentDeposit,
  quoteDeposit,
  recordPayer,
  routeRefusal,
} from '@/lib/payments/deposits';

const QR = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const LINK = 'cmh4x2k9a0001l70g8v5q3z2w';
const DEPOSIT = 'cmh4x2k9a0002l70g8v5q3z2x';
const TRON = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';
const TRON_DEPOSIT = 'TXYZopYRdj2D9XRtbG411XZZ3kM5VkAeBf';
const BASE = '0x2527D02599Ba641c19FEa793cD0F167589a0f10D';

function depositBody(over: Record<string, unknown> = {}) {
  return {
    id: DEPOSIT,
    paymentLinkId: LINK,
    status: 'AWAITING_DEPOSIT',
    originChain: 'tron',
    originAsset: 'USDT',
    originContract: TRON,
    amountIn: '25.31',
    minAmountIn: '25.06',
    destinationChain: 'base',
    destinationAsset: 'USDC',
    destinationContract: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
    amountOut: '25',
    feeBps: 25,
    feeAmount: '0.063275',
    refundTo: TRON,
    depositAddress: TRON_DEPOSIT,
    depositMemo: null,
    depositUri: null,
    qr: QR,
    amountOutPaid: null,
    refundedAmount: null,
    originTxHashes: [],
    destinationTxHashes: null,
    timeEstimateSeconds: 90,
    expiresAt: '2026-11-16T14:00:00.000Z',
    createdAt: '2026-11-16T13:00:00.000Z',
    updatedAt: '2026-11-16T13:00:00.000Z',
    ...over,
  };
}

const quoteBody = {
  origin: { chain: 'tron', asset: 'USDT', assetId: 'nep141:tron-x.omft.near', contract: TRON, amount: '25.31', minimum: '25.06', amountUsd: '25.30' },
  destination: { chain: 'base', asset: 'USDC', contract: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913', amount: '25', amountUsd: '24.99' },
  fee: { bps: 25, amount: '0.063275', asset: 'USDT' },
  timeEstimateSeconds: 90,
};

const respond = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  (async () => new Response(JSON.stringify(body), { status, headers })) as unknown as typeof fetch;

test('the asset list keeps well-formed tokens on known networks, by network name, coin first', () => {
  const assets = parseDepositAssets({
    data: [
      { chain: 'tron', chainName: 'Tron', symbol: 'USDT', assetId: 'a1', decimals: 6, contract: TRON, priceUsd: 1 },
      { chain: 'tron', chainName: 'Tron', symbol: 'TRX', assetId: 'a2', decimals: 6, contract: null, priceUsd: 0.3 },
      { chain: 'base', chainName: 'Base', symbol: 'USDC', assetId: 'a3', decimals: 6, contract: BASE, priceUsd: 1 },
      { chain: 'qtc', chainName: 'QTC', symbol: 'QTC', assetId: 'a4', decimals: 8, contract: null, priceUsd: 1 },
      { chain: 'base', symbol: 'bad symbol', assetId: 'a5', decimals: 6, contract: null },
      { chain: 'base', chainName: 'Base', symbol: 'USDC', assetId: 'a3', decimals: 6, contract: BASE, priceUsd: 1 },
    ],
  });
  assert.deepEqual(assets.map((a) => `${a.chain}:${a.symbol}`), ['base:USDC', 'tron:TRX', 'tron:USDT']);
  assert.deepEqual(depositNetworks(assets), ['base', 'tron']);
  assert.equal(assetRef(assets[1]), 'native');
  assert.equal(assetRef(assets[2]), TRON);
});

test('a quote is checked whole', () => {
  assert.equal(parseDepositQuote(quoteBody)?.origin.amount, '25.31');
  assert.equal(parseDepositQuote({ ...quoteBody, origin: { ...quoteBody.origin, amount: '25,31' } }), null);
  assert.equal(parseDepositQuote({ ...quoteBody, origin: { ...quoteBody.origin, chain: 'nope' } }), null);
  assert.equal(parseDepositQuote({ ...quoteBody, fee: undefined }), null);
});

test('a deposit is shown only when its address, link and QR are what they claim', () => {
  const d = parsePaymentDeposit(depositBody());
  assert.ok(d);
  assert.equal(d.depositAddress, TRON_DEPOSIT);
  assert.deepEqual(d.destinationTxHashes, []);
  // Inside the dashboard proxy's envelope too.
  assert.equal(parsePaymentDeposit({ data: depositBody(), message: 'ok' })?.id, DEPOSIT);
  assert.equal(parsePaymentDeposit(depositBody({ depositAddress: BASE })), null, 'not a Tron address');
  assert.equal(parsePaymentDeposit(depositBody({ depositUri: 'javascript:alert(1)' })), null);
  assert.equal(parsePaymentDeposit(depositBody({ depositUri: 'https://evil.example' })), null);
  assert.equal(parsePaymentDeposit(depositBody({ qr: 'https://evil.example/qr.png' })), null);
  assert.equal(parsePaymentDeposit(depositBody({ status: 'DONE' })), null);
  assert.equal(parsePaymentDeposit(depositBody({ refundTo: 'nope' })), null);
  assert.equal(parsePaymentDeposit(depositBody({ depositMemo: 'line\nbreak' })), null);
  const evmLink = 'ethereum:' + BASE + '@8453/transfer?address=' + BASE + '&uint256=1';
  assert.ok(parsePaymentDeposit(depositBody({ originChain: 'base', depositAddress: BASE, refundTo: BASE, depositUri: evmLink })));
});

test('an explorer link is kept only when it is https', () => {
  const d = parsePaymentDeposit(depositBody({ destinationTxHashes: [{ hash: '0xabc', explorerUrl: 'javascript:alert(1)' }, { hash: '0xdef', explorerUrl: 'https://basescan.org/tx/0xdef' }] }));
  assert.deepEqual(d?.destinationTxHashes, [{ hash: '0xabc', explorerUrl: null }, { hash: '0xdef', explorerUrl: 'https://basescan.org/tx/0xdef' }]);
  assert.equal(httpsUrl('http://x.test'), null);
  assert.equal(httpsUrl('https://user:pw@x.test'), null);
});

test('the deposit phase follows the status, and a waiting deposit past its deadline is expired', () => {
  const now = Date.parse('2026-11-16T13:30:00.000Z');
  assert.equal(depositPhase({ status: 'AWAITING_DEPOSIT', expiresAt: '2026-11-16T14:00:00.000Z' }, now), 'awaiting');
  assert.equal(depositPhase({ status: 'AWAITING_DEPOSIT', expiresAt: '2026-11-16T13:00:00.000Z' }, now), 'expired');
  assert.equal(depositPhase({ status: 'PROCESSING', expiresAt: '2026-11-16T13:00:00.000Z' }, now), 'converting');
  assert.equal(depositPhase({ status: 'SUCCEEDED', expiresAt: '2026-11-16T13:00:00.000Z' }, now), 'paid');
  assert.equal(nextDepositPollDelay('paid'), null);
  assert.equal(nextDepositPollDelay('refunded'), null);
  assert.ok((nextDepositPollDelay('expired') ?? 0) > (nextDepositPollDelay('awaiting') ?? 0));
});

test('requests go to the link routes, send the choice, and map every answer', async () => {
  const calls: { url: string; init?: RequestInit }[] = [];
  const recording = (status: number, body: unknown) =>
    (async (url: string, init?: RequestInit) => {
      calls.push({ url, init });
      return new Response(JSON.stringify(body), { status });
    }) as unknown as typeof fetch;
  const choice = { originChain: 'tron' as const, originAsset: TRON, refundTo: ' ' + TRON + ' ' };

  const quote = await quoteDeposit('https://gw.test/', LINK, choice, recording(200, quoteBody));
  assert.equal(quote.kind, 'ok');
  assert.equal(calls[0].url, 'https://gw.test/v1/payment-links/' + LINK + '/quote');
  assert.deepEqual(JSON.parse(String(calls[0].init?.body)), { originChain: 'tron', originAsset: TRON, refundTo: TRON });

  const payer = 'q8V0n3cJxZr2m1bWk7yTt4uP9aLs6dEf0gHiJkLmNoQ';
  const made = await createDeposit('https://gw.test', LINK, choice, payer, recording(201, depositBody()));
  assert.equal(made.kind, 'ok');
  assert.equal(calls[1].url, 'https://gw.test/v1/payment-links/' + LINK + '/deposits');
  // The deposit carries this checkout session's token: its email gets the receipt.
  assert.deepEqual(JSON.parse(String(calls[1].init?.body)), { originChain: 'tron', originAsset: TRON, refundTo: TRON, payerToken: payer });
  // A session the server does not know: the page asks for the email again.
  assert.deepEqual(await createDeposit('https://gw.test', LINK, choice, payer, respond(400, { code: 'payer_session_unknown' })), { kind: 'session' });
  // A deposit for another link is not this one.
  assert.equal((await createDeposit('https://gw.test', LINK, choice, payer, recording(201, depositBody({ paymentLinkId: DEPOSIT })))).kind, 'error');

  const read = await fetchDeposit('https://gw.test', LINK, DEPOSIT, recording(200, depositBody()));
  assert.equal(read.kind, 'ok');
  assert.equal(calls[3].url, 'https://gw.test/v1/payment-links/' + LINK + '/deposits/' + DEPOSIT);
  assert.equal((await fetchDeposit('https://gw.test', LINK, '../x', recording(200, depositBody()))).kind, 'not-found');

  const refusal = 'The cross-chain route refused the request: minimum swap amount is $100';
  assert.deepEqual(await quoteDeposit('https://gw.test', LINK, choice, respond(400, { code: 'provider_error', message: refusal })), { kind: 'refused', message: refusal });
  assert.deepEqual(await quoteDeposit('https://gw.test', LINK, choice, respond(400, { code: 'invalid_state_transition', message: 'closed' })), { kind: 'closed' });
  assert.deepEqual(await createDeposit('https://gw.test', LINK, choice, payer, respond(409, { code: 'operation_in_flight' })), { kind: 'busy' });
  assert.deepEqual(await createDeposit('https://gw.test', LINK, choice, payer, respond(429, {}, { 'retry-after': '7' })), { kind: 'rate-limited', retryAfterMs: 7000 });
  assert.deepEqual(await fetchDepositAssets('https://gw.test', LINK, respond(400, { code: 'validation_failed' })), { kind: 'unavailable' });
  assert.deepEqual(await fetchDepositAssets('https://gw.test', LINK, respond(404, {})), { kind: 'not-found' });
  const offline = (async () => { throw new Error('offline'); }) as unknown as typeof fetch;
  assert.deepEqual(await quoteDeposit('https://gw.test', LINK, choice, offline), { kind: 'error' });
});

test('the token list comes with the origins that cannot pay this amount, each with its reason', async () => {
  const reason = 'The cross-chain route refused the request: Temporary swap limits: minimum swap amount is $100';
  const body = {
    data: [
      { chain: 'tron', chainName: 'Tron', symbol: 'USDT', assetId: 'nep141:tron-usdt', decimals: 6, contract: TRON, priceUsd: 1 },
      { chain: 'base', chainName: 'Base', symbol: 'USDC', assetId: 'nep141:base-usdc', decimals: 6, contract: BASE, priceUsd: 1 },
    ],
    routes: [
      { chain: 'tron', asset: 'USDT', available: false, reason: reason + '\n<b>', amount: null },
      { chain: 'base', asset: 'USDC', available: true, reason: null, amount: '25.3' },
      { chain: 'nowhere', asset: 'USDC', available: false, reason: 'x', amount: null },
      { chain: 'eth', asset: 'USDC', available: 'no', reason: null, amount: null },
    ],
  };
  const routes = parseDepositRoutes(body);
  assert.deepEqual(routes.map((r) => r.chain), ['tron', 'base']);
  assert.equal(routes[0].reason, reason + ' <b>');
  const assets = parseDepositAssets(body);
  assert.equal(routeRefusal(routes, assets.find((a) => a.chain === 'tron')!)?.reason, reason + ' <b>');
  assert.equal(routeRefusal(routes, assets.find((a) => a.chain === 'base')!), null);
  // No routes (an open amount, an older server): nothing is ruled out.
  assert.deepEqual(parseDepositRoutes({ data: body.data }), []);

  const listed = await fetchDepositAssets('https://gw.test', LINK, respond(200, body));
  assert.equal(listed.kind, 'ok');
  if (listed.kind === 'ok') {
    assert.equal(listed.value.assets.length, 2);
    assert.equal(listed.value.routes.length, 2);
  }
});

test("the payer's email and an open amount are checked before they are sent", async () => {
  for (const ok of ['payer@example.com', 'a.b+c@sub.example.co.uk', ' x@y.io ']) assert.ok(isPayerEmail(ok), ok);
  for (const bad of ['', 'payer', 'payer@', '@example.com', 'a b@example.com', 'a@example', 'a@b.c', '<a@b.co>', 'a@b.co\nBcc: x@y.co', `${'a'.repeat(250)}@b.co`, 7]) {
    assert.equal(isPayerEmail(bad), false, String(bad));
  }
  for (const ok of ['25', '0.5', '1000.123456']) assert.ok(isPayerAmount(ok), ok);
  for (const bad of ['', '0', '0.000', '-1', '1e3', '1,5', '.5', 'abc']) assert.equal(isPayerAmount(bad), false, bad);

  const TOKEN = 'q8V0n3cJxZr2m1bWk7yTt4uP9aLs6dEf0gHiJkLmNoQ';
  const calls: { url: string; init?: RequestInit }[] = [];
  const session = (async (url: string, init?: RequestInit) => {
    calls.push({ url, init });
    return new Response(JSON.stringify({ payerToken: TOKEN }), { status: 200 });
  }) as unknown as typeof fetch;
  // The first call opens a session and answers its token.
  assert.deepEqual(await recordPayer('https://gw.test', LINK, { email: ' payer@example.com ', lang: 'pt' }, session), { kind: 'ok', value: TOKEN });
  assert.equal(calls[0].url, 'https://gw.test/v1/payment-links/' + LINK + '/payer');
  assert.equal(calls[0].init?.method, 'POST');
  assert.deepEqual(JSON.parse(String(calls[0].init?.body)), { email: 'payer@example.com', lang: 'pt' });
  // A later one sends the token (the session changes its own email); a language the receipts
  // are not written in is left to the server's default.
  await recordPayer('https://gw.test', LINK, { email: 'payer@example.com', lang: 'xx', payerToken: TOKEN }, session);
  assert.deepEqual(JSON.parse(String(calls[1].init?.body)), { email: 'payer@example.com', payerToken: TOKEN });
  // Never a malformed token, either way.
  await recordPayer('https://gw.test', LINK, { email: 'payer@example.com', lang: 'en', payerToken: 'nope' }, session);
  assert.equal(JSON.parse(String(calls[2].init?.body)).payerToken, undefined);
  assert.equal((await recordPayer('https://gw.test', LINK, { email: 'payer@example.com', lang: 'en' }, respond(200, { payerToken: '<b>' }))).kind, 'error');
  assert.deepEqual(await recordPayer('https://gw.test', LINK, { email: 'payer@example.com', lang: 'en' }, respond(400, { code: 'invalid_state_transition' })), { kind: 'closed' });

  // On a link without an amount, the payer's amount rides on the quote.
  const quoted: { init?: RequestInit }[] = [];
  const quoting = (async (_url: string, init?: RequestInit) => {
    quoted.push({ init });
    return new Response(JSON.stringify(quoteBody), { status: 200 });
  }) as unknown as typeof fetch;
  await quoteDeposit('https://gw.test', LINK, { originChain: 'tron', originAsset: TRON, refundTo: TRON, amount: ' 12.5 ' }, quoting);
  assert.deepEqual(JSON.parse(String(quoted[0].init?.body)), { originChain: 'tron', originAsset: TRON, refundTo: TRON, amount: '12.5' });
});
