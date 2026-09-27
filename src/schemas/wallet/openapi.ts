/* OpenAPI registration for the Cosmos Pay Wallet provisioning flows
   (src/pages/api/wallet/**).

   PUBLIC ROUTES — and the reason is worth stating once here rather than per operation: the
   wallet is open-source, so there is no shared secret to hold. What authenticates a call is
   either a Stellar signature over a canonical challenge (register/link) or possession of a
   one-time claim token issued to the initiating wallet (claim/verify). Every one of them is
   rate-limited per address, which is what the 429s below mean.

   A CONVENTION THAT SURPRISES CALLERS: the outcome of `claim` and `link/verify` rides in
   `data.status` with HTTP 200 — `pending`, `expired`, `claimed`, `invalid` are not error
   codes here. The wallet polls these and branches on `data.status`;
   only a malformed request (400), a bad signature (401), a spent budget (429) or a broken
   dependency (5xx) come back as HTTP errors. */
import {
  errors,
  jsonCreated,
  jsonOk,
  registerRoutes,
} from '@/lib/openapi/route-helpers';
import { z } from '@/lib/openapi/zod';
import {
  walletClaimBodySchema,
  walletLinkBodySchema,
  walletLinkVerifyBodySchema,
  walletRegisterBodySchema,
} from '@/schemas/wallet';
import { envQuery, jsonBody, pathParam } from '@/schemas/shared/openapi-params';

const TAG = 'Wallet';

const walletKeysSchema = z
  .object({
    dev: z.string().nullable().openapi({ example: 'cosmos_dev_9f8c…' }),
    prod: z.string().nullable().openapi({ example: null }),
  })
  .openapi('WalletKeys', {
    description: 'The wallet-scoped API keys, one per environment. Handed over exactly once.',
  });

const rateLimited = {
  description: 'Rate limited — wait before retrying',
  content: errors.badRequest.content,
};
const emailUnavailable = {
  description: 'Email delivery is not available right now',
  content: errors.internalError.content,
};

/* ---- register / claim ---- */

const registerPendingSchema = z
  .object({
    status: z.literal('pending'),
    claimToken: z.string().openapi({
      example: 'wct_9f8c…',
      description: 'Present it to `/api/wallet/claim` once the email is confirmed.',
    }),
    expiresInSeconds: z.number().int().openapi({ example: 3600 }),
  })
  .openapi('WalletRegisterPending');

const registerExistsSchema = z
  .object({ status: z.literal('exists') })
  .openapi('WalletRegisterExists', {
    description:
      'An account already exists for that email. Deliberately says no more than that — use the link flow instead.',
  });

const claimResultSchema = z
  .union([
    z
      .object({
        status: z.literal('ready'),
        organizationId: z.string().openapi({ example: 'org_123' }),
        keys: walletKeysSchema,
      })
      .openapi('WalletClaimReady'),
    z.object({ status: z.literal('pending') }).openapi('WalletClaimPending'),
    z.object({ status: z.literal('claimed') }).openapi('WalletClaimAlreadyClaimed'),
    z.object({ status: z.literal('expired') }).openapi('WalletClaimExpired'),
  ])
  .openapi('WalletClaimResult', {
    description:
      '`ready` carries the keys and retires the registration; `pending` means the email is still unconfirmed; `claimed` and `expired` are terminal.',
  });

const linkSentSchema = z
  .object({
    status: z.literal('sent'),
    claimToken: z.string().openapi({ example: 'wct_9f8c…' }),
    expiresInSeconds: z.number().int().openapi({ example: 900 }),
  })
  .openapi('WalletLinkSent');

const linkNotFoundSchema = z
  .object({ status: z.literal('not_found') })
  .openapi('WalletLinkNotFound', {
    description: 'No account for that email — register instead.',
  });

const linkVerifyResultSchema = z
  .union([
    z
      .object({
        status: z.literal('ready'),
        organizationId: z.string().openapi({ example: 'org_123' }),
        keys: walletKeysSchema,
      })
      .openapi('WalletLinkReady'),
    z
      .object({
        status: z.literal('invalid'),
        attemptsLeft: z.number().int().openapi({ example: 2 }),
      })
      .openapi('WalletLinkInvalidCode'),
    z.object({ status: z.literal('expired') }).openapi('WalletLinkExpired'),
    z.object({ status: z.literal('locked') }).openapi('WalletLinkLocked', {
      description: 'Too many wrong codes — request a new one.',
    }),
  ])
  .openapi('WalletLinkVerifyResult');

