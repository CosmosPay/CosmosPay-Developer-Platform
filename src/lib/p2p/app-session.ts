/* app-session.ts: how the public P2P app (payments.cosmospay.lat/p2p) knows which wallet it is
   talking to. Its server route (src/pages/payments/p2p/api/[...path].ts) holds Cosmos Pay's own
   integrator API key and never hands it to the browser; each visitor is bound to the EVM wallet
   they prove they hold:

   1. The browser asks for a challenge for an address. The server keeps it (single use, five
      minutes, bound to the address, this host and the environment) and answers its text.
   2. The wallet signs that text with EIP-191 (`personal_sign`). The server consumes the challenge
      (a second use, a replay, finds nothing), recovers the signer and compares it to the address.
   3. The answer is a cookie carrying `{address, env, exp}` signed with HMAC-SHA256
      (P2P_APP_SESSION_SECRET): HttpOnly, SameSite=Strict, host-only, Path=/p2p, Secure on https,
      twelve hours. Every later call reads the wallet from it and nowhere else.

   No key or key material is stored: the challenge is a random nonce, the cookie a signed claim.
   Pure but for node:crypto (tests/unit/p2pAppSession.test.ts). */
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { recoverEvmSigner } from "@/lib/org-wallets-verify";

export type AppEnv = "dev" | "prod";

export const APP_COOKIE = "cosmospay-p2p";
export const APP_COOKIE_PATH = "/p2p";
export const CHALLENGE_TTL_MS = 5 * 60_000;
export const SESSION_TTL_MS = 12 * 60 * 60_000;
/* Open challenges one address may hold (the oldest goes first), and in all. */
const PER_ADDRESS = 5;
const MAX_OPEN = 10_000;

const EVM = /^0x[0-9a-fA-F]{40}$/;
const SIGNATURE = /^0x[0-9a-fA-F]{130}$/;

export const isEvmAddress = (v: unknown): v is string => typeof v === "string" && EVM.test(v);

/** The environment an integrator key works in: a sandbox key starts with `dv_`. */
export function envFromKey(apiKey: string): AppEnv {
  return apiKey.trim().startsWith("dv_") ? "dev" : "prod";
}

export interface Challenge {
  id: string;
  address: string;
  host: string;
  env: AppEnv;
  message: string;
  expiresAt: number;
}

/** The text the wallet signs: who asks, for which wallet, where and until when. It moves nothing. */
export function challengeMessage(c: { address: string; host: string; env: AppEnv; nonce: string; issuedAt: number; expiresAt: number }): string {
  return [
    "Cosmos Pay P2P: sign in with this wallet.",
    "",
    "This signature proves you hold the wallet. It moves no funds and costs nothing.",
    "",
    `Wallet: ${c.address}`,
    `Site: ${c.host}`,
    `Network: ${c.env === "prod" ? "mainnet" : "testnet"}`,
    `Nonce: ${c.nonce}`,
    `Issued: ${new Date(c.issuedAt).toISOString()}`,
    `Expires: ${new Date(c.expiresAt).toISOString()}`,
  ].join("\n");
}

/** The open challenges, in memory: a restart forgets them (the browser asks again). */
export class ChallengeStore {
  private open = new Map<string, Challenge>();

  issue(address: string, host: string, env: AppEnv, now = Date.now()): Challenge {
    this.sweep(now);
    const mine = [...this.open.values()].filter((c) => c.address === address.toLowerCase()).sort((a, b) => a.expiresAt - b.expiresAt);
    for (const old of mine.slice(0, Math.max(0, mine.length - PER_ADDRESS + 1))) this.open.delete(old.id);
    if (this.open.size >= MAX_OPEN) {
      const oldest = this.open.keys().next().value;
      if (oldest) this.open.delete(oldest);
    }
    const id = randomBytes(16).toString("hex");
    const expiresAt = now + CHALLENGE_TTL_MS;
    const c: Challenge = {
      id,
      address: address.toLowerCase(),
      host,
      env,
      expiresAt,
      message: challengeMessage({ address, host, env, nonce: randomBytes(16).toString("hex"), issuedAt: now, expiresAt }),
    };
    this.open.set(id, c);
    return c;
  }

