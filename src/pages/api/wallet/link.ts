/* POST /api/wallet/link — when an account already exists for the email, start linking it to
   the wallet: verify the Stellar signature and email a one-time access code. The wallet then
   exchanges that code (+ the claim token returned here) for the API key at
   POST /api/wallet/link/verify. No shared secret — the code proves email ownership and the
   signature proves control of the Stellar account. */
import { ApiStatus, jsonCreated, jsonError, jsonSuccess, parseJson } from "@/lib/http";
import { walletLinkBodySchema } from "@/schemas/wallet";
import { startWalletLink } from "@/lib/wallet-provisioning";
import type { APIRoute } from "astro";

export const POST: APIRoute = async (ctx) => {
  const body = await parseJson(ctx.request, walletLinkBodySchema).catch(() => null);
  if (!body || !body.ok) {
    return body?.response ?? jsonError({ message: "Invalid request", code: 400, status: ApiStatus.BAD_REQUEST });
  }

  const result = await startWalletLink(body.data).catch(() => null);
  if (!result) {
    return jsonError({ message: "Could not start linking", code: 500, status: ApiStatus.INTERNAL_ERROR });
  }

  switch (result.status) {
    case "sent":
      return jsonCreated({
        data: { status: "sent", claimToken: result.claimToken, expiresInSeconds: result.expiresInSeconds },
        message: "We emailed a one-time access code to link your account.",
      });
    case "not_found":
      // No account for this email — the wallet should fall back to creating one.
      return jsonSuccess({
        data: { status: "not_found" },
        message: "No account exists for this email yet — create one instead.",
      });
    case "invalid_signature":
      return jsonError({ message: "Invalid Stellar signature", code: 401, status: ApiStatus.UNAUTHORIZED });
    case "rate_limited":
      return jsonError({ message: "An access code was just sent — please wait a moment.", code: 429, status: ApiStatus.BAD_REQUEST });
    case "email_unavailable":
      return jsonError({ message: "Email delivery is not available right now.", code: 503, status: ApiStatus.INTERNAL_ERROR });
  }
};
