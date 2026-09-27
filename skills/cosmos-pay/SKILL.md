---
name: cosmos-pay
description: Accept Stellar payments in a JavaScript/TypeScript app with the Cosmos Pay SDK (@cosmosapp/pay_sdk). Covers install, API-key auth (the key prefix picks testnet or mainnet), SEP-7 payment intents with QR, completing them in the browser with Freighter/xBull/Rabet/LOBSTR/Albedo, validating the transaction, signed webhooks, and where to find fiat on/off ramp, swaps and KYC. Use when adding a checkout, donations, invoices or any "charge in USDC on Stellar" flow.
user-invocable: true
argument-hint: "[payment task]"
---

# Cosmos Pay: Stellar payments SDK

[Cosmos Pay](https://cosmospay.lat) is a payments gateway on Stellar. `@cosmosapp/pay_sdk` gives you one server client (payment intents, webhooks, products, customers, analytics, ramps) and one browser client that detects the user's Stellar wallet and signs the payment. You create and validate on the server, and the browser only signs.

## When to use this skill
- Charging a customer in USDC (or any Stellar asset) from a web app or backend
- Generating a SEP-7 `web+stellar:pay` link or QR for an amount
- Letting the user pay from Freighter, xBull, Rabet, LOBSTR or Albedo in one call
- Confirming a payment by transaction hash or by webhook
- Moving fiat in and out (on-ramp / off-ramp) around those payments

## Related skills
- SEP-7 URIs and other standards → `../standards/SKILL.md`
- Building your own wallet connection instead → `../dapp/SKILL.md`
- Assets, issuers and trustlines → `../assets/SKILL.md`

---

## 1. Install

```bash
npm install @cosmosapp/pay_sdk
# browser wallet support (optional peer dependency):
npm install @cosmosapp/pay_sdk @stellar/stellar-sdk
```

Node.js 18 or newer (global `fetch`). The package ships ESM and CommonJS with types.

## 2. Authenticate

Get an API key at https://dev.cosmospay.lat (see `/docs/api-keys`). Keep it on the server.

```ts
import { Client } from '@cosmosapp/pay_sdk';

const client = new Client({ apiKey: process.env.COSMOS_PAY_API_KEY! });
```

**The key prefix selects the network. Do not configure it anywhere else:**

| Key prefix | Network |
| ---------- | ------- |
| `dv_…`     | testnet |
| `prod_…`   | mainnet |

Asset issuers differ per network, so use `Assets.*` with a `prod_` key and `TestnetAssets.*` with a `dv_` key.

## 3. Create a payment intent (server)

```ts
import { Client, Assets } from '@cosmosapp/pay_sdk';

const client = new Client({ apiKey: process.env.COSMOS_PAY_API_KEY! });

const intent = await client.paymentIntents.createPay({
  destination: 'G...MERCHANT',
  amount: '10',
  asset: Assets.USDC,   // fills the verified issuer for you
  msg: 'Order #24',
});

intent.uri; // web+stellar:pay?destination=...   (SEP-7)
intent.qr;  // data:image/png;base64,...          (render as <img>)
return intent.toJSON(); // send this payload to the browser
```

## 4. Complete it in the browser

```ts
import { WebClient } from '@cosmosapp/pay_sdk/web';

const intent = await fetch('/api/create-intent', { method: 'POST' }).then((r) => r.json());
const { txHash, account, wallet } = await new WebClient().pay(intent);

await fetch('/api/confirm', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ intentId: intent.id, txHash }),
});
```

`WebClient` auto-detects Freighter, xBull and Rabet. Albedo and LOBSTR need their library passed in: `new WebClient({ albedo })` / `new WebClient({ lobstr })`. It never needs your API key.

## 5. Validate (server)

```ts
const outcome = await client.paymentIntents.validate(intentId, { txHash });
if (outcome.valid) {
  // settled: fulfil the order
}
```

## 6. Webhooks (instead of polling)

```ts
import express from 'express';
import { Client, Webhooks, WebhookEventType } from '@cosmosapp/pay_sdk';

const client = new Client({ apiKey: process.env.COSMOS_PAY_API_KEY! });

// once: register the endpoint. endpoint.secret (whsec_…) is returned only here: store it.
const endpoint = await client.webhooks.create({
  url: 'https://example.com/hooks/cosmos',
  eventTypes: [WebhookEventType.PaymentIntentSucceeded],
});

const app = express();
app.post('/hooks/cosmos', express.raw({ type: '*/*' }), (req, res) => {  // MUST be the raw body
  // verifies X-Cosmos-Signature (HMAC + 300 s replay window), throws WebhookSignatureError
  const event = Webhooks.constructEvent(
    req.body,
    req.get('x-cosmos-signature') ?? '',
    process.env.COSMOS_WEBHOOK_SECRET!,
  );
  if (event.type === WebhookEventType.PaymentIntentSucceeded) {
    // event.id is stable: use it for idempotency
  }
  res.sendStatus(200);
});
```

Without Express: `createServer(client.webhooks.createHandler()).listen(4242)` (pass `webhookSecret` to the `Client`).

## Beyond payments

The same `client` exposes these managers:
- `client.onramp`: fiat → stablecoin (quote → payin → funds arrive)
- `client.offramp`: stablecoin → fiat (quote → authorize → sign → payout)
- `client.kyc`: receivers, bank accounts and wallets that the ramps pay into or out of
- `client.swaps`, `client.liquidity`, `client.products`, `client.customers`, `client.analytics`

The option shapes are in the docs. Read the page before writing code against a ramp.

## Pitfalls
- **Never ship a `prod_` key to the browser.** Create and validate intents on the server. `new WebClient({ apiKey })` is only for prototypes with a testnet `dv_` key.
- **Wrong network, wrong issuer.** A `dv_` key with `Assets.USDC` (mainnet issuer) will not settle. Use `TestnetAssets.USDC` on testnet.
- **Express webhooks need the raw body.** A JSON body parser in front of the middleware breaks signature verification.
- **Don't trust the browser's `txHash` alone.** Always call `validate` (or wait for the webhook) before fulfilling.

## Full documentation for agents
- Index: https://cosmospay.lat/docs/llms.txt
- Everything in one file: https://cosmospay.lat/docs/llms-full.txt
- Any page as Markdown: `https://cosmospay.lat/docs/llms.mdx/<path>/content.md` (e.g. `sdk/server/quickstart`)
- Offline: after installing, read `node_modules/@cosmosapp/pay_sdk/llms/llms-full.txt`
- Runnable examples: https://github.com/CosmosPay/CosmosJS_SDK/tree/main/examples
