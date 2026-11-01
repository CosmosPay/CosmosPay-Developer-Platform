/* data.ts: what the payments landing's sections draw, per language. The words, the lists and the
   rates are landingContent (src/lib/payments/landing-content.ts, pure, which the Markdown versions
   of the pages read too); this adds what only a rendered page needs: the links in the page's
   language, the sign-in and docs addresses, and the logo files. Every section component
   (./sections) and every page built from them reads it through landingData(lang). Nothing in it
   is translated here: the words come from the catalog. */
import type Mark from "@/components/payments/landing/Mark.astro";
import type { ComponentProps } from "astro/types";
import { landingContent, type MarqueeItem } from "@/lib/payments/landing-content";
import { DOCS, PRICING, langHref, loginTo } from "@/components/cosmos/lib/constants";
import { CONTACT_ADDRESS } from "@/lib/payments/contact";
import { networkLogoUrl, tokenLogoUrl } from "@/lib/logo-urls";
import { MESSAGES, type Locale } from "@/lib/payments/i18n";
import { CHECKOUT_THEMES, themeThumbnail } from "@/lib/payments/checkout-themes";
import { DEMO_ASSETS } from "@/lib/payments/integration-demo";

/* "single" is the one long landing; "multi" spreads it over the home and the content pages
   (src/lib/payments/site-pages.ts), so links to a topic go to its page instead of an anchor. */
export type LandingLayout = "single" | "multi";

export function landingData(lang: Locale, layout: LandingLayout = "single") {
  const content = landingContent(lang);
  // Every link to a page of the gateway or the company site in the page's language: ?lang=<code>
  // on a page in another language than English (langHref, src/lib/seo/lang-urls.ts localizeHref),
  // so readers and crawlers stay in it. Sections that build a link of their own pass it here too.
  const href = (url: string): string => langHref(url, lang, "payments");
  const localized = <T extends Record<string, string>>(links: T): T =>
    Object.fromEntries(Object.entries(links).map(([key, url]) => [key, href(url)])) as T;
  const links = localized(
    layout === "multi"
      ? { integrations: "/integrations", swaps: "/swaps", useCases: "/use-cases", security: "/security", fees: "/fees", faq: "/faq" }
      : { integrations: "#integrations", swaps: "/swaps", useCases: "#pl-uses", security: "#pl-security", fees: "#pricing", faq: "#pl-faq" },
  );
  // Pages of their own in both layouts: the fee comparison, one page per network and the guides.
  const pageLinks = localized({ compare: "/compare", stellar: "/stellar", solana: "/solana", monad: "/monad", learn: "/learn" });

  const CREATE_LINK = loginTo("/dashboard?view=payments");
  const CONTACT = `mailto:${CONTACT_ADDRESS}`;

  // The marquees' names (landingContent) with their artwork: the brand files in
  // public/media/brands, the inline marks (Mark.astro), the manifest's token and network logos.
  type MarkName = ComponentProps<typeof Mark>["name"];
  type Brand = { name: string; src?: string; srcDark?: string; mark?: MarkName; href?: string };
  const brand = (name: string, file: string, dark?: string): Brand => ({ name, src: `/media/brands/${file}`, srcDark: dark && `/media/brands/${dark}` });
  const toBrand = (item: MarqueeItem): Brand => ({
    ...(item.file ? brand(item.name, item.file, item.dark) : { name: item.name }),
    ...(item.mark && { mark: item.mark }),
    ...(item.network && { src: networkLogoUrl(item.network) }),
    ...(item.token && { src: tokenLogoUrl(item.token) }),
    ...(item.page && { href: pageLinks[item.page] }),
  });
  const marquees: { label: string; items: Brand[] }[] = content.marqueeRows.map((row) => ({ label: row.label, items: row.items.map(toBrand) }));
  // The wallets row; the network pages show the logos of the wallets they name from it.
  const walletRow: Brand[] = marquees[2].items;
  // The three ways to start, each with its link.
  const TARGETS = { create: CREATE_LINK, integrations: links.integrations, docs: DOCS } as const;
  const paths = content.pathKeys.map((p) => ({ key: p.key, href: TARGETS[p.target], mock: p.mock }));
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
  return { ...content, layout, href, links, pageLinks, walletRow, DOCS, PRICING: href(PRICING), CREATE_LINK, CONTACT, brand, marquees, paths, PLUGINS, designs, checkoutCopy, demoAssets };
}

export type LandingData = ReturnType<typeof landingData>;
