import { createAuthClient } from "better-auth/client"
import { PUBLIC_BETTER_AUTH_URL } from "astro:env/client"

/* Use the same auth URL the server is configured with (BETTER_AUTH_URL), exposed
   to the browser as PUBLIC_BETTER_AUTH_URL. Hardcoding localhost broke production
   by sending OAuth callbacks to the developer machine instead of the deployed
   domain (e.g. https://dev.cosmospay.lat). */
/* better-auth 1.7 rebuilt the generic OAuth plugin on the social-provider path, so
   `genericOAuthClient()` no longer exists and the client needs no plugin for it:
   Authentik ("ak") is registered server-side by `genericOAuth()` in @/lib/auth.ts and
   reached through the standard `signIn.social({ provider: "ak" })` API. */
/* `credentials: "include"`: the company site and the payments site call this client
   cross-origin (signing out from cosmospay.lat), and the session cookie must ride along.
   Same-site, so the SameSite=Lax cookie is sent; the platform's CORS layer and Better Auth's
   trustedOrigins both allow those origins (src/lib/allowed-origins.ts). */
export const authClient = createAuthClient({
  baseURL: PUBLIC_BETTER_AUTH_URL,
  fetchOptions: { credentials: "include" },
})

export const { signIn, signOut, getSession } = authClient;
