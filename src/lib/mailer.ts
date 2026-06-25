/* mailer.ts — transactional email (organization invitations) with two transports:

     1. Resend HTTP API (preferred)  — set RESEND_API_KEY. Sends over HTTPS (443), so it
        works even where outbound SMTP ports are blocked (e.g. OVH blocks 25/465/587).
     2. SMTP fallback                — set SMTP_HOST/PORT/USER/PASS/SECURE (nodemailer).

   The "from" address is SMTP_FROM in both cases and must be a verified sender. When
   neither transport is configured, isMailConfigured() is false and sendMail() throws,
   so callers surface a clear "email isn't set up" error instead of silently failing.

   nodemailer is imported dynamically so the project still builds (and runs for everything
   else) even before `npm install` has pulled the dependency in — and it's only loaded
   when the SMTP path is actually used. */
import {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASS,
  SMTP_SECURE,
  SMTP_FROM,
  RESEND_API_KEY,
} from "astro:env/server";

/** True when at least one transport (Resend or SMTP) plus a from-address is set. */
export function isMailConfigured(): boolean {
  return Boolean(SMTP_FROM && (RESEND_API_KEY || SMTP_HOST));
}

export interface MailMessage {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/* ---------------- transport 1: Resend HTTP API ---------------- */

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const RESEND_TIMEOUT_MS = 15_000;

async function sendViaResend(msg: MailMessage): Promise<void> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), RESEND_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: SMTP_FROM,
        to: [msg.to],
        subject: msg.subject,
        html: msg.html,
        ...(msg.text ? { text: msg.text } : {}),
      }),
      signal: controller.signal,
    });
  } catch (err) {
    // Network error / timeout — surface a concise, catchable message.
    throw new Error(
      `Resend request failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    let detail = "";
    try {
      const body: any = await res.json();
      detail = body?.message || body?.error?.message || JSON.stringify(body);
    } catch {
      detail = await res.text().catch(() => "");
    }
    throw new Error(`Resend API error ${res.status}: ${detail}`);
  }
}

/* ---------------- transport 2: SMTP (nodemailer) ---------------- */

let transportPromise: Promise<any> | null = null;
async function getTransport(): Promise<any> {
  if (!SMTP_HOST) throw new Error("SMTP is not configured");
  if (!transportPromise) {
    // Resolved at runtime only (not bundled): the specifier is a variable + @vite-ignore so
    // the build never tries to resolve nodemailer. Install it (`npm install`) for SMTP to work.
    const pkg = "nodemailer";
    transportPromise = import(/* @vite-ignore */ pkg).then((mod: any) => {
      const nodemailer = mod.default ?? mod;
      return nodemailer.createTransport({
        host: SMTP_HOST,
        port: SMTP_PORT ?? 587,
        // 465 → implicit TLS (secure=true); 587 → STARTTLS (secure=false).
        secure: SMTP_SECURE ?? false,
        auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
        // Fail fast instead of hanging the whole request when SMTP egress is
        // blocked/slow or the port/secure combo is wrong. Without these, a stuck
        // connection leaves the request open until the proxy (Cloudflare ~100s)
        // times out and returns a 502; with them, sendMail() rejects in seconds.
        connectionTimeout: 10_000, // TCP connect
        greetingTimeout: 10_000,   // wait for the SMTP server greeting
        socketTimeout: 20_000,     // overall socket inactivity
      });
    });
  }
  return transportPromise;
}

async function sendViaSmtp(msg: MailMessage): Promise<void> {
  const transport = await getTransport();
  await transport.sendMail({
    from: SMTP_FROM,
    to: msg.to,
    subject: msg.subject,
    html: msg.html,
    text: msg.text,
  });
}

/* ---------------- public API ---------------- */

export async function sendMail(msg: MailMessage): Promise<void> {
  if (!SMTP_FROM) throw new Error("Mail sender (SMTP_FROM) is not configured");
  // Prefer the HTTP API; fall back to SMTP only when no Resend key is set.
  if (RESEND_API_KEY) return sendViaResend(msg);
  if (SMTP_HOST) return sendViaSmtp(msg);
  throw new Error("No mail transport configured (set RESEND_API_KEY or SMTP_*)");
}
