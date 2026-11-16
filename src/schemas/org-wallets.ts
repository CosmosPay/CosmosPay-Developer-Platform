/* Request bodies of the organization wallet routes (src/pages/api/organizations/[id]/wallets).
   The proof itself (signature, freshness) is checked by the route; this layer refuses what is
   malformed. `z` comes from @/lib/openapi/zod so these schemas can be documented (CLAUDE.md). */
import { z } from "@/lib/openapi/zod";
import { NETWORK_IDS, isNetworkAddress, networkAddressMessage, type NetworkId } from "@/lib/chains";
import { WALLET_LABEL_MAX, WALLET_PROVIDER_IDS, WALLET_PROVIDERS, addedByAddress } from "@/lib/org-wallets";

export const connectWalletBodySchema = z
  .object({
    chain: z.enum(NETWORK_IDS as [NetworkId, ...NetworkId[]]),
    /* Long enough for a Cardano base address or a Zcash unified one. */
    address: z.string().trim().min(1).max(1100),
    /* The connected wallet that signed the proof message; absent with `signedXdr`. `address` on a
       network whose wallets are added by their address, with `addressConfirm`. */
    provider: z.enum(WALLET_PROVIDER_IDS).optional(),
    label: z.string().trim().max(WALLET_LABEL_MAX).optional(),
    issuedAt: z.string().trim().min(1).max(40).optional(),
    signature: z.string().trim().min(16).max(200).optional(),
    /* Stellar only: the proof transaction (src/lib/wallets/wallet-proof-xdr.ts), signed in any wallet. */
    signedXdr: z.string().trim().min(16).max(4000).optional(),
    /* The address typed a second time, for a wallet added by its address. */
    addressConfirm: z.string().trim().max(1100).optional(),
  })
  .superRefine((v, ctx) => {
    if (!isNetworkAddress(v.chain, v.address)) ctx.addIssue({ code: "custom", path: ["address"], message: networkAddressMessage(v.chain) });
    if (addedByAddress(v.chain)) {
      // No signature this app can check on this network: the address, typed twice.
      if (v.provider !== "address") ctx.addIssue({ code: "custom", path: ["provider"], message: `A ${v.chain} wallet is added by its address.` });
      if (v.signature || v.signedXdr) ctx.addIssue({ code: "custom", path: ["signature"], message: `A ${v.chain} wallet is added by its address, with no signature.` });
      if (v.addressConfirm !== v.address) ctx.addIssue({ code: "custom", path: ["addressConfirm"], message: "Type the same address twice." });
      return;
    }
    if (!v.issuedAt) ctx.addIssue({ code: "custom", path: ["issuedAt"], message: "The proof's time is required." });
    if (v.signedXdr) {
      if (v.chain !== "stellar") ctx.addIssue({ code: "custom", path: ["signedXdr"], message: "A signed XDR proves a Stellar wallet only." });
      if (v.signature || v.provider) ctx.addIssue({ code: "custom", path: ["signedXdr"], message: "Send either a signed XDR or a provider and its signature." });
      return;
    }
    if (!v.provider || !v.signature) {
      ctx.addIssue({ code: "custom", path: ["signature"], message: "A wallet's signature and its provider, or a signed XDR, prove the wallet." });
      return;
    }
    if (!WALLET_PROVIDERS[v.chain].includes(v.provider)) ctx.addIssue({ code: "custom", path: ["provider"], message: `${v.provider} does not sign for ${v.chain}.` });
  });

export const renameWalletBodySchema = z.object({ label: z.string().trim().max(WALLET_LABEL_MAX) });

export type ConnectWalletBody = z.infer<typeof connectWalletBodySchema>;
