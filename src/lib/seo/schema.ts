/* schema.ts: the schema.org (JSON-LD) nodes the public pages publish, as pure builders.

   One Organization entity for the whole company (`<site>/#organization`), defined the same way
   on every host that names it (src/lib/seo/org.ts builds it with the configured origins), so
   search engines and assistants resolve one company instead of two. Each page adds its WebSite,
   its WebPage and, where it applies, a breadcrumb trail and what the page is about. Only what the
   source states: no ratings, reviews, prices or claims that the pages and src/lib/plans.ts do not
   carry. Pure (no astro:env), so tests/unit/seoSchema.test.ts covers it. */
import { PLAN_IDS, PLAN_SPECS, type PlanId } from "@/lib/plans";
import { CONTACT_ADDRESS } from "@/lib/payments/contact";

export type JsonLdNode = Record<string, unknown>;

/** The GitHub organization (the SDK, the wallet's releases and the docs' sources live there). */
export const GITHUB_ORG = "https://github.com/CosmosPay";
export const SDK_PACKAGE = "@cosmosapp/pay_sdk";
export const SDK_NPM = "https://www.npmjs.com/package/@cosmosapp/pay_sdk";
export const SDK_REPO = "https://github.com/CosmosPay/CosmosJS_SDK";
export const WALLET_RELEASES = "https://github.com/CosmosPay/CosmosPay-Wallet/releases";

/** A Chrome Web Store listing by its extension id alone: the store redirects it to the current
 *  name, so the link survives a rename and carries no interface language (`?hl=es`). */
export function chromeStoreListing(url: string): string {
  const id = new URL(url).pathname.split("/").filter(Boolean).at(-1);
  return id && /^[a-p]{32}$/.test(id) ? `https://chromewebstore.google.com/detail/${id}` : url;
}

const ORG_DESCRIPTION =
  "Cosmos Pay runs non-custodial payments, swaps, a payment gateway and private payments as a service on Stellar, Solana and Monad: a payments REST API, a JavaScript and TypeScript SDK, payment links with a hosted checkout, and the Cosmos Pay Wallet.";

export const orgId = (site: string): string => `${site}/#organization`;
export const websiteId = (origin: string): string => `${origin}/#website`;

/** A chat link (wa.me) is a way to reach the company, not a profile of it: sameAs leaves it out. */
const CONTACT_CHANNEL = /^https?:\/\/(wa\.me|api\.whatsapp\.com|chat\.whatsapp\.com)\//i;

/** The company's public profiles for `sameAs`: the footer's social profiles (src/components/cosmos/lib/constants.ts
 *  SOCIAL) without the chat links, plus the GitHub organization and the SDK on npm. */
export function sameAsProfiles(social: Record<string, string>): string[] {
  return [...new Set([...Object.values(social).filter((url) => !CONTACT_CHANNEL.test(url)), GITHUB_ORG, SDK_NPM])];
}

/** The one Organization node, the same on cosmospay.lat and payments.cosmospay.lat. */
export function organizationNode(site: string, sameAs: string[]): JsonLdNode {
  const logo = `${site}/android-chrome-512x512.png`;
  return {
    "@type": "Organization",
    "@id": orgId(site),
    name: "Cosmos Pay",
    alternateName: "CosmosPay",
    url: `${site}/`,
    logo: { "@type": "ImageObject", "@id": `${site}/#logo`, url: logo, contentUrl: logo, width: 512, height: 512, caption: "Cosmos Pay" },
    image: { "@id": `${site}/#logo` },
    description: ORG_DESCRIPTION,
    disambiguatingDescription: "The payments company at cosmospay.lat, working on Stellar, Solana and Monad; not the Cosmos Network (ATOM) blockchain.",
    email: CONTACT_ADDRESS,
    // The country only, as /about states it (its public source: the GitHub organization's
    // location). Product owner, 2026-11-01. No street, city or legal name until they provide them.
    address: { "@type": "PostalAddress", addressCountry: "AR" },
    contactPoint: [{ "@type": "ContactPoint", contactType: "customer support", email: CONTACT_ADDRESS, availableLanguage: ["en", "es"] }],
    sameAs,
  };
}

