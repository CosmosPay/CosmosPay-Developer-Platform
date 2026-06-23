import { errors, registerRoutes } from '@/lib/openapi/route-helpers';
import { z } from '@/lib/openapi/zod';

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
    method: 'get',
    path: '/docs',
    tags: ['System'],
    summary: 'Swagger UI',
    description: 'Interactive API documentation powered by Swagger UI.',
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
]);
