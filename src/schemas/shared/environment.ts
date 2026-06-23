import { z } from '@/lib/openapi/zod';

export const apiKeyEnvironmentSchema = z
  .enum(['dev', 'prod'])
  .openapi('ApiKeyEnvironment', {
    description: 'Target deployment environment for the API key',
    example: 'dev',
  });

export type ApiKeyEnvironment = z.infer<typeof apiKeyEnvironmentSchema>;
