import { type ZodType, type z } from 'zod';
import { jsonBadRequest } from '@/lib/http/responses/json';
import type { ParseResult } from '@/lib/http/envelope.types';
import { formatZodError } from './zod.utils';

export async function parseForm<S extends ZodType>(
  request: Request,
  schema: S,
): Promise<ParseResult<z.infer<S>>> {
  const contentType = request.headers.get('content-type') ?? '';

  if (
    !contentType.includes('multipart/form-data') &&
    !contentType.includes('application/x-www-form-urlencoded')
  ) {
    return {
      ok: false,
      response: jsonBadRequest(
        'Content-Type must be multipart/form-data or application/x-www-form-urlencoded',
      ),
    };
  }

  let raw: unknown;

  try {
    const formData = await request.formData();
    raw = Object.fromEntries(formData.entries());
  } catch {
    return {
      ok: false,
      response: jsonBadRequest('Invalid form body'),
    };
  }

  const result = schema.safeParse(raw);

  if (!result.success) {
    return {
      ok: false,
      response: jsonBadRequest(formatZodError(result.error)),
    };
  }

  return { ok: true, data: result.data };
}
