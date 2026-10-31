/* site-meta.ts: the company site's (cosmospay.lat) search titles, descriptions and breadcrumb
   names in its seven languages, and the languages each page's own text is written in.

   Search engines index every language of a page at its own address (?lang=, see
   src/lib/seo/lang-urls.ts), so each version needs its own <title> and description. These are
   search copy, not interface copy: the interface catalogs stay in src/lib/i18n/messages. /swaps
   takes its title and description from that catalog (swapsPage.metaTitle), since the page
   already ships them in every language. Pure, so tests/unit/seoSiteMeta.test.ts checks every
   language is complete. Titles separate with " | " and nothing here uses an em dash. */
import { LOCALES } from "@/lib/i18n/locales";

/** The company site's languages, in the language picker's order. */
export const SITE_LANGS: readonly string[] = LOCALES.map((l) => l.code);

export type SitePage = "home" | "pricing" | "swaps" | "tos";

export interface PageMeta {
  title: string;
  description: string;
}

/** The public path of each page of the company site. */
export const SITE_PAGE_PATHS: Record<SitePage, string> = { home: "/", pricing: "/pricing", swaps: "/swaps", tos: "/tos" };

/** The languages each page's own text is written in: its hreflang versions. The terms exist in
 *  English and Spanish only (src/pages/site/tos.astro); any other language shows the English text. */
export const PAGE_LANGS: Record<SitePage, readonly string[]> = {
  home: SITE_LANGS,
  pricing: SITE_LANGS,
  swaps: SITE_LANGS,
  tos: ["en", "es"],
};

/** The date the terms show as their last update (src/pages/site/tos.astro), also the sitemap's lastmod. */
export const TOS_LAST_UPDATED = "2026-10-09";

type MetaPage = Exclude<SitePage, "swaps">;
type Crumbs = Record<SitePage, string>;

