/* bing-site-auth.ts: Bing Webmaster Tools' ownership file. Bing verifies a site by fetching
   /BingSiteAuth.xml at its root and finding the account's user code in it (Bing Webmaster Tools,
   "Add & verify site" > "XML File"); the file must stay for the site to stay verified. The code
   belongs to the Bing account, not to a site, so one value proves all three domains, and it is
   public by design (the file is how Bing reads it). It works whatever a domain's home does
   (dev.cosmospay.lat's redirects to the sign-in), which a meta tag on the home would not.
   src/pages/BingSiteAuth.xml.ts serves it on every domain from BING_SITE_AUTH; src/lib/hosts.ts
   lets the path through everywhere and the payments robots.txt allows it. Pure, so
   tests/unit/seoBingSiteAuth.test.ts covers it. */

/** Where Bing looks for the file, as it asks for it. */
export const BING_SITE_AUTH_PATH = "/BingSiteAuth.xml";

/* A Bing user code: 32 hexadecimal characters, as Bing hands it out (upper case). */
const USER_CODE = /^[0-9A-F]{32}$/i;

/** Whether `value` is a user code Bing could have issued. */
export function isBingUserCode(value: unknown): value is string {
  return typeof value === "string" && USER_CODE.test(value);
}

/** The file's body for a configured code, in Bing's own layout; null (a 404) without a valid one. */
export function bingSiteAuthXml(code: string | undefined): string | null {
  if (!isBingUserCode(code)) return null;
  return `<?xml version="1.0"?>\n<users>\n\t<user>${code.toUpperCase()}</user>\n</users>\n`;
}
