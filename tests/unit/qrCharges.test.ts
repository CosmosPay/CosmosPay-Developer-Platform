/* qrCharges.test.ts: the dashboard's QR charges (Fiat > QR charges, views/QrChargesView.tsx).
   - src/lib/qr-charges.ts: what the create dialog checks before the server does (the amount in
     local money, the receiving EVM account and its EIP-55 checksum, the one-line description, the
     expiry presets), the body it sends, and what it accepts back as a QR and a link;
   - the mock API's charges (src/lib/mock/handlers/p2p-ramp.ts over src/lib/mock/fiat-requests.ts):
     every row has the shape of the Payments API's P2pPaymentRequestEntity in docs/openapi.json (the
     community server's spec), a created charge turns paid on its own, cancel answers as the server
     does, and one created in the dashboard opens on the payer page. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  CHARGE_STATUSES, DEFAULT_EXPIRY, DESCRIPTION_MAX, EXPIRY_PRESETS,
  chargeAmountProblem, chargeBody, chargeEstimate, chargeIsLive, chargeIsPayable, chargeMethods, chargePaidMethod, chargePhase, descriptionProblem,
  evmAddressProblem, expiryOk, isExpiryPreset, normalizeEvmAddress, safeChargeUrl, safeQrDataUrl, sameEvmAccount, toChecksumAddress,
} from '@/lib/qr-charges';
import { matchPath, type MockRequest } from '@/lib/mock/http';
import { routes } from '@/lib/mock/handlers/p2p-ramp';
import { FIAT_FIXTURE_IDS, FIAT_SANDBOX_FIXTURE_IDS, PAID_AFTER_MS, TRANSFER_RECEIVED_MS, fiatRequestRoute } from '@/lib/mock/fiat-requests';
import { parseFiatRequest } from '@/lib/payments/fiat-request';
import { rampTxExplorer } from '@/lib/ramp-format';

/* ---- the receiving account ---- */

// EIP-55's own test vectors: mixed case, all caps, all lower.
const EIP55 = [
  '0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed',
  '0xfB6916095ca1df60bB79Ce92cE3Ea74c37c5d359',
  '0xdbF03B407c01E7cD3CBea99509d93f8DDDC8C6FB',
  '0xD1220A0cf47c7B9Be7A2E6BA89F429762e7b9aDb',
];

test('an address gets its EIP-55 checksum, as the standard spells its vectors', () => {
  for (const a of EIP55) {
    assert.equal(toChecksumAddress(a.toLowerCase()), a);
    assert.equal(toChecksumAddress(a.toUpperCase().replace('0X', '0x')), a);
    assert.equal(evmAddressProblem(a), null);
    assert.equal(normalizeEvmAddress(a.toLowerCase()), a);
  }
  // The spec's example (all capitals in EIP-55's list) is one account too.
  assert.equal(evmAddressProblem('0x52908400098527886E0F7030069857D2E4169EE7'), null);
});

test('a typed address is refused when empty, the wrong shape or with a broken checksum', () => {
  assert.equal(evmAddressProblem(''), 'empty');
  assert.equal(evmAddressProblem('   '), 'empty');
  assert.equal(evmAddressProblem('0x123'), 'shape');
  assert.equal(evmAddressProblem('5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed'), 'shape');
  assert.equal(evmAddressProblem('0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAeZ'), 'shape');
  assert.equal(evmAddressProblem('GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H'), 'shape');
  // One letter's case flipped: a mistyped character the checksum catches.
  assert.equal(evmAddressProblem('0x5AAeb6053F3E94C9b9A09f33669435E7Ef1BeAed'), 'checksum');
  assert.equal(normalizeEvmAddress('0x5AAeb6053F3E94C9b9A09f33669435E7Ef1BeAed'), null);
  // Surrounding spaces from a paste do not count.
  assert.equal(evmAddressProblem(`  ${EIP55[0]}  `), null);
  assert.ok(sameEvmAccount(EIP55[0], EIP55[0].toLowerCase()));
  assert.ok(!sameEvmAccount(EIP55[0], EIP55[1]));
});

/* ---- the amount, the description, the expiry ---- */

test('the amount is local money: positive, two decimals at most, at least the minimum', () => {
  assert.equal(chargeAmountProblem('', '2000'), 'empty');
  for (const bad of ['abc', '0', '0.00', '-5', '1.234', '01', '1e5', '15.000,5', '1 000']) assert.equal(chargeAmountProblem(bad, null), 'shape', bad);
  assert.equal(chargeAmountProblem('1999.99', '2000'), 'min');
  assert.equal(chargeAmountProblem('2000', '2000'), null);
  assert.equal(chargeAmountProblem('15000.5', '2000'), null);
  assert.equal(chargeAmountProblem('0.5', undefined), null);
});

