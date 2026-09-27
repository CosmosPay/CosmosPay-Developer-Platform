/* POST /api/wallet/console/login-code — email a sign-in code the community server minted.

   Called by the community server, never by a client. The wallet's sign-in runs there now;
   that service owns no mailer, so it mints the code and hands it here to be delivered — the
   same split it already makes for alias recovery, in the other direction.

   This console decides nothing about the sign-in. It does not store the code, does not know
   the hash that will check it, and does not learn whether it was ever entered. Keeping it
   that thin is what stops two services having an opinion about when a sign-in succeeds.

   404 rather than 401 for a caller that is not the community server: this route's existence
   is not information a stranger needs, and a 401 would confirm it. See
   src/lib/wallet-auth-console.ts for what the check rests on. */
import { ApiStatus, jsonError, jsonSuccess, parseJson } from "@/lib/http";
import { deliverLoginCode, isCommunityServerCall } from "@/lib/wallet-auth-console";
import { isMailConfigured } from "@/lib/mailer";
import { walletAuthLoginCodeBodySchema } from "@/schemas/wallet-auth-console";
import type { APIRoute } from "astro";

export const POST: APIRoute = async (ctx) => {
  if (!isCommunityServerCall(ctx.request.headers)) {
    return jsonError({ message: "Not found", code: 404, status: ApiStatus.NOT_FOUND });
  }

  const body = await parseJson(ctx.request, walletAuthLoginCodeBodySchema).catch(() => null);
  if (!body || !body.ok) {
    return body?.response ?? jsonError({ message: "Invalid request", code: 400, status: ApiStatus.BAD_REQUEST });
  }

  /* Reported as unavailable rather than attempted: the caller turns a failure here into a
     refusal of the whole sign-in, which is right — a code minted and never delivered is a
     person staring at an empty inbox with a live resend cooldown holding them there. */
  if (!isMailConfigured()) {
    return jsonError({
      message: "Email delivery is not configured on this platform.",
      code: 503,
      status: ApiStatus.INTERNAL_ERROR,
    });
  }

  try {
    await deliverLoginCode({
      email: body.data.email,
      name: body.data.name ?? null,
      code: body.data.code,
      expiresAt: body.data.expiresAt,
    });
  } catch {
    /* The transport's own error is logged by the mailer and never returned: it carries
       provider detail, and the caller's only decision is retry-or-refuse. */
    return jsonError({ message: "Could not send the code", code: 502, status: ApiStatus.INTERNAL_ERROR });
  }

  return jsonSuccess({ data: { sent: true }, message: "Code sent." });
};
