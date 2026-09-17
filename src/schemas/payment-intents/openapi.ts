/* OpenAPI registration for the dashboard's payment-intent proxy routes
   (src/pages/api/payment-intents/**). Auto-loaded by src/lib/openapi/auto-load.ts.

   The request bodies are the SAME schemas the handlers validate with
   (src/schemas/payment-intents.ts) — imported rather than restated, so a rule that
   changes there cannot keep being documented here as it used to be. The response
   shapes mirror `PaymentIntent` in src/lib/cosmos.ts, which is what the Payments API
   returns and this platform forwards inside the envelope. */
import {
  errors,
  jsonCreated,
  jsonOk,
  registerRoutes,
  sessionSecurity,
} from '@/lib/openapi/route-helpers';
import { z } from '@/lib/openapi/zod';
import {
  createPaymentIntentBodySchema,
  updatePaymentIntentBodySchema,
  validatePaymentIntentBodySchema,
} from '@/schemas/payment-intents';
import {
  deletedAckSchema,
  envQuery,
  idParam,
  jsonBody,
  orgQuery,
  skipQuery,
  statusQuery,
  takeQuery,
} from '@/schemas/shared/openapi-params';

const TAG = 'Payment Intents';

export const paymentIntentSchema = z
  .object({
    id: z.string().openapi({ example: 'clx9z8a1b0000abcd1234efgh' }),
    kind: z.enum(['TX', 'PAY']).openapi({
      example: 'PAY',
      description: 'SEP-7 flavour: `PAY` is a payment link, `TX` carries an unsigned XDR.',
    }),
    status: z
      .enum(['PENDING', 'SUBMITTED', 'SUCCEEDED', 'FAILED', 'CANCELLED', 'EXPIRED'])
      .openapi({ example: 'PENDING' }),
    network: z.string().openapi({ example: 'testnet' }),
    source: z.string().nullable().openapi({ example: null }),
    destination: z
      .string()
      .openapi({ example: 'GA7QYNF7SOWQ3GLR2BGMZEHXAVIRZA4KVWLTJJFC7MGXUA74P7UJVSGZ' }),
    amount: z.string().nullable().openapi({ example: '25.5' }),
    asset: z.string().openapi({ example: 'XLM' }),
    assetIssuer: z.string().nullable().openapi({ example: null }),
    memo: z.string().openapi({ example: '123456789' }),
    msg: z.string().nullable().openapi({ example: 'Invoice #42' }),
    callback: z.string().nullable().openapi({ example: null }),
    xdr: z.string().nullable().openapi({ example: null }),
    uri: z.string().openapi({
      example: 'web+stellar:pay?destination=GA7QYNF7...&amount=25.5',
      description: 'SEP-7 deep link for the payer wallet.',
    }),
    qr: z.string().openapi({
      example: 'data:image/png;base64,iVBORw0KGgo...',
      description: 'PNG data URL of the SEP-7 URI.',
    }),
    txHash: z.string().nullable().openapi({ example: null }),
    reference: z.string().nullable().openapi({ example: null }),
    createdAt: z.string().openapi({ example: '2026-09-17T12:34:56.000Z' }),
    updatedAt: z.string().openapi({ example: '2026-09-17T12:34:56.000Z' }),
  })
  .openapi('PaymentIntent', {
    description: 'A payment link or unsigned transaction built by the Payments API.',
  });

const paymentIntentListSchema = z
  .object({
    data: z.array(paymentIntentSchema),
    total: z.number().int().openapi({ example: 1 }),
    take: z.number().int().openapi({ example: 20 }),
    skip: z.number().int().openapi({ example: 0 }),
  })
  .openapi('PaymentIntentList', { description: 'Paginated payment intents.' });

const validationOutcomeSchema = z
  .object({
    valid: z.boolean().openapi({ example: true }),
    status: z.string().openapi({ example: 'SUCCEEDED' }),
    reason: z.string().nullable().openapi({ example: null }),
    paymentIntent: paymentIntentSchema.optional(),
  })
  .openapi('PaymentIntentValidation', {
    description:
      'Result of checking a submitted Stellar transaction against the intent (success, destination, amount, memo).',
  });