test('the estimate is the amount over the local price of one token', () => {
  assert.equal(chargeEstimate('17140', '1714', 1), 10);
  assert.equal(chargeEstimate('3428', '1714', 2), 1);
  assert.equal(chargeEstimate('100', '1714', null), null);
  assert.equal(chargeEstimate('', '1714', 1), null);
  assert.equal(chargeEstimate('100', '0', 1), null);
});

test('the description is optional, one line and 140 characters at most', () => {
  assert.equal(DESCRIPTION_MAX, 140);
  assert.equal(descriptionProblem(''), null);
  assert.equal(descriptionProblem('Mesa 4'), null);
  assert.equal(descriptionProblem(`  ${'a'.repeat(140)}  `), null);
  assert.equal(descriptionProblem('a'.repeat(141)), 'long');
  assert.equal(descriptionProblem('line one\nline two'), 'line');
  assert.equal(descriptionProblem('tab\there'), 'line');
  assert.equal(descriptionProblem('pay ‮evil'), 'line');
  assert.equal(descriptionProblem('iso ⁧x⁩'), 'line');
});

test('the expiry offers 1 hour, 24 hours, 7 days and 30 days, a day by default', () => {
  assert.deepEqual([...EXPIRY_PRESETS], [60, 1440, 10080, 43200]);
  assert.equal(DEFAULT_EXPIRY, 1440);
  for (const m of EXPIRY_PRESETS) {
    assert.ok(isExpiryPreset(m), String(m));
    assert.ok(expiryOk(m), String(m));
  }
  assert.ok(!isExpiryPreset(5));
  assert.ok(expiryOk(5));
  for (const bad of [4, 43201, 60.5, '60', null]) assert.ok(!expiryOk(bad), String(bad));
});

test('the body sends the terms the server takes, the address checksummed', () => {
  const draft = {
    currency: 'ARS', amount: ' 15000 ', minAmount: '2000', chainId: 42161,
    token: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', address: EIP55[0].toLowerCase(),
    description: '  Mesa 4  ', expiresInMinutes: 1440,
  };
  assert.deepEqual(chargeBody(draft), {
    currency: 'ARS', amount: '15000', chainId: 42161, token: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
    address: EIP55[0], description: 'Mesa 4', expiresInMinutes: 1440,
  });
  // No description: the field is left out, not sent empty.
  assert.ok(!('description' in (chargeBody({ ...draft, description: '   ' }) ?? {})));
  assert.equal(chargeBody({ ...draft, currency: 'ars' }), null);
  assert.equal(chargeBody({ ...draft, amount: '1999' }), null);
  assert.equal(chargeBody({ ...draft, chainId: undefined }), null);
  assert.equal(chargeBody({ ...draft, token: 'USDT0' }), null);
  assert.equal(chargeBody({ ...draft, address: '0x5AAeb6053F3E94C9b9A09f33669435E7Ef1BeAed' }), null);
  assert.equal(chargeBody({ ...draft, description: 'a\nb' }), null);
  assert.equal(chargeBody({ ...draft, expiresInMinutes: 0 }), null);
});

/* ---- what comes back ---- */

test('only a PNG data URL is drawn as the QR', () => {
  const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
  assert.equal(safeQrDataUrl(png), png);
  for (const bad of [
    'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=',
    'data:image/png;base64,abc"onerror="x',
    'https://example.com/qr.png',
    'javascript:alert(1)',
    'data:image/png,raw',
    null,
    42,
  ]) assert.equal(safeQrDataUrl(bad), null, String(bad));
});

test('the link is the payer page of this charge, over https (http only on a local host)', () => {
  const id = 'cqrdemoarsopen0000000001';
  assert.equal(safeChargeUrl(`https://payments.cosmospay.lat/fiat/${id}`, id), `https://payments.cosmospay.lat/fiat/${id}`);
  assert.equal(safeChargeUrl(`http://payments.cosmospay.localhost:4321/fiat/${id}`, id), `http://payments.cosmospay.localhost:4321/fiat/${id}`);
  assert.equal(safeChargeUrl(`http://payments.cosmospay.lat/fiat/${id}`, id), null);
  assert.equal(safeChargeUrl(`https://payments.cosmospay.lat/fiat/cqrdemocopopen0000000002`, id), null);
  assert.equal(safeChargeUrl(`https://user:pw@payments.cosmospay.lat/fiat/${id}`, id), null);
  assert.equal(safeChargeUrl('javascript:alert(1)//fiat/x', id), null);
  assert.equal(safeChargeUrl(undefined, id), null);
});

