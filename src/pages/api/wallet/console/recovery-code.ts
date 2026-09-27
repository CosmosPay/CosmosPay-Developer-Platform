/* POST /api/wallet/console/recovery-code — email a code one of the recovery servers minted.

   Called by a SEP-30 recovery server (the community server deployed as role `a` or `b`),
   never by a client. A person who lost their device proves their inbox to EACH server with
   a code that server minted; those deployments own no mailer, so they hand the code here to
   be delivered — the same split login-code.ts makes for the wallet's sign-in.

   This console decides nothing about the recovery. It does not store the code, does not know
   the hash that will check it, and does not learn whether it was ever entered. The two
   servers being independent is the whole point of having two, and a second place with an
   opinion about whether an inbox was proven would quietly become a third party to it.

   Authorized by `x-cosmos-recovery-secret` against WALLET_RECOVERY_CONSOLE_SECRETS, one
   entry per server (src/lib/console-call.ts), NOT by the gateway secret the other two legs
   use: a recovery server must not hold the credential that mints accounts.

   404 rather than 401 for a caller that is not a recovery server: this route's existence is
   not information a stranger needs, and a 401 would confirm it. An unset secret list fails
   closed into that same 404. */
import { ApiStatus, jsonError, jsonSuccess, parseJson } from "@/lib/http";
import { deliverRecoveryCode, isRecoveryServerCall } from "@/lib/wallet-auth-console";
import { isMailConfigured } from "@/lib/mailer";
import { walletRecoveryCodeBodySchema } from "@/schemas/wallet-auth-console";
import type { APIRoute } from "astro";

export const POST: APIRoute = async (ctx) => {
  if (!isRecoveryServerCall(ctx.request.headers)) {
    return jsonError({ message: "Not found", code: 404, status: ApiStatus.NOT_FOUND });
  }

  const body = await parseJson(ctx.request, walletRecoveryCodeBodySchema).catch(() => null);
  if (!body || !body.ok) {
    return body?.response ?? jsonError({ message: "Invalid request", code: 400, status: ApiStatus.BAD_REQUEST });
  }

  /* Reported as unavailable rather than attempted: the recovery server logs a non-2xx, and a
     person waiting on a code that was never sent is better served by that log line than by
     a 200 that claimed delivery. */
  if (!isMailConfigured()) {
    return jsonError({
      message: "Email delivery is not configured on this platform.",
      code: 503,
      status: ApiStatus.INTERNAL_ERROR,
    });
  }

  try {
    await deliverRecoveryCode({
      email: body.data.email,
      code: body.data.code,
      expiresAt: body.data.expiresAt,
      role: body.data.role,
    });
  } catch {
    /* The transport's own error is logged by the mailer and never returned: it carries
       provider detail, and the caller's only decision is retry-or-give-up. */
    return jsonError({ message: "Could not send the code", code: 502, status: ApiStatus.INTERNAL_ERROR });
  }

  return jsonSuccess({ data: { sent: true }, message: "Code sent." });
};
