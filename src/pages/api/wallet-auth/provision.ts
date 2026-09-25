/* POST /api/wallet-auth/provision — create or link the account behind a finished sign-in,
   and mint its gateway keys.

   Called by the community server, never by a client. Minting a key needs APISIX admin, and
   this console already holds it for the dashboard's own key management — so the capability
   stays here rather than being handed to a service whose other job is moving money.

   The email arrives already PROVEN: by a provider this console never spoke to, or by a code
   it merely posted. That assertion is what `provisionWalletAccount` is built on, and the
   caller being the community server — rather than anyone holding an API key — is the whole
   of the authorization. A public route doing this would mint an account, an organization and
   two live keys for any address somebody typed.

   404 for a caller that is not the community server, for the same reason as the sibling
   route: its existence is not information a stranger needs. */
import { ApiStatus, jsonError, jsonSuccess, parseJson } from "@/lib/http";
import { isCommunityServerCall, provisionForWallet } from "@/lib/wallet-auth-console";
import { walletAuthProvisionBodySchema } from "@/schemas/wallet-auth-console";
import type { APIRoute } from "astro";

export const POST: APIRoute = async (ctx) => {
  if (!isCommunityServerCall(ctx.request.headers)) {
    return jsonError({ message: "Not found", code: 404, status: ApiStatus.NOT_FOUND });
  }

  const body = await parseJson(ctx.request, walletAuthProvisionBodySchema).catch(() => null);
  if (!body || !body.ok) {
    return body?.response ?? jsonError({ message: "Invalid request", code: 400, status: ApiStatus.BAD_REQUEST });
  }

  const result = await provisionForWallet(body.data).catch(() => null);
  if (!result) {
    /* Deliberately not partial. `provisionWalletAccount` either lands the account with its
       keys or reports nothing usable; returning half of it would leave the caller storing a
       wallet whose credentials nobody can find again. */
    return jsonError({ message: "Could not provision the account", code: 502, status: ApiStatus.INTERNAL_ERROR });
  }

  return jsonSuccess({ data: result, message: "Account provisioned." });
};
