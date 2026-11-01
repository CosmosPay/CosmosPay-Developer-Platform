/* llms.ts: /llms.txt (https://llmstxt.org) for the company site and the payments gateway: a short
   Markdown fact sheet with the links an assistant or a coding agent should read first. The
   platform's own index of the documentation is /docs/llms.txt, so the platform domain answers
   /llms.txt with a redirect there (src/pages/llms.txt.ts).

   Every fact here is stated by the product's own copy or code: the rates come from
   src/lib/plans.ts at request time, so the file can never quote another price than the pages; the
   rest mirrors the gateway's copy (src/lib/payments/landing-i18n.ts), the docs and
   src/pages/site/tos.astro. No em dashes. Pure, so tests/unit/seoLlms.test.ts covers it. */
import { ESCROW_FEE_PCT, PLAN_IDS, PLAN_SPECS, PRIVATE_PAYMENT_FEE_PCT, swapFeePct } from "@/lib/plans";
import { PAYMENTS_PAGES, pagePath, type PaymentsPage } from "@/lib/payments/site-pages";
import { pageUrl } from "@/lib/seo/lang-urls";
import { GITHUB_ORG, SDK_NPM, SDK_PACKAGE, WALLET_RELEASES } from "@/lib/seo/schema";

export interface LlmsInput {
  site: string;
  dev: string;
  payments: string;
  /** The web wallet (with its trailing slash) and its Chrome Web Store listing. */
  wallet: { webApp: string; chromeStore: string };
  /** The company's public profiles (name → URL), in the order to list them. */
  profiles: Record<string, string>;
}

const planName = (id: string): string => id.charAt(0).toUpperCase() + id.slice(1);

/** "Starter 1.5% + 18¢ with no monthly fee; Essentials 1.12% + 18¢ and $33 per month; …" */
function paymentRates(): string {
  return PLAN_IDS.map((id) => {
    const spec = PLAN_SPECS[id];
    const monthly = /^\$(\d+(?:\.\d+)?)\/mo$/.exec(spec.price);
    if (monthly) return `${planName(id)} ${spec.perTx} and $${monthly[1]} per month`;
    if (spec.perTx === spec.price && /%/.test(spec.perTx)) return `${planName(id)} ${spec.perTx} with no monthly fee`;
    return `${planName(id)} ${spec.price.toLowerCase()}`;
  }).join("; ");
}

/** "Starter 0.65%, Essentials 0.26%, …" */
function swapRates(): string {
  return PLAN_IDS.map((id) => `${planName(id)} ${swapFeePct(id)}`).join(", ");
}

const PAGE_LABELS: Record<PaymentsPage, [string, string]> = {
  integrations: ["Integration options", "payment links and QR codes with no code, the hosted and the embedded checkout, the API and the SDK"],
  swaps: ["Swaps", "swap tokens across 35+ networks and send USDT0 from Stellar, with no account"],
  "use-cases": ["Use cases", "how stores, services, digital products and creators take stablecoins, compared with cards and bank transfers"],
  security: ["Security", "on-chain verification, keys that stay with their owner, checkout pages no other site can frame"],
  fees: ["Pricing and fees", "the rate per payment on each plan and a fee estimator"],
  faq: ["FAQ", "wallets, escrow, refunds, testing and fees"],
};

