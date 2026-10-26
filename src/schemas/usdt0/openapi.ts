/* OpenAPI registration for the dashboard's USDT0 proxy routes (auto-loaded by
   src/lib/openapi/auto-load.ts via the /src/schemas/**\/openapi.ts glob).

   USDT0, Tether's omnichain USDT, out of Stellar through LayerZero's OFT: 1:1, native USDT on
   Ethereum and USDT0 on the other networks /api/usdt0/routes lists. Stellar mainnet only (USDT0
   does not exist on testnet); the source signs one Soroban transaction and pays LayerZero's fee
   in XLM; the seventh decimal never crosses (the OFT shares six). No Cosmos Pay commission. */
import { errors, jsonCreated, jsonOk, registerRoutes, sessionSecurity } from "@/lib/openapi/route-helpers";
import { z } from "@/lib/openapi/zod";
import { usdt0QuoteBodySchema, usdt0SubmitBodySchema, usdt0TransferBodySchema } from "@/schemas/usdt0";

const tags = ["USDT0"];
const orgQuery = z.string().openapi({ param: { name: "org", in: "query" }, example: "org_123" });
const envQuery = z.enum(["dev", "prod"]).optional().openapi({ param: { name: "env", in: "query" }, example: "prod" });
const idParam = z.object({ id: z.string().openapi({ param: { name: "id", in: "path" } }) });
const jsonBody = (schema: z.ZodTypeAny) => ({ body: { content: { "application/json": { schema } }, required: true } });
const common = { 401: errors.unauthorized, 403: errors.forbidden, 500: errors.internalError };
const receives = z.enum(["USDT", "USDT0"]).openapi({ example: "USDT", description: "Native USDT on Ethereum, USDT0 elsewhere." });

const routesSchema = z
  .object({
    available: z.boolean().openapi({ example: true, description: "False on testnet: USDT0 is on Stellar mainnet only." }),
    network: z.string().openapi({ example: "public" }),
    token: z.object({
      code: z.string().openapi({ example: "USDT0" }),
      issuer: z.string().openapi({ example: "GATISXX6BZ6NC7IKQBY37CJD4SOZL3CYZJWXEDG6JVIY4WBS6KXJHN6Q" }),
      contract: z.string().openapi({ example: "CBSJZEIO5C7KC2SF3MKSNXXJSW5G3VTNBX4ATMKUI3B2MR4JKM4R26YF" }),
    }),
    oft: z.string().openapi({ example: "CBOWOLFSDM5PZXNFIVDMP5NZ7U2GSIHED6H6R446QOHF266XINKUMMF6" }),
    eid: z.number().openapi({ example: 30600 }),
    routes: z.array(z.object({
      chain: z.string().openapi({ example: "eth" }),
      name: z.string().openapi({ example: "Ethereum" }),
      eid: z.number().openapi({ example: 30101 }),
      receives,
    })),
  })
  .openapi("Usdt0Routes");

const quoteSchema = z
  .object({
    to: z.string().openapi({ example: "eth" }),
    eid: z.number().openapi({ example: 30101 }),
    receives,
    amount: z.string().openapi({ example: "12.5000001" }),
    amountSent: z.string().openapi({ example: "12.5" }),
    amountReceived: z.string().openapi({ example: "12.5" }),
    dust: z.string().openapi({ example: "0.0000001", description: "What stays on Stellar: the seventh decimal." }),
    nativeFee: z.string().openapi({ example: "3.5561383", description: "LayerZero's fee, in XLM." }),
    minAmount: z.string().openapi({ example: "0" }),
    maxAmount: z.string().openapi({ example: "1844674407370.9551615" }),
  })
  .openapi("Usdt0Quote");

