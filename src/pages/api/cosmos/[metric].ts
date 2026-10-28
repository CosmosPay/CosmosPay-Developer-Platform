import { jsonNotFound, jsonSuccess } from "@/lib/http";
import { cosmosAnalytics, SERIES_PERIODS, type CosmosEnv, type SeriesPeriod } from "@/lib/cosmos";
import { getUserId, envFromQuery, cosmosErrorResponse } from "@/lib/cosmos-proxy";
import type { APIRoute } from "astro";

// Read-only dashboard aggregates → /api/cosmos/{summary|series|balances|logs|webhook-logs}
/* `series` takes ?period=day|week|month|year (day when absent or anything else). */
const periodOf = (url: URL): SeriesPeriod => {
  const p = url.searchParams.get("period");
  return (SERIES_PERIODS as readonly string[]).includes(p ?? "") ? (p as SeriesPeriod) : "day";
};
const METRICS: Record<string, (userId: string, env: CosmosEnv, url: URL) => Promise<unknown>> = {
  summary: cosmosAnalytics.summary,
  series: (userId, env, url) => cosmosAnalytics.series(userId, env, periodOf(url)),
  balances: cosmosAnalytics.balances,
  logs: cosmosAnalytics.apiLogs,
  "webhook-logs": cosmosAnalytics.webhookLogs,
};

export const GET: APIRoute = async (ctx) => {
  const auth = await getUserId(ctx.request);
  if ("response" in auth) return auth.response;
  const metric = ctx.params.metric ?? "";
  const fn = METRICS[metric];
  if (!fn) return jsonNotFound("Unknown metric");
  try {
    const data = await fn(auth.userId, envFromQuery(ctx.url), ctx.url);
    return jsonSuccess({ data, message: `${metric} fetched successfully` });
  } catch (err) {
    return cosmosErrorResponse(err);
  }
};
