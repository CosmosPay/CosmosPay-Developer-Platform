/* OpenAPI registration for the dashboard's payment-intent proxy routes
   (src/pages/api/payment-intents/**). Auto-loaded by src/lib/openapi/auto-load.ts.

   The request bodies are the SAME schemas the handlers validate with
   (src/schemas/payment-intents.ts), imported rather than restated, so a rule that
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
import { CHECKOUT_THEMES } from '@/lib/payments/checkout-themes';
import { NETWORK_IDS, type NetworkId } from '@/lib/chains';
import { DEPOSIT_STATUSES } from '@/lib/payments/deposits';

const NETWORKS = NETWORK_IDS as [NetworkId, ...NetworkId[]];

const TAG = 'Payment Intents';

export const paymentIntentSchema = z
  .object({
    id: z.string().openapi({ example: 'clx9z8a1b0000abcd1234efgh' }),
    kind: z.enum(['TX', 'PAY']).openapi({
      example: 'PAY',
      description: 'SEP-7 flavour: `PAY` is a payment link, `TX` carries an unsigned XDR.',
    }),
    chain: z.enum(NETWORKS).openapi({
      example: 'stellar',
      description:
        'Where the payment settles: any network the Payments API reaches. Stellar, Solana and Monad have their own wallet links; every other network is paid through a deposit address made for each payment, on mainnet only.',
    }),
    status: z
      .enum(['PENDING', 'SUBMITTED', 'SUCCEEDED', 'FAILED', 'CANCELLED', 'EXPIRED'])
      .openapi({ example: 'PENDING' }),
    network: z.string().openapi({ example: 'testnet', description: 'The tier on every chain: public (mainnet) or testnet (Solana devnet, Monad testnet).' }),
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
    checkoutTheme: z.enum(CHECKOUT_THEMES).openapi({
      example: 'classic',
      description: 'The hosted checkout design at payments.cosmospay.lat/{id}; `classic` when none was chosen.',
    }),
    merchantFee: z
      .object({
        bps: z.number().openapi({ example: 150 }),
        fixed: z.string().openapi({ example: '0.25' }),
        amount: z.string().openapi({ example: '0.6325', description: 'The fee charged, in `asset`.' }),
        asset: z.string().openapi({ example: 'native' }),
        wallet: z.string().openapi({ example: 'GBDHAQXQQ75WVBUZ2IX3O7ME7JOKJUOUPUXRNDCORUJODWQCTVUEQ62R' }),
        paidBy: z.enum(['recipient', 'payer']).openapi({ example: 'recipient' }),
      })
      .nullable()
      .optional()
      .openapi({
        description:
          'The organization\'s own fee on this payment, paid to its wallet in the same transaction; null without one. A Stellar payment link with one opens the hosted checkout, which asks for the payer\'s account.',
      }),
    paidFrom: z
      .object({
        depositId: z.string().openapi({ example: 'cmh4x2k9a0002l70g8v5q3z2x' }),
        chain: z.enum(NETWORKS).openapi({ example: 'tron' }),
        asset: z.string().openapi({ example: 'USDT' }),
        contract: z.string().nullable().openapi({ example: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t' }),
        amount: z.string().openapi({ example: '25.31' }),
      })
      .nullable()
      .optional()
      .openapi({ description: 'Where the payer paid from, when a payment from another network settled the intent; null otherwise.' }),
    depositLimits: z
      .object({
        perPayer: z.number().int().openapi({ example: 2, description: 'Open deposit addresses one payer may have on the link.' }),
        perWindow: z.number().int().openapi({ example: 20, description: 'New deposit addresses the link takes per window, from all payers.' }),
        windowSeconds: z.number().int().openapi({ example: 300 }),
      })
      .optional()
      .openapi({ description: 'The limits on payments from another network for this link, defaults filled in.' }),
    receiptTo: z
      .string()
      .nullable()
      .optional()
      .openapi({ example: 'payer@example.com', description: 'Where the receipt went: an email a payer gave in the hosted checkout (unverified); null until one was sent.' }),
    receiptSentAt: z
      .string()
      .nullable()
      .optional()
      .openapi({ example: null, description: 'When the receipt was emailed to the payer; null until it is.' }),
    receiptSkippedAt: z
      .string()
      .nullable()
      .optional()
      .openapi({ example: null, description: 'When it was decided that no receipt goes out: no email was given, or several payers gave different ones and none reported paying.' }),
    createdAt: z.string().openapi({ example: '2026-09-17T12:34:56.000Z' }),
    updatedAt: z.string().openapi({ example: '2026-09-17T12:34:56.000Z' }),
  })
  .openapi('PaymentIntent', {
    description: 'A payment link or unsigned transaction built by the Payments API.',
  });

const chainTxSchema = z.object({
  hash: z.string().openapi({ example: '0x9f2c...' }),
  explorerUrl: z.string().openapi({ example: 'https://basescan.org/tx/0x9f2c...' }),
});

const paymentDepositSchema = z
  .object({
    id: z.string().openapi({ example: 'cmh4x2k9a0002l70g8v5q3z2x' }),
    paymentLinkId: z.string().openapi({ example: 'cmh4x2k9a0001l70g8v5q3z2w' }),
    status: z.enum(DEPOSIT_STATUSES as [string, ...string[]]).openapi({ example: 'AWAITING_DEPOSIT' }),
    originChain: z.enum(NETWORKS).openapi({ example: 'tron' }),
    originAsset: z.string().openapi({ example: 'USDT' }),
    originContract: z.string().nullable().openapi({ example: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t' }),
    amountIn: z.string().openapi({ example: '25.31', description: 'What the payer sends; any surplus is refunded to `refundTo`.' }),
    minAmountIn: z.string().openapi({ example: '25.06' }),
    destinationChain: z.enum(NETWORKS).openapi({ example: 'base' }),
    destinationAsset: z.string().openapi({ example: 'USDC' }),
    destinationContract: z.string().nullable().openapi({ example: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913' }),
    amountOut: z.string().openapi({ example: '25', description: 'What the merchant receives: the intent amount.' }),
    feeBps: z.number().int().openapi({ example: 25 }),
    feeAmount: z.string().openapi({ example: '0.063275', description: "Cosmos Pay's commission, in the origin token, inside `amountIn`." }),
    refundTo: z.string().openapi({ example: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t' }),
    depositAddress: z.string().openapi({ example: 'TXYZopYRdj2D9XRtbG411XZZ3kM5VkAeBf' }),
    depositMemo: z.string().nullable().openapi({ example: null }),
    depositUri: z.string().nullable().openapi({ example: null }),
    qr: z.string().openapi({ example: 'data:image/png;base64,iVBORw0KGgo...' }),
    amountOutPaid: z.string().nullable().openapi({ example: null }),
    refundedAmount: z.string().nullable().openapi({ example: null }),
    originTxHashes: z.array(chainTxSchema).nullable(),
    destinationTxHashes: z.array(chainTxSchema).nullable(),
    timeEstimateSeconds: z.number().int().openapi({ example: 90 }),
    expiresAt: z.string().openapi({ example: '2026-11-16T14:00:00.000Z' }),
    createdAt: z.string().openapi({ example: '2026-11-16T13:00:00.000Z' }),
    updatedAt: z.string().openapi({ example: '2026-11-16T13:00:00.000Z' }),
  })
  .openapi('PaymentDeposit', {
    description: 'A deposit address made for paying one intent from another network, and how it went.',
  });

const paymentDepositListSchema = z
  .object({ data: z.array(paymentDepositSchema) })
  .openapi('PaymentDepositList', { description: "An intent's deposits, newest first." });

const paymentPayerEmailListSchema = z
  .object({
    data: z.array(
      z.object({
        email: z.string().openapi({ example: 'payer@example.com' }),
        lang: z.string().openapi({ example: 'es', description: 'The language of that checkout.' }),
        sentAt: z.string().nullable().openapi({ example: null, description: 'The last time that session reported its wallet sent the payment; null if it never did.' }),
        recordedAt: z.string().openapi({ example: '2026-11-17T12:00:00.000Z' }),
      }),
    ),
  })
  .openapi('PaymentPayerEmailList');

const paymentRouteCheckListSchema = z
  .object({
    data: z.array(
      z.object({
        chain: z.enum(NETWORKS).openapi({ example: 'tron' }),
        asset: z.string().openapi({ example: 'USDT' }),
        available: z.boolean().openapi({ example: false, description: 'True when the route quoted the amount.' }),
        reason: z.string().nullable().openapi({
          example: 'The cross-chain route refused the request: Temporary swap limits: minimum swap amount is $100',
          description: "Why not, in the route's words; null when available.",
        }),
        amount: z.string().nullable().openapi({ example: null, description: 'What the payer would send from there; null when not available.' }),
      }),
    ),
  })
  .openapi('PaymentRouteCheckList', {
    description: "How the main origins fare for a payment link's amount: the ones that cannot pay it now, and why.",
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
        chain: z
          .enum(NETWORKS)
          .optional()
          .openapi({
            param: { name: 'chain', in: 'query' },
            description: 'Only intents on this network; every network when omitted.',
            example: 'solana',
          }),
        createdFrom: z
          .string()
          .optional()
          .openapi({
            param: { name: 'createdFrom', in: 'query' },
            description: 'Only intents created at or after this instant (ISO 8601). An unparseable value is ignored.',
            example: '2026-10-01T00:00:00.000Z',
          }),
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
      'Creates a payment link on any network (`pay`; on every network but Stellar, Solana and Monad, mainnet only, with or without an amount) or a Stellar `tx` intent (unsigned XDR). Requires the `payments:create` permission in the organization the body names, and `destination` must be one of the wallets of that organization (`/api/organizations/{id}/wallets`; 400 otherwise). A merchant fee goes to one of its wallets too: on a network paid through a deposit address, one of its NEAR wallets or EVM addresses, where the cross-chain route credits it.',
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
    description: 'Updates the status, transaction hash, merchant reference, checkout design or the limits on payments from another network (`depositLimits`) of an intent.',
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
    method: 'get',
    path: '/api/payment-intents/{id}/deposits',
    tags: [TAG],
    summary: "List an intent's deposits from other networks",
    description:
      "The deposit addresses made for paying this intent from another network, newest first: what each payer chose to send, and how it went. An intent that is not the caller's reads as 404.",
    security: sessionSecurity,
    request: { params: idParam, query: z.object({ env: envQuery }) },
    responses: {
      200: jsonOk(paymentDepositListSchema, 'ListPaymentDepositsResponse', 'Deposits fetched successfully'),
      400: errors.badRequest,
      401: errors.unauthorized,
      404: errors.notFound,
      500: errors.internalError,
    },
  },
  {
    method: 'get',
    path: '/api/payment-intents/{id}/payer-emails',
    tags: [TAG],
    summary: 'List the emails payers gave in the hosted checkout',
    description:
      "One per checkout session of this link, newest first, with the session's language and when it reported its wallet sent the payment. Unverified: whoever opened the payment page typed them. The receipt goes to one of them (`receiptTo`), or to none when the payer cannot be told apart (`receiptSkippedAt`). An intent that is not the caller's reads as 404.",
    security: sessionSecurity,
    request: { params: idParam, query: z.object({ env: envQuery }) },
    responses: {
      200: jsonOk(paymentPayerEmailListSchema, 'PaymentPayerEmailsResponse', 'Payer emails fetched successfully'),
      400: errors.badRequest,
      401: errors.unauthorized,
      404: errors.notFound,
      500: errors.internalError,
    },
  },
  {
    method: 'get',
    path: '/api/payment-intents/{id}/route-check',
    tags: [TAG],
    summary: "Check a link's amount against the main origins",
    description:
      "Asks the cross-chain route whether the main origins (USDC and USDT on the networks most payers hold them on, and Bitcoin) can pay this link's amount, and why not when they cannot: routes have minimums of their own. A warning only, it never blocks the link; empty for a link without an amount or one that cannot be paid from another network. Budgeted by the Payments API (429). An intent that is not the caller's reads as 404.",
    security: sessionSecurity,
    request: { params: idParam, query: z.object({ env: envQuery }) },
    responses: {
      200: jsonOk(paymentRouteCheckListSchema, 'PaymentRouteCheckResponse', 'Route check fetched successfully'),
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
