/* Auth helpers — there is no local login screen; every action kicks off the
   Authentik OAuth2 flow directly. */
import type { MouseEvent } from "react";
import { signIn, signOut } from "@/lib/auth-client";
import { DASH, HOME } from "./constants";
import type { User } from "./types";

/* Kick off the Authentik OAuth2 flow directly — there is no local login/register
   screen. Every "log in" / "get API keys" / "sign up" action lands here and is
   redirected straight to the OAuth provider to mint a token. */
export function startLogin(callbackURL: string = DASH) {
  try {
    return signIn.oauth2({ providerId: "ak", callbackURL });
  } catch (e) {
    /* signIn redirects the browser; nothing else to do on failure. */
  }
}

/* Props for any "get started / get API keys / start building" CTA: signed-in users
   follow the link to the dashboard; everyone else is sent straight into OAuth.
   Spread onto an <a href={DASH}> so it still works without JS. */
export function ctaProps(user: User | null | undefined, callbackURL: string = DASH) {
  return {
    href: callbackURL,
    onClick: (e: MouseEvent) => {
      if (!user) { e.preventDefault(); startLogin(callbackURL); }
    },
  };
}

/* Sign out, then send the user back to the marketing site. */
export function startLogout(redirectTo: string = HOME) {
  return Promise.resolve(signOut())
    .catch(() => {})
    .then(() => { window.location.href = redirectTo; });
}
