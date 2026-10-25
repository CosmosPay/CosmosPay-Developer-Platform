/* OpenAPI registration for the dashboard's ZK payment proxy routes (auto-loaded by
   src/lib/openapi/auto-load.ts via the /src/schemas/**\/openapi.ts glob).

   ZK payments as a service: confidential payments on Cosmos Pay's confidential token
   (OpenZeppelin's stellar-confidential), where the amount stays hidden on-chain. The commission
   is 0.01% per transaction, taken from the payment and enforced by the Payments API; there is
   no fee field in any request body. */
import { errors, jsonCreated, jsonOk, registerRoutes, sessionSecurity } from "@/lib/openapi/route-helpers";
import { z } from "@/lib/openapi/zod";
import { createZkPaymentBodySchema } from "@/schemas/zk-payments";

const tags = ["ZK Payments"];
const orgQuery = z.string().openapi({ param: { name: "org", in: "query" }, example: "org_123" });
const envQuery = z.enum(["dev", "prod"]).optional().openapi({ param: { name: "env", in: "query" }, example: "dev" });

const configSchema = z
  .object({
    enabled: z.boolean().openapi({ example: true }),
    network: z.string().openapi({ example: "testnet" }),
    rpcUrl: z.string().openapi({ example: "https://soroban-testnet.stellar.org" }),
    networkPassphrase: z.string().openapi({ example: "Test SDF Network ; September 2015" }),
    token: z.object({
      contractId: z.string().openapi({ example: "CA642WUED6PACAQGVKSXND3DRSXGR7DP2L7TRHZORPWEPNRVGGN4L4ED" }),
      symbol: z.string().openapi({ example: "XLM" }),
      decimals: z.number().openapi({ example: 7 }),
      underlying: z.string().openapi({ example: "native" }),
      deployedAtLedger: z.number().openapi({ example: 5371973 }),
    }),
    verifier: z.string(),
    auditorRegistry: z.string(),
    auditorId: z.number().openapi({ example: 0 }),
    feeBps: z.number().openapi({ example: 1, description: "The commission in basis points: 1 is 0.01%." }),
    feeAccount: z.string().openapi({ description: "Cosmos Pay's confidential account that receives the commission." }),
  })
  .openapi("ZkPaymentsConfig");

const paymentSchema = z
  .object({
    id: z.string().openapi({ example: "cm1x2y3z4a5b6c7d8e9f0g1h2" }),
    status: z.enum(["PENDING", "SUCCEEDED", "EXPIRED"]).openapi({ example: "PENDING" }),
    network: z.string().openapi({ example: "testnet" }),
    tokenContract: z.string(),
    amount: z.string().openapi({ example: "100", description: "What the payer pays." }),
    netAmount: z.string().openapi({ example: "99.99", description: "What the merchant receives: the amount minus the commission." }),
    feeAmount: z.string().openapi({ example: "0.01", description: "The 0.01% commission, rounded up to the stroop." }),
    feeBps: z.number().openapi({ example: 1 }),
    recipient: z.string().openapi({ example: "GCKFBEIYV2U22IO2BJ4KVJOIP7XPWQGQFKKWXR6DOSJBV7STMAQSMTGG" }),
    feeAccount: z.string(),
    payer: z.string().nullable(),
    paymentTxHash: z.string().nullable(),
    feeTxHash: z.string().nullable(),
    description: z.string().nullable(),
    expiresAt: z.string(),
    settledAt: z.string().nullable(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .openapi("ZkPayment", { description: "A confidential payment and its split between the merchant and the commission." });

const listSchema = z
  .object({ data: z.array(paymentSchema), total: z.number(), take: z.number(), skip: z.number() })
  .openapi("ZkPaymentList");

const common = { 401: errors.unauthorized, 403: errors.forbidden, 500: errors.internalError };

registerRoutes([
  {
    method: "get",
    path: "/api/zk-payments/config",
    tags,
    summary: "ZK payments configuration",
    description: "The confidential token's setup on the environment's network: contracts, RPC, auditor id, the 0.01% commission and its account.",
    security: sessionSecurity,
    request: { query: z.object({ org: orgQuery, env: envQuery }) },
    responses: { 200: jsonOk(configSchema, "GetZkPaymentsConfigResponse", "ZK payments configuration fetched successfully"), 400: errors.badRequest, ...common },
  },
  {
    method: "post",
    path: "/api/zk-payments",
    tags,
    summary: "Create a ZK payment",
    description:
      "A confidential payment the payer completes on the ZK checkout. The recipient must hold a confidential account on the token. The merchant receives the amount minus the 0.01% commission.",
    security: sessionSecurity,
    request: { body: { content: { "application/json": { schema: createZkPaymentBodySchema.openapi("CreateZkPaymentBody") } }, required: true } },
    responses: { 201: jsonCreated(paymentSchema, "CreateZkPaymentResponse", "ZK payment created successfully"), 400: errors.badRequest, ...common },
  },
  {
    method: "get",
    path: "/api/zk-payments",
    tags,
    summary: "List ZK payments",
    description: "The organization's ZK payments, newest first.",
    security: sessionSecurity,
    request: {
      query: z.object({
        org: orgQuery,
        env: envQuery,
        status: z.string().optional().openapi({ param: { name: "status", in: "query" } }),
        take: z.number().int().optional().openapi({ param: { name: "take", in: "query" } }),
        skip: z.number().int().optional().openapi({ param: { name: "skip", in: "query" } }),
      }),
    },
    responses: { 200: jsonOk(listSchema, "ListZkPaymentsResponse", "ZK payments fetched successfully"), 400: errors.badRequest, ...common },
  },
  {
    method: "get",
    path: "/api/zk-payments/{id}",
    tags,
    summary: "Get a ZK payment",
    description: "One ZK payment, as the Payments API last saw it.",
    security: sessionSecurity,
    request: { params: z.object({ id: z.string().openapi({ param: { name: "id", in: "path" } }) }), query: z.object({ org: orgQuery, env: envQuery }) },
    responses: { 200: jsonOk(paymentSchema, "GetZkPaymentResponse", "ZK payment fetched successfully"), 404: errors.notFound, ...common },
  },
]);
