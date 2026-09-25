/* social-onboarding.ts — sign in with Google or GitHub, and come out the other side
   with a Stellar wallet AND a CosmosPay account.

   ## LEGACY: new wallets no longer come through here

   The wallet's own sign-in (run by the community server now) replaced this for every NEW
   wallet: the key is generated on the device instead of in Pollar's KMS. What keeps this module alive is the
   wallets it already made. Moving their funds out needs Pollar to sign one last time, and a
   Pollar session that expired while the app sat unused can only be renewed through this
   handshake — so the wallet reaches it from its migration screen, and from nowhere else.
   Delete it once no Pollar wallet holds a balance.

   ## The problem this exists to solve

   The Payments service's Pollar bridge is scoped (`pollar:read` / `pollar:write`), so
   driving it needs an API key. An API key belongs to an account. An account, until now,
   needed a Stellar signature plus an emailed confirmation link — which a brand-new user
   of a social login has neither of: there is no local seed to sign with (Pollar custodies
   the key) and no account to mint a key from. So the wallet could only offer social login
   to someone who ALREADY had a CosmosPay account, which is close to the opposite of what
   social login is for.

   Two ways out, and the one not taken matters:

     - Hand the wallet a bootstrap API key. Rejected: the wallet is a public, open-source
       bundle, and `pollar:write` includes funding a Stellar account out of the operator's
       XLM. A credential in a public app is a credential everyone has.
     - Run the handshake HERE. Taken. This platform is already a trusted backend — it
       presents the gateway identity headers itself rather than holding a key (see
       lib/cosmos.ts) — so the three bridge calls happen server-side under one dedicated
       consumer and no credential is ever handed out.

   ## What the wallet holds instead

   The PKCE verifier. `authorize` requires a `code_challenge` here even though the bridge
   treats it as optional, because the poll route hands the code to whoever knows the
   `state`, and it is the verifier — which never leaves the device — that decides who may
   redeem it. Without that, these public routes would be a code-collection service.

   ## Trusting the email — and why it is not enough for an existing account

   The provider's email proves who CONSENTED, not who opened the login. The authorization
   URL works in anyone's browser, so a stranger could start a login here, send the link to
   someone, and collect what their consent produces: that person's Pollar session and, when
   the email already had a CosmosPay account, that account's keys.

   So the two cases differ. An email that already has an account gets NOTHING at claim
   time: the session is sealed into a `social-link` registration (sealed-box.ts), a
   six-digit code goes to that account's inbox, and `verifySocialLogin` hands over the
   session and the keys only for that code. Whoever consented reads that inbox; a stranger
   who sent them the link does not.

   A brand-new email still gets its account at once, and the case that leaves open is
   stated rather than hidden: someone phished before they ever used CosmosPay hands the
   stranger a session for a wallet that holds nothing yet, but that they may fund later.

   A provider that returns no email gets a wallet and no account: the session still works
   (Pollar signs for it), the gateway features stay off, and nothing is invented. What the
   email is never proof of is the Stellar address: that key lives in Pollar's KMS, and
   nobody here or in the wallet can sign with it. */
import { createHash, randomBytes, randomInt } from "node:crypto";
import { BETTER_AUTH_SECRET } from "astro:env/server";
import { prisma } from "@/lib/prisma";
import { isMailConfigured, sendMail } from "@/lib/mailer";
import { renderWalletLinkCodeEmail } from "@/lib/emails";
import { openJson, sealJson } from "@/lib/sealed-box";
import { provisionWalletAccount, type WalletKeys } from "@/lib/wallet-provisioning";
import { cosmosPollar, type CosmosEnv, type PollarSession } from "@/lib/cosmos";
// The in-process first line, shared with the other unauthenticated route
// (wallet telemetry) rather than copied into it. See @/lib/rate-limit.
import { withinBudget } from "@/lib/rate-limit";

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

/* Per-address budgets, in a ten-minute window. `authorize` is the tight one because each
   handshake it opens can end in a funded Stellar account paid for by the operator; `poll`
   is loose because a wallet legitimately polls every couple of seconds while someone reads
   a consent screen; `claim` sits between them — it creates nothing the handshake did not
   already allow, but a first login is documented to retry the same code while Pollar
   provisions the wallet. */
const WINDOW_MS = 10 * 60 * 1000;
const SOCIAL_AUTHORIZE_RATE_LIMIT = { limit: 10, windowMs: WINDOW_MS };
const SOCIAL_POLL_RATE_LIMIT = { limit: 400, windowMs: WINDOW_MS };
const SOCIAL_CLAIM_RATE_LIMIT = { limit: 30, windowMs: WINDOW_MS };

