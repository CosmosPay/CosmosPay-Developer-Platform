/* auth-linking.ts: how a sign-in through Authentik ("ak") finds its user here, and where a
   failed one lands. Pure, so tests/unit/authLinking.test.ts checks the policy without
   astro:env; src/lib/auth.ts hands both to Better Auth.

   A sign-in is found by its subject (Authentik's user UUID). When the subject is unknown but a
   user here has the same email, Better Auth links the two only if Authentik reports the email
   as verified (`email_verified`, set once the person confirmed the address) AND the user row
   here is verified too. Anything else answers `account_not_linked`, which lands on
   src/pages/login/error.astro.

   - Never list "ak" in `trustedProviders`: Better Auth links a trusted provider's sign-in by
     email whatever its `email_verified` says, so any Authentik account that merely holds
     someone's address becomes that person here. That is how accounts were taken over on
     2026-10-11.
   - Leave `requireLocalEmailVerified` at its default (on). It stops someone who signed in first
     with a victim's address, unconfirmed, from having the victim's identity linked into the row
     they still hold. Better Auth deprecates the switch: the next minor makes the gate
     unconditional.
   - `allowDifferentEmails` stays off: a link never moves a user to another address.

   The usual cause of account_not_linked is a second Authentik user with an email that already
   has one (a recreated account, 2026-11-07): Authentik's enrollment must refuse a known email
   and send the person to recovery instead, so their UUID never changes. */

export const ACCOUNT_LINKING = {
  enabled: true,
} as const;

/** Where Better Auth sends a failed sign-in, with `?error=<code>` (src/pages/login/error.astro,
 *  under /login so it is the platform's on every domain). */
export const AUTH_ERROR_PATH = "/login/error";

export type AuthErrorKind = "notLinked" | "noEmail" | "cancelled" | "generic";

/** The copy a failed sign-in gets, from Better Auth's error code (OAUTH_CALLBACK_ERROR_CODES, or a
 *  `result.error` with its spaces as underscores; `access_denied` is Authentik's own). */
export function authErrorKind(code: string | null | undefined): AuthErrorKind {
  switch ((code ?? "").toLowerCase()) {
    // The email belongs to a user here that this sign-in could not be linked to.
    case "account_not_linked":
    case "unable_to_link_account":
    case "email_not_verified":
      return "notLinked";
    case "email_not_found":
    case "email_does_not_match":
      return "noEmail";
    case "access_denied":
      return "cancelled";
    default:
      return "generic";
  }
}

/** The error code as the page may show it to quote to support: letters, digits and _ only. */
export function displayCode(code: string | null | undefined): string | null {
  const clean = (code ?? "").replace(/[^a-z0-9_]/gi, "").slice(0, 64);
  return clean || null;
}
