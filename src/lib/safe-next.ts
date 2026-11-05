/* safe-next.ts: where /login sends the browser after signing in. The `next` parameter is
   user-controlled (it rides in links from the company site), so only a path on THIS origin
   is honoured; anything else falls back to the dashboard rather than becoming an open
   redirect. */

export const DEFAULT_NEXT = "/dashboard";

/**
 * One leading slash, never `//host` or `/\host` (browsers read both as another origin), and
 * no control characters a browser would strip before resolving the URL.
 */
export function isSafeNextPath(next: string): boolean {
  return /^\/(?![/\\])/.test(next) && !/[\u0000-\u001f\u007f]/.test(next);
}

export function safeNextPath(next: string | null | undefined, fallback: string = DEFAULT_NEXT): string {
  return next && isSafeNextPath(next) ? next : fallback;
}

/**
 * Where /logout sends the browser afterwards: back to the page the visitor signed out from,
 * which can be on any of this app's domains. So an absolute URL is honoured, but only when its
 * origin (scheme, host and port) is exactly one of `origins`; anything else, a relative path
 * included, gets `fallback` rather than becoming an open redirect.
 */
export function safeReturnUrl(next: string | null | undefined, origins: readonly string[], fallback: string): string {
  if (!next || /[\u0000-\u001f\u007f]/.test(next)) return fallback;
  let url: URL;
  try {
    url = new URL(next);
  } catch {
    return fallback;
  }
  const allowed = origins.some((origin) => {
    try {
      return new URL(origin).origin === url.origin;
    } catch {
      return false;
    }
  });
  return allowed && !url.username && !url.password ? url.href : fallback;
}
