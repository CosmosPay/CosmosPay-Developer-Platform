/* POST /api/admin/receivers/:id/approve — PLATFORM-ADMIN (owner) review gate for ANY
   fiat receiver, across every organization.

   The org-scoped /api/kyc/receivers/:id/approve only works for a receiver in the caller's
   own org; the global Admin → Fiat view needs to approve receivers belonging to other
   orgs. Only a platform owner/admin may call this. It moves the receiver pending_review →
   pending_user in the Payments API (via the admin endpoint, no consumer scoping) and emails
   the customer BlindPay's hosted terms-of-service link (the Payments service has no mailer).
   More specific than the generic /api/admin/[...path] proxy, so it wins for this path. */
import { z } from "zod";
import type { APIRoute } from "astro";
import { auth } from "@/lib/auth";
import { ApiStatus, jsonError, jsonForbidden, jsonNotFound, jsonSuccess, jsonUnauthorized, parseJson } from "@/lib/http";
import { canManageUsers, getRole } from "@/lib/profile";
import { proxyCosmosRequest } from "@/lib/cosmos";
import { cosmosErrorResponse, envFromQuery } from "@/lib/cosmos-proxy";
import { isMailConfigured, sendMail } from "@/lib/mailer";
import { renderTosEmail } from "@/lib/emails";

const bodySchema = z.object({ redirect_url: z.string().trim().url().max(2048) });

export const POST: APIRoute = async (ctx) => {
  const session = await auth.api.getSession({ headers: ctx.request.headers });
  if (!session) return jsonUnauthorized("Session required");

  const id = ctx.params.id;
  if (!id) return jsonNotFound("Receiver not found");

  // Platform owner/admin only — the same gate as the rest of the admin surface.
  const role = await getRole(session.user.id).catch(() => "user" as const);
  if (!canManageUsers(role)) return jsonForbidden("Platform admin access required.");

  const body = await parseJson(ctx.request, bodySchema).catch(() => null);
  if (!body || !body.ok) {
    return body?.response ?? jsonError({ message: "Invalid request", code: 400, status: ApiStatus.BAD_REQUEST });
  }

  try {
    // Payments admin: pending_review → pending_user (any consumer); returns ToS url + email.
    const { json } = await proxyCosmosRequest({
      userId: session.user.id,
      env: envFromQuery(ctx.url),
      path: `admin/receivers/${encodeURIComponent(id)}/approve`,
      method: "POST",
      bodyJson: { redirect_url: body.data.redirect_url },
      admin: true,
    });

    const url: string | undefined = json?.url;
    const email: string | undefined = json?.email ?? undefined;
    let emailed = false;
    if (email && url && isMailConfigured()) {
      try {
        const msg = renderTosEmail({ name: email.split("@")[0] || "there", url });
        await sendMail({ to: email, subject: msg.subject, html: msg.html, text: msg.text });
        emailed = true;
      } catch {
        emailed = false;
      }
    }

    return jsonSuccess({
      data: { approved: true, emailed, email: email ?? null, receiver: json?.receiver ?? null },
      message: emailed ? "Approved — terms of service sent to the customer." : "Approved.",
    });
  } catch (err) {
    return cosmosErrorResponse(err);
  }
};
