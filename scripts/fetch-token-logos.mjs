/* fetch-token-logos.mjs: refresh the token and network logos the dashboard and the payments
   landing show, and regenerate their manifest (src/lib/token-logos.ts) and the two SOURCES.md
   files. A maintainer tool: nothing in the build or the server runs it, and its output is
   committed like any other asset.

     node scripts/fetch-token-logos.mjs [--raw <dir>]

   WHAT IT COVERS. Every symbol NEAR Intents' 1Click lists (GET /v0/tokens, minus the
   blockchains the Payments API does not offer: qtc, adi), the standard assets the dashboard
   offers on Stellar, Solana and Monad, every network id in NETWORK_NAMES and OFT_NETWORK_NAMES
   (src/lib/chains.ts: the networks only USDT0 reaches), and Pollar's mark for the landing's
   wallets marquee. Logos are keyed by normalized symbol
   (uppercase, a trailing "(...)" tag and a leading "$" removed), so one symbol on several chains
   shares one file.

   WHERE ARTWORK COMES FROM, in this order, official artwork only:
     1. Trust Wallet's assets repository (MIT): the token's own contract folder, or the chain's
        info folder for a native coin.
     2. cryptocurrency-icons (CC0), by symbol, for native coins only (a symbol match on a token
        could be a different project).
     3. The project's own brand kit or press page (the explicit SOURCES tables below).
     4. A token list or on-chain metadata that names the icon: NEP-148 ft_metadata on NEAR, the
        Jupiter token list for a Solana mint, the NEAR Intents frontend's list.
   CoinGecko and CoinMarketCap images are never used. A symbol with no official artwork is left
   out, and the UI shows a monogram for it; the run prints those symbols.

   A few marks only exist as a single colour that would vanish in one of the two themes. Those
   are placed, unchanged, on a solid disc: the colour their own kit pairs them with, or white
   for a black mark (the `plate` entries and PLATES below); nothing is redrawn or recoloured.

   Files in src/assets/logos/tokens and src/assets/logos/networks that the new manifest no longer
   names are deleted, so the folders always match it. Those two folders are Vite assets, not
   public/: each file is fingerprinted under /_astro/ and served with a year-long immutable
   Cache-Control (src/lib/logo-urls.ts).

   SAFETY. Every download is untrusted data: it is written to the --raw directory (default: a
   new folder under the OS temp directory) for review, never executed, and only decoded as an
   image. SVGs lose scripts, foreignObject, event handlers and external references before they
   are rasterized; zips are read in memory, one named entry at a time. Output is a 96x96 WebP
   with a transparent background, under 8 KB.

   Needs sharp and @noble/hashes, both already installed as dependencies of astro and the
   Stellar SDK. Node 22.18 or later (it imports src/lib/chains.ts to check network coverage). */
