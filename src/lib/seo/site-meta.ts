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
    pricing: {
      title: "Plans and pricing | Cosmos Pay",
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
    pricing: {
      title: "Preços | Cosmos Pay",
      description:
        "Planos da Cosmos Pay para pagamentos, swaps e pagamentos privados como serviço na Stellar, Solana e Monad: a tarifa por pagamento e por swap de cada plano, seus limites e o que inclui.",
    },
    crumbs: { home: "Início", pricing: "Preços", swaps: "Swaps", tos: "Termos" },
  },
  fr: {
    pricing: {
      title: "Tarifs | Cosmos Pay",
      description:
        "Les offres de Cosmos Pay pour les paiements, les swaps et les paiements privés en tant que service sur Stellar, Solana et Monad : le tarif par paiement et par swap de chaque offre, ses limites et ce qu’elle inclut.",
    },
    crumbs: { home: "Accueil", pricing: "Tarifs", swaps: "Swaps", tos: "Conditions" },
  },
  de: {
    pricing: {
      title: "Preise | Cosmos Pay",
      description:
        "Die Tarife von Cosmos Pay für Zahlungen, Swaps und private Zahlungen als Service auf Stellar, Solana und Monad: der Satz pro Zahlung und pro Swap in jedem Tarif, seine Limits und was er enthält.",
    },
    crumbs: { home: "Startseite", pricing: "Preise", swaps: "Swaps", tos: "Bedingungen" },
  },
  hi: {
    pricing: {
      title: "प्राइसिंग | Cosmos Pay",
      description:
        "Stellar, Solana और Monad पर सेवा के रूप में Cosmos Pay के भुगतान, स्वैप और निजी भुगतान के प्लान: हर प्लान में प्रति भुगतान और प्रति स्वैप दर, उसकी सीमाएँ और उसमें क्या शामिल है।",
    },
    crumbs: { home: "होम", pricing: "प्राइसिंग", swaps: "स्वैप", tos: "शर्तें" },
  },
  zh: {
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
