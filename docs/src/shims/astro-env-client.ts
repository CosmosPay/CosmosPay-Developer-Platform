// Shim for Astro's `astro:env/client` virtual module so the portal's auth-client (reused
// here for the shared navbar/session) resolves inside the Next build. These map to Next's
// NEXT_PUBLIC_* env vars. An empty BETTER_AUTH_URL makes the better-auth client use the
// current origin — which is exactly right, since the docs are served from the same origin
// as the portal (dev.cosmospay.lat/docs), so the session cookie is shared automatically.
export const PUBLIC_BETTER_AUTH_URL = process.env.NEXT_PUBLIC_BETTER_AUTH_URL ?? '';
export const PUBLIC_GA_ID = process.env.NEXT_PUBLIC_GA_ID ?? '';
export const PUBLIC_GOOGLE_SITE_VERIFICATION =
  process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION ?? '';
