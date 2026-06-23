import {
  bearerSecurity,
  errors,
  jsonCreated,
  jsonOk,
  registerRoutes,
  sessionSecurity,
} from '@/lib/openapi/route-helpers';
import { z } from '@/lib/openapi/zod';
import { createApiKeyBodySchema, updateApiKeyBodySchema } from './request';
import {
  apiKeyDataSchema,
  apiKeyIdDataSchema,
  apiKeyIdParamSchema,
  apiKeyListDataSchema,
} from './response';

registerRoutes([
  {
    method: 'get',
    path: '/api/api-keys',
    tags: ['API Keys'],
    summary: 'List API keys',
    description:
      'Ensures the APISIX gateway route exists and returns all API keys for the authenticated user. API key secrets are never included in list responses.',
    security: sessionSecurity,
    responses: {
      200: jsonOk(
        z.array(apiKeyListDataSchema),
        'ListApiKeysResponse',
        'API keys fetched successfully',
      ),
      401: errors.unauthorized,
      500: errors.internalError,
    },
  },
  {
    method: 'post',
    path: '/api/api-keys',
    tags: ['API Keys'],
    summary: 'Create API key',
    description:
      'Creates an APISIX consumer credential for the authenticated user. The API key secret is returned only in this response.',
    security: sessionSecurity,
    request: {
      body: {
        content: {
          'application/json': {
            schema: createApiKeyBodySchema,
          },
        },
        required: true,
      },
    },
    responses: {
      201: jsonCreated(
        apiKeyDataSchema,
        'CreateApiKeyResponse',
        'API key created successfully',
      ),
      400: errors.badRequest,
      401: errors.unauthorized,
      500: errors.internalError,
    },
  },
  {
    method: 'get',
    path: '/api/api-keys/{id}',
    tags: ['API Keys'],
    summary: 'Get API key by id',
    description:
      'Returns API key metadata for the authenticated user. The secret is never returned.',
    security: sessionSecurity,
    request: {
      params: apiKeyIdParamSchema,
    },
    responses: {
      200: jsonOk(
        apiKeyIdDataSchema,
        'GetApiKeyResponse',
        'API key retrieved successfully',
      ),
      401: errors.unauthorized,
      404: errors.notFound,
      500: errors.internalError,
    },
  },
  {
    method: 'patch',
    path: '/api/api-keys/{id}',
    tags: ['API Keys'],
    summary: 'Update API key',
    description:
      'Updates permissions and role metadata for an API key owned by the authenticated user. Does not rotate the secret.',
    security: sessionSecurity,
    request: {
      params: apiKeyIdParamSchema,
      body: {
        content: {
          'application/json': {
            schema: updateApiKeyBodySchema,
          },
        },
        required: true,
      },
    },
    responses: {
      200: jsonOk(
        apiKeyIdDataSchema,
        'UpdateApiKeyResponse',
        'API key updated successfully',
      ),
      400: errors.badRequest,
      401: errors.unauthorized,
      404: errors.notFound,
      500: errors.internalError,
    },
  },
  {
    method: 'delete',
    path: '/api/api-keys/{id}',
    tags: ['API Keys'],
    summary: 'Delete API key',
    description:
      'Permanently deletes an API key owned by the authenticated user.',
    security: sessionSecurity,
    request: {
      params: apiKeyIdParamSchema,
    },
    responses: {
      200: jsonOk(
        z.null(),
        'DeleteApiKeyResponse',
        'API key deleted successfully',
      ),
      401: errors.unauthorized,
      404: errors.notFound,
      500: errors.internalError,
    },
  },
  {
    method: 'get',
    path: '/cosmos-api/{path}',
    tags: ['API Keys'],
    summary: 'Proxied Cosmos API (APISIX)',
    description:
      'External route proxied through APISIX. Authenticate with the `apikey: <key>` header. Path prefix /cosmos-api is rewritten upstream.',
    security: bearerSecurity,
    request: {
      params: z.object({
        path: z.string().openapi({
          param: { name: 'path', in: 'path' },
          example: 'ip',
        }),
      }),
    },
    responses: {
      200: {
        description:
          'Upstream response (JSON, text, or binary depending on route)',
        content: {
          'application/json': { schema: { type: 'object' } },
          'application/octet-stream': {
            schema: { type: 'string', format: 'binary' },
          },
          'image/png': { schema: { type: 'string', format: 'binary' } },
          'image/jpeg': { schema: { type: 'string', format: 'binary' } },
          'application/pdf': { schema: { type: 'string', format: 'binary' } },
        },
      },
      401: errors.unauthorized,
      403: errors.forbidden,
      502: errors.internalError,
    },
  },
]);