import { existsSync, mkdirSync, readdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { inflateRawSync } from 'node:zlib';
import sharp from 'sharp';
import { keccak_256 } from '@noble/hashes/sha3.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = join(ROOT, 'public');
const LOGOS = join(ROOT, 'src', 'assets', 'logos');
const TOKENS_DIR = join(LOGOS, 'tokens');
const NETWORKS_DIR = join(LOGOS, 'networks');
const BRANDS_DIR = join(PUBLIC, 'media', 'brands');
const MANIFEST = join(ROOT, 'src', 'lib', 'token-logos.ts');

const SIZE = 96;
const MAX_BYTES = 8 * 1024;
const MAX_DOWNLOAD = 25 * 1024 * 1024;
const USER_AGENT = 'cosmos-pay-logo-refresh (+https://github.com/trustwallet/assets)';

const argRaw = process.argv.indexOf('--raw');
const RAW_DIR = argRaw > 0 ? resolve(process.argv[argRaw + 1]) : join(tmpdir(), `cosmos-pay-logos-raw-${Date.now()}`);

sharp.cache(false);
sharp.concurrency(1);

/* ---------------------------------------------------------------- sources */

const ONECLICK_TOKENS = 'https://1click.chaindefuser.com/v0/tokens';
const EXCLUDED_BLOCKCHAINS = new Set(['qtc', 'adi']);
const NEAR_RPC = 'https://free.rpc.fastnear.com';
const JUPITER_SEARCH = 'https://lite-api.jup.ag/tokens/v2/search?query=';
const TW_RAW = 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/';
const CCI_RAW = 'https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/';
const DEFUSE_LIST = 'https://raw.githubusercontent.com/defuse-protocol/defuse-frontend/main/src/tokens/production.json';
const BLOCKED_HOSTS = /(^|\.)(coingecko\.com|coinmarketcap\.com)$/i;

const TW_LICENCE = 'MIT (github.com/trustwallet/assets)';
const NO_LICENCE = 'no licence stated; trademark of its owner, used only to identify the asset';

/* 1Click blockchain code to Trust Wallet folder. */
const TW_CHAIN = {
  near: 'near', eth: 'ethereum', base: 'base', arb: 'arbitrum', op: 'optimism', bsc: 'smartchain', pol: 'polygon',
  avax: 'avalanchec', gnosis: 'xdai', sol: 'solana', xrp: 'ripple', btc: 'bitcoin', ltc: 'litecoin', doge: 'doge',
  bch: 'bitcoincash', dash: 'dash', zec: 'zcash', tron: 'tron', ton: 'ton', sui: 'sui', aptos: 'aptos',
  cardano: 'cardano', stellar: 'stellar', monad: 'monad', plasma: 'plasma', hood: 'robinhoodchain', scroll: 'scroll',
};
/* Which listing of a symbol is tried first: its native coin, then the largest networks. */
const CHAIN_ORDER = ['eth', 'base', 'arb', 'op', 'bsc', 'pol', 'avax', 'gnosis', 'sol', 'near', 'tron', 'ton', 'sui', 'aptos'];

const tw = (path) => ({ kind: 'url', url: TW_RAW + path, licence: TW_LICENCE });
const url = (href, licence = NO_LICENCE, note = '') => ({ kind: 'url', url: href, licence, note });
const zip = (href, entry, licence = NO_LICENCE, note = '') => ({ kind: 'zip', url: href, entry, licence, note });
const brand = (path) => ({ kind: 'brand', path });
const alias = (symbol, note) => ({ kind: 'alias', symbol, note });
const plate = (source, background) => ({ ...source, plate: background });

const BERACHAIN_BERA = url('https://raw.githubusercontent.com/berachain/metadata/main/src/assets/tokens/0x0000000000000000000000000000000000000000.png', 'MIT (github.com/berachain/metadata)', 'Berachain official token list');
const MOVEMENT_MARK = url('https://www.movementnetwork.xyz/brand-kit/logos/Mark_Movement_White.svg', NO_LICENCE, 'Movement brand kit (movementnetwork.xyz/brand-kit), white mark on a black disc');
const ALEO_MARK = zip('https://raw.githubusercontent.com/AleoNet/open-source-assets/main/Aleo%20Mainnet%20Design%20Pack/aleo-logos.zip', 'aleo-logos/SVG/secondary-icon-light.svg', 'CC0-1.0 (github.com/AleoNet/open-source-assets)', 'Aleo brand kit (aleo.org/brand), light mark on its #121212 disc');
const FOGO_ICON = url('https://raw.githubusercontent.com/fogo-foundation/fogo-explorer/master/public/favicon.svg', 'MIT (github.com/fogo-foundation/fogo-explorer)', 'Fogo Foundation explorer icon');
const MONERIUM_KIT = 'https://monerium.com/content/monerium-logo-kit.zip';
const HEMI_LIST = 'https://raw.githubusercontent.com/hemilabs/token-list/master/src/l1Logos/';

/* Symbols decided by hand, with the reason. Everything else is resolved automatically. */
const TOKEN_SOURCES = {
  // Already in public/media/brands, used by the landing; reused as they are.
  USDC: brand('/media/brands/usdc.svg'),
  EURC: brand('/media/brands/eurc.webp'),
  XLM: brand('/media/brands/xlm.svg'),
  SOL: brand('/media/brands/sol.svg'),
  MON: brand('/media/brands/monad.webp'),
  // Trust Wallet files USDT0's contracts under Tether's USDT artwork; USDT0 has its own.
  USDT0: url('https://docs.usdt0.to/downloads/usdt0/Symbol_USDT0_Secondary.svg', NO_LICENCE, 'USDT0 media kit (docs.usdt0.to/resources/mediakit), the icon for small sizes'),
  // NEAR is listed only as a bridged BEP-20 and wrap.near; the coin's own artwork is the chain's.
  NEAR: tw('near/info/logo.png'),
  WNEAR: alias('NEAR', 'wrap.near publishes no icon; NEAR Intents shows wNEAR under the NEAR mark'),
  // Listed on a chain Trust Wallet does not cover; the same token on Ethereum.
  GNO: tw('ethereum/assets/0x6810e776880C02933D47DB1b9fc05908e5386b96/logo.png'),
  FRAX: tw('ethereum/assets/0x853d955aCEf822Db058eb8505911ED77F175b99e/logo.png'),
  OKB: tw('ethereum/assets/0x75231F58b43240C9718Dd58B4967c5114342a86c/logo.png'),
  STRK: tw('ethereum/assets/0xCa14007Eff0dB1f8135f4C25B34De49AB0d42766/logo.png'),
  // Brand kits.
  EURE: zip(MONERIUM_KIT, 'monerium-logo-kit/tokens/EURe/eure-256.png', NO_LICENCE, 'Monerium logo kit (monerium.com/press)'),
  GBPE: zip(MONERIUM_KIT, 'monerium-logo-kit/tokens/GPBe/gbpe-256.png', NO_LICENCE, 'Monerium logo kit (monerium.com/press)'),
  BERA: BERACHAIN_BERA,
  MOVE: plate(MOVEMENT_MARK, '#000000'),
  ALEO: plate(ALEO_MARK, '#121212'),
  FOGO: FOGO_ICON,
  COCA: zip('https://www.coca.xyz/_files/archives/7b75f0_9421adf848994d5f9e75f8fd3a512d78.zip', 'COCA_Logo/Color_BG/COCA_Logo_Blue.png', NO_LICENCE, 'COCA press kit (coca.xyz/press-official)'),
  TITN: plate(url('https://www.thorwallet.org/assets/titn-token.webp', NO_LICENCE, 'THORWallet brand page (thorwallet.org/brand), the $TITN token icon on the dark navy of the page\'s token disc'), '#11283d'),
  // Trust Wallet's Robinhood Chain entries for these carry Robinhood's artwork; the same tokens on Ethereum.
  USDE: tw('ethereum/assets/0x4c9EDD5852cd905f086C759E8383e09bff1E68B3/logo.png'),
  USDG: tw('ethereum/assets/0xe343167631d89B6Ffc58B88d6b7fB0228795491D/logo.png'),
  ADI: url('https://www.adi.foundation/icon.svg', NO_LICENCE, 'ADI Foundation site icon (adi.foundation/press)'),
  QTC: url('https://raw.githubusercontent.com/Quantus-Network/explorer/main/public/images/logomark.webp', 'MIT (github.com/Quantus-Network/explorer)', 'Quantus Network explorer logomark'),
  // Token lists that name the icon (no brand kit found).
  HEMIBTC: url(`${HEMI_LIST}hemibtc.svg`, 'MIT (github.com/hemilabs/token-list)', 'Hemi token list, Ethereum (L1) logo'),
  CBBTC: url(`${HEMI_LIST}cbbtc.svg`, 'MIT (github.com/hemilabs/token-list)', 'Hemi token list, Ethereum (L1) logo; coinbase.com refused the request'),
  USAD: { kind: 'defuse', assetId: 'nep141:aleo-usad.omft.near' },
};

/* Black single-colour marks found automatically (NEP-148 icons), placed on a white disc so they
   stay visible in the dark theme. */
const PLATES = { HAPI: '#ffffff', NRUSDT: '#ffffff' };

/* Symbols left to the monogram on purpose, with the reason. */
const SKIP = {
  ITLX: 'its only published artwork (the NEP-148 icon) is a 721x399 banner, not a square mark',
};

/* Why the last run found nothing for these (written to SOURCES.md; check them again on a refresh). */
const MISSING_NOTES = {
  INX: 'not in Trust Wallet; infinex.xyz refused the request (429) and the only icons listed elsewhere are CoinGecko-hosted',
  TLO: 'Taler vault share; no brand kit, only a CoinGecko-hosted icon',
  SSC1_PIT: 'no brand kit or token-list icon found',
  PONS: 'not in Trust Wallet; its explorer page sits behind a bot check',
  FMS: 'no brand kit or token-list icon found',
  USDCX: 'Circle publishes no USDCx artwork; the only icon listed elsewhere is CoinMarketCap-hosted',
  USDB: 'BlindPay testnet stablecoin; the issuer publishes no home domain or artwork',
  STJACK: 'its NEP-148 icon is a 1x1 placeholder',
  TESTNEBULA: 'a test token with no icon',
  GTUSDCP: 'a NEAR Intents vault share with no artwork of its own',
  MWUSDC: 'a NEAR Intents vault share with no artwork of its own',
  SPARKUSDC: 'a NEAR Intents vault share with no artwork of its own',
  STEAKUSDC: 'a NEAR Intents vault share with no artwork of its own',
  LAUSDC: 'a vault share with no artwork of its own',
};

/* Standard assets the dashboard offers outside 1Click's list (src/lib/stellar-assets.ts,
   src/lib/chains.ts). */
const EXTRA_SYMBOLS = ['XLM', 'USDC', 'EURC', 'USDT0', 'USDB', 'SOL', 'MON'];

/* Every network id in NETWORK_NAMES, then OFT_NETWORK_NAMES. */
const NETWORK_SOURCES = {
  stellar: brand('/media/brands/xlm.svg'),
  solana: brand('/media/brands/sol.svg'),
  monad: brand('/media/brands/monad.webp'),
  eth: tw('ethereum/info/logo.png'),
  base: tw('base/info/logo.png'),
  arb: tw('arbitrum/info/logo.png'),
  op: tw('optimism/info/logo.png'),
  bsc: tw('smartchain/info/logo.png'),
  pol: tw('polygon/info/logo.png'),
  avax: tw('avalanchec/info/logo.png'),
  gnosis: tw('xdai/info/logo.png'),
  bera: BERACHAIN_BERA,
  scroll: tw('scroll/info/logo.png'),
  xlayer: zip('https://raw.githubusercontent.com/okx/xlayer-docs/main/media-kit/XLayer-logo-kit.zip', 'XL/PROFILE ICON W- BACKGROUND/SVG/XLayer_Profile_WhenLessThan40px_White.svg', NO_LICENCE, 'X Layer logo kit (okx/xlayer-docs media-kit), profile icon for sizes under 40 px'),
  abs: url('https://raw.githubusercontent.com/Abstract-Foundation/abstract-docs/main/favicon.svg', NO_LICENCE, 'Abstract docs mark (github.com/Abstract-Foundation/abstract-docs)'),
  plasma: tw('plasma/info/logo.png'),
  hood: tw('robinhoodchain/info/logo.png'),
  hypercore: tw('hyperevm/info/logo.png'),
  btc: tw('bitcoin/info/logo.png'),
  ltc: tw('litecoin/info/logo.png'),
  doge: tw('doge/info/logo.png'),
  bch: tw('bitcoincash/info/logo.png'),
  dash: tw('dash/info/logo.png'),
  zec: tw('zcash/info/logo.png'),
  xrp: tw('ripple/info/logo.png'),
  tron: tw('tron/info/logo.png'),
  ton: tw('ton/info/logo.png'),
  near: tw('near/info/logo.png'),
  sui: tw('sui/info/logo.png'),
  aptos: tw('aptos/info/logo.png'),
  movement: plate(MOVEMENT_MARK, '#000000'),
  starknet: zip('https://www.starknet.io/assets/starknet-logos-svg.zip', 'Starknet-logos-svg/Symbol/SN-Symbol-Flat colour.svg', NO_LICENCE, 'Starknet media kit (starknet.io/media-kit), flat-colour symbol'),
  cardano: tw('cardano/info/logo.png'),
  aleo: plate(ALEO_MARK, '#121212'),
  fogo: FOGO_ICON,
  // Networks only USDT0 reaches (OFT_NETWORK_NAMES). Trust Wallet files Conflux eSpace under cfxevm.
  conflux: tw('cfxevm/info/logo.png'),
  flare: url('https://drive.usercontent.google.com/download?id=1RQubyppyPT8hH8blnxHlk4bebQghwkDC&export=download', NO_LICENCE, 'Flare brand assets (the "Brand Assets" folder linked from flare.network), Token icons/Flare/SVG/FLR.svg'),
  hyperevm: tw('hyperevm/info/logo.png'),
  hedera: tw('hedera/info/logo.png'),
  ink: zip('https://docs.inkonchain.com/downloads/ink-brand-kit.zip', 'ink-brand-kit/mark/svg/ink-mark-purple.svg', NO_LICENCE, 'Ink brand kit (docs.inkonchain.com/work-with-ink/brand-kit), purple mark'),
  mantle: tw('mantle/info/logo.png'),
  megaeth: tw('megaeth/info/logo.png'),
  morph: url('https://morphbrand.notion.site/image/attachment%3Ac7d00f91-495c-41dc-9e3b-f1a587e70ed8%3AMainnet-Circle-green.svg?table=block&id=2f42d06e-6aeb-80a7-a812-ff01ca8518d1&spaceId=fcab2c10-8da9-4414-aa63-4998ddf62e78&cache=v2', NO_LICENCE, 'Morph brand guideline (morphbrand.notion.site, linked from morph.network), Mainnet-Circle-green.svg'),
  rootstock: tw('rootstock/info/logo.png'),
  sei: tw('sei/info/logo.png'),
  stable: plate(url('https://www.stable.xyz/brand/logo/stable-logotype-light.svg', NO_LICENCE, 'Stable brand kit (stable.xyz/brand-kit), light logotype on the kit\'s Dark #001E1E disc'), '#001e1e'),
  tempo: url('https://drive.usercontent.google.com/download?id=1xDMoRdUg2htMpEhrQS6SPvV8XJ3ob0-u&export=download', NO_LICENCE, 'Tempo brand kit (the Google Drive folder tempo.xyz/brand opens), social/circle-black.png: white mark on its black disc'),
  unichain: zip('https://unichain.org/assets/zip/unichain-brand-kit.zip', 'Unichain Brand Kit /Network icons/Mainnet.svg', NO_LICENCE, 'Unichain brand kit (unichain.org/brand-kit), mainnet network icon'),
};

/* Pollar, for the landing's wallets marquee (pollar.xyz/brandkit, PNG only, no SVG offered). */
const BRAND_FILES = {
  'pollar.webp': url('https://www.pollar.xyz/brandkit/pollar-mark-on-light.png', NO_LICENCE, 'Pollar brand kit (pollar.xyz/brandkit), icon mark for light backgrounds'),
  'pollar-dark.webp': url('https://www.pollar.xyz/brandkit/pollar-mark-on-dark.png', NO_LICENCE, 'Pollar brand kit (pollar.xyz/brandkit), icon mark for dark backgrounds'),
};

/* ---------------------------------------------------------------- helpers */

export function normalizeSymbol(symbol) {
  return symbol.trim().toUpperCase().replace(/_?\([^)]*\)$/, '').replace(/^\$/, '');
}
const fileStem = (key) => key.toLowerCase().replace(/[^a-z0-9_-]/g, '-');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function checksumAddress(address) {
  const lower = address.toLowerCase().replace(/^0x/, '');
  const hash = Buffer.from(keccak_256(new TextEncoder().encode(lower))).toString('hex');
  let out = '0x';
  for (let i = 0; i < 40; i++) out += parseInt(hash[i], 16) >= 8 ? lower[i].toUpperCase() : lower[i];
  return out;
}