/** /llms.txt of the company site (cosmospay.lat). */
export function siteLlmsTxt({ site, dev, payments, wallet, profiles }: LlmsInput): string {
  const docs = `${dev}/docs`;
  const pay = (path: string) => pageUrl(payments, path, "en");
  const gateway = PAYMENTS_PAGES.map((p) => `- [${PAGE_LABELS[p][0]}](${pay(pagePath(p))}): ${PAGE_LABELS[p][1]}`);
  return `# Cosmos Pay

> Cosmos Pay runs non-custodial payments, swaps, a payment gateway and private payments as a service on Stellar, Solana and Monad. Developers and businesses use one REST API and a JavaScript and TypeScript SDK to accept stablecoin payments through payment links, a hosted checkout and signed webhooks. Cosmos Pay (cosmospay.lat) is a different project from the Cosmos Network (ATOM).

Key facts:

- Chains: Stellar (SEP-7 payment links), Solana (Solana Pay links) and Monad (EIP-681 links).
- Non-custodial: Cosmos Pay stores no one's keys. With instant settlement, on Stellar and Solana the payer pays the merchant's address directly; on Monad each payment goes to its own deposit address, which forwards it to the merchant's less the network fee.
- Settlement: instant (about 5 seconds on Stellar) or escrow, where the payment waits in an on-chain contract until the merchant releases it on dispatch and goes back to the buyer if it is not released before the merchant's deadline.
- No chargebacks: a confirmed payment is final. A refund is a payment the merchant sends back from their wallet.
- Testing: API keys starting with dv_ run on testnet and prod_ keys on mainnet. The key decides the network, not the code.
- Rates per payment: ${paymentRates()}. Escrow adds ${ESCROW_FEE_PCT}% per payment. Private payments (the amount hidden on-chain behind a zero-knowledge proof, on testnet for now) cost ${PRIVATE_PAYMENT_FEE_PCT}% per transaction. The payer's wallet pays the network fee.
- Swap commission: ${swapRates()}; ${swapFeePct("community")} without an account.
- Payer wallets: on Stellar any wallet that opens SEP-7 links (Freighter, xBull, Rabet, LOBSTR, Albedo, Cosmos Wallet); on Solana any wallet that reads Solana Pay links (Phantom, Solflare); on Monad any EVM wallet that reads EIP-681 links.

## Accept payments

- [Cosmos Pay Payments](${pay("/")}): payment links, a hosted checkout and a payments API to accept stablecoins on Stellar, Solana and Monad
${gateway.filter((l) => !l.startsWith("- [Swaps]")).join("\n")}
- [Plans](${pageUrl(site, "/pricing", "en")}): every plan's rates, limits and features

## Swaps

- [Swaps](${pay("/swaps")}): ${PAGE_LABELS.swaps[1]}

## Developers

- [Documentation](${docs}/): SDK guides and the Payments REST API reference
- [Docs index for LLMs](${docs}/llms.txt): every docs page with its description
- [Full docs as one file](${docs}/llms-full.txt)
- [Getting started](${docs}/getting-started/): how a payment works and the two ways to integrate
- [Get an API key](${docs}/api-keys/): its environment picks testnet or mainnet, its scopes what it may call
- [Server SDK quickstart](${docs}/sdk/server/quickstart/): create a payment intent, complete it in the wallet, validate it
- [Payments REST API reference](${docs}/api/): payment intents, payment links, webhooks, products, customers, swaps, on-ramp and off-ramp
- [OpenAPI document](${docs}/openapi.json): the Payments REST API's contract
- [Webhooks](${docs}/sdk/server/webhooks/): events signed with HMAC-SHA256
- [Embed a payment](${docs}/embed/): a pay button or an embedded checkout from one script tag
- [Using the docs with AI](${docs}/ai/)
- [SDK on npm: ${SDK_PACKAGE}](${SDK_NPM}): \`npm i ${SDK_PACKAGE}\` (Node.js 18 or later); browser entry point \`${SDK_PACKAGE}/web\`
- [Source code on GitHub](${GITHUB_ORG})

## Cosmos Pay Wallet

- [Web app](${wallet.webApp}): non-custodial wallet for Stellar, Solana and Monad; keys are generated and encrypted on the device
- [Chrome extension](${wallet.chromeStore})
- [Android, Windows, macOS, Linux and Firefox builds](${WALLET_RELEASES})

## Optional

- [Terms and conditions](${site}/tos)
- [Security contact](${site}/.well-known/security.txt)
- [API catalog](${site}/.well-known/api-catalog)
- Profiles: ${Object.entries(profiles)
    .map(([name, url]) => `[${name}](${url})`)
    .join(", ")}
`;
}

/** /llms.txt of the payments gateway (payments.cosmospay.lat). */
export function paymentsLlmsTxt({ site, dev, payments }: LlmsInput): string {
  const docs = `${dev}/docs`;
  const pay = (path: string, lang = "en") => pageUrl(payments, path, lang);
  const pages = PAYMENTS_PAGES.map((p) => `- [${PAGE_LABELS[p][0]}](${pay(pagePath(p))}): ${PAGE_LABELS[p][1]}`);
  return `# Cosmos Pay Payments

> Cosmos Pay Payments lets businesses accept stablecoins such as USDC and EURC on Stellar, Solana and Monad through payment links, a hosted checkout and a payments API. Customers pay from their own wallet, and the business is paid at an address it controls, instantly or through on-chain escrow. Made by Cosmos Pay (${site}/) for businesses in Latin America and beyond.

How a payment works:

1. Create a payment link in the dashboard, or a payment intent from your server.
2. Send the link or show its QR code. The checkout shows the amount, the network and a countdown.
3. The customer pays from their own wallet on Stellar, Solana or Monad.
4. The payment is verified on-chain, the checkout turns to Paid and a signed webhook fires.

Facts:

- Settlement: instant (about 5 seconds on Stellar) or escrow (+${ESCROW_FEE_PCT}% per payment), held in an on-chain contract until you release it on dispatch and returned to the buyer if you do not before your deadline.
- Cosmos Pay does not hold the money: on Stellar and Solana the payer pays your address directly; on Monad each payment goes to its own deposit address, which forwards it to yours less the network fee.
- No chargebacks. Refunds are payments you send from your wallet.
- Rates per payment: ${paymentRates()}. The payer's wallet pays the network fee; on Monad the deposit relay's fee is deducted and shown on the checkout. Private payments (amount hidden on-chain, testnet for now) cost ${PRIVATE_PAYMENT_FEE_PCT}% per transaction.
- Checkout: four designs per link (Classic, Split, Receipt, Card), in English, Spanish, Portuguese, French, German, Hindi and Chinese; no other site can frame the checkout pages.
- Testing: test keys create links on testnet, and their checkout says that no real funds move.
- Plugins: WooCommerce and Shopify plugins are coming soon.

## Pages

- [Overview](${pay("/")}): the gateway in one page
${pages.join("\n")}

## Other languages

Every page takes ?lang=: ${[
    ["Español", "es"],
    ["Português", "pt"],
    ["Français", "fr"],
    ["Deutsch", "de"],
    ["हिन्दी", "hi"],
    ["中文", "zh"],
  ]
    .map(([name, code]) => `[${name}](${pay("/", code)})`)
    .join(", ")}.

## Developers

- [Payments API and SDK docs](${docs}/): the index for LLMs is ${docs}/llms.txt
- [Payment intents API](${docs}/api/payment-intents/)
- [Payment links API](${docs}/api/payment-links/)
- [Webhooks](${docs}/sdk/server/webhooks/): events signed with HMAC-SHA256
- [Embed a payment](${docs}/embed/): a pay button or an embedded checkout from one script tag

## Optional

- [Cosmos Pay company site](${site}/) and its [plans](${pageUrl(site, "/pricing", "en")})
- [Terms and conditions](${site}/tos)
`;
}
