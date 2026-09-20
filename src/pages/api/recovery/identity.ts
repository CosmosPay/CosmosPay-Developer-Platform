/* POST /api/recovery/identity — the token someone who LOST their device authenticates with.

   SEP-10 proves you hold the account's key. Recovery is the case where you do not, so the
   other credential this server takes is an identity: a token whose subject is the email the
   platform proved, minted here in exchange for a sign-in session token
   (`POST /api/wallet/auth/email/verify` produces one, and so does a provider sign-in).

   Scoped to THIS server's audience, and short-lived. The sibling server issues its own from
   the same sign-in, and neither will take the other's — so a token that leaks buys a
   signature from one server, which is by design not enough to move anything. */
import { ApiStatus, jsonError, jsonSuccess } from "@/lib/http";
import { clientIp } from "@/lib/geo";
import { allow } from "@/lib/rate-limit";
import { issueJwt } from "@/lib/jwt";
import { bearer } from "@/lib/recovery-auth";
import { recoveryConfig } from "@/lib/recovery-config";
import { readSessionToken } from "@/lib/wallet-auth-core";
import type { APIRoute } from "astro";

/** As long as a recovery takes to walk through, and no longer. */
const IDENTITY_TTL_S = 30 * 60;

export const POST: APIRoute = async (ctx) => {
  const cfg = recoveryConfig();
  if (!cfg) {
    return jsonError({ message: "This deployment is not a recovery server.", code: 503, status: ApiStatus.INTERNAL_ERROR });
  }
  const ip = clientIp(ctx.request.headers, ctx.clientAddress) ?? "unknown";
  if (!allow("recovery:identity", ip, { limit: 30, windowMs: 10 * 60 * 1000 })) {
    return jsonError({ message: "Too many requests — wait a moment.", code: 429, status: ApiStatus.BAD_REQUEST });
  }

  const token = bearer(ctx.request);
  const identity = token ? readSessionToken(token, cfg.jwtSecret) : null;
  if (!identity) {
    return jsonError({ message: "Sign in first.", code: 401, status: ApiStatus.UNAUTHORIZED });
  }

  const now = Math.floor(Date.now() / 1000);
  return jsonSuccess({
    data: {
      token: issueJwt(
        {
          sub: `email:${identity.email}`,
          aud: cfg.sep10.webAuthDomain,
          iss: cfg.sep10.webAuthDomain,
          iat: now,
          exp: now + IDENTITY_TTL_S,
        },
        cfg.jwtSecret,
        cfg.identityPurpose,
      ),
      expires_in: IDENTITY_TTL_S,
    },
    message: "OK",
  });
};
