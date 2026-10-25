/* POST /contact on payments.cosmospay.lat: the contact form in the final call of every gateway
 * page (src/components/payments/landing/sections/FinalCta.astro). It emails the team
 * (CONTACT_EMAIL, else the gateway's public address) with the visitor as the reply-to.
 *
 * It works without JavaScript: the form posts here and the page comes back with
 * ?contact=<outcome>#contact. The page script posts it in place instead (Accept: application/json)
 * and gets { status, errors }. Only this origin may post (the app runs with Astro's checkOrigin
 * off, so it is checked here); a script is told "sent" and nothing goes out (the honeypot, a post
 * faster than a person); one network may send five messages per 15 minutes. The rules are in
 * src/lib/payments/contact.ts. */
import type { APIRoute } from "astro";
import { CONTACT_EMAIL } from "astro:env/server";
import { PAYMENTS } from "@/lib/payments/urls";
import { PAYMENTS_PAGE_PATHS } from "@/lib/payments/site-pages";
import { CONTACT_ADDRESS, ContactRateLimit, contactEmail, looksAutomated, parseContact, type ContactField } from "@/lib/payments/contact";
import { isMailConfigured, sendMail } from "@/lib/mailer";
import { clientIp } from "@/lib/geo";

type Outcome = "sent" | "invalid" | "limited" | "failed";

const limit = new ContactRateLimit();
const PAGES = new Set(["/", ...PAYMENTS_PAGE_PATHS]);
const MAX_BODY = 20_000;

export const POST: APIRoute = async ({ request, locals, clientAddress }) => {
  const sameOrigin = request.headers.get("origin")
    ? request.headers.get("origin") === new URL(PAYMENTS).origin
    : request.headers.get("sec-fetch-site") === "same-origin";
  if (!sameOrigin) return new Response("Forbidden", { status: 403 });
  if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY) return new Response("Payload Too Large", { status: 413 });

  let fields: Record<string, string>;
  try {
    const form = await request.formData();
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
  if (!limit.take(clientIp(request.headers, clientAddress) ?? "unknown", Date.now())) return answer("limited");
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
