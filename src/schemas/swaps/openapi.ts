/* OpenAPI registration for the dashboard's Stellar swap proxy routes (auto-loaded by
   src/lib/openapi/auto-load.ts via the /src/schemas/**\/openapi.ts glob). Documents the
   /api/swaps surface in the portal API reference (/swagger + /api/openapi.json).

   Note: the swap commission is the calling organization's plan rate, enforced
   server-side — there is deliberately NO fee field in any request body. */
import {
  errors,
  jsonCreated,
  jsonOk,
  registerRoutes,
  sessionSecurity,
} from "@/lib/openapi/route-helpers";
import { z } from "@/lib/openapi/zod";

const env = z.enum(["dev", "prod"]).openapi({ example: "dev" });
const chain = z
  .enum(["stellar", "solana", "monad"])
  .openapi({ example: "stellar", description: "Omitted means Stellar. solana → Jupiter, monad → Kuru Flow (mainnet only)." });

const assetAmount = z.object({
  asset: z.string().openapi({ example: "native" }),
  issuer: z.string().nullable().openapi({ example: null }),
  amount: z.string().openapi({ example: "100" }),
});

const pathHop = z.object({
  code: z.string().openapi({ example: "yXLM" }),
  issuer: z.string().nullable().openapi({ example: null }),
});

const swapQuoteSchema = z
  .object({
    network: z.string().openapi({ example: "public" }),
    source: assetAmount,
    fee: z.object({
      asset: z.string().openapi({ example: "native" }),
      issuer: z.string().nullable().openapi({ example: null }),
      amount: z.string().openapi({ example: "0.5" }),
      bps: z.number().openapi({ example: 50, description: "Org plan commission (basis points)." }),
      wallet: z.string().nullable().openapi({ example: "GBFEE...WALLET" }),
    }),
    swap: assetAmount,
    destination: z.object({
      asset: z.string().openapi({ example: "USDC" }),
      issuer: z.string().nullable().openapi({ example: "GA5ZSEJYB37JRC5AVCIA5MOP4RHTR6F3DSZL5A3W4G4M4N4A5U4QY3T6" }),
      estimated: z.string().openapi({ example: "24.81" }),
      minimum: z.string().openapi({ example: "24.68595" }),
      slippageBps: z.number().openapi({ example: 50 }),
    }),
    path: z.array(pathHop),
  })
  .openapi("SwapQuote", { description: "Swap pricing (no commitment, nothing persisted)." });

const swapSchema = z
  .object({
    id: z.string().openapi({ example: "clx9z8a1b0000abcd1234efgh" }),
    status: z.enum(["PENDING", "SUBMITTED", "SUCCEEDED", "FAILED", "EXPIRED"]).openapi({ example: "PENDING" }),
    network: z.string().openapi({ example: "public" }),
    source: z.string().openapi({ example: "GA7QYNF7SOWQ3GLR2BGMZEHXAVIRZA4KVWLTJJFC7MGXUA74P7UJVSGZ" }),
    destination: z.string().openapi({ example: "GA7QYNF7SOWQ3GLR2BGMZEHXAVIRZA4KVWLTJJFC7MGXUA74P7UJVSGZ" }),
    sendAsset: z.string().openapi({ example: "native" }),
    sendAssetIssuer: z.string().nullable().openapi({ example: null }),
    sendAmount: z.string().openapi({ example: "100" }),
    feeAmount: z.string().openapi({ example: "0.5" }),
    feeBps: z.number().openapi({ example: 50 }),
    swapAmount: z.string().openapi({ example: "99.5" }),
    destAsset: z.string().openapi({ example: "USDC" }),
    destAssetIssuer: z.string().nullable().openapi({ example: "GA5ZSEJYB37JRC5AVCIA5MOP4RHTR6F3DSZL5A3W4G4M4N4A5U4QY3T6" }),
    destEstimated: z.string().openapi({ example: "24.81" }),
    destMin: z.string().openapi({ example: "24.68595" }),
    slippageBps: z.number().openapi({ example: 50 }),
    path: z.array(pathHop),
    memo: z.string().nullable().openapi({ example: null }),
    xdr: z.string().openapi({ example: "AAAAAgAAAAB..." }),
    uri: z.string().openapi({ example: "web+stellar:tx?xdr=AAAAAgAAAAB..." }),
    txHash: z.string().openapi({ example: "3389e9f0...64hex" }),
    qr: z.string().openapi({ example: "data:image/png;base64,iVBORw0KGgo..." }),
    createdAt: z.string().openapi({ example: "2026-06-29T12:34:56.000Z" }),
    updatedAt: z.string().openapi({ example: "2026-06-29T12:34:56.000Z" }),
  })
  .openapi("Swap", { description: "A persisted Stellar swap (unsigned tx to sign + QR)." });

