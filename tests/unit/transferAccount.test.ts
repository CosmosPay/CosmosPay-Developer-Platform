/* transferAccount.test.ts: the organization's own account for payments by bank transfer (QR charges'
   "Bank transfers" card, src/lib/transfer-account.ts): what the card accepts from the server (the
   verification link only over https, an approved account only with a valid alias and CVU), what the
   activation form checks before sending (a CUIT/CUIL for that kind of holder with its check digit,
   an adult's date of birth for a person, the contact and the address), and the mock API's account
   (src/lib/mock/transfer-account.ts): a fixture per status, the shape of docs/openapi.json's
   TransferAccountEntity, and the demo none, pending, approved. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  TRANSFER_ACCOUNT_STATUSES, birthDateProblem, emailOk, emptyTransferAccountDraft, parseTransferAccount, phoneOk, postalCodeOk,
  safeVerificationUrl, taxIdProblem, transferAccountBody, transferAccountCanStart, transferAccountStepOk, transferAccountWaiting,
  type TransferAccountDraft,
} from '@/lib/transfer-account';
import { cvuOk } from '@/lib/payments/fiat-request';
import { matchPath, type MockRequest } from '@/lib/mock/http';
import { routes } from '@/lib/mock/handlers/p2p-ramp';
import { APPROVED_AFTER_MS, mockCvu } from '@/lib/mock/transfer-account';

function account(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    status: 'approved', type: 'company', name: 'Andes Commerce S.R.L.', verificationUrl: null, reason: null,
    alias: 'andes.cobros', cvu: '0000003100000000000000', bank: null, updatedAt: '2026-11-12T12:00:00.000Z', ...over,
  };
}

test('the server\'s account parses in every status, and an approved one carries its alias and CVU', () => {
  assert.equal(parseTransferAccount(account())?.alias, 'andes.cobros');
  for (const status of TRANSFER_ACCOUNT_STATUSES) {
    const body = status === 'approved' ? account() : account({ status, alias: null, cvu: null });
    assert.equal(parseTransferAccount(body)?.status, status, status);
  }
  assert.deepEqual(parseTransferAccount({ status: 'none', type: null, name: null, verificationUrl: null, reason: null, alias: null, cvu: null, bank: null, updatedAt: null })?.status, 'none');
  for (const bad of [
    { status: 'active' }, { type: 'bank' }, { name: 'two\nlines' }, { alias: 'abc' }, { cvu: '0000003100000000000001' },
    { alias: null }, { cvu: null }, { updatedAt: 'yesterday' }, { reason: 7 },
  ]) assert.equal(parseTransferAccount(account(bad)), null, JSON.stringify(bad));
  for (const junk of [null, 'x', [], 1]) assert.equal(parseTransferAccount(junk), null, JSON.stringify(junk));
});

test('the verification form opens only over https (http only on a local host)', () => {
  assert.equal(safeVerificationUrl('https://verify.example.com/onboarding/abc'), 'https://verify.example.com/onboarding/abc');
  assert.equal(safeVerificationUrl('http://payments.cosmospay.localhost:4330/x'), 'http://payments.cosmospay.localhost:4330/x');
  for (const bad of ['http://verify.example.com/x', 'javascript:alert(1)', 'https://u:p@verify.example.com/', '/relative', '', null, 42]) {
    assert.equal(safeVerificationUrl(bad), null, String(bad));
  }
  // A link the card cannot open is dropped, the rest of the account kept.
  const pending = parseTransferAccount(account({ status: 'pending', alias: null, cvu: null, verificationUrl: 'javascript:alert(1)' }));
  assert.equal(pending?.verificationUrl, null);
  assert.ok(transferAccountWaiting('pending') && transferAccountWaiting('in_review') && !transferAccountWaiting('approved'));
  assert.ok(transferAccountCanStart('none') && transferAccountCanStart('rejected') && !transferAccountCanStart('pending'));
});

test('the tax id is a CUIT/CUIL of that kind of holder, its check digit right', () => {
  assert.equal(taxIdProblem('20-12345678-6', 'person'), null);
  assert.equal(taxIdProblem('27280335148', 'person'), null);
  assert.equal(taxIdProblem('30-71234567-1', 'company'), null);
  assert.equal(taxIdProblem('', 'person'), 'empty');
  assert.equal(taxIdProblem('12345678', 'person'), 'shape');
  assert.equal(taxIdProblem('20-12345678-5', 'person'), 'check');
  // A person's number for a company, and the other way round.
  assert.equal(taxIdProblem('20-12345678-6', 'company'), 'kind');
  assert.equal(taxIdProblem('30-71234567-1', 'person'), 'kind');
});

test('contact, address and a person\'s date of birth are checked before sending', () => {
  const now = new Date('2026-11-12T12:00:00Z');
  assert.ok(emailOk('juan@example.com') && !emailOk('juan@') && !emailOk('juan example.com'));
  assert.ok(phoneOk('+54 9 387 555-1234') && phoneOk('3875551234') && !phoneOk('555') && !phoneOk('+54 9 387 abc'));
  assert.ok(postalCodeOk('4400') && postalCodeOk('A4400ABC') && !postalCodeOk('44') && !postalCodeOk('4400-AB'));
  assert.equal(birthDateProblem('1990-01-15', now), null);
  assert.equal(birthDateProblem('', now), 'empty');
  assert.equal(birthDateProblem('15/01/1990', now), 'shape');
  assert.equal(birthDateProblem('1990-02-30', now), 'shape');
  assert.equal(birthDateProblem('2010-01-01', now), 'age');
  assert.equal(birthDateProblem('2008-11-12', now), null);
  assert.equal(birthDateProblem('2008-11-13', now), 'age');
});

test('the body sends what the server takes, digits only, a date of birth for a person alone', () => {
  const now = new Date('2026-11-12T12:00:00Z');
  const person: TransferAccountDraft = {
    type: 'person', name: ' Juan Pérez ', taxId: '20-12345678-6', email: 'juan@example.com', phone: '+54 9 387 555 1234',
    address: 'Av. Belgrano 123', city: 'Salta', postalCode: 'a4400abc', dateOfBirth: '1990-01-15',
  };
  assert.deepEqual(transferAccountBody(person, now), {
    type: 'person', name: 'Juan Pérez', taxId: '20123456786', email: 'juan@example.com', phone: '+5493875551234',
    address: 'Av. Belgrano 123', city: 'Salta', postalCode: 'A4400ABC', dateOfBirth: '1990-01-15',
  });
  const company = { ...person, type: 'company' as const, name: 'Andes Commerce S.R.L.', taxId: '30-71234567-1', dateOfBirth: '' };
  assert.equal(transferAccountBody(company, now)?.dateOfBirth, undefined);
  assert.equal(transferAccountBody({ ...person, dateOfBirth: '' }, now), null);
  assert.equal(transferAccountBody({ ...person, taxId: '30-71234567-1' }, now), null);
  assert.equal(transferAccountBody(emptyTransferAccountDraft(), now), null);
  // Phone, city and postal code are optional: left out when empty, checked only when typed.
  const bare = transferAccountBody({ ...person, phone: '', city: ' ', postalCode: '' }, now);
  assert.ok(bare);
  assert.ok(!('phone' in bare) && !('city' in bare) && !('postalCode' in bare));
  assert.equal(transferAccountBody({ ...person, phone: '555' }, now), null);
  assert.equal(transferAccountBody({ ...person, postalCode: '44' }, now), null);
  assert.ok(transferAccountStepOk({ ...person, phone: '' }, 1, now));
  assert.ok(!transferAccountStepOk({ ...person, phone: '555' }, 1, now));
  assert.ok(transferAccountStepOk({ ...person, city: '', postalCode: '' }, 2, now));
  assert.ok(!transferAccountStepOk({ ...person, postalCode: '4400-AB' }, 2, now));
  // Each step is valid on its own: who, how to reach them, where.
  assert.ok(transferAccountStepOk(person, 0, now) && transferAccountStepOk(person, 1, now) && transferAccountStepOk(person, 2, now));
  assert.ok(!transferAccountStepOk({ ...person, email: 'x' }, 1, now));
  assert.ok(transferAccountStepOk(company, 0, now));
});

/* ---- the mock API ---- */

