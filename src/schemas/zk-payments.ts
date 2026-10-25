/* Request bodies of the dashboard's ZK payment routes (src/pages/api/zk-payments). The
   Payments API checks the rest (the recipient's confidential account on the token, the
   expiry bounds, the commission); this layer refuses what is malformed before a round trip.
   `z` comes from @/lib/openapi/zod so these schemas can be documented (CLAUDE.md). */
import { z } from "@/lib/openapi/zod";
import { ADDRESS_MESSAGES, ADDRESS_PATTERNS } from "@/lib/chains";

/* XLM: a positive decimal with at most 7 places. */
const amount = z
  .string()
  .trim()
  .regex(/^\d+(\.\d{1,7})?$/, "amount must be a positive number with at most 7 decimals")
  .refine((v) => Number(v) > 0, "amount must be greater than zero");

export const createZkPaymentBodySchema = z.object({
  org: z.string().min(1),
  environment: z.enum(["dev", "prod"]).default("dev"),
  amount,
  recipient: z.string().trim().regex(ADDRESS_PATTERNS.stellar, ADDRESS_MESSAGES.stellar),
  description: z.string().trim().max(140).optional(),
  expiresInMinutes: z.number().int().min(5).max(7 * 24 * 60).optional(),
  idempotencyKey: z.string().trim().min(8).max(100).optional(),
});

export type CreateZkPaymentBody = z.infer<typeof createZkPaymentBodySchema>;
