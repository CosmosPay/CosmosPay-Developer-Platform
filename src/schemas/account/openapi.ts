/* OpenAPI registration for the signed-in account's own settings
   (src/pages/api/account/**). Email and role are not here on purpose: they are managed
   by the OAuth/SSO sign-in, not by this API. */
import { errors, jsonOk, registerRoutes, sessionSecurity } from '@/lib/openapi/route-helpers';
import { z } from '@/lib/openapi/zod';
import { PLAN_IDS } from '@/lib/plans';
import { jsonBody } from '@/schemas/shared/openapi-params';

const TAG = 'Account';

const planId = z
  .enum(PLAN_IDS as unknown as [string, ...string[]])
  .openapi('PlanId', { description: 'Billing plan identifier.', example: 'starter' });

const planBody = z.object({ plan: planId }).openapi('UpdateAccountPlanBody');

const profileBody = z
  .object({
    displayName: z.string().max(120).optional().openapi({ example: 'Ada Lovelace' }),
    bio: z.string().max(400).optional().openapi({ example: 'Building payments at Acme.' }),
    avatarUrl: z.string().max(700_000).optional().openapi({
      example: 'data:image/png;base64,iVBORw0KGgo...',
      description:
        'A client-resized `data:image/(png|jpeg|webp);base64,…` URL, or `""` to clear it and fall back to the OAuth photo. Anything else is rejected with 400.',
    }),
  })
  .openapi('UpdateAccountProfileBody', {
    description: 'Only the fields present are changed. Unknown fields are rejected.',
  });

registerRoutes([
  {
    method: 'patch',
    path: '/api/account/plan',
    tags: [TAG],
    summary: 'Change my plan',
    description:
      "Sets the account's (mock) billing plan. Gated twice: regular accounts are refused entirely when `ALLOW_USER_PLAN_CHANGES` is off, and a non-manager may only pick a plan listed in `ENABLED_PLANS`. Both refusals are 403.",
    security: sessionSecurity,
    request: jsonBody(planBody),
    responses: {
      200: jsonOk(z.object({ plan: planId }), 'UpdateAccountPlanResponse', 'Plan updated'),
      400: errors.badRequest,
      401: errors.unauthorized,
      403: errors.forbidden,
      500: errors.internalError,
    },
  },
  {
    method: 'patch',
    path: '/api/account/profile',
    tags: [TAG],
    summary: 'Update my profile',
    description: 'Updates the display name, bio and avatar of the signed-in account.',
    security: sessionSecurity,
    request: jsonBody(profileBody),
    responses: {
      200: jsonOk(
        z.object({
          displayName: z.string().nullable().openapi({ example: 'Ada Lovelace' }),
          bio: z.string().nullable().openapi({ example: null }),
          avatarUrl: z.string().nullable().openapi({ example: null }),
        }),
        'UpdateAccountProfileResponse',
        'Profile updated',
      ),
      400: errors.badRequest,
      401: errors.unauthorized,
      500: errors.internalError,
    },
  },
]);
