/* OpenAPI registration for the BlindPay fiat rails: KYC/KYB (`/api/kyc/**`), on-ramp
   (`/api/onramp/**`) and off-ramp (`/api/offramp/**`).

   ONE MODULE FOR THREE ROUTE FOLDERS, because one helper serves all three: they are the
   same catch-all forward (lib/cosmos-proxy.ts → blindpayProxy) to `/v1/<prefix>/<rest>`,
   with the same gate — session, membership of `?org=` when one is given, and
   `payments:create` for anything that is not a read. Splitting them would triple the
   explanation without adding a fact.

   The three `/api/kyc/receivers/{id}/…` routes are NOT part of that catch-all: they are
   real handlers that do something the proxy cannot (send the terms-of-service email, hold
   the owner/admin gate), and Astro's more specific route wins. They are documented on
   their own below.

   Everything the proxy returns is the Payments API's own shape, wrapped in this platform's
   envelope. It is documented as an open object on purpose — restating BlindPay's entities
   here would be a second copy to be wrong about. */
import { errors, jsonOk, registerRoutes, sessionSecurity } from '@/lib/openapi/route-helpers';
import { z } from '@/lib/openapi/zod';
import { approveReceiverBodySchema } from '@/schemas/cosmos-resources';
import {
  envQuery,
  jsonBody,
  orgQuery,
  passthroughObject,
  pathParam,
} from '@/schemas/shared/openapi-params';

const TAG = 'Fiat rails';

const upstreamPayload = passthroughObject(
  'FiatUpstreamPayload',
  'The Payments API payload, forwarded unchanged inside the envelope.',
);

const receiverParam = pathParam('id', 'rcv_clx9z8a1b0000', 'Fiat receiver id.');
const orgScope = z.object({ org: orgQuery, env: envQuery });

/** One catch-all, documented per verb — it forwards whatever it is given. */
function proxyRoutes(prefix: 'kyc' | 'onramp' | 'offramp', summary: string, description: string) {
  return (['get', 'post', 'patch', 'delete'] as const).map((method) => ({
    method,
    path: `/api/${prefix}/{path}`,
    tags: [TAG],
    summary: `${summary} (${method.toUpperCase()})`,
    description,
    security: sessionSecurity,
    request: {
      params: pathParam(
        'path',
        prefix === 'kyc' ? 'receivers' : 'quotes',
        `Everything after /api/${prefix}/ — forwarded to the Payments API as /v1/${prefix}/<path>.`,
      ),
      query: orgScope,
      ...(method === 'get' || method === 'delete'
        ? {}
        : jsonBody(upstreamPayload, false)),
    },
    responses: {
      200: jsonOk(upstreamPayload, `${prefix}ProxyResponse`, 'OK'),
      201: jsonOk(upstreamPayload, `${prefix}ProxyCreatedResponse`, 'Created'),
      400: errors.badRequest,
      401: errors.unauthorized,
      403: {
        description:
          'Not a member of the organization, or without `payments:create` for a write',
        content: errors.forbidden.content,
      },
      404: errors.notFound,
      500: errors.internalError,
    },
  }));
}

const receiverApprovalSchema = z
  .object({
    approved: z.boolean().openapi({ example: true }),
    emailed: z.boolean().openapi({
      example: true,
      description:
        'Whether the terms-of-service email went out. False when mail is not configured or delivery failed — the approval still stands.',
    }),
    email: z.string().nullable().openapi({ example: 'customer@example.com' }),
    receiver: upstreamPayload.nullable(),
  })
  .openapi('FiatReceiverApproval');

const tosOutcomeSchema = z
  .union([
    z
      .object({
        channel: z.literal('email'),
        emailed: z.literal(true),
        email: z.string().openapi({ example: 'customer@example.com' }),
      })
      .openapi('FiatTosEmailed'),
    z
      .object({
        channel: z.literal('code'),
        url: z.string().openapi({ example: 'https://tos.blindpay.com/…' }),
        email: z.string().nullable().openapi({ example: 'customer@example.com' }),
      })
      .openapi('FiatTosLink'),
  ])
  .openapi('FiatTosOutcome', {
    description:
      '`channel: "email"` means this platform sent the link; `channel: "code"` hands the URL back for the caller to show instead.',
  });

