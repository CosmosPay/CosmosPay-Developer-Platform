/* Request bodies of the organization wallet routes (src/pages/api/organizations/[id]/wallets).
   The proof itself (signature, freshness) is checked by the route; this layer refuses what is
   malformed. `z` comes from @/lib/openapi/zod so these schemas can be documented (CLAUDE.md). */
import { z } from "@/lib/openapi/zod";
import { ADDRESS_MESSAGES, ADDRESS_PATTERNS, CHAINS } from "@/lib/chains";
import { WALLET_LABEL_MAX, WALLET_PROVIDERS } from "@/lib/org-wallets";

export const connectWalletBodySchema = z
  .object({
    chain: z.enum(CHAINS),
    address: z.string().trim().min(1).max(64),
    provider: z.enum(["freighter", "phantom", "solflare", "evm"]),
    label: z.string().trim().max(WALLET_LABEL_MAX).optional(),
    issuedAt: z.string().trim().min(1).max(40),
    signature: z.string().trim().min(16).max(200),
  })
  .superRefine((v, ctx) => {
    if (!ADDRESS_PATTERNS[v.chain].test(v.address)) ctx.addIssue({ code: "custom", path: ["address"], message: ADDRESS_MESSAGES[v.chain] });
    if (!WALLET_PROVIDERS[v.chain].includes(v.provider)) ctx.addIssue({ code: "custom", path: ["provider"], message: `${v.provider} does not sign for ${v.chain}.` });
  });

export const renameWalletBodySchema = z.object({ label: z.string().trim().max(WALLET_LABEL_MAX) });

export type ConnectWalletBody = z.infer<typeof connectWalletBodySchema>;
