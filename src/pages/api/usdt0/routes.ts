import { jsonSuccess } from "@/lib/http";
import { cosmosUsdt0 } from "@/lib/cosmos";
import { cosmosErrorResponse, envFromQuery, requireOrgMember } from "@/pages/api/usdt0/_helpers";
import type { APIRoute } from "astro";

/* The networks USDT0 reaches from Stellar (empty, with `available: false`, in the sandbox). */
export const GET: APIRoute = async (ctx) => {
  const gate = await requireOrgMember(ctx.request, ctx.url.searchParams.get("org"));
  if (!gate.ok) return gate.response;
  try {
    const routes = await cosmosUsdt0.routes(gate.userId, envFromQuery(ctx.url), gate.org);
    return jsonSuccess({ data: routes, message: "USDT0 routes fetched successfully" });
  } catch (err) {
    return cosmosErrorResponse(err);
  }
};
