/* mailer.ts — minimal SMTP sender (nodemailer) for transactional email such as
   organization invitations. Configured entirely through the SMTP_* env vars. When
   SMTP is not configured, isMailConfigured() is false and sendMail() throws, so callers
   can surface a clear "email isn't set up" error instead of silently failing.

   nodemailer is imported dynamically so the project still builds (and runs for everything
   else) even before `npm install` has pulled the dependency in. */
import { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE, SMTP_FROM } from "astro:env/server";

export function isMailConfigured(): boolean {
  return Boolean(SMTP_HOST && SMTP_FROM);
}

let transportPromise: Promise<any> | null = null;
async function getTransport(): Promise<any> {
  if (!isMailConfigured()) throw new Error("SMTP is not configured");
  if (!transportPromise) {
    // Resolved at runtime only (not bundled): the specifier is a variable + @vite-ignore so
    // the build never tries to resolve nodemailer. Install it (`npm install`) for email to work.
    const pkg = "nodemailer";
    transportPromise = import(/* @vite-ignore */ pkg).then((mod: any) => {
      const nodemailer = mod.default ?? mod;
      return nodemailer.createTransport({
        host: SMTP_HOST,
        port: SMTP_PORT ?? 587,
        secure: SMTP_SECURE ?? false,
        auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
        // Fail fast instead of hanging the whole request when SMTP egress is
        // blocked/slow (common on VPS hosts like OVH that block outbound 25/465/587).
        // Without these, a blocked port leaves the request open until the proxy
        // (Cloudflare ~100s) times out and returns a 502. With them, sendMail()
        // rejects in seconds and callers return a clean "mail_failed" error.
        connectionTimeout: 10_000, // TCP connect
        greetingTimeout: 10_000,   // wait for the SMTP server greeting
        socketTimeout: 20_000,     // overall socket inactivity
      });
    });
  }
  return transportPromise;
}

export interface MailMessage {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendMail(msg: MailMessage): Promise<void> {
  const transport = await getTransport();
  await transport.sendMail({ from: SMTP_FROM, to: msg.to, subject: msg.subject, html: msg.html, text: msg.text });
}
