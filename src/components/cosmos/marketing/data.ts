/* data.ts: non-component constants for the marketing landing. Pure (no astro:env), so the
   Markdown version of the home reads the same figures and lists.
   Brand names + code snippets are not translated. */

/* Company names for the hero "Trusted by engineering teams at" strip.
   These were placeholder/mock names; replace them with your real customers.
   While this array is empty the whole strip is hidden (see Hero.tsx), so no mock
   names ever appear. Add your own as plain strings, e.g.:
     export const CLIENTS = ["Acme", "Globex", "Initech"];
   To show logos instead of names, swap the <Marquee> render in Hero.tsx. */
import { CHAINS, NETWORK_IDS } from "@/lib/chains";
import { PLAN_SPECS } from "@/lib/plans";
import { CHECKOUT_THEMES } from "@/lib/payments/checkout-themes";
import { LOCALES } from "@/lib/i18n/locales";

export const CLIENTS: string[] = [];

export const API_SNIPPET = `import { Client } from '@cosmosapp/pay_sdk';

// Bring only your API key: the gateway is pre-configured.
const client = new Client({ apiKey: process.env.COSMOS_PAY_API_KEY });

// Create a Stellar SEP-7 payment intent
const intent = await client.paymentIntents.createPay({
  destination: 'GA3K7X9PLQ...',
  amount: '250.00',
  assetCode: 'USDC',
});

console.log(intent.uri); // web+stellar:pay?destination=...`;

/* code examples for the solutions modals, keyed by item; never translated.
   Use the real @cosmosapp/pay_sdk API surface so the snippets stay accurate. */
export const SOL_EX = {
  pay: ["await client.paymentIntents.createPay({", "  destination: 'GA3K7X9PLQ...',", "  amount: '250.00',", "  assetCode: 'USDC',", "});", "// → intent.uri + intent.qr"],
  coin: ["const { data } = await", "  client.analytics.balances();", "// [{ asset: 'USDC', amount: '48,210.00' },", "//  { asset: 'EURC', amount: '12,540.00' }]"],
  globe: ["await client.paymentIntents.createPay({", "  destination: 'GD...receiver',", "  amount: '1000',", "  assetCode: 'USDC',", "}); // settles in ~5s"],
  swap: ["await client.crossChainSwaps.create({", "  originChain: 'stellar', originAsset: 'XLM',", "  amount: '100',", "  destinationChain: 'solana',", "  destinationAsset: 'USDC',", "  recipient, refundTo,", "}); // pay swap.depositAddress"],
  wallet: ["import { WebClient } from", "  '@cosmosapp/pay_sdk/web';", "const { txHash } =", "  await new WebClient().pay(intent);"],
};
/* El bento no se pinta con gradientes: la ficha destacada es un panel navy y
   las otras cuatro son superficie con borde al 12 %. Solo queda la key y cual
   es la destacada. */
export const SOL_META = [
  { i: "pay", feat: true },
  { i: "coin" },
  { i: "globe" },
  { i: "swap" },
  { i: "wallet" },
];
/* Every figure on the home is a product fact the code backs, never a volume, an uptime or a
   customer count: the networks a payment settles on (CHAINS), the networks cross-chain swaps
   reach (NETWORK_IDS), Starter's rate (plans.ts) and the settlement time on Stellar. The
   labels come from the catalog; `{fixed}` in them is Starter's fixed part. */
const [STARTER_PCT, STARTER_FIXED] = PLAN_SPECS.starter.perTx.split(" + ");
export const SWAP_NETWORKS = NETWORK_IDS.length;
export const STAT_VALUES = [
  { n: String(CHAINS.length), u: "" },
  { n: String(SWAP_NETWORKS), u: "" },
  { n: STARTER_PCT, u: "" },
  { n: "~5", u: "s" },
];
export const STAT_VARS = { fixed: STARTER_FIXED };
/* The integration facts beside the paths: checkout designs, the languages the checkout speaks,
   the one script tag that embeds it and the two key sets (test dv_, live prod_). */
export const SCALE_VALUES = [String(CHECKOUT_THEMES.length), String(LOCALES.length), "1", "2"];
export const PATH_NUMS = ["01", "02", "03"];

/* The use cases the stories section walks through, by catalog key. No customer names or
   figures: these are the flows the product runs today (payments landing: use cases). */
export const STORY_KEYS = ["stores", "services", "digital"];

