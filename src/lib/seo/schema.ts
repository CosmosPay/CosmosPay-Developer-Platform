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
  /** The canonical URL of the version shown (with its ?lang= when it has one). */
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
 *  transaction (Starter) or priced per customer (Enterprise), which have no price to state. */
export function monthlyPrice(price: string): number | null {
  const match = /^\$(\d+(?:\.\d+)?)\/mo$/.exec(price.trim());
  return match ? Number(match[1]) : null;
}

const planName = (id: PlanId): string => id.charAt(0).toUpperCase() + id.slice(1);

/** The offered plans that have a fixed monthly price, as Offers, from src/lib/plans.ts so the
 *  markup can never quote another price than the page. */
export function planOffers(url: string, site: string): JsonLdNode[] {
  return PLAN_IDS.flatMap((id) => {
    const spec = PLAN_SPECS[id];
    const monthly = monthlyPrice(spec.price);
    if (monthly === null) return [];
    return [
      {
        "@type": "Offer",
        name: planName(id),
        url,
        description: `${spec.perTx} per payment, plus $${monthly} per month.`,
        price: String(monthly),
        priceCurrency: "USD",
        priceSpecification: {
          "@type": "UnitPriceSpecification",
          price: monthly,
          priceCurrency: "USD",
          referenceQuantity: { "@type": "QuantitativeValue", value: 1, unitCode: "MON" },
        },
        availability: "https://schema.org/InStock",
        seller: { "@id": orgId(site) },
      },
    ];
  });
}

export interface PlansProductInput {
  /** The page that shows the plans (its canonical URL). */
  url: string;
  site: string;
  description: string;
  image: string;
}

/** The plans as one Product with an Offer per plan that has a fixed price. */
export function plansProductNode({ url, site, description, image }: PlansProductInput): JsonLdNode {
  return {
    "@type": "Product",
    "@id": `${url}#product`,
    name: "Cosmos Pay",
    description,
    brand: { "@id": orgId(site) },
    image,
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
}

export function serviceNode({ id, name, serviceType, description, url, site }: ServiceInput): JsonLdNode {
  return {
    "@type": "Service",
    "@id": id,
    name,
    serviceType,
    description,
    url,
    provider: { "@id": orgId(site) },
    termsOfService: `${site}/tos`,
  };
}

export interface ProductNodesInput {
  site: string;
  /** The docs root, with its trailing slash: https://dev.cosmospay.lat/docs/ */
  docs: string;
  /** The Payments API's base URL (the gateway's entry prefix). */
  apiBase: string;
  wallet: { version: string; webApp: string; chromeStore: string };
}

/** What the company makes, for its home: the Payments API, the SDK and the wallet. */
export function productNodes({ site, docs, apiBase, wallet }: ProductNodesInput): JsonLdNode[] {
  const org = { "@id": orgId(site) };
  return [
    {
      "@type": "WebAPI",
      "@id": `${site}/#api`,
      name: "Cosmos Pay Payments API",
      description:
        "REST API to create payment intents and payment links, receive signed webhooks, and manage products, customers and swaps on Stellar, Solana and Monad. API keys starting with dv_ run on testnet and prod_ keys on mainnet.",
      url: `${docs}api/`,
      documentation: docs,
      termsOfService: `${site}/tos`,
      provider: org,
      availableChannel: { "@type": "ServiceChannel", serviceUrl: apiBase },
    },
    {
      "@type": "SoftwareSourceCode",
      "@id": `${site}/#sdk`,
      name: SDK_PACKAGE,
      description:
        "JavaScript and TypeScript SDK for the Cosmos Pay Payments API: a server entry point for Node.js 18 or later and a browser entry point (@cosmosapp/pay_sdk/web) that completes a payment in the user's wallet.",
      programmingLanguage: ["TypeScript", "JavaScript"],
      runtimePlatform: "Node.js 18 or later",
      codeRepository: SDK_REPO,
      url: SDK_NPM,
      author: org,
      publisher: org,
    },
    {
      "@type": "SoftwareApplication",
      "@id": `${site}/#wallet`,
      name: "Cosmos Pay Wallet",
      alternateName: "Cosmos Wallet",
      applicationCategory: "FinanceApplication",
      operatingSystem: "Web, Android, Windows, macOS, Linux; extension for Chrome and Firefox",
      softwareVersion: wallet.version,
      description:
        "Non-custodial wallet for Stellar, Solana and Monad: a web app, a browser extension and apps for Android, Windows, macOS and Linux. Keys are generated and encrypted on the device.",
      url: wallet.webApp,
      downloadUrl: [wallet.chromeStore, WALLET_RELEASES],
      publisher: org,
    },
  ];
}

/** The script element's text: one graph, with "<" escaped so no string can close the element. */
export function jsonLdText(graph: JsonLdNode[]): string {
  return JSON.stringify({ "@context": "https://schema.org", "@graph": graph }).replace(/</g, "\\u003c");
}
