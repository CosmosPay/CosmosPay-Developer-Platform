/* wallet-auth-core.ts — the rules of the wallet's own sign-in, with nothing but node:*.

   Everything here decides something: whether a PKCE verifier matches, which email a
   provider actually verified, whether a session token is still good, whether a backup box
   is one the wallet could have produced, what exactly a signature has to cover. None of it
   touches the database or `astro:env`, so tests/unit/walletAuthCore.test.ts reaches all of
   it — the route handlers and src/lib/wallet-auth.ts only wire it to storage and the
   network. */
import { createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { openJson, sealJson } from "@/lib/sealed-box";

export const WALLET_AUTH_PROVIDERS = ["google", "github"] as const;
export type WalletAuthProvider = (typeof WALLET_AUTH_PROVIDERS)[number];

/** How a person proved who they are. `email` is a code typed from their inbox. */
export type WalletAuthMethod = WalletAuthProvider | "email";

/* ------------------------------- lifetimes -------------------------------- */

/** A handshake is a person reading a consent screen: minutes, not hours. */
export const HANDSHAKE_TTL_MS = 10 * 60 * 1000;
/** An emailed code. Same lifetime and attempt cap as the older wallet link flow, so a
    person meets one rule for "enter the code we emailed you" whichever door they used. */
export const LOGIN_CODE_TTL_MS = 15 * 60 * 1000;
export const LOGIN_CODE_MAX_ATTEMPTS = 5;
/** One code per address per minute: the email route is the one that can spam a stranger. */
export const LOGIN_CODE_RESEND_MS = 60 * 1000;
/**
 * What a sign-in buys: long enough to type a password and let PBKDF2 run on a slow phone,
 * short enough that a leaked token is stale before anyone finds it. It is the only
 * credential that can create an account or put a backup under an account, so it is not
 * refreshed — a person who takes longer signs in again.
 */
export const SESSION_TTL_MS = 30 * 60 * 1000;
/** How far a signed timestamp may sit from this server's clock. Phones are not NTP. */
export const SIGNED_AT_SKEW_MS = 10 * 60 * 1000;

/* --------------------------------- tokens --------------------------------- */

export const sha256Hex = (s: string): string => createHash("sha256").update(s).digest("hex");

/** An opaque, URL-safe random token. 32 bytes: nobody guesses it, nobody brute-forces it. */
export function randomToken(): string {
  return randomBytes(32).toString("base64url");
}

/** A uniform six-digit code (never Math.random). */
export function sixDigitCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

/* ---------------------------------- PKCE ---------------------------------- */

/**
 * RFC 7636 S256: does `verifier` hash to `challenge`?
 *
 * The verifier is the whole credential of the provider flow. The `state` travels through a
 * browser and anyone who sees it can poll; only the wallet that opened the handshake holds
 * the verifier. Compared in constant time for the usual reason, even though the challenge
 * is not secret: there is no cost to doing it right.
 */
export function pkceMatches(verifier: string, challenge: string): boolean {
  const got = Buffer.from(createHash("sha256").update(verifier, "ascii").digest("base64url"));
  const want = Buffer.from(challenge);
  return got.length === want.length && timingSafeEqual(got, want);
}

/* ------------------------------- providers -------------------------------- */

export interface ProviderEndpoints {
  authorize: string;
  token: string;
  scope: string;
}

export const PROVIDER_ENDPOINTS: Record<WalletAuthProvider, ProviderEndpoints> = {
  google: {
    authorize: "https://accounts.google.com/o/oauth2/v2/auth",
    token: "https://oauth2.googleapis.com/token",
    scope: "openid email profile",
  },
  github: {
    authorize: "https://github.com/login/oauth/authorize",
    token: "https://github.com/login/oauth/access_token",
    // `user:email` is what exposes the VERIFIED flag; the public profile email has none.
    scope: "read:user user:email",
  },
};

/** Where a provider sends the person back. Registered with each provider as-is. */
export function callbackUrl(baseUrl: string, provider: WalletAuthProvider): string {
  return `${baseUrl.replace(/\/+$/, "")}/api/wallet/auth/oauth/callback/${provider}`;
}

/** The URL the wallet opens in a browser. */
export function authorizationUrl(
  provider: WalletAuthProvider,
  input: { clientId: string; redirectUri: string; state: string },
): string {
  const ep = PROVIDER_ENDPOINTS[provider];
  const q = new URLSearchParams({
    client_id: input.clientId,
    redirect_uri: input.redirectUri,
    response_type: "code",
    scope: ep.scope,
    state: input.state,
  });
  // Google: always show the account picker. Signing in to a WALLET with whichever Google
  // account the browser happened to have open is how someone creates a second wallet
  // under the wrong email without ever being asked which one they meant.
  if (provider === "google") q.set("prompt", "select_account");
  if (provider === "github") q.set("allow_signup", "true");
  return `${ep.authorize}?${q.toString()}`;
}

/** Who the provider says this is — only ever with an email it has VERIFIED. */
export interface ProviderIdentity {
  email: string;
  name: string | null;
  avatar: string | null;
  subject: string;
}

export type IdentityResult = { ok: true; identity: ProviderIdentity } | { ok: false; error: "email_unverified" | "profile_invalid" };

const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);
const httpsUrl = (v: unknown): string | null => {
  const s = str(v);
  if (!s) return null;
  try {
    return new URL(s).protocol === "https:" ? s : null;
  } catch {
    return null;
  }
};

