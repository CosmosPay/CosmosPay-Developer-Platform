import { createAuthClient } from "better-auth/client"
import { genericOAuthClient } from "better-auth/client/plugins"
import { PUBLIC_BETTER_AUTH_URL } from "astro:env/client"

/* Use the same auth URL the server is configured with (BETTER_AUTH_URL), exposed
   to the browser as PUBLIC_BETTER_AUTH_URL. Hardcoding localhost broke production
   by sending OAuth callbacks to the developer machine instead of the deployed
   domain (e.g. https://dev.cosmospay.lat). */
export const authClient = createAuthClient({
  plugins: [
    genericOAuthClient()
  ],
  baseURL: PUBLIC_BETTER_AUTH_URL,
})

export const { signIn, signOut, getSession } = authClient;