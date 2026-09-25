/* Zod schemas for the two console legs the community server calls back into
   (src/lib/wallet-auth-console.ts). `z` comes from @/lib/openapi/zod for the reason given at
   the top of ./wallet.ts.

   These bodies arrive from one caller, not from the public, and they are still validated.
   The caller is a separate deployment on its own release cadence: a field it renames is a
   500 in a mail send otherwise, discovered by a person who never got their code. */
import { z } from "@/lib/openapi/zod";
import { stellarAddress } from "@/schemas/wallet";

const email = z.string().trim().toLowerCase().email().max(320);

export const walletAuthLoginCodeBodySchema = z.object({
  email,
  /* Display only, and absent whenever the provider gave none. */
  name: z.string().trim().max(200).nullish(),
  /* The community server mints it; this console only addresses the envelope. */
  code: z.string().trim().regex(/^\d{6}$/, "code must be six digits."),
  /* Used to tell the person how many minutes they have, never to decide anything. */
  expiresAt: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/, "expiresAt must be an ISO-8601 UTC timestamp."),
});

export const walletAuthProvisionBodySchema = z.object({
  /* The community server's own id for the wallet identity. Recorded, not trusted. */
  accountId: z.string().trim().min(1).max(64),
  stellarAddress,
  email,
  name: z.string().trim().min(1).max(200),
});
