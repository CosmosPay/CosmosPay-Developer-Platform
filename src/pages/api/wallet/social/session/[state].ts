/* GET /api/wallet/social/session/{state}?env=dev|prod — has the user come back yet?

   The wallet polls this while the consent screen is open in another window, and reads the
   single-use code off the `authorized` answer. Public for the same reason as authorize:
   the caller has no credential yet. Knowing the `state` is enough to SEE the code, which
   is why redeeming it also needs the PKCE verifier that never left the wallet. */
import { ApiStatus, jsonError, jsonSuccess } from "@/lib/http";
import { clientIp } from "@/lib/geo";
import { envFromQuery } from "@/lib/cosmos-proxy";
import { pollSocialLogin } from "@/lib/social-onboarding";
import { walletSocialStateParamSchema } from "@/schemas/wallet";
import type { APIRoute } from "astro";

export const GET: APIRoute = async (ctx) => {
  const params = walletSocialStateParamSchema.safeParse(ctx.params);
  if (!params.success) {
    return jsonError({ message: "Invalid handshake state", code: 400, status: ApiStatus.BAD_REQUEST });
  }

  const result = await pollSocialLogin({
    env: envFromQuery(ctx.url),
    state: params.data.state,
    clientIp: clientIp(ctx.request.headers, ctx.clientAddress) ?? "unknown",
  }).catch(() => null);

  if (!result) {
    return jsonError({ message: "Could not read the login status", code: 500, status: ApiStatus.INTERNAL_ERROR });
  }

  switch (result.status) {
    case "ok":
      return jsonSuccess({ data: result.session, message: "OK" });
    case "rate_limited":
      return jsonError({ message: "Polling too fast — slow down and try again.", code: 429, status: ApiStatus.BAD_REQUEST });
    case "unavailable":
      return jsonError({ message: result.message, code: 503, status: ApiStatus.INTERNAL_ERROR });
  }
};
