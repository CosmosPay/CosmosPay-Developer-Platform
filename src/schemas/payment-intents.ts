/* Zod schemas for the dashboard's payment-intents proxy routes.
   The heavy lifting (XDR build, SEP-7 URI, QR, Stellar validation) happens upstream
   in the Payments API; here we only sanity-check the developer's input before
   forwarding it, mirroring the upstream DTOs. */
import { z } from "zod";

// Stellar public keys are 56-char base32 strings starting with G.
const stellarAddress = z
  .string()
  .trim()
  .regex(/^G[A-Z2-7]{55}$/, "Must be a valid Stellar public key (G...56 chars).");

// Decimal string with up to 7 fractional digits (Stellar's precision).
const amountString = z
  .string()
  .trim()
  .regex(/^\d+(\.\d{1,7})?$/, "Amount must be a decimal with up to 7 decimals.");

const memoString = z.string().trim().regex(/^\d+$/, "Memo must be a numeric MEMO_ID.").max(20);
const assetCode = z.string().trim().min(1).max(12);
const msgString = z.string().trim().max(300);
const callbackString = z.string().trim().max(2048);

// Which environment (network) the intent targets — maps to the consumer env header.
export const cosmosEnvSchema = z.enum(["dev", "prod"]).default("dev");

/* Unified create body. `kind` selects the SEP-7 flavour:
   - "pay": payment link, no source, amount optional (e.g. donations).
   - "tx":  source + amount required, returns an unsigned XDR to sign. */
export const createPaymentIntentBodySchema = z
  .object({
    org: z.string().trim().min(1).max(64),
    environment: cosmosEnvSchema,
    kind: z.enum(["pay", "tx"]).default("pay"),
    source: stellarAddress.optional(),
    destination: stellarAddress,
    amount: amountString.optional(),
    assetCode: assetCode.optional(),
    assetIssuer: stellarAddress.optional(),
    memo: memoString.optional(),
    msg: msgString.optional(),
    callback: callbackString.optional(),
  })
  .refine((v) => v.kind !== "tx" || !!v.source, { message: "A source account is required for a transaction intent.", path: ["source"] })
  .refine((v) => v.kind !== "tx" || !!v.amount, { message: "An amount is required for a transaction intent.", path: ["amount"] })
  .refine((v) => !v.assetCode || v.assetCode.toLowerCase() === "xlm" || !!v.assetIssuer, { message: "A non-native asset requires an issuer.", path: ["assetIssuer"] });

export const updatePaymentIntentBodySchema = z.object({
  status: z.enum(["PENDING", "SUBMITTED", "SUCCEEDED", "FAILED", "CANCELLED", "EXPIRED"]).optional(),
  txHash: z.string().trim().min(1).max(128).optional(),
  reference: z.string().trim().max(120).optional(),
});

export const validatePaymentIntentBodySchema = z.object({
  txHash: z.string().trim().min(1).max(128),
});

export type CreatePaymentIntentBody = z.infer<typeof createPaymentIntentBodySchema>;
export type UpdatePaymentIntentBody = z.infer<typeof updatePaymentIntentBodySchema>;
export type ValidatePaymentIntentBody = z.infer<typeof validatePaymentIntentBodySchema>;
