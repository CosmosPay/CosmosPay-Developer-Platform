/* Zod schemas for the dashboard's webhook + product proxy routes. They mirror the
   community server's DTOs; the upstream re-validates, so these just give fast,
   friendly client-side errors. */
import { z } from "zod";

const WEBHOOK_EVENTS = [
  "PAYMENT_INTENT_CREATED",
  "PAYMENT_INTENT_UPDATED",
  "PAYMENT_INTENT_SUCCEEDED",
  "PAYMENT_INTENT_FAILED",
  "PAYMENT_INTENT_CANCELLED",
  "PAYMENT_INTENT_DELETED",
] as const;

export const createWebhookBodySchema = z.object({
  url: z.string().trim().url().max(2048),
  description: z.string().trim().max(255).optional(),
  eventTypes: z.array(z.enum(WEBHOOK_EVENTS)).optional(),
});

export const updateWebhookBodySchema = z.object({
  url: z.string().trim().url().max(2048).optional(),
  description: z.string().trim().max(255).optional(),
  enabled: z.boolean().optional(),
  eventTypes: z.array(z.enum(WEBHOOK_EVENTS)).optional(),
});

const amountString = z.string().trim().regex(/^\d+(\.\d{1,7})?$/, "Amount must be a decimal with up to 7 decimals.");

export const createProductBodySchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).optional(),
  amount: amountString.optional(),
  assetCode: z.string().trim().max(12).optional(),
  kind: z.enum(["recurring", "one_time", "link"]).optional(),
  active: z.boolean().optional(),
  reference: z.string().trim().max(120).optional(),
});

export const updateProductBodySchema = createProductBodySchema.partial();

const stellarAddress = z.string().trim().regex(/^G[A-Z2-7]{55}$/, "Must be a valid Stellar public key (G...56 chars).");

export const createCustomerBodySchema = z.object({
  name: z.string().trim().min(1).max(120),
  alias: z.string().trim().max(120).optional(),
  note: z.string().trim().max(500).optional(),
  email: z.string().trim().email().max(160).optional(),
  account: stellarAddress.optional(),
  reference: z.string().trim().max(120).optional(),
});

export const updateCustomerBodySchema = createCustomerBodySchema.partial();

export type CreateWebhookBody = z.infer<typeof createWebhookBodySchema>;
export type UpdateWebhookBody = z.infer<typeof updateWebhookBodySchema>;
export type CreateProductBody = z.infer<typeof createProductBodySchema>;
export type UpdateProductBody = z.infer<typeof updateProductBodySchema>;
