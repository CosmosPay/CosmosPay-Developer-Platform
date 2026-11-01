/* data.ts: what the payments landing's sections draw, computed once per language from the
   copy (landing-i18n.ts), the plans (plans.ts) and the shared links. Every section component
   (./sections) and every page built from them reads it through landingData(lang). Nothing in
   it is translated here: the words come from the catalog. */
import type Mark from "@/components/payments/landing/Mark.astro";
import type { ComponentProps } from "astro/types";
import { LANDING } from "@/lib/payments/landing-i18n";
import { PLAN_SPECS, swapFeePct, ESCROW_FEE_PCT } from "@/lib/plans";
import { DOCS, PRICING, loginTo } from "@/components/cosmos/lib/constants";
import { CONTACT_ADDRESS } from "@/lib/payments/contact";
import { NETWORK_IDS, networkName } from "@/lib/chains";
import { networkLogoUrl, tokenLogoUrl } from "@/lib/logo-urls";
import { MESSAGES, type Locale } from "@/lib/payments/i18n";
import { CHECKOUT_THEMES, themeThumbnail } from "@/lib/payments/checkout-themes";
import { DEMO_ASSETS, SAMPLE_LINK_ID } from "@/lib/payments/integration-demo";

/* "single" is the one long landing; "multi" spreads it over the home and the content pages
   (src/lib/payments/site-pages.ts), so links to a topic go to its page instead of an anchor. */
export type LandingLayout = "single" | "multi";

