/* fetch-token-logos.mjs: refresh the token and network logos the dashboard and the payments
   landing show, and regenerate their manifest (src/lib/token-logos.ts) and the two SOURCES.md
   files. A maintainer tool: nothing in the build or the server runs it, and its output is
   committed like any other asset.

     node scripts/fetch-token-logos.mjs [--raw <dir>]

   WHAT IT COVERS. Every symbol NEAR Intents' 1Click lists (GET /v0/tokens, minus the
   blockchains the Payments API does not offer: qtc, adi), the standard assets the dashboard
   offers on Stellar, Solana and Monad, the P2P ramps' main assets on each of their networks
   (RAMP_TOKENS: the Payments API's P2P_MAIN_TOKENS) and those networks (Celo, World Chain, Blast), every network id in NETWORK_NAMES and OFT_NETWORK_NAMES
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
  celo: 'celo', blast: 'blast',
};

/* The P2P ramps' main assets on each network (the community server's P2P_MAIN_TOKENS, resolved
   against the marketplace's lists on 2026-11-05), as [network, symbol, address]. Each becomes a
   listing like 1Click's, so its logo comes from Trust Wallet's folder for that very contract. The
   zero address is the network's own coin; ETH on an L2 is left to Ethereum's listing, since an
   L2's info logo is the L2's. */
