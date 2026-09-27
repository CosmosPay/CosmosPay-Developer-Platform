/* OpenAPI registration for the AMM liquidity-pool proxy (src/pages/api/liquidity/**).

   Non-custodial, like swaps: the Payments API prices the operation against the pool's
   on-chain reserves and returns an UNSIGNED transaction (XDR + SEP-7 URI + QR). Nothing
   moves until the signed envelope comes back to `/submit`.

   As with swaps there is deliberately NO fee field in any request body — the commission
   is the calling organization's plan rate, resolved server-side and reported back in the
   `fee*` fields of the operation. Every route here REQUIRES `?org=`: without one the
   request is 400, not a guess at which workspace to charge. */
import {
  errors,
  jsonCreated,
  jsonOk,
  registerRoutes,
  sessionSecurity,
} from '@/lib/openapi/route-helpers';
import { z } from '@/lib/openapi/zod';
import {
  depositLiquidityBodySchema,
  submitLiquidityBodySchema,
  withdrawLiquidityBodySchema,
} from '@/schemas/liquidity';
import {
  envQuery,
  idParam,
  jsonBody,
  requiredOrgQuery,
  skipQuery,
  statusQuery,
  takeQuery,
} from '@/schemas/shared/openapi-params';

const TAG = 'Liquidity';

const operationStatus = z
  .enum(['PENDING', 'SUBMITTED', 'SUCCEEDED', 'FAILED', 'EXPIRED'])
  .openapi({ example: 'PENDING' });

const reserveSchema = z
  .object({
    asset: z.string().openapi({ example: 'native' }),
    issuer: z.string().nullable().openapi({ example: null }),
    amount: z.string().openapi({ example: '12500.0000000' }),
  })
  .openapi('LiquidityReserve', { description: 'One side of a pool, as Horizon reports it.' });

const poolSchema = z
  .object({
    id: z.string().openapi({ example: '3a1b…64hex' }),
    network: z.string().openapi({ example: 'testnet' }),
    feeBp: z.number().int().openapi({ example: 30, description: "The pool's own fee in basis points." }),
    totalTrustlines: z.string().openapi({ example: '128' }),
    totalShares: z.string().openapi({ example: '9000.0000000' }),
    reserves: z.array(reserveSchema),
  })
  .openapi('LiquidityPool', { description: 'An on-chain AMM pool.' });

const poolListSchema = z
  .object({
    data: z.array(poolSchema),
    cursor: z.string().nullable().openapi({
      example: null,
      description: 'Horizon paging cursor — pass it back as `cursor` for the next page.',
    }),
  })
  .openapi('LiquidityPoolList', { description: 'Cursor-paged pools.' });

const positionSchema = z
  .object({
    poolId: z.string().openapi({ example: '3a1b…64hex' }),
    shares: z.string().openapi({ example: '150.0000000' }),
    totalShares: z.string().openapi({ example: '9000.0000000' }),
    shareOfPoolBps: z.number().int().openapi({ example: 166 }),
    reserves: z.array(reserveSchema),
    redeemable: z
      .array(reserveSchema)
      .openapi({ description: 'What the held shares would return at the current reserves.' }),
  })
  .openapi('LiquidityPosition', { description: "An account's stake in one pool." });

const positionListSchema = z
  .object({
    account: z
      .string()
      .openapi({ example: 'GA7QYNF7SOWQ3GLR2BGMZEHXAVIRZA4KVWLTJJFC7MGXUA74P7UJVSGZ' }),
    network: z.string().openapi({ example: 'testnet' }),
    data: z.array(positionSchema),
  })
  .openapi('LiquidityPositionList');

