/* wallet-auth.ts — the wallet's own sign-in: Google, GitHub or an emailed code, and the
   encrypted backup a sign-in restores.

   ## What changed, and what did not

   The social login before this one (social-onboarding.ts) went through Pollar, which
   generated the Stellar key and kept it in its own KMS. This one keeps no key anywhere.
   The wallet generates the seed on the device, seals it there under a key derived from the
   person's password, and hands this platform the sealed box. A sign-in on the next device
   gets the box back; only the password opens it, and the password never leaves the device.
   So a sign-in proves WHO someone is, and the password proves they may have the wallet —
   two different questions, answered by two different parties.

   What did not change is how an email is trusted, because the reasoning still holds:

     - A provider's verified email is enough to create a NEW account. The authorization URL
       works in anyone's browser, so a stranger can start a login and send someone the link;
       for an email with no account that buys them an empty account they could squat, never
       a wallet with money in it. Stated rather than hidden, as it was before.
     - An email that ALREADY has an account gets nothing on the provider's word. A code goes
       to that inbox and only the code finishes the sign-in — whoever consented reads the
       inbox, a stranger who sent them the link does not. That is also the only door to an
       existing backup, which is the thing worth stealing.
     - An email sign-in is the inbox proof itself, so it needs nothing else.

   ## The three steps, and what each one hands out

     1. Prove the email — `startOAuth` / callback / `claimOAuth`, or `startEmailLogin` /
        `verifyEmailLogin`. Ends in `ready`: the identity, whether an account exists, the
        backup if there is one, and a short-lived SESSION TOKEN. No API key yet.
     2. `finishWalletSignIn` — the session token plus a signature by the Stellar key the
        device now holds (a new seed, or the one it just decrypted). Creates or links the
        account, stores the backup if one came with it, and mints the wallet's API keys.
     3. Later, `updateWalletBackup` — the device re-seals the box under a new password and
        replaces it. No sign-in: the signature by the backup's own key is the credential.

   The signature in step 2 is what binds the account to a key rather than to whoever holds
   a session token. The token proves an email; the signature proves the device holds the
   address the account (and its backup) is being attached to. */
import {
  BETTER_AUTH_SECRET,
  BETTER_AUTH_URL,
  WALLET_GITHUB_CLIENT_ID,
  WALLET_GITHUB_CLIENT_SECRET,
  WALLET_GOOGLE_CLIENT_ID,
  WALLET_GOOGLE_CLIENT_SECRET,
} from "astro:env/server";
import { prisma } from "@/lib/prisma";
import { isMailConfigured, sendMail } from "@/lib/mailer";
import { renderWalletLoginCodeEmail } from "@/lib/emails";
import { withinBudget, type RatePolicy } from "@/lib/rate-limit";
import { verifyStellarSignature } from "@/lib/stellar-verify";
import { provisionWalletAccount, type WalletKeys } from "@/lib/wallet-provisioning";
import {
  HANDSHAKE_TTL_MS,
  LOGIN_CODE_MAX_ATTEMPTS,
  LOGIN_CODE_RESEND_MS,
  LOGIN_CODE_TTL_MS,
  PROVIDER_ENDPOINTS,
  SESSION_TTL_MS,
  authorizationUrl,
  backupMessage,
  callbackUrl,
  fallbackName,
  finishMessage,
  githubIdentity,
  googleIdentity,
  isBackupBox,
  issueSessionToken,
  pkceMatches,
  randomToken,
  readSessionToken,
  sha256Hex,
  signedAtFresh,
  sixDigitCode,
  type IdentityResult,
  type WalletAuthIdentity,
  type WalletAuthMethod,
  type WalletAuthProvider,
} from "@/lib/wallet-auth-core";

/* --------------------------------- budgets --------------------------------- */

/* Per address and for everyone together, in a ten-minute window — see @/lib/rate-limit for
   why both. `email` is the tight one: it is the route that can make this platform send mail
   to a stranger. `poll` is loose because a wallet polls every couple of seconds while
   someone reads a consent screen. */
