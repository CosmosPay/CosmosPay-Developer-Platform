/* OpenAPI registration for the client-activity feed (src/pages/api/activity/**) and the
   wallet's public telemetry drop (src/pages/api/telemetry.ts).

   Two ways in, with very different trust, which is the thing the reference has to make
   obvious: `/api/activity` is session-authenticated and every row is attributed to the
   signed-in account's consumer — nothing in the body decides that — while `/api/telemetry`
   takes no credential at all (a wallet install that never registered has none) and is
   forwarded anonymously under one dedicated consumer, rate-limited per address. */
import { errors, jsonOk, registerRoutes, sessionSecurity } from '@/lib/openapi/route-helpers';
import { z } from '@/lib/openapi/zod';
import { activityBatchSchema, walletTelemetryBodySchema } from '@/schemas/activity';
import { envQuery, jsonBody, skipQuery, takeQuery } from '@/schemas/shared/openapi-params';

const TAG = 'Activity';

const activityEventSchema = z
  .object({
    id: z.string().openapi({ example: 'evt_clx9z8a1b0000' }),
    source: z.string().openapi({ example: 'dashboard' }),
    level: z.string().openapi({ example: 'info' }),
    category: z.string().openapi({ example: 'transaction' }),
    type: z.string().openapi({ example: 'payment.sent' }),
    message: z.string().nullable().openapi({ example: null }),
    sessionId: z.string().nullable().openapi({ example: null }),
    distinctId: z.string().nullable().openapi({ example: null }),
    appVersion: z.string().nullable().openapi({ example: '1.4.2' }),
    platform: z.string().nullable().openapi({ example: 'web' }),
    network: z.string().nullable().openapi({ example: 'testnet' }),
    durationMs: z.number().int().nullable().openapi({ example: 812 }),
    props: z.record(z.string(), z.unknown()).nullable().openapi({ example: { intentId: 'clx9z8a1b' } }),
    ip: z.string().nullable().openapi({ example: null }),
    userAgent: z.string().nullable().openapi({ example: null }),
    at: z.string().openapi({ example: '2026-09-17T12:34:56.000Z', description: 'When it happened.' }),
    receivedAt: z.string().openapi({ example: '2026-09-17T12:34:58.000Z' }),
  })
  .openapi('ActivityEvent', { description: 'One recorded client event.' });

const activityListSchema = z
  .object({
    data: z.array(activityEventSchema),
    total: z.number().int().openapi({ example: 1 }),
    take: z.number().int().openapi({ example: 20 }),
    skip: z.number().int().openapi({ example: 0 }),
  })
  .openapi('ActivityEventList', { description: 'Paginated activity, newest first.' });

const countSchema = z.object({
  key: z.string().openapi({ example: 'error' }),
  count: z.number().int().openapi({ example: 3 }),
});

const activitySummarySchema = z
  .object({
    total: z.number().int().openapi({ example: 420 }),
    sessions: z.number().int().openapi({ example: 37 }),
    devices: z.number().int().openapi({ example: 25 }),
    levels: z.array(countSchema),
    sources: z.array(countSchema),
    categories: z.array(countSchema),
    topTypes: z.array(countSchema),
    topErrors: z.array(countSchema),
    series: z.array(
      z.object({
        date: z.string().openapi({ example: '2026-09-17' }),
        count: z.number().int().openapi({ example: 42 }),
        errors: z.number().int().openapi({ example: 2 }),
      }),
    ),
  })
  .openapi('ActivitySummary', {
    description: 'Rollup behind the activity view: counts per level/source/category, top types and errors, and a daily series.',
  });

const ingestResultSchema = z
  .object({
    accepted: z.number().int().openapi({ example: 3 }),
    duplicates: z
      .number()
      .int()
      .optional()
      .openapi({ example: 0, description: 'Events the upstream had already recorded (matched on `eventId`).' }),
  })
  .openapi('ActivityIngestResult');

