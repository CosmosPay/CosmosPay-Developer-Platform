/* Request bodies of the organization wallet routes (src/pages/api/organizations/[id]/wallets).
   The proof itself (the challenge, the signature) is checked by the route; this layer refuses
   what is malformed. `z` comes from @/lib/openapi/zod so these schemas can be documented (CLAUDE.md). */
import { z } from "@/lib/openapi/zod";
import { NETWORK_IDS, isNetworkAddress, networkAddressMessage, type NetworkId } from "@/lib/chains";
import { WALLET_LABEL_MAX, WALLET_PROVIDER_IDS, WALLET_PROVIDERS, addedByAddress } from "@/lib/org-wallets";

const chainSchema = z.enum(NETWORK_IDS as [NetworkId, ...NetworkId[]]);
/* Long enough for a Cardano base address or a Zcash unified one. */
const addressSchema = z.string().trim().min(1).max(1100);
const PROOF_MAX_JSON = 8000;

/* POST .../wallets/challenge: the network and the address to prove (TON: no address, the wallet
   names it while signing). */
export const walletChallengeBodySchema = z
  .object({
    chain: chainSchema,
    address: addressSchema.optional(),
  })
  .superRefine((v, ctx) => {
    if (v.chain === "ton") return;
    if (!v.address) {
      ctx.addIssue({ code: "custom", path: ["address"], message: "The address to prove is required." });
      return;
    }
    if (!isNetworkAddress(v.chain, v.address)) ctx.addIssue({ code: "custom", path: ["address"], message: networkAddressMessage(v.chain) });
    else if (addedByAddress(v.chain, v.address)) ctx.addIssue({ code: "custom", path: ["address"], message: "This address cannot sign a message: add it by its address." });
  });

export const connectWalletBodySchema = z
  .object({
    chain: chainSchema,
    address: addressSchema,
    /* What proves the wallet (src/lib/org-wallets.ts, WALLET_PROVIDERS); absent with `signedXdr`.
       `address` for an address that cannot sign, with `addressConfirm`. */
    provider: z.enum(WALLET_PROVIDER_IDS).optional(),
    label: z.string().trim().max(WALLET_LABEL_MAX).optional(),
    /* The challenge the wallet signed (POST .../wallets/challenge). */
    nonce: z.string().trim().regex(/^[0-9a-f]{64}$/).optional(),
    /* The signature as the network's wallets give it: base64, 0x-hex or the network's own text. */
    signature: z.string().trim().min(16).max(1000).optional(),
    /* Stellar only: the proof transaction (src/lib/wallets/wallet-proof-xdr.ts), signed in any wallet. */
    signedXdr: z.string().trim().min(16).max(4000).optional(),
    /* The networks whose proof is more than a signature: TON's ton_proof, NEAR's and Aptos's
       public key and signature (Aptos with its fullMessage), Starknet's signature felts,
       Cardano's COSE_Sign1 and COSE_Key, the XRP Ledger's public key and signature. */
    proof: z.record(z.string(), z.unknown()).optional(),
    /* The address typed a second time, for an address that cannot sign. */
    addressConfirm: z.string().trim().max(1100).optional(),
  })
  .superRefine((v, ctx) => {
    if (!isNetworkAddress(v.chain, v.address)) ctx.addIssue({ code: "custom", path: ["address"], message: networkAddressMessage(v.chain) });
    if (v.proof && JSON.stringify(v.proof).length > PROOF_MAX_JSON) ctx.addIssue({ code: "custom", path: ["proof"], message: "The proof is too large." });
    if (addedByAddress(v.chain, v.address)) {
      // An address that cannot sign a message: the address, typed twice.
      if (v.provider !== "address") ctx.addIssue({ code: "custom", path: ["provider"], message: "This address cannot sign a message: it is added by its address." });
      if (v.signature || v.signedXdr || v.proof) ctx.addIssue({ code: "custom", path: ["signature"], message: "This address cannot sign a message: it is added with no signature." });
      if (v.addressConfirm !== v.address) ctx.addIssue({ code: "custom", path: ["addressConfirm"], message: "Type the same address twice." });
      return;
    }
    if (!v.nonce) ctx.addIssue({ code: "custom", path: ["nonce"], message: "The challenge the wallet signed is required." });
    if (v.signedXdr) {
      if (v.chain !== "stellar") ctx.addIssue({ code: "custom", path: ["signedXdr"], message: "A signed XDR proves a Stellar wallet only." });
      if (v.signature || v.provider || v.proof) ctx.addIssue({ code: "custom", path: ["signedXdr"], message: "Send either a signed XDR or a provider and its signature." });
      return;
    }
    if (!v.provider || (!v.signature && !v.proof)) {
      ctx.addIssue({ code: "custom", path: ["signature"], message: "The wallet's signature and what made it, or a signed XDR, prove the wallet." });
      return;
    }
    if (!WALLET_PROVIDERS[v.chain].includes(v.provider)) ctx.addIssue({ code: "custom", path: ["provider"], message: `${v.provider} does not sign for ${v.chain}.` });
  });

export const renameWalletBodySchema = z.object({ label: z.string().trim().max(WALLET_LABEL_MAX) });

export type ConnectWalletBody = z.infer<typeof connectWalletBodySchema>;
export type WalletChallengeBody = z.infer<typeof walletChallengeBodySchema>;
