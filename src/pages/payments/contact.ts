/* POST /contact on payments.cosmospay.lat: the contact form in the final call of every gateway
 * page (src/components/payments/landing/sections/FinalCta.astro). It emails the team
 * (CONTACT_EMAIL, else the gateway's public address) with the visitor as the reply-to.
 *
 * It works without JavaScript: the form posts here and the page comes back with
 * ?contact=<outcome>#contact. The page script posts it in place instead (Accept: application/json)
 * and gets { status, errors }. Only this origin may post (the app runs with Astro's checkOrigin
 * off, so it is checked here); the body is read up to 20 KB, whatever Content-Length says; a
 * script is told "sent" and nothing goes out (the honeypot, a post faster than a person); one
 * network (cf-connecting-ip, never a header the client controls) may send five messages per 15
 * minutes; past sixty an hour from everyone together, visitors are pointed at the public address
 * instead (a circuit breaker, so forged keys cannot lock the team out of mail). For a firm
 * per-network limit, the origin should accept only Cloudflare's addresses (then
 * cf-connecting-ip cannot be forged). The rules are in src/lib/payments/contact.ts. */
import type { APIRoute } from "astro";
import { CONTACT_EMAIL } from "astro:env/server";
import { PAYMENTS } from "@/lib/payments/urls";
import { PAYMENTS_PAGE_PATHS } from "@/lib/payments/site-pages";
import { CONTACT_ADDRESS, ContactRateLimit, contactEmail, looksAutomated, parseContact, rateKey, readCapped, type ContactField } from "@/lib/payments/contact";
import { isMailConfigured, sendMail } from "@/lib/mailer";

type Outcome = "sent" | "invalid" | "limited" | "failed";

const perNetwork = new ContactRateLimit();
// Bounds what anyone can make the app send, even with a forged network key.
const overall = new ContactRateLimit(60, 60 * 60_000);
const PAGES = new Set(["/", ...PAYMENTS_PAGE_PATHS]);
const MAX_BODY = 20_000;

export const POST: APIRoute = async ({ request, locals, clientAddress }) => {
  const sameOrigin = request.headers.get("origin")
    ? request.headers.get("origin") === new URL(PAYMENTS).origin
    : request.headers.get("sec-fetch-site") === "same-origin";
  if (!sameOrigin) return new Response("Forbidden", { status: 403 });

  let fields: Record<string, string>;
  try {
    const body = await readCapped(request.body, MAX_BODY);
    if (!body) return new Response("Payload Too Large", { status: 413 });
    const form = await new Response(body, { headers: { "Content-Type": request.headers.get("content-type") ?? "" } }).formData();
    fields = Object.fromEntries([...form].filter(([, v]) => typeof v === "string")) as Record<string, string>;
  } catch {
    return new Response("Bad Request", { status: 400 });
  }

  // Back to the page the form was on (one of the gateway's own), at the form.
  const from = PAGES.has(fields.from ?? "") ? fields.from! : "/";
  const wantsJson = (request.headers.get("accept") ?? "").includes("application/json");
  const answer = (status: Outcome, errors: ContactField[] = []) =>
    wantsJson
      ? new Response(JSON.stringify({ status, errors }), {
          status: status === "invalid" ? 422 : status === "limited" ? 429 : status === "failed" ? 502 : 200,
          headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
        })
      : new Response(null, { status: 303, headers: { Location: `${from}?contact=${status}#contact`, "Cache-Control": "no-store" } });

  if (looksAutomated(fields, Date.now())) return answer("sent");
  const parsed = parseContact(fields);
  if (!parsed.ok) return answer("invalid", parsed.errors);
  const now = Date.now();
  const key = rateKey(request.headers, clientAddress);
  if (!perNetwork.take(key, now)) return answer("limited");
  // The overall cap is a circuit breaker, not a lockout: past it the visitor is pointed at the
  // public address (the "failed" answer names it), their own allowance is given back, and the
  // log says so, so a flood of forged keys costs the form, never the way to reach the team.
  if (!overall.take("all", now)) {
    perNetwork.release(key);
    console.warn("[contact] the overall cap (60 messages an hour) is reached; visitors are shown the public address");
    return answer("failed");
  }
  if (!isMailConfigured()) {
    console.error("[contact] mail is not configured (RESEND_API_KEY or SMTP_*, and SMTP_FROM)");
    return answer("failed");
  }

  const mail = contactEmail(parsed.value, { page: from, lang: locals.lang ?? "en" });
  try {
    await sendMail({ to: CONTACT_EMAIL || CONTACT_ADDRESS, replyTo: parsed.value.email, ...mail });
  } catch (err) {
    console.error("[contact] could not send:", err instanceof Error ? err.message : err);
    return answer("failed");
  }
  return answer("sent");
};

/* The form's address is not a page: anyone landing on it goes to the form. */
export const GET: APIRoute = () => new Response(null, { status: 303, headers: { Location: "/#contact" } });
