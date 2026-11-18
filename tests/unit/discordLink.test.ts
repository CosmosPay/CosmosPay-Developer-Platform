/* discordLink.test.ts: linking a Discord server to an organization (src/lib/discord-link.ts,
   src/lib/discord-link-shared.ts, src/lib/discord-http.ts). The authorize address Discord gets,
   the install request's state and its single use, the signature the bot checks (over the method,
   the path and the exact body), the key's scopes, what the bot's and Discord's answers mean, and
   the outcome the callback hands back to Settings. */
import { strict as assert } from 'node:assert';
import { createHmac } from 'node:crypto';
import { test } from 'node:test';

import {
  DISCORD_BOT_PERMISSIONS,
  DISCORD_KEY_NAME_MAX,
  DISCORD_KEY_SCOPES,
  DISCORD_TOKEN_URL,
  INSTALL_TTL_MS,
  LINK_SIGNATURE_HEADER,
  authorizeUrl,
  botLinkPath,
  botLinkResult,
  discordCallbackUrl,
  discordConfigFrom,
  discordKeyName,
  installExpiresAt,
  installRequestProblem,
  installStateExpired,
  isInstallState,
  newInstallState,
  parseDiscordUser,
  parseTokenAnswer,
  signLinkRequest,
} from '@/lib/discord-link';
import {
  BOT_REFUSAL_CODES,
  DEFAULT_LINK_ASSET,
  LINK_FAILURE_REASONS,
  normalizeLinkAsset,
  outcomeLocation,
  readLinkOutcome,
} from '@/lib/discord-link-shared';
import { deleteBotLink, exchangeDiscordCode, postBotLink, readDiscordUser, type FetchLike } from '@/lib/discord-http';
import { COSMOS_SCOPES } from '@/lib/cosmos-scopes';
import { encodePermissionsLabel, parsePermissionsLabel } from '@/lib/api-key-labels';

const SECRET = 'a-link-secret-of-at-least-thirty-two-chars';
const hmac = (s: string) => createHmac('sha256', SECRET).update(s).digest('hex');

test('the authorize address asks for the bot, its commands and who linked it, back to the callback', () => {
  const redirectUri = discordCallbackUrl('https://dev.cosmospay.lat');
  assert.equal(redirectUri, 'https://dev.cosmospay.lat/api/integrations/discord/callback');
  const url = authorizeUrl({ clientId: '1300000000000000000', redirectUri, state: 'abc_DEF-123' });
  assert.equal(
    url,
    'https://discord.com/oauth2/authorize?client_id=1300000000000000000&scope=bot+applications.commands+identify' +
      `&permissions=${DISCORD_BOT_PERMISSIONS}&integration_type=0&response_type=code` +
      '&redirect_uri=https%3A%2F%2Fdev.cosmospay.lat%2Fapi%2Fintegrations%2Fdiscord%2Fcallback&state=abc_DEF-123',
  );
  const parsed = new URL(url);
  assert.equal(parsed.searchParams.get('scope'), 'bot applications.commands identify');
  assert.equal(parsed.searchParams.get('permissions'), '268553216');
  assert.equal(parsed.searchParams.get('redirect_uri'), redirectUri);
});

test('the configuration is off until the id, the client secret and a long enough link secret are set', () => {
  const base = { clientId: '1300000000000000000', clientSecret: 'oauth-secret', linkSecret: SECRET, platformUrl: 'https://dev.cosmospay.lat' };
  assert.deepEqual(discordConfigFrom(base), {
    clientId: base.clientId,
    clientSecret: base.clientSecret,
    botUrl: 'http://127.0.0.1:3800',
    linkSecret: SECRET,
    redirectUri: 'https://dev.cosmospay.lat/api/integrations/discord/callback',
  });
  assert.equal(discordConfigFrom({ ...base, clientId: '' }), null);
  assert.equal(discordConfigFrom({ ...base, clientSecret: undefined }), null);
  assert.equal(discordConfigFrom({ ...base, linkSecret: 'short' }), null);
  assert.equal(discordConfigFrom({ ...base, linkSecret: null }), null);
  assert.equal(discordConfigFrom({ ...base, botUrl: 'ftp://bot' }), null);
  assert.equal(discordConfigFrom({ ...base, botUrl: 'http://10.0.0.5:3800/' })?.botUrl, 'http://10.0.0.5:3800');
});

