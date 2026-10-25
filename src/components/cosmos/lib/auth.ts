/* Auth helpers. There is one auth system — Better Auth on the platform's domain — for all
   three domains this app answers. Its session cookie stays host-only there (src/lib/auth.ts),
   so pages on another domain read the session with a credentialed call (useDevSession).
   Signing in is the Authentik OAuth2 flow; there is no username/password screen. */
import { useEffect, useState } from "react";
import { getSession, signIn, signOut } from "@/lib/auth-client";
import { DASH, HOME, LOGIN, loginTo } from "@/components/cosmos/lib/constants";
import type { User } from "@/components/cosmos/lib/types";

/* "Log in" / "Get API keys" from any page, on any of the domains: go to the platform's
   /login, which starts the OAuth flow there. A navigation, not a fetch, so the OAuth state
   cookie is always set by the auth origin. */
export function startLogin(next?: string) {
  window.location.href = next ? loginTo(next) : LOGIN;
}

/* The OAuth flow itself. Only for pages on the platform's own domain (/login, invitation
   links): the browser is redirected straight to the provider to mint a token. */
export function signInWithAuthentik(callbackURL: string = DASH) {
  try {
    return signIn.social({ provider: "ak", callbackURL });
  } catch (e) {
    /* signIn redirects the browser; nothing else to do on failure. */
  }
}

/* Props for any "get started / get API keys / start building" CTA: signed-in users go to
   the dashboard, everyone else to the sign-in, which lands them on the dashboard. A plain
   href, so it works without JS. */
export function ctaProps(user: User | null | undefined, next: string = "/dashboard") {
  return { href: user ? DASH : loginTo(next) };
}

/* The platform session, for pages rendered on the company site's domain, where the
   host-only session cookie never reaches the server. Starts from what the server knew
   (`initial`, set when the page was served from the platform's own host) and otherwise reads
   /api/auth/get-session cross-origin after hydration. `ready` stays false until the answer
   arrives, so the nav can hold its skeleton instead of flashing "Log in" at a signed-in
   visitor. A failed read counts as signed out — the page never waits on it.
   `enabled: false` skips the read and reports signed out at once: the payments domain is
   not an allowed origin for the session (src/lib/allowed-origins.ts), by design. */
export function useDevSession(initial: User | null = null, enabled = true): { user: User | null; ready: boolean } {
  const [state, setState] = useState<{ user: User | null; ready: boolean }>({ user: initial, ready: !!initial || !enabled });
  useEffect(() => {
    if (initial || !enabled) return;
    let alive = true;
    Promise.resolve(getSession())
      .then((res) => {
        const u = res?.data?.user;
        if (alive) setState({ ready: true, user: u ? { name: u.name, email: u.email, image: u.image } : null });
      })
      .catch(() => { if (alive) setState({ user: null, ready: true }); });
    return () => { alive = false; };
  }, []);
  return state;
}

/* Sign out, then send the user to the company site. */
export function startLogout(redirectTo: string = HOME) {
  return Promise.resolve(signOut())
    .catch(() => {})
    .then(() => { window.location.href = redirectTo; });
}
