/* GET /api/recovery/accounts — every account this caller may recover.

   SEP-30's listing. What makes it useful is the case it exists for: someone who lost their
   device holds only an identity token, and asks "which account was mine?" — the address is
   exactly what they no longer have written down. */
import { clientIp } from "@/lib/geo";
import { allow } from "@/lib/rate-limit";
import { actorFrom } from "@/lib/recovery-auth";
import { recoveryConfig } from "@/lib/recovery-config";
import { listAccounts } from "@/lib/recovery";
import { sepError, sepJson, sepNotAServer, sepRateLimited, sepUnauthorized } from "@/lib/sep-http";
import { recoveryListQuerySchema } from "@/schemas/recovery";
import type { APIRoute } from "astro";

export const GET: APIRoute = async (ctx) => {
  const cfg = recoveryConfig();
  if (!cfg) return sepNotAServer();
  const ip = clientIp(ctx.request.headers, ctx.clientAddress) ?? "unknown";
  if (!allow("recovery:list", ip, { limit: 60, windowMs: 10 * 60 * 1000 })) return sepRateLimited();
  const actor = actorFrom(ctx.request, cfg);
  if (!actor) return sepUnauthorized();

  // A cursor that is not an address is a caller mistake, not an empty page: answering
  // with the first page again would loop a client that is walking the list.
  const raw = ctx.url.searchParams.get("after");
  const query = recoveryListQuerySchema.safeParse(raw === null ? {} : { after: raw });
  if (!query.success) return sepError("Invalid cursor.", 400);

  return sepJson({ accounts: await listAccounts(cfg, actor, query.data.after) });
};