test('an install state is 32 random bytes in base64url, and a fresh one each time', () => {
  const a = newInstallState();
  const b = newInstallState();
  assert.equal(a.length, 43);
  assert.ok(isInstallState(a));
  assert.notEqual(a, b);
  assert.equal(Buffer.from(a, 'base64url').length, 32);
  for (const bad of ['', 'short', `${a}=`, `${a.slice(0, 42)}+`, null, 42, `${a}x`]) assert.equal(isInstallState(bad), false, String(bad));
});

test('an install request lives ten minutes, belongs to one member and is used once', () => {
  const now = new Date('2026-11-18T12:00:00.000Z');
  const expiresAt = installExpiresAt(now);
  assert.equal(expiresAt.getTime() - now.getTime(), INSTALL_TTL_MS);
  assert.equal(INSTALL_TTL_MS, 10 * 60_000);
  assert.equal(installStateExpired(expiresAt, now), false);
  assert.equal(installStateExpired(expiresAt, new Date(expiresAt.getTime() - 1)), false);
  assert.equal(installStateExpired(expiresAt, expiresAt), true);
  assert.equal(installStateExpired(expiresAt.toISOString(), new Date(expiresAt.getTime() + 1)), true);

  const request = { userId: 'u1', expiresAt, usedAt: null };
  assert.equal(installRequestProblem(request, 'u1', now), null);
  assert.equal(installRequestProblem(null, 'u1', now), 'missing');
  assert.equal(installRequestProblem(request, 'u2', now), 'other_user');
  assert.equal(installRequestProblem({ ...request, usedAt: now }, 'u1', now), 'used');
  assert.equal(installRequestProblem(request, 'u1', new Date(expiresAt.getTime() + 1)), 'expired');
});

test('a link request is signed over the time, the method, the path and the exact body', () => {
  const now = new Date('2026-11-18T12:00:00.900Z');
  const t = 1795003200;
  const body = '{"guildId":"1180000000000000000"}';
  assert.equal(signLinkRequest(SECRET, 'POST', '/links', body, now), `t=${t},v1=${hmac(`${t}.POST./links.${body}`)}`);
  // DELETE and GET sign the empty body; the method is upper case whatever the caller wrote.
  assert.equal(signLinkRequest(SECRET, 'delete', '/links/1180000000000000000', '', now), `t=${t},v1=${hmac(`${t}.DELETE./links/1180000000000000000.`)}`);
  // The same body under another method or path is another signature: a signed GET is no DELETE.
  const get = signLinkRequest(SECRET, 'GET', '/links/1180000000000000000', '', now);
  const del = signLinkRequest(SECRET, 'DELETE', '/links/1180000000000000000', '', now);
  const other = signLinkRequest(SECRET, 'DELETE', '/links/1190000000000000000', '', now);
  assert.notEqual(get, del);
  assert.notEqual(del, other);
  // Another second, another signature (the bot refuses one it has seen).
  assert.notEqual(signLinkRequest(SECRET, 'POST', '/links', body, new Date(now.getTime() + 1000)), signLinkRequest(SECRET, 'POST', '/links', body, now));
  assert.match(signLinkRequest(SECRET, 'POST', '/links', body), /^t=\d{10},v1=[0-9a-f]{64}$/);
  // Only the path: never a host or a query.
  assert.throws(() => signLinkRequest(SECRET, 'GET', '/links?x=1', '', now));
  assert.throws(() => signLinkRequest(SECRET, 'GET', 'http://127.0.0.1:3800/links', '', now));
});

test('the bot key holds every scope but KYC, and fits in one gateway label', () => {
  assert.deepEqual(DISCORD_KEY_SCOPES, COSMOS_SCOPES.filter((s) => !s.startsWith('kyc:')));
  assert.ok(!DISCORD_KEY_SCOPES.some((s) => s.startsWith('kyc:')));
  assert.ok(DISCORD_KEY_SCOPES.includes('payments:write'));
  assert.equal(DISCORD_KEY_SCOPES.length, COSMOS_SCOPES.length - 2);
  assert.deepEqual(parsePermissionsLabel(encodePermissionsLabel(DISCORD_KEY_SCOPES)).sort(), [...DISCORD_KEY_SCOPES].sort());
});

