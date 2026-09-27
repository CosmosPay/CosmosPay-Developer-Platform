/* OpenAPI registration for the product catalog proxy (src/pages/api/products/**).
   Bodies are the schemas the handlers validate with (src/schemas/cosmos-resources.ts);
   the entity mirrors `ProductEntity` in the Payments API spec. */
import {
  errors,
  jsonCreated,
  jsonOk,
  registerRoutes,
  sessionSecurity,
} from '@/lib/openapi/route-helpers';
import { z } from '@/lib/openapi/zod';
import { createProductBodySchema, updateProductBodySchema } from '@/schemas/cosmos-resources';
import {
  deletedAckSchema,
  envQuery,
  idParam,
  jsonBody,
  orgQuery,
} from '@/schemas/shared/openapi-params';

const TAG = 'Products';

const productSchema = z
  .object({
    id: z.string().openapi({ example: 'prod_clx9z8a1b0000' }),
    name: z.string().openapi({ example: 'Pro plan' }),
    description: z.string().nullable().openapi({ example: 'Monthly subscription' }),
    amount: z.string().nullable().openapi({ example: '25.0000000' }),
    asset: z.string().openapi({ example: 'XLM' }),
    kind: z.enum(['recurring', 'one_time', 'link']).openapi({ example: 'one_time' }),
    active: z.boolean().openapi({ example: true }),
    reference: z.string().nullable().openapi({ example: null }),
    createdAt: z.string().openapi({ example: '2026-09-17T12:34:56.000Z' }),
    updatedAt: z.string().openapi({ example: '2026-09-17T12:34:56.000Z' }),
  })
  .openapi('Product', { description: 'A catalog item / price link.' });

const productListSchema = z
  .object({
    data: z.array(productSchema),
    total: z.number().int().openapi({ example: 1 }),
  })
  .openapi('ProductList', { description: "The organization's products." });

/* `org` is what the permission check keys on: without it the mutation is allowed as the
   account's own, with it the caller must hold `products:create|edit|delete` there. */
const writeQuery = z.object({ org: orgQuery, env: envQuery });

registerRoutes([
  {
    method: 'get',
    path: '/api/products',
    tags: [TAG],
    summary: 'List products',
    description: "Lists the account's products for the selected environment.",
    security: sessionSecurity,
    request: { query: z.object({ env: envQuery }) },
    responses: {
      200: jsonOk(productListSchema, 'ListProductsResponse', 'Products fetched successfully'),
      400: errors.badRequest,
      401: errors.unauthorized,
      500: errors.internalError,
    },
  },
  {
    method: 'post',
    path: '/api/products',
    tags: [TAG],
    summary: 'Create a product',
    description: 'Creates a catalog item. Requires `products:create` when `org` is supplied.',
    security: sessionSecurity,
    request: {
      query: writeQuery,
      ...jsonBody(createProductBodySchema.openapi('CreateProductBody')),
    },
    responses: {
      201: jsonCreated(productSchema, 'CreateProductResponse', 'Product created successfully'),
      400: errors.badRequest,
      401: errors.unauthorized,
      403: errors.forbidden,
      500: errors.internalError,
    },
  },
  {
    method: 'patch',
    path: '/api/products/{id}',
    tags: [TAG],
    summary: 'Update a product',
    description: 'Updates a catalog item. Requires `products:edit` when `org` is supplied.',
    security: sessionSecurity,
    request: {
      params: idParam,
      query: writeQuery,
      ...jsonBody(updateProductBodySchema.openapi('UpdateProductBody')),
    },
    responses: {
      200: jsonOk(productSchema, 'UpdateProductResponse', 'Product updated successfully'),
      400: errors.badRequest,
      401: errors.unauthorized,
      403: errors.forbidden,
      404: errors.notFound,
      500: errors.internalError,
    },
  },
  {
    method: 'delete',
    path: '/api/products/{id}',
    tags: [TAG],
    summary: 'Delete a product',
    description: 'Deletes a catalog item. Requires `products:delete` when `org` is supplied.',
    security: sessionSecurity,
    request: { params: idParam, query: writeQuery },
    responses: {
      200: jsonOk(deletedAckSchema, 'DeleteProductResponse', 'Product deleted successfully'),
      400: errors.badRequest,
      401: errors.unauthorized,
      403: errors.forbidden,
      404: errors.notFound,
      500: errors.internalError,
    },
  },
]);
