import { z } from '@/lib/openapi/zod';
import { apiKeyEnvironmentSchema } from '../shared/environment';

// Scopes are `resource:action` (e.g. payments:write). May be empty for `admin`
// keys, which bypass scope checks upstream.
const apiKeyPermissionsSchema = z
  .array(z.string().min(1))
  .default([])
  .openapi({ example: ['payments:read', 'payments:write'] });

const apiKeyNameSchema = z.string().trim().max(80).optional().openapi({ example: 'Production server' });
const apiKeyDescriptionSchema = z.string().trim().max(240).optional().openapi({ example: 'Used by the billing service' });
// API keys belong to an organization — the caller must specify which one.
const apiKeyOrgSchema = z.string().trim().min(1).max(64).openapi({ example: 'org_abc123' });

export const createApiKeyBodySchema = z
  .object({
    org: apiKeyOrgSchema,
    environment: apiKeyEnvironmentSchema.default('dev'),
    permissions: apiKeyPermissionsSchema,
    role: z.enum(['admin', 'user']).default('user'),
    name: apiKeyNameSchema,
    description: apiKeyDescriptionSchema,
  })
  .openapi('CreateApiKeyBody', {
    description: 'Request body for creating a new API key',
  });

export const updateApiKeyBodySchema = z
  .object({
    permissions: apiKeyPermissionsSchema,
    role: z.enum(['admin', 'user']).default('user'),
    name: apiKeyNameSchema,
    description: apiKeyDescriptionSchema,
  })
  .openapi('UpdateApiKeyBody', {
    description: 'Request body for updating an API key',
  });

export type CreateApiKeyBody = z.infer<typeof createApiKeyBodySchema>;
export type UpdateApiKeyBody = z.infer<typeof updateApiKeyBodySchema>;