test('the key is named after the server, within what the API keys form accepts', () => {
  assert.equal(discordKeyName('Andes Commerce'), 'Discord: Andes Commerce');
  const long = discordKeyName('x'.repeat(100));
  assert.equal(Array.from(long).length, DISCORD_KEY_NAME_MAX);
  assert.ok(long.startsWith('Discord: x'));
  assert.equal(Array.from(discordKeyName('🙂'.repeat(100))).length, DISCORD_KEY_NAME_MAX);
});

test('Discord answers are read field by field', () => {
  assert.deepEqual(parseTokenAnswer({ access_token: 'tok', guild: { id: '1180000000000000000', name: '  Andes\nCommerce ' } }), {
    accessToken: 'tok',
    guild: { id: '1180000000000000000', name: 'AndesCommerce' },
  });
  assert.deepEqual(parseTokenAnswer({ access_token: 'tok' }), { accessToken: 'tok', guild: null });
  assert.deepEqual(parseTokenAnswer({ access_token: 'tok', guild: { id: 'not-a-snowflake', name: 'x' } }), { accessToken: 'tok', guild: null });
  assert.equal(parseTokenAnswer({ guild: { id: '1180000000000000000', name: 'x' } }), null);
  assert.equal(parseTokenAnswer(null), null);
  assert.deepEqual(parseDiscordUser({ id: '1170000000000000000', username: 'ana', global_name: 'Ana Gómez' }), { id: '1170000000000000000', name: 'Ana Gómez' });
  assert.deepEqual(parseDiscordUser({ id: '1170000000000000000', username: 'ana', global_name: null }), { id: '1170000000000000000', name: 'ana' });
  assert.deepEqual(parseDiscordUser({ id: 12, username: 5 }), { id: null, name: null });
  assert.deepEqual(parseDiscordUser('nope'), { id: null, name: null });
});

test('what the bot answers decides the outcome; only known refusals are passed on', () => {
  assert.deepEqual(botLinkResult(200, { guildId: '1' }), { ok: true });
  assert.deepEqual(botLinkResult(204, null), { ok: true });
  for (const code of ['invalid_key', 'network_unavailable', 'invalid_address', 'asset_needs_issuer', 'asset_unknown', 'asset_ambiguous']) {
    const r = botLinkResult(400, { error: code, message: 'whatever' });
    assert.equal(r.ok, false);
    assert.equal(!r.ok && r.reason, 'bot_refused');
    assert.equal(!r.ok && r.reason === 'bot_refused' && r.detail, code);
  }
  const unknown = botLinkResult(400, { error: '<script>' });
  assert.ok(!unknown.ok && unknown.reason === 'bot_refused' && unknown.detail === null);
  const notIn = botLinkResult(404, { error: 'guild_not_found' });
  assert.ok(!notIn.ok && notIn.reason === 'bot_refused' && notIn.detail === 'guild_not_found');
  for (const status of [401, 403, 500, 503, 302]) {
    const r = botLinkResult(status, null);
    assert.ok(!r.ok && r.reason === 'bot_unreachable', String(status));
  }
});

test('the asset is native, a code or CODE:ISSUER', () => {
  assert.equal(DEFAULT_LINK_ASSET, 'USDC');
  assert.equal(normalizeLinkAsset('USDC'), 'USDC');
  assert.equal(normalizeLinkAsset(' NATIVE '), 'native');
  assert.equal(normalizeLinkAsset('USDC.e'), 'USDC.e');
  assert.equal(normalizeLinkAsset('USDC : GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN'), 'USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN');
  assert.equal(normalizeLinkAsset('USDT:usdt.tether-token.near'), 'USDT:usdt.tether-token.near');
  for (const bad of ['', '   ', 'US DC', 'USDC:', ':GA5Z', 'USDC:a:b', '<b>', 'X'.repeat(17), `USDC:${'G'.repeat(141)}`, null, 7]) {
    assert.equal(normalizeLinkAsset(bad), null, String(bad));
  }
});

