/* Zod schemas for the dashboard's swaps proxy routes.
   The Payments API does the real work (Horizon path search, XDR build, submit). We
   only sanity-check input before forwarding, mirroring the upstream DTOs.

   NOTE: there is deliberately NO fee/commission field here. The swap commission is the
   calling organization's plan rate, resolved server-side (orgSwapContext) and injected
   into the gateway headers — it can never be passed as a parameter. */
import { z } from "zod";

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

export const cosmosEnvSchema = z.enum(["dev", "prod"]).default("dev");

/* Shared quote fields (sell `amount` of the source asset for the destination asset). */
const swapQuoteShape = {
  org: z.string().trim().min(1).max(64),
  environment: cosmosEnvSchema,
  amount: amountString,
  sourceAssetCode: assetCode.optional(),
  sourceAssetIssuer: stellarAddress.optional(),
  destAssetCode: assetCode,
  destAssetIssuer: stellarAddress.optional(),
  slippageBps: slippageBps.optional(),
};

const destIssuerRule = (v: { destAssetCode?: string; destAssetIssuer?: string }) =>
  !v.destAssetCode ||
  v.destAssetCode.toLowerCase() === "xlm" ||
  v.destAssetCode.toLowerCase() === "native" ||
  !!v.destAssetIssuer;

export const quoteSwapBodySchema = z
  .object(swapQuoteShape)
  .refine(destIssuerRule, { message: "A non-native destination asset requires an issuer.", path: ["destAssetIssuer"] });

export const createSwapBodySchema = z
  .object({
    ...swapQuoteShape,
    source: stellarAddress,
    destination: stellarAddress.optional(),
    memo: memoString.optional(),
  })
  .refine(destIssuerRule, { message: "A non-native destination asset requires an issuer.", path: ["destAssetIssuer"] });

export const submitSwapBodySchema = z.object({
  signedXdr: z.string().trim().min(1).max(100000),
});

export type QuoteSwapBody = z.infer<typeof quoteSwapBodySchema>;
export type CreateSwapBody = z.infer<typeof createSwapBodySchema>;
export type SubmitSwapBody = z.infer<typeof submitSwapBodySchema>;
