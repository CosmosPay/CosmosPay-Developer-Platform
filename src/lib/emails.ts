/* emails.ts — render transactional email bodies from the HTML templates in src/emails/.
   Templates are imported as raw strings (Vite `?raw`) and filled with {{placeholder}}
   values here, so the HTML files stay plain and easy to restyle independently. */
import invitationHtml from "@/emails/invitation.html?raw";
import walletVerifyHtml from "@/emails/wallet-verify.html?raw";
import walletLinkCodeHtml from "@/emails/wallet-link-code.html?raw";
import walletLoginCodeHtml from "@/emails/wallet-login-code.html?raw";
import walletRecoveryCodeHtml from "@/emails/wallet-recovery-code.html?raw";
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

/* Confirmation email for a CosmosPay account being provisioned from the CosmosPay Wallet.
   Clicking {{url}} proves email ownership and creates the account. */
export function renderWalletVerifyEmail(v: { name: string; url: string; minutes: number }): RenderedEmail {
  const html = fill(walletVerifyHtml, {
    name: escapeHtml(v.name),
    url: v.url,
    minutes: String(v.minutes),
  });
  const subject = "Confirm your CosmosPay account";
  const text = [
    `Hi ${v.name},`,
    "",
    `Confirm this email to finish creating your CosmosPay account from the CosmosPay Wallet,`,
    `so you can receive payments and swap assets:`,
    v.url,
    "",
    `This link expires in ${v.minutes} minutes. If you didn't request this, ignore this email.`,
    "",
    "— CosmosPay",
  ].join("\n");
  return { subject, html, text };
}

/* One-time access code for LINKING an existing account to a wallet (the email already has
   an account, so we don't create one — we prove email ownership with this code instead). */
export function renderWalletLinkCodeEmail(v: { name: string; code: string; minutes: number }): RenderedEmail {
  const html = fill(walletLinkCodeHtml, {
    name: escapeHtml(v.name),
    code: escapeHtml(v.code),
    minutes: String(v.minutes),
  });
  const subject = "Your CosmosPay wallet access code";
  const text = [
    `Hi ${v.name},`,
    "",
    `An account already exists for this email. Enter this access code in the CosmosPay Wallet`,
    `to link it to your wallet:`,
    "",
    `    ${v.code}`,
    "",
    `This code expires in ${v.minutes} minutes and can be used once. If you didn't request this,`,
    `ignore this email — no access is granted without the code.`,
    "",
    "— CosmosPay",
  ].join("\n");
  return { subject, html, text };
}

/* One-time code for the wallet's own sign-in, which runs on the community server now; this
   console only delivers it (src/lib/wallet-auth-console.ts). An email sign-in, or a
   Google/GitHub sign-in for an email that already has an account. Worded for both — the
   person asked to sign in either way, and the code is what finishes it. */
export function renderWalletLoginCodeEmail(v: { name: string; code: string; minutes: number }): RenderedEmail {
  const html = fill(walletLoginCodeHtml, {
    name: escapeHtml(v.name),
    code: escapeHtml(v.code),
    minutes: String(v.minutes),
  });
  // Not in the subject: a subject is what a locked phone shows on its notification.
  const subject = "Your CosmosPay wallet sign-in code";
  const text = [
    `Hi ${v.name},`,
    "",
    `Use this code to sign in to the CosmosPay Wallet:`,
    "",
    `    ${v.code}`,
    "",
    `This code expires in ${v.minutes} minutes and can be used once. If you didn't try to sign in,`,
    `ignore this email — nobody gets in without the code.`,
    "",
    "— CosmosPay",
  ].join("\n");
  return { subject, html, text };
}

/* One-time code a RECOVERY server minted (SEP-30, run by the community server as two separate
   deployments, roles a and b), delivered here because those deployments own no mailer
   (src/pages/api/wallet/console/recovery-code.ts).

   The copy has three jobs and each is a way this mail gets misread otherwise:
     - it names WHICH server sent it, because the person receives two of these with different
       codes and has to type each into the matching field;
     - it says up front that two servers each send their own, so the second email reads as
       expected rather than as a glitch — or as a phisher's "use this one instead";
     - it tells someone who did NOT ask to ignore it and share nothing. A recovery code is half
       of what re-keys a wallet, and "a support agent asked me to read it out" is how the
       other half gets collected.
   The code stays out of the subject, as in the sign-in mail: a subject is what a locked phone
   shows on its notification. */
export function renderWalletRecoveryCodeEmail(v: { server: "A" | "B"; code: string; minutes: number }): RenderedEmail {
  const html = fill(walletRecoveryCodeHtml, {
    server: escapeHtml(v.server),
    code: escapeHtml(v.code),
    minutes: String(v.minutes),
  });
  const subject = `Your CosmosPay wallet recovery code (server ${v.server})`;
  const text = [
    "Hi,",
    "",
    `Someone asked to recover a Cosmos wallet registered to this email address.`,
    `This code is from recovery server ${v.server}:`,
    "",
    `    ${v.code}`,
    "",
    "Recovery uses two independent servers and each one sends its own code, so you will",
    "receive a second email with a different code. The wallet needs both.",
    "",
    `This code expires in ${v.minutes} minutes and can be used once.`,
    "If you did not ask to recover a wallet, ignore this email and do not share the code",
    "with anyone — including anyone claiming to be CosmosPay.",
    "",
    "— CosmosPay",
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