const operationSchema = z
  .object({
    id: z.string().openapi({ example: 'clx9z8a1b0000abcd1234efgh' }),
    kind: z.enum(['DEPOSIT', 'WITHDRAW']).openapi({ example: 'DEPOSIT' }),
    status: operationStatus,
    network: z.string().openapi({ example: 'testnet' }),
    source: z
      .string()
      .openapi({ example: 'GA7QYNF7SOWQ3GLR2BGMZEHXAVIRZA4KVWLTJJFC7MGXUA74P7UJVSGZ' }),
    poolId: z.string().openapi({ example: '3a1b…64hex' }),
    assetA: z.string().openapi({ example: 'native' }),
    assetAIssuer: z.string().nullable().openapi({ example: null }),
    assetB: z.string().openapi({ example: 'USDC' }),
    assetBIssuer: z
      .string()
      .nullable()
      .openapi({ example: 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTR6F3DSZL5A3W4G4M4N4A5U4QY3T6' }),
    amountA: z.string().openapi({ example: '100.0000000' }),
    amountB: z.string().openapi({ example: '24.8100000' }),
    shares: z.string().nullable().openapi({ example: '49.5000000' }),
    minPrice: z.string().nullable().openapi({ example: '0.2400000' }),
    maxPrice: z.string().nullable().openapi({ example: '0.2600000' }),
    slippageBps: z.number().int().openapi({ example: 50 }),
    feeBps: z
      .number()
      .int()
      .openapi({ example: 50, description: 'Plan commission, skimmed from both assets. 0 when none applies.' }),
    feeAmountA: z.string().openapi({ example: '0.5000000' }),
    feeAmountB: z.string().openapi({ example: '0.1240000' }),
    feeWallet: z.string().nullable().openapi({ example: null }),
    commissionMemo: z.string().nullable().openapi({ example: 'Cosmos Liquidity Commission' }),
    xdr: z.string().openapi({
      example: 'AAAAAgAAAAB...',
      description: 'Unsigned transaction — sign it and send it to `/submit`.',
    }),
    uri: z.string().openapi({ example: 'web+stellar:tx?xdr=AAAAAgAAAAB...' }),
    txHash: z.string().openapi({ example: '3389e9f0…64hex' }),
    qr: z.string().openapi({ example: 'data:image/png;base64,iVBORw0KGgo...' }),
    expiresAt: z.string().nullable().openapi({ example: '2026-09-17T13:04:56.000Z' }),
    createdAt: z.string().openapi({ example: '2026-09-17T12:34:56.000Z' }),
    updatedAt: z.string().openapi({ example: '2026-09-17T12:34:56.000Z' }),
  })
  .openapi('LiquidityOperation', {
    description: 'A persisted deposit/withdraw with the unsigned transaction to sign.',
  });

const operationListSchema = z
  .object({
    data: z.array(operationSchema),
    total: z.number().int().openapi({ example: 1 }),
    take: z.number().int().openapi({ example: 20 }),
    skip: z.number().int().openapi({ example: 0 }),
  })
  .openapi('LiquidityOperationList', { description: 'Paginated liquidity operations.' });

const submitOutcomeSchema = z
  .object({
    submitted: z.boolean().openapi({ example: true }),
    status: operationStatus,
    txHash: z.string().optional().openapi({ example: '3389e9f0…64hex' }),
    reason: z.string().optional().openapi({ example: 'Transaction rejected by the network' }),
    resultCodes: z.array(z.string()).optional().openapi({ example: ['op_under_dest_min'] }),
    operation: operationSchema,
  })
  .openapi('LiquiditySubmitOutcome', { description: 'Result of relaying the signed envelope.' });

const orgScope = z.object({ org: requiredOrgQuery, env: envQuery });

registerRoutes([
  {
    method: 'get',
    path: '/api/liquidity/pools',
    tags: [TAG],
    summary: 'Browse liquidity pools',
    description:
      'Lists on-chain pools through the Payments API (Horizon). Filter by either asset, or by `account` to see only the pools an account holds shares in.',
    security: sessionSecurity,
    request: {
      query: z.object({
        org: requiredOrgQuery,
        env: envQuery,
        assetACode: z.string().optional().openapi({ param: { name: 'assetACode', in: 'query' }, example: 'XLM' }),
        assetAIssuer: z.string().optional().openapi({ param: { name: 'assetAIssuer', in: 'query' } }),
        assetBCode: z.string().optional().openapi({ param: { name: 'assetBCode', in: 'query' }, example: 'USDC' }),
        assetBIssuer: z.string().optional().openapi({ param: { name: 'assetBIssuer', in: 'query' } }),
        account: z.string().optional().openapi({
          param: { name: 'account', in: 'query' },
          example: 'GA7QYNF7SOWQ3GLR2BGMZEHXAVIRZA4KVWLTJJFC7MGXUA74P7UJVSGZ',
        }),
        cursor: z.string().optional().openapi({ param: { name: 'cursor', in: 'query' } }),
        limit: z.coerce.number().int().optional().openapi({ param: { name: 'limit', in: 'query' }, example: 20 }),
      }),
    },
    responses: {
      200: jsonOk(poolListSchema, 'ListLiquidityPoolsResponse', 'Liquidity pools fetched successfully'),
      400: errors.badRequest,
      401: errors.unauthorized,
      403: errors.forbidden,
      500: errors.internalError,
    },
  },
  {
    method: 'get',
    path: '/api/liquidity/pools/{id}',
    tags: [TAG],
    summary: 'Get a liquidity pool',
    description: 'Returns one pool by its 64-character hex id.',
    security: sessionSecurity,
    request: { params: idParam, query: orgScope },
    responses: {
      200: jsonOk(poolSchema, 'GetLiquidityPoolResponse', 'Liquidity pool fetched successfully'),
      400: errors.badRequest,
      401: errors.unauthorized,
      403: errors.forbidden,
      404: errors.notFound,
      500: errors.internalError,
    },
  },
  {
    method: 'get',
    path: '/api/liquidity/positions',
    tags: [TAG],
    summary: 'List an account’s positions',
    description:
      'Pool shares held by a Stellar account, with what they would redeem for now. `account` is required and must be a `G…` address.',
    security: sessionSecurity,
    request: {
      query: z.object({
        org: requiredOrgQuery,
        env: envQuery,
        account: z.string().openapi({
          param: { name: 'account', in: 'query' },
          example: 'GA7QYNF7SOWQ3GLR2BGMZEHXAVIRZA4KVWLTJJFC7MGXUA74P7UJVSGZ',
        }),
      }),
    },
    responses: {
      200: jsonOk(positionListSchema, 'ListLiquidityPositionsResponse', 'Liquidity positions fetched successfully'),
      400: errors.badRequest,
      401: errors.unauthorized,
      403: errors.forbidden,
      500: errors.internalError,
    },
  },
  {
    method: 'post',
    path: '/api/liquidity/deposit',
    tags: [TAG],
    summary: 'Build a deposit',
    description:
      'Prices a deposit and returns the unsigned transaction (a pool-share trustline is added when the account has none). Requires `payments:create` in the organization. Nothing is deposited until `/submit`.',
    security: sessionSecurity,
    request: jsonBody(depositLiquidityBodySchema.openapi('DepositLiquidityBody')),
    responses: {
      201: jsonCreated(operationSchema, 'DepositLiquidityResponse', 'Liquidity deposit created successfully'),
      400: errors.badRequest,
      401: errors.unauthorized,
      403: errors.forbidden,
      500: errors.internalError,
    },
  },
  {
    method: 'post',
    path: '/api/liquidity/withdraw',
    tags: [TAG],
    summary: 'Build a withdrawal',
    description:
      'Prices a withdrawal of pool shares and returns the unsigned transaction. Requires `payments:create` in the organization.',
    security: sessionSecurity,
    request: jsonBody(withdrawLiquidityBodySchema.openapi('WithdrawLiquidityBody')),
    responses: {
      201: jsonCreated(operationSchema, 'WithdrawLiquidityResponse', 'Liquidity withdrawal created successfully'),
      400: errors.badRequest,
      401: errors.unauthorized,
      403: errors.forbidden,
      500: errors.internalError,
    },
  },
  {
    method: 'get',
    path: '/api/liquidity/operations',
    tags: [TAG],
    summary: 'List liquidity operations',
    description: "The organization's deposits and withdrawals.",
    security: sessionSecurity,
    request: {
      query: z.object({
        org: requiredOrgQuery,
        env: envQuery,
        kind: z
          .enum(['DEPOSIT', 'WITHDRAW'])
          .optional()
          .openapi({ param: { name: 'kind', in: 'query' } }),
        status: statusQuery,
        take: takeQuery,
        skip: skipQuery,
      }),
    },
    responses: {
      200: jsonOk(operationListSchema, 'ListLiquidityOperationsResponse', 'Liquidity operations fetched successfully'),
      400: errors.badRequest,
      401: errors.unauthorized,
      403: errors.forbidden,
      500: errors.internalError,
    },
  },
  {
    method: 'get',
    path: '/api/liquidity/operations/{id}',
    tags: [TAG],
    summary: 'Get a liquidity operation',
    description: 'Returns one operation, including the transaction built for it.',
    security: sessionSecurity,
    request: { params: idParam, query: orgScope },
    responses: {
      200: jsonOk(operationSchema, 'GetLiquidityOperationResponse', 'Liquidity operation fetched successfully'),
      400: errors.badRequest,
      401: errors.unauthorized,
      403: errors.forbidden,
      404: errors.notFound,
      500: errors.internalError,
    },
  },
  {
    method: 'post',
    path: '/api/liquidity/operations/{id}/submit',
    tags: [TAG],
    summary: 'Submit a signed liquidity operation',
    description:
      "Relays the signed transaction to the network. The Payments API checks the signed envelope's hash against the one it built before broadcasting. Requires `payments:create` in the organization.",
    security: sessionSecurity,
    request: {
      params: idParam,
      query: orgScope,
      ...jsonBody(submitLiquidityBodySchema.openapi('SubmitLiquidityBody')),
    },
    responses: {
      200: jsonOk(submitOutcomeSchema, 'SubmitLiquidityResponse', 'Liquidity operation submitted'),
      400: errors.badRequest,
      401: errors.unauthorized,
      403: errors.forbidden,
      404: errors.notFound,
      500: errors.internalError,
    },
  },
]);