export interface WebSiteInput {
  origin: string;
  name: string;
  site: string;
  langs: readonly string[];
  description?: string;
}

export function webSiteNode({ origin, name, site, langs, description }: WebSiteInput): JsonLdNode {
  return {
    "@type": "WebSite",
    "@id": websiteId(origin),
    url: `${origin}/`,
    name,
    ...(description && { description }),
    inLanguage: [...langs],
    publisher: { "@id": orgId(site) },
  };
}

export interface Crumb {
  name: string;
  url: string;
}

export interface WebPageInput {
  /** The canonical URL of the version shown (the bare path in English, ?lang= otherwise). */
  url: string;
  name: string;
  description?: string;
  lang: string;
  /** The WebSite it belongs to (its origin). */
  origin: string;
  /** schema.org types; "WebPage" unless the page is something more specific as well. */
  types?: string[];
  /** The trail above this page, this page last; gives the page a BreadcrumbList. */
  breadcrumb?: Crumb[];
  /** Nodes the page is about or mainly shows (by @id). */
  about?: string;
  mainEntity?: string | JsonLdNode | JsonLdNode[];
  /** The page's share image (absolute). */
  image?: { url: string; width: number; height: number };
  /** When the page last changed (ISO): the date it states, else its sources' last commit
   *  (src/lib/seo/page-dates.ts). */
  dateModified?: string | null;
}

/** The page itself and, when it has one, its breadcrumb trail. */
export function webPageNodes(p: WebPageInput): JsonLdNode[] {
  const id = `${p.url}#webpage`;
  const types = p.types && p.types.length ? p.types : ["WebPage"];
  const page: JsonLdNode = {
    "@type": types.length === 1 ? types[0] : types,
    "@id": id,
    url: p.url,
    name: p.name,
    ...(p.description && { description: p.description }),
    inLanguage: p.lang,
    isPartOf: { "@id": websiteId(p.origin) },
    ...(p.about && { about: { "@id": p.about } }),
    ...(p.breadcrumb && p.breadcrumb.length > 1 && { breadcrumb: { "@id": `${p.url}#breadcrumb` } }),
    ...(p.mainEntity && { mainEntity: typeof p.mainEntity === "string" ? { "@id": p.mainEntity } : p.mainEntity }),
    ...(p.image && { primaryImageOfPage: { "@type": "ImageObject", url: p.image.url, width: p.image.width, height: p.image.height } }),
    ...(p.dateModified && { dateModified: p.dateModified }),
  };
  const nodes = [page];
  if (p.breadcrumb && p.breadcrumb.length > 1) {
    nodes.push({
      "@type": "BreadcrumbList",
      "@id": `${p.url}#breadcrumb`,
      itemListElement: p.breadcrumb.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: c.url })),
    });
  }
  return nodes;
}

/** A plan's fixed monthly price in US dollars ("$33/mo" → 33); null for a plan billed only per
 *  transaction (Starter) or priced per customer (Enterprise), which state no monthly price. */
export function monthlyPrice(price: string): number | null {
  const match = /^\$(\d+(?:\.\d+)?)\/mo$/.exec(price.trim());
  return match ? Number(match[1]) : null;
}

/** A plan billed only per payment, with no monthly fee (Starter: its price tag IS its rate). */
export function perPaymentOnly(spec: { price: string; perTx: string }): boolean {
  return spec.price === spec.perTx && /%/.test(spec.perTx);
}

const planName = (id: PlanId): string => id.charAt(0).toUpperCase() + id.slice(1);

/* A monthly price as schema.org states one: so much per one month. */
const perMonth = (price: number, description: string): JsonLdNode => ({
  "@type": "UnitPriceSpecification",
  price,
  priceCurrency: "USD",
  referenceQuantity: { "@type": "QuantitativeValue", value: 1, unitCode: "MON" },
  description,
});