const spec = JSON.parse(readFileSync(path.resolve(import.meta.dirname, '..', '..', 'docs', 'openapi.json'), 'utf8'));
const ENTITY = spec.components.schemas.TransferAccountEntity as { properties: Record<string, { enum?: string[] }>; required: string[] };

async function call(method: string, org: string, env: 'dev' | 'prod', body: Record<string, unknown> | null = null) {
  const url = new URL(`http://dev.cosmospay.localhost/api/onramp/transfer/account?env=${env}&org=${org}`);
  for (const r of routes) {
    if (r.method !== method) continue;
    const params = matchPath(r.path, url.pathname);
    if (!params) continue;
    const req = { method, url, params, body, env, org, user: { id: 'u', name: 'U', email: 'u@example.com', image: null }, options: { role: 'owner', plan: 'growth', fresh: false, latencyMs: 0 } } as MockRequest;
    const res = await r.handler(req);
    return { status: res.status, json: await res.json() };
  }
  throw new Error(`no mock for ${method}`);
}

function assertEntity(row: Record<string, unknown>) {
  assert.deepEqual(Object.keys(row).sort(), Object.keys(ENTITY.properties).sort());
  assert.ok(ENTITY.properties.status.enum?.includes(row.status as string));
  assert.ok(parseTransferAccount(row), JSON.stringify(row));
}

