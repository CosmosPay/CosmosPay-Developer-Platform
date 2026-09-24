/* Zod schemas for SEP-10 web auth and SEP-30 account recovery (src/lib/recovery.ts).
   `z` comes from @/lib/openapi/zod for the reason given at the top of ./wallet.ts. */
import { z } from "@/lib/openapi/zod";
import { AUTH_METHOD_TYPES, IDENTITY_ROLES } from "@/lib/recovery-core";
import { stellarAddress } from "@/schemas/wallet";

export const sep10AccountQuerySchema = z.object({ account: stellarAddress });

/* A base64 XDR envelope. The cap is generous for a challenge (two operations) and far below
   anything worth parsing. */
const envelope = z.string().trim().min(64).max(8192);

export const sep10TokenBodySchema = z.object({ transaction: envelope });

export const recoveryAddressParamSchema = z.object({ address: stellarAddress });

/* SEP-30's cursor for `GET /accounts`: the address of the last account on the page
   before. Keyset, not an offset — a caller paging through a list that is being written
   to must not have rows shift under it, and an address is the only key both sides of the
   protocol can name. Absent means the first page. */
export const recoveryListQuerySchema = z.object({ after: stellarAddress.optional() });

export const recoverySignParamSchema = z.object({
  address: stellarAddress,
  /* The signer the caller wants a signature from. SEP-30 puts it in the path so a server
     that holds several can be asked for one; ours is derived per account and must match. */
  signer: stellarAddress,
});

const authMethod = z.object({
  type: z.enum(AUTH_METHOD_TYPES),
  value: z.string().trim().min(1).max(320),
});

/* SEP-30 registers identities by role, each with the ways of proving it. The wallet only
   ever sends `owner` with the email its sign-in proved. */
export const recoveryIdentitiesBodySchema = z.object({
  identities: z
    .array(
      z.object({
        role: z.enum(IDENTITY_ROLES),
        auth_methods: z.array(authMethod).min(1).max(5),
      }),
    )
    .min(1)
    .max(3),
});

export const recoverySignBodySchema = z.object({ transaction: envelope });

/* The sponsored setup transaction the operator builds and signs (src/pages/api/wallet/
   recovery/setup.ts): the wallet names the two server signers it registered with. */
export const recoverySetupBodySchema = z.object({
  stellarAddress,
  signers: z.array(stellarAddress).length(2),
  signedAt: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/, "signedAt must be an ISO-8601 UTC timestamp."),
  signature: z.string().trim().min(1).max(512),
});

export type RecoveryIdentitiesBody = z.infer<typeof recoveryIdentitiesBodySchema>;
export type RecoverySetupBody = z.infer<typeof recoverySetupBodySchema>;