let rawCount = 0;
function keepRaw(label, bytes) {
  mkdirSync(RAW_DIR, { recursive: true });
  const name = `${String(++rawCount).padStart(3, '0')}-${label.replace(/[^A-Za-z0-9._-]/g, '_').slice(-80)}`;
  writeFileSync(join(RAW_DIR, name), bytes);
}

/* GET as bytes, or null on 404. Retries a 429 with a growing pause. */
async function download(href, { optional = false } = {}) {
  const host = new URL(href).hostname;
  if (BLOCKED_HOSTS.test(host)) throw new Error(`refusing ${host}`);
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(href, { headers: { 'user-agent': USER_AGENT }, signal: AbortSignal.timeout(45_000) });
    if (res.status === 429) { await sleep(3000 * (attempt + 1)); continue; }
    if (res.status === 404 && optional) return null;
    if (!res.ok) throw new Error(`${res.status} ${href}`);
    const bytes = Buffer.from(await res.arrayBuffer());
    if (bytes.length > MAX_DOWNLOAD) throw new Error(`too large: ${href}`);
    keepRaw(new URL(href).pathname.split('/').pop() || host, bytes);
    return bytes;
  }
  throw new Error(`rate limited: ${href}`);
}

async function postJson(href, body) {
  const res = await fetch(href, { method: 'POST', headers: { 'content-type': 'application/json', 'user-agent': USER_AGENT }, body: JSON.stringify(body), signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`${res.status} ${href}`);
  return res.json();
}

/* One named entry of a zip, read in memory (stored or deflated). */
function readZipEntry(buf, wanted) {
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65_557); i--) if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new Error('not a zip');
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  for (let n = 0; n < count; n++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error('bad zip directory');
    const method = buf.readUInt16LE(p + 10);
    const size = buf.readUInt32LE(p + 20);
    const usize = buf.readUInt32LE(p + 24);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const local = buf.readUInt32LE(p + 42);
    const name = buf.subarray(p + 46, p + 46 + nameLen).toString('utf8');
    p += 46 + nameLen + extraLen + commentLen;
    if (name !== wanted) continue;
    if (usize > MAX_DOWNLOAD) throw new Error('zip entry too large');
    const start = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
    const data = buf.subarray(start, start + size);
    if (method === 0) return Buffer.from(data);
    if (method === 8) return inflateRawSync(data, { maxOutputLength: MAX_DOWNLOAD });
    throw new Error(`zip method ${method}`);
  }
  throw new Error(`zip entry not found: ${wanted}`);
}

