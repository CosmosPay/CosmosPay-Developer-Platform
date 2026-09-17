/* OpenAPI registration for the in-app notification bell (src/pages/api/notifications/**).

   These are this platform's own rows, not the Payments API's: most are written by the
   system as a side effect of an action (a payment link created, an API key deleted),
   which is why creating one by hand is restricted to owner/admin accounts. */
import {
  errors,
  jsonCreated,
  jsonOk,
  registerRoutes,
  sessionSecurity,
} from '@/lib/openapi/route-helpers';
import { z } from '@/lib/openapi/zod';
import { jsonBody } from '@/schemas/shared/openapi-params';

const TAG = 'Notifications';

const notificationSchema = z
  .object({
    id: z.string().openapi({ example: 'ntf_clx9z8a1b0000' }),
    userId: z.string().openapi({ example: 'usr_abc' }),
    type: z.string().openapi({ example: 'payment.created' }),
    title: z.string().openapi({ example: 'Payment link created' }),
    message: z.string().nullable().openapi({ example: 'PAY link · 25.5 XLM' }),
    origin: z.string().nullable().openapi({
      example: 'Bogotá, CO',
      description: 'Where the action came from, resolved at write time (best effort).',
    }),
    country: z.string().nullable().openapi({ example: 'CO' }),
    region: z.string().nullable().openapi({ example: 'DC' }),
    ipAddress: z.string().nullable().openapi({ example: null }),
    read: z.boolean().openapi({ example: false }),
    metadata: z
      .record(z.string(), z.unknown())
      .nullable()
      .openapi({ example: { id: 'clx9z8a1b', network: 'testnet' } }),
    createdAt: z.string().openapi({ example: '2026-09-17T12:34:56.000Z' }),
  })
  .openapi('Notification', { description: 'One activity notification for an account.' });

const createNotificationBody = z
  .object({
    type: z.string().max(60).optional().openapi({ example: 'custom', description: 'Defaults to `custom`.' }),
    title: z.string().max(120).openapi({ example: 'Scheduled maintenance' }),
    message: z.string().max(500).optional().openapi({ example: 'The gateway will restart at 02:00 UTC.' }),
  })
  .openapi('CreateNotificationBody');

registerRoutes([
  {
    method: 'get',
    path: '/api/notifications',
    tags: [TAG],
    summary: 'List my notifications',
    description: 'The 50 most recent notifications for the signed-in account, newest first.',
    security: sessionSecurity,
    responses: {
      200: jsonOk(
        z.array(notificationSchema),
        'ListNotificationsResponse',
        'Notifications fetched successfully',
      ),
      401: errors.unauthorized,
      500: errors.internalError,
    },
  },
  {
    method: 'post',
    path: '/api/notifications',
    tags: [TAG],
    summary: 'Create a notification',
    description:
      'Owner/admin accounts only — a regular account can read its notifications but not write one, because the system generates them.',
    security: sessionSecurity,
    request: jsonBody(createNotificationBody),
    responses: {
      201: jsonCreated(
        notificationSchema,
        'CreateNotificationResponse',
        'Notification created successfully',
      ),
      400: errors.badRequest,
      401: errors.unauthorized,
      403: errors.forbidden,
      500: errors.internalError,
    },
  },
  {
    method: 'post',
    path: '/api/notifications/read',
    tags: [TAG],
    summary: 'Mark all as read',
    description: "Clears the bell badge. `updated` is how many rows changed.",
    security: sessionSecurity,
    responses: {
      200: jsonOk(
        z.object({ updated: z.number().int().openapi({ example: 3 }) }),
        'MarkNotificationsReadResponse',
        'Notifications marked read',
      ),
      401: errors.unauthorized,
      500: errors.internalError,
    },
  },
]);
