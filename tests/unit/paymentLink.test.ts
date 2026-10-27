import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  amountLabel,
  buildPayerTransaction,
  canPayWithExtension,
  countdown,
  explorerTxUrl,
  fetchPaymentLink,
  isPaymentLinkId,
  nextPollDelay,
  isStellarAccount,
  parsePaymentLink,
  payerTotal,
  phaseOf,
  reportCheckoutEvent,
  shortAddress,
  submitSignedTransaction,
  webWalletUrl,
} from '@/lib/payments/payment-link';

const QR = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const STELLAR_DEST = 'GCALNQQBXAPZ2WIRSDDBMSTAKCUH5SG6U76YBFLQLIXJTF7FE5AX7AOO';

/* The body the community server answers for a Stellar `pay` link (its PublicPaymentLinkEntity). */
function stellarBody(over: Record<string, unknown> = {}) {
  return {
    id: 'cmh4x2k9a0001l70g8v5q3z2w',
    kind: 'PAY',
    chain: 'stellar',
    network: 'testnet',
    status: 'PENDING',
    payTo: STELLAR_DEST,
    amount: '25.5',
    asset: 'native',
    assetIssuer: null,
    memo: '4127759120438726917',
    msg: 'Order #24',
    uri: `web+stellar:pay?destination=${STELLAR_DEST}&amount=25.5&memo=4127759120438726917&memo_type=MEMO_ID`,
    qr: QR,
    txHash: null,
    networkFee: null,
    expiresAt: '2026-10-24T13:34:56.000Z',
    createdAt: '2026-10-24T12:34:56.000Z',
    checkoutTheme: 'ticket',
    ...over,
  };
}

test('countdown shows minutes and seconds, hours from an hour on, and stops at zero', () => {
  const at = Date.parse('2026-10-24T12:00:00.000Z');
  assert.deepEqual(countdown('2026-10-24T12:11:23.000Z', at), { digits: '11:23', seconds: 683 });
  assert.deepEqual(countdown('2026-10-24T14:05:09.400Z', at), { digits: '02:05:09', seconds: 7509 });
  assert.deepEqual(countdown('2026-10-24T11:59:00.000Z', at), { digits: '00:00', seconds: 0 });
  assert.equal(countdown(null, at), null);
  assert.equal(countdown('not a date', at), null);
});

test('isPaymentLinkId accepts cuids and nothing else', () => {
  assert.equal(isPaymentLinkId('cmh4x2k9a0001l70g8v5q3z2w'), true);
  for (const bad of ['', 'pay', 'favicon.ico', 'CMH4X2K9A0001L70G8V5Q3Z2W', '../etc/passwd', 'cmh4x2k9a0001l70g8v5q3z2w/x', undefined, null]) {
    assert.equal(isPaymentLinkId(bad as string), false, String(bad));
  }
});

test('parsePaymentLink keeps a valid body field for field', () => {
  const link = parsePaymentLink(stellarBody());
  assert.ok(link);
  assert.equal(link.payTo, STELLAR_DEST);
  assert.equal(link.amount, '25.5');
  assert.equal(link.memo, '4127759120438726917');
});

test('parsePaymentLink reads the checkout design, and draws classic for one it does not know', () => {
  assert.equal(parsePaymentLink(stellarBody())?.checkoutTheme, 'ticket');
  // A cosmetic field never costs the payer the page: unknown, missing or odd values fall back.
  assert.equal(parsePaymentLink(stellarBody({ checkoutTheme: 'neon' }))?.checkoutTheme, 'classic');
  assert.equal(parsePaymentLink(stellarBody({ checkoutTheme: undefined }))?.checkoutTheme, 'classic');
  assert.equal(parsePaymentLink(stellarBody({ checkoutTheme: null }))?.checkoutTheme, 'classic');
});

test('parsePaymentLink drops fields the contract does not have', () => {
  const link = parsePaymentLink(stellarBody({ consumerId: 'leak', source: 'GABC' }));
  assert.ok(link);
  assert.equal('consumerId' in link, false);
  assert.equal('source' in link, false);
});

