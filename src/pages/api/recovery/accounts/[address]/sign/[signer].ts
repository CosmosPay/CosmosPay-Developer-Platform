/* POST /api/recovery/accounts/{address}/sign/{signer} — the co-signature.

   This is the one route that produces something with power, so what it will put its name to
   is narrow and decided in one place: `signRefusal` in src/lib/recovery.ts. A recovery
   transaction on the registered account, bounded in time, and nothing else — no payment, no
   merge, no envelope with someone else's source.

   It returns the SIGNATURE, not a signed envelope. The wallet is collecting two of them and
   assembles the transaction itself; a server that handed back an envelope would be inviting
   the other signature to be quietly dropped. */
import { ApiStatus, jsonError, jsonSuccess, parseJson } from "@/lib/http";
import { clientIp } from "@/lib/geo";
import { allow } from "@/lib/rate-limit";
import { actorFrom } from "@/lib/recovery-auth";
import { recoveryConfig } from "@/lib/recovery-config";
import { mayAct, signRecovery } from "@/lib/recovery";
import { recoverySignBodySchema, recoverySignParamSchema } from "@/schemas/recovery";
import type { APIRoute } from "astro";

export const POST: APIRoute = async (ctx) => {
  const cfg = recoveryConfig();
  if (!cfg) {
    return jsonError({ message: "This deployment is not a recovery server.", code: 503, status: ApiStatus.INTERNAL_ERROR });
  }
  const ip = clientIp(ctx.request.headers, ctx.clientAddress) ?? "unknown";
  if (!allow("recovery:sign", ip, { limit: 30, windowMs: 10 * 60 * 1000 })) {
    return jsonError({ message: "Too many requests — wait a moment.", code: 429, status: ApiStatus.BAD_REQUEST });
  }

  const params = recoverySignParamSchema.safeParse(ctx.params);
  if (!params.success) {
    return jsonError({ message: "Invalid account or signer", code: 400, status: ApiStatus.BAD_REQUEST });
  }
  const actor = actorFrom(ctx.request, cfg);
  if (!actor) return jsonError({ message: "Unauthorized", code: 401, status: ApiStatus.UNAUTHORIZED });
  if (!(await mayAct(cfg, params.data.address, actor))) {
    return jsonError({ message: "Not found", code: 404, status: ApiStatus.NOT_FOUND });
  }

  const body = await parseJson(ctx.request, recoverySignBodySchema).catch(() => null);
  if (!body || !body.ok) {
    return body?.response ?? jsonError({ message: "Invalid request", code: 400, status: ApiStatus.BAD_REQUEST });
  }

  const result = await signRecovery(cfg, params.data.address, params.data.signer, body.data.transaction);
  switch (result.status) {
    case "signed":
      return jsonSuccess({
        data: { signature: result.signature, network_passphrase: result.networkPassphrase },
        message: "Signed.",
      });
    case "unknown_account":
      return jsonError({ message: "Not found", code: 404, status: ApiStatus.NOT_FOUND });
    case "wrong_signer":
      return jsonError({ message: "That is not this server's signer for this account.", code: 404, status: ApiStatus.NOT_FOUND });
    case "not_a_transaction":
      return jsonError({ message: "That is not a transaction on this network.", code: 400, status: ApiStatus.BAD_REQUEST });
    case "refused":
      // The reason is named: a wallet that built the wrong transaction has to be able to see
      // which rule it broke. It is not a hint to an attacker — the rules are published here.
      return jsonError({
        message: `This server only signs account recovery (${result.reason}).`,
        code: 403,
        status: ApiStatus.FORBIDDEN,
      });
  }
};
