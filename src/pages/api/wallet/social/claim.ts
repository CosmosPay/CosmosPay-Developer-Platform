/* POST /api/wallet/social/claim?env=dev|prod — redeem the code, and come back with the
   Pollar session PLUS the CosmosPay account and API keys that go with it.

   This is the step that closes the loop the wallet could not close on its own: the
   provider has just proven an email address, so the account is created (or attached to
   the one that email already has) without a signature or a confirmation link, and its
   keys are minted with the `pollar:*` scopes the wallet needs from here on.

   The credential for this call is the PKCE verifier. It never left the wallet, the code
   is single-use, and the Payments service checks the pair — so possession of a `state`
   scraped from somewhere buys nothing.

   The keys are returned in this response and nowhere else, exactly as POST /api/wallet/claim
   does for the email flow. */
import { ApiStatus, jsonCreated, jsonError, parseJson } from "@/lib/http";
import { clientIp } from "@/lib/geo";
import { envFromQuery } from "@/lib/cosmos-proxy";
import { completeSocialLogin } from "@/lib/social-onboarding";
import { walletSocialClaimBodySchema } from "@/schemas/wallet";
import type { APIRoute } from "astro";

export const POST: APIRoute = async (ctx) => {
  const body = await parseJson(ctx.request, walletSocialClaimBodySchema).catch(() => null);
  if (!body || !body.ok) {
    return body?.response ?? jsonError({ message: "Invalid request", code: 400, status: ApiStatus.BAD_REQUEST });
  }

  const result = await completeSocialLogin({
    env: envFromQuery(ctx.url),
    code: body.data.code,
    codeVerifier: body.data.codeVerifier,
    name: body.data.name,
    clientIp: clientIp(ctx.request.headers, ctx.clientAddress) ?? "unknown",
  }).catch(() => null);

  if (!result) {
    return jsonError({ message: "Could not complete the social login", code: 500, status: ApiStatus.INTERNAL_ERROR });
  }

  switch (result.status) {
    case "ready":
      return jsonCreated({
        data: {
          status: "ready",
          session: result.session,
          account: result.account,
          organizationId: result.organizationId,
          keys: result.keys,
          activated: result.activated,
          activationAmount: result.activationAmount,
        },
        message:
          result.account === "none"
            ? "Signed in. No email came back from the provider, so no CosmosPay account was created."
            : result.account === "linked"
              ? "Signed in and linked to your existing CosmosPay account."
              : "Signed in and your CosmosPay account is ready.",
      });
    case "no_wallet":
      return jsonError({ message: "The provider returned no wallet for this account.", code: 502, status: ApiStatus.BAD_REQUEST });
    case "rate_limited":
      return jsonError({ message: "Too many attempts — wait a moment and try again.", code: 429, status: ApiStatus.BAD_REQUEST });
    case "unavailable":
      return jsonError({ message: result.message, code: 503, status: ApiStatus.INTERNAL_ERROR });
  }
};
