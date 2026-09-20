/* recovery-auth.ts — reading the bearer token a recovery route was called with.

   Two kinds, both minted by this deployment and both scoped to its own audience, so a token
   from the sibling server is not a token here:

     - SEP-10: the subject is a Stellar ADDRESS, and it means "I still hold this account's
       key". Registering and changing identities need this one.
     - identity: the subject is `email:<address>`, minted after the platform proved that
       inbox. It is what someone who lost their device has, and all it can do is read the
       account and ask for a recovery signature.

   `null` for anything else — no header, another server's audience, an expired token, a
   forged one. Routes answer 401 and say nothing more. */
import { readJwt } from "@/lib/jwt";
import type { RecoveryConfig } from "@/lib/recovery-config";
import type { Actor, AuthMethodType } from "@/lib/recovery-core";

/** The bearer token of a request, or null. */
export function bearer(request: Request): string | null {
  return /^Bearer\s+(\S+)$/i.exec(request.headers.get("authorization") ?? "")?.[1] ?? null;
}

/** Who is calling, by whichever of the two tokens they presented. */
export function actorFrom(request: Request, cfg: RecoveryConfig, now = Date.now()): Actor | null {
  const token = bearer(request);
  if (!token) return null;

  const sep10 = readJwt(token, cfg.jwtSecret, cfg.sep10Purpose, now);
  if (sep10 && sep10.aud === cfg.sep10.webAuthDomain) return { kind: "address", address: sep10.sub };

  const identity = readJwt(token, cfg.jwtSecret, cfg.identityPurpose, now);
  if (identity && identity.aud === cfg.sep10.webAuthDomain) {
    const at = identity.sub.indexOf(":");
    const type = identity.sub.slice(0, at) as AuthMethodType;
    const value = identity.sub.slice(at + 1);
    if (value && (type === "email" || type === "phone_number" || type === "stellar_address")) {
      return { kind: "identity", type, value };
    }
  }
  return null;
}
