/* landing-content.ts: what the payments landing's sections say and list, computed once per
   language from the copy (landing-i18n.ts), the guides (learn/), the plans (plans.ts) and the
   chains (chains.ts). Pure (no astro:env, no Vite assets), so the page components (through
   src/components/payments/landing/data.ts, which adds the links and the logo files) and the
   Markdown versions of the pages (src/lib/seo/payments-markdown.ts) read the same lists in the
   same order. Nothing in it is translated here: the words come from the catalogs. */
import { LANDING } from "@/lib/payments/landing-i18n";
import { LEARN } from "@/lib/payments/learn/index";
import { PLAN_SPECS, swapFeePct, ESCROW_FEE_PCT } from "@/lib/plans";
import { NETWORK_IDS, networkName } from "@/lib/chains";
import { networkLogo, tokenLogo } from "@/lib/token-logos";
import type { Locale } from "@/lib/payments/i18n";
import { SAMPLE_LINK_ID } from "@/lib/payments/integration-demo";

/** One name in the home's marquees: a brand file under public/media/brands (`file`, `dark` for
 *  the dark theme), an inline mark (`mark`), or a token's or network's logo from the generated
 *  manifest (`token`, `network`). `page` names the gateway page it leads to. */
export interface MarqueeItem {
  name: string;
  file?: string;
  dark?: string;
  mark?: "stellar" | "cosmos";
  token?: string;
  network?: string;
  page?: "stellar" | "solana" | "monad";
}

/* What customers pay with, as marquees. Official artwork only: the coins from
   cryptocurrency-icons, the wallets' own icons (Stellar Wallets Kit, the Solana wallet
   adapters), Monad and EURC from Trust Wallet's assets, Stellar's mark in currentColor so it
   follows the theme (Mark.astro), Cosmos from public/brand. Files in public/media/brands. */
const CHAIN_ROW: readonly MarqueeItem[] = [
  // The three networks lead to their own pages.
  { name: "Stellar", mark: "stellar", page: "stellar" },
  { name: "Solana", file: "sol.svg", page: "solana" },
  { name: "Monad", file: "monad.webp", page: "monad" },
  { name: "USDC", file: "usdc.svg" },
  { name: "EURC", file: "eurc.webp" },
  { name: "XLM", file: "xlm.svg" },
  { name: "SOL", file: "sol.svg" },
  { name: "MON", file: "monad.webp" },
];
/* The networks NEAR Intents swaps between (beyond the three a payment settles on) and the tokens
   people hold most there, each with its official logo (src/lib/token-logos.ts). */
const SETTLE = ["stellar", "solana", "monad"];
const SWAP_TOKENS = ["USDT", "USDT0", "DAI", "WBTC", "cbBTC"];
const SWAP_ROW: readonly MarqueeItem[] = [
  ...NETWORK_IDS.filter((id) => !SETTLE.includes(id) && networkLogo(id)).map((id) => ({ name: networkName(id), network: id })),
  ...SWAP_TOKENS.filter((sym) => tokenLogo(sym)).map((sym) => ({ name: sym, token: sym })),
];
/* The wallets row; the network pages show the logos of the wallets they name from it. */
const WALLET_ROW: readonly MarqueeItem[] = [
  { name: "Cosmos Pay Wallet", mark: "cosmos" },
  { name: "Freighter", file: "freighter.webp" },
  { name: "LOBSTR", file: "lobstr.webp" },
  { name: "xBull", file: "xbull.webp" },
  { name: "Albedo", file: "albedo.webp" },
  { name: "Rabet", file: "rabet.webp" },
  { name: "Phantom", file: "phantom.svg" },
  { name: "Solflare", file: "solflare.svg" },
  // Pollar's brand kit: the blue mark on light, the white one on dark (its icon mark only
  // ever appears with the name beside it, as the kit asks).
  { name: "Pollar", file: "pollar.webp", dark: "pollar-dark.webp" },
];

/** The plan names: product names, never translated. */
export const planName = (id: string): string => id[0].toUpperCase() + id.slice(1);

