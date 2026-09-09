/* GET /api/activity/summary — the rollup behind the activity view's header:
   counts per level / source / category, the most frequent event types, the most
   frequent error messages, and a daily series. Session-scoped like the feed. */
import { jsonSuccess } from "@/lib/http";
import { cosmosActivity } from "@/lib/cosmos";
import { getUserId, envFromQuery, cosmosErrorResponse } from "@/lib/cosmos-proxy";
import type { APIRoute } from "astro";

export const GET: APIRoute = async (ctx) => {
  const auth = await getUserId(ctx.request);
  if ("response" in auth) return auth.response;

  const days = Number(ctx.url.searchParams.get("days"));
  try {
    const data = await cosmosActivity.summary(auth.userId, envFromQuery(ctx.url), {
      // Out-of-range values are dropped rather than clamped: the upstream owns
      // the window bounds, and echoing a guess here would put the real limit in
      // two places.
      days: Number.isFinite(days) && days >= 1 && days <= 90 ? days : undefined,
      source: ctx.url.searchParams.get("source") ?? undefined,
    });
    return jsonSuccess({ data, message: "Activity summary fetched successfully" });
  } catch (err) {
    return cosmosErrorResponse(err);
  }
};