registerRoutes([
  {
    method: 'get',
    path: '/api/payment-intents',
    tags: [TAG],
    summary: 'List payment intents',
    description:
      "Lists the signed-in account's payment intents for the selected environment. When `org` is supplied, membership is verified first.",
    security: sessionSecurity,
    request: {
      query: z.object({
        org: orgQuery,
        env: envQuery,
        status: statusQuery,
        take: takeQuery,
        skip: skipQuery,
      }),
    },
    responses: {
      200: jsonOk(
        paymentIntentListSchema,
        'ListPaymentIntentsResponse',
        'Payment intents fetched successfully',
      ),
      400: errors.badRequest,
      401: errors.unauthorized,
      403: errors.forbidden,
      500: errors.internalError,
    },
  },
  {
    method: 'post',
    path: '/api/payment-intents',
    tags: [TAG],
    summary: 'Create a payment intent',
    description:
      'Creates a SEP-7 `pay` link or a `tx` intent (unsigned XDR). Requires the `payments:create` permission in the organization the body names.',
    security: sessionSecurity,
    request: {
      query: z.object({ env: envQuery }),
      ...jsonBody(createPaymentIntentBodySchema.openapi('CreatePaymentIntentBody')),
    },
    responses: {
      201: jsonCreated(
        paymentIntentSchema,
        'CreatePaymentIntentResponse',
        'Payment intent created successfully',
      ),
      400: errors.badRequest,
      401: errors.unauthorized,
      403: errors.forbidden,
      500: errors.internalError,
    },
  },
  {
    method: 'get',
    path: '/api/payment-intents/{id}',
    tags: [TAG],
    summary: 'Get a payment intent',
    description: "Returns one payment intent. An intent that isn't the caller's reads as 404.",
    security: sessionSecurity,
    request: { params: idParam, query: z.object({ env: envQuery }) },
    responses: {
      200: jsonOk(
        paymentIntentSchema,
        'GetPaymentIntentResponse',
        'Payment intent retrieved successfully',
      ),
      400: errors.badRequest,
      401: errors.unauthorized,
      404: errors.notFound,
      500: errors.internalError,
    },
  },
  {
    method: 'patch',
    path: '/api/payment-intents/{id}',
    tags: [TAG],
    summary: 'Update a payment intent',
    description: 'Updates the status, transaction hash or merchant reference of an intent.',
    security: sessionSecurity,
    request: {
      params: idParam,
      query: z.object({ env: envQuery }),
      ...jsonBody(updatePaymentIntentBodySchema.openapi('UpdatePaymentIntentBody')),
    },
    responses: {
      200: jsonOk(
        paymentIntentSchema,
        'UpdatePaymentIntentResponse',
        'Payment intent updated successfully',
      ),
      400: errors.badRequest,
      401: errors.unauthorized,
      404: errors.notFound,
      500: errors.internalError,
    },
  },
  {
    method: 'delete',
    path: '/api/payment-intents/{id}',
    tags: [TAG],
    summary: 'Delete a payment intent',
    description: 'Deletes a payment intent upstream and records the action in the activity feed.',
    security: sessionSecurity,
    request: { params: idParam, query: z.object({ env: envQuery }) },
    responses: {
      200: jsonOk(
        deletedAckSchema,
        'DeletePaymentIntentResponse',
        'Payment intent deleted successfully',
      ),
      400: errors.badRequest,
      401: errors.unauthorized,
      404: errors.notFound,
      500: errors.internalError,
    },
  },
  {
    method: 'post',
    path: '/api/payment-intents/{id}/validate',
    tags: [TAG],
    summary: 'Validate a submitted transaction',
    description:
      'Checks a submitted Stellar transaction against the intent. The Payments API finalizes the status and fires the matching webhook event.',
    security: sessionSecurity,
    request: {
      params: idParam,
      query: z.object({ env: envQuery }),
      ...jsonBody(validatePaymentIntentBodySchema.openapi('ValidatePaymentIntentBody')),
    },
    responses: {
      200: jsonOk(
        validationOutcomeSchema,
        'ValidatePaymentIntentResponse',
        'Payment intent validated',
      ),
      400: errors.badRequest,
      401: errors.unauthorized,
      404: errors.notFound,
      500: errors.internalError,
    },
  },
]);