/** The offered plans that state a price, as Offers, from src/lib/plans.ts so the markup can never
 *  quote another price than the page: a plan with a monthly fee at that fee, and a plan billed only
 *  per payment (Starter) at 0 a month, its rate per payment in the description (a percentage plus
 *  a fixed part has no price of its own to state). Enterprise is priced per customer: no offer. */
export function planOffers(url: string, site: string): JsonLdNode[] {
  return PLAN_IDS.flatMap((id) => {
    const spec = PLAN_SPECS[id];
    const monthly = monthlyPrice(spec.price);
    const perPayment = perPaymentOnly(spec);
    if (monthly === null && !perPayment) return [];
    const description = monthly === null ? `${spec.perTx} per payment, with no monthly fee.` : `${spec.perTx} per payment, plus $${monthly} per month.`;
    return [
      {
        "@type": "Offer",
        name: planName(id),
        url,
        description,
        price: String(monthly ?? 0),
        priceCurrency: "USD",
        priceSpecification: perMonth(monthly ?? 0, description),
        availability: "https://schema.org/InStock",
        seller: { "@id": orgId(site) },
      },
    ];
  });
}

/** The one node the plans are published as, whichever page shows them (the company site's
 *  /pricing, the gateway's /fees): both name this @id. */
export const plansProductId = (site: string): string => `${site}/pricing#product`;

/** The plans as one Product, the same on every page that shows them: an Offer per plan that
 *  states a price, all pointing at the company site's /pricing (the English, bare address). */
export function plansProductNode(site: string): JsonLdNode {
  const url = `${site}/pricing`;
  return {
    "@type": "Product",
    "@id": plansProductId(site),
    name: "Cosmos Pay",
    description: "Cosmos Pay's plans for payments, swaps and private payments as a service on Stellar, Solana and Monad: the rate per payment and per swap on each plan.",
    brand: { "@id": orgId(site) },
    image: `${site}/og-image.png`,
    url,
    offers: planOffers(url, site),
  };
}

export interface ServiceInput {
  id: string;
  name: string;
  serviceType: string;
  description: string;
  url: string;
  site: string;
  /** Where the service is offered, as its copy says it (place names). */
  areaServed?: readonly string[];
}

export function serviceNode({ id, name, serviceType, description, url, site, areaServed }: ServiceInput): JsonLdNode {
  return {
    "@type": "Service",
    "@id": id,
    name,
    serviceType,
    description,
    url,
    provider: { "@id": orgId(site) },
    termsOfService: `${site}/tos`,
    ...(areaServed && areaServed.length > 0 && { areaServed: areaServed.map((name) => ({ "@type": "Place", name })) }),
  };
}

/** Where the gateway is offered: "for businesses in Latin America and beyond" (its llms.txt and
 *  copy), so Latin America first, then the rest of the world. */
export const PAYMENTS_AREA_SERVED = ["Latin America", "Worldwide"] as const;

export interface ProductNodesInput {
  site: string;
  /** The docs root, with its trailing slash: https://dev.cosmospay.lat/docs/ */
  docs: string;
  /** The Payments API's base URL (the gateway's entry prefix). */
  apiBase: string;
  /** The wallet's web app and its Chrome Web Store listing. No version: a number written here
   *  goes stale with the next release, and the stores and the releases page state it. */
  wallet: { webApp: string; chromeStore: string };
}

/** The Payments API as an entity (`<site>/#api`). The company home and the docs root publish this
 *  same node (the docs build it with this builder too, docs/src/lib/seo.ts), so the two never
 *  disagree about it. */
export function apiNode({ site, docs, apiBase }: Pick<ProductNodesInput, "site" | "docs" | "apiBase">): JsonLdNode {
  return {
    "@type": "WebAPI",
    "@id": `${site}/#api`,
    name: "Cosmos Pay Payments API",
    description:
      "REST API to create payment intents and payment links, receive signed webhooks, and manage products, customers and swaps on Stellar, Solana and Monad. API keys starting with dv_ run on testnet and prod_ keys on mainnet.",
    url: `${docs}api/`,
    documentation: docs,
    termsOfService: `${site}/tos`,
    provider: { "@id": orgId(site) },
    availableChannel: { "@type": "ServiceChannel", serviceUrl: apiBase },
  };
}

