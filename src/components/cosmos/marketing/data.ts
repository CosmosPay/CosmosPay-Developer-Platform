/* data.js — non-component constants for the marketing landing.
   Brand names + code snippets are not translated. */

/* Company names for the hero "Trusted by engineering teams at" strip.
   These were placeholder/mock names — replace them with your real customers.
   While this array is empty the whole strip is hidden (see Hero.tsx), so no mock
   names ever appear. Add your own as plain strings, e.g.:
     export const CLIENTS = ["Acme", "Globex", "Initech"];
   To show logos instead of names, swap the <Marquee> render in Hero.tsx. */
export const CLIENTS: string[] = [];

export const API_SNIPPET = `import { Client } from '@cosmosapp/pay_sdk';

// Bring only your API key — the gateway is pre-configured.
const client = new Client({ apiKey: process.env.COSMOS_PAY_API_KEY });

// Create a Stellar SEP-7 payment intent
const intent = await client.paymentIntents.createPay({
  destination: 'GA3K7X9PLQ...',
  amount: '250.00',
  assetCode: 'USDC',
});

console.log(intent.uri); // web+stellar:pay?destination=...`;

/* code examples for the solutions modals, keyed by item — never translated.
   Use the real @cosmosapp/pay_sdk API surface so the snippets stay accurate. */
export const SOL_EX = {
  pay: ["await client.paymentIntents.createPay({", "  destination: 'GA3K7X9PLQ...',", "  amount: '250.00',", "  assetCode: 'USDC',", "});", "// → intent.uri + intent.qr"],
  coin: ["const { data } = await", "  client.analytics.balances();", "// [{ asset: 'USDC', amount: '48,210.00' },", "//  { asset: 'EURC', amount: '12,540.00' }]"],
  globe: ["await client.paymentIntents.createPay({", "  destination: 'GD...receiver',", "  amount: '1000',", "  assetCode: 'USDC',", "}); // settles in ~5s"],
  ramp: ["client.webhooks.on(", "  'paymentIntentSucceeded',", "  (event) => settle(event.data),", ");"],
  wallet: ["import { WebClient } from", "  '@cosmosapp/pay_sdk/web';", "const { txHash } =", "  await new WebClient().pay(intent);"],
};
/* El bento no se pinta con gradientes: la ficha destacada es un panel navy y
   las otras cuatro son superficie con borde al 12 %. Solo queda la key y cual
   es la destacada. */
export const SOL_META = [
  { i: "pay", feat: true },
  { i: "coin" },
  { i: "globe" },
  { i: "ramp" },
  { i: "wallet" },
];
export const STAT_VALUES = [{ n: "99.99", u: "%" }, { n: "<70", u: "ms" }, { n: "130", u: "+" }, { n: "8.4", u: "B" }];
export const SCALE_VALUES = ["500M+", "10k+", "~5s", "99.999%"];
export const PATH_NUMS = ["01", "02", "03"];
/* Los casos son filas separadas por hairline, sin cubierta de color ni glifo:
   de la ficha vieja solo sobrevive la cifra. */
export const CASE_META = {
  Northwind: { metric: "+38%" },
  Lumio: { metric: "6 wks" },
  Helios: { metric: "$2.4B" },
};
export const QUOTE_META = [{ av: "MC", n: "Maya Chen" }, { av: "DO", n: "Daniel Ortiz" }, { av: "PN", n: "Priya Nair" }];

export const API_CARD_KEYS = ["payments", "stablecoin", "anchor"];
// The SDK is JavaScript/TypeScript only, shipped as two entry points:
// `@cosmosapp/pay_sdk` (server) and `@cosmosapp/pay_sdk/web` (browser wallets).
export const SDK_KEYS = ["node", "web"];
export const CASE_KEYS = ["Northwind", "Lumio", "Helios"];

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

/* El comando del SDK y el indice en texto plano para los asistentes de codigo. */
export const SDK_INSTALL = "npm i @cosmosapp/pay_sdk";
export const LLMS_TXT = "https://cosmospay.lat/docs/llms.txt";
export const MARKETPLACE_URL = "https://cosmosapp.lat";
