/* POST /api/wallet/register — start secure CosmosPay account provisioning for a wallet.

   No shared secret (the wallet is open-source): the request must carry a Stellar key
   SIGNATURE proving control of the account, and the account is only created after the
   user confirms their email via the link this sends. Returns a one-time `claimToken`
   the wallet later exchanges for its API key (POST /api/wallet/claim). */
import {
  ApiStatus,
  jsonCreated,
  jsonError,
  jsonSuccess,
  parseJson,
} from "@/lib/http";
import { walletRegisterBodySchema } from "@/schemas/wallet";
import { startWalletRegistration } from "@/lib/wallet-provisioning";
import type { APIRoute } from "astro";

export const POST: APIRoute = async (ctx) => {
  const body = await parseJson(ctx.request, walletRegisterBodySchema).catch(() => null);
  if (!body || !body.ok) {
    return body?.response ?? jsonError({ message: "Invalid request", code: 400, status: ApiStatus.BAD_REQUEST });
  }

  const result = await startWalletRegistration(body.data).catch(() => null);
  if (!result) {
    return jsonError({ message: "Could not start registration", code: 500, status: ApiStatus.INTERNAL_ERROR });
  }

  switch (result.status) {
    case "pending":
      return jsonCreated({
        data: { status: "pending", claimToken: result.claimToken, expiresInSeconds: result.expiresInSeconds },
        message: "Check your email to confirm and finish creating your account.",
      });
    case "exists":
      // Don't reveal more than necessary; the wallet just tells the user to sign in.
      return jsonSuccess({
        data: { status: "exists" },
        message: "An account already exists for this email; sign in to the dashboard to manage it.",
      });
    case "invalid_signature":
      return jsonError({ message: "Invalid Stellar signature", code: 401, status: ApiStatus.UNAUTHORIZED });
    case "rate_limited":
      return jsonError({ message: "A confirmation email was just sent — please wait a moment.", code: 429, status: ApiStatus.BAD_REQUEST });
    case "email_unavailable":
      return jsonError({ message: "Email delivery is not available right now.", code: 503, status: ApiStatus.INTERNAL_ERROR });
  }
};
