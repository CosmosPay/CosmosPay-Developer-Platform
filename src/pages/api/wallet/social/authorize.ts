/* POST /api/wallet/social/authorize?env=dev|prod — open a Google/GitHub login for a
   wallet that has no CosmosPay account yet, and hand back the URL to send the user to.

   Public by necessity: whoever calls this has nothing to authenticate with, which is the
   whole point (see src/lib/social-onboarding.ts). What keeps it from being a free service
   is that the code it eventually produces is bound to the caller's PKCE challenge, and
   that both this route and the Payments service behind it are rate limited. */
import { ApiStatus, jsonCreated, jsonError, parseJson } from "@/lib/http";
import { clientIp } from "@/lib/geo";
import { envFromQuery } from "@/lib/cosmos-proxy";
import { startSocialLogin } from "@/lib/social-onboarding";
import { walletSocialAuthorizeBodySchema } from "@/schemas/wallet";
import type { APIRoute } from "astro";

export const POST: APIRoute = async (ctx) => {
  const body = await parseJson(ctx.request, walletSocialAuthorizeBodySchema).catch(() => null);
  if (!body || !body.ok) {
    return body?.response ?? jsonError({ message: "Invalid request", code: 400, status: ApiStatus.BAD_REQUEST });
  }

  const result = await startSocialLogin({
    env: envFromQuery(ctx.url),
    provider: body.data.provider,
    codeChallenge: body.data.codeChallenge,
    codeChallengeMethod: body.data.codeChallengeMethod,
    deviceLabel: body.data.deviceLabel,
    clientIp: clientIp(ctx.request.headers, ctx.clientAddress) ?? "unknown",
  }).catch(() => null);

  if (!result) {
    return jsonError({ message: "Could not start the social login", code: 500, status: ApiStatus.INTERNAL_ERROR });
  }

  switch (result.status) {
    case "opened":
      return jsonCreated({
        data: {
          status: "opened",
          state: result.state,
          authorizationUrl: result.authorizationUrl,
          provider: result.provider,
          expiresAt: result.expiresAt ?? null,
        },
        message: "Open the authorization URL to continue.",
      });
    case "rate_limited":
      return jsonError({ message: "Too many login attempts — wait a moment and try again.", code: 429, status: ApiStatus.BAD_REQUEST });
    case "unavailable":
      return jsonError({ message: result.message, code: 503, status: ApiStatus.INTERNAL_ERROR });
  }
};
