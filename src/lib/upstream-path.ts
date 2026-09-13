/* upstream-path.ts — the one rule about paths we hand to the Payments API.

   Kept out of cosmos.ts (which imports `astro:env/server`) so it stays reachable from the
   unit suite: this is exactly the "logic that decides a limit, a permission or a
   signature" the test preload asks to keep out of route handlers. */

/**
 * Whether `path` stays inside the prefix its caller was allowed to use.
 *
 * Upstream paths are built by concatenation and then normalized by `new URL`, so one `..`
 * segment inside a catch-all param — "kyc/../admin/summary" — resolves to a path the
 * caller was never allowed to reach. The KYC/onramp/offramp proxies used to be saved from
 * that by accident: `/v1/admin` demanded a platform-admin credential they did not carry.
 * That credential is gone (the platform console decides who is an admin now), so the
 * prefix has to hold on its own.
 *
 * Backslashes count as separators: WHATWG `URL` folds `\` into `/` for http(s), so
 * "kyc/..\admin/summary" escapes exactly like the forward-slash spelling does.
 */
export function isSafeUpstreamPath(path: string): boolean {
  return !path
    .split(/[\\/]/)
    .some((segment) => segment === "." || segment === "..");
}