const META: Record<string, Partial<Record<MetaPage, PageMeta>> & { crumbs: Crumbs }> = {
  en: {
    home: {
      title: "Cosmos Pay | Stablecoin payments on Stellar, Solana and Monad",
      description:
        "Non-custodial payments on Stellar, Solana and Monad: a REST API and TypeScript SDK, payment links, a hosted checkout, swaps, private payments and the Cosmos Pay Wallet.",
    },
    pricing: {
      title: "Pricing | Cosmos Pay",
      description:
        "Plans for Cosmos Pay's payments, swaps and private payments as a service on Stellar, Solana and Monad: the rate per payment and per swap on each plan, its limits and what it includes.",
    },
    tos: {
      title: "Terms and Conditions of Use | Cosmos Pay",
      description: "Cosmos Pay Terms and Conditions: crypto payment gateway and non-custodial wallet for Stellar, Solana and Monad.",
    },
    crumbs: { home: "Home", pricing: "Pricing", swaps: "Swaps", tos: "Terms" },
  },
  es: {
    home: {
      title: "Cosmos Pay | Pagos con stablecoins en Stellar, Solana y Monad",
      description:
        "Pagos no custodiales en Stellar, Solana y Monad: API REST y SDK para TypeScript, enlaces de pago, checkout alojado, swaps, pagos privados y la wallet Cosmos Pay.",
    },
    pricing: {
      title: "Precios | Cosmos Pay",
      description:
        "Planes de Cosmos Pay para pagos, swaps y pagos privados como servicio en Stellar, Solana y Monad: la tarifa por pago y por swap de cada plan, sus límites y lo que incluye.",
    },
    tos: {
      title: "Términos y Condiciones de Uso | Cosmos Pay",
      description: "Términos y Condiciones de Cosmos Pay: pasarela de pagos cripto y wallet no custodial para Stellar, Solana y Monad.",
    },
    crumbs: { home: "Inicio", pricing: "Precios", swaps: "Swaps", tos: "Términos" },
  },
  pt: {
    home: {
      title: "Cosmos Pay | Pagamentos com stablecoins na Stellar, Solana e Monad",
      description:
        "Pagamentos não custodiais na Stellar, Solana e Monad: API REST e SDK para TypeScript, links de pagamento, checkout hospedado, swaps, pagamentos privados e a carteira Cosmos Pay.",
    },
    pricing: {
      title: "Preços | Cosmos Pay",
      description:
        "Planos da Cosmos Pay para pagamentos, swaps e pagamentos privados como serviço na Stellar, Solana e Monad: a tarifa por pagamento e por swap de cada plano, seus limites e o que inclui.",
    },
    crumbs: { home: "Início", pricing: "Preços", swaps: "Swaps", tos: "Termos" },
  },
  fr: {
    home: {
      title: "Cosmos Pay | Paiements en stablecoins sur Stellar, Solana et Monad",
      description:
        "Paiements non custodiaux sur Stellar, Solana et Monad : API REST et SDK TypeScript, liens de paiement, checkout hébergé, swaps, paiements privés et le wallet Cosmos Pay.",
    },
    pricing: {
      title: "Tarifs | Cosmos Pay",
      description:
        "Les offres de Cosmos Pay pour les paiements, les swaps et les paiements privés en tant que service sur Stellar, Solana et Monad : le tarif par paiement et par swap de chaque offre, ses limites et ce qu’elle inclut.",
    },
    crumbs: { home: "Accueil", pricing: "Tarifs", swaps: "Swaps", tos: "Conditions" },
  },
  de: {
    home: {
      title: "Cosmos Pay | Stablecoin-Zahlungen auf Stellar, Solana und Monad",
      description:
        "Zahlungen ohne Verwahrung auf Stellar, Solana und Monad: REST-API und TypeScript-SDK, Zahlungslinks, gehosteter Checkout, Swaps, private Zahlungen und die Cosmos Pay Wallet.",
    },
    pricing: {
      title: "Preise | Cosmos Pay",
      description:
        "Die Tarife von Cosmos Pay für Zahlungen, Swaps und private Zahlungen als Service auf Stellar, Solana und Monad: der Satz pro Zahlung und pro Swap in jedem Tarif, seine Limits und was er enthält.",
    },
    crumbs: { home: "Startseite", pricing: "Preise", swaps: "Swaps", tos: "Bedingungen" },
  },
  hi: {
    home: {
      title: "Cosmos Pay | Stellar, Solana और Monad पर स्टेबलकॉइन भुगतान",
      description:
        "Stellar, Solana और Monad पर नॉन-कस्टोडियल भुगतान: REST API और TypeScript SDK, पेमेंट लिंक, होस्टेड चेकआउट, स्वैप, निजी भुगतान और Cosmos Pay वॉलेट।",
    },
    pricing: {
      title: "प्राइसिंग | Cosmos Pay",
      description:
        "Stellar, Solana और Monad पर सेवा के रूप में Cosmos Pay के भुगतान, स्वैप और निजी भुगतान के प्लान: हर प्लान में प्रति भुगतान और प्रति स्वैप दर, उसकी सीमाएँ और उसमें क्या शामिल है।",
    },
    crumbs: { home: "होम", pricing: "प्राइसिंग", swaps: "स्वैप", tos: "शर्तें" },
  },
  zh: {
    home: {
      title: "Cosmos Pay | 在 Stellar、Solana 和 Monad 上使用稳定币支付",
      description:
        "Stellar、Solana 和 Monad 上的非托管支付：REST API 和 TypeScript SDK、支付链接、托管收银台、兑换、隐私支付以及 Cosmos Pay 钱包。",
    },
    pricing: {
      title: "定价 | Cosmos Pay",
      description:
        "Cosmos Pay 在 Stellar、Solana 和 Monad 上以服务形式提供的支付、兑换和隐私支付套餐：每个套餐的单笔支付费率和兑换费率、限额及包含的内容。",
    },
    crumbs: { home: "首页", pricing: "定价", swaps: "兑换", tos: "条款" },
  },
};

/** A language the site ships, else English. */
export function siteLang(lang: string | null | undefined): string {
  return lang && SITE_LANGS.includes(lang) ? lang : "en";
}

/** The search title and description of a page in a language. A page whose text is not written
 *  in that language (the terms) keeps its English ones. Not for /swaps (its catalog has them). */
export function siteMeta(page: MetaPage, lang: string | null | undefined): PageMeta {
  return META[siteLang(lang)][page] ?? (META.en[page] as PageMeta);
}

/** The name a page goes by in its breadcrumb trail (the JSON-LD BreadcrumbList). */
export function crumbName(page: SitePage, lang: string | null | undefined): string {
  return META[siteLang(lang)].crumbs[page];
}
