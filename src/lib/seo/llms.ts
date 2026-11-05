/* llms.ts: /llms.txt (https://llmstxt.org) for the company site and the payments gateway: a short
   Markdown fact sheet with the links an assistant or a coding agent should read first. The
   platform's own index of the documentation is /docs/llms.txt, so the platform domain answers
   /llms.txt with a redirect there (src/pages/llms.txt.ts).

   Every fact here is stated by the product's own copy or code: the rates come from
   src/lib/plans.ts at request time, so the file can never quote another price than the pages; the
   rest mirrors the gateway's copy (src/lib/payments/landing-i18n.ts), the docs and
   src/pages/site/tos.astro. Protected payments are available (product owner, 2026-11-03): no line
   labels them "coming soon". Every link to a page in English is its bare address (English has no
   ?lang=: src/lib/seo/lang-urls.ts). No em dashes. Pure, so tests/unit/seoLlms.test.ts covers it. */
import { PROTECTED_PAYMENT_FEE_PCT, PLAN_IDS, PLAN_SPECS, PRIVATE_PAYMENT_FEE_PCT, swapFeePct } from "@/lib/plans";
import { LEARN_PAGES, PAYMENTS_PAGES, isLearnPage, pagePath, type PaymentsPage } from "@/lib/payments/site-pages";
import { NETWORK_IDS } from "@/lib/chains";
import { pageUrl } from "@/lib/seo/lang-urls";
import { markdownUrl } from "@/lib/seo/markdown-urls";
import { GITHUB_ORG, SDK_NPM, SDK_PACKAGE, WALLET_RELEASES } from "@/lib/seo/schema";
import { AGENT_SKILLS_INDEX_PATH, COSMOS_PAY_SKILL_REPO } from "@/lib/seo/agent-skills";

export interface LlmsInput {
  site: string;
  dev: string;
  payments: string;
  /** The web wallet (with its trailing slash) and its Chrome Web Store listing. */
  wallet: { webApp: string; chromeStore: string };
  /** The company's public profiles (name → URL), in the order to list them. */
  profiles: Record<string, string>;
}

/** The company's one-paragraph summary: the quote under the H1 of its llms.txt and llms-full.txt. */
export const SITE_SUMMARY =
  `Cosmos Pay runs non-custodial payments, swaps, a payment gateway and private payments as a service on ${NETWORK_IDS.length} networks. Developers and businesses use one REST API and a JavaScript and TypeScript SDK to accept stablecoin payments through payment links, a hosted checkout and signed webhooks. Cosmos Pay (cosmospay.lat) is a different project from the Cosmos Network (ATOM) and from BitCanna's CosmosPay payment plugins.`;

/** The gateway's one-paragraph summary, under the H1 of its llms.txt and llms-full.txt. */
export function paymentsSummary(site: string): string {
  return `Cosmos Pay Payments lets businesses accept stablecoins such as USDC and EURC on ${NETWORK_IDS.length} networks, through payment links, a hosted checkout and a payments API. Customers pay from their own wallet, and the funds settle to an address the business controls, instantly or as a protected payment held in a smart contract until the order is delivered. Made by Cosmos Pay (${site}/) for businesses in Latin America and beyond. Cosmos Pay is a different project from the Cosmos Network (ATOM) and from BitCanna's CosmosPay payment plugins.`;
}

/** The Markdown versions of a host's pages, for its llms.txt: every page in one file, and each at
 *  its own address with `.md` (src/lib/seo/markdown-urls.ts). */
function markdownSection(origin: string, example: string): string {
  return `## Markdown

- [Every page of this site in one file](${origin}/llms-full.txt): the English text of each page linked here on ${new URL(origin).host}, under its title and address
- Each page is also Markdown at its own address with .md (${markdownUrl(origin, example)}; the home is ${markdownUrl(origin, "/")}), in every language it is written in (${markdownUrl(origin, example, "es")})`;
}

