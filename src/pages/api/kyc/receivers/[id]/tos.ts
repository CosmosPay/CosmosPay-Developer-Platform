/* POST /api/kyc/receivers/:id/tos — request a terms-of-service link for a receiver.

   More specific than the generic /api/kyc/[...path] proxy, so it wins for this path.
   It forwards to the Payments API (which rate-limits the email channel to once/day and
   returns the hosted ToS url), and when `channel: "email"` it actually sends the email
   here via the dashboard mailer (the Payments service has no mail transport). */
import { z } from "zod";
import type { APIRoute } from "astro";
import { auth } from "@/lib/auth";
import { ApiStatus, jsonError, jsonForbidden, jsonNotFound, jsonSuccess, jsonUnauthorized, parseJson } from "@/lib/http";
import { getMembership } from "@/lib/organizations";
import { isManagerRole } from "@/lib/org-permissions";
import { proxyCosmosRequest } from "@/lib/cosmos";
import { cosmosErrorResponse, envFromQuery, tosCooldownHeaders } from "@/lib/cosmos-proxy";
import { isMailConfigured, sendMail } from "@/lib/mailer";
import { renderTosEmail } from "@/lib/emails";

const bodySchema = z.object({
  channel: z.enum(["code", "email"]).default("code"),
  redirect_url: z.string().trim().url().max(2048),
});

export const POST: APIRoute = async (ctx) => {
  const session = await auth.api.getSession({ headers: ctx.request.headers });
  if (!session) return jsonUnauthorized("Session required");

  const id = ctx.params.id;
  if (!id) return jsonNotFound("Receiver not found");

  const org = ctx.url.searchParams.get("org");
  // The requester's org role tunes the resend cooldown (owner: immediate, admin: 1/min).
  let role: string | undefined;
  if (org) {
    const membership = await getMembership(org, session.user.id).catch(() => null);
    if (!membership) return jsonForbidden("You are not a member of this organization.");
    // Sending/resending terms is part of the approval gate: owners and admins only.
    if (!isManagerRole(membership.role)) {
      return jsonForbidden("Only an owner or admin can send KYC terms of service.");
    }
    role = membership.role;
  }

  const body = await parseJson(ctx.request, bodySchema).catch(() => null);
  if (!body || !body.ok) {
    return body?.response ?? jsonError({ message: "Invalid request", code: 400, status: ApiStatus.BAD_REQUEST });
  }

  try {
    // The Payments API enforces the resend cooldown for the email channel and returns the url.
    // The cooldown follows the requester's role via the trusted X-Cosmos-Tos-Cooldown-Ms header.
    const { json } = await proxyCosmosRequest({
      userId: session.user.id,
      env: envFromQuery(ctx.url),
      path: `kyc/receivers/${encodeURIComponent(id)}/tos`,
      method: "POST",
      bodyJson: { channel: body.data.channel, redirect_url: body.data.redirect_url },
      extraHeaders: tosCooldownHeaders(role),
    });

    const url: string | undefined = json?.url;
    const email: string | undefined = json?.email ?? undefined;

    if (body.data.channel === "email") {
      if (!email) {
        return jsonError({ message: "This receiver has no email on file to send the terms to.", code: 400, status: ApiStatus.BAD_REQUEST });
      }
      if (!isMailConfigured()) {
        return jsonError({ message: "Email delivery is not configured.", code: 503, status: ApiStatus.INTERNAL_ERROR });
      }
      const msg = renderTosEmail({ name: email.split("@")[0] || "there", url: url ?? "" });
      await sendMail({ to: email, subject: msg.subject, html: msg.html, text: msg.text });
      return jsonSuccess({ data: { channel: "email", emailed: true, email }, message: "Terms of service sent by email." });
    }

    // channel === "code": return the url for the dashboard to display.
    return jsonSuccess({ data: { channel: "code", url, email: email ?? null }, message: "OK" });
  } catch (err) {
    return cosmosErrorResponse(err);
  }
};
