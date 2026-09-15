/* POST /api/wallet/social/verify — finish a social login held for an emailed code.

   POST /api/wallet/social/claim answers `verify_email` when the provider's email already
   has a CosmosPay account: the provider proved who consented, not who opened the login,
   and an existing account is exactly what a phished login would take over. The code went
   to that account's inbox; this exchanges it — with the claim token the wallet kept — for
   the Pollar session and the account's keys. Wrong codes are counted, and the login locks
   after a few, dropping the held session with it. */
import { ApiStatus, jsonError, jsonSuccess, parseJson } from "@/lib/http";
import { clientIp } from "@/lib/geo";
import { verifySocialLogin } from "@/lib/social-onboarding";
import { walletSocialVerifyBodySchema } from "@/schemas/wallet";
import type { APIRoute } from "astro";

export const POST: APIRoute = async (ctx) => {
  const body = await parseJson(ctx.request, walletSocialVerifyBodySchema).catch(() => null);
  if (!body || !body.ok) {
    return body?.response ?? jsonError({ message: "Invalid request", code: 400, status: ApiStatus.BAD_REQUEST });
  }

  const result = await verifySocialLogin({
    claimToken: body.data.claimToken,
    code: body.data.code,
    clientIp: clientIp(ctx.request.headers, ctx.clientAddress) ?? "unknown",
  }).catch(() => null);

  if (!result) {
    return jsonError({ message: "Could not complete the social login", code: 500, status: ApiStatus.INTERNAL_ERROR });
  }
  if (result.status === "rate_limited") {
    return jsonError({ message: "Too many attempts — wait a moment and try again.", code: 429, status: ApiStatus.BAD_REQUEST });
  }

  // Non-ready outcomes ride in `data.status` with HTTP 200, like POST /api/wallet/link/verify:
  // the wallet branches on the status, not on the HTTP code.
  const messages: Record<string, string> = {
    ready: "Signed in and linked to your existing CosmosPay account.",
    invalid: "Incorrect code.",
    expired: "This sign-in expired — start a new one from the wallet.",
    locked: "Too many attempts — start a new sign-in from the wallet.",
  };
  return jsonSuccess({ data: result, message: messages[result.status] ?? "OK" });
};
