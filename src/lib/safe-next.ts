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
