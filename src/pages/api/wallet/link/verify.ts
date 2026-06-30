/* POST /api/wallet/link/verify — exchange the emailed 6-digit access code (+ the claim token
   from POST /api/wallet/link) for the existing account's swaps-scoped API key. Wrong codes are
   counted server-side and the request locks after a few attempts. */
import { ApiStatus, jsonError, jsonSuccess, parseJson } from "@/lib/http";
import { walletLinkVerifyBodySchema } from "@/schemas/wallet";
import { verifyWalletLink } from "@/lib/wallet-provisioning";
import type { APIRoute } from "astro";

export const POST: APIRoute = async (ctx) => {
  const body = await parseJson(ctx.request, walletLinkVerifyBodySchema).catch(() => null);
  if (!body || !body.ok) {
    return body?.response ?? jsonError({ message: "Invalid request", code: 400, status: ApiStatus.BAD_REQUEST });
  }

  const result = await verifyWalletLink(body.data).catch(() => null);
  if (!result) {
    return jsonError({ message: "Could not link the account", code: 500, status: ApiStatus.INTERNAL_ERROR });
  }

  // Non-ready states (invalid/expired/locked) ride in `data.status` with HTTP 200, matching
  // the claim endpoint — the wallet inspects data.status rather than the HTTP code.
  const messages: Record<string, string> = {
    ready: "Account linked.",
    invalid: "Incorrect code.",
    expired: "This code has expired — request a new one from the wallet.",
    locked: "Too many attempts — request a new code from the wallet.",
  };
  return jsonSuccess({ data: result, message: messages[result.status] ?? "OK" });
};
