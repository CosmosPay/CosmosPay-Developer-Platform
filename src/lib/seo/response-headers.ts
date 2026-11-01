/* response-headers.ts: the headers every page and route of the three domains leaves with
   (src/middleware.ts applies them last). Static files are served before the middleware runs, so
   nginx or Cloudflare covers those.

   - Strict-Transport-Security on the https origins: one year, this host only. includeSubDomains
     and preload are the owner's call once every *.cosmospay.lat host answers on HTTPS.
   - Referrer-Policy strict-origin-when-cross-origin, as the payments domain already sent.
   - The charset on HTML: Astro answers `text/html` alone, and a client that does not read the
     <meta charset> mangles the Hindi and Chinese pages.
   - Vary: Accept-Language, Cookie where those headers decide the answer: a bare indexable page
     asked with GET (English, or a 302 to the visitor's language: src/lib/seo/lang-urls.ts) and
     the noindex pages that pick their language in place (payment links, /pay). An address that
     names its language (?lang=es) does not vary, and neither does a bare page asked without GET.

   A header the response already carries is left as it is. Pure, so tests/unit/seoResponseHeaders.test.ts covers it. */

export const HSTS = "max-age=31536000";
export const REFERRER_POLICY = "strict-origin-when-cross-origin";

export interface ResponseHeaderOptions {
  /** The domain's public origin is https. */
  https: boolean;
  /** The answer depends on the cookie or Accept-Language, not only on the address. */
  negotiatedLang: boolean;
}

function addVary(headers: Headers, names: string[]): void {
  const current = headers.get("Vary");
  if (current?.trim() === "*") return;
  const have = new Set((current ?? "").split(",").map((v) => v.trim().toLowerCase()).filter(Boolean));
  const missing = names.filter((n) => !have.has(n.toLowerCase()));
  if (missing.length) headers.set("Vary", [current, ...missing].filter(Boolean).join(", "));
}

function apply(headers: Headers, { https, negotiatedLang }: ResponseHeaderOptions): void {
  if (https && !headers.has("Strict-Transport-Security")) headers.set("Strict-Transport-Security", HSTS);
  if (!headers.has("Referrer-Policy")) headers.set("Referrer-Policy", REFERRER_POLICY);
  const type = headers.get("Content-Type") ?? "";
  const html = /^text\/html\b/i.test(type);
  if (html && !/;\s*charset=/i.test(type)) headers.set("Content-Type", "text/html; charset=utf-8");
  if (html && negotiatedLang) addVary(headers, ["Accept-Language", "Cookie"]);
}

/** The response with those headers. A response whose headers cannot change (one a route passed
 *  through from fetch) is copied first. */
export function responseHeaders(response: Response, options: ResponseHeaderOptions): Response {
  try {
    apply(response.headers, options);
    return response;
  } catch {
    const copy = new Response(response.body, response);
    apply(copy.headers, options);
    return copy;
  }
}
