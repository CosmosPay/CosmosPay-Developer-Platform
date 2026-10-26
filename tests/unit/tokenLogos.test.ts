import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { NETWORK_IDS, OFT_NETWORK_NAMES } from '@/lib/chains';
import { NETWORK_LOGOS, TOKEN_LOGOS, networkLogo, normalizeSymbol, tokenLogo } from '@/lib/token-logos';

const PUBLIC_DIR = fileURLToPath(new URL('../../public', import.meta.url));

/* Networks in NETWORK_NAMES or OFT_NETWORK_NAMES with no official artwork, by id, each with a
   comment giving the reason. Empty today: every network has one. */
const NETWORKS_WITHOUT_LOGO: readonly string[] = [];

test('every logo in the manifest is a file under public/media', () => {
  for (const [key, path] of [...Object.entries(TOKEN_LOGOS), ...Object.entries(NETWORK_LOGOS)]) {
    assert.match(path, /^\/media\/(tokens|networks|brands)\/[a-z0-9_.-]+\.(webp|png|svg)$/, key);
    assert.ok(existsSync(PUBLIC_DIR + path), `${key}: ${path} is missing`);
  }
});

test('every network the app names has a logo', () => {
  for (const id of NETWORK_IDS) {
    if (NETWORKS_WITHOUT_LOGO.includes(id)) continue;
    assert.ok(networkLogo(id), `no logo for network ${id}`);
  }
});

test('every network only USDT0 reaches has a logo', () => {
  for (const id of Object.keys(OFT_NETWORK_NAMES)) {
    if (NETWORKS_WITHOUT_LOGO.includes(id)) continue;
    assert.ok(networkLogo(id), `no logo for network ${id}`);
  }
});

test('token keys are normalized symbols', () => {
  for (const key of Object.keys(TOKEN_LOGOS)) assert.equal(normalizeSymbol(key), key);
});

test('the existing brand files serve the chains and coins the landing already shows', () => {
  assert.equal(tokenLogo('USDC'), '/media/brands/usdc.svg');
  assert.equal(tokenLogo('EURC'), '/media/brands/eurc.webp');
  assert.equal(tokenLogo('XLM'), '/media/brands/xlm.svg');
  assert.equal(tokenLogo('SOL'), '/media/brands/sol.svg');
  assert.equal(tokenLogo('MON'), '/media/brands/monad.webp');
  assert.equal(networkLogo('stellar'), '/media/brands/xlm.svg');
  assert.equal(networkLogo('solana'), '/media/brands/sol.svg');
  assert.equal(networkLogo('monad'), '/media/brands/monad.webp');
});

test('USDT0 has its own artwork, not USDT', () => {
  assert.ok(tokenLogo('USDT0'));
  assert.notEqual(tokenLogo('USDT0'), tokenLogo('USDT'));
});

test('tokenLogo reads NEAR Intents spellings: any case, a trailing tag, a leading $', () => {
  assert.equal(tokenLogo('usdt0'), TOKEN_LOGOS.USDT0);
  assert.equal(tokenLogo('USDT0(DEPRECATED)'), TOKEN_LOGOS.USDT0);
  assert.equal(tokenLogo('XPL_(DEPRECATED)'), TOKEN_LOGOS.XPL);
  assert.equal(tokenLogo('BTC(OMNI)'), TOKEN_LOGOS.BTC);
  assert.equal(tokenLogo('$WIF'), TOKEN_LOGOS.WIF);
  assert.equal(tokenLogo(' wNEAR '), TOKEN_LOGOS.WNEAR);
});

test('unknown symbols and ids, and inherited object keys, have no logo', () => {
  assert.equal(tokenLogo('NOT-A-TOKEN'), undefined);
  assert.equal(tokenLogo(''), undefined);
  assert.equal(networkLogo('qtc'), undefined);
  assert.equal(networkLogo('constructor'), undefined);
  assert.equal(networkLogo('__proto__'), undefined);
  assert.equal(tokenLogo('__proto__'), undefined);
});
