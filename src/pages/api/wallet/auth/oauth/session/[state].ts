/* GET /api/wallet/auth/oauth/session/{state} — has the person come back from the provider?

   The wallet polls this while the consent screen is open in another window. It answers
   with a status only: who the person turned out to be is handed over by the claim, to the
   holder of the PKCE verifier, never to whoever knows the state. */
import { ApiStatus, jsonError, jsonSuccess } from "@/lib/http";
import { clientIp } from "@/lib/geo";
import { pollOAuth } from "@/lib/wallet-auth";
import { walletAuthStateParamSchema } from "@/schemas/wallet-auth";
import type { APIRoute } from "astro";

export const GET: APIRoute = async (ctx) => {
  const params = walletAuthStateParamSchema.safeParse(ctx.params);
  if (!params.success) {
    return jsonError({ message: "Invalid handshake state", code: 400, status: ApiStatus.BAD_REQUEST });
  }

  const result = await pollOAuth({
    state: params.data.state,
    clientIp: clientIp(ctx.request.headers, ctx.clientAddress) ?? "unknown",
  }).catch(() => null);

  if (!result) {
    return jsonError({ message: "Could not read the sign-in status", code: 500, status: ApiStatus.INTERNAL_ERROR });
  }
  if (result.status === "rate_limited") {
    return jsonError({ message: "Polling too fast — slow down and try again.", code: 429, status: ApiStatus.BAD_REQUEST });
  }
  return jsonSuccess({ data: result, message: "OK" });
};
