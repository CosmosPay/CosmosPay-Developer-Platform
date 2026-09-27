/* Request-side pieces every dashboard route repeats: the `?org=` / `?env=` pair the
   proxy helpers read (see lib/cosmos-proxy.ts), path params, pagination and the JSON
   body wrapper.

   Deliberately NOT named `openapi.ts`: the auto-loader globs
   `/src/schemas/**\/openapi.ts` and executes whatever it finds, and this file registers
   no route — it only exports the parts the files that DO register them are built from. */
import { z } from '@/lib/openapi/zod';

/** `?env=prod` selects the production consumer; anything else resolves to dev/testnet. */
export const envQuery = z
  .enum(['dev', 'prod'])
  .optional()
  .openapi({
    param: { name: 'env', in: 'query' },
    description: 'Consumer environment. Defaults to `dev` (Stellar testnet).',
    example: 'dev',
  });

/** Active workspace. Optional on reads, and what the permission check keys on for writes. */
export const orgQuery = z
  .string()
  .optional()
  .openapi({
    param: { name: 'org', in: 'query' },
    description:
      'Organization id. Membership is verified when present; on mutations it also decides which org permission is required.',
    example: 'org_123',
  });

/** Same field, for the routes that refuse to act without a workspace. */
export const requiredOrgQuery = z.string().openapi({
  param: { name: 'org', in: 'query' },
  description: 'Organization id. Required — the caller must be a member.',
  example: 'org_123',
});

export const takeQuery = z.coerce
  .number()
  .int()
  .optional()
  .openapi({ param: { name: 'take', in: 'query' }, description: 'Page size.', example: 20 });

export const skipQuery = z.coerce
  .number()
  .int()
  .optional()
  .openapi({ param: { name: 'skip', in: 'query' }, description: 'Rows to skip.', example: 0 });

export const statusQuery = z
  .string()
  .optional()
  .openapi({ param: { name: 'status', in: 'query' }, description: 'Filter by status.' });

/** `{ id }`-style path params. `name` must match the Astro `[param]` segment. */
export function pathParam(name: string, example: string, description?: string) {
  return z.object({
    [name]: z.string().openapi({ param: { name, in: 'path' }, example, description }),
  });
}

export const idParam = pathParam('id', 'clx9z8a1b0000abcd1234efgh');

/** Required JSON request body. */
export function jsonBody(schema: z.ZodTypeAny, required = true) {
  return {
    body: { content: { 'application/json': { schema } }, required },
  };
}

/** The `{ id, deleted }` acknowledgement every upstream DELETE answers with. */
export const deletedAckSchema = z
  .object({
    id: z.string().openapi({ example: 'clx9z8a1b0000abcd1234efgh' }),
    deleted: z.boolean().openapi({ example: true }),
  })
  .openapi('DeletedAck', { description: 'Deletion acknowledgement from the Payments API.' });

/** Upstream payload this platform forwards without reshaping it. */
export function passthroughObject(refId: string, description: string) {
  return z.looseObject({}).openapi(refId, { description });
}
