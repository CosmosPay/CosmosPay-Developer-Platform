/* wallet-provisioning.ts — securely auto-create a CosmosPay account for a wallet user.

   The CosmosPay Wallet is public/open-source, so it can hold NO server secret. Account
   creation is therefore gated by two factors the user genuinely controls:

     1. A Stellar key SIGNATURE over a challenge (proves they control the account) —
        verified with verifyStellarSignature (no shared secret needed).
     2. EMAIL verification — the account + API key are only created once the user clicks
        a one-time link sent to the email they assigned. So you can't mint accounts (or
        get a key) for an email you don't own.

   The API key is returned only to the wallet that started the flow, via a one-time claim
   token (we store only its SHA-256 hash). This is a separate registration path from the
   Authentik/better-auth dashboard login; the user row is created directly so a later
   Authentik sign-in with the same email links to it. */
import { createHash, randomBytes, randomInt, randomUUID } from "node:crypto";
import { BETTER_AUTH_URL } from "astro:env/server";
import { prisma } from "@/lib/prisma";
import { createOrg, ensureDefaultOrg, listForUser } from "@/lib/organizations";
import { createConsumer, createApiKey, getApiKey } from "@/utils/apisix";
import { isMailConfigured, sendMail } from "@/lib/mailer";
import { renderWalletVerifyEmail, renderWalletLinkCodeEmail } from "@/lib/emails";
import { provisionAuthentikIdentity } from "@/lib/authentik";
import { linkMessage, registrationMessage, verifyStellarSignature } from "@/lib/stellar-verify";

// Scopes granted to wallet-provisioned keys. Beyond swaps, the wallet now also creates
// pay links (payments), and runs the BlindPay fiat flow (kyc receivers + onramp/offramp).
const WALLET_KEY_SCOPES = [
  "swaps:read",
  "swaps:write",
  "payments:read",
  "payments:write",
  "kyc:read",
  "kyc:write",
  "onramp:read",
  "onramp:write",
  "offramp:read",
  "offramp:write",
];
// How long a pending registration (and its claim token) stays valid.
const REGISTRATION_TTL_MS = 30 * 60 * 1000; // 30 minutes
// Minimum gap between registration emails for the same address (anti-spam).
const RESEND_COOLDOWN_MS = 60 * 1000;
// How long an emailed access code (account-linking flow) stays valid.
const LINK_CODE_TTL_MS = 15 * 60 * 1000; // 15 minutes
// Wrong-code attempts allowed before a link request locks (must request a new code).
const MAX_CODE_ATTEMPTS = 5;

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

/** Crypto-random 6-digit access code (uniform; never Math.random). */
function genAccessCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

/**
 * Mint the wallet's swaps-scoped keys for BOTH environments so the wallet can swap on
 * whichever network it's set to (dev = testnet, prod = mainnet). Returns the raw keys plus
 * the APISIX credential ids (so the register flow can re-read them on claim).
 */
async function mintWalletKeys(
  userId: string,
  organizationId: string,
): Promise<{ dev: string | null; prod: string | null; ids: string[] }> {
  const make = (env: "dev" | "prod", label: string) =>
    createApiKey(
      userId,
      env,
      WALLET_KEY_SCOPES,
      "user",
      `CosmosWallet swaps (${label})`,
      "Auto-provisioned for the CosmosPay Wallet",
      organizationId || undefined,
    ).catch(() => null);
  const [devKey, prodKey] = await Promise.all([make("dev", "testnet"), make("prod", "mainnet")]);
  const ids = [devKey?.id, prodKey?.id].filter((x): x is string => !!x);
  return { dev: devKey?.apiKey ?? null, prod: prodKey?.apiKey ?? null, ids };
}

/** Re-read the raw key values for the given APISIX credential ids, bucketed by env label. */
async function readKeysByEnv(credentialIds: string[], userId: string): Promise<WalletKeys> {
  const keys: WalletKeys = { dev: null, prod: null };
  for (const id of credentialIds) {
    const cred = await getApiKey(id, userId).catch(() => null);
    const env = cred?.value?.labels?.env;
    const key = cred?.value?.plugins?.["key-auth"]?.key ?? null;
    if (env === "dev") keys.dev = key;
    else if (env === "prod") keys.prod = key;
  }
  return keys;
}

