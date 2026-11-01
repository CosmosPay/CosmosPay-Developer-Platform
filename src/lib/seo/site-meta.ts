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

/** The company site's languages, in the language picker's order. */
export const SITE_LANGS: readonly string[] = LOCALES.map((l) => l.code);

export type SitePage = "home" | "pricing" | "swaps" | "tos" | "about";

export interface PageMeta {
  title: string;
  description: string;
}

/** The public path of each page of the company site. */
export const SITE_PAGE_PATHS: Record<SitePage, string> = { home: "/", pricing: "/pricing", swaps: "/swaps", tos: "/tos", about: "/about" };

/** The languages each page's own text is written in: its hreflang versions. The terms exist in
 *  English and Spanish only (src/pages/site/tos.astro); any other language shows the English text. */
export const PAGE_LANGS: Record<SitePage, readonly string[]> = {
  home: SITE_LANGS,
  pricing: SITE_LANGS,
  swaps: SITE_LANGS,
  tos: TOS_LANGS,
  about: SITE_LANGS,
};

/** The date the terms show as their last update (src/pages/site/tos.astro), also the sitemap's lastmod. */
export const TOS_LAST_UPDATED = "2026-10-09";

type MetaPage = Exclude<SitePage, "swaps">;
type Crumbs = Record<SitePage, string>;

const META: Record<string, Partial<Record<MetaPage, PageMeta>> & { crumbs: Crumbs }> = {
  en: {
    pricing: {
      title: "Plans and pricing | Cosmos Pay",
      description:
        "Pay per payment, with no monthly fee on Starter: Cosmos Pay's rates for stablecoin payments, swaps and private payments on Stellar, Solana and Monad.",
    },
    tos: {
      title: "Terms and Conditions of Use | Cosmos Pay",
      description: "Cosmos Pay Terms and Conditions: crypto payment gateway and non-custodial wallet for Stellar, Solana and Monad.",
    },
    about: {
      title: "About Cosmos Pay | Stablecoin payments on Stellar, Solana, Monad",
      description:
        "Cosmos Pay builds a stablecoin payments API, a hosted checkout, swaps, private payments and a non-custodial wallet. Its code is public on GitHub.",
    },
    crumbs: { home: "Home", pricing: "Pricing", swaps: "Swaps", tos: "Terms", about: "About" },
  },
  es: {
    pricing: {
      title: "Precios | Cosmos Pay",
      description:
        "Un precio por pago, sin cuota mensual en Starter: las tarifas de Cosmos Pay para pagos en stablecoins, swaps y pagos privados en Stellar, Solana y Monad.",
    },
    tos: {
      title: "Términos y Condiciones de Uso | Cosmos Pay",
      description: "Términos y Condiciones de Cosmos Pay: pasarela de pagos cripto y wallet no custodial para Stellar, Solana y Monad.",
    },
    about: {
      title: "Sobre Cosmos Pay | Pagos en stablecoins en Stellar, Solana y Monad",
      description:
        "Cosmos Pay hace una API de pagos en stablecoins, un checkout alojado, swaps, pagos privados y una wallet sin custodia. Su código es público en GitHub.",
    },
    crumbs: { home: "Inicio", pricing: "Precios", swaps: "Swaps", tos: "Términos", about: "Acerca de" },
  },
  pt: {
    pricing: {
      title: "Preços | Cosmos Pay",
      description:
        "Por pagamento, sem mensalidade no Starter: as tarifas da Cosmos Pay para pagamentos em stablecoins, swaps e pagamentos privados na Stellar, Solana e Monad.",
    },
    about: {
      title: "Sobre a Cosmos Pay | Stablecoins na Stellar, Solana e Monad",
      description:
        "A Cosmos Pay faz uma API de pagamentos em stablecoins, checkout hospedado, swaps, pagamentos privados e carteira sem custódia, com código público no GitHub.",
    },
    crumbs: { home: "Início", pricing: "Preços", swaps: "Swaps", tos: "Termos", about: "Sobre" },
  },
  fr: {
    pricing: {
      title: "Tarifs | Cosmos Pay",
      description:
        "Payez par paiement, sans abonnement sur Starter : les tarifs Cosmos Pay des paiements en stablecoins, swaps et paiements privés sur Stellar, Solana et Monad.",
    },
    about: {
      title: "À propos de Cosmos Pay | Stablecoins sur Stellar, Solana et Monad",
      description:
        "API de paiement en stablecoins, checkout hébergé, swaps, paiements privés et wallet non dépositaire : ce que fait Cosmos Pay, avec son code public sur GitHub.",
    },
    crumbs: { home: "Accueil", pricing: "Tarifs", swaps: "Swaps", tos: "Conditions", about: "À propos" },
  },
  de: {
    pricing: {
      title: "Preise | Cosmos Pay",
      description:
        "Pro Zahlung bezahlen, ohne Grundgebühr bei Starter: Sätze von Cosmos Pay für Stablecoin-Zahlungen, Swaps und private Zahlungen auf Stellar, Solana und Monad.",
    },
    about: {
      title: "Über Cosmos Pay | Stablecoin-Zahlungen auf Stellar, Solana, Monad",
      description:
        "Stablecoin-Zahlungs-API, gehosteter Checkout, Swaps, private Zahlungen und eine nicht verwahrte Wallet: das baut Cosmos Pay, mit öffentlichem Code auf GitHub.",
    },
    crumbs: { home: "Startseite", pricing: "Preise", swaps: "Swaps", tos: "Bedingungen", about: "Über uns" },
  },
  hi: {
    pricing: {
      title: "प्राइसिंग | Cosmos Pay",
      description:
        "प्रति भुगतान दर, Starter पर कोई मासिक शुल्क नहीं: Stellar, Solana और Monad पर स्टेबलकॉइन भुगतान, स्वैप और निजी भुगतान के लिए Cosmos Pay की दरें।",
    },
    about: {
      title: "Cosmos Pay के बारे में | Stellar, Solana और Monad पर स्टेबलकॉइन",
      description:
        "Cosmos Pay स्टेबलकॉइन पेमेंट्स API, होस्टेड चेकआउट, स्वैप, निजी भुगतान और नॉन-कस्टोडियल वॉलेट बनाता है। उसका कोड GitHub पर सार्वजनिक है।",
    },
    crumbs: { home: "होम", pricing: "प्राइसिंग", swaps: "स्वैप", tos: "शर्तें", about: "हमारे बारे में" },
  },
  zh: {
    pricing: {
      title: "定价 | Cosmos Pay",
      description:
        "按笔付费，Starter 套餐无月费：Cosmos Pay 在 Stellar、Solana 和 Monad 上的稳定币支付、兑换和隐私支付费率。",
    },
    about: {
      title: "关于 Cosmos Pay | Stellar、Solana 和 Monad 上的稳定币支付",
      description:
        "Cosmos Pay 打造稳定币支付 API、托管收银台、兑换、隐私支付和非托管钱包，其代码在 GitHub 上公开。",
    },
    crumbs: { home: "首页", pricing: "定价", swaps: "兑换", tos: "条款", about: "关于我们" },
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
  // page it describes.
  if (page === "home") return (messages[code as keyof typeof messages] ?? messages.en).landing.meta;
  return META[code][page] ?? (META.en[page] as PageMeta);
}

/** The name a page goes by in its breadcrumb trail (the JSON-LD BreadcrumbList). */
export function crumbName(page: SitePage, lang: string | null | undefined): string {
  return META[siteLang(lang)].crumbs[page];
}