test('an open charge past its deadline reads expired, and only an open one is followed', () => {
  const now = Date.parse('2026-11-12T12:00:00Z');
  assert.equal(chargePhase({ status: 'open', expiresAt: '2026-11-12T11:59:59Z' }, now), 'expired');
  assert.equal(chargePhase({ status: 'open', expiresAt: '2026-11-12T12:00:01Z' }, now), 'open');
  assert.equal(chargePhase({ status: 'paid', expiresAt: '2026-11-12T11:00:00Z' }, now), 'paid');
  assert.ok(chargeIsLive({ status: 'open', expiresAt: '2026-11-13T12:00:00Z' }, now));
  for (const status of ['paid', 'expired', 'cancelled'] as const) assert.ok(!chargeIsLive({ status, expiresAt: '2026-11-13T12:00:00Z' }, now), status);
  // A transfer that arrived is followed until the token is delivered, but it is no longer payable.
  assert.equal(chargePhase({ status: 'processing', expiresAt: '2026-11-12T11:00:00Z' }, now), 'processing');
  assert.ok(chargeIsLive({ status: 'processing', expiresAt: '2026-11-12T11:00:00Z' }, now));
  assert.ok(!chargeIsPayable({ status: 'processing', expiresAt: '2026-11-13T12:00:00Z' }, now));
  assert.ok(chargeIsPayable({ status: 'open', expiresAt: '2026-11-13T12:00:00Z' }, now));
});

test('the ways to pay and how it was paid read from the charge, from a server without them too', () => {
  assert.deepEqual(chargeMethods({ methods: ['transfer', 'p2p'] }), ['transfer', 'p2p']);
  assert.deepEqual(chargeMethods({ methods: ['p2p', 'card' as 'p2p', 'transfer'] }), ['p2p', 'transfer']);
  assert.deepEqual(chargeMethods({}), ['p2p']);
  assert.equal(chargePaidMethod({ status: 'paid', paidMethod: 'transfer' }), 'transfer');
  assert.equal(chargePaidMethod({ status: 'paid', paidMethod: null }), null);
  assert.equal(chargePaidMethod({ status: 'paid' }), null);
  assert.equal(chargePaidMethod({ status: 'processing', paidMethod: 'transfer' }), null);
});

test('a delivery transaction opens on its network\'s explorer', () => {
  const hash = `0x${'ab'.repeat(32)}`;
  assert.equal(rampTxExplorer(42161, hash), `https://arbiscan.io/tx/${hash}`);
  assert.equal(rampTxExplorer(421614, hash), `https://sepolia.arbiscan.io/tx/${hash}`);
  assert.equal(rampTxExplorer(999999, hash), null);
  assert.equal(rampTxExplorer(42161, '0x1234'), null);
  assert.equal(rampTxExplorer(42161, null), null);
});

/* ---- the mock API ---- */

const spec = JSON.parse(readFileSync(path.resolve(import.meta.dirname, '..', '..', 'docs', 'openapi.json'), 'utf8'));
const ENTITY = spec.components.schemas.P2pPaymentRequestEntity as { properties: Record<string, { enum?: string[]; items?: { enum?: string[] } }>; required: string[] };

async function call(method: string, pathname: string, { env = 'dev', body = null }: { env?: 'dev' | 'prod'; body?: Record<string, unknown> | null } = {}) {
  const url = new URL(`http://dev.cosmospay.localhost${pathname}?env=${env}&org=org_mock_andes`);
  for (const r of routes) {
    if (r.method !== method) continue;
    const params = matchPath(r.path, url.pathname);
    if (!params) continue;
    const req = { method, url, params, body, env, org: 'org_mock_andes', user: { id: 'u', name: 'U', email: 'u@example.com', image: null }, options: { role: 'owner', plan: 'growth', fresh: false, latencyMs: 0 } } as MockRequest;
    const res = await r.handler(req);
    return { status: res.status, json: await res.json() };
  }
  throw new Error(`no mock for ${method} ${pathname}`);
}

const BASE = '/api/onramp/p2p/payment-requests';
const SELLER = '0x52908400098527886E0F7030069857D2E4169EE7';
const SANDBOX_USDT = '0x25f5D414F85b7f4668ADe4E557ef234023208771';

