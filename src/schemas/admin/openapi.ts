/* OpenAPI registration for the platform-admin surface (src/pages/api/admin/**).

   WHO MAY CALL THESE: a platform owner/admin, decided here against the account role —
   being an owner of some organization is not enough. The Payments service holds no admin
   credential of its own any more; it admits these calls because they arrive from this
   backend (gateway secret + `X-Cosmos-Internal`) and audits them under the account, so
   this check is the only one in play. */
import { errors, jsonOk, registerRoutes, sessionSecurity } from '@/lib/openapi/route-helpers';
import { z } from '@/lib/openapi/zod';
import { PLAN_IDS } from '@/lib/plans';
import { approveReceiverBodySchema } from '@/schemas/cosmos-resources';
import {
  envQuery,
  idParam,
  jsonBody,
  passthroughObject,
  pathParam,
} from '@/schemas/shared/openapi-params';

const TAG = 'Admin';

const accountRole = z
  .enum(['user', 'support', 'admin', 'owner'])
  .openapi('AccountRole', { description: 'Platform-wide account role.', example: 'user' });

const adminUserSchema = z
  .object({
    id: z.string().openapi({ example: 'usr_abc' }),
    name: z.string().nullable().openapi({ example: 'Ada Lovelace' }),
    email: z.string().nullable().openapi({ example: 'ada@example.com' }),
    image: z.string().nullable().openapi({ example: null }),
    createdAt: z.string().openapi({ example: '2026-09-17T12:34:56.000Z' }),
    role: accountRole,
    plan: z.enum(PLAN_IDS as unknown as [string, ...string[]]).openapi({ example: 'community' }),
    lastSeenAt: z.string().nullable().openapi({ example: '2026-09-17T12:30:00.000Z' }),
  })
  .openapi('AdminUser', { description: 'An account as the admin console lists it.' });

const receiverApprovalSchema = z
  .object({
    approved: z.boolean().openapi({ example: true }),
    emailed: z.boolean().openapi({
      example: true,
      description:
        'Whether the terms-of-service email actually went out. False when mail is not configured or delivery failed — the approval still stands.',
    }),
    email: z.string().nullable().openapi({ example: 'customer@example.com' }),
    receiver: passthroughObject('FiatReceiver', 'The receiver as the Payments API returns it.').nullable(),
  })
  .openapi('ReceiverApproval');

const tosSentSchema = z
  .object({
    channel: z.literal('email'),
    emailed: z.literal(true),
    email: z.string().openapi({ example: 'customer@example.com' }),
  })
  .openapi('ReceiverTosSent');

const receiverParam = pathParam('id', 'rcv_clx9z8a1b0000', 'Fiat receiver id.');

/* The catch-all forwards whatever verb it is given, so it is documented per verb rather
   than as one fictional operation. Path and query are free-form on purpose: the shape is
   the Payments API's admin surface, not this platform's. */
const adminProxyPathParam = pathParam(
  'path',
  'consumers',
  'Everything after /api/admin/ — forwarded to the Payments API as /v1/admin/<path>.',
);

const adminProxyResponses = {
  200: jsonOk(
    passthroughObject('AdminProxyPayload', 'Upstream admin payload, forwarded unchanged.'),
    'AdminProxyResponse',
    'OK',
  ),
  400: errors.badRequest,
  401: errors.unauthorized,
  403: {
    description: 'Platform admin access required',
    content: errors.forbidden.content,
  },
  404: errors.notFound,
  500: errors.internalError,
};