export type StartResult =
  | { status: "pending"; claimToken: string; expiresInSeconds: number }
  | { status: "exists" }
  | { status: "invalid_signature" }
  | { status: "rate_limited" }
  | { status: "email_unavailable" };

/** Both swap keys for an account: a dev key (testnet) and a prod key (mainnet). The wallet
 *  picks the one matching its current network. Either may be null if its mint failed. */
export interface WalletKeys {
  dev: string | null;
  prod: string | null;
}

export type ClaimResult =
  | { status: "pending" }
  | { status: "ready"; organizationId: string; keys: WalletKeys }
  | { status: "claimed" }
  | { status: "expired" };

export type LinkStartResult =
  | { status: "sent"; claimToken: string; expiresInSeconds: number }
  | { status: "not_found" } // no account for this email → the caller should register instead
  | { status: "invalid_signature" }
  | { status: "rate_limited" }
  | { status: "email_unavailable" };

export type LinkVerifyResult =
  | { status: "ready"; organizationId: string; keys: WalletKeys }
  | { status: "invalid"; attemptsLeft: number }
  | { status: "expired" }
  | { status: "locked" };

/* Step 1 — verify the Stellar signature, then (if the email is free) create a pending
   registration and email the user a one-time confirmation link. No account exists yet. */
export async function startWalletRegistration(input: {
  email: string;
  name?: string;
  stellarAddress: string;
  nonce: string;
  signature: string;
}): Promise<StartResult> {
  const email = input.email.trim().toLowerCase();
  const name = input.name?.trim() || email.split("@")[0] || "Cosmos user";

  // Factor 1: the requester must control the Stellar account.
  const message = registrationMessage(email, input.stellarAddress, input.nonce);
  if (!verifyStellarSignature(input.stellarAddress, message, input.signature)) {
    return { status: "invalid_signature" };
  }

  // We can't finish without email — fail clearly rather than create an unconfirmable account.
  if (!isMailConfigured()) return { status: "email_unavailable" };

  // Only ever provision when no account exists for this email yet.
  const existing = await prisma.user
    .findFirst({ where: { email: { equals: email, mode: "insensitive" } }, select: { id: true } })
    .catch(() => null);
  if (existing) return { status: "exists" };

  // Anti-spam: don't re-email the same address within the cooldown window.
  const recent = await prisma.walletRegistration
    .findFirst({
      where: { email, status: "pending", createdAt: { gt: new Date(Date.now() - RESEND_COOLDOWN_MS) } },
      select: { id: true },
    })
    .catch(() => null);
  if (recent) return { status: "rate_limited" };

  const verifyToken = randomBytes(32).toString("hex");
  const claimToken = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + REGISTRATION_TTL_MS);

  await prisma.walletRegistration.create({
    data: {
      email,
      name,
      stellarAddress: input.stellarAddress,
      verifyToken,
      claimHash: sha256(claimToken),
      status: "pending",
      expiresAt,
    },
  });

  const base = (BETTER_AUTH_URL || "https://dev.cosmospay.lat").replace(/\/+$/, "");
  const url = `${base}/api/wallet/verify?token=${verifyToken}`;
  try {
    const msg = renderWalletVerifyEmail({ name, url, minutes: Math.floor(REGISTRATION_TTL_MS / 60000) });
    await sendMail({ to: email, subject: msg.subject, html: msg.html, text: msg.text });
  } catch {
    return { status: "email_unavailable" };
  }

  return { status: "pending", claimToken, expiresInSeconds: Math.floor(REGISTRATION_TTL_MS / 1000) };
}

/* Step 2 — the user clicked the emailed link. Create the account + a swaps-scoped API
   key now (email ownership proven), and mark the registration confirmed so the wallet
   can claim the key. Idempotent: a second click just reports success. */