/* And the same budgets again for ALL callers together.
   The per-address key is only as honest as the address, and the address on these routes
   comes from a proxy header the caller can write. That is fine for telling one ordinary
   user apart from another, and worth nothing against someone rotating the header — who
   would otherwise walk through the per-address limit AND the upstream one, since we
   forward the same value there. The global bucket is the one that cannot be rotated
   past: it bounds what the whole route can cost the operator in ten minutes, which for
   `authorize` is XLM. Sized so an honest peak is nowhere near it. */
const SOCIAL_AUTHORIZE_GLOBAL_LIMIT = { limit: 300, windowMs: WINDOW_MS };
const SOCIAL_POLL_GLOBAL_LIMIT = { limit: 20_000, windowMs: WINDOW_MS };
const SOCIAL_CLAIM_GLOBAL_LIMIT = { limit: 600, windowMs: WINDOW_MS };

/* The emailed proof an existing account's login waits on. Same code shape, lifetime and
   attempt cap as the wallet link flow, so a person meets one rule for "enter the code we
   emailed you" whichever door they came in by. */
const SOCIAL_PROOF_TTL_MS = 15 * 60 * 1000;
const SOCIAL_PROOF_MAX_ATTEMPTS = 5;
const SOCIAL_VERIFY_RATE_LIMIT = { limit: 30, windowMs: WINDOW_MS };
const SOCIAL_VERIFY_GLOBAL_LIMIT = { limit: 600, windowMs: WINDOW_MS };
/* Part of the sealing key's derivation, so a box sealed here opens nowhere else. */
const HELD_LOGIN_PURPOSE = "social-login-held-session";

export type SocialAuthorizeResult =
  | { status: "opened"; state: string; authorizationUrl: string; provider: string; expiresAt?: string }
  | { status: "rate_limited" }
  | { status: "unavailable"; message: string };

export type SocialStatusResult =
  | { status: "ok"; session: { status: string; state: string; code?: string; error_code?: string | null } }
  | { status: "rate_limited" }
  | { status: "unavailable"; message: string };

/** What the wallet gets back once the code is redeemed. `keys` is null when the
 *  provider gave us no email to attach an account to. */
export type SocialClaimResult =
  | {
      status: "ready";
      session: PollarSession;
      account: "created" | "linked" | "none";
      organizationId: string | null;
      keys: WalletKeys | null;
      activated: boolean;
      activationAmount: string | null;
    }
  | {
      /* The email already has an account: nothing is handed over until the code sent to it
         is entered. `claimToken` is what the wallet presents with that code. */
      status: "verify_email";
      claimToken: string;
      expiresInSeconds: number;
      activated: boolean;
      activationAmount: string | null;
    }
  | { status: "no_wallet" }
  | { status: "rate_limited" }
  | { status: "unavailable"; message: string };

export type SocialVerifyResult =
  | Extract<SocialClaimResult, { status: "ready" }>
  | { status: "invalid"; attemptsLeft: number }
  | { status: "expired" }
  | { status: "locked" }
  | { status: "rate_limited" };

/** What a held login keeps, sealed, while the emailed code is outstanding. */
interface HeldLogin {
  session: PollarSession;
  activated: boolean;
  activationAmount: string | null;
}

/** Open a handshake and return the URL to send the user to. */
export async function startSocialLogin(input: {
  env: CosmosEnv;
  provider: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  deviceLabel?: string;
  clientIp: string;
}): Promise<SocialAuthorizeResult> {
  if (!withinBudget("authorize", input.clientIp, SOCIAL_AUTHORIZE_RATE_LIMIT, SOCIAL_AUTHORIZE_GLOBAL_LIMIT)) return { status: "rate_limited" };

  try {
    const authorization = await cosmosPollar.authorize(
      input.env,
      {
        provider: input.provider,
        code_challenge: input.codeChallenge,
        code_challenge_method: input.codeChallengeMethod,
        ...(input.deviceLabel ? { device_label: input.deviceLabel } : {}),
      },
      input.clientIp,
    );
    return {
      status: "opened",
      state: authorization.state,
      authorizationUrl: authorization.authorization_url,
      provider: authorization.provider,
      expiresAt: authorization.expires_at,
    };
  } catch (err) {
    return { status: "unavailable", message: messageOf(err, "Could not start the social login") };
  }
}

/** Poll one handshake. Only `authorized` carries a code, and each poll retires the last. */
export async function pollSocialLogin(input: {
  env: CosmosEnv;
  state: string;
  clientIp: string;
}): Promise<SocialStatusResult> {
  if (!withinBudget("poll", input.clientIp, SOCIAL_POLL_RATE_LIMIT, SOCIAL_POLL_GLOBAL_LIMIT)) return { status: "rate_limited" };

  try {
    const session = await cosmosPollar.sessionStatus(input.env, input.state, input.clientIp);
    return { status: "ok", session };
  } catch (err) {
    return { status: "unavailable", message: messageOf(err, "Could not read the login status") };
  }
}

