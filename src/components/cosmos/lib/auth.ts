/* Auth helpers. There is one auth system (Better Auth on the platform's domain) for all
   three domains this app answers. Its session cookie stays host-only there (src/lib/auth.ts),
   so pages on another domain ask the platform who is signed in (useDevSession).
   Signing in is the Authentik OAuth2 flow; there is no username/password screen. */
import { useEffect, useState } from "react";
import { signIn, signOut } from "@/lib/auth-client";
import { DASH, DEV, HOME, LOGIN, SITE, loginTo } from "@/components/cosmos/lib/constants";
import { NAV_SESSION_PATH, type NavSessionUser } from "@/lib/nav-session";
import { logoutUrl } from "@/lib/urls";
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

/* Who is signed in, for pages rendered on the company site's or the gateway's domain, where the
   host-only session cookie never reaches the server. Starts from what the server knew
   (`initial`, set when the page was served from the platform's own host) and otherwise asks the
   platform's /api/nav-session with the visitor's cookie after hydration: the account's name,
   email and picture, never the session itself (src/lib/nav-session.ts). `ready` stays false until
   the answer arrives, so the nav can hold its skeleton instead of flashing "Log in" at a
   signed-in visitor. A failed read counts as signed out; the page never waits on it. */
export function useDevSession(initial: User | null = null): { user: User | null; ready: boolean } {
  const [state, setState] = useState<{ user: User | null; ready: boolean }>({ user: initial, ready: !!initial });
  useEffect(() => {
    if (initial) return;
    let alive = true;
    fetch(`${DEV}${NAV_SESSION_PATH}`, { credentials: "include", cache: "no-store" })
      .then((res) => (res.ok ? (res.json() as Promise<{ user?: NavSessionUser | null }>) : null))
      .then((body) => { if (alive) setState({ ready: true, user: body?.user ?? null }); })
      .catch(() => { if (alive) setState({ user: null, ready: true }); });
    return () => { alive = false; };
  }, []);
  return state;
}

/* Sign out, then send the user to the company site. Better Auth signs out cross-origin only
   from the origins it trusts with the session (the company site); any other page (the
   gateway's domain) goes through the platform's /logout, which signs out on the server and
   brings the visitor back to the page they were on. */
export function startLogout(redirectTo: string = HOME) {
  const here = window.location.origin;
  if (here !== new URL(DEV).origin && here !== new URL(SITE).origin) {
    window.location.href = logoutUrl(DEV, window.location.href);
    return Promise.resolve();
  }
  return Promise.resolve(signOut())
    .catch(() => {})
    .then(() => { window.location.href = redirectTo; });
}
