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

/* stellar.toml (SEP-1): who stands behind cosmospay.lat on the Stellar network. The company site
   answers it, and only the company site (src/pages/.well-known/stellar.toml.ts).

   Why this domain needs one: the wallet's two SEP-30 recovery servers name cosmospay.lat as their
   HOME_DOMAIN, so every SEP-10 challenge they sign reads `cosmospay.lat auth`, and a client that
   follows SEP-10 looks for this file at that domain. It answered 404 (security audit, 2026-11-11).

   What it holds is the organization's documentation and nothing a client would act on:
   - no SIGNING_KEY or WEB_AUTH_ENDPOINT. There are two recovery servers, each with its own key,
     and SEP-1 has room for one. Each publishes its own stellar.toml on its own host, which is
     the only one the wallet reads (its recovery module): a pair whose discovery ran through
     this domain would let whoever controls the company site redirect both, and their
     independence is the point of having two.
   - no ACCOUNTS or CURRENCIES, which would be claims about accounts this file cannot vouch for.
   Every value is one the site already publishes: the origin, the contact address
   (src/lib/payments/contact.ts), the GitHub organization and the X profile (SOCIAL). */

/** The network this file describes: Stellar's public network. */
export const STELLAR_PUBNET_PASSPHRASE = "Public Global Stellar Network ; September 2015";

/** The SEP-1 version the file follows, as the recovery servers' own files state it. */
export const STELLAR_TOML_VERSION = "2.7.0";

/** stellar.toml's media type and the CORS SEP-1 requires (wallets read it from any origin). */
export const STELLAR_TOML_HEADERS: Record<string, string> = {
  "Content-Type": "text/plain; charset=utf-8",
  "Access-Control-Allow-Origin": "*",
  "Cache-Control": "public, max-age=3600",
};

export interface StellarTomlInput {
  /** The company site's origin, e.g. https://cosmospay.lat. */
  orgUrl: string;
  email: string;
  /** The GitHub organization's handle. */
  github: string;
  /** The X handle, without the @. */
  twitter: string;
}

/** A TOML basic string: quotes and backslashes escaped, nothing else allowed to break the line. */
function tomlString(value: string): string {
  if (/[\u0000-\u001f\u007f]/.test(value)) throw new Error(`stellar.toml: control character in ${JSON.stringify(value)}`);
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

export function stellarToml({ orgUrl, email, github, twitter }: StellarTomlInput): string {
  return [
    "# Cosmos Pay. SEP-1: https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0001.md",
    "# The wallet's account recovery servers (SEP-10 and SEP-30) name this domain as their home",
    "# domain. Each publishes its own stellar.toml, with its WEB_AUTH_ENDPOINT and SIGNING_KEY, on",
    "# its own host; this file does not list them.",
    `VERSION = ${tomlString(STELLAR_TOML_VERSION)}`,
    `NETWORK_PASSPHRASE = ${tomlString(STELLAR_PUBNET_PASSPHRASE)}`,
    "",
    "[DOCUMENTATION]",
    `ORG_NAME = ${tomlString("Cosmos Pay")}`,
    `ORG_URL = ${tomlString(orgUrl.replace(/\/+$/, ""))}`,
    `ORG_OFFICIAL_EMAIL = ${tomlString(email)}`,
    `ORG_GITHUB = ${tomlString(github)}`,
    `ORG_TWITTER = ${tomlString(twitter)}`,
    "",
  ].join("\n");
}
