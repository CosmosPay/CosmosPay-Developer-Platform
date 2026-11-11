import { z } from '@/lib/openapi/zod';
import { apiKeyEnvironmentSchema } from '@/schemas/shared/environment';

// Scopes are `resource:action` (e.g. payments:write). A full-access key lists every scope
// of the catalog (`COSMOS_SCOPES`).
const apiKeyPermissionsSchema = z
  .array(z.string().min(1))
  .default([])
  .openapi({ example: ['payments:read', 'payments:write'] });

const apiKeyNameSchema = z.string().trim().max(80).optional().openapi({ example: 'Production server' });
const apiKeyDescriptionSchema = z.string().trim().max(240).optional().openapi({ example: 'Used by the billing service' });
// API keys belong to an organization: the caller must specify which one.
const apiKeyOrgSchema = z.string().trim().min(1).max(64).openapi({ example: 'org_abc123' });

// A key's role is decided by the server, never by the caller: every key minted here is
// `user`, and the gateway reads `admin` as the platform's own key (no scope checks, KYC
// review sign-off, the fiat kill-switch). The field stays only so clients that still send
// `"user"` keep working; any other value is a 400.
const apiKeyRoleSchema = z
  .literal('user')
  .optional()
  .openapi({
    example: 'user',
    description: 'Deprecated: every key is `user`. A key\'s role is set by the server; any other value is refused.',
  });

export const createApiKeyBodySchema = z
  .object({
    org: apiKeyOrgSchema,
    environment: apiKeyEnvironmentSchema.default('dev'),
    permissions: apiKeyPermissionsSchema,
    role: apiKeyRoleSchema,
    name: apiKeyNameSchema,
    description: apiKeyDescriptionSchema,
  })
  .openapi('CreateApiKeyBody', {
    description: 'Request body for creating a new API key',
  });

export const updateApiKeyBodySchema = z
  .object({
    permissions: apiKeyPermissionsSchema,
    role: apiKeyRoleSchema,
    name: apiKeyNameSchema,
    description: apiKeyDescriptionSchema,
  })
  .openapi('UpdateApiKeyBody', {
    description: 'Request body for updating an API key',
  });

export type CreateApiKeyBody = z.infer<typeof createApiKeyBodySchema>;
export type UpdateApiKeyBody = z.infer<typeof updateApiKeyBodySchema>;
