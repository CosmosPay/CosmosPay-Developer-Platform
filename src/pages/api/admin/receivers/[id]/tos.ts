/* POST /api/admin/receivers/:id/tos — PLATFORM-ADMIN (owner) resend of the KYC verification
   (terms-of-service acceptance) email for ANY fiat receiver, across every organization.

   The org-scoped /api/kyc/receivers/:id/tos only works for a receiver in the caller's own org;
   the global Admin → Fiat view needs to resend the verification email for receivers belonging
   to other orgs. Only a platform owner/admin may call this. It forwards to the Payments admin
   endpoint (which enforces the pending_user gate + the once/day email limit and returns the
   hosted ToS url + customer email) and then sends the email here (the Payments service has no
   mail transport). More specific than the generic /api/admin/[...path] proxy, so it wins. */
import { z } from "zod";
import type { APIRoute } from "astro";
import { auth } from "@/lib/auth";
import { ApiStatus, jsonError, jsonForbidden, jsonNotFound, jsonSuccess, jsonUnauthorized, parseJson } from "@/lib/http";
import { canManageUsers, getRole } from "@/lib/profile";
import { proxyCosmosRequest } from "@/lib/cosmos";
import { cosmosErrorResponse, envFromQuery, tosCooldownHeaders } from "@/lib/cosmos-proxy";
import { isMailConfigured, sendMail } from "@/lib/mailer";
import { renderTosEmail } from "@/lib/emails";

const bodySchema = z.object({ redirect_url: z.string().trim().url().max(2048) });

export const POST: APIRoute = async (ctx) => {
  const session = await auth.api.getSession({ headers: ctx.request.headers });
  if (!session) return jsonUnauthorized("Session required");

  const id = ctx.params.id;
  if (!id) return jsonNotFound("Receiver not found");

  // Platform owner/admin only — the same gate as the rest of the admin surface. The role also
  // tunes the resend cooldown (owner: immediate, admin: 1/min).
  const role = await getRole(session.user.id).catch(() => "user" as const);
  if (!canManageUsers(role)) return jsonForbidden("Platform admin access required.");

  const body = await parseJson(ctx.request, bodySchema).catch(() => null);
  if (!body || !body.ok) {
    return body?.response ?? jsonError({ message: "Invalid request", code: 400, status: ApiStatus.BAD_REQUEST });
  }

  try {
    // Payments admin: enforces the pending_user gate + once/day email limit, returns url + email.
    const { json } = await proxyCosmosRequest({
      userId: session.user.id,
      env: envFromQuery(ctx.url),
      path: `admin/receivers/${encodeURIComponent(id)}/tos`,
      method: "POST",
      bodyJson: { channel: "email", redirect_url: body.data.redirect_url },
      admin: true,
      extraHeaders: tosCooldownHeaders(role),
    });

    const url: string | undefined = json?.url;
    const email: string | undefined = json?.email ?? undefined;
    if (!email) {
      return jsonError({ message: "This receiver has no email on file to send the terms to.", code: 400, status: ApiStatus.BAD_REQUEST });
    }
    if (!isMailConfigured()) {
      return jsonError({ message: "Email delivery is not configured.", code: 503, status: ApiStatus.INTERNAL_ERROR });
    }
    const msg = renderTosEmail({ name: email.split("@")[0] || "there", url: url ?? "" });
    await sendMail({ to: email, subject: msg.subject, html: msg.html, text: msg.text });
    return jsonSuccess({ data: { channel: "email", emailed: true, email }, message: "Verification email sent." });
  } catch (err) {
    return cosmosErrorResponse(err);
  }
};
