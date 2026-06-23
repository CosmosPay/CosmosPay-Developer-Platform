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
