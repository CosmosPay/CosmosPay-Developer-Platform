import type { ResponseConfig } from '@asteasolutions/zod-to-openapi';
import { apiErrorEnvelopeSchema } from './envelope';

export const openApiErrorResponses = {
  badRequest: {
    description: 'Invalid request',
    content: {
      'application/json': {
        schema: apiErrorEnvelopeSchema,
      },
    },
  },
  unauthorized: {
    description: 'Authentication required',
    content: {
      'application/json': {
        schema: apiErrorEnvelopeSchema,
      },
    },
  },
  forbidden: {
    description: 'Access denied',
    content: {
      'application/json': {
        schema: apiErrorEnvelopeSchema,
      },
    },
  },
  notFound: {
    description: 'Resource not found',
    content: {
      'application/json': {
        schema: apiErrorEnvelopeSchema,
      },
    },
  },
  internalError: {
    description: 'Internal server error',
    content: {
      'application/json': {
        schema: apiErrorEnvelopeSchema,
      },
    },
  },
} satisfies Record<string, ResponseConfig>;

export function binaryResponse(
  mimeType: string,
  description: string,
): ResponseConfig {
  return {
    description,
    content: {
      [mimeType]: {
        schema: {
          type: 'string',
          format: 'binary',
        },
      },
    },
    headers: {
      'Content-Disposition': {
        schema: { type: 'string' },
        description: 'inline or attachment with filename',
      },
    },
  };
}
