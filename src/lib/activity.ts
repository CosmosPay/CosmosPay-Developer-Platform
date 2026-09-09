/* activity.ts — the platform's side of the client-activity feed.

   Three writers land in the same place (`POST /v1/activity/events` on the
   Payments service, see its `activity/` module):

     - this app's own API surface, recorded by `src/middleware.ts` for every
       `/api/*` request;
     - the dashboard in the browser, which posts page views, clicked actions and
       anything it throws to `/api/activity`;
     - the wallet, which posts to `/api/telemetry` when it has no Cosmos Pay
       account yet and therefore no key of its own to authenticate with.

   WHY A QUEUE. Every one of those is fire-and-forget by definition: a request
   must never get slower, and must never fail, because telemetry could not be
   delivered. Reporting one event per HTTP call would put a round trip to the
   Payments service inside the latency of every dashboard request. So events are
   buffered per consumer and flushed on a timer or when the batch fills, which is
   exactly the shape the ingest endpoint is built for.

   WHY ATTRIBUTION IS NOT A PARAMETER. `trackActivity` takes the signed-in user
   id and nothing else identifying: `cosmosFetch` turns it into the same
   `cosmos_<userId>` consumer the rest of the dashboard uses, and upstream scopes
   the row to that. Anonymous wallet telemetry cannot use it — there is no user —
   so it goes under one dedicated consumer instead of being attributed to a
   guess. */
import { cosmosActivity, type CosmosEnv } from "@/lib/cosmos";

/** Which client an event came from. Matches the upstream enum. */
export type ActivitySource = "wallet" | "dashboard" | "server";

/** Severity ladder, as the upstream feed filters on it. */
export type ActivityLevel = "debug" | "info" | "warn" | "error";

export interface ActivityEventInput {
  /** Event name, e.g. `api.request`, `key.created`, `view.open`. */
  type: string;
  source?: ActivitySource;
  level?: ActivityLevel;
  category?: string;
  message?: string;
  props?: Record<string, unknown>;
  durationMs?: number;
  sessionId?: string;
  distinctId?: string;
  appVersion?: string;
  platform?: string;
  network?: string;
  occurredAt?: string;
  /** The client's own id, which makes a retried flush idempotent upstream. */
  eventId?: string;
}

/* The consumer anonymous wallet telemetry belongs to. One row upstream, created
   on first use, and deliberately NOT per-user: a wallet that has not registered
   has no account to attribute to, and inventing one from an unauthenticated body
   would let anyone file events against a stranger's dashboard. */
const WALLET_TELEMETRY_USER = "wallet_telemetry";

/* Batch bounds. `MAX_BATCH` matches the upstream cap (100) — a larger batch would
   be rejected whole, which is the one failure mode worth avoiding by construction. */
const MAX_BATCH = 100;
/* How long an event may sit in the buffer. Short enough that the dashboard's
   "live tail" of its own activity is not visibly stale, long enough that a busy
   minute is a handful of calls rather than hundreds. */
const FLUSH_INTERVAL_MS = 5_000;
/* Hard ceiling per (user, env) buffer. Reached only when the Payments service is
   unreachable for a sustained period; past it the OLDEST events are dropped,
   because during an incident the newest ones are the ones being looked for. */
const MAX_BUFFERED = 500;

interface Bucket {
  userId: string;
  env: CosmosEnv;
  events: ActivityEventInput[];
  /** Events discarded since the last successful flush, reported with the next one. */
  dropped: number;
}

const buckets = new Map<string, Bucket>();
let timer: ReturnType<typeof setInterval> | null = null;

function bucketKey(userId: string, env: CosmosEnv): string {
  return `${userId}::${env}`;
}

/**
 * Buffer events for one account. Never throws, never awaits: a caller on a
 * request path must be able to write `trackActivity(...)` on its own line and
 * move on.
 */
export function trackActivity(
  userId: string,
  env: CosmosEnv,
  events: ActivityEventInput | ActivityEventInput[],
): void {
  try {
    const list = Array.isArray(events) ? events : [events];
    if (!list.length || !userId) return;

    const key = bucketKey(userId, env);
    const bucket = buckets.get(key) ?? { userId, env, events: [], dropped: 0 };
    bucket.events.push(...list);
    if (bucket.events.length > MAX_BUFFERED) {
      const over = bucket.events.length - MAX_BUFFERED;
      bucket.events.splice(0, over);
      bucket.dropped += over;
    }
    buckets.set(key, bucket);

    // A full batch goes now rather than waiting out the timer — the timer is the
    // floor on latency, not a quota.
    if (bucket.events.length >= MAX_BATCH) {
      void flushBucket(key);
      return;
    }
    ensureTimer();
  } catch {
    /* telemetry must never break the thing it is measuring */
  }
}

/** Start the flush timer once, unref'd so it can never hold the process open. */
function ensureTimer(): void {
  if (timer) return;
  timer = setInterval(() => {
    for (const key of [...buckets.keys()]) void flushBucket(key);
  }, FLUSH_INTERVAL_MS);
  // Node only: `unref` is absent in other runtimes, and its absence is not fatal.
  (timer as unknown as { unref?: () => void }).unref?.();
}

/**
 * Send one bucket upstream.
 *
 * The events are removed from the buffer BEFORE the call and are not put back on
 * failure. That is deliberate: re-queueing them would turn a Payments service
 * that is down into an ever-growing buffer that eventually reports a flood of
 * hours-old events (or exhausts memory first). Losing a telemetry batch is the
 * cheaper failure, and `dropped` on the next successful flush says it happened.
 */
async function flushBucket(key: string): Promise<void> {
  const bucket = buckets.get(key);
  if (!bucket || !bucket.events.length) return;

  const batch = bucket.events.splice(0, MAX_BATCH);
  const dropped = bucket.dropped;
  bucket.dropped = 0;
  if (!bucket.events.length) buckets.delete(key);

  if (dropped > 0) {
    batch.push({
      type: "activity.dropped",
      source: "server",
      level: "warn",
      category: "lifecycle",
      message: `Dropped ${dropped} buffered event(s) before this batch`,
      props: { dropped },
    });
  }

  try {
    await cosmosActivity.ingest(bucket.userId, bucket.env, batch);
  } catch {
    /* Upstream unreachable or refusing the scope. Not re-queued — see above. */
  }
}

/**
 * Anonymous wallet telemetry, forwarded under the dedicated consumer.
 *
 * `clientIp` is the end user's address, forwarded so the upstream rate limit
 * partitions per wallet instead of putting every wallet in the world into this
 * process's single bucket — the same reason the social-login bridge forwards it.
 *
 * Awaited rather than buffered: this one IS the request being served, so there
 * is no caller whose latency is at stake, and the wallet gets a real answer
 * about whether its batch landed.
 */
export function trackWalletTelemetry(
  env: CosmosEnv,
  events: ActivityEventInput[],
  clientIp?: string,
): Promise<{ accepted: number; duplicates: number }> {
  return cosmosActivity.ingest(
    WALLET_TELEMETRY_USER,
    env,
    events.map((e) => ({ ...e, source: "wallet" as const })),
    clientIp,
  );
}
