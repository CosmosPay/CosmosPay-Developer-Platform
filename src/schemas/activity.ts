/* Zod schemas for the client-activity feed.

   Two callers with the same body shape and very different trust: the dashboard
   (a session cookie, attributed to the signed-in account) and the wallet (no
   credential at all, forwarded anonymously). They share this schema on purpose —
   the bounds below are what keeps an UNAUTHENTICATED caller from turning the
   telemetry endpoint into free storage, so applying them to only one of the two
   would leave the hole exactly where it matters. */
import { z } from "zod";

/** Upstream accepts 100 per call; a larger batch would be rejected whole. */
export const ACTIVITY_MAX_BATCH = 100;

/* `type` and `category` are lowercase identifiers, not free prose: they are
   grouped on and filtered by prefix upstream, and letting arbitrary text in
   would make `payment.sent` and `Payment Sent ` two different event types. */
const eventName = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .regex(/^[a-z0-9][a-z0-9._:-]*$/, "type must be lowercase, e.g. payment.sent");

const categoryName = z
  .string()
  .trim()
  .min(1)
  .max(40)
  .regex(/^[a-z0-9][a-z0-9._-]*$/, "category must be lowercase, e.g. transaction");

export const activityEventSchema = z.object({
  type: eventName,
  level: z.enum(["debug", "info", "warn", "error"]).optional(),
  category: categoryName.optional(),
  // Truncated, never rejected — and with NO `.max()` in front of it, which is the
  // point: a length cap here would refuse the batch, and the batch is a telemetry
  // report whose most useful member is exactly the one carrying an unusually long
  // error string. The upstream truncates for the same reason.
  message: z.string().transform((m) => m.slice(0, 500)).optional(),
  sessionId: z.string().trim().max(64).optional(),
  distinctId: z.string().trim().max(64).optional(),
  appVersion: z.string().trim().max(40).optional(),
  platform: z.string().trim().max(40).optional(),
  network: z.string().trim().max(40).optional(),
  durationMs: z.number().int().min(0).max(86_400_000).optional(),
  props: z.record(z.string(), z.unknown()).optional(),
  occurredAt: z.string().datetime().optional(),
  eventId: z.string().trim().max(64).optional(),
});

export const activityBatchSchema = z.object({
  events: z.array(activityEventSchema).min(1).max(ACTIVITY_MAX_BATCH),
});

/* The wallet reports which network it was on; that decides which environment's
   consumer the batch lands under, exactly as every other wallet call does. */
export const walletTelemetryBodySchema = activityBatchSchema.extend({
  env: z.enum(["dev", "prod"]).optional(),
});

export type ActivityEventBody = z.infer<typeof activityEventSchema>;
