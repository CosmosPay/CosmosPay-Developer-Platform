import { z } from '@/lib/openapi/zod';

const apiKeyIdValueSchema = z
  .string()
  .regex(
    /^cosmos_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    'Invalid API key id format',
  );

export const apiKeyIdParamSchema = z
  .object({
    id: apiKeyIdValueSchema.openapi({
      param: { name: 'id', in: 'path' },
      example: 'cosmos_59549b25-6b9d-4396-b6e6-7acc0cb41ac1',
      description: 'API key identifier',
    }),
  })
  .openapi('ApiKeyIdParam', {
    description: 'Path parameter for API key routes',
  });

export const apiKeyDataSchema = z
  .object({
    username: z.string().openapi({ example: 'cosmos_user-id' }),
    apiKey: z.string().openapi({ example: 'dv_a1b2c3...' }),
    id: apiKeyIdValueSchema.openapi({
      example: 'cosmos_59549b25-6b9d-4396-b6e6-7acc0cb41ac1',
    }),
    createdAt: z.string().openapi({ example: '2021-01-01T00:00:00Z' }),
    updatedAt: z.string().openapi({ example: '2021-01-01T00:00:00Z' }),
    permissions: z.array(z.string()).openapi({ example: ['read', 'write'] }),
    role: z.enum(['admin', 'user']).openapi({ example: 'admin' }),
    name: z.string().optional().openapi({ example: 'Production server' }),
    description: z.string().optional().openapi({ example: 'Used by the billing service' }),
  })
  .openapi('ApiKeyData', {
    description: 'Created API key payload',
  });

export const ensureRouteDataSchema = z
  .object({
    routeId: z.string().openapi({ example: 'cosmos-api-keys' }),
    ensured: z.boolean().openapi({ example: true }),
  })
  .openapi('EnsureRouteData', {
    description: 'APISIX route ensure result',
  });

export const apiKeyIdDataSchema = z
  .object({
    id: apiKeyIdValueSchema.openapi({
      example: 'cosmos_59549b25-6b9d-4396-b6e6-7acc0cb41ac1',
    }),
    createdAt: z.string().openapi({ example: '2021-01-01T00:00:00Z' }),
    updatedAt: z.string().openapi({ example: '2021-01-01T00:00:00Z' }),
    permissions: z.array(z.string()).openapi({ example: ['read', 'write'] }),
    role: z.enum(['admin', 'user']).openapi({ example: 'user' }),
    name: z.string().optional().openapi({ example: 'Production server' }),
    description: z.string().optional().openapi({ example: 'Used by the billing service' }),
  })
  .openapi('ApiKeyIdData', {
    description: 'API key metadata (secret is never returned)',
  });

export const apiKeyListDataSchema = z
  .object({
    id: apiKeyIdValueSchema.openapi({
      example: 'cosmos_59549b25-6b9d-4396-b6e6-7acc0cb41ac1',
    }),
    createdAt: z.string().openapi({ example: '2021-01-01T00:00:00Z' }),
    updatedAt: z.string().openapi({ example: '2021-01-01T00:00:00Z' }),
    permissions: z.array(z.string()).openapi({ example: ['read', 'write'] }),
    role: z.enum(['admin', 'user']).openapi({ example: 'admin' }),
    name: z.string().optional().openapi({ example: 'Production server' }),
    description: z.string().optional().openapi({ example: 'Used by the billing service' }),
  })
  .openapi('ApiKeyListData', {
    description: 'API key list result',
  });


export type ApiKeyData = z.infer<typeof apiKeyDataSchema>;
export type EnsureRouteData = z.infer<typeof ensureRouteDataSchema>;
export type ApiKeyIdData = z.infer<typeof apiKeyIdDataSchema>;
export type ApiKeyListData = z.infer<typeof apiKeyListDataSchema>;