import { betterAuth } from "better-auth";
import { genericOAuth } from "better-auth/plugins";
import { prismaAdapter } from "better-auth/adapters/prisma";
import {
  AUTHENTIK_CLIENT_ID,
  AUTHENTIK_CLIENT_SECRET,
  AUTHENTIK_DISCOVERY_URL,
  BETTER_AUTH_SECRET,
  BETTER_AUTH_URL,
} from "astro:env/server";
import { prisma } from "@/lib/prisma";
import { ALLOWED_ORIGINS } from "@/lib/allowed-origins";

export const auth = betterAuth({
  secret: BETTER_AUTH_SECRET,
  baseURL: BETTER_AUTH_URL,
  // Better Auth trusts only baseURL (dev.cosmospay.lat) by default and 403s any request
  // from another Origin. The public site + wallet sign in from cosmospay.lat cross-origin,
  // so trust the same origins the CORS layer allows (shared list keeps them in sync).
  trustedOrigins: ALLOWED_ORIGINS,
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  // Link an Authentik ("ak") sign-in to an existing user with the same (verified) email.
  // This is what lets a CosmosPay account auto-provisioned from the wallet be picked up
  // when that user later logs in at auth.cosmospay.lat, instead of creating a duplicate.
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["ak"],
    },
  },
  plugins: [
    genericOAuth({
      config: [
        {
          providerId: "ak",
          clientId: AUTHENTIK_CLIENT_ID,
          clientSecret: AUTHENTIK_CLIENT_SECRET,
          discoveryUrl: AUTHENTIK_DISCOVERY_URL,
          /* ASK FOR THESE EXPLICITLY. The callback refuses any sign-in whose user info
             carries no email (EMAIL_NOT_FOUND, logged as "provider did not return an
             email"), and an OIDC provider only returns the email claim when the `email`
             scope was granted. better-auth requests exactly the scopes listed here:
             1.6 sent none at all, so Authentik fell back to the scopes configured on
             the provider — which happened to include email — while 1.7 narrows the
             request to `openid`, and Authentik then honours that strictly and returns
             `sub` and nothing else. Leaning on a provider's default grant was always
             the fragile half; this states what the app actually needs.
             `profile` is what carries `name` and `picture`, which the dashboard renders
             as the display name and avatar. If email still comes back missing, check
             that the Authentik provider has the openid/email/profile scope mappings
             assigned — a scope the provider cannot issue is silently not granted. */
          scopes: ["openid", "profile", "email"],
        },
      ],
    }),
  ],
});
