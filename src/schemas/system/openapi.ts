/* OpenAPI registration for the platform's own metadata routes and the read-only dashboard
   aggregates. The wallet calls none of these: its asset catalog and public key come from
   the community server through the gateway. */
import {
  errors,
  jsonOk,
  registerRoutes,
  sessionSecurity,
} from '@/lib/openapi/route-helpers';
import { z } from '@/lib/openapi/zod';
import { envQuery, passthroughObject } from '@/schemas/shared/openapi-params';

registerRoutes([
  {
    method: 'get',
    path: '/api/openapi.json',
    tags: ['System'],
    summary: 'OpenAPI specification',
    description: 'Returns the OpenAPI 3.0 document for this API.',
    responses: {
      200: {
        description: 'OpenAPI JSON document',
        content: {
          'application/json': {
            schema: z.object({}).passthrough().openapi('OpenApiDocument'),
          },
        },
      },
      500: errors.internalError,
    },
  },
  {
    // The Swagger UI lives at /swagger (src/pages/swagger.astro). /docs is the statically
    // exported Fumadocs site (public/docs) — a different surface, not this reference.
    method: 'get',
    path: '/swagger',
    tags: ['System'],
    summary: 'Swagger UI',
    description:
      'Interactive API reference powered by Swagger UI. Gated by API_DOCS_ENABLED (on in development).',
    responses: {
      200: {
        description: 'Swagger UI HTML page',
        content: {
          'text/html': {
            schema: { type: 'string' },
          },
        },
      },
    },
  },
  {
    method: 'get',
    path: '/api/cosmos/{metric}',
    tags: ['Analytics'],
    summary: 'Dashboard aggregate',
    description:
      'Read-only rollups from the Payments API for the signed-in consumer. `metric` is one of `summary`, `balances`, `logs` or `webhook-logs`; anything else is 404. Each has its own shape, forwarded unchanged.',
    security: sessionSecurity,
    request: {
      params: z.object({
        metric: z.enum(['summary', 'balances', 'logs', 'webhook-logs']).openapi({
          param: { name: 'metric', in: 'path' },
          example: 'summary',
        }),
      }),
      query: z.object({ env: envQuery }),
    },
    responses: {
      200: jsonOk(
        passthroughObject('AnalyticsPayload', 'The aggregate, forwarded unchanged.'),
        'AnalyticsResponse',
        'Metric fetched successfully',
      ),
      400: errors.badRequest,
      401: errors.unauthorized,
      404: { description: 'Unknown metric', content: errors.notFound.content },
      500: errors.internalError,
    },
  },
]);
