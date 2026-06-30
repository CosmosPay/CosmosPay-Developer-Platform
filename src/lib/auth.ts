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

export const auth = betterAuth({
  secret: BETTER_AUTH_SECRET,
  baseURL: BETTER_AUTH_URL,
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
        },
      ],
    }),
  ],
});
