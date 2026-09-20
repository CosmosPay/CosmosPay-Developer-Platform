/* Zod schemas for the wallet's own sign-in (src/lib/wallet-auth.ts): Google, GitHub or an
   emailed code, then `finish`, and the backup it restores.
   `z` comes from @/lib/openapi/zod for the reason given at the top of ./wallet.ts. */
import { z } from "@/lib/openapi/zod";
import { pkceChallenge, pkceVerifier, stellarAddress } from "@/schemas/wallet";
import { BACKUP_BOX_MAX_CHARS, WALLET_AUTH_PROVIDERS } from "@/lib/wallet-auth-core";

/* The handshake state is a 32-byte base64url token minted here; anything else is not ours. */
const handshakeState = z
  .string()
  .trim()
  .min(16)
  .max(256)
  .regex(/^[A-Za-z0-9_-]+$/, "Invalid handshake state.");

const claimToken = z.string().trim().min(16).max(256);

/* An ISO-8601 UTC instant, as `new Date().toISOString()` writes it. The freshness window is
   checked in the handler; this only refuses what could never be one. */
const signedAt = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/, "signedAt must be an ISO-8601 UTC timestamp.");

/* A base64 ed25519 signature: 64 bytes is 88 characters; the cap only refuses abuse. */
const signature = z.string().trim().min(1).max(512);

/* Opaque here: the wallet's sealed box as JSON. Its structure and KDF cost are checked by
   isBackupBox in the handler, which is where a refusal can say which rule it broke. */
const backupBox = z.string().min(2).max(BACKUP_BOX_MAX_CHARS);

export const walletAuthProviderParamSchema = z.object({
  provider: z.enum(WALLET_AUTH_PROVIDERS),
});

export const walletAuthStateParamSchema = z.object({ state: handshakeState });

export const walletAuthAuthorizeBodySchema = z.object({
  provider: z.enum(WALLET_AUTH_PROVIDERS),
  codeChallenge: pkceChallenge,
  codeChallengeMethod: z.literal("S256").default("S256"),
});

export const walletAuthClaimBodySchema = z.object({
  state: handshakeState,
  codeVerifier: pkceVerifier,
});

export const walletAuthEmailStartBodySchema = z.object({
  email: z.string().trim().toLowerCase().email().max(320),
});

export const walletAuthEmailVerifyBodySchema = z.object({
  claimToken,
  code: z.string().trim().regex(/^\d{6}$/, "The code is 6 digits."),
});

export const walletAuthFinishBodySchema = z.object({
  stellarAddress,
  signedAt,
  signature,
  backup: backupBox.optional(),
  replaceBackup: z.boolean().optional(),
});

export const walletBackupUpdateBodySchema = z.object({
  stellarAddress,
  box: backupBox,
  signedAt,
  signature,
});

export type WalletAuthAuthorizeBody = z.infer<typeof walletAuthAuthorizeBodySchema>;
export type WalletAuthClaimBody = z.infer<typeof walletAuthClaimBodySchema>;
export type WalletAuthEmailStartBody = z.infer<typeof walletAuthEmailStartBodySchema>;
export type WalletAuthEmailVerifyBody = z.infer<typeof walletAuthEmailVerifyBodySchema>;
export type WalletAuthFinishBody = z.infer<typeof walletAuthFinishBodySchema>;
export type WalletBackupUpdateBody = z.infer<typeof walletBackupUpdateBodySchema>;
