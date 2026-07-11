import { CORS_ALLOWED_ORIGINS } from "astro:env/server";

/* Single source of truth for browser origins allowed to reach this API cross-origin.
   The public site + CosmosPay Wallet live on cosmospay.lat and call this dev.cosmospay.lat
   API — including its Better Auth endpoints — from a different origin. That means TWO
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

export const ALLOWED_ORIGINS = [
  ...DEFAULT_ALLOWED_ORIGINS,
  ...(CORS_ALLOWED_ORIGINS || "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean),
];
