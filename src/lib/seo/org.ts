/* org.ts: the company as one schema.org entity, built with the configured origins. CosmosLayout
   (cosmospay.lat) and the gateway's StructuredData.astro (payments.cosmospay.lat) both emit this
   same node, so `https://cosmospay.lat/#organization` is defined identically wherever it is named.
   The builders are pure and tested in src/lib/seo/schema.ts; this module only binds them to
   astro:env (through the route constants). */
import { DOCS, SITE, SOCIAL } from "@/components/cosmos/lib/constants";
import { API_BASE } from "@/lib/payments/urls";
import { WALLET_LINKS } from "@/components/cosmos/marketing/data";
import { chromeStoreListing, organizationNode, orgId, productNodes, sameAsProfiles, type JsonLdNode } from "@/lib/seo/schema";

export const ORGANIZATION_ID = orgId(SITE);
export const ORGANIZATION_NODE: JsonLdNode = organizationNode(SITE, sameAsProfiles(SOCIAL));

/** The Payments API, the SDK and the wallet, for the company home. */
export function companyProductNodes(): JsonLdNode[] {
  return productNodes({
    site: SITE,
    docs: DOCS,
    apiBase: API_BASE,
    wallet: { webApp: WALLET_LINKS.webapp, chromeStore: chromeStoreListing(WALLET_LINKS.chrome) },
  });
}
