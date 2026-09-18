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
