/* POST /api/wallet/auth/finish — attach a proven email to the key the device holds.

   `Authorization: Bearer <sessionToken>` from a `ready` sign-in, plus a signature by the
   Stellar address being attached over the canonical finish message (finishMessage in
   src/lib/wallet-auth-core.ts). Creates or links the CosmosPay account, stores the backup
   when one is sent, and returns the wallet's API keys — here and nowhere else.

   `backup_conflict` (HTTP 200) means the account already backs up a DIFFERENT address and
   the wallet did not say `replaceBackup`: nothing was created or changed. */
import { ApiStatus, jsonError, jsonSuccess, parseJson } from "@/lib/http";
import { clientIp } from "@/lib/geo";
import { finishWalletSignIn } from "@/lib/wallet-auth";
import { walletAuthFinishBodySchema } from "@/schemas/wallet-auth";
import type { APIRoute } from "astro";

export const POST: APIRoute = async (ctx) => {
  const sessionToken = /^Bearer\s+(\S+)$/i.exec(ctx.request.headers.get("authorization") ?? "")?.[1];
  if (!sessionToken) {
    return jsonError({ message: "Sign in first.", code: 401, status: ApiStatus.UNAUTHORIZED });
  }
  const body = await parseJson(ctx.request, walletAuthFinishBodySchema).catch(() => null);
  if (!body || !body.ok) {
    return body?.response ?? jsonError({ message: "Invalid request", code: 400, status: ApiStatus.BAD_REQUEST });
  }

  const result = await finishWalletSignIn({
    sessionToken,
    ...body.data,
    clientIp: clientIp(ctx.request.headers, ctx.clientAddress) ?? "unknown",
  }).catch(() => null);

  if (!result) {
    return jsonError({ message: "Could not finish the sign-in", code: 500, status: ApiStatus.INTERNAL_ERROR });
  }
  switch (result.status) {
    case "ready":
      return jsonSuccess({
        data: result,
        message: result.account === "created" ? "Your CosmosPay account is ready." : "Signed in to your CosmosPay account.",
      });
    case "backup_conflict":
      return jsonSuccess({ data: result, message: "This account already backs up a different wallet." });
    case "unauthorized":
      return jsonError({ message: "This sign-in expired — sign in again.", code: 401, status: ApiStatus.UNAUTHORIZED });
    case "invalid_signature":
      return jsonError({ message: "Invalid or stale Stellar signature.", code: 401, status: ApiStatus.UNAUTHORIZED });
    case "invalid_backup":
      return jsonError({ message: "The backup is not one this wallet can restore.", code: 400, status: ApiStatus.BAD_REQUEST });
    case "rate_limited":
      return jsonError({ message: "Too many attempts — wait a moment and try again.", code: 429, status: ApiStatus.BAD_REQUEST });
  }
};
