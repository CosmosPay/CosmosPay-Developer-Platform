/* wallet-provisioning.ts — what is left of the wallet's account provisioning here.

   Wallet accounts are provisioned by the community server now: it emails the sign-in code
   and mints the keys in APISIX itself, under `cosmos_wallet_<accountId>`, so no wallet
   request passes through this platform. The email-link registration, the access-code link
   and the console legs the server used to call are gone.

   What remains serves the accounts this platform provisioned BEFORE that: their keys are
   still dashboard keys, rotated by src/pages/api/api-keys with the scope set below. */
import { prisma } from "@/lib/prisma";

// Scopes granted to wallet-provisioned keys. Beyond swaps, the wallet also creates pay
// links (payments) and runs the BlindPay fiat flow (kyc receivers + onramp/offramp).
//
// The wallet's only gateway credential is the key minted here, so a scope missing from
// this list is a feature that dies on its first call with `insufficient_scope`, which
// reads to the user like a broken install. Exported because the rotate path (api-keys)
// re-applies this set to a wallet key: accounts provisioned before a scope was added
// would otherwise keep a key that can never reach the new surface — and one removed
// here (`pollar:*`, with the server's Pollar bridge) is dropped on the next rotate.
export const WALLET_KEY_SCOPES = [
  "swaps:read",
  "swaps:write",
  "liquidity:read",
  "liquidity:write",
  "payments:read",
  "payments:write",
  "kyc:read",
  "kyc:write",
  "onramp:read",
  "onramp:write",
  "offramp:read",
  "offramp:write",
  // Telemetry. `write` is what lets the wallet report its own errors, timings and
  // transactions instead of losing them on the device; `read` is what lets the
  // person who owns that wallet see them in the dashboard, since a
  // wallet-provisioned account has exactly one key and no way to mint another.
  "activity:read",
  "activity:write",
];

/**
 * Whether a user was provisioned via Cosmos Wallet (vs Authentik OAuth). Their
 * dev + prod API keys are auto-minted at registration, so such accounts cannot
 * create *additional* keys — the API-key endpoint rotates their existing keys
 * instead. Authoritative signal: a confirmed/claimed WalletRegistration row — written only
 * by the retired flows, so this is true for legacy wallet accounts alone.
 */
export async function isWalletProvisionedUser(userId: string): Promise<boolean> {
  const reg = await prisma.walletRegistration
    .findFirst({
      where: { userId, status: { in: ["confirmed", "claimed"] } },
      select: { id: true },
    })
    .catch(() => null);
  return !!reg;
}
