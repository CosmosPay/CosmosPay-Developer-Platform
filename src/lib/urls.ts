/* urls.ts: pure helpers for absolute links between the three domains. No astro:env import
   here, so the unit tests can load it under plain `node --test`;
   @/components/cosmos/lib/constants feeds it the configured origins. */
import { isSafeNextPath } from "@/lib/safe-next";

/** Drop surrounding whitespace and trailing slashes so `${origin}/path` never doubles them. */
export function normalizeOrigin(origin: string): string {
  return origin.trim().replace(/\/+$/, "");
}

/**
 * The platform's sign-in entry. `next` is the path on the platform to land on afterwards;
 * /login only honours same-origin paths, so anything else is dropped here too rather than
 * producing a link that silently ignores it.
 */
export function loginUrl(devOrigin: string, next?: string): string {
  const base = `${normalizeOrigin(devOrigin)}/login`;
  if (!next || !isSafeNextPath(next)) return base;
  return `${base}?next=${encodeURIComponent(next)}`;
}