/**
 * Redeem the code, then give the person an account to go with the wallet — at once for a
 * new email, and only after the emailed code for one that already has an account.
 *
 * The order is deliberate. Redemption first, because everything after it depends on who
 * the provider says this is; activation next, because a deferred Pollar wallet is an
 * address with no on-chain account and the wallet would otherwise show a receive QR
 * nobody can pay; the account last, because it is the only part that can be retried
 * later (the code cannot — it is spent).
 *
 * Activation and account provisioning are both best-effort for that reason: neither
 * failure is allowed to turn a completed login into an error, because the login cannot
 * be repeated with the same code and the session in hand is worth more than the retry.
 */
export async function completeSocialLogin(input: {
  env: CosmosEnv;
  code: string;
  codeVerifier: string;
  name?: string;
  clientIp: string;
}): Promise<SocialClaimResult> {
  if (!withinBudget("claim", input.clientIp, SOCIAL_CLAIM_RATE_LIMIT, SOCIAL_CLAIM_GLOBAL_LIMIT)) return { status: "rate_limited" };

  let session: PollarSession;
  try {
    session = await cosmosPollar.exchange(
      input.env,
      { code: input.code, code_verifier: input.codeVerifier },
      input.clientIp,
    );
  } catch (err) {
    return { status: "unavailable", message: messageOf(err, "Could not complete the social login") };
  }

  const address = session.wallet?.address ?? null;
  if (!address) return { status: "no_wallet" };

  let activated = false;
  let activationAmount: string | null = null;
  if (session.wallet.exists_on_stellar === false) {
    const activation = await cosmosPollar.activate(input.env, address, input.clientIp).catch(() => null);
    if (activation) {
      activated = activation.activated;
      activationAmount = activation.amount;
    }
  }

  const email = session.profile?.email?.trim().toLowerCase() || null;
  if (!email) {
    return {
      status: "ready",
      session,
      account: "none",
      organizationId: null,
      keys: null,
      activated,
      activationAmount,
    };
  }

  // An email that already has an account is where a phished login does its damage, so it
  // gets nothing until that account's inbox answers. A lookup that fails is treated the
  // same way rather than as "no account": the safe failure is a login to retry, not a
  // session handed over unproven.
  let existing: { id: string; name: string | null } | null;
  try {
    existing = await prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      select: { id: true, name: true },
    });
  } catch {
    await revokeQuietly(input.env, session, input.clientIp);
    return { status: "unavailable", message: "Could not complete the social login" };
  }
  if (existing) {
    return holdForEmailProof({
      env: input.env,
      email,
      userId: existing.id,
      name: existing.name || displayName(session, input.name, email),
      stellarAddress: address,
      held: { session, activated, activationAmount },
      clientIp: input.clientIp,
    });
  }

  const provisioned = await provisionSocialAccount({
    email,
    name: displayName(session, input.name, email),
    stellarAddress: address,
  }).catch(() => null);

  return {
    status: "ready",
    session,
    account: provisioned?.account ?? "none",
    organizationId: provisioned?.organizationId ?? null,
    keys: provisioned?.keys ?? null,
    activated,
    activationAmount,
  };
}

/**
 * Finish a login held for an emailed code: the code proves the account's inbox, and only
 * then do the session and the account's keys leave this platform.
 *
 * The row is claimed before anything is opened or minted, and the claim is a compare-and-
 * swap on `pending`, so two requests racing the same correct code cannot both receive the
 * session. Every way out — claimed, locked, expired — clears the sealed session, because a
 * box nobody will open is still a credential sitting in a table.
 */