const PERSON = {
  type: 'person', name: 'Juan Pérez', taxId: '20-12345678-6', email: 'juan@example.com', phone: '+54 9 387 555 1234',
  address: 'Av. Belgrano 123', city: 'Salta', postalCode: '4400', dateOfBirth: '1990-01-15',
};

test('the mock has an account in each status, in the server\'s shape', async () => {
  const seen = new Set<string>();
  for (const env of ['dev', 'prod'] as const) {
    for (const org of ['org_mock_andes', 'org_mock_salta', 'org_mock_puna']) {
      const res = await call('GET', org, env);
      assert.equal(res.status, 200);
      assertEntity(res.json.data);
      seen.add(res.json.data.status);
      if (res.json.data.status === 'approved') assert.ok(cvuOk(res.json.data.cvu));
      if (res.json.data.status === 'pending' || res.json.data.status === 'in_review') assert.ok(res.json.data.verificationUrl);
      if (res.json.data.status === 'rejected') assert.ok(res.json.data.reason);
    }
  }
  assert.deepEqual([...seen].sort(), [...TRANSFER_ACCOUNT_STATUSES].sort());
  assert.ok(cvuOk(mockCvu('anything')) && cvuOk(mockCvu('org_mock_andes:andes.cobros')));
});

test('activating in the mock goes none, pending, approved, and refuses what the server refuses', async () => {
  const org = 'org_mock_andes';
  assert.equal((await call('GET', org, 'dev')).json.data.status, 'none');
  assert.equal((await call('POST', org, 'dev', { ...PERSON, taxId: '20-12345678-5' })).status, 400);
  assert.equal((await call('POST', org, 'dev', { ...PERSON, type: 'company' })).status, 400);
  assert.equal((await call('POST', org, 'dev', { ...PERSON, dateOfBirth: '' })).status, 400);
  assert.equal((await call('POST', org, 'dev', { ...PERSON, phone: '555' })).status, 400);
  const res = await call('POST', org, 'dev', PERSON);
  assert.equal(res.status, 201);
  assertEntity(res.json.data);
  assert.equal(res.json.data.status, 'pending');
  assert.equal(res.json.data.name, 'Juan Pérez');
  assert.ok(safeVerificationUrl(res.json.data.verificationUrl));
  // The tax id never comes back.
  assert.ok(!JSON.stringify(res.json.data).includes('12345678'));
  assert.equal((await call('POST', org, 'dev', PERSON)).status, 409);
  const realNow = Date.now;
  try {
    Date.now = () => realNow() + APPROVED_AFTER_MS + 500;
    const approved = (await call('GET', org, 'dev')).json.data;
    assertEntity(approved);
    assert.equal(approved.status, 'approved');
    assert.ok(cvuOk(approved.cvu));
    assert.match(approved.alias, /^[a-z0-9.-]{6,20}$/);
  } finally {
    Date.now = realNow;
  }
  // A rejected one is tried again.
  assert.equal((await call('GET', 'org_mock_salta', 'prod')).json.data.status, 'rejected');
  // Without the optional fields too.
  const { phone: _p, city: _c, postalCode: _z, ...required } = PERSON;
  assert.equal((await call('POST', 'org_mock_salta', 'prod', { ...required, type: 'company', name: 'Salta Labs S.A.', taxId: '30-71234567-1' })).status, 201);
});