const transferSchema = z
  .object({
    id: z.string().openapi({ example: "cm1x2y3z4a5b6c7d8e9f0g1h2" }),
    status: z.enum(["PENDING", "SUBMITTED", "DELIVERED", "FAILED", "EXPIRED"]).openapi({ example: "PENDING" }),
    network: z.string().openapi({ example: "public" }),
    source: z.string().openapi({ example: "GCKFBEIYV2U22IO2BJ4KVJOIP7XPWQGQFKKWXR6DOSJBV7STMAQSMTGG" }),
    to: z.string().openapi({ example: "eth" }),
    eid: z.number().openapi({ example: 30101 }),
    receives,
    recipient: z.string().openapi({ example: "0x2c7536e3605d9c16a7a3d7b1898e529396a65c23" }),
    amount: z.string().openapi({ example: "12.5" }),
    amountSent: z.string().openapi({ example: "12.5" }),
    amountReceived: z.string().openapi({ example: "12.5" }),
    nativeFee: z.string().openapi({ example: "3.5561383" }),
    xdr: z.string().nullable().openapi({ description: "The unsigned Soroban transaction the source signs." }),
    uri: z.string().nullable().openapi({ description: "A SEP-7 tx URI for other wallets." }),
    qr: z.string().nullable(),
    txHash: z.string().nullable(),
    guid: z.string().nullable().openapi({ description: "The LayerZero message id, once sent." }),
    destinationTxHash: z.string().nullable(),
    scanUrl: z.string().nullable().openapi({ example: "https://layerzeroscan.com/tx/..." }),
    expiresAt: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .openapi("Usdt0Transfer", { description: "A USDT0 transfer out of Stellar through LayerZero's OFT." });

registerRoutes([
  {
    method: "get",
    path: "/api/usdt0/routes",
    tags,
    summary: "USDT0 routes",
    description: "The networks USDT0 reaches from Stellar, and what arrives on each. Empty with `available: false` in the sandbox.",
    security: sessionSecurity,
    request: { query: z.object({ org: orgQuery, env: envQuery }) },
    responses: { 200: jsonOk(routesSchema, "GetUsdt0RoutesResponse", "USDT0 routes fetched successfully"), 400: errors.badRequest, ...common },
  },
  {
    method: "post",
    path: "/api/usdt0/quote",
    tags,
    summary: "Quote a USDT0 transfer",
    description: "What arrives (1:1, less the seventh decimal) and LayerZero's fee in XLM, simulated on Stellar mainnet.",
    security: sessionSecurity,
    request: jsonBody(usdt0QuoteBodySchema.openapi("Usdt0QuoteBody")),
    responses: { 200: jsonOk(quoteSchema, "QuoteUsdt0Response", "USDT0 transfer quoted successfully"), 400: errors.badRequest, ...common },
  },
  {
    method: "post",
    path: "/api/usdt0/transfers",
    tags,
    summary: "Create a USDT0 transfer",
    description:
      "Builds the unsigned Soroban transaction the source signs (one `send` on the OFT). The source must trust and hold the USDT0, and hold the XLM for LayerZero's fee. Needs `payments:create`.",
    security: sessionSecurity,
    request: jsonBody(usdt0TransferBodySchema.openapi("Usdt0TransferBody")),
    responses: { 201: jsonCreated(transferSchema, "CreateUsdt0TransferResponse", "USDT0 transfer created successfully"), 400: errors.badRequest, ...common },
  },
  {
    method: "get",
    path: "/api/usdt0/transfers",
    tags,
    summary: "List USDT0 transfers",
    description: "The organization's USDT0 transfers, newest first.",
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
    responses: {
      200: jsonOk(z.object({ data: z.array(transferSchema), total: z.number(), take: z.number(), skip: z.number() }).openapi("Usdt0TransferList"), "ListUsdt0TransfersResponse", "USDT0 transfers fetched successfully"),
      400: errors.badRequest,
      ...common,
    },
  },
  {
    method: "get",
    path: "/api/usdt0/transfers/{id}",
    tags,
    summary: "Get a USDT0 transfer",
    description: "One transfer; while it travels, its status is refreshed from LayerZero Scan.",
    security: sessionSecurity,
    request: { params: idParam, query: z.object({ org: orgQuery, env: envQuery }) },
    responses: { 200: jsonOk(transferSchema, "GetUsdt0TransferResponse", "USDT0 transfer fetched successfully"), 404: errors.notFound, ...common },
  },
  {
    method: "post",
    path: "/api/usdt0/transfers/{id}/submit",
    tags,
    summary: "Submit a USDT0 transfer",
    description: "Sends the signed transaction built for this transfer. Needs `payments:create`.",
    security: sessionSecurity,
    request: { params: idParam, query: z.object({ org: orgQuery, env: envQuery }), ...jsonBody(usdt0SubmitBodySchema.openapi("Usdt0SubmitBody")) },
    responses: {
      200: jsonOk(z.object({ submitted: z.boolean(), reason: z.string().optional(), transfer: transferSchema }).openapi("Usdt0SubmitOutcome"), "SubmitUsdt0TransferResponse", "USDT0 transfer submitted"),
      400: errors.badRequest,
      404: errors.notFound,
      ...common,
    },
  },
]);