  /** The challenge, removed whatever happens next (used once), or null when unknown or expired. */
  consume(id: unknown, now = Date.now()): Challenge | null {
    if (typeof id !== "string") return null;
    const c = this.open.get(id) ?? null;
    this.open.delete(id);
    return c && c.expiresAt > now ? c : null;
  }

  size(): number {
    return this.open.size;
  }

  private sweep(now: number) {
    for (const [id, c] of this.open) if (c.expiresAt <= now) this.open.delete(id);
  }
}

/** Whether `signature` is the challenge's wallet signing its text (EIP-191). `trustAny` is mock
    mode only: a well-formed signature is taken without checking it, as for every wallet proof there. */
export function verifyChallenge(c: Challenge, signature: unknown, trustAny = false): boolean {
  if (typeof signature !== "string" || !SIGNATURE.test(signature)) return false;
  if (trustAny) return true;
  return recoverEvmSigner(c.message, signature) === c.address;
}

export interface AppSession {
  address: string;
  env: AppEnv;
  /* Unix milliseconds. */
  exp: number;
}

const b64url = (buf: Buffer) => buf.toString("base64url");
const mac = (secret: string, payload: string) => createHmac("sha256", secret).update(`p2p-app-session.v1.${payload}`).digest();

/** The cookie's value: the claim and its HMAC. */
export function signSession(secret: string, s: AppSession): string {
  if (!secret) throw new Error("A session secret is required");
  const payload = b64url(Buffer.from(JSON.stringify({ a: s.address.toLowerCase(), e: s.env, x: s.exp })));
  return `${payload}.${b64url(mac(secret, payload))}`;
}

/** The session a cookie value carries, or null when it is not ours, was changed or expired, or
    is for another environment than `env` (when given). */
export function readSession(secret: string, token: string | null | undefined, now = Date.now(), env?: AppEnv): AppSession | null {
  if (!secret || typeof token !== "string" || token.length > 512) return null;
  const [payload, sig, extra] = token.split(".");
  if (!payload || !sig || extra !== undefined) return null;
  const want = mac(secret, payload);
  let got: Buffer;
  try {
    got = Buffer.from(sig, "base64url");
  } catch {
    return null;
  }
  if (got.length !== want.length || !timingSafeEqual(got, want)) return null;
  let claim: { a?: unknown; e?: unknown; x?: unknown };
  try {
    claim = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (!isEvmAddress(claim.a) || (claim.e !== "dev" && claim.e !== "prod") || typeof claim.x !== "number") return null;
  if (claim.x <= now) return null;
  if (env && claim.e !== env) return null;
  return { address: claim.a.toLowerCase(), env: claim.e, exp: claim.x };
}

/** The Set-Cookie header for a session (or, with an empty value, its removal). */
export function sessionCookie(value: string, opts: { secure: boolean; maxAgeSeconds: number }): string {
  return [
    `${APP_COOKIE}=${value}`,
    `Path=${APP_COOKIE_PATH}`,
    `Max-Age=${Math.max(0, Math.floor(opts.maxAgeSeconds))}`,
    "HttpOnly",
    "SameSite=Strict",
    ...(opts.secure ? ["Secure"] : []),
  ].join("; ");
}

export const clearSessionCookie = (secure: boolean) => sessionCookie("", { secure, maxAgeSeconds: 0 });

/** One cookie's value from a Cookie header. */
export function cookieValue(header: string | null | undefined, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(";")) {
    const at = part.indexOf("=");
    if (at < 0) continue;
    if (part.slice(0, at).trim() === name) return part.slice(at + 1).trim() || null;
  }
  return null;
}
