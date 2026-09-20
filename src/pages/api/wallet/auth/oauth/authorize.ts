/* POST /api/wallet/auth/oauth/authorize — open a Google or GitHub sign-in for the wallet.

   Public by necessity: the caller has no credential yet. What keeps the handshake the
   caller's own is the PKCE challenge — the `state` in the returned URL travels through a
   browser and lets anyone POLL, but only the verifier behind the challenge redeems it.
   See src/lib/wallet-auth.ts. */
import { ApiStatus, jsonCreated, jsonError, parseJson } from "@/lib/http";
import { clientIp } from "@/lib/geo";
import { startOAuth } from "@/lib/wallet-auth";
import { walletAuthAuthorizeBodySchema } from "@/schemas/wallet-auth";
import type { APIRoute } from "astro";

export const POST: APIRoute = async (ctx) => {
  const body = await parseJson(ctx.request, walletAuthAuthorizeBodySchema).catch(() => null);
  if (!body || !body.ok) {
    return body?.response ?? jsonError({ message: "Invalid request", code: 400, status: ApiStatus.BAD_REQUEST });
  }

  const result = await startOAuth({
    provider: body.data.provider,
    codeChallenge: body.data.codeChallenge,
    clientIp: clientIp(ctx.request.headers, ctx.clientAddress) ?? "unknown",
  }).catch(() => null);

  if (!result) {
    return jsonError({ message: "Could not start the sign-in", code: 500, status: ApiStatus.INTERNAL_ERROR });
  }
  switch (result.status) {
    case "opened":
      return jsonCreated({ data: result, message: "Open the authorization URL to continue." });
    case "not_configured":
      return jsonError({ message: "This sign-in provider is not available.", code: 503, status: ApiStatus.INTERNAL_ERROR });
    case "rate_limited":
      return jsonError({ message: "Too many sign-in attempts — wait a moment and try again.", code: 429, status: ApiStatus.BAD_REQUEST });
  }
};
