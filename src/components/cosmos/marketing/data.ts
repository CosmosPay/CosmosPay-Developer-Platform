/* data.js — non-component constants for the marketing landing.
   Brand names + code snippets are not translated. */

export const CLIENTS = ["Northwind", "Lumio", "Vertexa", "Quanta", "Helios", "Cobalt", "Riverstone", "Novex"];

export const API_SNIPPET = `import cosmos from '@cosmos-pay/sdk';

// send a payment over the Stellar network
const payment = await cosmos.payments.create({
  amount: 250.00,
  asset: 'USDC',
  network: 'stellar',
  destination: 'GA3K7X9PLQ...'
});

console.log(\`Settled in \${payment.settledMs}ms\`);`;

/* code examples for the solutions modals, keyed by item — never translated */
export const SOL_EX = {
  pay: ["await cosmos.payments.create({", "  amount: 250.00,", "  asset: 'USDC',", "  destination: 'GA3K7X9PLQ...'", "});", "// settled in 4.2s"],
  coin: ["balance.assets = [", "  { code: 'USDC', amount: '48,210.00' },", "  { code: 'EURC', amount: '12,540.00' }", "]"],
  globe: ["payout.to = 'GD...receiver'", "payout.amount = '1,000 USDC'", "payout.country = 'BR'", "// arrives in ~5s"],
  ramp: ["anchor.deposit({", "  asset: 'USDC',", "  amount: 500,", "  method: 'bank_transfer'", "})"],
  wallet: ["const wallet = await cosmos", "  .wallets.create({", "    type: 'custodial'", "  });", "// => G...publicKey"],
};
export const SOL_META = [
  { i: "pay", gw: "gw1", feat: true },
  { i: "coin", gw: "gw2" },
  { i: "globe", gw: "gw3" },
  { i: "ramp", gw: "gw4" },
  { i: "wallet", gw: "gw2" },
];
export const STAT_VALUES = [{ n: "99.99", u: "%" }, { n: "<70", u: "ms" }, { n: "130", u: "+" }, { n: "8.4", u: "B" }];
export const SCALE_VALUES = ["500M+", "10k+", "~5s", "99.999%"];
export const PATH_NUMS = ["01", "02", "03"];
export const CASE_META = {
  Northwind: { bg: "linear-gradient(135deg,#6B47FF,#A24DFF 50%,#FF8E6B)", g: 0, metric: "+38%" },
  Lumio: { bg: "linear-gradient(135deg,#3D5AFE,#7C4DFF 55%,#C44DFF)", g: 3, metric: "6 wks" },
  Helios: { bg: "linear-gradient(135deg,#12A2A6,#4B6BFF 55%,#7C4DFF)", g: 2, metric: "$2.4B" },
};
export const QUOTE_META = [{ av: "MC", n: "Maya Chen" }, { av: "DO", n: "Daniel Ortiz" }, { av: "PN", n: "Priya Nair" }];

export const API_CARD_KEYS = ["payments", "stablecoin", "anchor"];
export const SDK_KEYS = ["node", "python", "go", "ruby"];
export const CASE_KEYS = ["Northwind", "Lumio", "Helios"];