test('parsePaymentLink refuses a URI with a foreign or script scheme', () => {
  assert.equal(parsePaymentLink(stellarBody({ uri: 'javascript:alert(1)' })), null);
  assert.equal(parsePaymentLink(stellarBody({ uri: 'https://evil.example/pay' })), null);
  // A Solana URI on a Stellar link is just as wrong.
  assert.equal(parsePaymentLink(stellarBody({ uri: `solana:${STELLAR_DEST}` })), null);
});

test('parsePaymentLink refuses a QR that is not a PNG data URL', () => {
  assert.equal(parsePaymentLink(stellarBody({ qr: 'https://evil.example/qr.png' })), null);
  assert.equal(parsePaymentLink(stellarBody({ qr: 'data:image/svg+xml;base64,PHN2Zz4=' })), null);
});

test('parsePaymentLink refuses unknown chains, statuses and missing fields', () => {
  assert.equal(parsePaymentLink(stellarBody({ chain: 'bitcoin' })), null);
  assert.equal(parsePaymentLink(stellarBody({ status: 'PAID' })), null);
  assert.equal(parsePaymentLink(stellarBody({ payTo: '' })), null);
  assert.equal(parsePaymentLink(stellarBody({ amount: 25.5 })), null);
  assert.equal(parsePaymentLink(null), null);
  assert.equal(parsePaymentLink('nope'), null);
});

test('parsePaymentLink refuses a deadline that is not a date, and keeps no deadline', () => {
  assert.equal(parsePaymentLink(stellarBody({ expiresAt: 'tomorrow-ish' })), null);
  assert.equal(parsePaymentLink(stellarBody({ expiresAt: '' })), null);
  assert.equal(parsePaymentLink(stellarBody({ expiresAt: null }))?.expiresAt, null);
});

