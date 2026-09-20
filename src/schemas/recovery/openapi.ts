/* OpenAPI registration for SEP-10 web auth (src/pages/api/sep10/**) and SEP-30 account
   recovery (src/pages/api/recovery/**), plus the operator's sponsored setup
   (src/pages/api/wallet/recovery/setup.ts).

   These are STANDARD endpoints with a house layout: the bodies and answers follow SEP-10 and
   SEP-30, but they ride in this API's `{ data, code, status, message }` envelope like
   everything else here. A third-party SEP-30 client would need a deployment that maps its
   root to /api/recovery and unwraps `data`; ours is the wallet, which speaks the envelope.

   Only a deployment configured as a recovery server answers them at all — every one can
   return 503, and that is not an error so much as "this host is not that server". */
import { errors, jsonCreated, jsonOk, registerRoutes } from '@/lib/openapi/route-helpers';
import { z } from '@/lib/openapi/zod';
import {
  recoveryIdentitiesBodySchema,
  recoverySetupBodySchema,
  recoverySignBodySchema,
  sep10TokenBodySchema,
} from '@/schemas/recovery';
import { jsonBody, pathParam } from '@/schemas/shared/openapi-params';

const TAG = 'Recovery';
const ADDRESS = 'GA7QYNF7SOWQ3GLR2BGMZEHXAVIRZA4KVWLTJJFC7MGXUA74P7UJVSGZ';
const XDR = 'AAAAAgAAAAB…';

const notAServer = {
  description: 'This deployment is not a recovery server',
  content: errors.internalError.content,
};
const rateLimited = { description: 'Rate limited — wait before retrying', content: errors.badRequest.content };
const unauthorized = (what: string) => ({ description: what, content: errors.unauthorized.content });

const accountSchema = z
  .object({
    address: z.string().openapi({ example: ADDRESS }),
    identities: z.array(
      z.object({
        role: z.enum(['owner', 'sender', 'receiver']).openapi({ example: 'owner' }),
        authenticated: z.boolean().optional().openapi({
          example: true,
          description: 'Whether the caller authenticated as this identity.',
        }),
      }),
    ),
    signers: z.array(
      z.object({
        key: z.string().openapi({ example: ADDRESS, description: 'This server’s signer FOR THIS ACCOUNT.' }),
        added_at: z.string().openapi({ example: '2026-09-19T12:00:00.000Z' }),
      }),
    ),
  })
  .openapi('RecoveryAccount', { description: 'SEP-30’s view of one protected account.' });

const tokenSchema = z
  .object({ token: z.string().openapi({ example: 'eyJhbGciOiJIUzI1NiJ9…' }) })
  .openapi('RecoveryToken');