/** The line linking a host's /auth.md (src/lib/seo/auth-md.ts). */
const authLine = (origin: string): string =>
  `- [Authentication for AI agents](${origin}/auth.md): an API key a person creates in the dashboard, or the shared public key for the operations open without an account; there is no OAuth flow for agents`;

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
  swaps: ["Swaps", `swap tokens across ${NETWORK_IDS.length} networks and send USDT0 from Stellar, with no account`],
  "use-cases": ["Use cases", "how stores, services, digital products and creators take stablecoins, compared with cards and bank transfers"],
  security: ["Security", "on-chain verification, keys that stay with their owner, checkout pages no other site can frame"],
  fees: ["Pricing and fees", "the rate per payment on each plan and a fee estimator"],
  faq: ["FAQ", "wallets, protected payments, refunds, testing and fees"],
  compare: ["Fees compared", "each Cosmos Pay rate next to the published rate it is set against (BitPay, MetaMask, RAILGUN, Escrow.com), with sources and the date they were read"],
  stellar: ["Stellar payments", "SEP-7 payment links, the Stellar assets with a preset, the wallets that pay, the API request and questions"],
  solana: ["Solana payments", "Solana Pay links, USDC and SOL presets, the wallets that pay, the API request and questions"],
  monad: ["Monad payments", "EIP-681 links to a deposit address per payment, USDC and MON presets, the API request and questions"],
  learn: ["Guides", "the gateway's guides to accepting stablecoin payments"],
  "learn/accept-usdc-payments": ["How to accept USDC payments online", "a payment link, the hosted checkout or the API; what the merchant and the payer need; testing on a test network first"],
  "learn/whatsapp-payment-links": ["Payment links on WhatsApp", "create a payment link in the dashboard, send it in a chat or as a printed QR code, and see when it is paid"],
  "learn/stablecoin-payment-gateway": ["What is a stablecoin payment gateway?", "stablecoins, settlement to the merchant's own address, network fees, custodial and non-custodial gateways"],
  "learn/stellar-vs-solana-vs-monad": ["Stellar vs Solana vs Monad for accepting payments", "the three networks payments settle on, compared as Cosmos Pay supports them: link standard, matching, assets with a preset, test networks, fees"],
  "learn/accept-usdc-with-solana-pay": ["How to accept USDC with Solana Pay links", "Solana Pay transfer requests matched by a reference key per link, testing on Devnet, the API request and confirming each payment"],
  "learn/confirm-stablecoin-payments": ["How to confirm a stablecoin payment on your server", "signed webhooks (X-Cosmos-Signature, HMAC-SHA256), retries and redelivery, handling each event once, and checking a payment yourself"],
  "learn/usdt0-from-stellar": ["How to send USDT0 from Stellar to EVM networks", "21 routes, fees in XLM, about 27 minutes to deliver, and each step from quote to delivery"],
  "learn/accept-usdc-on-stellar": ["How to accept USDC on Stellar with SEP-7 links", "SEP-7 links matched by a memo per link, the USDC trustline the receiving account needs, testing on Testnet and the API request"],
  "learn/accept-usdc-on-monad": ["How to accept USDC on Monad with EIP-681 links", "EIP-681 links to a deposit address per payment that can only forward to the merchant, the relay fee, required amounts and testing"],
  "learn/crypto-payment-button": ["How to add a crypto pay button or checkout to your website", "the embed script, the cosmos-pay-button and cosmos-pay-checkout elements and their attributes, events, CSP and confirming by webhook"],
  "learn/cross-chain-swaps": [`How to swap tokens across ${NETWORK_IDS.length} networks`, `cross-chain swaps across ${NETWORK_IDS.length} networks: quote, deposit address, deadline, refunds, plan commission and where to swap`],
  "learn/crypto-donations": ["How to accept crypto donations with an open amount", "open-amount links on Stellar and Solana, one donation per link, reading the donated amount on-chain, and a Donate button on your site"],
};