const RAMP_TOKENS = [
  ["eth", "ETH", "0x0000000000000000000000000000000000000000"],
  ["eth", "USDT", "0xdAC17F958D2ee523a2206206994597C13D831ec7"],
  ["eth", "USDC", "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"],
  ["eth", "WETH", "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"],
  ["eth", "WBTC", "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599"],
  ["eth", "cbBTC", "0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf"],
  ["eth", "DAI", "0x6B175474E89094C44Da98b954EedeAC495271d0F"],
  ["eth", "USDS", "0xdC035D45d973E3EC169d2276DDab16f1e407384F"],
  ["eth", "USDe", "0x4c9EDD5852cd905f086C759E8383e09bff1E68B3"],
  ["eth", "PYUSD", "0x6c3ea9036406852006290770BEdFcAbA0e23A0e8"],
  ["eth", "FDUSD", "0xc5f0f7b66764F6ec8C8Dff7BA683102295E16409"],
  ["eth", "EURC", "0x1aBaEA1f7C830bD89Acc67eC4af516284b1bC33c"],
  ["eth", "LINK", "0x514910771AF9Ca656af840dff83E8264EcF986CA"],
  ["eth", "UNI", "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984"],
  ["eth", "AAVE", "0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9"],
  ["eth", "LDO", "0x5A98FcBEA516Cf06857215779Fd812CA3beF1B32"],
  ["eth", "wstETH", "0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0"],
  ["eth", "weETH", "0xCd5fE23C85820F7B72D0926FC9b05b43E359b7ee"],
  ["eth", "rETH", "0xae78736Cd615f374D3085123A210448E74Fc6393"],
  ["eth", "cbETH", "0xBe9895146f7AF43049ca1c1AE358B0541Ea49704"],
  ["op", "ETH", "0x0000000000000000000000000000000000000000"],
  ["op", "USDT0", "0x01bFF41798a0BcF287b996046Ca68b395DbC1071"],
  ["op", "USDC", "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85"],
  ["op", "WETH", "0x4200000000000000000000000000000000000006"],
  ["op", "WBTC", "0x68f180fcCe6836688e9084f035309E29Bf0A2095"],
  ["op", "OP", "0x4200000000000000000000000000000000000042"],
  ["op", "USDT", "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58"],
  ["op", "USDC.e", "0x7F5c764cBc14f9669B88837ca1490cCa17c31607"],
  ["op", "DAI", "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1"],
  ["op", "EURC", "0xDCB612005417Dc906fF72c87DF732e5a90D49e11"],
  ["op", "WLD", "0xdC6fF44d5d932Cbd77B52E5612Ba0529DC6226F1"],
  ["op", "LINK", "0x350a791Bfc2C21F9Ed5d10980Dad2e2638ffa7f6"],
  ["op", "UNI", "0x6fd9d7AD17242c41f7131d257212c54A0e816691"],
  ["op", "AAVE", "0x76FB31fb4af56892A25e32cFC43De717950c9278"],
  ["op", "wstETH", "0x1F32b1c2345538c0c6f582fCB022739c4A194Ebb"],
  ["op", "weETH", "0x5A7fACB970D094B6C7FF1df0eA68D99E6e73CBFF"],
  ["op", "rETH", "0x9Bcef72be871e61ED4fBbc7630889beE758eb81D"],
  ["bsc", "BNB", "0x0000000000000000000000000000000000000000"],
  ["bsc", "USDT", "0x55d398326f99059fF775485246999027B3197955"],
  ["bsc", "USDC", "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d"],
  ["bsc", "WBNB", "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c"],
  ["bsc", "BTCB", "0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c"],
  ["bsc", "WETH", "0x2170Ed0880ac9A755fd29B2688956BD959F933F8"],
  ["bsc", "FDUSD", "0xc5f0f7b66764F6ec8C8Dff7BA683102295E16409"],
  ["bsc", "USDe", "0x5d3a1Ff2b6BAb83b63cd9AD0787074081a52ef34"],
  ["bsc", "DAI", "0x1AF3F329e8BE154074D8769D1FFa4eE058B1DBc3"],
  ["bsc", "Cake", "0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82"],
  ["bsc", "WBTC", "0x0555E30da8f98308EdB960aa94C0Db47230d2B9c"],
  ["bsc", "LINK", "0xF8A0BF9cF54Bb92F17374d9e9A321E6a111a51bD"],
  ["bsc", "UNI", "0xBf5140A22578168FD562DCcF235E5D43A02ce9B1"],
  ["bsc", "AAVE", "0xfb6115445Bff7b52FeB98650C87f44907E58f802"],
  ["bsc", "weETH", "0x04C0599Ae5A44757c0af6F9eC3b93da8976c150A"],
  ["unichain", "ETH", "0x0000000000000000000000000000000000000000"],
  ["unichain", "USDC", "0x078D782b760474a361dDA0AF3839290b0EF57AD6"],
  ["unichain", "USD₮0", "0x9151434b16b9763660705744891fA906F660EcC5"],
  ["unichain", "WETH", "0x4200000000000000000000000000000000000006"],
  ["unichain", "WBTC", "0x0555E30da8f98308EdB960aa94C0Db47230d2B9c"],
  ["unichain", "DAI", "0x20CAb320A855b39F724131C69424240519573f81"],
  ["unichain", "wstETH", "0xc02fE7317D4eb8753a02c35fe019786854A92001"],
  ["unichain", "weETH", "0x7DCC39B4d1C53CB31e1aBc0e358b43987FEF80f7"],
  ["unichain", "rETH", "0x94Cac393f3444cEf63a651FfC18497E7e8bd036a"],
  ["pol", "POL", "0x0000000000000000000000000000000000000000"],
  ["pol", "USDT", "0xc2132D05D31c914a87C6611C10748AEb04B58e8F"],
  ["pol", "USDC", "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359"],
  ["pol", "WPOL", "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270"],
  ["pol", "WETH", "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619"],
  ["pol", "WBTC", "0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6"],
  ["pol", "USDC.e", "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174"],
  ["pol", "DAI", "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063"],
  ["pol", "LINK", "0x53E0bca35eC356BD5ddDFebbD1Fc0fD03FaBad39"],
  ["pol", "UNI", "0xb33EaAd8d922B1083446DC23f610c2567fB5180f"],
  ["pol", "AAVE", "0xD6DF932A45C0f255f85145f286eA0b292B21C90B"],
  ["pol", "LDO", "0xC3C7d422809852031b44ab29EEC9F1EfF2A58756"],
  ["pol", "CRV", "0x172370d5Cd63279eFa6d502DAB29171933a610AF"],
  ["pol", "wstETH", "0x03b54A6e9a984069379fae1a4fC4dBAE93B3bCCD"],
  ["world", "ETH", "0x0000000000000000000000000000000000000000"],
  ["world", "USDC", "0x79A02482A880bCE3F13e09Da970dC34db4CD24d1"],
  ["world", "WETH", "0x4200000000000000000000000000000000000006"],
  ["world", "WBTC", "0x03C7054BCB39f7b2e5B2c7AcB37583e32D70Cfa3"],
  ["world", "WLD", "0x2cFc85d8E48F8EAB294be644d9E25C3030863003"],
  ["base", "ETH", "0x0000000000000000000000000000000000000000"],
  ["base", "USDC", "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"],
  ["base", "USDT", "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2"],
  ["base", "WETH", "0x4200000000000000000000000000000000000006"],
  ["base", "cbBTC", "0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf"],
  ["base", "WBTC", "0x0555E30da8f98308EdB960aa94C0Db47230d2B9c"],
  ["base", "AERO", "0x940181a94A35A4569E4529A3CDfB74e38FD98631"],
  ["base", "USDbC", "0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA"],
  ["base", "DAI", "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb"],
  ["base", "USDS", "0x820C137fa70C8691f0e44Dc420a5e53c168921Dc"],
  ["base", "USDe", "0x5d3a1Ff2b6BAb83b63cd9AD0787074081a52ef34"],
  ["base", "EURC", "0x60a3E35Cc302bFA44Cb288Bc5a4F316Fdb1adb42"],
  ["base", "LINK", "0x88Fb150BDc53A65fe94Dea0c9BA0a6dAf8C6e196"],
  ["base", "AAVE", "0x63706e401c06ac8513145b7687A14804d17f814b"],
  ["base", "wstETH", "0xc1CBa3fCea344f92D9239c08C0568f6F2F0ee452"],
  ["base", "weETH", "0x04C0599Ae5A44757c0af6F9eC3b93da8976c150A"],
  ["base", "cbETH", "0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22"],
  ["base", "rETH", "0xB6fe221Fe9EeF5aBa221c348bA20A1Bf5e73624c"],
  ["arb", "ETH", "0x0000000000000000000000000000000000000000"],
  ["arb", "USDT0", "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9"],
  ["arb", "USDC", "0xaf88d065e77c8cC2239327C5EDb3A432268e5831"],
  ["arb", "WETH", "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1"],
  ["arb", "WBTC", "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f"],
  ["arb", "ARB", "0x912CE59144191C1204E64559FE8253a0e49E6548"],
  ["arb", "USDC.e", "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8"],
  ["arb", "DAI", "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1"],
  ["arb", "cbBTC", "0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf"],
  ["arb", "USDe", "0x5d3a1Ff2b6BAb83b63cd9AD0787074081a52ef34"],
  ["arb", "PYUSD", "0x46850aD61C2B7d64d08c9C754F45254596696984"],
  ["arb", "LINK", "0xf97f4df75117a78c1A5a0DBb814Af92458539FB4"],
  ["arb", "UNI", "0xFa7F8980b0f1E64A2062791cc3b0871572f1F7f0"],
  ["arb", "AAVE", "0xba5DdD1f9d7F570dc94a51479a000E3BCE967196"],
  ["arb", "GMX", "0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a"],
  ["arb", "wstETH", "0x5979D7b546E38E414F7E9822514be443A4800529"],
  ["arb", "weETH", "0x35751007a407ca6FEFfE80b3cB397736D2cf4dbe"],
  ["arb", "rETH", "0xEC70Dcb4A1EFa46b8F2D97C310C9c4790ba5ffA8"],
  ["celo", "CELO", "0x471EcE3750Da237f93B8E339c536989b8978a438"],
  ["celo", "USD₮", "0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e"],
  ["celo", "USDC", "0xcebA9300f2b948710d2653dD7B07f33A8B32118C"],
  ["celo", "USDm", "0x765DE816845861e75A25fCA122bb6898B8B1282a"],
  ["celo", "EURm", "0xD8763CBa276a3738E6DE85b4b3bF5FDed6D6cA73"],
  ["celo", "WETH", "0xD221812de1BD094f35587EE8E174B07B6167D9Af"],
  ["celo", "BRLm", "0xe8537a3d056DA446677B9E9d6c5dB704EaAb4787"],
  ["celo", "COPm", "0x8A567e2aE79CA692Bd748aB832081C45de4041eA"],
  ["avax", "AVAX", "0x0000000000000000000000000000000000000000"],
  ["avax", "USDt", "0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7"],
  ["avax", "USDC", "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E"],
  ["avax", "WAVAX", "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7"],
  ["avax", "BTC.b", "0x152b9d0FdC40C096757F570A51E494bd4b943E50"],
  ["avax", "WBTC", "0x50b7545627a5162F82A992c33b87aDc75187B218"],
  ["avax", "WETH.e", "0x49D5c2BdFfac6CE2BFdB6640F4F80f226bc10bAB"],
  ["avax", "USDC.e", "0xA7D7079b0FEaD91F3e65f86E8915Cb59c1a4C664"],
  ["avax", "USDe", "0x5d3a1Ff2b6BAb83b63cd9AD0787074081a52ef34"],
  ["avax", "EURC", "0xC891EB4cbdEFf6e073e859e987815Ed1505c2ACD"],
  ["avax", "JOE", "0x6e84a6216eA6dACC71eE8E6b0a5B7322EEbC0fDd"],
  ["avax", "GMX", "0x62edc0692BD897D2295872a9FFCac5425011c661"],
  ["avax", "weETH", "0xA3D68b74bF0528fdD07263c60d6488749044914b"],
];
const RAMP_NATIVE = '0x0000000000000000000000000000000000000000';
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
  // Tether's own spellings on Celo and Unichain: the same token mark as USDT.
  'USD₮': alias('USDT', 'Tether USDT on Celo, listed as USD₮: the USDT mark'),
  'USD₮0': alias('USDT', 'Tether USDT0 on Unichain, listed as USD₮0: the USDT mark'),
  // Avalanche's bridged coins, which Trust Wallet does not carry: the original asset's mark (the
  // network shows in the mark's badge).
  'BTC.B': alias('BTC', 'Bitcoin bridged to Avalanche (BTC.b): the BTC mark'),
  'WBTC.E': alias('WBTC', 'WBTC bridged to Avalanche (WBTC.e): the WBTC mark'),
  'WETH.E': alias('WETH', 'WETH bridged to Avalanche (WETH.e): the WETH mark'),
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
  // The P2P ramps' networks. World Chain's mark is World's own, the one its WLD token carries.
  celo: tw('celo/info/logo.png'),
  blast: tw('blast/info/logo.png'),
  world: url(TW_RAW + 'ethereum/assets/0x163f8C2467924be0ae7B5347228CABF260318753/logo.png', TW_LICENCE, "World's mark, as Trust Wallet carries it for the WLD token (World Chain's own network mark)"),
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
  for (const [blockchain, symbol, address] of RAMP_TOKENS) {
    if (address === RAMP_NATIVE && symbol === 'ETH') continue;
    const key = normalizeSymbol(symbol);
    if (!bySymbol.has(key)) bySymbol.set(key, []);
    bySymbol.get(key).push({ blockchain, symbol, contractAddress: address === RAMP_NATIVE ? null : address });
  }

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
