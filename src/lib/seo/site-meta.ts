/* site-meta.ts: the company site's (cosmospay.lat) search titles, descriptions and breadcrumb
   names in its seven languages, and the languages each page's own text is written in.

   Search engines index every language of a page at its own address (?lang=, see
   src/lib/seo/lang-urls.ts), so each version needs its own <title> and description. These are
   search copy, not interface copy: the interface catalogs stay in src/lib/i18n/messages. The home
   and /swaps take their title and description from that catalog (landing.meta,
   swapsPage.metaTitle), since those pages already ship them in every language. Pure, so
   tests/unit/seoSiteMeta.test.ts checks every language is complete. Titles separate with " | " and nothing here uses an em dash. */
import { LOCALES } from "@/lib/i18n/locales";
import { messages } from "@/lib/i18n/messages/index";
import { TOS_LANGS } from "@/lib/seo/lang-urls";
import { withNetworkCounts } from "@/lib/chains";

/** The company site's languages, in the language picker's order. */
export const SITE_LANGS: readonly string[] = LOCALES.map((l) => l.code);

export type SitePage = "home" | "pricing" | "swaps" | "tos" | "about" | "brand";

export interface PageMeta {
  title: string;
  description: string;
}

/** The public path of each page of the company site. */
export const SITE_PAGE_PATHS: Record<SitePage, string> = { home: "/", pricing: "/pricing", swaps: "/swaps", tos: "/tos", about: "/about", brand: "/brand" };

/** The languages each page's own text is written in: its hreflang versions. The terms exist in
 *  English and Spanish only (src/pages/site/tos.astro); any other language shows the English text. */
export const PAGE_LANGS: Record<SitePage, readonly string[]> = {
  home: SITE_LANGS,
  pricing: SITE_LANGS,
  swaps: SITE_LANGS,
  tos: TOS_LANGS,
  about: SITE_LANGS,
  brand: SITE_LANGS,
};

/** The date the terms show as their last update (src/pages/site/tos.astro), also the sitemap's lastmod. */
export const TOS_LAST_UPDATED = "2026-11-03";

type MetaPage = Exclude<SitePage, "swaps">;
type Crumbs = Record<SitePage, string>;

