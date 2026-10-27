import { CORS_ALLOWED_ORIGINS } from "astro:env/server";
import { PUBLIC_SITE_URL } from "astro:env/client";

/* Single source of truth for browser origins allowed to reach this API cross-origin.
   The public site + CosmosPay Wallet live on cosmospay.lat and call this dev.cosmospay.lat
   API, including its Better Auth endpoints, from a different origin. That means TWO
   independent checks must trust these origins:
     1. the CORS layer (src/middleware.ts), so the browser can read the response, and
     2. Better Auth's own origin/CSRF check (src/lib/auth.ts → trustedOrigins), which
        otherwise 403s any request whose Origin isn't the auth baseURL.
   Keeping the list here stops those two allowlists from drifting apart.
   Extend at runtime via CORS_ALLOWED_ORIGINS (comma-separated). */
export const DEFAULT_ALLOWED_ORIGINS = [
  "https://cosmospay.lat",
  "https://www.cosmospay.lat",
  "https://dev.cosmospay.lat",
  "capacitor://localhost",
  "ionic://localhost",
  "http://localhost",
  "https://localhost",
];

/* The company site's domain as configured (src/lib/hosts.ts): it reads the session and signs
   out cross-origin, so a staging or local setup works without listing it again. Only that one:
   the payments domain calls no platform API, and an origin in this list is trusted with the
   session, so keep it out unless it needs that, and then prefer a non-credentialed allowance. */
function configuredOrigins(): string[] {
  try {
    return [new URL(PUBLIC_SITE_URL).origin];
  } catch {
    return [];
  }
}

export const ALLOWED_ORIGINS = [
  ...DEFAULT_ALLOWED_ORIGINS,
  ...configuredOrigins(),
  ...(CORS_ALLOWED_ORIGINS || "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean),
];
