/* Request bodies of the dashboard's USDT0 routes (src/pages/api/usdt0). The Payments API checks the
   rest (the route, the source's USDT0 and XLM, the OFT's limits); this layer refuses what is
   malformed before a round trip. `z` comes from @/lib/openapi/zod so they can be documented. */
import { z } from "@/lib/openapi/zod";
import { ADDRESS_MESSAGES, ADDRESS_PATTERNS } from "@/lib/chains";
import { cosmosEnvSchema } from "@/schemas/payment-intents";

/* USDT0 on Stellar: a positive decimal, at most 7 places (the seventh never crosses). */
const amount = z
  .string()
  .trim()
  .regex(/^\d+(\.\d{1,7})?$/, "amount must be a positive number with at most 7 decimals")
  .refine((v) => Number(v) > 0, "amount must be greater than zero");
const destination = z.string().trim().regex(/^[a-z0-9]{2,20}$/, "to must be a network id from /v1/usdt0/routes");
const stellarAccount = z.string().trim().regex(ADDRESS_PATTERNS.stellar, ADDRESS_MESSAGES.stellar);

export const usdt0QuoteBodySchema = z.object({
  org: z.string().trim().min(1).max(64),
  environment: cosmosEnvSchema,
  to: destination,
  amount,
  source: stellarAccount.optional(),
});

export const usdt0TransferBodySchema = z.object({
  org: z.string().trim().min(1).max(64),
  environment: cosmosEnvSchema,
  source: stellarAccount,
  to: destination,
  recipient: z.string().trim().regex(/^0x[0-9a-fA-F]{40}$/, "recipient must be an EVM address (0x + 40 hex)"),
  amount,
  idempotencyKey: z.string().trim().min(8).max(100).optional(),
});

export const usdt0SubmitBodySchema = z.object({
  signedXdr: z.string().trim().min(16).max(20000),
});