/** The SDK as an entity (`<site>/#sdk`), the same on the company home and the docs root. */
export function sdkNode(site: string): JsonLdNode {
  const org = { "@id": orgId(site) };
  return {
    "@type": "SoftwareSourceCode",
    "@id": `${site}/#sdk`,
    name: SDK_PACKAGE,
    description:
      "JavaScript and TypeScript SDK for the Cosmos Pay Payments API: a server entry point for Node.js 18 or later and a browser entry point (@cosmosapp/pay_sdk/web) that completes a payment in the user's wallet.",
    programmingLanguage: ["TypeScript", "JavaScript"],
    runtimePlatform: "Node.js 18 or later",
    codeRepository: SDK_REPO,
    url: SDK_NPM,
    // Apache-2.0, as the SDK's LICENSE file and npm metadata state.
    license: "https://www.apache.org/licenses/LICENSE-2.0",
    author: org,
    publisher: org,
  };
}

/** The wallet as an entity (`<site>/#wallet`). */
export function walletNode(site: string, wallet: ProductNodesInput["wallet"]): JsonLdNode {
  return {
    "@type": "SoftwareApplication",
    "@id": `${site}/#wallet`,
    name: "Cosmos Pay Wallet",
    alternateName: "Cosmos Wallet",
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web, Android, Windows, macOS, Linux; extension for Chrome and Firefox",
    description:
      "Non-custodial wallet for Stellar, Solana and Monad: a web app, a browser extension and apps for Android, Windows, macOS and Linux. Keys are generated and encrypted on the device.",
    url: wallet.webApp,
    downloadUrl: [wallet.chromeStore, WALLET_RELEASES],
    publisher: { "@id": orgId(site) },
  };
}

/** What the company makes, for its home: the Payments API, the SDK and the wallet. */
export function productNodes(input: ProductNodesInput): JsonLdNode[] {
  return [apiNode(input), sdkNode(input.site), walletNode(input.site, input.wallet)];
}

export interface ArticleInput {
  /** The canonical URL of the version shown (the bare path in English, ?lang= otherwise). */
  url: string;
  type: "Article" | "TechArticle";
  /** The page's h1. */
  headline: string;
  description: string;
  lang: string;
  /** The WebSite it belongs to (its origin) and the company that writes it (its site). */
  origin: string;
  site: string;
  /** ISO dates, as the page states them. */
  published: string;
  modified: string;
  image?: string;
}

/** A guide as an article written and published by the company itself (the shared Organization),
 *  the main content of its WebPage (`${url}#webpage`). */
export function articleNode(a: ArticleInput): JsonLdNode {
  const org = { "@id": orgId(a.site) };
  return {
    "@type": a.type,
    "@id": `${a.url}#article`,
    headline: a.headline,
    description: a.description,
    inLanguage: a.lang,
    url: a.url,
    mainEntityOfPage: { "@id": `${a.url}#webpage` },
    isPartOf: { "@id": websiteId(a.origin) },
    author: org,
    publisher: org,
    datePublished: a.published,
    dateModified: a.modified,
    ...(a.image && { image: a.image }),
  };
}

/** A hub's list of pages, in its order, each by its address and name. */
export function itemListNode(id: string, items: readonly { name: string; url: string }[]): JsonLdNode {
  return {
    "@type": "ItemList",
    "@id": id,
    numberOfItems: items.length,
    itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, url: it.url })),
  };
}

/** The script element's text: one graph, with "<" escaped so no string can close the element. */
export function jsonLdText(graph: JsonLdNode[]): string {
  return JSON.stringify({ "@context": "https://schema.org", "@graph": graph }).replace(/</g, "\\u003c");
}
