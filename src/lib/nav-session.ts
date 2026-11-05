/* Who is signed in, for the general nav on the domains that do not get the platform's session
   cookie: the company site and the gateway's domain (payments). The cookie stays host-only on the
   platform (src/lib/auth.ts), so those pages ask the platform with a credentialed GET to
   NAV_SESSION_PATH, and the nav shows "Dashboard" and the account menu instead of "Log in".

   The answer is the account's name, email and picture and nothing else: no session id, no token
   (Better Auth's /api/auth/get-session hands those out, which is why only the company site, an
   origin trusted with the session, may read it). That is what lets the payments domain read it
   too: the middleware gives this GET a credentialed CORS allowance for the payments origin
   (src/lib/payments-session.ts), without adding that origin to the session's allowlist
   (src/lib/allowed-origins.ts). Signing out from there is a navigation to the platform's /logout
   (src/pages/logout.astro). No astro:env import here, so the unit tests can load it. */

export const NAV_SESSION_PATH = "/api/nav-session";

export interface NavSessionUser {
  name: string;
  email: string;
  image: string | null;
}

/** The answer's body: the signed-in account's public profile, or `{ user: null }`. */
export function navSessionBody(user: { name?: string | null; email?: string | null; image?: string | null } | null | undefined): { user: NavSessionUser | null } {
  return { user: user ? { name: user.name ?? "", email: user.email ?? "", image: user.image ?? null } : null };
}
