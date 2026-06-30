/* POST /api/wallet/claim — the wallet exchanges its one-time claim token (issued at
   register) for the provisioned API key, once the user has confirmed their email.

   No session/secret: possession of the claim token (returned only to the initiating
   wallet over TLS) plus the matching Stellar address is the credential. The key is
   returned exactly once, then the registration is marked claimed. */
import { ApiStatus, jsonError, jsonSuccess, parseJson } from "@/lib/http";
import { walletClaimBodySchema } from "@/schemas/wallet";
import { claimWalletRegistration } from "@/lib/wallet-provisioning";
import type { APIRoute } from "astro";

export const POST: APIRoute = async (ctx) => {
  const body = await parseJson(ctx.request, walletClaimBodySchema).catch(() => null);
  if (!body || !body.ok) {
    return body?.response ?? jsonError({ message: "Invalid request", code: 400, status: ApiStatus.BAD_REQUEST });
  }

  const result = await claimWalletRegistration(body.data).catch(() => null);
  if (!result) {
    return jsonError({ message: "Could not claim the account", code: 500, status: ApiStatus.INTERNAL_ERROR });
  }

  const messages: Record<string, string> = {
    pending: "Not confirmed yet — click the link in your email.",
    ready: "Account ready.",
    claimed: "This account was already claimed.",
    expired: "This registration has expired — start again from the wallet.",
  };
  return jsonSuccess({ data: result, message: messages[result.status] ?? "OK" });
};