test('parsePaymentLink accepts Solana Pay and EIP-681 links', () => {
  const sol = parsePaymentLink(stellarBody({
    chain: 'solana', payTo: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU', asset: 'USDC',
    assetIssuer: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    uri: 'solana:7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU?amount=25.5&spl-token=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  }));
  assert.ok(sol);
  const monad = parsePaymentLink(stellarBody({
    chain: 'monad', payTo: '0xC830f2b7A1d1F8F5e9fA7E0b0B5d1e4A3c2bc52F', asset: 'native',
    uri: 'ethereum:0xC830f2b7A1d1F8F5e9fA7E0b0B5d1e4A3c2bc52F@143?value=1000000000000000000', networkFee: '0.02',
  }));
  assert.ok(monad);
});

test('parsePaymentLink accepts a Solana Pay transaction request, and refuses another scheme dressed as one', () => {
  const fee = { bps: 100, fixed: '0', amount: '0.25', asset: 'USDC', wallet: '94qWNcvLxv6CBfjrq9H4uXq2THGt6kLjzNi3WT3nbXzu', paidBy: 'recipient' };
  const request = parsePaymentLink(stellarBody({
    chain: 'solana', payTo: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU', asset: 'USDC',
    assetIssuer: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', merchantFee: fee,
    uri: 'solana:' + encodeURIComponent('https://api.cosmospay.lat/v1/payment-links/cmh4x2k9a0001l70g8v5q3z2w/solana-pay'),
  }));
  assert.ok(request);
  assert.equal(request.merchantFee?.amount, '0.25');
  // Not https, or not encoded: refused before it can become an href.
  for (const uri of ['solana:http%3A%2F%2Fevil.example', 'solana:javascript:alert(1)']) {
    assert.equal(parsePaymentLink(stellarBody({ chain: 'solana', payTo: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU', uri })), null);
  }
});

test('amountLabel names the chain coin for native, the code otherwise, null for any amount', () => {
  assert.equal(amountLabel({ chain: 'stellar', asset: 'native', amount: '10' }), '10 XLM');
  assert.equal(amountLabel({ chain: 'solana', asset: 'native', amount: '1.5' }), '1.5 SOL');
  assert.equal(amountLabel({ chain: 'monad', asset: 'native', amount: '2' }), '2 MON');
  assert.equal(amountLabel({ chain: 'stellar', asset: 'USDC', amount: '3' }), '3 USDC');
  assert.equal(amountLabel({ chain: 'stellar', asset: 'native', amount: null }), null);
});

test('phaseOf maps statuses, and calls a pending link past its deadline expired', () => {
  const now = Date.parse('2026-10-24T13:00:00.000Z');
  assert.equal(phaseOf({ status: 'PENDING', expiresAt: '2026-10-24T13:34:56.000Z' }, now), 'open');
  assert.equal(phaseOf({ status: 'PENDING', expiresAt: '2026-10-24T12:00:00.000Z' }, now), 'expired');
  assert.equal(phaseOf({ status: 'PENDING', expiresAt: null }, now), 'open');
  assert.equal(phaseOf({ status: 'SUBMITTED', expiresAt: null }, now), 'processing');
  assert.equal(phaseOf({ status: 'SUCCEEDED', expiresAt: null }, now), 'paid');
  assert.equal(phaseOf({ status: 'FAILED', expiresAt: null }, now), 'failed');
  assert.equal(phaseOf({ status: 'CANCELLED', expiresAt: null }, now), 'cancelled');
  assert.equal(phaseOf({ status: 'EXPIRED', expiresAt: null }, now), 'expired');
});

test('nextPollDelay keeps reading open, processing and expired links, and stops on final ones', () => {
  assert.equal(nextPollDelay('open'), 5_000);
  assert.equal(nextPollDelay('processing'), 3_000);
  // EXPIRED is not final on the server: a late payment can still settle it.
  assert.equal(nextPollDelay('expired'), 30_000);
  assert.equal(nextPollDelay('paid'), null);
  assert.equal(nextPollDelay('failed'), null);
  assert.equal(nextPollDelay('cancelled'), null);
});

test('explorerTxUrl uses each chain explorer and refuses malformed hashes', () => {
  const hex = 'a'.repeat(64);
  assert.equal(explorerTxUrl({ chain: 'stellar', network: 'public', txHash: hex }), `https://stellar.expert/explorer/public/tx/${hex}`);
  assert.equal(explorerTxUrl({ chain: 'stellar', network: 'testnet', txHash: hex }), `https://stellar.expert/explorer/testnet/tx/${hex}`);
  const sig = '5'.repeat(88);
  assert.equal(explorerTxUrl({ chain: 'solana', network: 'testnet', txHash: sig }), `https://explorer.solana.com/tx/${sig}?cluster=devnet`);
  assert.equal(explorerTxUrl({ chain: 'monad', network: 'public', txHash: `0x${hex}` }), `https://monadscan.com/tx/0x${hex}`);
  assert.equal(explorerTxUrl({ chain: 'stellar', network: 'public', txHash: '../../evil' }), null);
  assert.equal(explorerTxUrl({ chain: 'stellar', network: 'public', txHash: null }), null);
});

test('only Stellar pay links go to the extension or the web wallet', () => {
  const uri = `web+stellar:pay?destination=${STELLAR_DEST}`;
  assert.equal(canPayWithExtension({ chain: 'stellar', kind: 'PAY', uri }), true);
  assert.equal(canPayWithExtension({ chain: 'stellar', kind: 'TX', uri: 'web+stellar:tx?xdr=AAAA' }), false);
  assert.equal(canPayWithExtension({ chain: 'solana', kind: 'PAY', uri: 'solana:abc' }), false);
  const web = new URL(webWalletUrl('https://cosmospay.lat/wallet/', { chain: 'stellar', uri }) ?? '');
  assert.equal(web.origin + web.pathname, 'https://cosmospay.lat/wallet/');
  assert.equal(web.searchParams.get('uri'), uri);
  assert.equal(webWalletUrl('https://cosmospay.lat/wallet/', { chain: 'monad', uri: 'ethereum:0x1' }), null);
});

test('shortAddress keeps both ends', () => {
  assert.equal(shortAddress(STELLAR_DEST), 'GCALNQ…AX7AOO');
  assert.equal(shortAddress('short'), 'short');
});

/* A fetch stand-in that answers one canned response. */
function fakeFetch(status: number, body: unknown, headers: Record<string, string> = {}): typeof fetch {
  return (async () => new Response(JSON.stringify(body), { status, headers })) as typeof fetch;
}

test('fetchPaymentLink maps every gateway answer to a renderable result', async () => {
  const id = 'cmh4x2k9a0001l70g8v5q3z2w';
  const ok = await fetchPaymentLink('https://api.example/cosmos-api/', id, fakeFetch(200, stellarBody()));
  assert.equal(ok.kind, 'ok');
  assert.equal((await fetchPaymentLink('https://api.example', id, fakeFetch(404, {}))).kind, 'not-found');
  const limited = await fetchPaymentLink('https://api.example', id, fakeFetch(429, {}, { 'retry-after': '46' }));
  assert.deepEqual(limited, { kind: 'rate-limited', retryAfterMs: 46_000 });
  assert.equal((await fetchPaymentLink('https://api.example', id, fakeFetch(500, {}))).kind, 'error');
  // A body for a different id is not this link.
  assert.equal((await fetchPaymentLink('https://api.example', 'cmh4x2k9a0009l70gneverwas0', fakeFetch(200, stellarBody()))).kind, 'error');
  const thrown = (async () => { throw new TypeError('offline'); }) as typeof fetch;
  assert.equal((await fetchPaymentLink('https://api.example', id, thrown)).kind, 'error');
});

test('fetchPaymentLink calls the gateway path for the id', async () => {
  let called = '';
  const spy = (async (url: string | URL | Request) => {
    called = String(url);
    return new Response('{}', { status: 404 });
  }) as typeof fetch;
  await fetchPaymentLink('https://api.cosmospay.lat/cosmos-api/', 'cmh4x2k9a0001l70g8v5q3z2w', spy);
  assert.equal(called, 'https://api.cosmospay.lat/cosmos-api/v1/payment-links/cmh4x2k9a0001l70g8v5q3z2w');
});

/* A Stellar link with a merchant fee: the server sends the fee and points uri at the checkout. */
const FEE_WALLET = 'GBDHAQXQQ75WVBUZ2IX3O7ME7JOKJUOUPUXRNDCORUJODWQCTVUEQ62R';
const feeBody = (over: Record<string, unknown> = {}) =>
  stellarBody({
    uri: 'https://payments.cosmospay.lat/cmh4x2k9a0001l70g8v5q3z2w',
    payerAccountRequired: true,
    merchantFee: { bps: 150, fixed: '0.1', amount: '0.4825', asset: 'native', wallet: FEE_WALLET, paidBy: 'payer' },
    ...over,
  });

test('parsePaymentLink reads a merchant fee and a link that builds its payer envelope', () => {
  const link = parsePaymentLink(feeBody());
  assert.ok(link);
  assert.equal(link.payerAccountRequired, true);
  assert.equal(link.merchantFee?.wallet, FEE_WALLET);
  // An older server sends neither: no fee, an ordinary link.
  const plain = parsePaymentLink(stellarBody());
  assert.equal(plain?.merchantFee, null);
  assert.equal(plain?.payerAccountRequired, false);
});

test('parsePaymentLink refuses a malformed fee and a payer link that is not a Stellar fee link', () => {
  assert.equal(parsePaymentLink(feeBody({ merchantFee: { bps: 'x' } })), null);
  assert.equal(parsePaymentLink(feeBody({ merchantFee: null })), null);
  assert.equal(parsePaymentLink(feeBody({ amount: null })), null);
  assert.equal(parsePaymentLink(feeBody({ uri: 'javascript:alert(1)' })), null);
  // Without the flag the uri must still be a wallet link.
  assert.equal(parsePaymentLink(feeBody({ payerAccountRequired: false })), null);
});

test('payerTotal adds a fee the payer pays, exactly, and leaves a deducted one out', () => {
  assert.equal(payerTotal({ amount: '25.5', merchantFee: parsePaymentLink(feeBody())!.merchantFee }), '25.9825');
  assert.equal(payerTotal({ amount: '0.1', merchantFee: { bps: 0, fixed: '0.2', amount: '0.2', asset: 'native', wallet: FEE_WALLET, paidBy: 'payer' } }), '0.3');
  assert.equal(payerTotal({ amount: '25.5', merchantFee: { bps: 0, fixed: '1', amount: '1', asset: 'native', wallet: FEE_WALLET, paidBy: 'recipient' } }), '25.5');
  assert.equal(payerTotal({ amount: null, merchantFee: null }), null);
});

test('isStellarAccount takes a G address and nothing else', () => {
  assert.equal(isStellarAccount(STELLAR_DEST), true);
  assert.equal(isStellarAccount(' ' + STELLAR_DEST + ' '), true);
  assert.equal(isStellarAccount('0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed'), false);
  assert.equal(isStellarAccount('GABC'), false);
});

test('buildPayerTransaction posts the account and checks what comes back', async () => {
  const id = 'cmh4x2k9a0001l70g8v5q3z2w';
  let request: { url: string; init?: RequestInit } | null = null;
  const ok = (async (url: string | URL | Request, init?: RequestInit) => {
    request = { url: String(url), init };
    return new Response(JSON.stringify({ xdr: 'AAAAAgAA', uri: 'web+stellar:tx?xdr=AAAAAgAA', qr: QR }), { status: 200 });
  }) as typeof fetch;
  const built = await buildPayerTransaction('https://api.example/cosmos-api/', id, STELLAR_DEST, ok);
  assert.equal(built.kind, 'ok');
  assert.equal(request!.url, 'https://api.example/cosmos-api/v1/payment-links/' + id + '/transaction');
  assert.equal(request!.init?.method, 'POST');
  assert.deepEqual(JSON.parse(String(request!.init?.body)), { account: STELLAR_DEST });

  const answer = (status: number, body: unknown) =>
    (async () => new Response(JSON.stringify(body), { status })) as typeof fetch;
  assert.equal((await buildPayerTransaction('https://api.example', id, STELLAR_DEST, answer(400, { code: 'invalid_state_transition' }))).kind, 'closed');
  assert.equal((await buildPayerTransaction('https://api.example', id, STELLAR_DEST, answer(400, { code: 'validation_failed' }))).kind, 'invalid');
  // A link of another scheme is not one the page will hand to a wallet.
  assert.equal((await buildPayerTransaction('https://api.example', id, STELLAR_DEST, answer(200, { xdr: 'AAAA', uri: 'javascript:x', qr: QR }))).kind, 'error');
});

test('submitSignedTransaction posts the envelope to the link network Horizon', async () => {
  let called: { url: string; body: string } | null = null;
  const spy = (async (url: string | URL | Request, init?: RequestInit) => {
    called = { url: String(url), body: String(init?.body) };
    return new Response('{}', { status: 200 });
  }) as typeof fetch;
  assert.equal(await submitSignedTransaction('testnet', 'AAAA+/=', spy), true);
  assert.equal(called!.url, 'https://horizon-testnet.stellar.org/transactions');
  assert.equal(called!.body, 'tx=AAAA%2B%2F%3D');
  const refused = (async () => new Response('{}', { status: 400 })) as typeof fetch;
  assert.equal(await submitSignedTransaction('public', 'AAAA', refused), false);
});

test('reportCheckoutEvent posts the event to the link and never throws', async () => {
  let called: { url: string; body: string; keepalive?: boolean } | null = null;
  const spy = (async (url: string | URL | Request, init?: RequestInit) => {
    called = { url: String(url), body: String(init?.body), keepalive: init?.keepalive };
    return new Response(null, { status: 204 });
  }) as typeof fetch;
  assert.equal(await reportCheckoutEvent('https://api.example/cosmos-api/', 'cmh4x2k9a0001l70g8v5q3z2w', 'walletOpened', spy), true);
  assert.equal(called!.url, 'https://api.example/cosmos-api/v1/payment-links/cmh4x2k9a0001l70g8v5q3z2w/events');
  assert.equal(called!.body, '{"event":"walletOpened"}');
  // It leaves while the page hands the payer to a wallet app.
  assert.equal(called!.keepalive, true);
  assert.equal(await reportCheckoutEvent('https://api.example', 'x', 'sent', fakeFetch(429, {})), false);
  const thrown = (async () => { throw new TypeError('offline'); }) as typeof fetch;
  assert.equal(await reportCheckoutEvent('https://api.example', 'x', 'walletClosed', thrown), false);
});
