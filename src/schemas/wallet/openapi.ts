/* OpenAPI registration for the Cosmos Pay Wallet provisioning flows
   (src/pages/api/wallet/**).

   PUBLIC ROUTES — and the reason is worth stating once here rather than per operation: the
   wallet is open-source, so there is no shared secret to hold. What authenticates a call is
   either a Stellar signature over a canonical challenge (register/link), possession of a
   one-time claim token issued to the initiating wallet (claim/verify), or the PKCE verifier
   that never leaves the device (social login). Every one of them is rate-limited per
   address, which is what the 429s below mean.

   A CONVENTION THAT SURPRISES CALLERS: the outcome of `claim`, `link/verify` and
   `social/verify` rides in `data.status` with HTTP 200 — `pending`, `expired`, `claimed`,
   `invalid` are not error codes here. The wallet polls these and branches on `data.status`;
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
  walletSocialAuthorizeBodySchema,
  walletSocialClaimBodySchema,
  walletSocialVerifyBodySchema,
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

/* ---- social login (Pollar bridge) ---- */

const pollarWalletSchema = z.object({
  type: z.string().openapi({ example: 'stellar' }),
  address: z
    .string()
    .nullable()
    .openapi({ example: 'GA7QYNF7SOWQ3GLR2BGMZEHXAVIRZA4KVWLTJJFC7MGXUA74P7UJVSGZ' }),
  chain: z.string().optional().openapi({ example: 'stellar' }),
  exists_on_stellar: z.boolean().optional().openapi({ example: true }),
  funding_mode: z.string().optional().openapi({ example: 'deferred' }),
  network: z.string().optional().openapi({ example: 'testnet' }),
});

const pollarSessionSchema = z
  .object({
    access_token: z.string().openapi({ example: 'eyJhbGciOi…' }),
    refresh_token: z.string().openapi({ example: 'eyJhbGciOi…' }),
    token_type: z.string().openapi({ example: 'Bearer' }),
    expires_at: z.number().int().openapi({ example: 1789459200 }),
    user_id: z.string().nullable().openapi({ example: 'pol_abc' }),
    wallet: pollarWalletSchema,
    wallets: z.array(pollarWalletSchema),
    profile: z
      .object({
        email: z.string().optional().openapi({ example: 'ada@example.com' }),
        first_name: z.string().optional().openapi({ example: 'Ada' }),
        last_name: z.string().optional().openapi({ example: 'Lovelace' }),
        avatar: z.string().optional().openapi({ example: null }),
      })
      .openapi({ description: 'What the provider returned about the person.' }),
    publishable_key: z.string().openapi({ example: 'pk_live_…' }),
    api_base_url: z.string().openapi({ example: 'https://api.pollar.io' }),
  })
  .openapi('PollarSession', { description: 'A live social-login session for the wallet.' });

const socialReadySchema = z
  .object({
    status: z.literal('ready'),
    session: pollarSessionSchema,
    account: z.enum(['created', 'linked', 'none']).openapi({
      example: 'created',
      description: '`none` means the provider returned no email, so no Cosmos Pay account was made.',
    }),
    organizationId: z.string().nullable().openapi({ example: 'org_123' }),
    keys: walletKeysSchema.nullable(),
    activated: z.boolean().openapi({
      example: true,
      description: "Whether this call funded the wallet's XLM reserve. A repeat reports false.",
    }),
    activationAmount: z.string().nullable().openapi({ example: '1.5000000' }),
  })
  .openapi('WalletSocialReady');

const socialVerifyEmailSchema = z
  .object({
    status: z.literal('verify_email'),
    claimToken: z.string().openapi({ example: 'wct_9f8c…' }),
    expiresInSeconds: z.number().int().openapi({ example: 900 }),
    activated: z.boolean().openapi({ example: false }),
    activationAmount: z.string().nullable().openapi({ example: null }),
  })
  .openapi('WalletSocialVerifyEmail', {
    description:
      'The provider\'s email already has a Cosmos Pay account. Nothing is handed over until the code sent to that inbox is entered at `/api/wallet/social/verify`.',
  });

const socialVerifyResultSchema = z
  .union([
    socialReadySchema,
    z
      .object({ status: z.literal('invalid'), attemptsLeft: z.number().int().openapi({ example: 2 }) })
      .openapi('WalletSocialInvalidCode'),
    z.object({ status: z.literal('expired') }).openapi('WalletSocialExpired'),
    z.object({ status: z.literal('locked') }).openapi('WalletSocialLocked'),
  ])
  .openapi('WalletSocialVerifyResult');