const WINDOW_MS = 10 * 60 * 1000;
const BUDGETS: Record<string, [RatePolicy, RatePolicy]> = {
  "wallet-auth:authorize": [{ limit: 20, windowMs: WINDOW_MS }, { limit: 600, windowMs: WINDOW_MS }],
  "wallet-auth:poll": [{ limit: 400, windowMs: WINDOW_MS }, { limit: 20_000, windowMs: WINDOW_MS }],
  "wallet-auth:claim": [{ limit: 30, windowMs: WINDOW_MS }, { limit: 600, windowMs: WINDOW_MS }],
  "wallet-auth:email": [{ limit: 10, windowMs: WINDOW_MS }, { limit: 300, windowMs: WINDOW_MS }],
  "wallet-auth:verify": [{ limit: 30, windowMs: WINDOW_MS }, { limit: 600, windowMs: WINDOW_MS }],
  "wallet-auth:finish": [{ limit: 30, windowMs: WINDOW_MS }, { limit: 600, windowMs: WINDOW_MS }],
  "wallet-auth:backup": [{ limit: 20, windowMs: WINDOW_MS }, { limit: 300, windowMs: WINDOW_MS }],
};

function admit(bucket: keyof typeof BUDGETS, clientIp: string): boolean {
  const [perAddress, global] = BUDGETS[bucket];
  return withinBudget(bucket, clientIp, perAddress, global);
}

/* --------------------------------- results --------------------------------- */

export interface StoredBackup {
  stellarAddress: string;
  box: string;
  updatedAt: string;
}

/** A proven email, and everything the wallet needs to decide what happens next. */
export interface SignInReady {
  status: "ready";
  identity: WalletAuthIdentity;
  /** Whether a CosmosPay account already exists for this email. */
  account: "existing" | "new";
  /** The encrypted seed to restore, when this account has one. */
  backup: StoredBackup | null;
  /** Good for `finish`, and for nothing else. */
  sessionToken: string;
  expiresInSeconds: number;
}

export type OAuthStartResult =
  | { status: "opened"; state: string; authorizationUrl: string; expiresAt: string }
  | { status: "not_configured" }
  | { status: "rate_limited" };

export type OAuthPollResult =
  | { status: "pending" | "authorized" | "redeemed" | "expired" }
  | { status: "failed"; error: string }
  | { status: "rate_limited" };

export type OAuthClaimResult =
  | SignInReady
  | { status: "verify_email"; claimToken: string; expiresInSeconds: number; email: string }
  | { status: "pending" }
  | { status: "failed"; error: string }
  | { status: "expired" }
  | { status: "forbidden" }
  | { status: "rate_limited" }
  | { status: "email_unavailable" };

export type EmailStartResult =
  | { status: "sent"; claimToken: string; expiresInSeconds: number }
  | { status: "rate_limited" }
  | { status: "email_unavailable" };

export type EmailVerifyResult =
  | SignInReady
  | { status: "invalid"; attemptsLeft: number }
  | { status: "expired" }
  | { status: "locked" }
  | { status: "rate_limited" };

export type FinishResult =
  | { status: "ready"; account: "created" | "linked"; organizationId: string; keys: WalletKeys }
  | { status: "unauthorized" }
  | { status: "invalid_signature" }
  | { status: "invalid_backup" }
  | { status: "backup_conflict"; stellarAddress: string }
  | { status: "rate_limited" };

export type BackupUpdateResult =
  | { status: "updated" }
  | { status: "not_found" }
  | { status: "invalid_signature" }
  | { status: "invalid_backup" }
  | { status: "rate_limited" };

/* --------------------------------- helpers --------------------------------- */

interface ProviderCredentials {
  clientId: string;
  clientSecret: string;
}

/** The OAuth app for a provider, or null when this deployment has none configured. */
function credentialsFor(provider: WalletAuthProvider): ProviderCredentials | null {
  const [clientId, clientSecret] =
    provider === "google"
      ? [WALLET_GOOGLE_CLIENT_ID, WALLET_GOOGLE_CLIENT_SECRET]
      : [WALLET_GITHUB_CLIENT_ID, WALLET_GITHUB_CLIENT_SECRET];
  return clientId && clientSecret ? { clientId, clientSecret } : null;
}

/** Which providers this deployment can offer. The wallet reads it to decide what to show. */
export function configuredProviders(): WalletAuthProvider[] {
  return (["google", "github"] as const).filter((p) => credentialsFor(p) !== null);
}

const redirectUri = (provider: WalletAuthProvider) => callbackUrl(BETTER_AUTH_URL, provider);

/* Expired handshakes and codes are worthless and would otherwise accumulate forever. Swept
   from the start routes, at most once per interval per process, and never awaited by them:
   a slow delete must not be the reason a sign-in is slow. */
