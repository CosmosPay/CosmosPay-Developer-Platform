import type { ZodError } from 'zod';

export function formatZodError(error: ZodError): string {
  return error.issues
    .map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join('.') : 'body';

      return `${path}: ${issue.message}`;
    })
    .join('; ');
}
