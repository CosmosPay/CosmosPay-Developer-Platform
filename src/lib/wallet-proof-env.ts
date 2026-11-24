/* What the organization wallet routes need from the environment to check a proof. Server-only.
   - The dashboard's host (PUBLIC_BETTER_AUTH_URL): TON Connect's proof domain (the wallet takes it
     from the manifest this app serves, `tonManifestUrl`) and NEAR's NEP-413 recipient.
   - The nodes the proofs that read a chain ask (src/lib/wallet-proofs/rpc.ts):
     WALLET_PROOF_NEAR_RPC_URL, WALLET_PROOF_APTOS_RPC_URL, WALLET_PROOF_MOVEMENT_RPC_URL and
     WALLET_PROOF_STARKNET_RPC_URL, each defaulting to a public mainnet endpoint (astro.config.mjs). */
import { PUBLIC_BETTER_AUTH_URL } from "astro:env/client";
import { WALLET_PROOF_APTOS_RPC_URL, WALLET_PROOF_MOVEMENT_RPC_URL, WALLET_PROOF_NEAR_RPC_URL, WALLET_PROOF_STARKNET_RPC_URL } from "astro:env/server";
import type { ProofContext } from "@/lib/org-wallets-verify";
import { aptosAuthKeyReader, nearRpc, starknetCaller } from "@/lib/wallet-proofs/rpc";

const platform = () => new URL(PUBLIC_BETTER_AUTH_URL);

export const proofHost = (): string => platform().host;
export const tonManifestUrl = (): string => new URL("/api/wallet-proofs/tonconnect-manifest.json", platform()).toString();
export const platformOrigin = (): string => platform().origin;

export function proofContext(): ProofContext {
  return {
    host: proofHost(),
    near: nearRpc(WALLET_PROOF_NEAR_RPC_URL),
    aptos: aptosAuthKeyReader(WALLET_PROOF_APTOS_RPC_URL),
    movement: aptosAuthKeyReader(WALLET_PROOF_MOVEMENT_RPC_URL),
    starknet: starknetCaller(WALLET_PROOF_STARKNET_RPC_URL),
  };
}
