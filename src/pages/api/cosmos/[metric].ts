import { jsonNotFound, jsonSuccess } from "@/lib/http";
import { cosmosAnalytics, type CosmosEnv } from "@/lib/cosmos";
import { getUserId, envFromQuery, cosmosErrorResponse } from "@/lib/cosmos-proxy";
import type { APIRoute } from "astro";

// Read-only dashboard aggregates → /api/cosmos/{summary|balances|logs|webhook-logs}
const METRICS: Record<string, (userId: string, env: CosmosEnv) => Promise<unknown>> = {
  summary: cosmosAnalytics.summary,
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
    const data = await fn(auth.userId, envFromQuery(ctx.url));
    return jsonSuccess({ data, message: `${metric} fetched successfully` });
  } catch (err) {
    return cosmosErrorResponse(err);
  }
};