registerRoutes([
  {
    method: 'get',
    path: '/api/sep10/auth',
    tags: [TAG],
    summary: 'SEP-10: get a challenge (public)',
    description:
      'A transaction with sequence number 0 — unsubmittable by construction — for the account to sign. Signing it proves control of that account; post it back to get the token the recovery routes accept.',
    request: {
      query: z.object({
        account: z.string().openapi({ param: { name: 'account', in: 'query' }, example: ADDRESS }),
      }),
    },
    responses: {
      200: jsonOk(
        z
          .object({
            transaction: z.string().openapi({ example: XDR }),
            network_passphrase: z.string().openapi({ example: 'Public Global Stellar Network ; September 2015' }),
          })
          .openapi('Sep10Challenge'),
        'Sep10ChallengeResponse',
        'Sign this challenge and post it back',
      ),
      400: errors.badRequest,
      429: rateLimited,
      503: notAServer,
    },
  },
  {
    method: 'post',
    path: '/api/sep10/auth',
    tags: [TAG],
    summary: 'SEP-10: exchange a signed challenge for a token (public)',
    description:
      'Checks the challenge structurally, then weighs its signatures against the account’s own signers and medium threshold — so an account recovered onto a new key authenticates with that key, not with the one it lost.',
    request: jsonBody(sep10TokenBodySchema.openapi('Sep10TokenBody')),
    responses: {
      200: jsonOk(tokenSchema, 'Sep10TokenResponse', 'Authenticated'),
      400: errors.badRequest,
      401: unauthorized('The challenge is not valid for this account'),
      429: rateLimited,
      503: notAServer,
    },
  },
  {
    method: 'get',
    path: '/api/recovery/info',
    tags: [TAG],
    summary: 'What this recovery server is (public)',
    description:
      'Its role, the network its signers live on and the domains its challenges name. A wallet reads it before registering: a signer is an entry on ONE ledger, and a mismatch must not be discovered at recovery time.',
    responses: {
      200: jsonOk(
        z
          .object({
            role: z.enum(['a', 'b']).openapi({ example: 'a' }),
            network: z.enum(['public', 'testnet', 'other']).openapi({ example: 'public' }),
            network_passphrase: z.string().openapi({ example: 'Public Global Stellar Network ; September 2015' }),
            home_domain: z.string().openapi({ example: 'wallet.cosmospay.lat' }),
            web_auth_domain: z.string().openapi({ example: 'recovery-a.cosmospay.lat' }),
            web_auth_endpoint: z.string().openapi({ example: '/api/sep10/auth' }),
          })
          .openapi('RecoveryServerInfo'),
        'RecoveryServerInfoResponse',
        'OK',
      ),
      503: notAServer,
    },
  },
  {
    method: 'post',
    path: '/api/recovery/identity',
    tags: [TAG],
    summary: 'The token for someone who lost their device (sign-in session)',
    description:
      '`Authorization: Bearer <sessionToken>` from a wallet sign-in, exchanged for a short-lived identity token scoped to THIS server. It is what authenticates a recovery when the account’s key is gone; the sibling server issues its own, and neither accepts the other’s.',
    responses: {
      200: jsonOk(
        tokenSchema.extend({ expires_in: z.number().int().openapi({ example: 1800 }) }).openapi('RecoveryIdentityToken'),
        'RecoveryIdentityTokenResponse',
        'OK',
      ),
      401: unauthorized('No sign-in session'),
      429: rateLimited,
      503: notAServer,
    },
  },
  {
    method: 'get',
    path: '/api/recovery/accounts',
    tags: [TAG],
    summary: 'SEP-30: every account this caller may recover',
    description:
      'The listing someone who lost their device needs: the address is exactly what they no longer have. Authenticated with either token.',
    responses: {
      200: jsonOk(
        z.object({ accounts: z.array(accountSchema) }).openapi('RecoveryAccountList'),
        'RecoveryAccountListResponse',
        'OK',
      ),
      401: unauthorized('No token, or one for another server'),
      429: rateLimited,
      503: notAServer,
    },
  },
  {
    method: 'post',
    path: '/api/recovery/accounts/{address}',
    tags: [TAG],
    summary: 'SEP-30: register an account for recovery (SEP-10 token)',
    description:
      'Registers the identities that may recover this account, and answers with the signer this server holds for it — the key the wallet then puts on chain. Needs the ACCOUNT’s own token: an identity that could add itself would be a way in rather than a way back.',
    request: {
      params: pathParam('address', ADDRESS, 'The account to protect.'),
      ...jsonBody(recoveryIdentitiesBodySchema.openapi('RecoveryIdentitiesBody')),
    },
    responses: {
      201: jsonCreated(accountSchema, 'RecoveryRegisterResponse', 'Registered for recovery'),
      400: errors.badRequest,
      401: unauthorized('No token'),
      403: { description: 'This needs the account’s own key', content: errors.forbidden.content },
      429: rateLimited,
      503: notAServer,
    },
  },
  {
    method: 'put',
    path: '/api/recovery/accounts/{address}',
    tags: [TAG],
    summary: 'SEP-30: replace an account’s identities (SEP-10 token)',
    request: {
      params: pathParam('address', ADDRESS, 'The protected account.'),
      ...jsonBody(recoveryIdentitiesBodySchema.openapi('RecoveryIdentitiesUpdateBody')),
    },
    responses: {
      200: jsonOk(accountSchema, 'RecoveryUpdateResponse', 'Identities updated'),
      400: errors.badRequest,
      401: unauthorized('No token'),
      403: { description: 'This needs the account’s own key', content: errors.forbidden.content },
      429: rateLimited,
      503: notAServer,
    },
  },
  {
    method: 'get',
    path: '/api/recovery/accounts/{address}',
    tags: [TAG],
    summary: 'SEP-30: describe a protected account',
    description: 'Either token. Answers 404 rather than 403 to a caller who may not act for it.',
    request: { params: pathParam('address', ADDRESS, 'The protected account.') },
    responses: {
      200: jsonOk(accountSchema, 'RecoveryAccountResponse', 'OK'),
      401: unauthorized('No token'),
      404: errors.notFound,
      429: rateLimited,
      503: notAServer,
    },
  },
  {
    method: 'delete',
    path: '/api/recovery/accounts/{address}',
    tags: [TAG],
    summary: 'SEP-30: forget an account (SEP-10 token)',
    description:
      'This server stops answering for the account. The signer it holds stays on chain until the account removes it — which only the account can do.',
    request: { params: pathParam('address', ADDRESS, 'The protected account.') },
    responses: {
      200: jsonOk(
        z.object({ address: z.string().openapi({ example: ADDRESS }), deleted: z.literal(true) }).openapi('RecoveryForgotten'),
        'RecoveryDeleteResponse',
        'Forgotten',
      ),
      401: unauthorized('No token'),
      403: { description: 'This needs the account’s own key', content: errors.forbidden.content },
      404: errors.notFound,
      429: rateLimited,
      503: notAServer,
    },
  },
  {
    method: 'post',
    path: '/api/recovery/accounts/{address}/sign/{signer}',
    tags: [TAG],
    summary: 'SEP-30: co-sign a recovery transaction',
    description:
      'Returns the SIGNATURE, not a signed envelope: the wallet is collecting two of them and assembles the transaction itself. This server signs a signer/threshold change on the registered account, bounded in time, and nothing else — a payment, a merge or a foreign source is 403 with the rule it broke.',
    request: {
      params: z.object({
        address: z.string().openapi({ param: { name: 'address', in: 'path' }, example: ADDRESS }),
        signer: z
          .string()
          .openapi({ param: { name: 'signer', in: 'path' }, example: ADDRESS, description: 'The signer this server reported at registration.' }),
      }),
      ...jsonBody(recoverySignBodySchema.openapi('RecoverySignBody')),
    },
    responses: {
      200: jsonOk(
        z
          .object({
            signature: z.string().openapi({ example: 'd2hhdCBhIHNpZ25hdHVyZQ==' }),
            network_passphrase: z.string().openapi({ example: 'Public Global Stellar Network ; September 2015' }),
          })
          .openapi('RecoverySignature'),
        'RecoverySignResponse',
        'Signed',
      ),
      400: errors.badRequest,
      401: unauthorized('No token'),
      403: { description: 'This server only signs account recovery', content: errors.forbidden.content },
      404: errors.notFound,
      429: rateLimited,
      503: notAServer,
    },
  },
  {
    method: 'post',
    path: '/api/wallet/recovery/setup',
    tags: [TAG],
    summary: 'The operator sponsors an account’s recovery signers (sign-in session)',
    description:
      'For an account with no spare lumens: the operator pays the two signer entries’ reserve, builds the transaction and signs as sponsor. The account’s own signature is deliberately missing — the wallet adds it after its guard has decoded every operation. Needs a sign-in session token and a signature by the account over "Cosmos Pay Wallet recovery setup\\naccount: <address>\\nsigners: <a>,<b>\\nat: <signedAt>".',
    request: jsonBody(recoverySetupBodySchema.openapi('RecoverySetupBody')),
    responses: {
      200: jsonOk(
        z
          .object({
            transaction: z.string().openapi({ example: XDR }),
            sponsor: z.string().openapi({ example: ADDRESS }),
            network_passphrase: z.string().openapi({ example: 'Public Global Stellar Network ; September 2015' }),
          })
          .openapi('RecoverySetupTransaction'),
        'RecoverySetupResponse',
        'Sign it with the account’s key and submit it',
      ),
      400: errors.badRequest,
      401: unauthorized('No sign-in session, or an invalid/stale signature'),
      409: { description: 'The account does not exist on the network yet', content: errors.badRequest.content },
      429: rateLimited,
      503: { description: 'Sponsored setup is not available here', content: errors.internalError.content },
    },
  },
]);
