/* OpenAPI registration for the dashboard's P2P market proxy (`/api/p2p/**`,
   src/pages/api/p2p/[...path].ts): one catch-all forward to the Payments API's `/v1/p2p/<rest>`
   (lib/cosmos-proxy.ts blindpayProxy) with its gate: a session, membership of `?org=` when one
   is given, and `payments:create` for anything that is not a read.

   Documented per verb with the upstream payload as an open object: the Payments API's own
   reference (docs/openapi.json, the P2P market tag) describes the entities; restating them here
   would be a second copy to be wrong about. */
import { errors, jsonOk, registerRoutes, sessionSecurity } from '@/lib/openapi/route-helpers';
import { z } from '@/lib/openapi/zod';
import { envQuery, jsonBody, orgQuery, passthroughObject, pathParam } from '@/schemas/shared/openapi-params';

const TAG = 'P2P market';

const upstreamPayload = passthroughObject(
  'P2pUpstreamPayload',
  'The Payments API payload, forwarded unchanged inside the envelope.',
);

registerRoutes(
  (['get', 'post', 'patch', 'delete'] as const).map((method) => ({
    method,
    path: '/api/p2p/{path}',
    tags: [TAG],
    summary: `P2P market proxy (${method.toUpperCase()})`,
    description:
      'Forwards to the Payments API as /v1/p2p/<path> for the signed-in member of `org` (the market, registered wallets, payment methods, offers, orders, charges, payouts, unsigned transactions and transfer matches). Writes need the `payments:create` permission in the organization.',
    security: sessionSecurity,
    request: {
      params: pathParam('path', 'orders', 'Everything after /api/p2p/, forwarded to the Payments API as /v1/p2p/<path>.'),
      query: z.object({ org: orgQuery, env: envQuery }),
      ...(method === 'get' || method === 'delete' ? {} : jsonBody(upstreamPayload, false)),
    },
    responses: {
      200: jsonOk(upstreamPayload, 'p2pProxyResponse', 'OK'),
      201: jsonOk(upstreamPayload, 'p2pProxyCreatedResponse', 'Created'),
      400: errors.badRequest,
      401: errors.unauthorized,
      403: {
        description: 'Not a member of the organization, or without `payments:create` for a write',
        content: errors.forbidden.content,
      },
      404: errors.notFound,
      500: errors.internalError,
    },
  })),
);
