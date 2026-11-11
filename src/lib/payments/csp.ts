/* csp.ts: the payments domain's Content-Security-Policy (src/middleware.ts applies it).

   The payments domain shows people where to send money, so the policy has two jobs:
   - nobody frames a page (`frame-ancestors 'none'`, plus X-Frame-Options in the middleware): a
     framed checkout with an overlaid address is the attack. Every payments response carries it.
   - only this page's own scripts run. Until 2026-11-11 the policy said nothing about scripts, so
     one injected script (a DOM-XSS, a compromised dependency, a script added to the page) could
     rewrite the address or the QR a payer sees, and nothing in the browser would stop it
     (external security audit, finding 4).

   HOW the scripts are allowed, and why this way. A page's HTML is rendered per request and its
   inline scripts (Astro's island loader, the theme and nav scripts, small module scripts the build
   inlines) change with every build, so the allowed set is computed from the HTML being sent: the
   SHA-256 of each inline script a browser would run, plus `'self'` for every `<script src>` this
   app serves. What that refuses: a script from any other origin, an inline event handler
   (`onerror=`, `onclick=`), a `javascript:` URL, and an inline script created at runtime (its text
   is not one of the hashes), which is every way a DOM-XSS turns into code. What it cannot refuse:
   a script injected into the HTML on the server, which would be hashed with the rest. Astro escapes
   every expression, and the only `set:html` on these pages are constants and JSON whose `<` is
   escaped (`Checkout.astro`, `StructuredData.astro`), so there is no such path today; keep it so.

   A fresh nonce is also listed, though no script of ours carries it: Cloudflare's JavaScript
   detections inject an inline script into every HTML page, and Cloudflare copies a nonce it finds
   in the CSP header onto that script. Without one, the browser blocks it and logs a violation on
   every page.

   The private checkout (`/zk/…`) gets the script policy as Report-Only for now: bb.js proves in the
   browser with WebAssembly, may start a worker from a blob: URL (fflate) and probes `new Function`
   (msgpackr), and a proof cannot run without a real payment, so the policy there must be watched on
   a testnet payment before it is enforced (`ZK_SCRIPT_POLICY_ENFORCED`). Its framing policy is
   enforced like everywhere else.

   Pure except for the hash and the nonce (node:crypto), so tests/unit/paymentsCsp.test.ts covers it. */
import { createHash, randomBytes } from "node:crypto";

/** What every payments response carries, whatever it is. */
export const PAYMENTS_BASE_CSP = "frame-ancestors 'none'; base-uri 'self'; object-src 'none'; form-action 'self'";

/** Flip once a testnet private payment has run with the Report-Only policy and logged nothing. */
export const ZK_SCRIPT_POLICY_ENFORCED = false;

/** The `type` values a browser runs as script. Anything else (JSON, JSON-LD, a template) is data. */
const SCRIPT_TYPES = new Set(["", "module", "text/javascript", "application/javascript", "text/ecmascript", "application/ecmascript"]);

const SCRIPT_ELEMENT = /<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi;

function attribute(attrs: string, name: string): string | null {
  const match = new RegExp(`(?:^|\\s)${name}(?:\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'=<>\`]+)))?(?=\\s|/|$)`, "i").exec(attrs);
  if (!match) return null;
  return match[1] ?? match[2] ?? match[3] ?? "";
}

/**
 * The CSP hash source (`'sha256-…'`) of every inline script in `html` that a browser would run, in
 * order of appearance, without repeats. The text is hashed as the browser sees it: the HTML parser
 * turns CR LF and a lone CR into LF before the script reads its text, so a page built from files
 * with Windows line endings still matches.
 */
export function inlineScriptHashes(html: string): string[] {
  const hashes = new Set<string>();
  for (const [, attrs, body] of html.matchAll(SCRIPT_ELEMENT)) {
    if (attribute(attrs, "src") !== null) continue;
    const type = attribute(attrs, "type");
    if (type !== null && !SCRIPT_TYPES.has(type.trim().toLowerCase())) continue;
    const text = body.replace(/\r\n?/g, "\n");
    hashes.add(`'sha256-${createHash("sha256").update(text, "utf8").digest("base64")}'`);
  }
  return [...hashes];
}

/** A nonce for one response (128 bits, base64). */
export function newNonce(): string {
  return randomBytes(16).toString("base64");
}

export interface ScriptPolicyInput {
  hashes: readonly string[];
  nonce: string;
  /** The private checkout: WebAssembly and the prover's workers. */
  zk: boolean;
}

/** The base policy plus the script directives for one HTML page. */
export function scriptPolicy({ hashes, nonce, zk }: ScriptPolicyInput): string {
  const scriptSources = ["'self'", `'nonce-${nonce}'`, ...hashes, ...(zk ? ["'wasm-unsafe-eval'"] : [])];
  const directives = [PAYMENTS_BASE_CSP, `script-src ${scriptSources.join(" ")}`, "script-src-attr 'none'"];
  if (zk) directives.push("worker-src 'self' blob:");
  return directives.join("; ");
}

/** Which header carries the script policy on this page. */
export function scriptPolicyHeader(zk: boolean): "Content-Security-Policy" | "Content-Security-Policy-Report-Only" {
  return zk && !ZK_SCRIPT_POLICY_ENFORCED ? "Content-Security-Policy-Report-Only" : "Content-Security-Policy";
}

/**
 * `response` with the script policy, when it is an HTML page with a body; otherwise unchanged (it
 * keeps the base policy the middleware set). The body is read whole to hash its scripts and sent
 * as read, byte for byte. A Report-Only page keeps the enforced base policy beside it.
 */
export async function withScriptPolicy(response: Response, opts: { method: string; zk: boolean }): Promise<Response> {
  const type = response.headers.get("Content-Type") ?? "";
  if (opts.method !== "GET" || !/^text\/html\b/i.test(type) || response.body === null) return response;
  if (response.status === 204 || response.status === 304 || (response.status >= 300 && response.status < 400)) return response;
  const html = await response.text();
  const headers = new Headers(response.headers);
  const policy = scriptPolicy({ hashes: inlineScriptHashes(html), nonce: newNonce(), zk: opts.zk });
  const header = scriptPolicyHeader(opts.zk);
  if (header === "Content-Security-Policy") headers.set(header, policy);
  else {
    headers.set("Content-Security-Policy", PAYMENTS_BASE_CSP);
    headers.set(header, policy);
  }
  return new Response(html, { status: response.status, statusText: response.statusText, headers });
}