const SWEEP_EVERY_MS = 10 * 60 * 1000;
let lastSweep = 0;
function sweepExpired(): void {
  const now = Date.now();
  if (now - lastSweep < SWEEP_EVERY_MS) return;
  lastSweep = now;
  const before = new Date(now - 24 * 60 * 60 * 1000);
  void prisma.walletAuthHandshake.deleteMany({ where: { expiresAt: { lt: before } } }).catch(() => null);
  void prisma.walletLoginCode.deleteMany({ where: { expiresAt: { lt: before } } }).catch(() => null);
}

async function findUserByEmail(email: string): Promise<{ id: string; name: string | null } | null> {
  return prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    select: { id: true, name: true },
  });
}

/** Step 1 is over: the email is proven. Say what exists for it, and issue the token. */
async function readyFor(identity: WalletAuthIdentity): Promise<SignInReady> {
  const user = await findUserByEmail(identity.email);
  const backup = user
    ? await prisma.walletBackup.findUnique({
        where: { userId: user.id },
        select: { stellarAddress: true, box: true, updatedAt: true },
      })
    : null;
  return {
    status: "ready",
    identity,
    account: user ? "existing" : "new",
    backup: backup
      ? { stellarAddress: backup.stellarAddress, box: backup.box, updatedAt: backup.updatedAt.toISOString() }
      : null,
    sessionToken: issueSessionToken(identity, BETTER_AUTH_SECRET),
    expiresInSeconds: Math.floor(SESSION_TTL_MS / 1000),
  };
}

/**
 * Put a code in someone's inbox and remember what it is for. Shared by the email sign-in
 * and by a provider sign-in that landed on an existing account.
 */
async function sendLoginCode(input: {
  email: string;
  name: string | null;
  avatar: string | null;
  via: WalletAuthMethod;
}): Promise<{ claimToken: string; expiresInSeconds: number } | null> {
  const code = sixDigitCode();
  const claimToken = randomToken();
  const row = await prisma.walletLoginCode
    .create({
      data: {
        email: input.email,
        name: input.name,
        avatar: input.avatar,
        via: input.via,
        claimHash: sha256Hex(claimToken),
        codeHash: sha256Hex(code),
        expiresAt: new Date(Date.now() + LOGIN_CODE_TTL_MS),
      },
      select: { id: true },
    })
    .catch(() => null);
  if (!row) return null;

  try {
    const msg = renderWalletLoginCodeEmail({
      name: fallbackName(input.email, input.name),
      code,
      minutes: Math.floor(LOGIN_CODE_TTL_MS / 60000),
    });
    await sendMail({ to: input.email, subject: msg.subject, html: msg.html, text: msg.text });
  } catch {
    // A code nobody received must not stay redeemable.
    await prisma.walletLoginCode.update({ where: { id: row.id }, data: { status: "expired" } }).catch(() => null);
    return null;
  }
  return { claimToken, expiresInSeconds: Math.floor(LOGIN_CODE_TTL_MS / 1000) };
}

/* ------------------------------ provider flow ------------------------------ */

/** Open a handshake and return the URL the wallet sends the person to. */
export async function startOAuth(input: {
  provider: WalletAuthProvider;
  codeChallenge: string;
  clientIp: string;
}): Promise<OAuthStartResult> {
  if (!admit("wallet-auth:authorize", input.clientIp)) return { status: "rate_limited" };
  const creds = credentialsFor(input.provider);
  if (!creds) return { status: "not_configured" };
  sweepExpired();

  const state = randomToken();
  const expiresAt = new Date(Date.now() + HANDSHAKE_TTL_MS);
  await prisma.walletAuthHandshake.create({
    data: { state, provider: input.provider, codeChallenge: input.codeChallenge, expiresAt },
  });
  return {
    status: "opened",
    state,
    authorizationUrl: authorizationUrl(input.provider, {
      clientId: creds.clientId,
      redirectUri: redirectUri(input.provider),
      state,
    }),
    expiresAt: expiresAt.toISOString(),
  };
}

const FETCH_TIMEOUT_MS = 10_000;

