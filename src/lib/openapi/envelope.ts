import { ApiStatus } from '@/lib/http/envelope.types';
import { z } from './zod';

export const apiStatusSchema = z
  .enum([
    ApiStatus.SUCCESS,
    ApiStatus.CREATED,
    ApiStatus.NO_CONTENT,
    ApiStatus.BAD_REQUEST,
    ApiStatus.UNAUTHORIZED,
    ApiStatus.FORBIDDEN,
    ApiStatus.NOT_FOUND,
    ApiStatus.CONFLICT,
    ApiStatus.UNPROCESSABLE,
    ApiStatus.INTERNAL_ERROR,
  ])
  .openapi('ApiStatus', {
    description: 'Application-level status string',
    example: ApiStatus.SUCCESS,
  });

export const apiErrorEnvelopeSchema = z
  .object({
    data: z.null().openapi({ example: null }),
    code: z.number().int().openapi({ example: 400 }),
    status: apiStatusSchema,
    message: z.string().openapi({ example: 'Invalid request' }),
  })
  .openapi('ApiErrorEnvelope', {
    description: 'Standard error response envelope',
  });

export function apiSuccessEnvelopeSchema<T extends z.ZodTypeAny>(
  dataSchema: T,
  refId: string,
  description: string,
) {
  return z
    .object({
      data: dataSchema,
      code: z.number().int(),
      status: apiStatusSchema,
      message: z.string(),
    })
    .openapi(refId, { description });
}