export const API_CARD_KEYS = ["payments", "stablecoin", "swaps"];
/* Where each part of the home leads in the docs (paths under the docs root, DOCS): each API card
   to its reference page (named in the catalog, `cards.*.link`), each SDK button to its guide, each
   resource to its page (by position: the catalogs carry the labels, in the same order in every
   language). */
export const API_CARD_DOCS: Record<string, string> = { payments: "/api/payment-intents", stablecoin: "/api/assets", swaps: "/api/swaps" };
export const SDK_DOCS: Record<string, string> = { web: "/sdk/web/web-client", node: "/sdk/server/overview" };
export const RESOURCE_DOCS = [
  "/getting-started", // Getting started
  "/embed", // Embed a pay button or checkout
  "/sdk/server/webhooks", // Webhooks in the SDK
  "/api-keys", // Get your API key
];
/* The three integration paths' targets, by position: No-code opens the dashboard, Prebuilt UI the
   embed guide (pay button and embedded checkout), Build-your-own (the REST/SDK "API" path) the
   docs. */
export const PATH_TARGETS: readonly ({ to: "dashboard" } | { to: "docs"; path: string })[] = [
  { to: "dashboard" },
  { to: "docs", path: "/embed" },
  { to: "docs", path: "" },
];
// The SDK is JavaScript/TypeScript only, shipped as two entry points:
// `@cosmosapp/pay_sdk` (server) and `@cosmosapp/pay_sdk/web` (browser wallets).
export const SDK_KEYS = ["node", "web"];

/* ============================================================
   LA WALLET
   La version vive aca y en ningun otro lado: los links de descarga se arman
   con ella, asi que subir de version es tocar una sola constante.
   ============================================================ */
export const WALLET_VERSION = "1.8.0";
const RELEASE = `https://github.com/CosmosPay/CosmosPay-Wallet/releases/download/v${WALLET_VERSION}`;

/* Los tres caminos de arriba mas el resto de las plataformas. El zip de Chrome
   del release no se enlaza: para Chrome el camino es la tienda, que ya trae
   actualizaciones automaticas. Tampoco el apk de debug (463 MB) ni el .aab,
   que es para la Play Console. */
export const WALLET_LINKS = {
  chrome: "https://chromewebstore.google.com/detail/cosmos-pay-%E2%80%94-stellar-wall/jibiahkbhhmddnahglhffkejcfhalbgj?hl=es",
  webapp: "https://cosmospay.lat/wallet/",
  android: `${RELEASE}/cosmos-pay-${WALLET_VERSION}.apk`,
  firefox: `${RELEASE}/cosmos-pay-firefox-v${WALLET_VERSION}.zip`,
  windows: `${RELEASE}/cosmos-pay-v${WALLET_VERSION}-windows-x86_64-setup.exe`,
  macos: `${RELEASE}/cosmos-pay-v${WALLET_VERSION}-macos-arm64.dmg`,
  linux: `${RELEASE}/cosmos-pay-v${WALLET_VERSION}-linux-x86_64.AppImage`,
  deb: `${RELEASE}/cosmos-pay-v${WALLET_VERSION}-linux-x86_64.deb`,
  rpm: `${RELEASE}/cosmos-pay-v${WALLET_VERSION}-linux-x86_64.rpm`,
};

/* Pesos reales de los assets del release v1.8.0, redondeados. No se traducen. */
export const ANDROID_SIZE = "22 MB";
export const WALLET_MORE = [
  { k: "firefox", href: WALLET_LINKS.firefox, size: "0,8 MB" },
  { k: "windows", href: WALLET_LINKS.windows, size: "2 MB" },
  { k: "macos", href: WALLET_LINKS.macos, size: "2,4 MB" },
  {
    k: "linux", href: WALLET_LINKS.linux, size: "75 MB",
    extra: [
      { label: ".deb", href: WALLET_LINKS.deb, size: "2,9 MB" },
      { label: ".rpm", href: WALLET_LINKS.rpm, size: "2,9 MB" },
    ],
  },
];

/* The SDK's install command (DevKit links the docs' plain-text index beside it). Nothing here
   reads astro:env, so the Markdown version of the home (src/lib/seo/site-markdown.ts) reads these
   same values under plain node. */
export const SDK_INSTALL = "npm i @cosmosapp/pay_sdk";
export const MARKETPLACE_URL = "https://cosmosapp.lat";
