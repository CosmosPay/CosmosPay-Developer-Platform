/* OpenAPI registration for the wallet's own sign-in (src/pages/api/wallet/auth/**) and the
   backup it restores (src/pages/api/wallet/backup.ts). See src/lib/wallet-auth.ts.

   PUBLIC ROUTES, for the reason ../wallet/openapi.ts gives: the wallet is open-source and
   holds no shared secret. What authenticates each call is the PKCE verifier (the provider
   flow), a claim token plus an emailed code (the email flow), a short-lived session token
   plus a Stellar signature (`finish`), or a Stellar signature alone (backup update).

   The same convention as the older wallet routes: an OUTCOME rides in `data.status` with
   HTTP 200 — `pending`, `verify_email`, `invalid`, `backup_conflict` are not errors here.
   Only a malformed request, a bad credential, a spent budget or a broken dependency come
   back as HTTP errors. */
import { errors, jsonCreated, jsonOk, registerRoutes } from '@/lib/openapi/route-helpers';
import { z } from '@/lib/openapi/zod';
import {
  walletAuthAuthorizeBodySchema,
  walletAuthClaimBodySchema,
  walletAuthEmailStartBodySchema,
  walletAuthEmailVerifyBodySchema,
  walletAuthFinishBodySchema,
  walletBackupUpdateBodySchema,
} from '@/schemas/wallet-auth';
import { jsonBody, pathParam } from '@/schemas/shared/openapi-params';

const TAG = 'Wallet';
const ADDRESS_EXAMPLE = 'GA7QYNF7SOWQ3GLR2BGMZEHXAVIRZA4KVWLTJJFC7MGXUA74P7UJVSGZ';

const rateLimited = { description: 'Rate limited — wait before retrying', content: errors.badRequest.content };
const unavailable = (what: string) => ({ description: what, content: errors.internalError.content });
const unauthorized = (what: string) => ({ description: what, content: errors.unauthorized.content });

const identitySchema = z
  .object({
    email: z.string().openapi({ example: 'ada@example.com' }),
    name: z.string().nullable().openapi({ example: 'Ada Lovelace' }),
    avatar: z.string().nullable().openapi({ example: 'https://lh3.googleusercontent.com/a/…' }),
    method: z.enum(['google', 'github', 'email']).openapi({ example: 'google' }),
  })
  .openapi('WalletAuthIdentity', { description: 'Who the sign-in proved. `email` is always a verified one.' });

const backupSchema = z
  .object({
    stellarAddress: z.string().openapi({ example: ADDRESS_EXAMPLE }),
    box: z.string().openapi({
      example: '{"v":2,"salt":"…","iv":"…","data":"…","iter":1000000}',
      description: 'Sealed on the device under a key derived from the person’s password. Opaque to this server.',
    }),
    updatedAt: z.string().openapi({ example: '2026-09-19T12:00:00.000Z' }),
  })
  .openapi('WalletBackup');

const readySchema = z
  .object({
    status: z.literal('ready'),
    identity: identitySchema,
    account: z.enum(['existing', 'new']).openapi({ example: 'new' }),
    backup: backupSchema.nullable(),
    sessionToken: z.string().openapi({
      example: 'v1.9f8c…',
      description: 'Good for `POST /api/wallet/auth/finish` only, for `expiresInSeconds`.',
    }),
    expiresInSeconds: z.number().int().openapi({ example: 1800 }),
  })
  .openapi('WalletSignInReady', {
    description: 'The email is proven. No API key yet — `finish` attaches it to a Stellar key and mints them.',
  });

const walletKeysSchema = z
  .object({
    dev: z.string().nullable().openapi({ example: 'cosmos_dev_9f8c…' }),
    prod: z.string().nullable().openapi({ example: null }),
  })
  .openapi('WalletSignInKeys', { description: 'The wallet-scoped API keys, one per environment. Handed over once.' });

