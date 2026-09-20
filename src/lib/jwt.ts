/* jwt.ts — the small JWT this platform issues and verifies for itself (SEP-10 and the
   recovery servers), with node:crypto and no dependency.

   HS256 only. Not a general implementation and deliberately not one: it refuses any other
   `alg` outright, which is the whole of the "alg: none" and "alg swapped to HS256 against an
   RSA public key" family of bugs. It verifies before it parses anything it will act on, and
   it compares the signature in constant time.

   The key is derived per PURPOSE from the platform secret (HKDF, as sealed-box.ts does), so
   a token minted for one audience cannot be presented to another — which is what keeps the
   two recovery servers apart from each other. */
import { createHmac, hkdfSync, timingSafeEqual } from "node:crypto";

const b64url = (b: Buffer) => b.toString("base64url");
const json = (v: unknown) => Buffer.from(JSON.stringify(v), "utf8");

export interface JwtClaims {
  /** Who the token is about: a Stellar address (SEP-10) or an identity ("email:ada@x.y"). */
  sub: string;
  /** Which server it is for. A token is only valid at the audience it names. */
  aud: string;
  iss: string;
  iat: number;
  exp: number;
  /** Free-form extras a caller wants back, e.g. the home domain a challenge was for. */
  [claim: string]: unknown;
}

function keyFor(secret: string, purpose: string): Buffer {
  if (!secret) throw new Error("jwt: a non-empty secret is required");
  return Buffer.from(hkdfSync("sha256", secret, "cosmos-jwt", purpose, 32));
}

function sign(input: string, key: Buffer): Buffer {
  return createHmac("sha256", key).update(input).digest();
}

/** Mint a token. `purpose` is part of the key derivation, never part of the token. */
export function issueJwt(claims: JwtClaims, secret: string, purpose: string): string {
  const head = b64url(json({ alg: "HS256", typ: "JWT" }));
  const body = b64url(json(claims));
  return `${head}.${body}.${b64url(sign(`${head}.${body}`, keyFor(secret, purpose)))}`;
}

/**
 * The claims a token carries, or null for anything that is not a live token minted here for
 * this purpose: a wrong algorithm, a wrong key, a tampered body, an expired one.
 */
export function readJwt(token: string, secret: string, purpose: string, now = Date.now()): JwtClaims | null {
  try {
    const [head, body, sig, extra] = token.split(".");
    if (!head || !body || !sig || extra !== undefined) return null;
    const alg = (JSON.parse(Buffer.from(head, "base64url").toString("utf8")) as { alg?: unknown }).alg;
    if (alg !== "HS256") return null;
    const want = sign(`${head}.${body}`, keyFor(secret, purpose));
    const got = Buffer.from(sig, "base64url");
    if (got.length !== want.length || !timingSafeEqual(got, want)) return null;
    const claims = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as JwtClaims;
    if (typeof claims?.sub !== "string" || typeof claims.exp !== "number") return null;
    if (claims.exp * 1000 < now) return null;
    return claims;
  } catch {
    return null;
  }
}