export async function confirmWalletRegistration(
  verifyToken: string,
): Promise<{ ok: boolean; name?: string; setupUrl?: string | null }> {
  const reg = await prisma.walletRegistration.findUnique({ where: { verifyToken } }).catch(() => null);
  if (!reg) return { ok: false };
  if (reg.expiresAt.getTime() < Date.now() && reg.status === "pending") return { ok: false };
  if (reg.status !== "pending") return { ok: true, name: reg.name ?? undefined };

  // Guard against a duplicate account if the email was claimed elsewhere meanwhile.
  const existing = await prisma.user
    .findFirst({ where: { email: { equals: reg.email, mode: "insensitive" } }, select: { id: true } })
    .catch(() => null);
  if (existing) {
    await prisma.walletRegistration.update({ where: { id: reg.id }, data: { status: "claimed" } }).catch(() => null);
    return { ok: false };
  }

  const name = reg.name || reg.email.split("@")[0] || "Cosmos user";
  const userId = randomUUID();
  await prisma.user.create({ data: { id: userId, email: reg.email, name, emailVerified: true } });
  await prisma.profile.create({ data: { userId, plan: "community" } }).catch(() => null);

  const orgResult = await createOrg(userId, `${name}'s organization`, true, {
    provisionedBy: "wallet",
    stellarAddress: reg.stellarAddress,
  });
  const organizationId = orgResult.org?.id ?? "";

  await createConsumer(userId).catch(() => null);
  // Mint both keys (testnet + mainnet); store their credential ids comma-joined so the
  // claim step can re-read the raw key values from APISIX (we never store the keys).
  const { ids } = await mintWalletKeys(userId, organizationId);

  await prisma.walletRegistration.update({
    where: { id: reg.id },
    data: {
      status: "confirmed",
      userId,
      organizationId,
      credentialId: ids.join(","),
      environment: "both",
    },
  });

  // Give them an Authentik identity so they can log in at auth.cosmospay.lat. Best-effort:
  // if Authentik isn't configured/reachable, the account still links on first OAuth login.
  const authentik = await provisionAuthentikIdentity({ email: reg.email, name }).catch(() => null);

  return { ok: true, name, setupUrl: authentik?.setupUrl ?? null };
}

/* Step 3 — the wallet polls with its claim token. Once confirmed, re-read the API key
   from APISIX (we never store it) and return it ONCE, then mark the registration claimed. */
export async function claimWalletRegistration(input: {
  stellarAddress: string;
  claimToken: string;
}): Promise<ClaimResult> {
  const claimHash = sha256(input.claimToken);
  const reg = await prisma.walletRegistration
    .findFirst({ where: { claimHash, stellarAddress: input.stellarAddress } })
    .catch(() => null);
  if (!reg) return { status: "expired" };
  if (reg.status === "claimed") return { status: "claimed" };
  if (reg.status === "pending") {
    if (reg.expiresAt.getTime() < Date.now()) return { status: "expired" };
    return { status: "pending" };
  }

  // status === "confirmed": re-read BOTH keys from APISIX and hand them over once.
  const ids = (reg.credentialId ?? "").split(",").filter(Boolean);
  const keys = reg.userId ? await readKeysByEnv(ids, reg.userId) : { dev: null, prod: null };
  if (!keys.dev && !keys.prod) return { status: "expired" };

  await prisma.walletRegistration.update({ where: { id: reg.id }, data: { status: "claimed" } }).catch(() => null);
  return { status: "ready", organizationId: reg.organizationId ?? "", keys };
}

/* Link flow, step 1 — the email already has an account, so we can't create one. Verify the
   Stellar signature, then email a one-time 6-digit access code to that address. We store only
   the code's SHA-256 hash; the wallet keeps a claim token to present alongside the code. */
