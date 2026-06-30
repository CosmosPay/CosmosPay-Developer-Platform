/* POST /api/kyc/receivers/:id/approve — OUR review gate for a fiat (KYC/KYB) receiver.

   Only an organization OWNER or ADMIN may approve a `pending_review` receiver. Approving
   moves it to `pending_user` in the Payments API and returns BlindPay's hosted terms-of-
   service link, which we email to the customer here (the Payments service has no mailer).
   The customer then accepts the terms (→ /kyc/return → enable), and BlindPay does the
   actual KYC approval. More specific than the generic /api/kyc/[...path] proxy. */
import { z } from "zod";
import type { APIRoute } from "astro";
import { auth } from "@/lib/auth";
import { ApiStatus, jsonError, jsonForbidden, jsonNotFound, jsonSuccess, jsonUnauthorized, parseJson } from "@/lib/http";
import { getMembership } from "@/lib/organizations";
import { isManagerRole } from "@/lib/org-permissions";
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

  const org = ctx.url.searchParams.get("org");
  if (!org) return jsonError({ message: "An organization is required", code: 400, status: ApiStatus.BAD_REQUEST });
  const membership = await getMembership(org, session.user.id).catch(() => null);
  if (!membership) return jsonForbidden("You are not a member of this organization.");
  // The KYC review/approval gate: owners and admins only.
  if (!isManagerRole(membership.role)) {
    return jsonForbidden("Only an owner or admin can approve KYC verifications.");
  }

  const body = await parseJson(ctx.request, bodySchema).catch(() => null);
  if (!body || !body.ok) {
    return body?.response ?? jsonError({ message: "Invalid request", code: 400, status: ApiStatus.BAD_REQUEST });
  }

  try {
    // Payments: pending_review → pending_user, returns the hosted ToS url + customer email.
    const { json } = await proxyCosmosRequest({
      userId: session.user.id,
      env: envFromQuery(ctx.url),
      path: `kyc/receivers/${encodeURIComponent(id)}/approve`,
      method: "POST",
      bodyJson: { redirect_url: body.data.redirect_url },
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
