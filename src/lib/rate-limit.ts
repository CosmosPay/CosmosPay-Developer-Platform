/* rate-limit.ts — the in-process first line for unauthenticated routes.

   Per process and per address, in memory. It is the FIRST line, not the durable
   one: the Payments service counts the same calls in Postgres (and we forward
   the end user's address, so those budgets partition per user rather than
   pooling on this server's IP). What this adds is refusing an obvious flood
   before it costs an upstream round trip, and it is deliberately cheap enough to
   be always on.

   A restart forgets the counters, and two replicas count separately. Both are
   fine for a first line; neither would be fine as the only one, which is why it
   is not.

   It lived inside social-onboarding.ts, which is where it was written, and the
   second unauthenticated route (wallet telemetry) needed exactly the same thing
   — so it is here rather than copied. The counters are keyed by bucket name, so
   sharing the map between callers shares nothing else. */

export interface RatePolicy {
  limit: number;
  windowMs: number;
}

const hits = new Map<string, number[]>();

export function allow(bucket: string, address: string, policy: RatePolicy): boolean {
  const key = `${bucket}:${address}`;
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < policy.windowMs);
  if (recent.length >= policy.limit) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  // Bound the map: a long-lived process would otherwise keep one array per address
  // that ever called, forever.
  if (hits.size > 10_000) {
    for (const [k, times] of hits) {
      if (times.every((t) => now - t >= policy.windowMs)) hits.delete(k);
    }
  }
  return true;
}

/**
 * Both keys have to admit the call: the caller's address, and everyone together.
 *
 * The per-address key is only as honest as the address, and the address on a
 * public route comes from a proxy header the caller can write. That is fine for
 * telling one ordinary user apart from another and worth nothing against someone
 * rotating the header — who would otherwise walk through the per-address limit
 * AND the upstream one, since we forward the same value there. The global bucket
 * is the one that cannot be rotated past.
 */
export function withinBudget(
  bucket: string,
  address: string,
  perAddress: RatePolicy,
  global: RatePolicy,
): boolean {
  return allow(bucket, address, perAddress) && allow(bucket, "*", global);
}
