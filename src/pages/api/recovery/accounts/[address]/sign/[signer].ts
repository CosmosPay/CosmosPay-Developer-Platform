/* POST /api/recovery/accounts/{address}/sign/{signer} — the co-signature.

   This is the one route that produces something with power, so what it will put its name to
   is narrow and decided in one place: `signRefusal` in src/lib/recovery.ts. A recovery
   transaction on the registered account, bounded in time, and nothing else — no payment, no
   merge, no envelope with someone else's source.

   It returns the SIGNATURE, not a signed envelope. The wallet is collecting two of them and
   assembles the transaction itself; a server that handed back an envelope would be inviting
   the other signature to be quietly dropped.

   The bodies here are SEP-30's own, not this API's envelope — see src/lib/sep-http.ts. */
import { parseJson } from "@/lib/http";
import { clientIp } from "@/lib/geo";
import { allow } from "@/lib/rate-limit";
import { actorFrom } from "@/lib/recovery-auth";
import { recoveryConfig } from "@/lib/recovery-config";
import { mayAct, signRecovery } from "@/lib/recovery";
import { sepError, sepJson, sepNotAServer, sepNotFound, sepRateLimited, sepUnauthorized } from "@/lib/sep-http";
import { recoverySignBodySchema, recoverySignParamSchema } from "@/schemas/recovery";
import type { APIRoute } from "astro";

export const POST: APIRoute = async (ctx) => {
  const cfg = recoveryConfig();
  if (!cfg) return sepNotAServer();
  const ip = clientIp(ctx.request.headers, ctx.clientAddress) ?? "unknown";
  if (!allow("recovery:sign", ip, { limit: 30, windowMs: 10 * 60 * 1000 })) return sepRateLimited();

  const params = recoverySignParamSchema.safeParse(ctx.params);
  if (!params.success) return sepError("Invalid account or signer.", 400);
  const actor = actorFrom(ctx.request, cfg);
  if (!actor) return sepUnauthorized();
  if (!(await mayAct(cfg, params.data.address, actor))) return sepNotFound();

  const body = await parseJson(ctx.request, recoverySignBodySchema).catch(() => null);
  if (!body || !body.ok) return sepError("Invalid request.", 400);

  const result = await signRecovery(cfg, params.data.address, params.data.signer, body.data.transaction);
  switch (result.status) {
    case "signed":
      return sepJson({ signature: result.signature, network_passphrase: result.networkPassphrase });
    case "unknown_account":
      return sepNotFound();
    case "wrong_signer":
      return sepError("That is not this server's signer for this account.", 404);
    case "not_a_transaction":
      return sepError("That is not a transaction on this network.", 400);
    case "refused":
      // The reason is named: a wallet that built the wrong transaction has to be able to see
      // which rule it broke. It is not a hint to an attacker — the rules are published here.
      return sepError(`This server only signs account recovery (${result.reason}).`, 403);
  }
};
