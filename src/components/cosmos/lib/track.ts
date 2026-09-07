/* track.ts — what the dashboard, in the browser, reports about itself.

   The server records every `/api/*` request (see src/middleware.ts). This is the
   other half: what the person did before any request happened, and what broke
   without one. A view opened, an action clicked, a script that threw — none of
   those reach the server on their own, and they are exactly what is missing when
   someone says "the dashboard is broken" and every log looks fine.

   Batched, and never in the way:
     - events go into a buffer, flushed on a timer or when the batch fills;
     - the tab going away flushes with `sendBeacon`, which the browser delivers
       after the page is gone — a normal fetch there is cancelled on unload,
       which is precisely when a crash report is worth the most;
     - every failure is swallowed. Telemetry that can break the page it measures
       is worse than no telemetry.

   What is deliberately NOT collected: no keystrokes, no form values, no API key
   material, no query strings (`?token=`, `?state=` and `?code=` all appear on
   real routes here). An event is a name, a view, and small named counters. */

const ENDPOINT = "/api/activity";
const FLUSH_INTERVAL_MS = 10_000;
/* Matches the ingest cap upstream: a bigger batch would be refused whole. */
const MAX_BATCH = 100;
/* The buffer only reaches this if the server has been unreachable for a while.
   Past it the OLDEST events go, because during an incident the newest ones are
   what somebody is looking for. */
const MAX_BUFFERED = 200;

const SESSION_KEY = "cosmospay-activity-session";
const DEVICE_KEY = "cosmospay-activity-device";

/* Event names are LOWERCASE, dot-separated, `_` inside a word — the pattern the
   ingest endpoint validates (`^[a-z0-9][a-z0-9._:-]*$`, enforced in @/schemas/activity
   and again upstream). A name that does not match does not merely get rejected: it
   fails the whole batch it was queued in, so a camelCase name would take every event
   beside it and nothing here would say so. */

export type TrackLevel = "debug" | "info" | "warn" | "error";

export interface TrackOptions {
  level?: TrackLevel;
  category?: string;
  message?: string;
  durationMs?: number;
  props?: Record<string, unknown>;
}

interface QueuedEvent extends TrackOptions {
  type: string;
  eventId: string;
  occurredAt: string;
  sessionId: string;
  distinctId: string;
  platform: "dashboard";
}

let queue: QueuedEvent[] = [];
let timer: number | null = null;
let started = false;
/* The environment switch the dashboard is on, so an event lands against the same
   consumer environment as the data the user was looking at. Set by the shell. */
let env: "dev" | "prod" = "dev";

/** Random enough to key a batch on; never a user identifier. */
function randomId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }
}

/* One id per tab and one per browser. Both are opaque and neither is derived
   from the account: they group events, they do not identify a person. The
   account is already known server-side from the session, which is the whole
   reason these can stay anonymous. */
function storedId(store: Storage | undefined, key: string): string {
  try {
    const existing = store?.getItem(key);
    if (existing) return existing;
    const fresh = randomId();
    store?.setItem(key, fresh);
    return fresh;
  } catch {
    // Private mode, or storage disabled. An in-memory id still groups the events
    // of this page load, which is most of what it is for.
    return randomId();
  }
}

let sessionId = "";
let distinctId = "";

function ids(): { sessionId: string; distinctId: string } {
  if (!sessionId) sessionId = storedId(globalThis.sessionStorage, SESSION_KEY);
  if (!distinctId) distinctId = storedId(globalThis.localStorage, DEVICE_KEY);
  return { sessionId, distinctId };
}

/** Buffer one event. Safe to call from anywhere, including an error handler. */
export function track(type: string, options: TrackOptions = {}): void {
  try {
    if (typeof window === "undefined") return;
    const { sessionId, distinctId } = ids();
    queue.push({
      ...options,
      type,
      eventId: randomId(),
      occurredAt: new Date().toISOString(),
      sessionId,
      distinctId,
      platform: "dashboard",
    });
    if (queue.length > MAX_BUFFERED) queue.splice(0, queue.length - MAX_BUFFERED);
    if (queue.length >= MAX_BATCH) {
      flush();
      return;
    }
    schedule();
  } catch {
    /* never break the page */
  }
}

/** A view the user opened. Its own helper because it is the most common event. */
export function trackView(view: string): void {
  track("view.open", { category: "navigation", props: { view } });
}

/** Point telemetry at the environment the dashboard switch is on. */
export function setTrackEnv(next: "dev" | "prod"): void {
  env = next === "prod" ? "prod" : "dev";
}

function schedule(): void {
  if (timer !== null) return;
  timer = window.setTimeout(() => {
    timer = null;
    flush();
  }, FLUSH_INTERVAL_MS);
}

/**
 * Send what is buffered.
 *
 * `beacon` is used when the page is going away: a `fetch` started during
 * `pagehide` is cancelled with the document, and that is the moment a crash
 * report matters most. The events are taken off the queue before the call and
 * are not put back on failure — re-queueing would let an unreachable server grow
 * the buffer until it eventually reported a flood of stale events.
 */
export function flush(beacon = false): void {
  try {
    if (!queue.length) return;
    const batch = queue.slice(0, MAX_BATCH);
    queue = queue.slice(batch.length);
    const url = `${ENDPOINT}?env=${env}`;
    const body = JSON.stringify({ events: batch });

    if (beacon && typeof navigator !== "undefined" && navigator.sendBeacon) {
      navigator.sendBeacon(url, new Blob([body], { type: "application/json" }));
      return;
    }
    void fetch(url, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body,
      // Lets the request outlive the page when this runs during a navigation.
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* never break the page */
  }
}

/**
 * Wire the automatic captures: uncaught errors, rejected promises, and the flush
 * on the way out. Idempotent — the dashboard shell may mount twice in dev.
 */
export function startTracking(initialEnv: "dev" | "prod" = "dev"): void {
  setTrackEnv(initialEnv);
  if (started || typeof window === "undefined") return;
  started = true;

  window.addEventListener("error", (e) => {
    track("client.error", {
      level: "error",
      category: "error",
      message: e.message,
      // Where, not what: a source line plus position is enough to find it in a
      // sourcemap, and the surrounding code is not ours to ship anywhere.
      props: { source: e.filename, line: e.lineno, column: e.colno },
    });
  });

  window.addEventListener("unhandledrejection", (e) => {
    const reason = e.reason as unknown;
    track("client.unhandled_rejection", {
      level: "error",
      category: "error",
      message:
        reason instanceof Error
          ? reason.message
          : typeof reason === "string"
            ? reason
            : "Unhandled promise rejection",
    });
  });

  // `pagehide` rather than `unload`: `unload` never fires on mobile Safari and
  // disables the back/forward cache where it does.
  window.addEventListener("pagehide", () => flush(true));
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flush(true);
  });
}
