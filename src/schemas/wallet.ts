/* Zod schemas for the CosmosPay Wallet account-provisioning flow.
   The wallet is public/open-source, so there is NO shared secret: the request is
   authenticated by a Stellar key signature, and the account is only created after the
   user confirms their email. See src/lib/wallet-provisioning.ts. */
import { z } from "zod";

const stellarAddress = z
  .string()
  .trim()
  .regex(/^G[A-Z2-7]{55}$/, "Must be a valid Stellar public key (G...56 chars).");

/* Step 1: start registration. `signature` is a base64 ed25519 signature (made with the
   wallet's Stellar secret) over the canonical challenge built from email+address+nonce. */
export const walletRegisterBodySchema = z.object({
  email: z.string().trim().toLowerCase().email().max(320),
  name: z.string().trim().min(1).max(120).optional(),
  stellarAddress,
  nonce: z.string().trim().min(8).max(128),
  signature: z.string().trim().min(1).max(512),
});

/* Step 3: claim the provisioned API key with the one-time token returned at step 1. */
export const walletClaimBodySchema = z.object({
  stellarAddress,
  claimToken: z.string().trim().min(16).max(256),
});

/* Link flow — when an account already exists for the email, the wallet proves email
   ownership with a one-time code instead of creating a new account.
   Step 1 (start): same shape as register but signs the distinct "account link" challenge. */
export const walletLinkBodySchema = z.object({
  email: z.string().trim().toLowerCase().email().max(320),
  name: z.string().trim().min(1).max(120).optional(),
  stellarAddress,
  nonce: z.string().trim().min(8).max(128),
  signature: z.string().trim().min(1).max(512),
});

/* Step 2 (verify): exchange the emailed 6-digit access code (+ the claim token from
   step 1) for the API key of the existing account. */
export const walletLinkVerifyBodySchema = z.object({
  stellarAddress,
  claimToken: z.string().trim().min(16).max(256),
  code: z.string().trim().regex(/^\d{6}$/, "The access code is 6 digits."),
});

/* Social login (Google / GitHub). No signature and no email round-trip: the provider is
   what proves the email, and PKCE is what binds the resulting code to the wallet that
   opened the handshake — see src/lib/social-onboarding.ts.

   `codeChallenge` is REQUIRED here even though the Payments service treats it as optional.
   The poll route hands the code to whoever knows the `state`, so a handshake without a
   challenge is one anybody who saw that state can redeem. */
const pkceChallenge = z
  .string()
  .trim()
  .min(43)
  .max(128)
  .regex(/^[A-Za-z0-9_-]+$/, "code_challenge must be base64url (RFC 7636).");

const pkceVerifier = z
  .string()
  .trim()
  .min(43)
  .max(128)
  .regex(/^[A-Za-z0-9._~-]+$/, "code_verifier must be RFC 7636 unreserved characters.");

export const walletSocialAuthorizeBodySchema = z.object({
  provider: z.enum(["google", "github"]),
  codeChallenge: pkceChallenge,
  codeChallengeMethod: z.literal("S256").default("S256"),
  deviceLabel: z.string().trim().max(120).optional(),
});

export const walletSocialClaimBodySchema = z.object({
  code: z.string().trim().min(16).max(256),
  codeVerifier: pkceVerifier,
  // Only a fallback for the display name; the provider profile wins when it has one.
  name: z.string().trim().min(1).max(120).optional(),
});

export const walletSocialStateParamSchema = z.object({
  state: z.string().trim().min(16).max(256).regex(/^[A-Za-z0-9_-]+$/, "Invalid handshake state."),
});

export type WalletSocialAuthorizeBody = z.infer<typeof walletSocialAuthorizeBodySchema>;
export type WalletSocialClaimBody = z.infer<typeof walletSocialClaimBodySchema>;

export type WalletRegisterBody = z.infer<typeof walletRegisterBodySchema>;
export type WalletClaimBody = z.infer<typeof walletClaimBodySchema>;
export type WalletLinkBody = z.infer<typeof walletLinkBodySchema>;
export type WalletLinkVerifyBody = z.infer<typeof walletLinkVerifyBodySchema>;
