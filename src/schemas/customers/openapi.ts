/* OpenAPI registration for the customer directory proxy (src/pages/api/customers/**).
   The entity mirrors `CustomerWithStatsEntity` upstream: the payment counters are derived
   there and only present on reads. */
import {
  errors,
  jsonCreated,
  jsonOk,
  registerRoutes,
  sessionSecurity,
} from '@/lib/openapi/route-helpers';
import { z } from '@/lib/openapi/zod';
import { createCustomerBodySchema, updateCustomerBodySchema } from '@/schemas/cosmos-resources';
import {
  deletedAckSchema,
  envQuery,
  idParam,
  jsonBody,
  orgQuery,
} from '@/schemas/shared/openapi-params';

const TAG = 'Customers';

const customerSchema = z
  .object({
    id: z.string().openapi({ example: 'cus_clx9z8a1b0000' }),
    name: z.string().openapi({ example: 'Ada Lovelace' }),
    alias: z.string().nullable().openapi({ example: 'ada' }),
    note: z.string().nullable().openapi({ example: null }),
    email: z.string().nullable().openapi({ example: 'ada@example.com' }),
    account: z
      .string()
      .nullable()
      .openapi({ example: 'GA7QYNF7SOWQ3GLR2BGMZEHXAVIRZA4KVWLTJJFC7MGXUA74P7UJVSGZ' }),
    reference: z.string().nullable().openapi({ example: null }),
    payments: z
      .number()
      .int()
      .optional()
      .openapi({ example: 12, description: 'Payment intents addressed to this customer.' }),
    succeeded: z.number().int().optional().openapi({ example: 9 }),
    total: z
      .string()
      .optional()
      .openapi({ example: '310.5000000', description: 'Sum of succeeded payments.' }),
    createdAt: z.string().openapi({ example: '2026-09-17T12:34:56.000Z' }),
    updatedAt: z.string().openapi({ example: '2026-09-17T12:34:56.000Z' }),
  })
  .openapi('Customer', { description: 'A merchant-managed customer with derived payment stats.' });

const customerListSchema = z
  .object({
    data: z.array(customerSchema),
    total: z.number().int().openapi({ example: 1 }),
  })
  .openapi('CustomerList', { description: "The organization's customers." });

const writeQuery = z.object({ org: orgQuery, env: envQuery });

registerRoutes([
  {
    method: 'get',
    path: '/api/customers',
    tags: [TAG],
    summary: 'List customers',
    description: "Lists the account's customers for the selected environment.",
    security: sessionSecurity,
    request: { query: z.object({ env: envQuery }) },
    responses: {
      200: jsonOk(customerListSchema, 'ListCustomersResponse', 'Customers fetched successfully'),
      400: errors.badRequest,
      401: errors.unauthorized,
      500: errors.internalError,
    },
  },
  {
    method: 'post',
    path: '/api/customers',
    tags: [TAG],
    summary: 'Create a customer',
    description: 'Creates a customer record. Requires `customers:create` when `org` is supplied.',
    security: sessionSecurity,
    request: {
      query: writeQuery,
      ...jsonBody(createCustomerBodySchema.openapi('CreateCustomerBody')),
    },
    responses: {
      201: jsonCreated(customerSchema, 'CreateCustomerResponse', 'Customer created successfully'),
      400: errors.badRequest,
      401: errors.unauthorized,
      403: errors.forbidden,
      500: errors.internalError,
    },
  },
  {
    method: 'patch',
    path: '/api/customers/{id}',
    tags: [TAG],
    summary: 'Update a customer',
    description: 'Updates a customer record. Requires `customers:edit` when `org` is supplied.',
    security: sessionSecurity,
    request: {
      params: idParam,
      query: writeQuery,
      ...jsonBody(updateCustomerBodySchema.openapi('UpdateCustomerBody')),
    },
    responses: {
      200: jsonOk(customerSchema, 'UpdateCustomerResponse', 'Customer updated successfully'),
      400: errors.badRequest,
      401: errors.unauthorized,
      403: errors.forbidden,
      404: errors.notFound,
      500: errors.internalError,
    },
  },
  {
    method: 'delete',
    path: '/api/customers/{id}',
    tags: [TAG],
    summary: 'Delete a customer',
    description: 'Deletes a customer record. Requires `customers:delete` when `org` is supplied.',
    security: sessionSecurity,
    request: { params: idParam, query: writeQuery },
    responses: {
      200: jsonOk(deletedAckSchema, 'DeleteCustomerResponse', 'Customer deleted successfully'),
      400: errors.badRequest,
      401: errors.unauthorized,
      403: errors.forbidden,
      404: errors.notFound,
      500: errors.internalError,
    },
  },
]);
