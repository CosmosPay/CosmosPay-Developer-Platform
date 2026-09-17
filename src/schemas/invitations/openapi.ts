/* OpenAPI registration for the invitations addressed to the signed-in account
   (src/pages/api/invitations/**) — the inbox side of the flow whose sending side lives
   under /api/organizations/{id}/invitations.

   The invitation entity is imported from that module rather than restated; importing a
   registration file is safe because ES modules are evaluated once, so the routes it
   registers are not registered twice. */
import { errors, jsonOk, registerRoutes, sessionSecurity } from '@/lib/openapi/route-helpers';
import { z } from '@/lib/openapi/zod';
import { invitationSchema } from '@/schemas/organizations/openapi';
import { jsonBody } from '@/schemas/shared/openapi-params';

const TAG = 'Organizations';

const myInvitationSchema = invitationSchema
  .extend({
    orgId: z.string().openapi({ example: 'org_123' }),
    orgName: z.string().openapi({ example: 'Acme Payments' }),
  })
  .openapi('MyOrganizationInvitation', {
    description: 'A pending invitation addressed to the signed-in email, with its organization.',
  });

registerRoutes([
  {
    method: 'get',
    path: '/api/invitations',
    tags: [TAG],
    summary: 'List invitations addressed to me',
    description:
      "Pending invitations sent to the signed-in account's email, newest first, so they can be accepted from inside the dashboard. Expired ones are not listed.",
    security: sessionSecurity,
    responses: {
      200: jsonOk(z.array(myInvitationSchema), 'ListMyInvitationsResponse', 'Invitations loaded'),
      401: errors.unauthorized,
      500: errors.internalError,
    },
  },
  {
    method: 'post',
    path: '/api/invitations/accept',
    tags: [TAG],
    summary: 'Accept an invitation',
    description:
      "Joins the organization the invitation belongs to. The invitation must be addressed to the signed-in account's email — a mismatch, an expired token, one already used, or a full seat count all answer 409; an unknown id answers 404.",
    security: sessionSecurity,
    request: jsonBody(
      z
        .object({ id: z.string().openapi({ example: 'inv_clx9z8a1b0000' }) })
        .openapi('AcceptInvitationBody'),
    ),
    responses: {
      200: jsonOk(
        z.object({
          orgId: z.string().openapi({ example: 'org_123' }),
          orgName: z.string().openapi({ example: 'Acme Payments' }),
        }),
        'AcceptInvitationResponse',
        'Invitation accepted',
      ),
      400: errors.badRequest,
      401: errors.unauthorized,
      404: errors.notFound,
      409: {
        description: 'Expired, already used, addressed to another email, or the seat limit is reached',
        content: errors.badRequest.content,
      },
      500: errors.internalError,
    },
  },
]);