export async function startWalletLink(input: {
  email: string;
  name?: string;
  stellarAddress: string;
  nonce: string;
  signature: string;
}): Promise<LinkStartResult> {
  const email = input.email.trim().toLowerCase();

  // Factor 1: control of the Stellar account (distinct challenge from registration).
  const message = linkMessage(email, input.stellarAddress, input.nonce);
  if (!verifyStellarSignature(input.stellarAddress, message, input.signature)) {
    return { status: "invalid_signature" };
  }

  if (!isMailConfigured()) return { status: "email_unavailable" };

  // Linking only applies to an email that ALREADY has an account.
  const user = await prisma.user
    .findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      select: { id: true, name: true },
    })
    .catch(() => null);
  if (!user) return { status: "not_found" };

  // Anti-spam: at most one code per address per cooldown window.
  const recent = await prisma.walletRegistration
    .findFirst({
      where: { email, kind: "link", status: "pending", createdAt: { gt: new Date(Date.now() - RESEND_COOLDOWN_MS) } },
      select: { id: true },
    })
    .catch(() => null);
  if (recent) return { status: "rate_limited" };

  const code = genAccessCode();
  const claimToken = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + LINK_CODE_TTL_MS);

  await prisma.walletRegistration.create({
    data: {
      email,
      name: user.name ?? input.name?.trim() ?? null,
      stellarAddress: input.stellarAddress,
      // verifyToken is required + unique but unused for linking — fill with a random value.
      verifyToken: randomBytes(32).toString("hex"),
      claimHash: sha256(claimToken),
      codeHash: sha256(code),
      kind: "link",
      status: "pending",
      userId: user.id,
      expiresAt,
    },
  });

  try {
    const name = user.name || email.split("@")[0] || "Cosmos user";
    const msg = renderWalletLinkCodeEmail({ name, code, minutes: Math.floor(LINK_CODE_TTL_MS / 60000) });
    await sendMail({ to: email, subject: msg.subject, html: msg.html, text: msg.text });
  } catch {
    return { status: "email_unavailable" };
  }

  return { status: "sent", claimToken, expiresInSeconds: Math.floor(LINK_CODE_TTL_MS / 1000) };
}

/* Link flow, step 2 — the wallet presents its claim token + the emailed code. On a match,
   mint a swaps-scoped API key for the EXISTING account's organization and return it once.
   Wrong codes are counted and the request locks after MAX_CODE_ATTEMPTS. */
export async function verifyWalletLink(input: {
  stellarAddress: string;
  claimToken: string;
  code: string;
}): Promise<LinkVerifyResult> {
  const claimHash = sha256(input.claimToken);
  const reg = await prisma.walletRegistration
    .findFirst({ where: { claimHash, stellarAddress: input.stellarAddress, kind: "link" } })
    .catch(() => null);
  if (!reg || reg.status !== "pending" || !reg.userId) return { status: "expired" };
  if (reg.expiresAt.getTime() < Date.now()) return { status: "expired" };
  if (reg.attempts >= MAX_CODE_ATTEMPTS) return { status: "locked" };

  // Wrong code: record the attempt and lock once the cap is reached.
  if (!reg.codeHash || sha256(input.code) !== reg.codeHash) {
    const attempts = reg.attempts + 1;
    await prisma.walletRegistration.update({ where: { id: reg.id }, data: { attempts } }).catch(() => null);
    if (attempts >= MAX_CODE_ATTEMPTS) return { status: "locked" };
    return { status: "invalid", attemptsLeft: MAX_CODE_ATTEMPTS - attempts };
  }

  // Correct code — resolve the existing account's organization (prefer one they own).
  const orgs = await listForUser(reg.userId).catch(() => []);
  let org = orgs.find((o) => o.role === "owner") ?? orgs[0];
  if (!org) {
    const ensured = await ensureDefaultOrg(reg.userId).catch(() => []);
    org = ensured[0];
  }
  const organizationId = org?.id ?? "";

  await createConsumer(reg.userId).catch(() => null);
  // Mint both keys (testnet + mainnet) so the linked account can swap on either network.
  const keys = await mintWalletKeys(reg.userId, organizationId);
  // Don't burn the registration on an infra error — surface a 500 so they can retry the
  // same code (attempts aren't incremented for a correct code).
  if (!keys.dev && !keys.prod) throw new Error("Failed to mint linked API keys");

  await prisma.walletRegistration
    .update({
      where: { id: reg.id },
      data: { status: "claimed", organizationId, credentialId: keys.ids.join(","), environment: "both" },
    })
    .catch(() => null);

  return { status: "ready", organizationId, keys: { dev: keys.dev, prod: keys.prod } };
}