registerRoutes([
  {
    method: 'get',
    path: '/api/wallet/auth/providers',
    tags: [TAG],
    summary: 'List the available sign-in methods (public)',
    description:
      'Which providers have an OAuth app configured on this deployment, and whether it can send the email code. The wallet shows only what is listed.',
    responses: {
      200: jsonOk(
        z
          .object({
            providers: z.array(z.enum(['google', 'github'])).openapi({ example: ['google', 'github'] }),
            email: z.boolean().openapi({ example: true }),
          })
          .openapi('WalletSignInProviders'),
        'WalletSignInProvidersResponse',
        'OK',
      ),
    },
  },
  {
    method: 'post',
    path: '/api/wallet/auth/oauth/authorize',
    tags: [TAG],
    summary: 'Open a Google/GitHub sign-in (public)',
    description:
      'Returns the URL to open in a browser and the `state` to poll. The PKCE `codeChallenge` (S256) is required: the state travels through a browser, and only the verifier behind the challenge can redeem the sign-in.',
    request: jsonBody(walletAuthAuthorizeBodySchema.openapi('WalletSignInAuthorizeBody')),
    responses: {
      201: jsonCreated(
        z
          .object({
            status: z.literal('opened'),
            state: z.string().openapi({ example: 'Zk9x…' }),
            authorizationUrl: z.string().openapi({ example: 'https://accounts.google.com/o/oauth2/v2/auth?…' }),
            expiresAt: z.string().openapi({ example: '2026-09-19T12:10:00.000Z' }),
          })
          .openapi('WalletSignInAuthorization'),
        'WalletSignInAuthorizeResponse',
        'Open the authorization URL to continue',
      ),
      400: errors.badRequest,
      429: rateLimited,
      500: errors.internalError,
      503: unavailable('That provider has no OAuth app configured here'),
    },
  },
  {
    method: 'get',
    path: '/api/wallet/auth/oauth/callback/{provider}',
    tags: [TAG],
    summary: 'Provider redirect target (public, HTML)',
    description:
      'Where Google or GitHub sends the person back; register it as the redirect URI. Reads the verified identity and parks it on the handshake for the wallet to claim. Answers a short HTML page telling the person to return to the wallet — 200 on success, 400 otherwise.',
    request: {
      params: z.object({
        provider: z.enum(['google', 'github']).openapi({ param: { name: 'provider', in: 'path' }, example: 'google' }),
      }),
      query: z.object({
        state: z.string().openapi({ param: { name: 'state', in: 'query' }, example: 'Zk9x…' }),
        code: z.string().optional().openapi({ param: { name: 'code', in: 'query' }, example: '4/0Ab…' }),
        error: z.string().optional().openapi({ param: { name: 'error', in: 'query' }, example: 'access_denied' }),
      }),
    },
    responses: {
      200: { description: 'Signed in — return to the wallet', content: { 'text/html': { schema: { type: 'string' } } } },
      400: {
        description: 'Expired, cancelled, unverified email or provider failure',
        content: { 'text/html': { schema: { type: 'string' } } },
      },
    },
  },
  {
    method: 'get',
    path: '/api/wallet/auth/oauth/session/{state}',
    tags: [TAG],
    summary: 'Poll a Google/GitHub sign-in (public)',
    description:
      'Has the person come back yet? A status only — the identity is handed over by the claim, to the holder of the PKCE verifier.',
    request: { params: pathParam('state', 'Zk9x…', 'The `state` from `authorize`.') },
    responses: {
      200: jsonOk(
        z
          .object({
            status: z.enum(['pending', 'authorized', 'redeemed', 'expired', 'failed']).openapi({ example: 'pending' }),
            error: z.string().optional().openapi({
              example: 'email_unverified',
              description: 'Only on `failed`: `denied`, `email_unverified`, `profile_invalid`, `provider_unavailable`.',
            }),
          })
          .openapi('WalletSignInSessionStatus'),
        'WalletSignInSessionResponse',
        'OK',
      ),
      400: errors.badRequest,
      429: rateLimited,
      500: errors.internalError,
    },
  },
  {
    method: 'post',
    path: '/api/wallet/auth/oauth/claim',
    tags: [TAG],
    summary: 'Redeem a Google/GitHub sign-in (public)',
    description:
      '`ready` for an email with no account yet. `verify_email` when it already has one: a code went to that inbox — finish at `/api/wallet/auth/email/verify`. `pending` means the person has not come back. Always HTTP 200 for an outcome; a wrong verifier is 403 and spends nothing.',
    request: jsonBody(walletAuthClaimBodySchema.openapi('WalletSignInClaimBody')),
    responses: {
      200: jsonOk(
        z
          .union([
            readySchema,
            z
              .object({
                status: z.literal('verify_email'),
                claimToken: z.string().openapi({ example: 'c1a…' }),
                expiresInSeconds: z.number().int().openapi({ example: 900 }),
                email: z.string().openapi({ example: 'ada@example.com' }),
              })
              .openapi('WalletSignInVerifyEmail'),
            z.object({ status: z.literal('pending') }).openapi('WalletSignInPending'),
            z
              .object({ status: z.literal('failed'), error: z.string().openapi({ example: 'denied' }) })
              .openapi('WalletSignInFailed'),
            z.object({ status: z.literal('expired') }).openapi('WalletSignInExpired'),
          ])
          .openapi('WalletSignInClaimResult'),
        'WalletSignInClaimResponse',
        'Claim outcome',
      ),
      400: errors.badRequest,
      403: { description: 'The verifier does not match the handshake', content: errors.forbidden.content },
      429: rateLimited,
      500: errors.internalError,
      503: unavailable('The email already has an account and its code could not be sent'),
    },
  },
  {
    method: 'post',
    path: '/api/wallet/auth/email/start',
    tags: [TAG],
    summary: 'Email a sign-in code (public)',
    description:
      'Sends a six-digit code and returns the `claimToken` to present with it. Answers the same whether or not the email has an account.',
    request: jsonBody(walletAuthEmailStartBodySchema.openapi('WalletSignInEmailStartBody')),
    responses: {
      201: jsonCreated(
        z
          .object({
            status: z.literal('sent'),
            claimToken: z.string().openapi({ example: 'c1a…' }),
            expiresInSeconds: z.number().int().openapi({ example: 900 }),
          })
          .openapi('WalletSignInCodeSent'),
        'WalletSignInEmailStartResponse',
        'We emailed you a sign-in code',
      ),
      400: errors.badRequest,
      429: rateLimited,
      500: errors.internalError,
      503: unavailable('Email delivery is not available right now'),
    },
  },
  {
    method: 'post',
    path: '/api/wallet/auth/email/verify',
    tags: [TAG],
    summary: 'Finish a sign-in with the emailed code (public)',
    description:
      'Finishes an email sign-in, and a Google/GitHub sign-in that landed on an existing account. Wrong codes answer `invalid` with the attempts left; too many lock the attempt. Always HTTP 200 — branch on `data.status`.',
    request: jsonBody(walletAuthEmailVerifyBodySchema.openapi('WalletSignInEmailVerifyBody')),
    responses: {
      200: jsonOk(
        z
          .union([
            readySchema,
            z
              .object({ status: z.literal('invalid'), attemptsLeft: z.number().int().openapi({ example: 3 }) })
              .openapi('WalletSignInInvalidCode'),
            z.object({ status: z.literal('expired') }).openapi('WalletSignInCodeExpired'),
            z.object({ status: z.literal('locked') }).openapi('WalletSignInLocked'),
          ])
          .openapi('WalletSignInEmailVerifyResult'),
        'WalletSignInEmailVerifyResponse',
        'Verification outcome',
      ),
      400: errors.badRequest,
      429: rateLimited,
      500: errors.internalError,
    },
  },
  {
    method: 'post',
    path: '/api/wallet/auth/finish',
    tags: [TAG],
    summary: 'Attach the signed-in email to a Stellar key (session token)',
    description:
      '`Authorization: Bearer <sessionToken>` plus an ed25519 signature by `stellarAddress` over "Cosmos Pay Wallet sign-in\\nemail: <email>\\naccount: <address>\\nat: <signedAt>". Creates or links the account, stores `backup` when sent, and returns the wallet API keys. `backup_conflict` means the account already backs up a different address and nothing changed — resend with `replaceBackup: true` only after the person has confirmed they are giving that wallet up.',
    request: jsonBody(walletAuthFinishBodySchema.openapi('WalletSignInFinishBody')),
    responses: {
      200: jsonOk(
        z
          .union([
            z
              .object({
                status: z.literal('ready'),
                account: z.enum(['created', 'linked']).openapi({ example: 'created' }),
                organizationId: z.string().openapi({ example: 'org_123' }),
                keys: walletKeysSchema,
              })
              .openapi('WalletSignInFinished'),
            z
              .object({
                status: z.literal('backup_conflict'),
                stellarAddress: z.string().openapi({ example: ADDRESS_EXAMPLE }),
              })
              .openapi('WalletSignInBackupConflict'),
          ])
          .openapi('WalletSignInFinishResult'),
        'WalletSignInFinishResponse',
        'Finish outcome',
      ),
      400: errors.badRequest,
      401: unauthorized('Missing or expired session token, or an invalid/stale signature'),
      429: rateLimited,
      500: errors.internalError,
    },
  },
  {
    method: 'put',
    path: '/api/wallet/backup',
    tags: [TAG],
    summary: 'Replace a backup after a password change (Stellar signature)',
    description:
      'No sign-in: an ed25519 signature by `stellarAddress` over "Cosmos Pay Wallet backup\\naccount: <address>\\nbox: <sha256 hex of box>\\nat: <signedAt>". Only the key the backup restores can replace it.',
    request: jsonBody(walletBackupUpdateBodySchema.openapi('WalletBackupUpdateBody')),
    responses: {
      200: jsonOk(
        z.object({ status: z.literal('updated') }).openapi('WalletBackupUpdated'),
        'WalletBackupUpdateResponse',
        'Backup updated',
      ),
      400: errors.badRequest,
      401: unauthorized('Invalid or stale signature'),
      404: errors.notFound,
      429: rateLimited,
      500: errors.internalError,
    },
  },
]);
