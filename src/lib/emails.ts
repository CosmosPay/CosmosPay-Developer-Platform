/* emails.ts — render transactional email bodies from the HTML templates in src/emails/.
   Templates are imported as raw strings (Vite `?raw`) and filled with {{placeholder}}
   values here, so the HTML files stay plain and easy to restyle independently. */
import invitationHtml from "@/emails/invitation.html?raw";

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
