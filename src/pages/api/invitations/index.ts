import { auth } from "@/lib/auth";
import { jsonError, jsonSuccess, jsonUnauthorized } from "@/lib/http";
import { listInvitationsForUserEmail } from "@/lib/invitations";
import type { APIRoute } from "astro";

/* GET /api/invitations — pending organization invitations addressed to the signed-in
   user's email, so they can join from inside the dashboard. */
export const GET: APIRoute = async (ctx) => {
  const session = await auth.api.getSession({ headers: ctx.request.headers });
  if (!session) return jsonUnauthorized("Session required");

  const invitations = await listInvitationsForUserEmail(session.user.email || "").catch(() => null);
  if (!invitations) return jsonError({ message: "Failed to load invitations", code: 500, status: "internal_error" });
  return jsonSuccess({ data: invitations, message: "Invitations loaded" });
};