test('the callback names its outcome in the address, and Settings reads back only known codes', () => {
  assert.equal(outcomeLocation({ linked: true }), '/dashboard?view=settings&discord=linked');
  assert.equal(outcomeLocation({ linked: false, reason: 'denied', detail: null }), '/dashboard?view=settings&discord=error&reason=denied');
  assert.equal(outcomeLocation({ linked: false, reason: 'bot_refused', detail: 'asset_unknown' }), '/dashboard?view=settings&discord=error&reason=bot_refused&detail=asset_unknown');
  // A detail belongs to a refusal only.
  assert.equal(outcomeLocation({ linked: false, reason: 'internal', detail: 'asset_unknown' }), '/dashboard?view=settings&discord=error&reason=internal');
  for (const reason of LINK_FAILURE_REASONS) {
    const url = new URL(outcomeLocation({ linked: false, reason, detail: null }), 'https://dev.cosmospay.lat');
    assert.deepEqual(readLinkOutcome(url.searchParams.get('discord'), url.searchParams.get('reason'), url.searchParams.get('detail')), { linked: false, reason, detail: null });
  }
  for (const detail of BOT_REFUSAL_CODES) {
    assert.deepEqual(readLinkOutcome('error', 'bot_refused', detail), { linked: false, reason: 'bot_refused', detail });
  }
  assert.deepEqual(readLinkOutcome('linked', null, null), { linked: true });
  assert.equal(readLinkOutcome(null, 'denied', null), null);
  assert.equal(readLinkOutcome('maybe', null, null), null);
  assert.deepEqual(readLinkOutcome('error', '<img src=x>', 'free text'), { linked: false, reason: 'internal', detail: null });
  assert.deepEqual(readLinkOutcome('error', 'bot_refused', 'free text'), { linked: false, reason: 'bot_refused', detail: null });
});

/* ---------------- the network calls, against a stand-in fetch ---------------- */

type Call = { url: string; init: RequestInit };
function stub(answer: (call: Call) => Response | Promise<Response>): { fetch: FetchLike; calls: Call[] } {
  const calls: Call[] = [];
  return {
    calls,
    fetch: async (url, init = {}) => {
      const call = { url, init };
      calls.push(call);
      return answer(call);
    },
  };
}
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const header = (init: RequestInit, name: string) => (init.headers as Record<string, string>)[name];

test('the code is exchanged form-encoded, and the token names the server', async () => {
  const cfg = { clientId: '1300000000000000000', clientSecret: 'oauth-secret', redirectUri: 'https://dev.cosmospay.lat/api/integrations/discord/callback' };
  const ok = stub(() => json(200, { access_token: 'tok', token_type: 'Bearer', guild: { id: '1180000000000000000', name: 'Andes' } }));
  assert.deepEqual(await exchangeDiscordCode(cfg, 'the-code', ok.fetch), { ok: true, accessToken: 'tok', guild: { id: '1180000000000000000', name: 'Andes' } });
  assert.equal(ok.calls[0].url, DISCORD_TOKEN_URL);
  assert.equal(ok.calls[0].init.method, 'POST');
  assert.equal(header(ok.calls[0].init, 'Content-Type'), 'application/x-www-form-urlencoded');
  const form = new URLSearchParams(String(ok.calls[0].init.body));
  assert.deepEqual(Object.fromEntries(form), { client_id: cfg.clientId, client_secret: 'oauth-secret', grant_type: 'authorization_code', code: 'the-code', redirect_uri: cfg.redirectUri });

  const refused = await exchangeDiscordCode(cfg, 'x', stub(() => json(400, { error: 'invalid_grant', error_description: 'Invalid "code" in request.' })).fetch);
  assert.ok(!refused.ok && refused.log.includes('invalid_grant') && !refused.log.includes('oauth-secret'));
  const noGuild = await exchangeDiscordCode(cfg, 'x', stub(() => json(200, { access_token: 'tok' })).fetch);
  assert.ok(!noGuild.ok && /no server/.test(noGuild.log));
  const down = await exchangeDiscordCode(cfg, 'x', stub(() => { throw new Error('ECONNREFUSED'); }).fetch);
  assert.ok(!down.ok && down.log.includes('ECONNREFUSED'));
});

