/* The merchant fee: what an organization charges its own customers on a payment it runs
   through Cosmos Pay, paid on-chain to a wallet it names, apart from the plan's commission.
   Mirrors the Payments API's MerchantFeeDto; the API checks the wallet against the chain and
   the fixed part against the asset's decimals. `z` is @/lib/openapi/zod's (see
   payment-intents.ts for why). */
import { z } from "@/lib/openapi/zod";

/* The percentage part's ceiling: 10%, as the Payments API's. */
export const MAX_MERCHANT_FEE_BPS = 1000;

export const merchantFeeSchema = z
  .object({
    bps: z.number().int().min(0).max(MAX_MERCHANT_FEE_BPS).optional().openapi({
      example: 150,
      description: "The percentage part, in basis points (150 = 1.5%), at most 1,000 (10%).",
    }),
    fixed: z
      .string()
      .trim()
      .regex(/^\d+(\.\d+)?$/, "The fixed part must be a positive decimal.")
      .optional()
      .openapi({ example: "0.25", description: "The fixed part, in the payment's asset." }),
    wallet: z.string().trim().min(1).max(128).openapi({
      example: "GBDHAQXQQ75WVBUZ2IX3O7ME7JOKJUOUPUXRNDCORUJODWQCTVUEQ62R",
      description: "Where the fee is paid: one of the organization's wallets on the payment's chain.",
    }),
    paidBy: z.enum(["recipient", "payer"]).optional().openapi({
      example: "recipient",
      description: "`recipient` (default): taken from the amount. `payer`: added on top of it.",
    }),
  })
  .refine((v) => (v.bps ?? 0) > 0 || (v.fixed !== undefined && Number(v.fixed) > 0), {
    message: "A merchant fee needs a percentage or a fixed part above zero.",
    path: ["bps"],
  })
  .openapi("MerchantFee", {
    description:
      "Your own fee on the payment, paid on-chain to your wallet in the same transaction, apart from the plan's commission.",
  });

export type MerchantFeeBody = z.infer<typeof merchantFeeSchema>;
