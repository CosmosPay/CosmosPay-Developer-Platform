import { createAuthClient } from "better-auth/client"
import { genericOAuthClient } from "better-auth/client/plugins"

export const authClient = createAuthClient({
  plugins: [
    genericOAuthClient()
  ],
  baseURL: "http://localhost:4321"
})

export const { signIn, signOut, getSession } = authClient;