function assertEntity(row: Record<string, unknown>) {
  // Exactly the server's fields: every required one, nothing it does not document.
  assert.deepEqual(Object.keys(row).sort(), Object.keys(ENTITY.properties).sort(), String(row.id));
  for (const key of ENTITY.required) assert.ok(key in row, `${row.id} lacks ${key}`);
  assert.ok(ENTITY.properties.status.enum?.includes(row.status as string), String(row.status));
  assert.ok((CHARGE_STATUSES as readonly unknown[]).includes(row.status));
  assert.equal(toChecksumAddress(row.address as string), row.address);
  assert.equal(toChecksumAddress(row.tokenAddress as string), row.tokenAddress);
  assert.ok(safeQrDataUrl(row.qr), `${row.id} qr`);
  assert.ok(safeChargeUrl(row.url, row.id as string), `${row.id} url`);
  assert.ok(Array.isArray(row.methods) && (row.methods as string[]).length > 0, `${row.id} methods`);
  for (const m of row.methods as string[]) assert.ok(ENTITY.properties.methods.items?.enum?.includes(m), m);
  if (row.status === 'paid') {
    // A bank transfer's delivery may report no transaction; the marketplace's always does.
    if (row.paidMethod === 'p2p' || row.paidTxHash !== null) assert.match(row.paidTxHash as string, /^0x[0-9a-f]{64}$/);
    assert.match(row.paidAmount as string, /^\d+(\.\d+)?$/);
    assert.ok(Number.isFinite(Date.parse(row.paidAt as string)));
    assert.ok(ENTITY.properties.paidMethod.enum?.includes(row.paidMethod as string), String(row.paidMethod));
  } else {
    assert.equal(row.paidTxHash, null);
    assert.equal(row.paidAmount, null);
    assert.equal(row.paidMethod, null);
  }
}

test('the mock lists each environment\'s charges in the server\'s shape, newest first', async () => {
  const dev = await call('GET', BASE);
  assert.equal(dev.status, 200);
  const rows = dev.json.data.data as Record<string, unknown>[];
  assert.equal(dev.json.data.total, rows.length);
  for (const row of rows) assertEntity(row);
  const states = Object.fromEntries(rows.map((r) => [r.id, r.status]));
  assert.equal(states[FIAT_SANDBOX_FIXTURE_IDS.open], 'open');
  assert.equal(states[FIAT_SANDBOX_FIXTURE_IDS.processing], 'processing');
  assert.equal(states[FIAT_SANDBOX_FIXTURE_IDS.paid], 'paid');
  assert.equal(states[FIAT_SANDBOX_FIXTURE_IDS.expired], 'expired');
  assert.equal(states[FIAT_SANDBOX_FIXTURE_IDS.cancelled], 'cancelled');
  assert.ok(rows.every((r) => r.network === 'testnet'));
  const created = rows.map((r) => Date.parse(r.createdAt as string));
  assert.deepEqual(created, [...created].sort((a, b) => b - a));
  // Production's are its own; neither list shows the other's.
  const prod = (await call('GET', BASE, { env: 'prod' })).json.data.data as Record<string, unknown>[];
  for (const row of prod) assertEntity(row);
  assert.ok(prod.some((r) => r.id === FIAT_FIXTURE_IDS.paid));
  const paidBank = prod.find((r) => r.id === FIAT_FIXTURE_IDS.paidTransfer);
  assert.equal(paidBank?.paidMethod, 'transfer');
  assert.equal(paidBank?.paidTxHash, null);
  assert.ok(!prod.some((r) => r.id === FIAT_SANDBOX_FIXTURE_IDS.open));
  assert.equal((await call('GET', `${BASE}/${FIAT_FIXTURE_IDS.openArs}`)).status, 404);
});

test('a charge created in the mock is open, opens on the payer page and turns paid by itself', async () => {
  const res = await call('POST', BASE, {
    body: { currency: 'ARS', amount: '15000', chainId: 421614, token: SANDBOX_USDT, address: SELLER.toLowerCase(), description: 'Mesa 9', expiresInMinutes: 60 },
  });
  assert.equal(res.status, 201);
  const charge = res.json.data;
  assertEntity(charge);
  assert.equal(charge.status, 'open');
  assert.equal(charge.address, SELLER);
  assert.equal(charge.token, 'USDT');
  assert.equal(charge.description, 'Mesa 9');
  assert.deepEqual(charge.methods, ['p2p']);
  assert.ok(Number(charge.estimatedAmountOut) > 0);
  assert.equal(Date.parse(charge.expiresAt) - Date.parse(charge.createdAt), 60 * 60_000);
  assert.equal((await call('GET', `${BASE}/${charge.id}`)).json.data.status, 'open');
  // The payer page reads it with the same contract as the fixed ones.
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
  const pub = parseFiatRequest(await (await fiatRequestRoute(new Request(`http://mock/v1/payment-links/fiat/${charge.id}`), [charge.id], json)).json());
  assert.equal(pub?.status, 'open');
  assert.equal(pub?.amount, '15000');

  const realNow = Date.now;
  Date.now = () => realNow() + PAID_AFTER_MS + 1_000;
  try {
    const paid = (await call('GET', `${BASE}/${charge.id}`)).json.data;
    assertEntity(paid);
    assert.equal(paid.status, 'paid');
    // A paid charge can no longer be cancelled.
    const again = await call('POST', `${BASE}/${charge.id}/cancel`, { body: {} });
    assert.equal(again.status, 409);
  } finally {
    Date.now = realNow;
  }
});