registerRoutes([
  ...proxyRoutes(
    'kyc',
    'KYC/KYB proxy',
    'Catch-all forward to the Payments API KYC surface: receivers, wallets, bank accounts, uploads, terms of service, rails and bank details.',
  ),
  ...proxyRoutes(
    'onramp',
    'On-ramp proxy',
    'Catch-all forward to the on-ramp (fiat → stablecoin) surface: quotes, payins, trustline and virtual accounts.',
  ),
  ...proxyRoutes(
    'offramp',
    'Off-ramp proxy',
    'Catch-all forward to the off-ramp (stablecoin → fiat) surface: quotes, payout authorization, payouts and documents.',
  ),
  {
    method: 'patch',
    path: '/api/kyc/receivers/{id}/access',
    tags: [TAG],
    summary: 'Enable or disable a fiat account',
    description:
      'Owner or admin of the organization only. `org` is required — without it the request is 400, not a guess at which workspace the receiver belongs to.',
    security: sessionSecurity,
    request: {
      params: receiverParam,
      query: orgScope,
      ...jsonBody(
        z
          .object({ disabled: z.boolean().openapi({ example: true }) })
          .openapi('FiatReceiverAccessBody'),
      ),
    },
    responses: {
      200: jsonOk(upstreamPayload, 'FiatReceiverAccessResponse', 'Fiat account updated'),
      400: errors.badRequest,
      401: errors.unauthorized,
      403: errors.forbidden,
      404: errors.notFound,
      500: errors.internalError,
    },
  },
  {
    method: 'post',
    path: '/api/kyc/receivers/{id}/approve',
    tags: [TAG],
    summary: 'Approve a receiver in my organization',
    description:
      "Owner or admin of the organization only, and only for a receiver in that organization — the platform-wide twin is `/api/admin/receivers/{id}/approve`. Moves the receiver from `pending_review` to `pending_user` and emails the customer the hosted terms-of-service link. `expected_version` is the dossier version the reviewer read: the upstream answers 409 when the tenant edited it in between, so an approval never lands on a dossier nobody reviewed.",
    security: sessionSecurity,
    request: {
      params: receiverParam,
      query: orgScope,
      ...jsonBody(approveReceiverBodySchema.openapi('ApproveReceiverBody')),
    },
    responses: {
      200: jsonOk(receiverApprovalSchema, 'FiatApproveReceiverResponse', 'Approved'),
      400: errors.badRequest,
      401: errors.unauthorized,
      403: errors.forbidden,
      404: errors.notFound,
      409: {
        description: 'The dossier changed since it was reviewed (`kyc_state_invalid`)',
        content: errors.badRequest.content,
      },
      500: errors.internalError,
    },
  },
  {
    method: 'post',
    path: '/api/kyc/receivers/{id}/tos',
    tags: [TAG],
    summary: 'Send the terms of service',
    description:
      'Owner or admin of the organization only. With `channel: "email"` this platform sends the link and answers `emailed: true`; with `channel: "code"` (the default) it returns the URL for the caller to show. 400 when the receiver has no email on file, 503 when mail is not configured.',
    security: sessionSecurity,
    request: {
      params: receiverParam,
      query: orgScope,
      ...jsonBody(
        z
          .object({
            channel: z.enum(['code', 'email']).optional().openapi({ example: 'email' }),
            redirect_url: z
              .string()
              .max(2048)
              .openapi({ example: 'https://merchant.example.com/kyc/done' }),
          })
          .openapi('FiatReceiverTosBody'),
      ),
    },
    responses: {
      200: jsonOk(tosOutcomeSchema, 'FiatReceiverTosResponse', 'Terms of service sent'),
      400: errors.badRequest,
      401: errors.unauthorized,
      403: errors.forbidden,
      404: errors.notFound,
      500: errors.internalError,
      503: {
        description: 'Email delivery is not configured',
        content: errors.internalError.content,
      },
    },
  },
]);
