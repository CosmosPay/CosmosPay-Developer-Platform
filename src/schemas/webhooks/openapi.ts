/* OpenAPI registration for the webhook-endpoint proxy (src/pages/api/webhooks/**).

   The signing secret is the one field with a rule worth stating in the reference: the
   Payments API returns it on create and on rotate and NEVER again, so an integrator who
   does not store it there has to rotate to get another one. It is marked optional on the
   entity for exactly that reason. */
import {
  errors,
  jsonCreated,
  jsonOk,
  registerRoutes,
  sessionSecurity,
} from '@/lib/openapi/route-helpers';
import { z } from '@/lib/openapi/zod';
import { createWebhookBodySchema, updateWebhookBodySchema } from '@/schemas/cosmos-resources';
import {
  deletedAckSchema,
  envQuery,
  idParam,
  jsonBody,
  orgQuery,
  pathParam,
  skipQuery,
  statusQuery,
  takeQuery,
} from '@/schemas/shared/openapi-params';

const TAG = 'Webhooks';

/** Every event the Payments API can deliver (a delivery may carry any of them). */
const deliveryEventType = z.enum([
  'PAYMENT_INTENT_CREATED',
  'PAYMENT_INTENT_UPDATED',
  'PAYMENT_INTENT_SUCCEEDED',
  'PAYMENT_INTENT_FAILED',
  'PAYMENT_INTENT_CANCELLED',
  'PAYMENT_INTENT_DELETED',
  'RECEIVER_UPDATED',
  'PAYIN_CREATED',
  'PAYIN_UPDATED',
  'PAYIN_COMPLETED',
  'PAYOUT_CREATED',
  'PAYOUT_UPDATED',
  'PAYOUT_COMPLETED',
  'SWAP_CREATED',
  'SWAP_SUBMITTED',
  'SWAP_SUCCEEDED',
  'SWAP_FAILED',
  'SWAP_EXPIRED',
  'LIQUIDITY_CREATED',
  'LIQUIDITY_SUBMITTED',
  'LIQUIDITY_SUCCEEDED',
  'LIQUIDITY_FAILED',
  'LIQUIDITY_EXPIRED',
]);

const webhookEndpointSchema = z
  .object({
    id: z.string().openapi({ example: 'whe_clx9z8a1b0000' }),
    url: z.string().openapi({ example: 'https://merchant.example.com/hooks/cosmos' }),
    description: z.string().nullable().openapi({ example: 'Production listener' }),
    enabled: z.boolean().openapi({ example: true }),
    destinationBlocked: z.boolean().optional().openapi({
      example: false,
      description: 'Set upstream when the destination keeps failing and deliveries are paused.',
    }),
    eventTypes: z.array(deliveryEventType).openapi({ example: ['PAYMENT_INTENT_SUCCEEDED'] }),
    secret: z.string().optional().openapi({
      example: 'whsec_9f8c...',
      description:
        'Signing secret. Returned ONLY when the endpoint is created and when the secret is rotated — store it then, it is never shown again.',
    }),
    createdAt: z.string().openapi({ example: '2026-09-17T12:34:56.000Z' }),
    updatedAt: z.string().openapi({ example: '2026-09-17T12:34:56.000Z' }),
  })
  .openapi('WebhookEndpoint', { description: 'A registered webhook destination.' });

const webhookDeliverySchema = z
  .object({
    id: z.string().openapi({ example: 'whd_clx9z8a1b0000' }),
    endpointId: z.string().openapi({ example: 'whe_clx9z8a1b0000' }),
    eventType: deliveryEventType.openapi({ example: 'PAYMENT_INTENT_SUCCEEDED' }),
    eventId: z.string().openapi({ example: 'evt_clx9z8a1b0000' }),
    status: z.enum(['PENDING', 'SUCCEEDED', 'FAILED', 'RETRYING']).openapi({ example: 'SUCCEEDED' }),
    attempts: z.number().int().openapi({ example: 1 }),
    responseStatus: z.number().int().nullable().openapi({ example: 200 }),
    error: z.string().nullable().openapi({ example: null }),
    lastAttemptAt: z.string().nullable().openapi({ example: '2026-09-17T12:35:01.000Z' }),
    createdAt: z.string().openapi({ example: '2026-09-17T12:34:56.000Z' }),
    updatedAt: z.string().openapi({ example: '2026-09-17T12:35:01.000Z' }),
  })
  .openapi('WebhookDelivery', { description: 'One delivery attempt record.' });

const webhookDeliveryListSchema = z
  .object({
    data: z.array(webhookDeliverySchema),
    total: z.number().int().openapi({ example: 1 }),
    take: z.number().int().openapi({ example: 20 }),
    skip: z.number().int().openapi({ example: 0 }),
  })
  .openapi('WebhookDeliveryList', { description: 'Paginated delivery history.' });

const webhookPingSchema = z
  .object({
    ok: z.boolean().openapi({ example: true }),
    responseStatus: z.number().int().nullable().openapi({ example: 200 }),
    error: z.string().nullable().openapi({ example: null }),
  })
  .openapi('WebhookPing', { description: 'Outcome of the test event.' });

const writeQuery = z.object({ org: orgQuery, env: envQuery });
const deliveryParams = idParam.extend(pathParam('deliveryId', 'whd_clx9z8a1b0000').shape);