export async function verifySocialLogin(input: {
  claimToken: string;
  code: string;
  clientIp: string;
}): Promise<SocialVerifyResult> {
  if (!withinBudget("verify", input.clientIp, SOCIAL_VERIFY_RATE_LIMIT, SOCIAL_VERIFY_GLOBAL_LIMIT)) return { status: "rate_limited" };

  const reg = await prisma.walletRegistration
    .findFirst({ where: { claimHash: sha256(input.claimToken), kind: "social-link" } })
    .catch(() => null);
  if (!reg || reg.status !== "pending" || !reg.userId || !reg.sealedPayload) return { status: "expired" };
  if (reg.expiresAt.getTime() < Date.now()) {
    await discardHeldLogin(reg.id, "expired");
    return { status: "expired" };
  }

  if (!reg.codeHash || sha256(input.code) !== reg.codeHash) {
    const attempts = reg.attempts + 1;
    if (attempts >= SOCIAL_PROOF_MAX_ATTEMPTS) {
      await discardHeldLogin(reg.id, "locked", attempts);
      return { status: "locked" };
    }
    await prisma.walletRegistration.update({ where: { id: reg.id }, data: { attempts } }).catch(() => null);
    return { status: "invalid", attemptsLeft: SOCIAL_PROOF_MAX_ATTEMPTS - attempts };
  }

  const claimed = await prisma.walletRegistration
    .updateMany({ where: { id: reg.id, status: "pending" }, data: { status: "claimed", sealedPayload: null } })
    .catch(() => ({ count: 0 }));
  if (claimed.count === 0) return { status: "expired" };

  const held = openJson<HeldLogin>(reg.sealedPayload, BETTER_AUTH_SECRET, HELD_LOGIN_PURPOSE);
  if (!held) return { status: "expired" };

  const provisioned = await provisionSocialAccount({
    email: reg.email,
    name: reg.name || reg.email.split("@")[0] || "Cosmos user",
    stellarAddress: reg.stellarAddress,
  }).catch(() => null);

  return {
    status: "ready",
    session: held.session,
    account: provisioned?.account ?? "none",
    organizationId: provisioned?.organizationId ?? null,
    keys: provisioned?.keys ?? null,
    activated: held.activated,
    activationAmount: held.activationAmount,
  };
}

/* Seal the session, email the code, and tell the wallet to ask for it. */
async function holdForEmailProof(input: {
  env: CosmosEnv;
  email: string;
  userId: string;
  name: string;
  stellarAddress: string;
  held: HeldLogin;
  clientIp: string;
}): Promise<SocialClaimResult> {
  const unsent = "This email already has a CosmosPay account, and the code that proves it could not be sent.";

  // No mail means no proof, and no proof means no hand-over: the login is refused rather
  // than linked on the provider's word.
  if (!isMailConfigured()) {
    await revokeQuietly(input.env, input.held.session, input.clientIp);
    return { status: "unavailable", message: unsent };
  }

  const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
  const claimToken = randomBytes(32).toString("hex");
  let rowId: string;
  try {
    const row = await prisma.walletRegistration.create({
      data: {
        email: input.email,
        name: input.name,
        stellarAddress: input.stellarAddress,
        // Required and unique, and unused by this flow: the proof is the code.
        verifyToken: randomBytes(32).toString("hex"),
        claimHash: sha256(claimToken),
        codeHash: sha256(code),
        kind: "social-link",
        status: "pending",
        userId: input.userId,
        environment: input.env,
        sealedPayload: sealJson(input.held, BETTER_AUTH_SECRET, HELD_LOGIN_PURPOSE),
        expiresAt: new Date(Date.now() + SOCIAL_PROOF_TTL_MS),
      },
      select: { id: true },
    });
    rowId = row.id;
  } catch {
    await revokeQuietly(input.env, input.held.session, input.clientIp);
    return { status: "unavailable", message: "Could not complete the social login" };
  }

  try {
    const msg = renderWalletLinkCodeEmail({ name: input.name, code, minutes: Math.floor(SOCIAL_PROOF_TTL_MS / 60000) });
    await sendMail({ to: input.email, subject: msg.subject, html: msg.html, text: msg.text });
  } catch {
    await discardHeldLogin(rowId, "expired");
    await revokeQuietly(input.env, input.held.session, input.clientIp);
    return { status: "unavailable", message: unsent };
  }

  return {
    status: "verify_email",
    claimToken,
    expiresInSeconds: Math.floor(SOCIAL_PROOF_TTL_MS / 1000),
    activated: input.held.activated,
    activationAmount: input.held.activationAmount,
  };
}

/* Close a held login for good, and drop the sealed session with it. */
async function discardHeldLogin(id: string, status: "expired" | "locked", attempts?: number): Promise<void> {
  await prisma.walletRegistration
    .updateMany({
      where: { id, status: "pending" },
      data: { status, sealedPayload: null, ...(attempts !== undefined ? { attempts } : {}) },
    })
    .catch(() => null);
}

/* Revoke a session this platform will not hand on. Best-effort: it never left this process. */
async function revokeQuietly(env: CosmosEnv, session: PollarSession, clientIp: string): Promise<void> {
  await cosmosPollar.logout(env, session.access_token, clientIp).catch(() => null);
}

/* The shared account step, with this flow's own label on the row it records. */
async function provisionSocialAccount(input: { email: string; name: string; stellarAddress: string }) {
  return provisionWalletAccount({ ...input, kind: "social", provisionedBy: "wallet-social" });
}

function displayName(session: PollarSession, fallback: string | undefined, email: string): string {
  const fromProfile = [session.profile?.first_name, session.profile?.last_name].filter(Boolean).join(" ").trim();
  return fromProfile || fallback?.trim() || email.split("@")[0] || "Cosmos user";
}

function messageOf(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}
