import type { ResponseConfig, RouteConfig } from '@asteasolutions/zod-to-openapi';
import type { z } from './zod';
import { apiSuccessEnvelopeSchema } from './envelope';
import { openApiErrorResponses } from './responses';
import { openApiRegistry } from './registry';

export const sessionSecurity = [{ sessionAuth: [] }];
export const bearerSecurity = [{ bearerAuth: [] }];

export const errors = openApiErrorResponses;

export function jsonOk<T extends z.ZodTypeAny>(
  dataSchema: T,
  refId: string,
  description: string,
): ResponseConfig {
  return {
    description,
    content: {
      'application/json': {
        schema: apiSuccessEnvelopeSchema(dataSchema, refId, description),
      },
    },
  };
}

export function jsonCreated<T extends z.ZodTypeAny>(
  dataSchema: T,
  refId: string,
  description: string,
): ResponseConfig {
  return jsonOk(dataSchema, refId, description);
}

export function registerRoute(config: RouteConfig): void {
  openApiRegistry.registerPath(config);
}

export function registerRoutes(configs: RouteConfig[]): void {
  for (const config of configs) {
    openApiRegistry.registerPath(config);
  }
}
