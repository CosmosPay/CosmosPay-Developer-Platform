/* POST /api/wallet/auth/oauth/claim — redeem a finished handshake with its PKCE verifier.

   `ready` for an email with no account yet: the provider verified it, and the sign-in is
   done. `verify_email` for one that already has an account: a code went to that inbox, and
   POST /api/wallet/auth/email/verify finishes it — the provider proved who consented, not
   who opened the sign-in, and an existing account (and its backup) is exactly what a
   phished link would be after. `pending` means the person has not come back yet.

   Outcomes ride in `data.status` with HTTP 200; a wrong verifier is 403 and spends nothing. */
import { ApiStatus, jsonError, jsonSuccess, parseJson } from "@/lib/http";
import { clientIp } from "@/lib/geo";
import { claimOAuth } from "@/lib/wallet-auth";
import { walletAuthClaimBodySchema } from "@/schemas/wallet-auth";
import type { APIRoute } from "astro";

export const POST: APIRoute = async (ctx) => {
  const body = await parseJson(ctx.request, walletAuthClaimBodySchema).catch(() => null);
  if (!body || !body.ok) {
    return body?.response ?? jsonError({ message: "Invalid request", code: 400, status: ApiStatus.BAD_REQUEST });
  }

  const result = await claimOAuth({
    state: body.data.state,
    codeVerifier: body.data.codeVerifier,
    clientIp: clientIp(ctx.request.headers, ctx.clientAddress) ?? "unknown",
  }).catch(() => null);

  if (!result) {
    return jsonError({ message: "Could not complete the sign-in", code: 500, status: ApiStatus.INTERNAL_ERROR });
  }
  switch (result.status) {
    case "forbidden":
      return jsonError({ message: "This sign-in was opened by another device.", code: 403, status: ApiStatus.FORBIDDEN });
    case "rate_limited":
      return jsonError({ message: "Too many attempts — wait a moment and try again.", code: 429, status: ApiStatus.BAD_REQUEST });
    case "email_unavailable":
      return jsonError({
        message: "This email already has an account, and the code that proves it could not be sent.",
        code: 503,
        status: ApiStatus.INTERNAL_ERROR,
      });
    default:
      return jsonSuccess({ data: result, message: result.status === "ready" ? "Signed in." : "OK" });
  }
};