test('with an approved transfer account a new charge in pesos takes bank transfers, and goes processing before paid', async () => {
  // Production's Andes Commerce has its account approved (src/lib/mock/transfer-account.ts).
  const res = await call('POST', BASE, {
    env: 'prod',
    body: { currency: 'ARS', amount: '15000', chainId: 42161, token: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', address: SELLER },
  });
  assert.equal(res.status, 201, JSON.stringify(res.json));
  const charge = res.json.data;
  assertEntity(charge);
  assert.deepEqual(charge.methods, ['transfer', 'p2p']);
  const realNow = Date.now;
  try {
    Date.now = () => realNow() + TRANSFER_RECEIVED_MS + 500;
    const processing = (await call('GET', `${BASE}/${charge.id}`, { env: 'prod' })).json.data;
    assertEntity(processing);
    assert.equal(processing.status, 'processing');
    // Processing cannot be cancelled: the money is in.
    assert.equal((await call('POST', `${BASE}/${charge.id}/cancel`, { env: 'prod', body: {} })).status, 409);
    Date.now = () => realNow() + PAID_AFTER_MS + 500;
    const paid = (await call('GET', `${BASE}/${charge.id}`, { env: 'prod' })).json.data;
    assertEntity(paid);
    assert.equal(paid.status, 'paid');
    assert.equal(paid.paidMethod, 'transfer');
  } finally {
    Date.now = realNow;
  }
});

test('the mock refuses what the server refuses', async () => {
  const good = { currency: 'ARS', amount: '15000', chainId: 421614, token: SANDBOX_USDT, address: SELLER };
  const refused = [
    { ...good, amount: '1' },
    { ...good, amount: '15000.123' },
    { ...good, currency: 'XXX' },
    { ...good, chainId: 1 },
    { ...good, token: '0x0000000000000000000000000000000000000001' },
    { ...good, address: '0x52908400098527886E0F7030069857D2E4169ee7' },
    { ...good, description: 'two\nlines' },
    { ...good, description: 'x'.repeat(141) },
    { ...good, expiresInMinutes: 4 },
    { ...good, expiresInMinutes: 43201 },
  ];
  for (const body of refused) assert.equal((await call('POST', BASE, { body })).status, 400, JSON.stringify(body));
  // No expiry is a day.
  const res = await call('POST', BASE, { body: good });
  assert.equal(res.status, 201);
  assert.equal(Date.parse(res.json.data.expiresAt) - Date.parse(res.json.data.createdAt), 1440 * 60_000);
  assert.equal(res.json.data.description, null);
});

test('cancel closes an open charge once, and only the environment\'s own', async () => {
  const res = await call('POST', BASE, { body: { currency: 'ARS', amount: '20000', chainId: 421614, token: SANDBOX_USDT, address: SELLER } });
  const id = res.json.data.id;
  assert.equal((await call('POST', `${BASE}/${id}/cancel`, { env: 'prod', body: {} })).status, 404);
  const done = await call('POST', `${BASE}/${id}/cancel`, { body: {} });
  assert.equal(done.status, 200);
  assertEntity(done.json.data);
  assert.equal(done.json.data.status, 'cancelled');
  assert.equal((await call('POST', `${BASE}/${id}/cancel`, { body: {} })).status, 409);
  assert.equal((await call('POST', `${BASE}/${FIAT_SANDBOX_FIXTURE_IDS.expired}/cancel`, { body: {} })).status, 409);
  assert.equal((await call('POST', `${BASE}/cmissing00000000000000000/cancel`, { body: {} })).status, 404);
  // Cancelled stays cancelled: it never turns paid by itself.
  const realNow = Date.now;
  Date.now = () => realNow() + PAID_AFTER_MS + 1_000;
  try {
    assert.equal((await call('GET', `${BASE}/${id}`)).json.data.status, 'cancelled');
  } finally {
    Date.now = realNow;
  }
});
