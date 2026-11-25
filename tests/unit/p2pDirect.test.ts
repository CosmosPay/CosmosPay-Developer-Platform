/* p2pDirect.test.ts: paying a charge in local money "direct" on the payer page (a bank transfer to a
   verified person, inside the page: src/lib/payments/p2p-direct.ts). What the payer types is checked
   before it is sent (the CUIT/CUIL's check digit and the CVU/CBU's two check digits included), every
   answer of the community server's direct routes is refused whole unless it matches the contract,
   each step and order status maps to the step the page shows, each refusal to its own failure, and
   the tab keeps only the session and the order's id, under its own key per charge. Also the mock
   (src/lib/mock/fiat-direct.ts): a returning payer and a new one walk every step offline, and the
   demo order goes matching, pay, confirming, completed. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BANK_IDS,
  accountProblems,
  bankName,
  banksByName,
  cbuProblem,
  countdown,
  cuitProblem,
  directCreateOrder,
  directFailureOf,
  directKyc,
  directLogin,
  directPollDelay,
  directStepOf,
  holderProblem,
  kycStepView,
  loginLanguage,
  normalizeAccount,
  normalizeEmail,
  normalizeLoginCode,
  normalizePhone,
  normalizePhoneCode,
  orderFollowed,
  parseDirectAccounts,
  parseDirectChallenge,
  parseDirectKyc,
  parseDirectOrder,
  parseDirectSession,
  readStoredDirect,
  safeDocumentUrl,
  type DirectKyc,
  type DirectOrder,
} from '@/lib/payments/p2p-direct';
import { FIAT_STORAGE_PREFIXES, fiatStorageKey, parseFiatRequest } from '@/lib/payments/fiat-request';
import { LOCALES, MESSAGES } from '@/lib/payments/i18n';
import { FIAT_FIXTURE_IDS, fiatRequestRoute } from '@/lib/mock/fiat-requests';
import { CONFIRMING_MS, DOCUMENT_MS, MATCHING_MS, PAY_WINDOW_MS, PHONE_CODE, REVIEW_MS } from '@/lib/mock/fiat-direct';

const ID = 'cmh4x2k9a0001l70g8v5q3z2w';
const SESSION = 'q0Zb1n3W9yH2v8sF4kT7xA5mC6dE0gJ1lP3rU9oI2eY';

/* The Order the contract shows. */
function order(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'a1b2c3d4-0000-4000-8000-000000000001',
    status: 'pay',
    amount: '15000',
    currency: 'ARS',
    payTo: { holder: 'Juan Pérez', cbu: '0000003100000000000000', alias: 'juan.perez.mp', bank: 'mercado_pago' },
    dueAt: '2026-11-13T13:00:00.000Z',
    createdAt: '2026-11-13T12:30:00.000Z',
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

/* ---- what the payer types ---- */

test('a CUIT/CUIL is 11 digits whose last one is the check digit, however it is written', () => {
  assert.equal(cuitProblem('20-12345678-6'), null);
  assert.equal(cuitProblem('27 30123456 8'), null);
  assert.equal(cuitProblem('27.35123456.9'), null);
  assert.equal(cuitProblem('20123456785'), 'check');
  assert.equal(cuitProblem('2012345678'), 'shape');
  assert.equal(cuitProblem('12345678'), 'shape', 'a DNI is not a CUIT/CUIL');
  assert.equal(cuitProblem('20-1234567A-6'), 'shape');
  assert.equal(cuitProblem('  '), 'empty');
});

test('a CVU or CBU is 22 digits whose two blocks each end in their own check digit', () => {
  assert.equal(cbuProblem('0000003100000000000000'), null);
  assert.equal(cbuProblem('0070999000004123456782'), null);
  assert.equal(cbuProblem('0000 0031 0000 1234 5678 91'), null, 'spaces are how people copy it');
  assert.equal(cbuProblem('0070999000004123456783'), 'check', 'second block');
  assert.equal(cbuProblem('0070998000004123456782'), 'check', 'first block');
  assert.equal(cbuProblem('007099900000412345678'), 'shape');
  assert.equal(cbuProblem('00709990000041234567820'), 'shape');
  assert.equal(cbuProblem('juan.perez.mp'), 'shape', 'an alias is not a CBU');
  assert.equal(cbuProblem(''), 'empty');
});

test('the account a payer types is checked field by field, in the form order, and sent clean', () => {
  const typed = { holder: '  María  Gómez ', cbu: '0070 9990 0000 4123 4567 82', documentType: 'CUIL', document: '27-30123456-8', bank: 'galicia', accountType: 'savings' };
  assert.deepEqual(accountProblems(typed), []);
  assert.deepEqual(normalizeAccount(typed), {
    holder: 'María Gómez', cbu: '0070999000004123456782', documentType: 'CUIL', document: '27301234568', bank: 'galicia', accountType: 'savings',
  });
  const bad = { holder: '', cbu: '0070999000004123456783', documentType: 'DNI', document: '27301234567', bank: 'banco_falso', accountType: 'plazo_fijo' };
  assert.deepEqual(accountProblems(bad), [
    { field: 'holder', problem: 'empty' },
    { field: 'cbu', problem: 'check' },
    { field: 'documentType', problem: 'empty' },
    { field: 'document', problem: 'check' },
    { field: 'bank', problem: 'empty' },
    { field: 'accountType', problem: 'empty' },
  ]);
  assert.equal(normalizeAccount(bad), null);
  assert.equal(holderProblem('12345'), 'shape', 'a name has letters');
  assert.equal(holderProblem('Ana‮Bel'), 'shape', 'no bidirectional overrides');
});

test('every bank of the server enum has a display name, and the select sorts them by it', () => {
  assert.equal(BANK_IDS.length, 24);
  for (const id of BANK_IDS) assert.ok(bankName(id), id);
  assert.equal(bankName('mercado_pago'), 'Mercado Pago');
  assert.equal(bankName('banco_nuevo'), null);
  assert.equal(bankName(null), null);
  const names = banksByName('es').map((b) => b.name);
  assert.deepEqual(names, [...names].sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' })));
  assert.equal(names.length, BANK_IDS.length);
});

test('email, codes, city and phone are checked as the server takes them', () => {
  assert.equal(normalizeEmail('  ana@example.com '), 'ana@example.com');
  assert.equal(normalizeEmail('ana@example'), null);
  assert.equal(normalizeEmail('ana example.com'), null);
  assert.equal(normalizeLoginCode('AB12 cd34'), 'AB12cd34', 'case kept, spaces dropped');
  assert.equal(normalizeLoginCode('AB12-CD3'), null, 'eight at least');
  assert.equal(normalizeLoginCode('AB12CD3!'), null);
  assert.equal(normalizePhoneCode(' 1234 '), '1234');
  assert.equal(normalizePhoneCode('12345'), null);
  // Local: the area code and the number, without the 0 or the 15; the server adds +54.
  assert.equal(normalizePhone('387 412-3456'), '3874123456');
  assert.equal(normalizePhone('(011) 4123-4567'), null, 'a leading 0 is not how the server takes it');
  assert.equal(normalizePhone('+54 9 387 412 3456'), '+5493874123456');
  assert.equal(normalizePhone('54 9 387 412 3456'), '+5493874123456');
  assert.equal(normalizePhone('412-3456'), null);
  assert.equal(normalizePhone('+54 387 abc'), null);
});

/* ---- what the server answers ---- */

test('the login and the session parse as the contract shows them, and nothing else does', () => {
  assert.deepEqual(parseDirectChallenge({ challenge: 'otp-7f3a', newAccount: true }), { challenge: 'otp-7f3a', newAccount: true });
  assert.equal(parseDirectChallenge({ challenge: '', newAccount: true }), null);
  assert.equal(parseDirectChallenge({ challenge: 'a\nb', newAccount: false }), null);
  assert.equal(parseDirectChallenge({ challenge: 'otp', newAccount: 'yes' }), null);
  assert.deepEqual(parseDirectSession({ session: SESSION, expiresAt: '2026-11-13T13:00:00.000Z' }), { session: SESSION, expiresAt: '2026-11-13T13:00:00.000Z' });
  assert.equal(parseDirectSession({ session: 'short', expiresAt: '2026-11-13T13:00:00.000Z' }), null);
  assert.equal(parseDirectSession({ session: `${SESSION}=`, expiresAt: '2026-11-13T13:00:00.000Z' }), null, 'base64url only');
  assert.equal(parseDirectSession({ session: SESSION, expiresAt: 'tomorrow' }), null);
});

test('the identity check parses every step; a link to the ID check is followed over https only', () => {
  const kyc = (over: Record<string, unknown>) => ({ step: 'document', documentUrl: 'https://verify.example.com/s/abc', error: null, limitUsd: null, ...over });
  assert.deepEqual(parseDirectKyc(kyc({})), { step: 'document', documentUrl: 'https://verify.example.com/s/abc', error: null, limitUsd: null });
  assert.equal(parseDirectKyc(kyc({ documentUrl: 'http://verify.example.com/s/abc' }))?.documentUrl, null);
  assert.equal(parseDirectKyc(kyc({ documentUrl: 'javascript:alert(1)' }))?.documentUrl, null);
  assert.equal(parseDirectKyc(kyc({ documentUrl: 42 })), null);
  assert.equal(safeDocumentUrl('https://user:pw@verify.example.com/'), null);
  assert.equal(parseDirectKyc(kyc({ step: 'details', documentUrl: null, error: 'phone_taken' }))?.error, 'phone_taken');
  assert.equal(parseDirectKyc(kyc({ error: 'PHONE_NUMBER_EXIST' })), null, 'the marketplace\'s own codes never reach the page');
  assert.equal(parseDirectKyc(kyc({ step: 'ready', documentUrl: null, limitUsd: '9850.00' }))?.limitUsd, '9850.00');
  assert.equal(parseDirectKyc(kyc({ step: 'passed' })), null);
});

test('saved accounts carry a hint, never a whole number', () => {
  assert.deepEqual(parseDirectAccounts({ accounts: [{ id: 'pd_1', holder: 'María Gómez', bank: 'galicia', hint: '6782' }, { id: 'pd_2', holder: 'María Gómez', bank: null, hint: 'maria.gomez.mp' }] }), [
    { id: 'pd_1', holder: 'María Gómez', bank: 'galicia', hint: '6782' },
    { id: 'pd_2', holder: 'María Gómez', bank: null, hint: 'maria.gomez.mp' },
  ]);
  assert.deepEqual(parseDirectAccounts({ accounts: [] }), []);
  assert.equal(parseDirectAccounts({ accounts: [{ id: 'pd_1', holder: 'María', bank: 'galicia', hint: '0070999000004123456782' }] }), null);
  assert.equal(parseDirectAccounts({ accounts: [{ id: 'pd_1', holder: 'A', bank: 'galicia', hint: '6782' }, { id: 'pd_1', holder: 'B', bank: 'galicia', hint: '1111' }] }), null);
  assert.equal(parseDirectAccounts([]), null);
});

test('an order parses as the contract shows it, and the account to pay is safe to copy', () => {
  assert.deepEqual(parseDirectOrder(order()), {
    id: 'a1b2c3d4-0000-4000-8000-000000000001',
    status: 'pay',
    amount: '15000',
    currency: 'ARS',
    payTo: { holder: 'Juan Pérez', cbu: '0000003100000000000000', alias: 'juan.perez.mp', bank: 'mercado_pago' },
    dueAt: '2026-11-13T13:00:00.000Z',
    createdAt: '2026-11-13T12:30:00.000Z',
  });
  // A CVU/CBU with wrong check digits is never shown to copy; the alias is still enough.
  const broken = parseDirectOrder(order({ payTo: { holder: 'Juan Pérez', cbu: '0000003100000000000001', alias: 'juan.perez.mp', bank: null } }));
  assert.equal(broken?.payTo?.cbu, null);
  assert.equal(broken?.payTo?.alias, 'juan.perez.mp');
  // Paying needs someone to pay.
  assert.equal(parseDirectOrder(order({ payTo: null })), null);
  assert.equal(parseDirectOrder(order({ payTo: { holder: 'Juan Pérez', cbu: '123', alias: 'x', bank: null } })), null);
  // The account is only part of `pay` and `confirming`.
  assert.equal(parseDirectOrder(order({ status: 'completed' }))?.payTo, null);
  assert.equal(parseDirectOrder(order({ status: 'matching', payTo: null, dueAt: null }))?.status, 'matching');
  for (const bad of [{ status: 'ACCEPTED' }, { amount: '15000.505' }, { amount: '0' }, { currency: 'ars' }, { dueAt: 'soon' }, { createdAt: null }, { id: 'a b' }]) {
    assert.equal(parseDirectOrder(order(bad)), null, JSON.stringify(bad));
  }
});

/* ---- what the page shows ---- */

test('every identity step and order status maps to the step the page shows', () => {
  const kyc = (step: DirectKyc['step']): DirectKyc => ({ step, documentUrl: null, error: null, limitUsd: null });
  const ord = (status: DirectOrder['status']): DirectOrder => ({ id: 'o1', status, amount: '1', currency: 'ARS', payTo: null, dueAt: null, createdAt: '2026-11-13T12:00:00Z' });
  const base = { session: true, challenge: false, kyc: null, order: null };
  assert.equal(directStepOf({ ...base, session: false }), 'email');
  assert.equal(directStepOf({ ...base, session: false, challenge: true }), 'code');
  assert.equal(directStepOf(base), 'loading');
  for (const step of ['details', 'phone', 'document', 'review', 'rejected'] as const) assert.equal(directStepOf({ ...base, kyc: kyc(step) }), step);
  assert.equal(directStepOf({ ...base, kyc: kyc('ready') }), 'account');
  assert.equal(kycStepView('ready'), 'account');
  // Changing the number while its code is awaited shows the details again.
  assert.equal(directStepOf({ ...base, kyc: kyc('phone'), editingPhone: true }), 'details');
  for (const status of ['matching', 'pay', 'confirming', 'completed', 'cancelled', 'disputed'] as const) {
    assert.equal(directStepOf({ ...base, kyc: kyc('ready'), order: ord(status) }), status);
  }
  // Without a session an order on its way waits for the email; one that is over shows anyway.
  assert.equal(directStepOf({ ...base, session: false, order: ord('pay') }), 'email');
  for (const status of ['completed', 'cancelled', 'disputed'] as const) assert.equal(directStepOf({ ...base, session: false, order: ord(status) }), status);
  // Followed past the charge's deadline: everything but an order that is over for the payer.
  assert.deepEqual(['matching', 'pay', 'confirming', 'disputed', 'completed', 'cancelled'].map((s) => orderFollowed(ord(s as DirectOrder['status']))), [true, true, true, true, false, false]);
  assert.equal(orderFollowed(null), false);
});

test('each step reads the server at its own pace, and the clock counts down to the deadline', () => {
  assert.equal(directPollDelay('matching'), 4_000);
  assert.equal(directPollDelay('document'), 5_000);
  assert.equal(directPollDelay('confirming'), 5_000);
  assert.equal(directPollDelay('pay'), 10_000);
  for (const step of ['email', 'code', 'details', 'phone', 'account', 'completed', 'cancelled', 'disputed', 'rejected'] as const) assert.equal(directPollDelay(step), null, step);
  const now = Date.parse('2026-11-13T12:00:00.000Z');
  assert.equal(countdown('2026-11-13T12:14:05.000Z', now), '14:05');
  assert.equal(countdown('2026-11-13T13:02:03.000Z', now), '1:02:03');
  assert.equal(countdown('2026-11-13T12:00:00.400Z', now), '0:01');
  assert.equal(countdown('2026-11-13T12:00:00.000Z', now), null);
  assert.equal(countdown(null, now), null);
});

/* ---- what the tab keeps ---- */

test('each kind of what the tab keeps has its own key per charge', () => {
  const keys = (id: string) => (Object.keys(FIAT_STORAGE_PREFIXES) as (keyof typeof FIAT_STORAGE_PREFIXES)[]).map((kind) => fiatStorageKey(kind, id));
  assert.equal(fiatStorageKey('direct', ID), `cosmospay-fiat-direct:${ID}`);
  // The window's and the transfer's keys stay what they were, so a reload after deploying resumes.
  assert.equal(fiatStorageKey('window', ID), `cosmospay-fiat:${ID}`);
  assert.equal(fiatStorageKey('transfer', ID), `cosmospay-fiat-transfer:${ID}`);
  const one = keys(ID);
  const other = keys('cmh4x2k9a0002l70g8v5q3z2w');
  assert.equal(new Set([...one, ...other]).size, one.length + other.length);
});

test('the tab keeps the session until it expires and the order id after it, nothing else', () => {
  const now = Date.parse('2026-11-13T12:00:00.000Z');
  const raw = (v: unknown) => JSON.stringify(v);
  assert.deepEqual(readStoredDirect(raw({ session: SESSION, expiresAt: '2026-11-13T13:00:00.000Z', orderId: 'o-1' }), now), { session: SESSION, expiresAt: '2026-11-13T13:00:00.000Z', orderId: 'o-1' });
  // Past its expiry the session goes; the order stays, to resume it after signing in again.
  assert.deepEqual(readStoredDirect(raw({ session: SESSION, expiresAt: '2026-11-13T11:59:59.000Z', orderId: 'o-1' }), now), { session: null, expiresAt: null, orderId: 'o-1' });
  assert.equal(readStoredDirect(raw({ session: SESSION, expiresAt: '2026-11-13T11:00:00.000Z', orderId: null }), now), null);
  assert.equal(readStoredDirect(raw({ session: 'not a session', expiresAt: '2026-11-13T13:00:00.000Z', orderId: null }), now), null);
  assert.equal(readStoredDirect(raw({ session: SESSION, expiresAt: '2026-11-13T13:00:00.000Z', orderId: '<x>' }), now)?.orderId, null);
  assert.equal(readStoredDirect('{', now), null);
  assert.equal(readStoredDirect(null, now), null);
});

/* ---- talking to the server ---- */

test('every refusal maps to its own failure, and a generic one to what the call sent', () => {
  assert.equal(directFailureOf(401, 'session_expired'), 'session-expired');
  assert.equal(directFailureOf(401, ''), 'session-expired');
  assert.equal(directFailureOf(429, ''), 'rate-limited');
  assert.equal(directFailureOf(409, 'request_closed'), 'closed');
  assert.equal(directFailureOf(400, 'method_unavailable'), 'method-unavailable');
  assert.equal(directFailureOf(503, 'p2p_unavailable'), 'unavailable');
  assert.equal(directFailureOf(503, 'no_sellers'), 'no-sellers');
  assert.equal(directFailureOf(409, 'kyc_required'), 'kyc-required');
  assert.equal(directFailureOf(409, 'too_many_orders'), 'too-many-orders');
  assert.equal(directFailureOf(409, 'order_not_payable'), 'order-moved');
  assert.equal(directFailureOf(409, 'order_not_cancellable'), 'order-moved');
  assert.equal(directFailureOf(400, 'invalid_code'), 'invalid-code');
  assert.equal(directFailureOf(400, 'invalid_phone'), 'invalid-phone');
  assert.equal(directFailureOf(400, 'rejected'), 'rejected');
  assert.equal(directFailureOf(404, 'not_found'), 'not-found');
  assert.equal(directFailureOf(400, 'validation_failed', 'invalid-email'), 'invalid-email');
  assert.equal(directFailureOf(400, 'validation_failed', 'invalid-account'), 'invalid-account');
  assert.equal(directFailureOf(400, 'validation_failed'), 'rejected');
  assert.equal(directFailureOf(503, ''), 'unavailable');
  assert.equal(directFailureOf(500, ''), 'error');
});

test('the calls go to the direct routes, the session in its header and nowhere else', async () => {
  const login = fakeFetch(200, { challenge: 'otp-1', newAccount: false });
  const res = await directLogin('https://api.example/cosmos-api/', ID, 'ana@example.com', 'fr', login.fetch);
  assert.deepEqual(res, { kind: 'ok', value: { challenge: 'otp-1', newAccount: false } });
  assert.equal(login.calls[0].url, `https://api.example/cosmos-api/v1/payment-links/fiat/${ID}/direct/login`);
  const loginHeaders = login.calls[0].init?.headers as Record<string, string>;
  assert.equal(loginHeaders['accept-language'], 'en', 'the server writes es, en and pt');
  assert.equal(loginHeaders['x-payer-session'], undefined);
  assert.equal(login.calls[0].init?.body, JSON.stringify({ email: 'ana@example.com' }));
  assert.equal(loginLanguage('es'), 'es');
  assert.equal(loginLanguage('pt'), 'pt');
  assert.equal(loginLanguage('zh'), 'en');

  const kyc = fakeFetch(200, { step: 'ready', documentUrl: null, error: null, limitUsd: null });
  await directKyc('https://api.example', ID, SESSION, kyc.fetch);
  assert.equal(kyc.calls[0].url, `https://api.example/v1/payment-links/fiat/${ID}/direct/kyc`);
  assert.equal((kyc.calls[0].init?.headers as Record<string, string>)['x-payer-session'], SESSION);
  assert.ok(!kyc.calls[0].url.includes(SESSION), 'never in the address');

  const created = fakeFetch(201, order({ status: 'matching', payTo: null, dueAt: null }));
  const account = normalizeAccount({ holder: 'María Gómez', cbu: '0070999000004123456782', documentType: 'CUIT', document: '27301234568', bank: 'galicia', accountType: 'checking' });
  assert.ok(account);
  const made = await directCreateOrder('https://api.example', ID, SESSION, { account }, created.fetch);
  assert.equal(made.kind, 'ok');
  assert.equal(created.calls[0].url, `https://api.example/v1/payment-links/fiat/${ID}/direct/orders`);
  assert.deepEqual(JSON.parse(String(created.calls[0].init?.body)), { account });

  const expired = await directKyc('https://api.example', ID, SESSION, fakeFetch(401, { code: 'session_expired' }).fetch);
  assert.deepEqual(expired, { kind: 'fail', failure: 'session-expired', retryAfterMs: null });
  const limited = await directKyc('https://api.example', ID, SESSION, fakeFetch(429, {}, { 'retry-after': '12' }).fetch);
  assert.deepEqual(limited, { kind: 'fail', failure: 'rate-limited', retryAfterMs: 12_000 });
  const invalid = await directLogin('https://api.example', ID, 'x', 'es', fakeFetch(400, { code: 'validation_failed' }).fetch);
  assert.deepEqual(invalid, { kind: 'fail', failure: 'invalid-email', retryAfterMs: null });
  const foreign = await directKyc('https://api.example', ID, SESSION, fakeFetch(200, { step: 'passed' }).fetch);
  assert.deepEqual(foreign, { kind: 'fail', failure: 'error', retryAfterMs: null });
  const down = await directKyc('https://api.example', ID, SESSION, (async () => { throw new Error('offline'); }) as unknown as typeof fetch);
  assert.deepEqual(down, { kind: 'fail', failure: 'error', retryAfterMs: null });
});

/* ---- the copy ---- */

test('the direct flow\'s copy never says crypto, a token or "buy", in any language', () => {
  // The payer pays a seller by bank transfer to a verified person (product owner, 2026-11-13); the
  // provider names are noProviderNames.test.ts's.
  const FORBIDDEN = /cripto|crypto|krypto|usdt|stablecoin|\btoken|comprar|\bbuy|kaufen|acheter|achat|compra\b|क्रिप्टो|ख़रीद|खरीद|加密|购买|代币/i;
  const strings = (v: unknown): string[] => (typeof v === 'string' ? [v] : v && typeof v === 'object' ? Object.values(v).flatMap(strings) : []);
  for (const { code } of LOCALES) {
    const f = MESSAGES[code].fiat;
    const copy = [...strings(f.direct), f.directTitle, f.directDesc, f.phase.matching, f.phase.confirming, f.phase.disputed, f.phase.transferCancelled];
    for (const s of copy) assert.doesNotMatch(s, FORBIDDEN, `${code}: ${s}`);
  }
});

/* ---- the mock ---- */

const json = (payload: unknown, status = 200) => new Response(payload === undefined ? null : JSON.stringify(payload), { status, headers: { 'content-type': 'application/json' } });
const read = (id: string) => fiatRequestRoute(new Request(`http://mock/v1/payment-links/fiat/${id}`), [id], json);
function call(id: string, path: string[], body?: unknown, session?: string) {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (session) headers['x-payer-session'] = session;
  const method = body === undefined ? 'GET' : 'POST';
  const req = new Request(`http://mock/v1/payment-links/fiat/${id}/direct/${path.join('/')}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  return fiatRequestRoute(req, [id, 'direct', ...path], json);
}
async function signIn(id: string, email: string): Promise<string> {
  const login = await call(id, ['login'], { email });
  assert.equal(login.status, 200);
  const challenge = parseDirectChallenge(await login.json());
  assert.ok(challenge);
  const wrong = await call(id, ['login', 'verify'], { challenge: challenge.challenge, code: '00000000' });
  assert.equal(wrong.status, 400);
  const verified = await call(id, ['login', 'verify'], { challenge: challenge.challenge, code: 'AB12CD34' });
  const session = parseDirectSession(await verified.json());
  assert.ok(session, 'the mock session is shaped as the server\'s');
  return session.session;
}
async function withClock<T>(offset: number, fn: () => Promise<T>): Promise<T> {
  const realNow = Date.now;
  Date.now = () => realNow() + offset;
  try {
    return await fn();
  } finally {
    Date.now = realNow;
  }
}

test('the direct demo charges say so in their public read, and the others keep the window', async () => {
  const direct = parseFiatRequest(await (await read(FIAT_FIXTURE_IDS.direct)).json());
  assert.equal(direct?.p2pDirect, true);
  assert.deepEqual(direct?.methods, ['transfer', 'p2p']);
  const fresh = parseFiatRequest(await (await read(FIAT_FIXTURE_IDS.directNew)).json());
  assert.equal(fresh?.p2pDirect, true);
  assert.deepEqual(fresh?.methods, ['p2p']);
  assert.equal(parseFiatRequest(await (await read(FIAT_FIXTURE_IDS.openArs)).json())?.p2pDirect, false);
  // Off for a charge: refused as the server does.
  const off = await call(FIAT_FIXTURE_IDS.openArs, ['login'], { email: 'ana@example.com' });
  assert.equal(off.status, 400);
  assert.equal(((await off.json()) as { code: string }).code, 'method_unavailable');
});

test('the mock walks a new payer through every identity step', async () => {
  const id = FIAT_FIXTURE_IDS.directNew;
  const session = await signIn(id, 'ana@example.com');
  const kyc = async () => parseDirectKyc(await (await call(id, ['kyc'], undefined, session)).json());
  assert.equal((await kyc())?.step, 'details');
  assert.equal((await call(id, ['kyc'], undefined, 'not-a-session')).status, 401);
  assert.equal((await call(FIAT_FIXTURE_IDS.direct, ['kyc'], undefined, session)).status, 401, 'a session is for its own charge');
  assert.equal((await call(id, ['kyc', 'details'], { city: 'Salta', phone: '12' }, session)).status, 400);
  const taken = parseDirectKyc(await (await call(id, ['kyc', 'details'], { city: 'Salta', phone: '1111111111' }, session)).json());
  assert.deepEqual([taken?.step, taken?.error], ['details', 'phone_taken']);
  assert.equal(parseDirectKyc(await (await call(id, ['kyc', 'details'], { city: 'Salta', phone: '3874123456' }, session)).json())?.step, 'phone');
  assert.equal((await call(id, ['kyc', 'phone'], { code: '9999' }, session)).status, 400);
  const doc = parseDirectKyc(await (await call(id, ['kyc', 'phone'], { code: PHONE_CODE }, session)).json());
  assert.equal(doc?.step, 'document');
  assert.equal(doc?.documentUrl, 'https://example.com/');
  assert.equal((await withClock(DOCUMENT_MS + 500, kyc))?.step, 'review');
  assert.equal((await withClock(DOCUMENT_MS + REVIEW_MS + 500, kyc))?.step, 'ready');
  // Ready: no saved account yet, and an order needs one that is valid.
  assert.deepEqual(parseDirectAccounts(await (await call(id, ['accounts'], undefined, session)).json()), []);
  const bad = await call(id, ['orders'], { account: { holder: 'Ana', cbu: '0070999000004123456783', documentType: 'CUIL', document: '27301234568', bank: 'galicia', accountType: 'savings' } }, session);
  assert.equal(bad.status, 400);
  const made = await call(id, ['orders'], { account: { holder: 'Ana López', cbu: '0070999000004123456782', documentType: 'CUIL', document: '27301234568', bank: 'galicia', accountType: 'savings' } }, session);
  assert.equal(made.status, 201);
  assert.equal(parseDirectOrder(await made.json())?.status, 'matching');
  // The typed account comes back saved, as a hint only.
  const saved = parseDirectAccounts(await (await call(id, ['accounts'], undefined, session)).json());
  assert.deepEqual(saved?.map((a) => [a.bank, a.hint]), [['galicia', '6782']]);
});

test('the mock ends a payer whose email says so rejected, and refuses an order before the check is done', async () => {
  const id = FIAT_FIXTURE_IDS.directNew;
  const session = await signIn(id, 'rejected.demo@example.com');
  const before = await call(id, ['orders'], { accountId: 'pd-mock-galicia' }, session);
  assert.equal(before.status, 409);
  assert.equal(((await before.json()) as { code: string }).code, 'kyc_required');
  await call(id, ['kyc', 'details'], { city: 'Salta', phone: '+5493874123456' }, session);
  await call(id, ['kyc', 'phone'], { code: PHONE_CODE }, session);
  const step = await withClock(DOCUMENT_MS + REVIEW_MS + 500, async () => parseDirectKyc(await (await call(id, ['kyc'], undefined, session)).json())?.step);
  assert.equal(step, 'rejected');
});

test('the demo order goes matching, pay, confirming, completed, and pays the charge', async () => {
  const id = FIAT_FIXTURE_IDS.direct;
  const session = await signIn(id, 'martin@example.com');
  assert.equal(parseDirectKyc(await (await call(id, ['kyc'], undefined, session)).json())?.step, 'ready');
  const accounts = parseDirectAccounts(await (await call(id, ['accounts'], undefined, session)).json());
  assert.equal(accounts?.length, 2);
  const res = await call(id, ['orders'], { accountId: accounts![0].id }, session);
  assert.equal(res.status, 201);
  const created = parseDirectOrder(await res.json());
  assert.ok(created);
  const get = async () => parseDirectOrder(await (await call(id, ['orders', created.id], undefined, session)).json());
  const status = async () => parseFiatRequest(await (await read(id)).json())?.status;
  assert.equal((await get())?.status, 'matching');
  // Paying before there is anyone to pay is refused.
  assert.equal((await call(id, ['orders', created.id, 'paid'], {}, session)).status, 409);

  const pay = await withClock(MATCHING_MS + 500, get);
  assert.equal(pay?.status, 'pay');
  assert.ok(pay?.payTo?.cbu && pay.payTo.alias && pay.payTo.holder, 'the verified person, ready to copy');
  assert.equal(pay?.amount, '18500');
  assert.ok(pay?.dueAt && Date.parse(pay.dueAt) > Date.now() + PAY_WINDOW_MS - 60_000);

  const paid = await withClock(MATCHING_MS + 1_000, async () => parseDirectOrder(await (await call(id, ['orders', created.id, 'paid'], {}, session)).json()));
  assert.equal(paid?.status, 'confirming');
  assert.equal(await withClock(MATCHING_MS + 1_500, status), 'processing', 'saying the transfer is done moves the charge');
  // Cancelling is over once the transfer is confirmed.
  assert.equal((await withClock(MATCHING_MS + 2_000, () => call(id, ['orders', created.id, 'cancel'], {}, session))).status, 409);

  const done = await withClock(MATCHING_MS + 1_000 + CONFIRMING_MS + 500, get);
  assert.equal(done?.status, 'completed');
  const charge = await withClock(MATCHING_MS + 1_000 + CONFIRMING_MS + 500, async () => parseFiatRequest(await (await read(id)).json()));
  assert.equal(charge?.status, 'paid');
  assert.ok(charge?.paidAt);
  // A paid charge takes no new login, but its order is still read.
  assert.equal((await call(id, ['login'], { email: 'martin@example.com' })).status, 409);
});

test('the mock cancels an order on request, and refuses an order of another charge', async () => {
  const id = FIAT_FIXTURE_IDS.directNew;
  const session = await signIn(id, 'ready.demo@example.com');
  const made = parseDirectOrder(await (await call(id, ['orders'], { accountId: 'pd-mock-brubank' }, session)).json());
  assert.ok(made);
  assert.equal((await call(FIAT_FIXTURE_IDS.direct, ['orders', made.id], undefined, session)).status, 401);
  assert.equal((await call(id, ['orders', 'mock-order-nope'], undefined, session)).status, 404);
  const cancelled = parseDirectOrder(await (await call(id, ['orders', made.id, 'cancel'], {}, session)).json());
  assert.equal(cancelled?.status, 'cancelled');
  assert.equal(parseFiatRequest(await (await read(id)).json())?.status, 'open', 'a cancelled order leaves the charge open');
});