const chainSwapSchema = z
  .object({
    id: z.string().openapi({ example: "cm1x2y3z4a5b6c7d8e9f0g1h2" }),
    chain: z.enum(["solana", "monad"]).openapi({ example: "solana" }),
    network: z.string().openapi({ example: "public" }),
    provider: z.enum(["jupiter", "kuru"]).openapi({ example: "jupiter" }),
    status: z.enum(["PENDING", "SUBMITTED", "SUCCEEDED", "FAILED", "EXPIRED"]).openapi({ example: "PENDING" }),
    source: z.string().openapi({ example: "13QkxhNMrTPxoCkRdYdJ65tFuwXPhL5gLS2Z5Nr6gjRK" }),
    sendAsset: z.string().openapi({ example: "native" }),
    sendAmount: z.string().openapi({ example: "0.1" }),
    destAsset: z.string().openapi({ example: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" }),
    destEstimated: z.string().openapi({ example: "11.87" }),
    destMin: z.string().openapi({ example: "11.81" }),
    feeBps: z.number().openapi({ example: 50 }),
    feeAmount: z.string().openapi({ example: "0.059", description: "In the destination asset (taken from the output)." }),
    slippageBps: z.number().openapi({ example: 50 }),
    path: z.array(pathHop),
    transaction: z.record(z.string(), z.unknown()).openapi({
      example: { encoding: "base64", data: "AQAAAA..." },
      description: "What the wallet signs. Solana: { encoding, data }; Monad: { to, data, value, chainId } (EIP-1559).",
    }),
    approval: z.record(z.string(), z.unknown()).nullable().openapi({ example: null, description: "Monad ERC-20 sales with a short allowance: the approve call to send first." }),
    txHash: z.string().nullable().openapi({ example: null }),
    expiresAt: z.string().openapi({ example: "2026-10-03T12:01:00.000Z" }),
    createdAt: z.string().openapi({ example: "2026-10-03T12:00:00.000Z" }),
    updatedAt: z.string().openapi({ example: "2026-10-03T12:00:00.000Z" }),
  })
  .openapi("ChainSwap", { description: "A Solana (Jupiter) or Monad (Kuru Flow) swap: the transaction to sign." });

const anySwap = z.union([swapSchema, chainSwapSchema]);

const swapListSchema = z
  .object({
    data: z.array(anySwap),
    total: z.number().openapi({ example: 1 }),
    take: z.number().openapi({ example: 20 }),
    skip: z.number().openapi({ example: 0 }),
  })
  .openapi("SwapList", { description: "Paginated list of swaps." });

const swapSubmitOutcomeSchema = z
  .object({
    submitted: z.boolean().openapi({ example: true }),
    status: z.enum(["PENDING", "SUBMITTED", "SUCCEEDED", "FAILED", "EXPIRED"]).openapi({ example: "SUCCEEDED" }),
    txHash: z.string().optional().openapi({ example: "3389e9f0...64hex" }),
    reason: z.string().optional().openapi({ example: "Transaction rejected by the network" }),
    resultCodes: z.array(z.string()).optional().openapi({ example: ["op_under_dest_min"] }),
    swap: anySwap,
  })
  .openapi("SwapSubmitOutcome", { description: "Result of relaying the signed swap." });

const quoteBody = z
  .object({
    org: z.string().openapi({ example: "org_123" }),
    environment: env.optional(),
    chain: chain.optional(),
    amount: z.string().openapi({ example: "100", description: "Gross source amount, in its own units." }),
    sourceAssetCode: z.string().optional().openapi({ example: "XLM" }),
    sourceAssetIssuer: z.string().optional(),
    destAssetCode: z.string().openapi({ example: "USDC" }),
    destAssetIssuer: z.string().optional().openapi({ example: "GA5ZSEJYB37JRC5AVCIA5MOP4RHTR6F3DSZL5A3W4G4M4N4A5U4QY3T6" }),
    slippageBps: z.number().int().optional().openapi({ example: 50 }),
  })
  .openapi("QuoteSwapBody");

const createBody = z
  .object({
    org: z.string().openapi({ example: "org_123" }),
    environment: env.optional(),
    chain: chain.optional(),
    amount: z.string().openapi({ example: "100" }),
    sourceAssetCode: z.string().optional(),
    sourceAssetIssuer: z.string().optional(),
    destAssetCode: z.string().openapi({ example: "USDC" }),
    destAssetIssuer: z.string().optional(),
    slippageBps: z.number().int().optional().openapi({ example: 50 }),
    source: z.string().openapi({ example: "GA7QYNF7SOWQ3GLR2BGMZEHXAVIRZA4KVWLTJJFC7MGXUA74P7UJVSGZ" }),
    destination: z.string().optional(),
    memo: z.string().optional().openapi({ example: "123456789" }),
  })
  .openapi("CreateSwapBody");

const submitBody = z
  .object({
    signedXdr: z.string().optional().openapi({ example: "AAAAAgAAAAB...(signed base64 XDR)...", description: "Stellar swaps." }),
    signedTransaction: z.string().optional().openapi({ description: "Solana (base64 wire bytes) or Monad (0x raw EIP-1559) swaps." }),
  })
  .openapi("SubmitSwapBody", { description: "Exactly one of signedXdr / signedTransaction." });

const orgQuery = z.string().openapi({ param: { name: "org", in: "query" }, example: "org_123" });
const envQuery = z.enum(["dev", "prod"]).optional().openapi({ param: { name: "env", in: "query" }, example: "dev" });
const idParam = z.object({ id: z.string().openapi({ param: { name: "id", in: "path" }, example: "clx9z8a1b0000abcd1234efgh" }) });

const jsonBody = (schema: z.ZodTypeAny) => ({
  body: { content: { "application/json": { schema } }, required: true },
});

registerRoutes([
  {
    method: "post",
    path: "/api/swaps/quote",
    tags: ["Swaps"],
    summary: "Quote a swap",
    description:
      "Prices a same-chain swap: Stellar via Horizon's strict-send path search, Solana via Jupiter, Monad via Kuru Flow. The commission shown is the calling organization's plan rate (enforced server-side; never a request parameter).",
    security: sessionSecurity,
    request: jsonBody(quoteBody),
    responses: {
      200: jsonOk(swapQuoteSchema, "QuoteSwapResponse", "Swap quoted successfully"),
      400: errors.badRequest,
      401: errors.unauthorized,
      403: errors.forbidden,
      500: errors.internalError,
    },
  },
  {
    method: "post",
    path: "/api/swaps",
    tags: ["Swaps"],
    summary: "Create a swap",
    description:
      "Builds the unsigned swap transaction for the customer's wallet to sign: on Stellar the XDR + SEP-7 tx URI + QR; on Solana / Monad the aggregator's transaction (and, on Monad, an approve call when an ERC-20 allowance is short).",
    security: sessionSecurity,
    request: jsonBody(createBody),
    responses: {
      201: jsonCreated(anySwap, "CreateSwapResponse", "Swap created successfully"),
      400: errors.badRequest,
      401: errors.unauthorized,
      403: errors.forbidden,
      500: errors.internalError,
    },
  },
  {
    method: "get",
    path: "/api/swaps",
    tags: ["Swaps"],
    summary: "List swaps",
    description: "Lists the organization's swaps.",
    security: sessionSecurity,
    request: {
      query: z.object({
        org: orgQuery,
        env: envQuery,
        chain: chain.optional().openapi({ param: { name: "chain", in: "query" } }),
        status: z.string().optional().openapi({ param: { name: "status", in: "query" } }),
        take: z.number().int().optional().openapi({ param: { name: "take", in: "query" } }),
        skip: z.number().int().optional().openapi({ param: { name: "skip", in: "query" } }),
      }),
    },
    responses: {
      200: jsonOk(swapListSchema, "ListSwapsResponse", "Swaps fetched successfully"),
      400: errors.badRequest,
      401: errors.unauthorized,
      403: errors.forbidden,
      500: errors.internalError,
    },
  },
  {
    method: "get",
    path: "/api/swaps/{id}",
    tags: ["Swaps"],
    summary: "Get a swap by id",
    description: "Returns a single swap.",
    security: sessionSecurity,
    request: { params: idParam, query: z.object({ org: orgQuery, env: envQuery }) },
    responses: {
      200: jsonOk(anySwap, "GetSwapResponse", "Swap fetched successfully"),
      401: errors.unauthorized,
      403: errors.forbidden,
      404: errors.notFound,
      500: errors.internalError,
    },
  },
  {
    method: "post",
    path: "/api/swaps/{id}/submit",
    tags: ["Swaps"],
    summary: "Submit a signed swap",
    description:
      "Relays the signed transaction to its network (signedXdr on Stellar, signedTransaction on Solana / Monad). The Payments API checks it is the transaction it built before broadcasting.",
    security: sessionSecurity,
    request: { params: idParam, query: z.object({ org: orgQuery, env: envQuery }), ...jsonBody(submitBody) },
    responses: {
      200: jsonOk(swapSubmitOutcomeSchema, "SubmitSwapResponse", "Swap submitted"),
      400: errors.badRequest,
      401: errors.unauthorized,
      403: errors.forbidden,
      404: errors.notFound,
      500: errors.internalError,
    },
  },
]);
