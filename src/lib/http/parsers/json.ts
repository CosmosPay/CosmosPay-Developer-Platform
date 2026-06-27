import { type ZodType, type z } from 'zod';
import { jsonBadRequest } from '@/lib/http/responses/json';
import type { ParseResult } from '@/lib/http/envelope.types';
import { formatZodError } from './zod.utils';

export async function parseJson<S extends ZodType>(
  request: Request,
  schema: S,
): Promise<ParseResult<z.infer<S>>> {
  let raw: unknown;

  try {
    const text = await request.text();

    if (!text.trim()) {
      raw = {};
    } else {
      const contentType = request.headers.get('content-type') ?? '';

      if (!contentType.includes('application/json')) {
        return {
          ok: false,
          response: jsonBadRequest('Content-Type must be application/json'),
        };
      }

      raw = JSON.parse(text);
    }
  } catch {
    return {
      ok: false,
      response: jsonBadRequest('Invalid JSON body'),
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