/** Trade the provider's code for the identity it vouches for. Throws on transport failure. */
async function fetchIdentity(provider: WalletAuthProvider, code: string, creds: ProviderCredentials): Promise<IdentityResult> {
  const signal = () => AbortSignal.timeout(FETCH_TIMEOUT_MS);
  const tokenRes = await fetch(PROVIDER_ENDPOINTS[provider].token, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams({
      code,
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
      redirect_uri: redirectUri(provider),
      grant_type: "authorization_code",
    }),
    signal: signal(),
  });
  const token = (await tokenRes.json().catch(() => null)) as { access_token?: unknown } | null;
  const accessToken = typeof token?.access_token === "string" ? token.access_token : null;
  if (!tokenRes.ok || !accessToken) throw new Error(`${provider}: token exchange failed (${tokenRes.status})`);

  if (provider === "google") {
    const res = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: signal(),
    });
    if (!res.ok) throw new Error(`google: userinfo failed (${res.status})`);
    return googleIdentity(await res.json());
  }

  const gh = {
    Authorization: `Bearer ${accessToken}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    // GitHub refuses API calls without one.
    "User-Agent": "CosmosPay-Wallet-SignIn",
  };
  const [userRes, emailsRes] = await Promise.all([
    fetch("https://api.github.com/user", { headers: gh, signal: signal() }),
    fetch("https://api.github.com/user/emails", { headers: gh, signal: signal() }),
  ]);
  if (!userRes.ok || !emailsRes.ok) throw new Error(`github: profile failed (${userRes.status}/${emailsRes.status})`);
  return githubIdentity(await userRes.json(), await emailsRes.json());
}

/**
 * The provider sent the person back. Read who they are and park it on the handshake.
 *
 * Returns what the landing page should say. Nothing here is handed to the browser — the
 * identity waits on the handshake for the wallet that holds the verifier to come and get it.
 */
export async function completeOAuthCallback(input: {
  provider: WalletAuthProvider;
  state: string;
  code: string | null;
  providerError: string | null;
}): Promise<{ ok: true } | { ok: false; reason: "expired" | "denied" | "email_unverified" | "failed" }> {
  const hs = await prisma.walletAuthHandshake.findUnique({ where: { state: input.state } }).catch(() => null);
  // A state for another provider is a state this callback does not own.
  if (!hs || hs.provider !== input.provider || hs.status !== "pending" || hs.expiresAt.getTime() < Date.now()) {
    return { ok: false, reason: "expired" };
  }

  const fail = async (error: string) => {
    await prisma.walletAuthHandshake
      .updateMany({ where: { id: hs.id, status: "pending" }, data: { status: "failed", error } })
      .catch(() => null);
  };

  if (input.providerError || !input.code) {
    await fail("denied");
    return { ok: false, reason: "denied" };
  }
  const creds = credentialsFor(input.provider);
  if (!creds) {
    await fail("not_configured");
    return { ok: false, reason: "failed" };
  }

  let result: IdentityResult;
  try {
    result = await fetchIdentity(input.provider, input.code, creds);
  } catch {
    await fail("provider_unavailable");
    return { ok: false, reason: "failed" };
  }
  if (!result.ok) {
    await fail(result.error);
    return { ok: false, reason: result.error === "email_unverified" ? "email_unverified" : "failed" };
  }

  const { email, name, avatar, subject } = result.identity;
  const moved = await prisma.walletAuthHandshake
    .updateMany({ where: { id: hs.id, status: "pending" }, data: { status: "authorized", email, name, avatar, subject } })
    .catch(() => ({ count: 0 }));
  return moved.count ? { ok: true } : { ok: false, reason: "expired" };
}

/** Has the person come back yet? Says nothing about who they are — that is the claim's job. */
export async function pollOAuth(input: { state: string; clientIp: string }): Promise<OAuthPollResult> {
  if (!admit("wallet-auth:poll", input.clientIp)) return { status: "rate_limited" };
  const hs = await prisma.walletAuthHandshake
    .findUnique({ where: { state: input.state }, select: { status: true, error: true, expiresAt: true } })
    .catch(() => null);
  if (!hs) return { status: "expired" };
  if (hs.status === "failed") return { status: "failed", error: hs.error ?? "failed" };
  if (hs.status === "redeemed") return { status: "redeemed" };
  if (hs.expiresAt.getTime() < Date.now()) return { status: "expired" };
  return { status: hs.status === "authorized" ? "authorized" : "pending" };
}

/**
 * Redeem a handshake with the verifier behind its challenge.
 *
 * The handshake is spent by a compare-and-swap on `authorized`, so two requests racing the
 * same verifier cannot both come away with a session. A wrong verifier is `forbidden` and
 * spends nothing: whoever sent it only knew the state, which is not a secret.
 */
export async function claimOAuth(input: { state: string; codeVerifier: string; clientIp: string }): Promise<OAuthClaimResult> {
  if (!admit("wallet-auth:claim", input.clientIp)) return { status: "rate_limited" };
  const hs = await prisma.walletAuthHandshake.findUnique({ where: { state: input.state } }).catch(() => null);
  if (!hs || hs.status === "redeemed") return { status: "expired" };
  if (!pkceMatches(input.codeVerifier, hs.codeChallenge)) return { status: "forbidden" };
  if (hs.status === "failed") return { status: "failed", error: hs.error ?? "failed" };
  if (hs.expiresAt.getTime() < Date.now()) return { status: "expired" };
  if (hs.status !== "authorized" || !hs.email) return { status: "pending" };

  // An existing account is only ever reached through its inbox — see the header. Checked
  // before the handshake is spent, so a deployment with no mail refuses without burning it.
  const existing = await findUserByEmail(hs.email);
  if (existing && !isMailConfigured()) return { status: "email_unavailable" };

  const spent = await prisma.walletAuthHandshake
    .updateMany({ where: { id: hs.id, status: "authorized" }, data: { status: "redeemed" } })
    .catch(() => ({ count: 0 }));
  if (!spent.count) return { status: "expired" };

  const provider = hs.provider as WalletAuthProvider;
  if (existing) {
    const sent = await sendLoginCode({ email: hs.email, name: hs.name, avatar: hs.avatar, via: provider });
    if (!sent) return { status: "email_unavailable" };
    return { status: "verify_email", ...sent, email: hs.email };
  }
  return readyFor({ email: hs.email, name: hs.name, avatar: hs.avatar, method: provider });
}

/* -------------------------------- email flow -------------------------------- */

/**
 * Email a sign-in code. Always `sent` for a well-formed address that got through the
 * budgets: saying whether an account exists would turn this route into a lookup service.
 */
export async function startEmailLogin(input: { email: string; clientIp: string }): Promise<EmailStartResult> {
  if (!admit("wallet-auth:email", input.clientIp)) return { status: "rate_limited" };
  if (!isMailConfigured()) return { status: "email_unavailable" };
  sweepExpired();

  const email = input.email.trim().toLowerCase();
  const recent = await prisma.walletLoginCode
    .findFirst({
      where: { email, status: "pending", createdAt: { gt: new Date(Date.now() - LOGIN_CODE_RESEND_MS) } },
      select: { id: true },
    })
    .catch(() => null);
  if (recent) return { status: "rate_limited" };

  const user = await findUserByEmail(email).catch(() => null);
  const sent = await sendLoginCode({ email, name: user?.name ?? null, avatar: null, via: "email" });
  return sent ? { status: "sent", ...sent } : { status: "email_unavailable" };
}

/**
 * Exchange an emailed code for a sign-in. Claimed by a compare-and-swap on `pending`, so
 * one correct code cannot finish two sign-ins; wrong codes are counted and lock the row.
 */
export async function verifyEmailLogin(input: { claimToken: string; code: string; clientIp: string }): Promise<EmailVerifyResult> {
  if (!admit("wallet-auth:verify", input.clientIp)) return { status: "rate_limited" };
  const row = await prisma.walletLoginCode.findUnique({ where: { claimHash: sha256Hex(input.claimToken) } }).catch(() => null);
  if (!row || row.status !== "pending") return { status: row?.status === "locked" ? "locked" : "expired" };
  if (row.expiresAt.getTime() < Date.now()) {
    await prisma.walletLoginCode.updateMany({ where: { id: row.id, status: "pending" }, data: { status: "expired" } }).catch(() => null);
    return { status: "expired" };
  }

  if (sha256Hex(input.code) !== row.codeHash) {
    const attempts = row.attempts + 1;
    const locked = attempts >= LOGIN_CODE_MAX_ATTEMPTS;
    await prisma.walletLoginCode
      .updateMany({ where: { id: row.id, status: "pending" }, data: { attempts, ...(locked ? { status: "locked" } : {}) } })
      .catch(() => null);
    return locked ? { status: "locked" } : { status: "invalid", attemptsLeft: LOGIN_CODE_MAX_ATTEMPTS - attempts };
  }

  const claimed = await prisma.walletLoginCode
    .updateMany({ where: { id: row.id, status: "pending" }, data: { status: "claimed" } })
    .catch(() => ({ count: 0 }));
  if (!claimed.count) return { status: "expired" };

  const method = (["google", "github", "email"].includes(row.via) ? row.via : "email") as WalletAuthMethod;
  return readyFor({ email: row.email, name: row.name, avatar: row.avatar, method });
}

/* ---------------------------------- finish ---------------------------------- */

/**
 * Attach the proven email to the key the device holds: create or link the account, keep the
 * backup if one came with it, and mint the wallet's keys.
 *
 * Refuses to put a backup for a DIFFERENT address over an existing one unless the wallet
 * says so explicitly. That backup may be the only copy of a funded wallet, and the usual
 * way to reach this state is someone who forgot their password tapping "start over" — the
 * wallet has to have shown them what they are about to lose before this goes through.
 */
export async function finishWalletSignIn(input: {
  sessionToken: string;
  stellarAddress: string;
  signedAt: string;
  signature: string;
  backup?: string;
  replaceBackup?: boolean;
  clientIp: string;
}): Promise<FinishResult> {
  if (!admit("wallet-auth:finish", input.clientIp)) return { status: "rate_limited" };
  const identity = readSessionToken(input.sessionToken, BETTER_AUTH_SECRET);
  if (!identity) return { status: "unauthorized" };
  if (!signedAtFresh(input.signedAt)) return { status: "invalid_signature" };
  const message = finishMessage(identity.email, input.stellarAddress, input.signedAt);
  if (!verifyStellarSignature(input.stellarAddress, message, input.signature)) return { status: "invalid_signature" };
  if (input.backup !== undefined && !isBackupBox(input.backup)) return { status: "invalid_backup" };

  // The conflict is decided BEFORE anything is created, so a refused finish leaves nothing
  // half-provisioned behind it.
  const user = await findUserByEmail(identity.email);
  if (user && input.backup !== undefined && !input.replaceBackup) {
    const current = await prisma.walletBackup.findUnique({ where: { userId: user.id }, select: { stellarAddress: true } });
    if (current && current.stellarAddress !== input.stellarAddress) {
      return { status: "backup_conflict", stellarAddress: current.stellarAddress };
    }
  }

  const provisioned = await provisionWalletAccount({
    email: identity.email,
    name: fallbackName(identity.email, identity.name ?? user?.name),
    stellarAddress: input.stellarAddress,
    kind: "sign-in",
    provisionedBy: "wallet-sign-in",
  });

  if (input.backup !== undefined) {
    await prisma.walletBackup.upsert({
      where: { userId: provisioned.userId },
      create: { userId: provisioned.userId, stellarAddress: input.stellarAddress, box: input.backup },
      update: { stellarAddress: input.stellarAddress, box: input.backup },
    });
  }

  return {
    status: "ready",
    account: provisioned.account,
    organizationId: provisioned.organizationId,
    keys: provisioned.keys,
  };
}

/* ---------------------------------- backup ---------------------------------- */

/**
 * Replace a backup's box — the device re-sealed it under a new password.
 *
 * The signature is the whole credential: it is made by the backup's own address over the
 * new box's hash, so only the key the box restores can change it, and a signature over one
 * box cannot be replayed to store another. Every backup filed under that address changes,
 * since each of them holds that key.
 */
export async function updateWalletBackup(input: {
  stellarAddress: string;
  box: string;
  signedAt: string;
  signature: string;
  clientIp: string;
}): Promise<BackupUpdateResult> {
  if (!admit("wallet-auth:backup", input.clientIp)) return { status: "rate_limited" };
  if (!isBackupBox(input.box)) return { status: "invalid_backup" };
  if (!signedAtFresh(input.signedAt)) return { status: "invalid_signature" };
  const message = backupMessage(input.stellarAddress, input.box, input.signedAt);
  if (!verifyStellarSignature(input.stellarAddress, message, input.signature)) return { status: "invalid_signature" };

  const updated = await prisma.walletBackup.updateMany({
    where: { stellarAddress: input.stellarAddress },
    data: { box: input.box },
  });
  return updated.count ? { status: "updated" } : { status: "not_found" };
}
