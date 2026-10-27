/* publicSwapApi.test.ts: the public swap pages' client (src/lib/swap-api.ts). Every visitor shares
   the public key, so a record it creates comes back with a `publicToken` that only its creator
   holds: the client keeps it, sends it as X-Record-Token on that record's later calls (and only
   that record's), and never hands it to the screens. fetch is replaced by a recorder. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { publicSwapApi } from '@/lib/swap-api';

type Call = { url: string; method: string; headers: Record<string, string>; body?: string };

function recorder(answer: (call: Call) => unknown) {
  const calls: Call[] = [];
  const fetchFn = async (url: string, init: { method?: string; headers?: Record<string, string>; body?: string } = {}) => {
    const call = { url, method: init.method ?? 'GET', headers: init.headers ?? {}, body: init.body };
    calls.push(call);
    const data = answer(call);
    return { ok: true, status: 200, json: async () => ({ data, code: 200, status: 'success', message: 'ok' }) };
  };
  return { calls, fetchFn };
}

const TOKEN = 'a'.repeat(43);

function withFetch<T>(fetchFn: unknown, run: () => Promise<T>): Promise<T> {
  const before = globalThis.fetch;
  (globalThis as { fetch: unknown }).fetch = fetchFn;
  return run().finally(() => { (globalThis as { fetch: unknown }).fetch = before; });
}

test('a created record keeps its token for its own calls and the screens never see it', async () => {
  const { calls, fetchFn } = recorder((c) => {
    if (c.url.includes('/v1/public-key')) return { apiKey: 'pk_shared' };
    if (c.method === 'POST' && c.url.endsWith('/v1/usdt0/transfers')) return { id: 'tr_1', status: 'PENDING', publicToken: TOKEN };
    return { id: 'tr_1', status: 'SUBMITTED' };
  });
  await withFetch(fetchFn, async () => {
    const api = publicSwapApi('https://gateway.example/cosmos-api');
    const created = await api.create('usdt0', { source: 'G...', to: 'eth', recipient: '0x0', amount: '1' });
    assert.equal(created.id, 'tr_1');
    assert.equal('publicToken' in created, false, 'the token is not handed to the screens');

    await api.get('usdt0', 'tr_1');
    await api.submit('usdt0', 'tr_1', { signedXdr: 'AAAA' });
    const get = calls.find((c) => c.method === 'GET' && c.url.endsWith('/v1/usdt0/transfers/tr_1'));
    const submit = calls.find((c) => c.url.endsWith('/v1/usdt0/transfers/tr_1/submit'));
    assert.equal(get?.headers['x-record-token'], TOKEN);
    assert.equal(submit?.headers['x-record-token'], TOKEN);
    assert.equal(get?.headers.authorization, 'Bearer pk_shared');
    // never in the address
    assert.ok(calls.every((c) => !c.url.includes(TOKEN)));
  });
});

test("a record the page did not create gets no token, and one record's token never travels with another's", async () => {
  const { calls, fetchFn } = recorder((c) => {
    if (c.url.includes('/v1/public-key')) return { apiKey: 'pk_shared' };
    if (c.method === 'POST' && c.url.endsWith('/v1/swaps')) return { id: 'sw_mine', status: 'PENDING', publicToken: TOKEN };
    return { id: 'x', status: 'PENDING' };
  });
  await withFetch(fetchFn, async () => {
    const api = publicSwapApi('https://gateway.example/cosmos-api/');
    await api.create('dex', { amount: '1' });
    await api.get('same', 'sw_other');
    await api.reportDeposit('cc_other', 'hash');
    const other = calls.find((c) => c.url.endsWith('/v1/swaps/sw_other'));
    const deposit = calls.find((c) => c.url.endsWith('/v1/cross-chain-swaps/cc_other/deposit'));
    assert.equal(other?.headers['x-record-token'], undefined);
    assert.equal(deposit?.headers['x-record-token'], undefined);
    // the base URL's trailing slash is dropped
    assert.ok(calls.every((c) => !c.url.includes('cosmos-api//')));
  });
});