registerRoutes([
  {
    method: 'post',
    path: '/api/activity',
    tags: [TAG],
    summary: 'Report dashboard activity',
    description:
      'Queues a batch of events from the dashboard (page views, actions, errors). Buffered rather than forwarded inline, so the answer means "queued", not "stored": `accepted` echoes the batch size. Attribution comes from the session, never from the body.',
    security: sessionSecurity,
    request: {
      query: z.object({ env: envQuery }),
      ...jsonBody(activityBatchSchema.openapi('ActivityBatchBody')),
    },
    responses: {
      200: jsonOk(ingestResultSchema, 'ReportActivityResponse', 'Events queued'),
      400: errors.badRequest,
      401: errors.unauthorized,
      500: errors.internalError,
    },
  },
  {
    method: 'get',
    path: '/api/activity',
    tags: [TAG],
    summary: 'Read the activity feed',
    description:
      "The signed-in account's events, newest first. `take`/`skip` that aren't positive numbers are dropped rather than forwarded, so a junk value reads as no filter instead of a 400.",
    security: sessionSecurity,
    request: {
      query: z.object({
        env: envQuery,
        source: z.string().optional().openapi({ param: { name: 'source', in: 'query' }, example: 'wallet' }),
        level: z.string().optional().openapi({ param: { name: 'level', in: 'query' }, example: 'error' }),
        category: z.string().optional().openapi({ param: { name: 'category', in: 'query' }, example: 'transaction' }),
        type: z.string().optional().openapi({ param: { name: 'type', in: 'query' }, example: 'payment.sent' }),
        network: z.string().optional().openapi({ param: { name: 'network', in: 'query' }, example: 'testnet' }),
        since: z.string().optional().openapi({ param: { name: 'since', in: 'query' }, example: '2026-09-01T00:00:00.000Z' }),
        until: z.string().optional().openapi({ param: { name: 'until', in: 'query' }, example: '2026-09-17T00:00:00.000Z' }),
        take: takeQuery,
        skip: skipQuery,
      }),
    },
    responses: {
      200: jsonOk(activityListSchema, 'ListActivityResponse', 'Activity fetched successfully'),
      400: errors.badRequest,
      401: errors.unauthorized,
      500: errors.internalError,
    },
  },
  {
    method: 'get',
    path: '/api/activity/summary',
    tags: [TAG],
    summary: 'Activity rollup',
    description:
      'Counts and a daily series for the activity view. `days` outside 1–90 is dropped, not clamped — the upstream owns the window bounds.',
    security: sessionSecurity,
    request: {
      query: z.object({
        env: envQuery,
        days: z.coerce.number().int().min(1).max(90).optional().openapi({ param: { name: 'days', in: 'query' }, example: 30 }),
        source: z.string().optional().openapi({ param: { name: 'source', in: 'query' }, example: 'wallet' }),
      }),
    },
    responses: {
      200: jsonOk(activitySummarySchema, 'ActivitySummaryResponse', 'Activity summary fetched successfully'),
      400: errors.badRequest,
      401: errors.unauthorized,
      500: errors.internalError,
    },
  },
  {
    method: 'post',
    path: '/api/telemetry',
    tags: [TAG],
    summary: 'Report wallet telemetry (public)',
    description:
      'Telemetry from the Cosmos Pay Wallet. PUBLIC — no credential, because a wallet install that never registered an account has none; batches are forwarded anonymously under one dedicated consumer, with the wallet address carried as the client IP so upstream budgets partition per device. Rate-limited per address and globally: 429 when the budget is spent. A batch that cannot be forwarded is discarded with 200 and `accepted: 0` rather than retried by the caller.',
    request: jsonBody(walletTelemetryBodySchema.openapi('WalletTelemetryBody')),
    responses: {
      200: jsonOk(ingestResultSchema, 'ReportTelemetryResponse', 'Events accepted'),
      400: errors.badRequest,
      429: {
        description: 'Too many telemetry batches — the per-address or global budget is spent',
        content: errors.badRequest.content,
      },
      500: errors.internalError,
    },
  },
]);