/* An SVG without anything that runs or reaches out: scripts, foreignObject, event handlers,
   stylesheet imports and references that are not local (#id) or embedded raster data. */
function sanitizeSvg(text) {
  return text
    .replace(/<\?xml-stylesheet[^>]*\?>/gi, '')
    .replace(/<script[\s\S]*?<\/script\s*>/gi, '')
    .replace(/<script[^>]*\/>/gi, '')
    .replace(/<foreignObject[\s\S]*?<\/foreignObject\s*>/gi, '')
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*')/gi, '')
    .replace(/@import[^;]*;/gi, '')
    .replace(/url\(\s*['"]?(?!#)[^)]*\)/gi, 'none')
    .replace(/\s(?:xlink:)?href\s*=\s*("[^"]*"|'[^']*')/gi, (m, v) => (/^["']\s*(#|data:image\/(png|jpeg|webp|gif);)/i.test(v) ? m : ''));
}

const isSvg = (bytes) => /^﻿?\s*(<\?xml[^>]*>\s*)?(<!--[\s\S]*?-->\s*)*(<!DOCTYPE[^>]*>\s*)?<svg[\s>]/i.test(bytes.subarray(0, 4096).toString('utf8'));

/* Decode untrusted bytes into a sharp pipeline at a size near the output. */
async function decode(bytes) {
  if (isSvg(bytes)) {
    const text = sanitizeSvg(bytes.toString('utf8'));
    const vb = text.match(/viewBox\s*=\s*["']\s*[-\d.]+[\s,]+[-\d.]+[\s,]+([\d.]+)[\s,]+([\d.]+)/i);
    const w = vb ? Number(vb[1]) : Number(text.match(/<svg[^>]*\swidth\s*=\s*["']([\d.]+)/i)?.[1] || 100);
    const h = vb ? Number(vb[2]) : Number(text.match(/<svg[^>]*\sheight\s*=\s*["']([\d.]+)/i)?.[1] || 100);
    const density = Math.min(2400, Math.max(1, (72 * SIZE * 2) / Math.max(w, h, 1)));
    return sharp(Buffer.from(text), { density, limitInputPixels: 25_000_000 });
  }
  const img = sharp(bytes, { limitInputPixels: 50_000_000, animated: false });
  const meta = await img.metadata();
  if (!['png', 'jpeg', 'webp', 'gif'].includes(meta.format)) throw new Error(`unexpected format ${meta.format}`);
  if (meta.width < 16 || meta.height < 16) throw new Error(`placeholder image ${meta.width}x${meta.height}`);
  return img;
}

/* A solid disc to sit a single-colour mark on. */
function discSvg(background) {
  if (!/^#[0-9a-f]{6}$/i.test(background)) throw new Error(`bad plate colour ${background}`);
  const r = SIZE / 2;
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}"><circle cx="${r}" cy="${r}" r="${r}" fill="${background}"/></svg>`);
}

async function encode(pipeline, platedOn) {
  const transparent = { r: 0, g: 0, b: 0, alpha: 0 };
  let image;
  if (platedOn) {
    const inner = Math.round(SIZE * 0.58);
    const mark = await pipeline.resize(inner, inner, { fit: 'contain', background: transparent }).png().toBuffer();
    image = sharp(discSvg(platedOn)).composite([{ input: mark, gravity: 'center' }]);
  } else {
    image = pipeline.resize(SIZE, SIZE, { fit: 'contain', background: transparent });
  }
  const png = await image.png().toBuffer();
  for (const quality of [88, 82, 76, 70, 62, 54, 46]) {
    const out = await sharp(png).webp({ quality, alphaQuality: 90, effort: 6 }).toBuffer();
    if (out.length <= MAX_BYTES) return out;
  }
  throw new Error('cannot encode under 8 KB');
}

/* Bytes for a source descriptor. */
const zipCache = new Map();
const urlCache = new Map();
async function fetchSource(source) {
  if (source.kind === 'url') {
    if (!urlCache.has(source.url)) urlCache.set(source.url, await download(source.url));
    return urlCache.get(source.url);
  }
  if (source.kind === 'zip') {
    if (!zipCache.has(source.url)) zipCache.set(source.url, await download(source.url));
    return readZipEntry(zipCache.get(source.url), source.entry);
  }
  if (source.kind === 'data') return source.bytes;
  throw new Error(`cannot fetch ${source.kind}`);
}

function dataUri(icon) {
  const m = icon.match(/^data:image\/(svg\+xml|png|jpeg|webp|gif)(;base64)?,(.*)$/s);
  if (!m) return null;
  return m[2] ? Buffer.from(m[3], 'base64') : Buffer.from(decodeURIComponent(m[3]), 'utf8');
}

/* NEP-148 metadata icon of a NEAR token. */
async function nearIcon(account) {
  const r = await postJson(NEAR_RPC, { jsonrpc: '2.0', id: 1, method: 'query', params: { request_type: 'call_function', finality: 'final', account_id: account, method_name: 'ft_metadata', args_base64: 'e30=' } });
  const raw = r.result?.result;
  if (!raw) return null;
  const icon = JSON.parse(Buffer.from(raw).toString('utf8')).icon;
  if (!icon) return null;
  if (icon.startsWith('data:')) {
    const bytes = dataUri(icon);
    if (!bytes) return null;
    keepRaw(`near-${account}`, bytes);
    return { kind: 'data', bytes, url: `NEP-148 ft_metadata of ${account} (NEAR mainnet), embedded icon`, licence: NO_LICENCE };
  }
  if (/^https:\/\//.test(icon)) return { kind: 'url', url: icon, licence: NO_LICENCE, note: `named by the NEP-148 ft_metadata of ${account}` };
  return null;
}

/* Icon the Jupiter token list names for this exact Solana mint. */
async function jupiterIcon(mint) {
  await sleep(1500);
  const bytes = await download(JUPITER_SEARCH + encodeURIComponent(mint));
  const hit = JSON.parse(bytes.toString('utf8')).find((t) => t.id === mint);
  if (!hit?.icon || !/^https:\/\//.test(hit.icon) || BLOCKED_HOSTS.test(new URL(hit.icon).hostname)) return null;
  return { kind: 'url', url: hit.icon, licence: NO_LICENCE, note: `named by the Jupiter token list for mint ${mint}` };
}

let defuseList = null;
async function defuseIcon(assetId) {
  defuseList ??= JSON.parse((await download(DEFUSE_LIST)).toString('utf8'));
  let icon = null;
  const walk = (t) => { if (t.defuseAssetId === assetId && t.icon) icon = t.icon; (t.groupedTokens || []).forEach(walk); };
  defuseList.tokens.forEach(walk);
  const bytes = icon && icon.startsWith('data:') ? dataUri(icon) : null;
  if (!bytes) return null;
  return { kind: 'data', bytes, url: `${DEFUSE_LIST} (${assetId}), embedded icon`, licence: 'MIT (github.com/defuse-protocol/defuse-frontend)' };
}

/* The candidate sources for a symbol nobody decided by hand, best first. */
async function* autoSources(listings) {
  // A native listing first (on Ethereum before the L2s, whose own info logo is the L2's), then by network.
  const rank = (l) => (l.contractAddress ? 100 : 0) + (CHAIN_ORDER.includes(l.blockchain) ? CHAIN_ORDER.indexOf(l.blockchain) : CHAIN_ORDER.length);
  const sorted = [...listings].sort((a, b) => rank(a) - rank(b));
  for (const l of sorted) {
    const folder = TW_CHAIN[l.blockchain];
    if (!folder) continue;
    const c = l.contractAddress;
    const path = !c ? `${folder}/info/logo.png`
      : /^0x[0-9a-fA-F]{40}$/.test(c) ? `${folder}/assets/${checksumAddress(c)}/logo.png`
      : l.blockchain === 'stellar' ? `${folder}/assets/${l.symbol}-${c}/logo.png`
      : `${folder}/assets/${c}/logo.png`;
    yield { ...tw(path), optional: true };
  }
  for (const l of sorted) if (!l.contractAddress) yield { kind: 'url', url: `${CCI_RAW}${normalizeSymbol(l.symbol).toLowerCase()}.png`, licence: 'CC0-1.0 (github.com/spothq/cryptocurrency-icons)', optional: true };
  for (const l of sorted) if (l.blockchain === 'near' && l.contractAddress) yield { kind: 'lazy', load: () => nearIcon(l.contractAddress) };
  for (const l of sorted) if (l.blockchain === 'sol' && l.contractAddress) yield { kind: 'lazy', load: () => jupiterIcon(l.contractAddress) };
}

/* Try sources in order; the first that decodes wins. */
async function render(sources, label, plateColour) {
  for await (let source of sources) {
    try {
      if (source.kind === 'lazy') source = await source.load();
      if (!source) continue;
      if (source.kind === 'defuse') source = await defuseIcon(source.assetId);
      if (!source) continue;
      if (plateColour) source = { ...source, plate: plateColour, note: [source.note, `on a ${plateColour} disc`].filter(Boolean).join(', ') };
      const bytes = source.optional && source.kind === 'url' ? await download(source.url, { optional: true }) : await fetchSource(source);
      if (!bytes) continue;
      const out = await encode(await decode(bytes), source.plate);
      return { out, source };
    } catch (e) {
      console.warn(`  ${label}: ${source?.url ?? source?.kind} skipped (${e.message})`);
    }
  }
  return null;
}

const describe = (source) => [source.url + (source.entry ? ` (zip entry "${source.entry}")` : ''), source.note, source.licence].filter(Boolean).join('; ');

/* ---------------------------------------------------------------- run */

async function main() {
  for (const d of [TOKENS_DIR, NETWORKS_DIR, BRANDS_DIR]) mkdirSync(d, { recursive: true });
  console.log(`raw downloads: ${RAW_DIR}`);

  const listed = JSON.parse((await download(ONECLICK_TOKENS)).toString('utf8')).filter((t) => !EXCLUDED_BLOCKCHAINS.has(t.blockchain));
  const bySymbol = new Map();
  for (const t of listed) {
    const key = normalizeSymbol(t.symbol);
    if (!bySymbol.has(key)) bySymbol.set(key, []);
    bySymbol.get(key).push(t);
  }
  for (const s of EXTRA_SYMBOLS) if (!bySymbol.has(s)) bySymbol.set(s, []);

  const tokenLogos = {};
  const tokenLines = [];
  const reused = [];
  const missing = [];
  const aliases = [];
  for (const key of [...bySymbol.keys()].sort()) {
    const fixed = TOKEN_SOURCES[key];
    if (fixed?.kind === 'brand') { tokenLogos[key] = fixed.path; reused.push(`- ${key}: \`${fixed.path}\` (existing brand file, reused as is)`); continue; }
    if (fixed?.kind === 'alias') { aliases.push([key, fixed]); continue; }
    if (SKIP[key]) { missing.push(key); continue; }
    console.log(key);
    const result = await render(fixed ? [fixed] : autoSources(bySymbol.get(key)), key, PLATES[key]);
    if (!result) { missing.push(key); continue; }
    const file = `${fileStem(key)}.webp`;
    writeFileSync(join(TOKENS_DIR, file), result.out);
    tokenLogos[key] = `tokens/${file}`;
    tokenLines.push(`- \`${file}\` (${key}): ${describe(result.source)}`);
  }
  for (const [key, a] of aliases) {
    if (tokenLogos[a.symbol]) { tokenLogos[key] = tokenLogos[a.symbol]; reused.push(`- ${key}: \`${tokenLogos[a.symbol]}\` (${a.note})`); }
    else missing.push(key);
  }

  const networkLogos = {};
  const networkLines = [];
  for (const [id, source] of Object.entries(NETWORK_SOURCES)) {
    if (source.kind === 'brand') { networkLogos[id] = source.path; networkLines.push(`- ${id}: \`${source.path}\` (existing brand file, reused as is)`); continue; }
    console.log(`network ${id}`);
    const result = await render([source], id);
    if (!result) { missing.push(`network:${id}`); continue; }
    writeFileSync(join(NETWORKS_DIR, `${id}.webp`), result.out);
    networkLogos[id] = `networks/${id}.webp`;
    networkLines.push(`- \`${id}.webp\`: ${describe(result.source)}`);
  }

  const brandLines = [];
  for (const [file, source] of Object.entries(BRAND_FILES)) {
    const result = await render([source], file);
    if (!result) { missing.push(`brand:${file}`); continue; }
    writeFileSync(join(BRANDS_DIR, file), result.out);
    brandLines.push(`- \`${file}\`: ${describe(result.source)}`);
  }

  // Network coverage against the app's own lists: NEAR Intents' networks and the ones only USDT0 reaches.
  const { NETWORK_IDS, OFT_NETWORK_NAMES } = await import(pathToFileURL(join(ROOT, 'src', 'lib', 'chains.ts')).href);
  const networkIds = [...NETWORK_IDS, ...Object.keys(OFT_NETWORK_NAMES)];
  for (const id of networkIds) if (!networkLogos[id]) missing.push(`network:${id} (no source)`);

  const missingTokens = missing.filter((m) => !m.includes(':'));
  writeFileSync(join(TOKENS_DIR, 'SOURCES.md'), [
    '# Token logos',
    '',
    'Generated by `scripts/fetch-token-logos.mjs`. Each file is the official artwork named below, rasterized to a 96x96 WebP (transparent wherever the artwork has no background of its own). Every mark is a trademark of its owner and is shown only to identify the asset.',
    '',
    ...tokenLines,
    '',
    '## Reused from elsewhere',
    '',
    ...reused,
    '',
    '## No official artwork found (the UI shows a monogram)',
    '',
    ...missingTokens.map((k) => `- ${k}${SKIP[k] || MISSING_NOTES[k] ? `: ${SKIP[k] || MISSING_NOTES[k]}` : ''}`),
    '',
  ].join('\n'));
  writeFileSync(join(NETWORKS_DIR, 'SOURCES.md'), [
    '# Network logos',
    '',
    'Generated by `scripts/fetch-token-logos.mjs`. Each file is the official artwork named below, rasterized to a 96x96 WebP (transparent wherever the artwork has no background of its own). Every mark is a trademark of its owner and is shown only to identify the network.',
    '',
    ...networkLines,
    '',
    '## Brand files for the landing (public/media/brands)',
    '',
    ...brandLines,
    '',
  ].join('\n'));

  // Drop files from an earlier run that the manifest no longer names.
  const named = new Set([...Object.values(tokenLogos), ...Object.values(networkLogos)]);
  for (const [dir, prefix] of [[TOKENS_DIR, 'tokens/'], [NETWORKS_DIR, 'networks/']]) {
    for (const f of readdirSync(dir)) if (f.endsWith('.webp') && !named.has(prefix + f)) unlinkSync(join(dir, f));
  }

  writeFileSync(MANIFEST, manifestSource(tokenLogos, networkLogos));
  console.log(`\ntokens: ${Object.keys(tokenLogos).length} of ${bySymbol.size} symbols; networks: ${Object.keys(networkLogos).length} of ${networkIds.length}`);
  if (missing.length) console.log(`without a logo: ${missing.join(', ')}`);
}

function manifestSource(tokens, networks) {
  const entries = (map) => Object.keys(map).sort().map((k) => `  ${/^[A-Za-z_][A-Za-z0-9_]*$/.test(k) ? k : JSON.stringify(k)}: ${JSON.stringify(map[k])},`).join('\n');
  return `/* Token and network logos: official artwork only, generated by scripts/fetch-token-logos.mjs (run it
   to refresh; do not edit by hand). Sources and licences: src/assets/logos/tokens/SOURCES.md and
   src/assets/logos/networks/SOURCES.md. A symbol or network missing here has no official artwork we
   could vouch for, and the UI shows a monogram instead. Pure, so it is unit-tested.

   A value is a file under src/assets/logos ("tokens/aave.webp"), which @/lib/logo-urls turns into
   its fingerprinted URL, or a path under public/ ("/media/brands/xlm.svg") for the landing's
   brand files, served as it is. */

/* Keyed by normalized symbol (normalizeSymbol): one symbol on several networks shares one logo. */
export const TOKEN_LOGOS: Record<string, string> = {
${entries(tokens)}
};

/* Keyed by the network ids of NETWORK_NAMES and OFT_NETWORK_NAMES (src/lib/chains.ts). */
export const NETWORK_LOGOS: Record<string, string> = {
${entries(networks)}
};

/* A symbol as the logo map keys it: uppercase, without NEAR Intents' trailing tag ("USDT0(DEPRECATED)",
   "BTC(OMNI)", "XPL_(DEPRECATED)") or a leading "$" ("$WIF"). */
export function normalizeSymbol(symbol: string): string {
  return symbol.trim().toUpperCase().replace(/_?\\([^)]*\\)$/, "").replace(/^\\$/, "");
}

export function tokenLogo(symbol: string): string | undefined {
  const key = normalizeSymbol(symbol);
  return Object.hasOwn(TOKEN_LOGOS, key) ? TOKEN_LOGOS[key] : undefined;
}

export function networkLogo(id: string): string | undefined {
  return Object.hasOwn(NETWORK_LOGOS, id) ? NETWORK_LOGOS[id] : undefined;
}
`;
}

if (!existsSync(join(ROOT, 'package.json'))) throw new Error('run from the repository');
await main();
