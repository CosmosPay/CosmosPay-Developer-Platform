/* GET /api/recovery/accounts — every account this caller may recover.

   SEP-30's listing. What makes it useful is the case it exists for: someone who lost their
   device holds only an identity token, and asks "which account was mine?" — the address is
   exactly what they no longer have written down. */
import { ApiStatus, jsonError, jsonSuccess } from "@/lib/http";
import { clientIp } from "@/lib/geo";
import { allow } from "@/lib/rate-limit";
import { actorFrom } from "@/lib/recovery-auth";
import { recoveryConfig } from "@/lib/recovery-config";
import { listAccounts } from "@/lib/recovery";
import type { APIRoute } from "astro";

export const GET: APIRoute = async (ctx) => {
  const cfg = recoveryConfig();
  if (!cfg) {
    return jsonError({ message: "This deployment is not a recovery server.", code: 503, status: ApiStatus.INTERNAL_ERROR });
  }
  const ip = clientIp(ctx.request.headers, ctx.clientAddress) ?? "unknown";
  if (!allow("recovery:list", ip, { limit: 60, windowMs: 10 * 60 * 1000 })) {
    return jsonError({ message: "Too many requests — wait a moment.", code: 429, status: ApiStatus.BAD_REQUEST });
  }
  const actor = actorFrom(ctx.request, cfg);
  if (!actor) return jsonError({ message: "Unauthorized", code: 401, status: ApiStatus.UNAUTHORIZED });

  return jsonSuccess({ data: { accounts: await listAccounts(cfg, actor) }, message: "OK" });
};
