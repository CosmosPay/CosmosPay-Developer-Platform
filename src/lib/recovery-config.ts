/* recovery-config.ts — what makes this deployment one of the two recovery servers.

   SEP-30's protection comes from TWO servers that do not fall together: either one alone
   can refuse, and neither alone can sign. Both of ours run this same code, so what keeps
   them apart is entirely here — a different role, a different signing key, a different
   web-auth domain (so a token minted for one is refused by the other), and ideally a
   different database and host. Deploy it twice; never point both roles at one process.

   Be honest about what that buys: with both servers ours, somebody who takes our
   infrastructure AND the person's email can take the account. What it does stop is one
   leaked key, one compromised host, or one bad deploy being enough.

   ## The signing key is derived, not stored

   Each account gets its own signer, derived from this deployment's master seed and the
   account's address (HKDF). One account's signer says nothing about another's, there is no
   table of keys to leak, and the same address always derives the same signer — which
   matters because that key is a signer ON CHAIN: lose the master seed and every account
   that registered here keeps a signer nobody can produce a signature for. Back it up like
   the money it guards, and never rotate it while an account still names it.
*/
import { hkdfSync } from "node:crypto";
import { Keypair, Networks } from "@stellar/stellar-sdk";
import {
  BETTER_AUTH_SECRET,
  RECOVERY_HOME_DOMAIN,
  RECOVERY_HORIZON_URL,
  RECOVERY_NETWORK_PASSPHRASE,
  RECOVERY_ROLE,
  RECOVERY_SIGNER_MASTER,
  RECOVERY_SPONSOR_SECRET,
  RECOVERY_WEB_AUTH_DOMAIN,
  SEP10_SIGNING_SECRET,
} from "astro:env/server";
import { networkOf, type Sep10Config } from "@/lib/sep10";

export interface RecoveryConfig {
  role: "a" | "b";
  sep10: Sep10Config;
  network: "public" | "testnet" | "other";
  horizonUrl: string;
  signerMaster: string;
  /** The operator account that can pay the reserve for an account that cannot. */
  sponsorSecret: string | null;
  /** HKDF purposes, both carrying the role, so the two servers' tokens never cross. */
  sep10Purpose: string;
  identityPurpose: string;
  jwtSecret: string;
}

/** The config, or null when this deployment is not set up as a recovery server. */
export function recoveryConfig(): RecoveryConfig | null {
  const role = RECOVERY_ROLE === "a" || RECOVERY_ROLE === "b" ? RECOVERY_ROLE : null;
  if (!role || !RECOVERY_SIGNER_MASTER || !SEP10_SIGNING_SECRET || !RECOVERY_WEB_AUTH_DOMAIN) return null;
  const passphrase = RECOVERY_NETWORK_PASSPHRASE || Networks.PUBLIC;
  return {
    role,
    sep10: {
      signingSecret: SEP10_SIGNING_SECRET,
      homeDomain: RECOVERY_HOME_DOMAIN || RECOVERY_WEB_AUTH_DOMAIN,
      webAuthDomain: RECOVERY_WEB_AUTH_DOMAIN,
      networkPassphrase: passphrase,
    },
    network: networkOf(passphrase),
    horizonUrl: (RECOVERY_HORIZON_URL || "https://horizon.stellar.org").replace(/\/+$/, ""),
    signerMaster: RECOVERY_SIGNER_MASTER,
    sponsorSecret: RECOVERY_SPONSOR_SECRET || null,
    sep10Purpose: `sep10:${role}`,
    identityPurpose: `recovery-identity:${role}`,
    jwtSecret: BETTER_AUTH_SECRET,
  };
}

/**
 * This server's signer FOR ONE ACCOUNT. Deterministic, and one-way: the account address is
 * public, the master seed is not, and no derived key leads back to it or sideways to
 * another account's.
 */
export function signerFor(cfg: RecoveryConfig, address: string): Keypair {
  const seed = hkdfSync("sha256", Keypair.fromSecret(cfg.signerMaster).rawSecretKey(), "cosmos-recovery-signer", address, 32);
  return Keypair.fromRawEd25519Seed(Buffer.from(seed));
}

/** The signers and medium threshold Horizon reports, or null when the account is not there. */
export async function accountSigners(
  cfg: RecoveryConfig,
  address: string,
): Promise<{ signers: { key: string; weight: number }[]; threshold: number } | null> {
  const res = await fetch(`${cfg.horizonUrl}/accounts/${encodeURIComponent(address)}`, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(10_000),
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`horizon: ${res.status}`);
  const body = (await res.json()) as {
    signers?: { key?: unknown; weight?: unknown; type?: unknown }[];
    thresholds?: { med_threshold?: unknown };
  };
  const signers = (body.signers ?? [])
    .filter((s) => typeof s.key === "string" && typeof s.weight === "number")
    .map((s) => ({ key: s.key as string, weight: s.weight as number }));
  const med = body.thresholds?.med_threshold;
  return { signers, threshold: typeof med === "number" && med > 0 ? med : 1 };
}
