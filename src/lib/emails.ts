/* emails.ts — render transactional email bodies from the HTML templates in src/emails/.
   Templates are imported as raw strings (Vite `?raw`) and filled with {{placeholder}}
   values here, so the HTML files stay plain and easy to restyle independently. */
import invitationHtml from "@/emails/invitation.html?raw";
import tosHtml from "@/emails/tos.html?raw";

function escapeHtml(s: string): string {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}

function fill(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_m, key) => (key in vars ? vars[key] : ""));
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

export function renderInvitationEmail(v: { org: string; inviter: string; url: string; email: string; days: number }): RenderedEmail {
  const html = fill(invitationHtml, {
    org: escapeHtml(v.org),
    inviter: escapeHtml(v.inviter),
    url: v.url,
    email: escapeHtml(v.email),
    days: String(v.days),
  });
  const subject = `You're invited to join ${v.org} on Cosmos Pay`;
  const text = [
    `${v.inviter} invited you to join "${v.org}" on Cosmos Pay.`,
    "",
    `Accept your invitation: ${v.url}`,
    "",
    `This link expires in ${v.days} days. Sign in with ${v.email} to accept.`,
  ].join("\n");
  return { subject, html, text };
}

/* Terms-of-service acceptance email for a fiat (onramp/offramp) receiver. The account
   stays inactive until {{url}} is accepted. */
export function renderTosEmail(v: { name: string; url: string }): RenderedEmail {
  const html = fill(tosHtml, { name: escapeHtml(v.name), url: v.url });
  const subject = "Accept the terms of service to activate your Cosmos Pay account";
  const text = [
    `Hi ${v.name},`,
    "",
    `To activate your account for fiat onramp/offramp, review and accept the terms of service:`,
    v.url,
    "",
    `Your account stays inactive until you accept. If you weren't expecting this, ignore this email.`,
    "",
    "— Cosmos Pay",
  ].join("\n");
  return { subject, html, text };
}