export function landingContent(lang: Locale) {
  const t = LANDING[lang];
  // The guides' words (src/lib/payments/learn/): the section bar names their hub, and the guide
  // pages and the guide links on other pages read the rest.
  const learn = LEARN[lang];
  const lowestRate = PLAN_SPECS.growth.perTx;

  // The snap's highlighter marks one phrase in the hero and in the final call; a closing full
  // stop stays outside the mark.
  const marked = (text: string) => {
    const [, words = text, stop = ""] = text.match(/^(.*?)([.!?。！？।]*)$/) ?? [];
    return { words, stop };
  };
  const heroMark = marked(t.hero.titleMark);
  const ctaMark = marked(t.cta.titleBold);

  const marqueeRows: { label: string; items: readonly MarqueeItem[] }[] = [
    { label: t.marks.chains, items: CHAIN_ROW },
    { label: t.marks.swaps, items: SWAP_ROW },
    { label: t.marks.wallets, items: WALLET_ROW },
  ];
  // Images (public/media/landing): the 3D renders are the clay set of 3dicons (CC0,
  // github.com/realvjy/3dicons); the use-case photos are CC0 photos from StockSnap, found through
  // Openverse (stores WP1KHDXGOY, services N14GO3XZE6, digital WKR3QXHW3U, donations YA3HZPUFYL);
  // the astronauts are the brand's own (public/brand). All decorative: the text says it all.
  // Where each use-case photo keeps its subject when cropped.
  const USE_PHOTO_FOCUS = { stores: "30% 50%", services: "50% 35%", digital: "78% 50%", donations: "35% 40%" } as const;
  // Each benefit with its 3D render and the mock-up that shows it (Mock.astro).
  const benefits = ([
    ["final", "final"],
    ["instant", "race"],
    ["escrow", "escrow"],
    ["yours", "balance"],
  ] as const).map(([key, mock]) => ({ key, mock, soon: key === "escrow", ...t.benefits[key] }));
  // The two ways a payment settles: straight to the merchant, or held in escrow until released.
  // Escrow is offered and priced but not built yet (no contract exists): it carries "coming soon"
  // (t.soon) wherever it shows, and its copy says so in every language.
  const settleModes = (["instant", "escrow"] as const).map((key) => ({ key, soon: key === "escrow", ...t.settle[key] }));
  // Protection on orders is escrow alone, so its row shows a clock instead of a check.
  const compareRows = (["chargebacks", "protection", "settlement", "hours", "borders", "custody", "fees"] as const).map((key) => {
    const row = t.compare.rows[key];
    return { ...row, soon: key === "protection", us: row.us.replace("{rate}", lowestRate) };
  });
  // The three ways to start, each with what it links to (data.ts turns `target` into the link).
  const pathKeys = [
    { key: "nocode", target: "create", mock: "link" },
    { key: "hosted", target: "integrations", mock: "checkout" },
    { key: "api", target: "docs", mock: "code" },
  ] as const;
  const stepMocks = ["step-create", "step-share", "step-pay", "step-confirm"] as const;
  const steps = (["create", "share", "pay", "confirm"] as const).map((key) => t.how[key]);
  // The snippets name the production origin whatever host renders the page.
  const PAY_ORIGIN = "https://payments.cosmospay.lat";
  const EMBED_TAG = `<script src="${PAY_ORIGIN}/embed/cosmos-pay.js" defer></script>`;
  const useCases = (["stores", "services", "digital", "donations"] as const).map((key) => ({ key, ...t.useCases[key] }));
  // The home shows the first four; /security shows them all. `report` links the domain's own
  // security.txt (src/lib/seo/well-known.ts, every domain), its label from the catalog.
  const security = ([
    ["onchain", "chain"],
    ["keys", "key"],
    ["framing", "frame"],
    ["environments", "layers"],
    ["webhooks", "webhook"],
    ["expiry", "clock"],
    ["docs", "book"],
    ["report", "check"],
  ] as const).map(([key, icon]) => {
    const fact = t.security[key] as { title: string; body: string; link?: string };
    return { icon, title: fact.title, body: fact.body, ...(fact.link && { link: { label: fact.link, href: "/.well-known/security.txt" } }) };
  });
  // Plan names are product names (untranslated); "Custom" and "$33/mo" are written out per language.
  const plans = (["starter", "essentials", "growth", "enterprise"] as const).map((id) => {
    const spec = PLAN_SPECS[id];
    const custom = spec.perTx === "Custom";
    const monthly = spec.price === spec.perTx ? t.pricing.free : `${spec.price.replace("/mo", "")} ${t.pricing.perMonth}`;
    return {
      id,
      name: planName(id),
      rate: custom ? t.pricing.custom : spec.perTx,
      unit: custom ? "" : t.pricing.perPayment,
      monthly: custom ? "" : monthly,
      swap: t.pricing.perSwap.replace("{rate}", swapFeePct(id)),
    };
  });
  // The fee calculator's plans: each rate parsed from plans.ts ("0.75% + 18¢"); Enterprise is custom.
  const calcPlans = (["starter", "essentials", "growth", "enterprise"] as const).map((id) => {
    const spec = PLAN_SPECS[id];
    const m = spec.perTx.match(/([\d.]+)%\s*\+\s*([\d.]+)¢/);
    const monthly = spec.price.endsWith("/mo") ? t.calc.perMonth.replace("{price}", spec.price.replace("/mo", "")) : "";
    return { id, name: planName(id), pct: m ? Number(m[1]) : null, cents: m ? Number(m[2]) : null, monthly };
  });
  const ESCROW_PCT = ESCROW_FEE_PCT;
  // "What is Cosmos Pay?" opens the list, so the home (its first four) and /faq both start with an
  // answer a reader or an AI answer can quote on its own.
  const faq = (["what", "wallet", "account", "wallets", "assets", "custody", "service", "escrow", "zk", "expiry", "refunds", "testing", "designs"] as const).map((key) => t.faq[key]);

  // Code samples are written indented like the code around them; this takes that indent off
  // every line after the first, so the page shows them flush left.
  const dedent = (src: string) => src.replace(/\n {2}/g, "\n");
  // The code the developers section shows, by tab. Plain text: it is not translated. The SDK and
  // webhook shapes are the real ones (@cosmosapp/pay_sdk's Client, the { id, type, createdAt, data }
  // envelope); values are examples.
  const SDK_CODE = dedent(`import { Client } from "@cosmosapp/pay_sdk";

  const client = new Client({ apiKey: process.env.COSMOS_PAY_API_KEY });
  const intent = await client.paymentIntents.createPay({
    destination: "G…YOUR_ACCOUNT",
    amount: "25",
  });
  // send your customer to the hosted checkout
  const checkoutUrl = "https://payments.cosmospay.lat/" + intent.id;`);
  const WEBHOOK_CODE = dedent(`{
    "id": "evt_01JB…",
    "type": "PAYMENT_INTENT_SUCCEEDED",
    "createdAt": "2026-10-24T22:36:56.000Z",
    "data": {
      "id": "cmh9a1…",
      "status": "SUCCEEDED",
      "amount": "25",
      "txHash": "6864…2e54"
    }
  }`);
  // The REST call.
  const CODE = dedent(`curl https://api.cosmospay.lat/cosmos-api/v1/payment-intents/pay \\
    -H "Authorization: Bearer $COSMOS_PAY_API_KEY" \\
    -H "Content-Type: application/json" \\
    -d '{
      "chain": "stellar",
      "destination": "G…YOUR_ACCOUNT",
      "amount": "25",
      "assetCode": "USDC",
      "assetIssuer": "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN",
      "msg": "Order #1001",
      "checkoutTheme": "ticket"
    }'`);
  const codeTabs = [
    { key: "curl", code: CODE, lang: "bash" },
    { key: "sdk", code: SDK_CODE, lang: "ts" },
    { key: "webhook", code: WEBHOOK_CODE, lang: "json" },
  ] as const;
  // Integration options, in the page's order. Every one but the plugins runs a demo on the page
  // (Integrations.astro); `code` is what a merchant pastes, with a sample link id to replace.
  const EMBED_SCRIPT = `<script defer
    src="${PAY_ORIGIN}/embed/cosmos-pay.js"></script>`;
  const LINK_NOTE = "<!-- link: your payment link's id, from the dashboard or the API -->";
  const integrations = [
    { key: "button", lang: "html", code: dedent(`${EMBED_SCRIPT}

  ${LINK_NOTE}
  <cosmos-pay-button
    link="${SAMPLE_LINK_ID}">
  </cosmos-pay-button>

  <script>
    document.querySelector("cosmos-pay-button")
      .addEventListener("cosmospay:paid", showThanks);
  </script>`) },
    { key: "embedded", lang: "html", code: dedent(`${EMBED_SCRIPT}

  ${LINK_NOTE}
  <cosmos-pay-checkout
    link="${SAMPLE_LINK_ID}"
    lang="${lang}" theme="auto">
  </cosmos-pay-checkout>

  <script>
    document.querySelector("cosmos-pay-checkout")
      .addEventListener("cosmospay:status", (event) => {
        console.log(event.detail.status); // PENDING, SUBMITTED, SUCCEEDED
      });
  </script>`) },
    { key: "hosted", lang: "html", code: dedent(`<!-- Send your customer to the hosted checkout. Its design
       (classic, split, ticket or card) is set on the link,
       in the dashboard or with the API (checkoutTheme). -->
  <a href="${PAY_ORIGIN}/${SAMPLE_LINK_ID}">
    Pay with Cosmos Pay
  </a>`) },
    { key: "links", lang: null, code: "" },
    { key: "api", lang: "ts", code: SDK_CODE },
    { key: "plugins", lang: null, code: "" },
  ] as const;
  return { lang, t, learn, lowestRate, marked, heroMark, ctaMark, marqueeRows, USE_PHOTO_FOCUS, benefits, settleModes, compareRows, pathKeys, stepMocks, steps, PAY_ORIGIN, EMBED_TAG, useCases, security, plans, calcPlans, ESCROW_PCT, faq, SDK_CODE, WEBHOOK_CODE, CODE, codeTabs, integrations, SAMPLE_LINK_ID };
}

export type LandingContent = ReturnType<typeof landingContent>;
