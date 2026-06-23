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
