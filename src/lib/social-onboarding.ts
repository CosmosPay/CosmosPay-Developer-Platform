/* social-onboarding.ts — sign in with Google or GitHub, and come out the other side
   with a Stellar wallet AND a CosmosPay account.

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

   ## Trusting the email

   An account is created (or linked) for the email the provider reports. That email is
   verified by Google or GitHub, which is the same fact the existing link flow proves with
   a six-digit code to the same inbox — so linking on it is not a weaker claim than the
   flow already shipped. What it is NOT is proof of anything about the Stellar address:
   that key lives in Pollar's KMS, and nobody here or in the wallet can sign with it.
   A provider that returns no email gets a wallet and no account: the session still works
   (Pollar signs for it), the gateway features stay off, and nothing is invented. */
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { createOrg, ensureDefaultOrg, listForUser } from "@/lib/organizations";
import { createConsumer } from "@/utils/apisix";
import { provisionAuthentikIdentity } from "@/lib/authentik";
import { mintWalletKeys, type WalletKeys } from "@/lib/wallet-provisioning";
import { cosmosPollar, type CosmosEnv, type PollarSession } from "@/lib/cosmos";

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

/* ── Rate limiting ──────────────────────────────────────────────────────────────
   Per process and per address, in memory. It is the FIRST line, not the durable one:
   the Payments service counts the same calls in Postgres (and we forward the end
   user's address so those budgets partition per user rather than pooling on this
   server's IP). What this adds is refusing an obvious flood before it costs an
   upstream round trip, and it is deliberately cheap enough to be always on.

   A restart forgets the counters, and two replicas count separately. Both are fine
   for a first line; neither would be fine as the only one, which is why it is not. */
const hits = new Map<string, number[]>();

function allow(bucket: string, address: string, policy: { limit: number; windowMs: number }): boolean {
  const key = `${bucket}:${address}`;
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < policy.windowMs);
  if (recent.length >= policy.limit) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  // Bound the map: a long-lived process would otherwise keep one array per address
  // that ever called, forever.
  if (hits.size > 10_000) {
    for (const [k, times] of hits) {
      if (times.every((t) => now - t >= policy.windowMs)) hits.delete(k);
    }
  }
  return true;
}

/* Both keys have to admit the call: the caller's address, and everyone together. */
function withinBudget(
  bucket: string,
  address: string,
  perAddress: { limit: number; windowMs: number },
  global: { limit: number; windowMs: number },
): boolean {
  return allow(bucket, address, perAddress) && allow(bucket, "*", global);
}

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
  | { status: "no_wallet" }
  | { status: "rate_limited" }
  | { status: "unavailable"; message: string };

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
 * Redeem the code, then give the person an account to go with the wallet.
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

/* Create the account, or attach to the one this email already has, and mint the wallet's
   key pair either way. Mirrors confirmWalletRegistration + verifyWalletLink, minus the
   parts that only existed to prove the email — the provider did that. */
async function provisionSocialAccount(input: {
  email: string;
  name: string;
  stellarAddress: string;
}): Promise<{ account: "created" | "linked"; organizationId: string; keys: WalletKeys }> {
  const existing = await prisma.user
    .findFirst({ where: { email: { equals: input.email, mode: "insensitive" } }, select: { id: true } })
    .catch(() => null);

  const userId = existing?.id ?? randomUUID();
  const account: "created" | "linked" = existing ? "linked" : "created";

  if (!existing) {
    // emailVerified: the provider is the one asserting it, and that assertion is the
    // whole basis of this flow.
    await prisma.user.create({ data: { id: userId, email: input.email, name: input.name, emailVerified: true } });
    await prisma.profile.create({ data: { userId, plan: "community" } }).catch(() => null);
  }

  let organizationId: string;
  if (existing) {
    const orgs = await listForUser(userId).catch(() => []);
    let org = orgs.find((o) => o.role === "owner") ?? orgs[0];
    if (!org) org = (await ensureDefaultOrg(userId, input.name).catch(() => []))[0];
    organizationId = org?.id ?? "";
  } else {
    const created = await createOrg(userId, `${input.name}'s organization`, true, {
      provisionedBy: "wallet-social",
      stellarAddress: input.stellarAddress,
    });
    organizationId = created.org?.id ?? "";
  }

  await createConsumer(userId).catch(() => null);
  const minted = await mintWalletKeys(userId, organizationId);
  if (!minted.dev && !minted.prod) throw new Error("Failed to mint social-login API keys");

  // Recorded as a wallet-provisioned registration so the dashboard treats this account
  // like the other wallet ones: no additional keys, rotate the existing pair instead.
  // Already "claimed" — the keys went back in this response, there is nothing to collect.
  await prisma.walletRegistration
    .create({
      data: {
        email: input.email,
        name: input.name,
        stellarAddress: input.stellarAddress,
        // Required and unique, and unused by this flow: there is no email to send.
        verifyToken: randomBytes(32).toString("hex"),
        claimHash: sha256(randomBytes(32).toString("hex")),
        kind: "social",
        status: "claimed",
        userId,
        organizationId,
        credentialId: minted.ids.join(","),
        environment: "both",
        expiresAt: new Date(),
      },
    })
    .catch(() => null);

  if (!existing) {
    // So they can also sign in at auth.cosmospay.lat. Best-effort, exactly as the
    // email-link flow treats it.
    await provisionAuthentikIdentity({ email: input.email, name: input.name }).catch(() => null);
  }

  return { account, organizationId, keys: { dev: minted.dev, prod: minted.prod } };
}

function displayName(session: PollarSession, fallback: string | undefined, email: string): string {
  const fromProfile = [session.profile?.first_name, session.profile?.last_name].filter(Boolean).join(" ").trim();
  return fromProfile || fallback?.trim() || email.split("@")[0] || "Cosmos user";
}

function messageOf(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}