/**
 * Google's OIDC userinfo, reduced to what the wallet may trust.
 *
 * `email_verified` has to be literally `true`. A Google Workspace domain can hand out
 * addresses nobody has confirmed, and an account is looked up BY EMAIL here — an
 * unverified one would be a way to sign in as someone else's existing account.
 */
export function googleIdentity(userinfo: unknown): IdentityResult {
  const u = (userinfo ?? {}) as Record<string, unknown>;
  const email = str(u.email)?.toLowerCase() ?? null;
  const subject = str(u.sub);
  if (!email || !subject) return { ok: false, error: "profile_invalid" };
  if (u.email_verified !== true) return { ok: false, error: "email_unverified" };
  return { ok: true, identity: { email, name: str(u.name), avatar: httpsUrl(u.picture), subject } };
}

/**
 * GitHub's user plus its email list, reduced the same way.
 *
 * The profile's own `email` field is whatever the person typed as public and carries no
 * verification at all, so it is never used. The primary address wins when it is verified;
 * otherwise the first verified one; otherwise there is no identity to sign in with.
 */
export function githubIdentity(user: unknown, emails: unknown): IdentityResult {
  const u = (user ?? {}) as Record<string, unknown>;
  const subject = typeof u.id === "number" || typeof u.id === "string" ? String(u.id) : null;
  if (!subject) return { ok: false, error: "profile_invalid" };
  const list = Array.isArray(emails) ? (emails as Record<string, unknown>[]) : [];
  const verified = list.filter((e) => e && e.verified === true && str(e.email));
  const chosen = verified.find((e) => e.primary === true) ?? verified[0];
  if (!chosen) return { ok: false, error: "email_unverified" };
  return {
    ok: true,
    identity: {
      email: (str(chosen.email) as string).toLowerCase(),
      name: str(u.name) ?? str(u.login),
      avatar: httpsUrl(u.avatar_url),
      subject,
    },
  };
}

/* ----------------------------- session token ------------------------------ */

/** What a completed sign-in is: an email proven one way or another. */
export interface WalletAuthIdentity {
  email: string;
  name: string | null;
  avatar: string | null;
  method: WalletAuthMethod;
}

interface SessionPayload extends WalletAuthIdentity {
  v: 1;
  exp: number;
}

/* Part of the sealing key's derivation, so no other sealed box opens as a session. */
const SESSION_PURPOSE = "wallet-auth-session";

/**
 * The token a sign-in hands the wallet. Stateless and sealed: AES-GCM under a key only this
 * server derives, so it cannot be forged or edited, and nothing about it sits in a table.
 * The cost of that is that it cannot be revoked — which is why it is short-lived and why
 * exactly one route accepts it: `finish`.
 */
export function issueSessionToken(identity: WalletAuthIdentity, secret: string, now = Date.now()): string {
  const payload: SessionPayload = { v: 1, ...identity, exp: now + SESSION_TTL_MS };
  return sealJson(payload, secret, SESSION_PURPOSE);
}

/** The identity a token carries, or null when it is forged, edited, malformed or stale. */
export function readSessionToken(token: string, secret: string, now = Date.now()): WalletAuthIdentity | null {
  const p = openJson<SessionPayload>(token, secret, SESSION_PURPOSE);
  if (!p || p.v !== 1 || typeof p.exp !== "number" || p.exp < now) return null;
  if (typeof p.email !== "string" || !p.email) return null;
  return { email: p.email, name: p.name ?? null, avatar: p.avatar ?? null, method: p.method };
}

