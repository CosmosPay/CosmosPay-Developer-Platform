/* contact.ts: the gateway's contact form (the final call, FinalCta.astro; posted to /contact,
   src/pages/payments/contact.ts). Pure, so its rules are tested without a server: it reads the
   submitted fields and names the wrong ones, tells a script from a person, limits how often one
   network can write, and builds the email the team receives (text, never the visitor's HTML). */

/** The gateway's public contact address (the form's default destination and its fallback). */
export const CONTACT_ADDRESS = "cosmosapplat@gmail.com";

export const CONTACT_TOPICS = ["start", "integration", "pricing", "other"] as const;
export type ContactTopic = (typeof CONTACT_TOPICS)[number];
export type ContactField = "name" | "email" | "company" | "topic" | "message";

export interface ContactMessage {
  name: string;
  email: string;
  company: string;
  topic: ContactTopic;
  message: string;
}

export const CONTACT_LIMITS = { name: 120, email: 254, company: 120, messageMin: 10, message: 4000 } as const;
/** A person takes at least this long to fill the form in; a faster post is a script. */
export const MIN_FILL_MS = 3000;
/** The honeypot: a field people never see, so only a script fills it in. */
export const HONEYPOT = "website";

// Line breaks and control characters never belong in a one-line field (and a line break in
// one that reaches a mail header would start a new header); a message may hold line breaks
// and tabs, nothing else.
const ONE_LINE_BAD = /[\u0000-\u001f\u007f]/;
const MESSAGE_BAD = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;
const EMAIL = /^[^\s@<>()",;:\\[\]]+@[^\s@<>()",;:\\[\]]+\.[^\s@<>()",;:\\[\]]{2,}$/;

type Fields = Record<string, string | undefined>;
export type ContactParse = { ok: true; value: ContactMessage } | { ok: false; errors: ContactField[] };

/** The submitted form, checked: the message, or the fields to fix. */
export function parseContact(fields: Fields): ContactParse {
  const name = (fields.name ?? "").trim();
  const email = (fields.email ?? "").trim();
  const company = (fields.company ?? "").trim();
  const topic = (fields.topic ?? "").trim();
  const message = (fields.message ?? "").trim();
  const errors: ContactField[] = [];
  if (name.length < 2 || name.length > CONTACT_LIMITS.name || ONE_LINE_BAD.test(name)) errors.push("name");
  if (email.length > CONTACT_LIMITS.email || !EMAIL.test(email)) errors.push("email");
  if (company.length > CONTACT_LIMITS.company || ONE_LINE_BAD.test(company)) errors.push("company");
  if (!(CONTACT_TOPICS as readonly string[]).includes(topic)) errors.push("topic");
  if (message.length < CONTACT_LIMITS.messageMin || message.length > CONTACT_LIMITS.message || MESSAGE_BAD.test(message)) errors.push("message");
  if (errors.length) return { ok: false, errors };
  return { ok: true, value: { name, email, company, topic: topic as ContactTopic, message } };
}

/** True when the post looks like a script's: the honeypot filled in, or sent too fast. */
export function looksAutomated(fields: Fields, now: number): boolean {
  if ((fields[HONEYPOT] ?? "").trim() !== "") return true;
  const started = Number(fields.started);
  return !Number.isFinite(started) || now - started < MIN_FILL_MS;
}

/** At most `max` messages per network in `windowMs`; kept in memory (one process). */
export class ContactRateLimit {
  private readonly hits = new Map<string, number[]>();
  private readonly max: number;
  private readonly windowMs: number;
  constructor(max = 5, windowMs = 15 * 60_000) {
    this.max = max;
    this.windowMs = windowMs;
  }

  /** Counts a message from `key` at `now`; false when it is over the limit (not counted). */
  take(key: string, now: number): boolean {
    const recent = (this.hits.get(key) ?? []).filter((t) => now - t < this.windowMs);
    if (recent.length >= this.max) {
      this.hits.set(key, recent);
      return false;
    }
    recent.push(now);
    this.hits.set(key, recent);
    if (this.hits.size > 10_000) this.prune(now);
    return true;
  }

  private prune(now: number): void {
    for (const [key, times] of this.hits) if (times.every((t) => now - t >= this.windowMs)) this.hits.delete(key);
  }
}

const TOPIC_NAMES: Record<ContactTopic, string> = {
  start: "Getting started",
  integration: "Integration",
  pricing: "Plans and pricing",
  other: "Something else",
};

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** The email the team receives; the visitor's words go in as text (escaped in the HTML part). */
export function contactEmail(msg: ContactMessage, meta: { page: string; lang: string }): { subject: string; text: string; html: string } {
  const who = msg.company ? `${msg.name} (${msg.company})` : msg.name;
  const subject = `Payments contact: ${TOPIC_NAMES[msg.topic]}, ${who}`;
  const rows: [string, string][] = [
    ["Name", msg.name],
    ["Email", msg.email],
    ["Company", msg.company || "-"],
    ["Topic", TOPIC_NAMES[msg.topic]],
    ["Page", meta.page],
    ["Language", meta.lang],
  ];
  const text = `${rows.map(([k, v]) => `${k}: ${v}`).join("\n")}\n\n${msg.message}\n`;
  const html =
    `<table cellpadding="4" style="font:14px sans-serif">${rows.map(([k, v]) => `<tr><td><b>${k}</b></td><td>${escapeHtml(v)}</td></tr>`).join("")}</table>` +
    `<p style="font:14px sans-serif;white-space:pre-wrap">${escapeHtml(msg.message)}</p>`;
  return { subject, text, html };
}