registerRoutes([
  {
    method: 'get',
    path: '/api/admin/users',
    tags: [TAG],
    summary: 'List accounts',
    description: 'Up to 200 accounts, newest first, with role, plan and last-seen time.',
    security: sessionSecurity,
    responses: {
      200: jsonOk(z.array(adminUserSchema), 'ListAdminUsersResponse', 'Users loaded'),
      401: errors.unauthorized,
      403: { description: 'Admin access required', content: errors.forbidden.content },
      500: errors.internalError,
    },
  },
  {
    method: 'patch',
    path: '/api/admin/users/{id}',
    tags: [TAG],
    summary: "Set an account's role or plan",
    description:
      'Plan changes are unrestricted for an admin. Role changes are not: you cannot change your own role, you can only assign a role strictly below your own, and you cannot touch an account at or above your level. Each of those is a 403.',
    security: sessionSecurity,
    request: {
      params: pathParam('id', 'usr_abc', 'Account id.'),
      ...jsonBody(
        z
          .object({
            role: accountRole.optional(),
            plan: z.enum(PLAN_IDS as unknown as [string, ...string[]]).optional(),
          })
          .openapi('UpdateAdminUserBody', { description: 'At least one of `role` or `plan`.' }),
      ),
    },
    responses: {
      200: jsonOk(
        z.object({
          userId: z.string().openapi({ example: 'usr_abc' }),
          role: accountRole,
          plan: z.enum(PLAN_IDS as unknown as [string, ...string[]]),
        }),
        'UpdateAdminUserResponse',
        'User updated',
      ),
      400: errors.badRequest,
      401: errors.unauthorized,
      403: errors.forbidden,
      404: errors.notFound,
      500: errors.internalError,
    },
  },
  {
    method: 'post',
    path: '/api/admin/receivers/{id}/approve',
    tags: [TAG],
    summary: 'Approve any fiat receiver',
    description:
      "The platform-wide twin of `/api/kyc/receivers/{id}/approve`: it reaches receivers in ANY organization. Moves the receiver from `pending_review` to `pending_user` and emails the customer the hosted terms-of-service link (the Payments service has no mailer). `expected_version` is the dossier version the reviewer read — the upstream answers 409 when the tenant edited the dossier in between.",
    security: sessionSecurity,
    request: {
      params: receiverParam,
      query: z.object({ env: envQuery }),
      ...jsonBody(approveReceiverBodySchema.openapi('ApproveReceiverBody')),
    },
    responses: {
      200: jsonOk(receiverApprovalSchema, 'AdminApproveReceiverResponse', 'Approved'),
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
    path: '/api/admin/receivers/{id}/tos',
    tags: [TAG],
    summary: 'Re-send the terms of service',
    description:
      'Emails the hosted terms-of-service link again. The resend cooldown is role-derived: immediate for an owner, once a minute for an admin, and the upstream default (24h) otherwise. 400 when the receiver has no email on file; 503 when mail is not configured.',
    security: sessionSecurity,
    request: {
      params: receiverParam,
      query: z.object({ env: envQuery }),
      ...jsonBody(
        z
          .object({
            redirect_url: z.string().max(2048).openapi({ example: 'https://merchant.example.com/kyc/done' }),
          })
          .openapi('AdminReceiverTosBody'),
      ),
    },
    responses: {
      200: jsonOk(tosSentSchema, 'AdminReceiverTosResponse', 'Verification email sent'),
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
  ...(['get', 'post', 'patch', 'delete'] as const).map((method) => ({
    method,
    path: '/api/admin/{path}',
    tags: [TAG],
    summary: `Admin proxy (${method.toUpperCase()})`,
    description:
      'Catch-all forward to the Payments API admin surface — summary, consumers, payment-intents, swaps, customers, products, receivers, payins, payouts. The response is the upstream payload, with consumer references resolved to the owning organization and account so the console never shows a bare `cosmos_<id>`. More specific admin routes win over this one.',
    security: sessionSecurity,
    request: {
      params: adminProxyPathParam,
      query: z.object({ env: envQuery }),
      ...(method === 'get' || method === 'delete'
        ? {}
        : jsonBody(passthroughObject('AdminProxyBody', 'Forwarded to the upstream unchanged.'), false)),
    },
    responses: adminProxyResponses,
  })),
]);
