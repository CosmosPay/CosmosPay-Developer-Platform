/* OpenAPI registration for the dashboard's cross-chain swap proxy routes (auto-loaded by
   src/lib/openapi/auto-load.ts via the /src/schemas/**\/openapi.ts glob). Documents the
   /api/cross-chain-swaps surface in the portal API reference.

   The commission is the calling organization's plan rate, enforced server-side — there
   is deliberately NO fee field in any request body. */
import {
  errors,
  jsonCreated,
  jsonOk,
  registerRoutes,
  sessionSecurity,
} from "@/lib/openapi/route-helpers";
import { z } from "@/lib/openapi/zod";

const chain = z.enum(["stellar", "solana", "monad"]).openapi({ example: "stellar" });
const env = z.enum(["dev", "prod"]).openapi({ example: "prod" });

const assetSchema = z
  .object({
    chain,
    symbol: z.string().openapi({ example: "USDC" }),
    assetId: z.string().openapi({ example: "nep141:sol-5ce3bf3a31af18be40ba30f721101b4341690186.omft.near" }),
    decimals: z.number().openapi({ example: 6 }),
    contract: z.string().nullable().openapi({ example: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" }),
  })
  .openapi("CrossChainAsset");

const leg = z.object({
  chain,
  asset: z.string().openapi({ example: "XLM" }),
  assetId: z.string(),
  contract: z.string().nullable(),
  amount: z.string().openapi({ example: "100" }),
  amountUsd: z.string().nullable().openapi({ example: "22.57" }),
});

const quoteSchema = z
  .object({
    network: z.string().openapi({ example: "public" }),
    origin: leg,
    destination: leg.extend({ minimum: z.string().openapi({ example: "21.96" }) }),
    fee: z.object({
      bps: z.number().openapi({ example: 50 }),
      amount: z.string().openapi({ example: "0.5" }),
      asset: z.string().openapi({ example: "XLM" }),
    }),
    slippageBps: z.number().openapi({ example: 100 }),
    timeEstimateSeconds: z.number().openapi({ example: 22 }),
  })
  .openapi("CrossChainQuote", { description: "NEAR Intents pricing (nothing persisted)." });

const txRef = z.object({ hash: z.string(), explorerUrl: z.string() });

const swapSchema = z
  .object({
    id: z.string().openapi({ example: "cm1x2y3z4a5b6c7d8e9f0g1h2" }),
    status: z
      .enum(["AWAITING_DEPOSIT", "DEPOSIT_DETECTED", "INCOMPLETE_DEPOSIT", "PROCESSING", "SUCCEEDED", "REFUNDED", "FAILED", "EXPIRED"])
      .openapi({ example: "AWAITING_DEPOSIT" }),
    providerStatus: z.string().openapi({ example: "PENDING_DEPOSIT" }),
    network: z.string().openapi({ example: "public" }),
    originChain: chain,
    originAsset: z.string().openapi({ example: "XLM" }),
    originContract: z.string().nullable(),
    destinationChain: chain,
    destinationAsset: z.string().openapi({ example: "USDC" }),
    destinationContract: z.string().nullable(),
    amountIn: z.string().openapi({ example: "100" }),
    feeBps: z.number().openapi({ example: 50 }),
    feeAmount: z.string().openapi({ example: "0.5" }),
    amountOutEstimated: z.string().openapi({ example: "22.18" }),
    amountOutMin: z.string().openapi({ example: "21.96" }),
    slippageBps: z.number().openapi({ example: 100 }),
    recipient: z.string(),
    refundTo: z.string(),
    depositAddress: z.string().openapi({ description: "Send exactly amountIn of the origin asset here." }),
    depositMemo: z.string().nullable().openapi({ description: "Stellar only, required: attach as a MEMO_TEXT." }),
    depositUri: z.string().openapi({ description: "The deposit as a wallet link: SEP-7 pay, Solana Pay or EIP-681." }),
    qr: z.string().optional(),
    depositTxHash: z.string().nullable(),
    amountOut: z.string().nullable(),
    refundedAmount: z.string().nullable(),
    originTxHashes: z.array(txRef).nullable(),
    destinationTxHashes: z.array(txRef).nullable(),
    timeEstimateSeconds: z.number(),
    correlationId: z.string(),
    quoteSignature: z.string().openapi({ description: "NEAR Intents' signature over the quote — keep it." }),
    expiresAt: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .openapi("CrossChainSwap", { description: "A swap between chains and the deposit that funds it." });

const listSchema = z
  .object({
    data: z.array(swapSchema),
    total: z.number(),
    take: z.number(),
    skip: z.number(),
  })
  .openapi("CrossChainSwapList");

const body = z
  .object({
    org: z.string().openapi({ example: "org_123" }),
    environment: env.optional(),
    originChain: chain,
    originAsset: z.string().openapi({ example: "XLM" }),
    destinationChain: chain.openapi({ example: "solana" }),
    destinationAsset: z.string().openapi({ example: "USDC" }),
    amount: z.string().openapi({ example: "100" }),
    recipient: z.string().openapi({ example: "13QkxhNMrTPxoCkRdYdJ65tFuwXPhL5gLS2Z5Nr6gjRK" }),
    refundTo: z.string().openapi({ example: "GCKFBEIYV2U22IO2BJ4KVJOIP7XPWQGQFKKWXR6DOSJBV7STMAQSMTGG" }),
    slippageBps: z.number().int().optional().openapi({ example: 100 }),
  })
  .openapi("CrossChainSwapBody");

const depositBody = z
  .object({ txHash: z.string().openapi({ description: "The deposit transaction id, in the origin chain's spelling." }) })
  .openapi("ReportDepositBody");

const orgQuery = z.string().openapi({ param: { name: "org", in: "query" }, example: "org_123" });
const envQuery = z.enum(["dev", "prod"]).optional().openapi({ param: { name: "env", in: "query" }, example: "prod" });
const idParam = z.object({ id: z.string().openapi({ param: { name: "id", in: "path" } }) });
const jsonBody = (schema: z.ZodTypeAny) => ({
  body: { content: { "application/json": { schema } }, required: true },
});
const common = {
  401: errors.unauthorized,
  403: errors.forbidden,
  500: errors.internalError,
};

registerRoutes([
  {
    method: "get",
    path: "/api/cross-chain-swaps/assets",
    tags: ["Cross-chain Swaps"],
    summary: "List cross-chain assets",
    description: "The tokens NEAR Intents can swap on Stellar, Solana and Monad.",
    security: sessionSecurity,
    request: { query: z.object({ org: orgQuery, env: envQuery }) },
    responses: {
      200: jsonOk(z.array(assetSchema), "ListCrossChainAssetsResponse", "Assets fetched successfully"),
      400: errors.badRequest,
      ...common,
    },
  },
  {
    method: "post",
    path: "/api/cross-chain-swaps/quote",
    tags: ["Cross-chain Swaps"],
    summary: "Quote a cross-chain swap",
    description:
      "Prices a swap between two chains through NEAR Intents. The commission is the organization plan's rate, enforced server-side.",
    security: sessionSecurity,
    request: jsonBody(body),
    responses: {
      200: jsonOk(quoteSchema, "QuoteCrossChainSwapResponse", "Cross-chain swap quoted successfully"),
      400: errors.badRequest,
      ...common,
    },
  },
  {
    method: "post",
    path: "/api/cross-chain-swaps",
    tags: ["Cross-chain Swaps"],
    summary: "Create a cross-chain swap",
    description:
      "Opens the swap: NEAR Intents issues a deposit address (and a memo on Stellar) that the payer funds. Mainnet only — a dev environment is refused.",
    security: sessionSecurity,
    request: jsonBody(body),
    responses: {
      201: jsonCreated(swapSchema, "CreateCrossChainSwapResponse", "Cross-chain swap created successfully"),
      400: errors.badRequest,
      ...common,
    },
  },
  {
    method: "get",
    path: "/api/cross-chain-swaps",
    tags: ["Cross-chain Swaps"],
    summary: "List cross-chain swaps",
    description: "Lists the organization's cross-chain swaps.",
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
      200: jsonOk(listSchema, "ListCrossChainSwapsResponse", "Cross-chain swaps fetched successfully"),
      400: errors.badRequest,
      ...common,
    },
  },
  {
    method: "get",
    path: "/api/cross-chain-swaps/{id}",
    tags: ["Cross-chain Swaps"],
    summary: "Get a cross-chain swap",
    description: "One swap, as the Payments API last saw it.",
    security: sessionSecurity,
    request: { params: idParam, query: z.object({ org: orgQuery, env: envQuery }) },
    responses: {
      200: jsonOk(swapSchema, "GetCrossChainSwapResponse", "Cross-chain swap fetched successfully"),
      404: errors.notFound,
      ...common,
    },
  },
  {
    method: "post",
    path: "/api/cross-chain-swaps/{id}/deposit",
    tags: ["Cross-chain Swaps"],
    summary: "Report the deposit transaction",
    description: "Points NEAR Intents at the transaction that paid the deposit address, so the swap starts without waiting for its indexer.",
    security: sessionSecurity,
    request: { params: idParam, query: z.object({ org: orgQuery, env: envQuery }), ...jsonBody(depositBody) },
    responses: {
      200: jsonOk(swapSchema, "ReportDepositResponse", "Deposit reported"),
      400: errors.badRequest,
      404: errors.notFound,
      ...common,
    },
  },
]);
