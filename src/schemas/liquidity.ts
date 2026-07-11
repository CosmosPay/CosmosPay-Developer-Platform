/* Zod schemas for the dashboard's liquidity pool proxy routes.
   The Payments API does the real work (Horizon pool lookups, XDR build, submit);
   we only sanity-check input before forwarding, mirroring the upstream DTOs.
   The plan commission is derived server-side from the org's plan, never sent
   by the client — so there is no fee field in these request bodies. */
import { z } from "zod";
import { cosmosEnvSchema } from "./swaps";

const stellarAddress = z
  .string()
  .trim()
  .regex(/^G[A-Z2-7]{55}$/, "Must be a valid Stellar public key (G...56 chars).");

const amountString = z
  .string()
  .trim()
  .regex(/^\d+(\.\d{1,7})?$/, "Amount must be a decimal with up to 7 decimals.");

const assetCode = z.string().trim().min(1).max(12);
const memoString = z.string().trim().regex(/^\d+$/, "Memo must be a numeric MEMO_ID.").max(20);
const slippageBps = z.number().int().min(0).max(10000);
const poolIdString = z
  .string()
  .trim()
  .regex(/^[0-9a-f]{64}$/, "Must be a 64-character hex liquidity pool id.");

/* A non-native asset (anything but XLM) must come with its issuer. */
const issuerRule = (code?: string, issuer?: string) =>
  !code || code.toLowerCase() === "xlm" || code.toLowerCase() === "native" || !!issuer;

export const depositLiquidityBodySchema = z
  .object({
    org: z.string().trim().min(1).max(64),
    environment: cosmosEnvSchema,
    source: stellarAddress,
    assetACode: assetCode.optional(),
    assetAIssuer: stellarAddress.optional(),
    assetBCode: assetCode.optional(),
    assetBIssuer: stellarAddress.optional(),
    maxAmountA: amountString,
    maxAmountB: amountString.optional(),
    slippageBps: slippageBps.optional(),
    memo: memoString.optional(),
  })
  .refine((v) => issuerRule(v.assetACode, v.assetAIssuer), {
    message: "A non-native asset requires an issuer.",
    path: ["assetAIssuer"],
  })
  .refine((v) => issuerRule(v.assetBCode, v.assetBIssuer), {
    message: "A non-native asset requires an issuer.",
    path: ["assetBIssuer"],
  });

export const withdrawLiquidityBodySchema = z.object({
  org: z.string().trim().min(1).max(64),
  environment: cosmosEnvSchema,
  source: stellarAddress,
  poolId: poolIdString,
  shares: amountString,
  slippageBps: slippageBps.optional(),
  memo: memoString.optional(),
});

export const submitLiquidityBodySchema = z.object({
  signedXdr: z.string().trim().min(1).max(100000),
});

export type DepositLiquidityBody = z.infer<typeof depositLiquidityBodySchema>;
export type WithdrawLiquidityBody = z.infer<typeof withdrawLiquidityBodySchema>;
export type SubmitLiquidityBody = z.infer<typeof submitLiquidityBodySchema>;