/* ------------------------------- signatures ------------------------------- */

/**
 * The challenge the wallet signs to finish a sign-in: it binds the proven email to the
 * address whose key the device holds, at a moment. Must match the wallet byte for byte
 * (`finishMessage` in the wallet's lib/cosmosAuth.ts). A distinct first line from every
 * other message this platform verifies, so a signature made for one flow is worth
 * nothing in another.
 */
export function finishMessage(email: string, stellarAddress: string, signedAt: string): string {
  return (
    `Cosmos Pay Wallet sign-in\n` +
    `email: ${email.trim().toLowerCase()}\n` +
    `account: ${stellarAddress}\n` +
    `at: ${signedAt}`
  );
}

/**
 * The challenge for replacing a backup's box — what `changePassword` on the device sends.
 * It covers the box's hash, so a signature over one box cannot be replayed to store another.
 */
export function backupMessage(stellarAddress: string, box: string, signedAt: string): string {
  return (
    `Cosmos Pay Wallet backup\n` +
    `account: ${stellarAddress}\n` +
    `box: ${sha256Hex(box)}\n` +
    `at: ${signedAt}`
  );
}

/**
 * The challenge for asking the operator to sponsor an account's recovery signers
 * (src/pages/api/wallet/recovery/setup.ts). Its own line, like every other, so a signature
 * made for a sign-in cannot be spent on a sponsorship and the other way round.
 */
export function recoverySetupMessage(stellarAddress: string, signers: readonly string[], signedAt: string): string {
  return (
    `Cosmos Pay Wallet recovery setup\n` +
    `account: ${stellarAddress}\n` +
    `signers: ${[...signers].join(",")}\n` +
    `at: ${signedAt}`
  );
}

/** Is a signed ISO timestamp close enough to now to accept? */
export function signedAtFresh(signedAt: string, now = Date.now()): boolean {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/.test(signedAt)) return false;
  const t = Date.parse(signedAt);
  return Number.isFinite(t) && Math.abs(now - t) <= SIGNED_AT_SKEW_MS;
}

/* --------------------------------- backup --------------------------------- */

/** Larger than any box the wallet writes by an order of magnitude; smaller than abuse. */
export const BACKUP_BOX_MAX_CHARS = 8192;
/**
 * The floor on the box's own PBKDF2 cost.
 *
 * This server cannot open the box, but it does decide what it keeps, and a box is only as
 * strong as its derivation: whoever reads this table gets unlimited offline guesses. A
 * client that regressed to a cheap cost would otherwise be uploading something close to
 * plaintext with nothing to say so. The wallet seals backups well above this.
 */
export const BACKUP_MIN_ITERATIONS = 600_000;
export const BACKUP_MAX_ITERATIONS = 4_000_000;

const B64 = /^[A-Za-z0-9+/]+={0,2}$/;

/**
 * Is this a box the wallet could have produced? The wallet's sealed-box JSON — `v: 2`, a
 * salt, an IV, the ciphertext and the PBKDF2 cost — and nothing that would let it sit here
 * as something weaker. Structure only: whether it opens is a question for the password.
 */
export function isBackupBox(box: string): boolean {
  if (typeof box !== "string" || !box || box.length > BACKUP_BOX_MAX_CHARS) return false;
  let b: Record<string, unknown>;
  try {
    b = JSON.parse(box) as Record<string, unknown>;
  } catch {
    return false;
  }
  if (!b || typeof b !== "object" || Array.isArray(b)) return false;
  if (b.v !== 2) return false;
  for (const k of ["salt", "iv", "data"]) {
    if (typeof b[k] !== "string" || !B64.test(b[k] as string)) return false;
  }
  // 16-byte salt and 12-byte IV, as the wallet writes them.
  if (Buffer.from(b.salt as string, "base64").length < 16) return false;
  if (Buffer.from(b.iv as string, "base64").length !== 12) return false;
  const iter = b.iter;
  return Number.isInteger(iter) && (iter as number) >= BACKUP_MIN_ITERATIONS && (iter as number) <= BACKUP_MAX_ITERATIONS;
}

/** A display name when the provider gave none. */
export function fallbackName(email: string, name?: string | null): string {
  return name?.trim() || email.split("@")[0] || "Cosmos user";
}