export function landingData(lang: Locale, layout: LandingLayout = "single") {
  const t = LANDING[lang];
  const links = layout === "multi"
    ? { integrations: "/integrations", swaps: "/swaps", useCases: "/use-cases", security: "/security", fees: "/fees", faq: "/faq" }
    : { integrations: "#integrations", swaps: "/swaps", useCases: "#pl-uses", security: "#pl-security", fees: "#pricing", faq: "#pl-faq" };

  const CREATE_LINK = loginTo("/dashboard?view=payments");
  const CONTACT = `mailto:${CONTACT_ADDRESS}`;
  const lowestRate = PLAN_SPECS.growth.perTx;

  // The snap's highlighter marks one phrase in the hero and in the final call; a closing full
  // stop stays outside the mark.
  const marked = (text: string) => {
    const [, words = text, stop = ""] = text.match(/^(.*?)([.!?。！？।]*)$/) ?? [];
    return { words, stop };
  };
  const heroMark = marked(t.hero.titleMark);
  const ctaMark = marked(t.cta.titleBold);

  // What customers pay with, as two marquees. Official artwork only: the coins from
  // cryptocurrency-icons, the wallets' own icons (Stellar Wallets Kit, the Solana wallet
  // adapters), Monad and EURC from Trust Wallet's assets, Stellar's mark in currentColor so it
  // follows the theme (Mark.astro), Cosmos from public/brand. Files in public/media/brands.
  type MarkName = ComponentProps<typeof Mark>["name"];
  type Brand = { name: string; src?: string; srcDark?: string; mark?: MarkName };
  const brand = (name: string, file: string, dark?: string): Brand => ({ name, src: `/media/brands/${file}`, srcDark: dark && `/media/brands/${dark}` });
  // The networks NEAR Intents swaps between (beyond the three a payment settles on) and the
  // tokens people hold most there, each with its official logo (src/lib/token-logos.ts).
  const SETTLE = ["stellar", "solana", "monad"];
  const SWAP_TOKENS = ["USDT", "USDT0", "DAI", "WBTC", "cbBTC"];
  const swapRow: Brand[] = [
    ...NETWORK_IDS.filter((id) => !SETTLE.includes(id) && networkLogoUrl(id)).map((id) => ({ name: networkName(id), src: networkLogoUrl(id) })),
    ...SWAP_TOKENS.filter((sym) => tokenLogoUrl(sym)).map((sym) => ({ name: sym, src: tokenLogoUrl(sym) })),
  ];
  const marquees: { label: string; items: Brand[] }[] = [
    {
      label: t.marks.chains,
      items: [
        { name: "Stellar", mark: "stellar" },
        brand("Solana", "sol.svg"),
        brand("Monad", "monad.webp"),
        brand("USDC", "usdc.svg"),
        brand("EURC", "eurc.webp"),
        brand("XLM", "xlm.svg"),
        brand("SOL", "sol.svg"),
        brand("MON", "monad.webp"),
      ],
    },
    { label: t.marks.swaps, items: swapRow },
    {
      label: t.marks.wallets,
      items: [
        { name: "Cosmos Wallet", mark: "cosmos" },
        brand("Freighter", "freighter.webp"),
        brand("LOBSTR", "lobstr.webp"),
        brand("xBull", "xbull.webp"),
        brand("Albedo", "albedo.webp"),
        brand("Rabet", "rabet.webp"),
        brand("Phantom", "phantom.svg"),
        brand("Solflare", "solflare.svg"),
        // Pollar's brand kit: the blue mark on light, the white one on dark (its icon mark only
        // ever appears with the name beside it, as the kit asks).
        brand("Pollar", "pollar.webp", "pollar-dark.webp"),
      ],
    },
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
  ] as const).map(([key, mock]) => ({ key, mock, ...t.benefits[key] }));
  // The two ways a payment settles: straight to the merchant, or held in escrow until released.
  const settleModes = (["instant", "escrow"] as const).map((key) => ({ key, ...t.settle[key] }));
  const compareRows = (["chargebacks", "protection", "settlement", "hours", "borders", "custody", "fees"] as const).map((key) => {
    const row = t.compare.rows[key];
    return { ...row, us: row.us.replace("{rate}", lowestRate) };
  });
  const paths = [
    { key: "nocode", href: CREATE_LINK, mock: "link" },
    { key: "hosted", href: links.integrations, mock: "checkout" },
    { key: "api", href: DOCS, mock: "code" },
  ] as const;
  const stepMocks = ["step-create", "step-share", "step-pay", "step-confirm"] as const;
  const steps = (["create", "share", "pay", "confirm"] as const).map((key) => t.how[key]);
  // The snippets name the production origin whatever host renders the page.
  const PAY_ORIGIN = "https://payments.cosmospay.lat";
  const EMBED_TAG = `<script src="${PAY_ORIGIN}/embed/cosmos-pay.js" defer></script>`;
  const useCases = (["stores", "services", "digital", "donations"] as const).map((key) => ({ key, ...t.useCases[key] }));
  const security = ([
    ["onchain", "chain"],
    ["keys", "key"],
    ["framing", "frame"],
    ["environments", "layers"],
    ["expiry", "clock"],
    ["docs", "book"],
  ] as const).map(([key, icon]) => ({ icon, ...t.security[key] }));
  // Plan names are product names (untranslated); "Custom" and "$33/mo" are written out per language.
  const plans = (["starter", "essentials", "growth", "enterprise"] as const).map((id) => {
    const spec = PLAN_SPECS[id];
    const custom = spec.perTx === "Custom";
    const monthly = spec.price === spec.perTx ? t.pricing.free : `${spec.price.replace("/mo", "")} ${t.pricing.perMonth}`;
    return {
      id,
      name: id[0].toUpperCase() + id.slice(1),
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
    return { id, name: id[0].toUpperCase() + id.slice(1), pct: m ? Number(m[1]) : null, cents: m ? Number(m[2]) : null, monthly };
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
  // The hosted checkout's demo: the four designs, each with its thumbnail and sample page.
  const designs = CHECKOUT_THEMES.map((id) => ({
    id,
    thumb: themeThumbnail(id),
    preview: `/preview/${id}?lang=${lang}`,
    ...MESSAGES[lang].designs[id],
  }));
  // The payment link demo draws what the payer sees with the checkout's own words.
  const checkoutCopy = MESSAGES[lang].checkout;
  const demoAssets = Object.keys(DEMO_ASSETS) as (keyof typeof DEMO_ASSETS)[];
  // Plugin platforms named on the "coming soon" card: their official glyphs (Simple Icons, CC0).
  const PLUGINS = [
    { name: "WooCommerce", path: "M.754 9.58a.754.754 0 00-.754.758v2.525c0 .42.339.758.758.758h3.135l1.431.799-.326-.799h2.373a.757.757 0 00.758-.758v-2.525a.757.757 0 00-.758-.758H.754zm2.709.445h.03c.065.001.124.023.179.067a.26.26 0 01.103.19.29.29 0 01-.033.16c-.13.239-.236.64-.322 1.199-.083.541-.114.965-.094 1.267a.392.392 0 01-.039.219.213.213 0 01-.176.12c-.086.006-.177-.034-.263-.124-.31-.316-.555-.788-.735-1.416-.216.425-.375.744-.478.957-.196.376-.363.568-.502.578-.09.007-.166-.069-.233-.228-.17-.436-.352-1.277-.548-2.524a.297.297 0 01.054-.222c.047-.064.116-.095.21-.102.169-.013.265.065.288.238.103.695.217 1.284.336 1.766l.727-1.387c.066-.126.15-.192.25-.199.146-.01.237.083.273.28.083.441.188.817.315 1.136.086-.844.233-1.453.44-1.828a.255.255 0 01.218-.147zm1.293.36c.056 0 .116.006.18.02.232.05.411.177.53.386.107.18.161.395.161.654 0 .343-.087.654-.26.94-.2.332-.459.5-.781.5a.88.88 0 01-.18-.022.763.763 0 01-.531-.384 1.287 1.287 0 01-.158-.659c0-.342.085-.655.258-.937.202-.333.462-.498.78-.498zm2.084 0c.056 0 .116.006.18.02.236.05.411.177.53.386.107.18.16.395.16.654 0 .343-.086.654-.259.94-.2.332-.459.5-.781.5a.88.88 0 01-.18-.022.763.763 0 01-.531-.384 1.287 1.287 0 01-.16-.659c0-.342.087-.655.26-.937.202-.333.462-.498.78-.498zm4.437.047c-.305 0-.546.102-.718.304-.173.203-.256.49-.256.856 0 .395.086.697.256.906.17.21.418.316.744.316.315 0 .559-.107.728-.316.17-.21.256-.504.256-.883s-.087-.673-.26-.879c-.176-.202-.424-.304-.75-.304zm-1.466.002a1.13 1.13 0 00-.84.326c-.223.22-.332.499-.332.838 0 .362.108.658.328.88.22.223.505.336.861.336.103 0 .22-.016.346-.052v-.54c-.117.034-.216.051-.303.051a.545.545 0 01-.422-.177c-.106-.12-.16-.278-.16-.48 0-.19.053-.348.156-.468a.498.498 0 01.397-.181c.103 0 .212.015.332.049v-.537a1.394 1.394 0 00-.363-.045zm12.414 0a1.135 1.135 0 00-.84.326c-.223.22-.332.499-.332.838 0 .362.108.658.328.88.22.223.506.336.861.336.103 0 .22-.016.346-.052v-.54c-.116.034-.216.051-.303.051a.545.545 0 01-.422-.177c-.106-.12-.16-.278-.16-.48 0-.19.053-.348.156-.468a.498.498 0 01.397-.181c.103 0 .212.015.332.049v-.537a1.394 1.394 0 00-.363-.045zm-9.598.06l-.29 2.264h.579l.156-1.559.395 1.559h.412l.379-1.555.164 1.555h.603l-.304-2.264h-.791l-.12.508c-.03.13-.06.264-.087.4l-.067.352a29.97 29.97 0 00-.258-1.26h-.771zm2.768 0l-.29 2.264h.579l.156-1.559.396 1.559h.412l.375-1.555.165 1.555h.603l-.305-2.264h-.789l-.119.508c-.03.13-.06.264-.086.4l-.066.352c-.063-.352-.15-.771-.26-1.26h-.771zm3.988 0v2.264h.611v-1.031h.012l.494 1.03h.645l-.489-1.019a.61.61 0 00.37-.552.598.598 0 00-.25-.506c-.167-.123-.394-.186-.68-.186h-.713zm3.377 0v2.264H24v-.483h-.63v-.414h.54v-.468h-.54v-.416h.626v-.483H22.76zm-4.793.004v2.264h1.24v-.483h-.627v-.416h.541v-.468h-.54v-.415h.622v-.482h-1.236zm2.025.432c.146.003.25.025.313.072.063.046.091.12.091.227 0 .156-.135.236-.404.24v-.54zm-15.22.011c-.104 0-.205.069-.301.211a1.078 1.078 0 00-.2.639c0 .096.02.2.06.303.049.13.117.198.196.215.083.016.173-.02.27-.106.123-.11.205-.273.252-.492.016-.077.023-.16.023-.246 0-.097-.02-.2-.06-.303-.05-.13-.116-.198-.196-.215a.246.246 0 00-.045-.006zm2.083 0c-.103 0-.204.069-.3.211a1.078 1.078 0 00-.2.639c0 .096.02.2.06.303.049.13.117.198.196.215.083.016.173-.02.27-.106.123-.11.205-.273.252-.492.013-.077.023-.16.023-.246 0-.097-.02-.2-.06-.303-.05-.13-.116-.198-.196-.215a.246.246 0 00-.045-.006zm4.428.006c.233 0 .354.218.354.66-.004.273-.038.46-.098.553a.293.293 0 01-.262.139.266.266 0 01-.242-.139c-.056-.093-.084-.28-.084-.562 0-.436.11-.65.332-.65Z" },
    { name: "Shopify", path: "M15.337 23.979l7.216-1.561s-2.604-17.613-2.625-17.73c-.018-.116-.114-.192-.211-.192s-1.929-.136-1.929-.136-1.275-1.274-1.439-1.411c-.045-.037-.075-.057-.121-.074l-.914 21.104h.023zM11.71 11.305s-.81-.424-1.774-.424c-1.447 0-1.504.906-1.504 1.141 0 1.232 3.24 1.715 3.24 4.629 0 2.295-1.44 3.76-3.406 3.76-2.354 0-3.54-1.465-3.54-1.465l.646-2.086s1.245 1.066 2.28 1.066c.675 0 .975-.545.975-.932 0-1.619-2.654-1.694-2.654-4.359-.034-2.237 1.571-4.416 4.827-4.416 1.257 0 1.875.361 1.875.361l-.945 2.715-.02.01zM11.17.83c.136 0 .271.038.405.135-.984.465-2.064 1.639-2.508 3.992-.656.213-1.293.405-1.889.578C7.697 3.75 8.951.84 11.17.84V.83zm1.235 2.949v.135c-.754.232-1.583.484-2.394.736.466-1.777 1.333-2.645 2.085-2.971.193.501.309 1.176.309 2.1zm.539-2.234c.694.074 1.141.867 1.429 1.755-.349.114-.735.231-1.158.366v-.252c0-.752-.096-1.371-.271-1.871v.002zm2.992 1.289c-.02 0-.06.021-.078.021s-.289.075-.714.21c-.423-1.233-1.176-2.37-2.508-2.37h-.115C12.135.209 11.669 0 11.265 0 8.159 0 6.675 3.877 6.21 5.846c-1.194.365-2.063.636-2.16.674-.675.213-.694.232-.772.87-.075.462-1.83 14.063-1.83 14.063L15.009 24l.927-21.166z" },
  ];
  return { lang, layout, links, DOCS, PRICING, t, CREATE_LINK, CONTACT, lowestRate, marked, heroMark, ctaMark, brand, marquees, USE_PHOTO_FOCUS, benefits, settleModes, compareRows, paths, stepMocks, steps, PAY_ORIGIN, EMBED_TAG, useCases, security, plans, calcPlans, ESCROW_PCT, faq, SDK_CODE, WEBHOOK_CODE, CODE, codeTabs, integrations, PLUGINS, designs, checkoutCopy, demoAssets, SAMPLE_LINK_ID };
}

export type LandingData = ReturnType<typeof landingData>;
