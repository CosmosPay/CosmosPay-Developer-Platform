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
import { createCustomerBodySchema, customerWalletBodySchema, updateCustomerBodySchema } from '@/schemas/cosmos-resources';
import {
  deletedAckSchema,
  envQuery,
  idParam,
  jsonBody,
  orgQuery,
  pathParam,
} from '@/schemas/shared/openapi-params';

const TAG = 'Customers';

const customerWalletSchema = z
  .object({
    id: z.string().openapi({ example: 'cw4f0c2a9d1b7e83c5a6f9d2e1b0c3a7f8' }),
    chain: z.enum(['stellar', 'solana', 'monad']).openapi({ example: 'stellar' }),
    address: z.string().openapi({ example: 'GA7QYNF7SOWQ3GLR2BGMZEHXAVIRZA4KVWLTJJFC7MGXUA74P7UJVSGZ' }),
    label: z.string().nullable().openapi({ example: 'Freighter' }),
    createdAt: z.string().openapi({ example: '2026-09-17T12:34:56.000Z' }),
  })
  .openapi('CustomerWallet', { description: 'A wallet of a customer, on one network.' });

const customerSchema = z
  .object({
    id: z.string().openapi({ example: 'cus_clx9z8a1b0000' }),
    name: z.string().openapi({ example: 'Ada Lovelace' }),
    alias: z.string().nullable().openapi({ example: 'ada' }),
    note: z.string().nullable().openapi({ example: null }),
    email: z.string().nullable().openapi({ example: 'ada@example.com' }),
    wallets: z
      .array(customerWalletSchema)
      .openapi({ description: "The customer's wallets, oldest first, on Stellar, Solana or Monad." }),
    account: z
      .string()
      .nullable()
      .openapi({
        example: 'GA7QYNF7SOWQ3GLR2BGMZEHXAVIRZA4KVWLTJJFC7MGXUA74P7UJVSGZ',
        description: "Deprecated upstream: the first wallet's address. Read `wallets`.",
      }),
    reference: z.string().nullable().openapi({ example: null }),
    payments: z
      .number()
      .int()
      .optional()
      .openapi({ example: 12, description: "Payment intents paid from any of the customer's wallets." }),
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
const walletParams = idParam.merge(pathParam('walletId', 'cw4f0c2a9d1b7e83c5a6f9d2e1b0c3a7f8'));
const walletTaken = {
  description: 'Another customer of the organization already holds that wallet (`customer_wallet_taken`)',
  content: errors.badRequest.content,
};

registerRoutes([
  {
    method: 'get',
    path: '/api/customers',
    tags: [TAG],
    summary: 'List customers',
    description: "Lists the account's customers for the selected environment.",
    security: sessionSecurity,
    request: {
      query: z.object({
        env: envQuery,
        take: z.number().int().min(1).max(100).optional().openapi({ example: 100, description: 'Page size, at most 100.' }),
        skip: z.number().int().min(0).optional().openapi({ example: 0 }),
      }),
    },
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
  {
    method: 'post',
    path: '/api/customers/{id}/wallets',
    tags: [TAG],
    summary: 'Add a wallet to a customer',
    description:
      'Adds a wallet on Stellar, Solana or Monad (up to 20 per customer); payments paid from it count toward the customer. Requires `customers:edit` when `org` is supplied.',
    security: sessionSecurity,
    request: {
      params: idParam,
      query: writeQuery,
      ...jsonBody(customerWalletBodySchema.openapi('AddCustomerWalletBody')),
    },
    responses: {
      201: jsonCreated(customerWalletSchema, 'AddCustomerWalletResponse', 'Wallet added successfully'),
      400: errors.badRequest,
      401: errors.unauthorized,
      403: errors.forbidden,
      404: errors.notFound,
      409: walletTaken,
      500: errors.internalError,
    },
  },
  {
    method: 'delete',
    path: '/api/customers/{id}/wallets/{walletId}',
    tags: [TAG],
    summary: 'Remove a wallet from a customer',
    description: 'Removes one wallet. Requires `customers:edit` when `org` is supplied.',
    security: sessionSecurity,
    request: { params: walletParams, query: writeQuery },
    responses: {
      200: jsonOk(deletedAckSchema, 'RemoveCustomerWalletResponse', 'Wallet removed successfully'),
      400: errors.badRequest,
      401: errors.unauthorized,
      403: errors.forbidden,
      404: errors.notFound,
      500: errors.internalError,
    },
  },
]);