test('who linked the server is best effort', async () => {
  const ok = stub(() => json(200, { id: '1170000000000000000', username: 'ana', global_name: 'Ana' }));
  assert.deepEqual(await readDiscordUser('tok', ok.fetch), { id: '1170000000000000000', name: 'Ana' });
  assert.equal(header(ok.calls[0].init, 'Authorization'), 'Bearer tok');
  assert.deepEqual(await readDiscordUser('tok', stub(() => json(401, {})).fetch), { id: null, name: null });
  assert.deepEqual(await readDiscordUser('tok', stub(() => { throw new Error('boom'); }).fetch), { id: null, name: null });
});

test('the bot gets a signed POST /links with the exact body it can verify', async () => {
  const cfg = { botUrl: 'http://127.0.0.1:3800/', linkSecret: SECRET };
  const now = new Date('2026-11-18T12:00:00.000Z');
  const payload = { guildId: '1180000000000000000', apiKey: 'dv_secret', chain: 'stellar', address: 'GABC', asset: 'USDC', linkedBy: { discordUserId: null, name: 'Ana' } };
  const bot = stub(() => json(200, { guildId: payload.guildId, guildName: 'Andes', chain: 'stellar', chainName: 'Stellar', assetLabel: 'USDC', destination: 'GABC', webhook: true }));
  assert.deepEqual(await postBotLink(cfg, payload, bot.fetch, () => now), { ok: true });
  const call = bot.calls[0];
  assert.equal(call.url, 'http://127.0.0.1:3800/links');
  assert.equal(call.init.method, 'POST');
  assert.equal(call.init.body, JSON.stringify(payload));
  assert.equal(header(call.init, 'Content-Type'), 'application/json');
  const t = Math.floor(now.getTime() / 1000);
  assert.equal(header(call.init, LINK_SIGNATURE_HEADER), `t=${t},v1=${hmac(`${t}.POST./links.${JSON.stringify(payload)}`)}`);

  const refused = await postBotLink(cfg, payload, stub(() => json(400, { error: 'asset_needs_issuer', message: 'x' })).fetch, () => now);
  assert.ok(!refused.ok && refused.reason === 'bot_refused' && refused.detail === 'asset_needs_issuer');
  const down = await postBotLink(cfg, payload, stub(() => { throw new Error('ECONNREFUSED'); }).fetch, () => now);
  assert.ok(!down.ok && down.reason === 'bot_unreachable' && !down.log.includes(SECRET));
});

test('every attempt is signed again, and DELETE signs its path with an empty body', async () => {
  const cfg = { botUrl: 'http://127.0.0.1:3800', linkSecret: SECRET };
  let second = 0;
  const clock = () => new Date(Date.UTC(2026, 10, 18, 12, 0, second++));
  const bot = stub(() => new Response(null, { status: 404 }));
  assert.deepEqual(await deleteBotLink(cfg, '1180000000000000000', bot.fetch, clock), { ok: true });
  assert.deepEqual(await deleteBotLink(cfg, '1180000000000000000', bot.fetch, clock), { ok: true });
  const [a, b] = bot.calls;
  assert.equal(a.url, 'http://127.0.0.1:3800/links/1180000000000000000');
  assert.equal(a.init.method, 'DELETE');
  assert.equal(a.init.body, undefined);
  const sig = header(a.init, LINK_SIGNATURE_HEADER);
  const t = Number(/^t=(\d+),/.exec(sig)?.[1]);
  assert.equal(sig, `t=${t},v1=${hmac(`${t}.DELETE./links/1180000000000000000.`)}`);
  assert.notEqual(header(b.init, LINK_SIGNATURE_HEADER), sig);
  const failed = await deleteBotLink(cfg, '1180000000000000000', stub(() => new Response(null, { status: 500 })).fetch);
  assert.ok(!failed.ok);
  assert.throws(() => botLinkPath('../admin'));
});