registerRoutes([
  {
    method: 'post',
    path: '/api/wallet/register',
    tags: [TAG],
    summary: 'Start wallet account provisioning (public)',
    description:
      'Verifies a Stellar signature over the registration challenge and, when the email is free, emails a confirmation link. No account exists until that link is clicked. 201 carries the one-time `claimToken`; 200 means the email already has an account.',
    request: jsonBody(walletRegisterBodySchema.openapi('WalletRegisterBody')),
    responses: {
      201: jsonCreated(
        registerPendingSchema,
        'WalletRegisterPendingResponse',
        'Check your email to confirm and finish creating your account',
      ),
      200: jsonOk(
        registerExistsSchema,
        'WalletRegisterExistsResponse',
        'An account already exists for this email',
      ),
      400: errors.badRequest,
      401: {
        description: 'The Stellar signature does not match the address',
        content: errors.unauthorized.content,
      },
      429: rateLimited,
      500: errors.internalError,
      503: emailUnavailable,
    },
  },
  {
    method: 'post',
    path: '/api/wallet/claim',
    tags: [TAG],
    summary: 'Claim the provisioned API keys (public)',
    description:
      'Exchanges the one-time claim token (plus the matching Stellar address) for the wallet API keys, once the email is confirmed. The keys are returned exactly once — a second call answers `claimed`. The outcome is in `data.status`, always with HTTP 200.',
    request: jsonBody(walletClaimBodySchema.openapi('WalletClaimBody')),
    responses: {
      200: jsonOk(claimResultSchema, 'WalletClaimResponse', 'Claim outcome'),
      400: errors.badRequest,
      500: errors.internalError,
    },
  },
  {
    method: 'post',
    path: '/api/wallet/link',
    tags: [TAG],
    summary: 'Start linking an existing account (public)',
    description:
      'For an email that already has an account: verifies the Stellar signature and emails a one-time six-digit code. 201 carries the `claimToken` to present with that code; 200 `not_found` means there is no account yet, so register instead.',
    request: jsonBody(walletLinkBodySchema.openapi('WalletLinkBody')),
    responses: {
      201: jsonCreated(linkSentSchema, 'WalletLinkSentResponse', 'Access code emailed'),
      200: jsonOk(linkNotFoundSchema, 'WalletLinkNotFoundResponse', 'No account for this email'),
      400: errors.badRequest,
      401: {
        description: 'The Stellar signature does not match the address',
        content: errors.unauthorized.content,
      },
      429: rateLimited,
      500: errors.internalError,
      503: emailUnavailable,
    },
  },
  {
    method: 'post',
    path: '/api/wallet/link/verify',
    tags: [TAG],
    summary: 'Finish linking with the emailed code (public)',
    description:
      'Exchanges the six-digit code and the claim token for the existing account’s wallet keys. Wrong codes answer `invalid` with the attempts left; too many lock the attempt. Always HTTP 200 — branch on `data.status`.',
    request: jsonBody(walletLinkVerifyBodySchema.openapi('WalletLinkVerifyBody')),
    responses: {
      200: jsonOk(linkVerifyResultSchema, 'WalletLinkVerifyResponse', 'Link outcome'),
      400: errors.badRequest,
      500: errors.internalError,
    },
  },
  {
    method: 'get',
    path: '/api/wallet/verify',
    tags: [TAG],
    summary: 'Confirm the emailed link (public, HTML)',
    description:
      'The one-time link sent during provisioning. Clicking it proves the person owns the email, which creates the account and mints the wallet keys for the wallet to claim. Answers an HTML page, not JSON — 200 on success, 400 when the token is missing, expired or already used.',
    request: {
      query: z.object({
        token: z.string().openapi({
          param: { name: 'token', in: 'query' },
          example: 'wvt_9f8c…',
          description: 'The one-time token from the email.',
        }),
      }),
    },
    responses: {
      200: {
        description: 'Email confirmed',
        content: { 'text/html': { schema: { type: 'string' } } },
      },
      400: {
        description: 'Missing, expired or already-used token',
        content: { 'text/html': { schema: { type: 'string' } } },
      },
    },
  },
]);
