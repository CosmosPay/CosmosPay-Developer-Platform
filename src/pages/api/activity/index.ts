/* /api/activity — the dashboard's own activity feed.

   POST  what the browser did: page views, actions, and anything it threw.
   GET   read it back (this account's events, newest first).

   Both are session-authenticated, so every row is attributed to the signed-in
   account's consumer upstream — nothing in the body decides that.

   The POST is buffered rather than forwarded inline (see @/lib/activity): a page
   view must not wait on a round trip to the Payments service, and the browser
   already batches. It answers 202-style immediately. */
import { jsonSuccess, parseJson, ApiStatus, jsonError } from "@/lib/http";
import { activityBatchSchema } from "@/schemas/activity";
import { trackActivity } from "@/lib/activity";
import { cosmosActivity } from "@/lib/cosmos";
import { getUserId, envFromQuery, cosmosErrorResponse } from "@/lib/cosmos-proxy";
import type { APIRoute } from "astro";

export const POST: APIRoute = async (ctx) => {
  const auth = await getUserId(ctx.request);
  if ("response" in auth) return auth.response;

  const body = await parseJson(ctx.request, activityBatchSchema).catch(() => null);
  if (!body || !body.ok) {
    return body?.response ?? jsonError({ message: "Invalid request", code: 400, status: ApiStatus.BAD_REQUEST });
  }

  trackActivity(
    auth.userId,
    envFromQuery(ctx.url),
    body.data.events.map((e) => ({ ...e, source: "dashboard" as const })),
  );

  return jsonSuccess({ data: { accepted: body.data.events.length }, message: "Events queued" });
};

export const GET: APIRoute = async (ctx) => {
  const auth = await getUserId(ctx.request);
  if ("response" in auth) return auth.response;

  const q = ctx.url.searchParams;
  const take = Number(q.get("take"));
  const skip = Number(q.get("skip"));

  try {
    const data = await cosmosActivity.list(auth.userId, envFromQuery(ctx.url), {
      source: q.get("source") ?? undefined,
      level: q.get("level") ?? undefined,
      category: q.get("category") ?? undefined,
      type: q.get("type") ?? undefined,
      network: q.get("network") ?? undefined,
      since: q.get("since") ?? undefined,
      until: q.get("until") ?? undefined,
      // A junk `?take=abc` must not become `take=NaN` in the upstream query,
      // which fails its validation and turns a cosmetic mistake into a 400.
      take: Number.isFinite(take) && take > 0 ? take : undefined,
      skip: Number.isFinite(skip) && skip > 0 ? skip : undefined,
    });
    return jsonSuccess({ data, message: "Activity fetched successfully" });
  } catch (err) {
    return cosmosErrorResponse(err);
  }
};