/** /llms.txt of the company site (cosmospay.lat). */
export function siteLlmsTxt({ site, dev, payments, wallet, profiles }: LlmsInput): string {
  const docs = `${dev}/docs`;
  const pay = (path: string) => pageUrl(payments, path);
  const line = (p: PaymentsPage) => `- [${PAGE_LABELS[p][0]}](${pay(pagePath(p))}): ${PAGE_LABELS[p][1]}`;
  const gateway = PAYMENTS_PAGES.filter((p) => !isLearnPage(p)).map(line);
  return `# Cosmos Pay

> ${SITE_SUMMARY}

Key facts:

- Chains: Stellar (SEP-7 payment links), Solana (Solana Pay links) and Monad (EIP-681 links).
- Non-custodial: Cosmos Pay stores no one's keys and never holds a payment. With instant settlement, on Stellar and Solana the payer pays the merchant's address directly; on Monad each payment goes to a deposit address made for it, which can only forward it to the merchant's address (less the relay's fee): Cosmos Pay holds no key to it.
- Swaps: Cosmos Pay never holds the funds. A swap on one network is one transaction the person's wallet signs; a swap between networks waits at a deposit address made for it until it settles or is refunded; USDT0 travels through its own bridge.
- Settlement: instant (about 5 seconds on Stellar), or a protected payment: the funds are held in a smart contract until delivery is confirmed, then released to the merchant's wallet. The merchant sets a delivery deadline; when it passes, the payment goes to review or is refunded or released automatically, as the merchant chooses. A protected payment waits in the smart contract, never with Cosmos Pay.
- No chargebacks: a confirmed payment is final. A refund is a payment the merchant sends back from their wallet.
- Testing: API keys starting with dv_ run on testnet and prod_ keys on mainnet. The key decides the network, not the code.
- Rates per payment: ${paymentRates()}. Protected payments add ${PROTECTED_PAYMENT_FEE_PCT}% per payment. Private payments (the amount hidden on-chain behind a zero-knowledge proof, on testnet for now) cost ${PRIVATE_PAYMENT_FEE_PCT}% per transaction. The payer's wallet pays the network fee.
- Swap commission: ${swapRates()}; ${swapFeePct("community")} without an account.
- Payer wallets: any wallet that opens standard payment links (SEP-7, Solana Pay, EIP-681), such as Freighter, xBull, Rabet, LOBSTR, Albedo, Cosmos Pay Wallet, Phantom, Solflare or any EVM wallet; a payer whose funds are on any of the ${NETWORK_IDS.length} networks swaps them in first.

## Accept payments

- [Cosmos Pay Payments](${pay("/")}): payment links, a hosted checkout and a payments API to accept stablecoins on ${NETWORK_IDS.length} networks
${gateway.filter((l) => !l.startsWith("- [Swaps]")).join("\n")}
- [Plans](${pageUrl(site, "/pricing")}): every plan's rates, limits and features

## Swaps

- [Swaps](${pay("/swaps")}): ${PAGE_LABELS.swaps[1]}

## Guides

${LEARN_PAGES.map(line).join("\n")}

${markdownSection(site, "/pricing")}

## Developers

- [Documentation](${docs}/): SDK guides and the Payments REST API reference
- [Docs index for LLMs](${docs}/llms.txt): every docs page with its description
- [Full docs as one file](${docs}/llms-full.txt), or in two parts: [guides and SDK](${docs}/llms-sdk.txt) and [REST API reference](${docs}/llms-api.txt)
- [Getting started](${docs}/getting-started/): how a payment works and the two ways to integrate
- [Get an API key](${docs}/api-keys/): its environment picks testnet or mainnet, its scopes what it may call
${authLine(site)}
- [Server SDK quickstart](${docs}/sdk/server/quickstart/): create a payment intent, complete it in the wallet, validate it
- [Payments REST API reference](${docs}/api/): payment intents, payment links, webhooks, products, customers, swaps, on-ramp and off-ramp
- [OpenAPI document](${docs}/openapi.json): the Payments REST API's contract
- [Webhooks](${docs}/sdk/server/webhooks/): events signed with HMAC-SHA256
- [Embed a payment](${docs}/embed/): a pay button or an embedded checkout from one script tag
- [Using the docs with AI](${docs}/ai/)
- [Cosmos Pay agent skill](${COSMOS_PAY_SKILL_REPO}): a SKILL.md for coding agents that integrate Cosmos Pay, listed in the [agent skills index](${site}${AGENT_SKILLS_INDEX_PATH})
- [SDK on npm: ${SDK_PACKAGE}](${SDK_NPM}): \`npm i ${SDK_PACKAGE}\` (Node.js 18 or later); browser entry point \`${SDK_PACKAGE}/web\`
- [Source code on GitHub](${GITHUB_ORG})

## Cosmos Pay Wallet

- [Web app](${wallet.webApp}): non-custodial wallet for the ${NETWORK_IDS.length} networks Cosmos Pay works with; keys are generated and encrypted on the device
- [Chrome extension](${wallet.chromeStore})
- [Android, Windows, macOS, Linux and Firefox builds](${WALLET_RELEASES})

## Company

- [About Cosmos Pay](${pageUrl(site, "/about")}): what Cosmos Pay makes and on which networks, its public code on GitHub, the SDK on npm and how to reach the team
- Contact: organization@cosmospay.lat

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
  const pay = (path: string, lang?: string) => pageUrl(payments, path, lang);
  const line = (p: PaymentsPage) => `- [${PAGE_LABELS[p][0]}](${pay(pagePath(p))}): ${PAGE_LABELS[p][1]}`;
  const pages = PAYMENTS_PAGES.filter((p) => !isLearnPage(p)).map(line);
  return `# Cosmos Pay Payments

> ${paymentsSummary(site)}

How a payment works:

1. Create a payment link in the dashboard, or a payment intent from your server.
2. Send the link or show its QR code. The checkout shows the amount, the network and a countdown.
3. The customer pays from their own wallet, on any of the ${NETWORK_IDS.length} networks.
4. The payment is verified on-chain, the checkout turns to Paid and a signed webhook fires.

Facts:

- Settlement: instant (about 5 seconds on Stellar), or a protected payment (+${PROTECTED_PAYMENT_FEE_PCT}% per payment): the funds are held in a smart contract until delivery is confirmed, then released to your wallet.
- Cosmos Pay does not hold the money: on Stellar and Solana the payer pays your address directly; on Monad each payment goes to a deposit address made for it, which can only forward it to your address (less the relay's fee): Cosmos Pay holds no key to it.
- No chargebacks. Refunds are payments you send from your wallet.
- Rates per payment: ${paymentRates()}. The payer's wallet pays the network fee; on Monad the deposit relay's fee is deducted and shown on the checkout. Private payments (amount hidden on-chain, testnet for now) cost ${PRIVATE_PAYMENT_FEE_PCT}% per transaction.
- Checkout: four designs per link (Classic, Split, Receipt, Card), in English, Spanish, Portuguese, French, German, Hindi and Chinese; no other site can frame the checkout pages.
- Testing: test keys create links on testnet, and their checkout says that no real funds move.
- Plugins: WooCommerce and Shopify plugins are coming soon.

## Pages

- [Overview](${pay("/")}): the gateway in one page
${pages.join("\n")}

## Guides

${LEARN_PAGES.map(line).join("\n")}

## Other languages

Each page above is in English; every other language is the same address with ?lang=: ${[
    ["Español", "es"],
    ["Português", "pt"],
    ["Français", "fr"],
    ["Deutsch", "de"],
    ["हिन्दी", "hi"],
    ["中文", "zh"],
  ]
    .map(([name, code]) => `[${name}](${pay("/", code)})`)
    .join(", ")}.

${markdownSection(payments, "/faq")}

## Developers

- [Payments API and SDK docs](${docs}/): the index for LLMs is ${docs}/llms.txt
${authLine(payments)}
- [Payment intents API](${docs}/api/payment-intents/)
- [Payment links API](${docs}/api/payment-links/)
- [Webhooks](${docs}/sdk/server/webhooks/): events signed with HMAC-SHA256
- [Embed a payment](${docs}/embed/): a pay button or an embedded checkout from one script tag

## Optional

- [Cosmos Pay company site](${site}/), its [plans](${pageUrl(site, "/pricing")}) and [about page](${pageUrl(site, "/about")})
- [Terms and conditions](${site}/tos)
`;
}