const pollarSessionStatusSchema = z
  .object({
    status: z
      .enum(['pending', 'authorized', 'exchanging', 'consumed', 'failed', 'expired'])
      .openapi({ example: 'pending' }),
    state: z.string().openapi({ example: 'st_9f8c…' }),
    code: z.string().optional().openapi({
      example: 'cd_9f8c…',
      description: 'Only on `authorized`, and each poll retires the previous one.',
    }),
    code_expires_at: z.string().nullable().optional().openapi({ example: '2026-09-17T12:40:00.000Z' }),
    error_code: z.string().nullable().optional().openapi({ example: null }),
  })
  .openapi('PollarSessionStatus', { description: 'State of one social-login handshake.' });

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
  {
    method: 'post',
    path: '/api/wallet/social/authorize',
    tags: [TAG],
    summary: 'Open a social-login handshake (public)',
    description:
      'Starts a Google/GitHub login and returns the authorization URL to open. A PKCE `codeChallenge` is REQUIRED here even though the upstream treats it as optional: the poll route hands the code to whoever knows the `state`, so the verifier is what decides who may redeem it.',
    request: {
      query: z.object({ env: envQuery }),
      ...jsonBody(walletSocialAuthorizeBodySchema.openapi('WalletSocialAuthorizeBody')),
    },
    responses: {
      201: jsonCreated(
        z
          .object({
            status: z.literal('opened'),
            state: z.string().openapi({ example: 'st_9f8c…' }),
            authorizationUrl: z.string().openapi({ example: 'https://accounts.google.com/o/oauth2/v2/auth?…' }),
            provider: z.string().openapi({ example: 'google' }),
            expiresAt: z.string().nullable().openapi({ example: '2026-09-17T12:50:00.000Z' }),
          })
          .openapi('WalletSocialAuthorization'),
        'WalletSocialAuthorizeResponse',
        'Open the authorization URL to continue',
      ),
      400: errors.badRequest,
      429: rateLimited,
      500: errors.internalError,
      503: {
        description: 'The social-login bridge is unavailable',
        content: errors.internalError.content,
      },
    },
  },
  {
    method: 'get',
    path: '/api/wallet/social/session/{state}',
    tags: [TAG],
    summary: 'Poll a social-login handshake (public)',
    description:
      'Has the person come back from the consent screen yet? Only `authorized` carries a single-use `code`, and each poll retires the previous one. Knowing the `state` is enough to SEE the code — redeeming it still needs the PKCE verifier.',
    request: {
      params: pathParam('state', 'st_9f8c…', 'The handshake state from `authorize`.'),
      query: z.object({ env: envQuery }),
    },
    responses: {
      200: jsonOk(pollarSessionStatusSchema, 'WalletSocialSessionResponse', 'OK'),
      400: errors.badRequest,
      429: rateLimited,
      500: errors.internalError,
      503: {
        description: 'The social-login bridge is unavailable',
        content: errors.internalError.content,
      },
    },
  },
  {
    method: 'post',
    path: '/api/wallet/social/claim',
    tags: [TAG],
    summary: 'Redeem a social-login code (public)',
    description:
      'Exchanges the code plus the PKCE verifier for a live session. 201 `ready` carries the session and, when an account was created or linked, the wallet keys. 200 `verify_email` means the provider’s email already has an account and a code was sent to it — finish at `/api/wallet/social/verify`.',
    request: {
      query: z.object({ env: envQuery }),
      ...jsonBody(walletSocialClaimBodySchema.openapi('WalletSocialClaimBody')),
    },
    responses: {
      201: jsonCreated(socialReadySchema, 'WalletSocialClaimReadyResponse', 'Signed in'),
      200: jsonOk(
        socialVerifyEmailSchema,
        'WalletSocialClaimVerifyEmailResponse',
        'This email already has an account — enter the code we sent to it',
      ),
      400: errors.badRequest,
      429: rateLimited,
      500: errors.internalError,
      502: {
        description: 'The provider returned no wallet for this account',
        content: errors.badRequest.content,
      },
      503: {
        description: 'The social-login bridge is unavailable',
        content: errors.internalError.content,
      },
    },
  },
  {
    method: 'post',
    path: '/api/wallet/social/verify',
    tags: [TAG],
    summary: 'Finish a social login for an existing account (public)',
    description:
      "Exchanges the emailed six-digit code and the claim token from `social/claim` for the held session and keys. The provider's email proves who consented, not who opened the login — which is why an existing account is only handed over for this code. Always HTTP 200 except for 400/429/500; branch on `data.status`.",
    request: {
      query: z.object({ env: envQuery }),
      ...jsonBody(walletSocialVerifyBodySchema.openapi('WalletSocialVerifyBody')),
    },
    responses: {
      200: jsonOk(socialVerifyResultSchema, 'WalletSocialVerifyResponse', 'Verification outcome'),
      400: errors.badRequest,
      429: rateLimited,
      500: errors.internalError,
    },
  },
]);
