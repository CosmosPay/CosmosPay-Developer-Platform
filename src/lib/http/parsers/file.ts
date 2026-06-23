import { type ZodType, type z } from 'zod';
import { jsonBadRequest } from '../responses/json';
import type { ParseResult } from '../envelope.types';
import { formatZodError } from './zod.utils';

export async function parseMultipartFile<S extends ZodType>(
  request: Request,
  fieldName: string,
  schema?: S,
): Promise<ParseResult<S extends ZodType ? z.infer<S> : File>> {
  const contentType = request.headers.get('content-type') ?? '';

  if (!contentType.includes('multipart/form-data')) {
    return {
      ok: false,
      response: jsonBadRequest('Content-Type must be multipart/form-data'),
    };
  }

  try {
    const formData = await request.formData();
    const file = formData.get(fieldName);

    if (!(file instanceof File)) {
      return {
        ok: false,
        response: jsonBadRequest(`Missing file field: ${fieldName}`),
      };
    }

    if (!schema) {
      return { ok: true, data: file as S extends ZodType ? z.infer<S> : File };
    }

    const result = schema.safeParse(file);

    if (!result.success) {
      return {
        ok: false,
        response: jsonBadRequest(formatZodError(result.error)),
      };
    }

    return { ok: true, data: result.data };
  } catch {
    return {
      ok: false,
      response: jsonBadRequest('Invalid multipart body'),
    };
  }
}