registerRoutes([
  {
    method: 'get',
    path: '/api/webhooks',
    tags: [TAG],
    summary: 'List webhook endpoints',
    description: 'Lists the registered endpoints for the selected environment.',
    security: sessionSecurity,
    request: { query: z.object({ env: envQuery }) },
    responses: {
      200: jsonOk(
        z.array(webhookEndpointSchema),
        'ListWebhooksResponse',
        'Webhooks fetched successfully',
      ),
      400: errors.badRequest,
      401: errors.unauthorized,
      500: errors.internalError,
    },
  },
  {
    method: 'post',
    path: '/api/webhooks',
    tags: [TAG],
    summary: 'Create a webhook endpoint',
    description:
      'Registers a destination. The response carries the signing secret — the only time it is returned. Requires `webhooks:create` when `org` is supplied.',
    security: sessionSecurity,
    request: {
      query: writeQuery,
      ...jsonBody(createWebhookBodySchema.openapi('CreateWebhookBody')),
    },
    responses: {
      201: jsonCreated(
        webhookEndpointSchema,
        'CreateWebhookResponse',
        'Webhook created successfully',
      ),
      400: errors.badRequest,
      401: errors.unauthorized,
      403: errors.forbidden,
      500: errors.internalError,
    },
  },
  {
    method: 'get',
    path: '/api/webhooks/{id}',
    tags: [TAG],
    summary: 'Get a webhook endpoint',
    description: 'Returns one endpoint. The signing secret is not included.',
    security: sessionSecurity,
    request: { params: idParam, query: z.object({ env: envQuery }) },
    responses: {
      200: jsonOk(
        webhookEndpointSchema,
        'GetWebhookResponse',
        'Webhook retrieved successfully',
      ),
      400: errors.badRequest,
      401: errors.unauthorized,
      404: errors.notFound,
      500: errors.internalError,
    },
  },
  {
    method: 'patch',
    path: '/api/webhooks/{id}',
    tags: [TAG],
    summary: 'Update a webhook endpoint',
    description:
      'Changes the URL, description, event types or enabled flag. Requires `webhooks:edit` when `org` is supplied.',
    security: sessionSecurity,
    request: {
      params: idParam,
      query: writeQuery,
      ...jsonBody(updateWebhookBodySchema.openapi('UpdateWebhookBody')),
    },
    responses: {
      200: jsonOk(webhookEndpointSchema, 'UpdateWebhookResponse', 'Webhook updated successfully'),
      400: errors.badRequest,
      401: errors.unauthorized,
      403: errors.forbidden,
      404: errors.notFound,
      500: errors.internalError,
    },
  },
  {
    method: 'delete',
    path: '/api/webhooks/{id}',
    tags: [TAG],
    summary: 'Delete a webhook endpoint',
    description: 'Removes the endpoint. Requires `webhooks:delete` when `org` is supplied.',
    security: sessionSecurity,
    request: { params: idParam, query: writeQuery },
    responses: {
      200: jsonOk(deletedAckSchema, 'DeleteWebhookResponse', 'Webhook deleted successfully'),
      400: errors.badRequest,
      401: errors.unauthorized,
      403: errors.forbidden,
      404: errors.notFound,
      500: errors.internalError,
    },
  },
  {
    method: 'post',
    path: '/api/webhooks/{id}/ping',
    tags: [TAG],
    summary: 'Send a test event',
    description:
      'Delivers a test event to the endpoint and reports what the destination answered. Requires `webhooks:edit` when `org` is supplied.',
    security: sessionSecurity,
    request: { params: idParam, query: writeQuery },
    responses: {
      200: jsonOk(webhookPingSchema, 'PingWebhookResponse', 'Test event sent'),
      400: errors.badRequest,
      401: errors.unauthorized,
      403: errors.forbidden,
      404: errors.notFound,
      500: errors.internalError,
    },
  },
  {
    method: 'post',
    path: '/api/webhooks/{id}/rotate-secret',
    tags: [TAG],
    summary: 'Rotate the signing secret',
    description:
      'Issues a new signing secret and returns it — the only other time it is returned. The previous secret stops validating immediately. Requires `webhooks:edit` when `org` is supplied.',
    security: sessionSecurity,
    request: { params: idParam, query: writeQuery },
    responses: {
      200: jsonOk(
        webhookEndpointSchema,
        'RotateWebhookSecretResponse',
        'Signing secret rotated',
      ),
      400: errors.badRequest,
      401: errors.unauthorized,
      403: errors.forbidden,
      404: errors.notFound,
      500: errors.internalError,
    },
  },
  {
    method: 'get',
    path: '/api/webhooks/{id}/deliveries',
    tags: [TAG],
    summary: 'List deliveries',
    description: 'Delivery history for one endpoint, newest first.',
    security: sessionSecurity,
    request: {
      params: idParam,
      query: z.object({ env: envQuery, status: statusQuery, take: takeQuery, skip: skipQuery }),
    },
    responses: {
      200: jsonOk(
        webhookDeliveryListSchema,
        'ListWebhookDeliveriesResponse',
        'Deliveries fetched successfully',
      ),
      400: errors.badRequest,
      401: errors.unauthorized,
      404: errors.notFound,
      500: errors.internalError,
    },
  },
  {
    method: 'post',
    path: '/api/webhooks/{id}/deliveries/{deliveryId}/redeliver',
    tags: [TAG],
    summary: 'Re-send a delivery',
    description:
      'Replays one delivery against the endpoint. Requires `webhooks:edit` when `org` is supplied.',
    security: sessionSecurity,
    request: { params: deliveryParams, query: writeQuery },
    responses: {
      200: jsonOk(webhookDeliverySchema, 'RedeliverWebhookResponse', 'Delivery re-sent'),
      400: errors.badRequest,
      401: errors.unauthorized,
      403: errors.forbidden,
      404: errors.notFound,
      500: errors.internalError,
    },
  },
]);