const META: Record<string, Partial<Record<MetaPage, PageMeta>> & { crumbs: Crumbs }> = {
  en: {
    pricing: {
      title: "Plans and pricing | Cosmos Pay",
      description:
        "Pay per payment, with no monthly fee on Starter: Cosmos Pay's rates for stablecoin payments, private payments and swaps across every network we reach.",
    },
    tos: {
      title: "Terms and Conditions of Use | Cosmos Pay",
      description: "Cosmos Pay Terms and Conditions: the crypto payment gateway, swaps across networks and the non-custodial wallet.",
    },
    about: {
      title: "About Cosmos Pay | Stablecoin payments and swaps",
      description:
        "Cosmos Pay builds a stablecoin payments API, a hosted checkout, swaps, private payments and a non-custodial wallet. Its code is public on GitHub.",
    },
    brand: {
      title: "Cosmos Pay brand assets | Logo, colours and typeface",
      description:
        "Download the Cosmos Pay logo, isotype, colours, typeface and astronaut illustrations in SVG and PNG, one by one or as a brand kit, and see how to use them.",
    },
    crumbs: { home: "Home", pricing: "Pricing", swaps: "Swaps", tos: "Terms", about: "About", brand: "Brand" },
  },
  es: {
    pricing: {
      title: "Precios | Cosmos Pay",
      description:
        "Un precio por pago, sin cuota mensual en Starter: las tarifas de Cosmos Pay para pagos en stablecoins, pagos privados y swaps en todas las redes que alcanzamos.",
    },
    tos: {
      title: "Términos y Condiciones de Uso | Cosmos Pay",
      description: "Términos y Condiciones de Cosmos Pay: la pasarela de pagos cripto, los swaps entre redes y la wallet no custodial.",
    },
    about: {
      title: "Sobre Cosmos Pay | Pagos en stablecoins y swaps",
      description:
        "Cosmos Pay hace una API de pagos en stablecoins, un checkout alojado, swaps, pagos privados y una wallet sin custodia. Su código es público en GitHub.",
    },
    brand: {
      title: "Recursos de marca de Cosmos Pay | Logo, colores y tipografía",
      description:
        "Descargá el logo, el isotipo, los colores, la tipografía y el astronauta de Cosmos Pay en SVG y PNG, uno por uno o en un kit de marca, y mirá cómo usarlos.",
    },
    crumbs: { home: "Inicio", pricing: "Precios", swaps: "Swaps", tos: "Términos", about: "Acerca de", brand: "Marca" },
  },
  pt: {
    pricing: {
      title: "Preços | Cosmos Pay",
      description:
        "Por pagamento, sem mensalidade no Starter: tarifas da Cosmos Pay para pagamentos em stablecoins, pagamentos privados e swaps em todas as redes que alcançamos.",
    },
    about: {
      title: "Sobre a Cosmos Pay | Pagamentos em stablecoins e swaps",
      description:
        "A Cosmos Pay faz uma API de pagamentos em stablecoins, checkout hospedado, swaps, pagamentos privados e carteira sem custódia, com código público no GitHub.",
    },
    brand: {
      title: "Recursos de marca da Cosmos Pay | Logo, cores e tipografia",
      description:
        "Baixe o logo, o isotipo, as cores, a tipografia e o astronauta da Cosmos Pay em SVG e PNG, um a um ou em um kit de marca, e veja como usá-los.",
    },
    crumbs: { home: "Início", pricing: "Preços", swaps: "Swaps", tos: "Termos", about: "Sobre", brand: "Marca" },
  },
  fr: {
    pricing: {
      title: "Tarifs | Cosmos Pay",
      description:
        "Payez par paiement, sans abonnement sur Starter : les tarifs Cosmos Pay des paiements en stablecoins, paiements privés et swaps sur tous les réseaux couverts.",
    },
    about: {
      title: "À propos de Cosmos Pay | Paiements en stablecoins et swaps",
      description:
        "API de paiement en stablecoins, checkout hébergé, swaps, paiements privés et wallet non dépositaire : ce que fait Cosmos Pay, avec son code public sur GitHub.",
    },
    brand: {
      title: "Ressources de marque Cosmos Pay | Logo, couleurs, police",
      description:
        "Téléchargez le logo, le symbole, les couleurs, la police et l’astronaute de Cosmos Pay en SVG et PNG, un par un ou en kit de marque, avec leur mode d’emploi.",
    },
    crumbs: { home: "Accueil", pricing: "Tarifs", swaps: "Swaps", tos: "Conditions", about: "À propos", brand: "Marque" },
  },
  de: {
    pricing: {
      title: "Preise | Cosmos Pay",
      description:
        "Pro Zahlung bezahlen, ohne Grundgebühr bei Starter: Sätze für Stablecoin-Zahlungen, private Zahlungen und Swaps in jedem Netzwerk, das Cosmos Pay erreicht.",
    },
    about: {
      title: "Über Cosmos Pay | Stablecoin-Zahlungen und Swaps",
      description:
        "Stablecoin-Zahlungs-API, gehosteter Checkout, Swaps, private Zahlungen und eine nicht verwahrte Wallet: das baut Cosmos Pay, mit öffentlichem Code auf GitHub.",
    },
    brand: {
      title: "Markenressourcen von Cosmos Pay | Logo, Farben, Schrift",
      description:
        "Laden Sie Logo, Bildmarke, Farben, Schrift und den Astronauten von Cosmos Pay als SVG und PNG herunter, einzeln oder als Markenkit, mit ihrer Verwendung.",
    },
    crumbs: { home: "Startseite", pricing: "Preise", swaps: "Swaps", tos: "Bedingungen", about: "Über uns", brand: "Marke" },
  },
  hi: {
    pricing: {
      title: "प्राइसिंग | Cosmos Pay",
      description:
        "प्रति भुगतान दर, Starter पर कोई मासिक शुल्क नहीं: स्टेबलकॉइन भुगतान, निजी भुगतान और हमारी पहुँच वाले हर नेटवर्क पर स्वैप के लिए Cosmos Pay की दरें।",
    },
    about: {
      title: "Cosmos Pay के बारे में | स्टेबलकॉइन भुगतान और स्वैप",
      description:
        "Cosmos Pay स्टेबलकॉइन पेमेंट्स API, होस्टेड चेकआउट, स्वैप, निजी भुगतान और नॉन-कस्टोडियल वॉलेट बनाता है। उसका कोड GitHub पर सार्वजनिक है।",
    },
    brand: {
      title: "Cosmos Pay ब्रांड एसेट्स | लोगो, रंग और टाइपफ़ेस",
      description:
        "Cosmos Pay का लोगो, आइसोटाइप, रंग, टाइपफ़ेस और अंतरिक्ष यात्री SVG और PNG में डाउनलोड करें, एक-एक करके या ब्रांड किट में, और उनका सही उपयोग देखें।",
    },
    crumbs: { home: "होम", pricing: "प्राइसिंग", swaps: "स्वैप", tos: "शर्तें", about: "हमारे बारे में", brand: "ब्रांड" },
  },
  zh: {
    pricing: {
      title: "定价 | Cosmos Pay",
      description:
        "按笔付费，Starter 套餐无月费：Cosmos Pay 的稳定币支付、隐私支付，以及在我们覆盖的所有网络之间兑换的费率。",
    },
    about: {
      title: "关于 Cosmos Pay | 稳定币支付与兑换",
      description:
        "Cosmos Pay 打造稳定币支付 API、托管收银台、兑换、隐私支付和非托管钱包，其代码在 GitHub 上公开。",
    },
    brand: {
      title: "Cosmos Pay 品牌资源 | 标志、颜色和字体",
      description:
        "下载 Cosmos Pay 的标志、图形标、颜色、字体和宇航员插画，SVG 和 PNG 格式，可单独下载或打包为品牌资源包，并了解使用方法。",
    },
    crumbs: { home: "首页", pricing: "定价", swaps: "兑换", tos: "条款", about: "关于我们", brand: "品牌" },
  },
};

/** A language the site ships, else English. */
export function siteLang(lang: string | null | undefined): string {
  return lang && SITE_LANGS.includes(lang) ? lang : "en";
}

/** The search title and description of a page in a language. A page whose text is not written
 *  in that language (the terms) keeps its English ones. Not for /swaps (its catalog has them). */
export function siteMeta(page: MetaPage, lang: string | null | undefined): PageMeta {
  const code = siteLang(lang);
  // The home's search copy is the landing's own (landing.meta in each catalog), written with the
  // page it describes. Its description counts the networks (`{n}`), filled here as /swaps fills its own.
  if (page === "home") {
    const { title, description } = (messages[code as keyof typeof messages] ?? messages.en).landing.meta;
    return { title, description: withNetworkCounts(description) };
  }
  return META[code][page] ?? (META.en[page] as PageMeta);
}

/** The name a page goes by in its breadcrumb trail (the JSON-LD BreadcrumbList). */
export function crumbName(page: SitePage, lang: string | null | undefined): string {
  return META[siteLang(lang)].crumbs[page];
}
