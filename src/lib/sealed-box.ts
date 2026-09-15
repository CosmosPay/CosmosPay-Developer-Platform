/* sealed-box.ts — seal a JSON value so the database holds something it cannot read.

   For state that has to survive between two requests and must not be readable by anyone
   holding a database dump. Today that is the Pollar session a social login earned while
   the person proves, with an emailed code, that the account's inbox is theirs (see
   social-onboarding.ts): a session is a bearer credential for a custodial wallet, so it is
   never written in the clear.

   AES-256-GCM under a key derived with HKDF from a server secret and a PURPOSE. The purpose
   is part of the derivation, so a box sealed for one use does not open as another; the GCM
   tag means a modified box fails to open instead of decrypting to something else.
   `openJson` returns null on every failure — a wrong key, a tampered or truncated box, a
   string that is not a box — because the caller's answer to all of them is the same: the
   held state is gone. */
import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";

const VERSION = "v1";
const IV_BYTES = 12;
const TAG_BYTES = 16;

function keyFor(secret: string, purpose: string): Buffer {
  if (!secret) throw new Error("sealed-box: a non-empty secret is required");
  return Buffer.from(hkdfSync("sha256", secret, "cosmos-sealed-box", purpose, 32));
}

export function sealJson(value: unknown, secret: string, purpose: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", keyFor(secret, purpose), iv, { authTagLength: TAG_BYTES });
  const body = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  return [VERSION, iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), body.toString("base64url")].join(".");
}

export function openJson<T>(sealed: string, secret: string, purpose: string): T | null {
  try {
    const [version, iv, tag, body, extra] = sealed.split(".");
    if (version !== VERSION || !iv || !tag || !body || extra !== undefined) return null;
    const tagBytes = Buffer.from(tag, "base64url");
    // A short tag is a weaker check, not a different encoding: refuse it outright.
    if (tagBytes.length !== TAG_BYTES) return null;
    const decipher = createDecipheriv("aes-256-gcm", keyFor(secret, purpose), Buffer.from(iv, "base64url"), {
      authTagLength: TAG_BYTES,
    });
    decipher.setAuthTag(tagBytes);
    const plain = Buffer.concat([decipher.update(Buffer.from(body, "base64url")), decipher.final()]);
    return JSON.parse(plain.toString("utf8")) as T;
  } catch {
    return null;
  }
}
