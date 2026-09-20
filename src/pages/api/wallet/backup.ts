/* PUT /api/wallet/backup — replace a wallet backup's box after a password change.

   No sign-in: the credential is a signature by the backup's own Stellar address over the
   canonical backup message (backupMessage in src/lib/wallet-auth-core.ts), which covers the
   new box's hash. Only the key the box restores can change it, and a signature over one box
   cannot store another. */
import { ApiStatus, jsonError, jsonSuccess, parseJson } from "@/lib/http";
import { clientIp } from "@/lib/geo";
import { updateWalletBackup } from "@/lib/wallet-auth";
import { walletBackupUpdateBodySchema } from "@/schemas/wallet-auth";
import type { APIRoute } from "astro";

export const PUT: APIRoute = async (ctx) => {
  const body = await parseJson(ctx.request, walletBackupUpdateBodySchema).catch(() => null);
  if (!body || !body.ok) {
    return body?.response ?? jsonError({ message: "Invalid request", code: 400, status: ApiStatus.BAD_REQUEST });
  }

  const result = await updateWalletBackup({
    ...body.data,
    clientIp: clientIp(ctx.request.headers, ctx.clientAddress) ?? "unknown",
  }).catch(() => null);

  if (!result) {
    return jsonError({ message: "Could not update the backup", code: 500, status: ApiStatus.INTERNAL_ERROR });
  }
  switch (result.status) {
    case "updated":
      return jsonSuccess({ data: result, message: "Backup updated." });
    case "not_found":
      return jsonError({ message: "No backup for this address.", code: 404, status: ApiStatus.NOT_FOUND });
    case "invalid_signature":
      return jsonError({ message: "Invalid or stale Stellar signature.", code: 401, status: ApiStatus.UNAUTHORIZED });
    case "invalid_backup":
      return jsonError({ message: "The backup is not one this wallet can restore.", code: 400, status: ApiStatus.BAD_REQUEST });
    case "rate_limited":
      return jsonError({ message: "Too many attempts — wait a moment and try again.", code: 429, status: ApiStatus.BAD_REQUEST });
  }
};
