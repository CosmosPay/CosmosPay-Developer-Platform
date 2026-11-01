/* well-known.ts: the /.well-known files every domain answers (src/pages/.well-known/*, let
   through on every domain by src/lib/hosts.ts). Pure, so tests/unit/seoWellKnown.test.ts covers
   them.

   security.txt (RFC 9116): where to report a vulnerability. The contact is the company's public
   address (src/lib/payments/contact.ts); there is no PGP key, so no Encryption field, and no
   disclosure policy page, so no Policy field. Expires is computed when the file is served, so it
   never lapses while the address is the one in the code; change the contact here when it changes.

   api-catalog (RFC 9727): a linkset naming the Payments API and where its description (the
   OpenAPI document the docs publish) and its documentation are. */

/** How far ahead security.txt expires: RFC 9116 recommends less than a year. */
export const SECURITY_TXT_LIFETIME_DAYS = 180;

export interface SecurityTxtInput {
  now: Date;
  /** An email address or an https URL. */
  contact: string;
  /** Every URL the file is served at. */
  canonicals: string[];
  languages: string[];
}

export function securityTxt({ now, contact, canonicals, languages }: SecurityTxtInput): string {
  const day = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const expires = new Date(day + SECURITY_TXT_LIFETIME_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const contactUri = /^https:\/\//.test(contact) ? contact : `mailto:${contact}`;
  return [
    "# Report security issues in Cosmos Pay (cosmospay.lat, dev.cosmospay.lat, payments.cosmospay.lat) here.",
    `Contact: ${contactUri}`,
    `Expires: ${expires}`,
    `Preferred-Languages: ${languages.join(", ")}`,
    ...canonicals.map((url) => `Canonical: ${url}`),
    "",
  ].join("\n");
}

/** The media type RFC 9727 gives the catalog: a JSON linkset with the API catalog profile. */
export const API_CATALOG_TYPE = 'application/linkset+json; profile="https://www.rfc-editor.org/info/rfc9727"';

export interface ApiCatalogInput {
  /** The catalog's own URL on the domain it is served from. */
  self: string;
  /** The Payments API's base URL. */
  apiBase: string;
  /** The docs root, with its trailing slash. */
  docs: string;
}

/** The catalog: one entry listing the API, and the API's own links (description, documentation). */
export function apiCatalog({ self, apiBase, docs }: ApiCatalogInput): { linkset: Record<string, unknown>[] } {
  return {
    linkset: [
      { anchor: self, item: [{ href: apiBase, title: "Cosmos Pay Payments API" }] },
      {
        anchor: apiBase,
        "service-desc": [{ href: `${docs}openapi.json`, type: "application/vnd.oai.openapi+json" }],
        "service-doc": [{ href: `${docs}api/`, type: "text/html" }, { href: `${docs}llms.txt`, type: "text/plain" }],
      },
    ],
  };
}
