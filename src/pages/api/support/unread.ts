import { auth } from "@/lib/auth";
import { jsonSuccess, jsonUnauthorized } from "@/lib/http";
import { countUnreadForUser } from "@/lib/support";
import type { APIRoute } from "astro";

/* GET /api/support/unread — number of unread support replies for the signed-in user
   (drives the sidebar dot). */
export const GET: APIRoute = async (ctx) => {
  const session = await auth.api.getSession({ headers: ctx.request.headers });
  if (!session) return jsonUnauthorized("Session required");
  const count = await countUnreadForUser(session.user.id).catch(() => 0);
  return jsonSuccess({ data: { count }, message: "OK" });
};
