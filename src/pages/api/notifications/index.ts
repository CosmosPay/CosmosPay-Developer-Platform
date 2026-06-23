import { z } from "zod";
import { auth } from "@/lib/auth";
import {
  ApiStatus,
  jsonCreated,
  jsonError,
  jsonForbidden,
  jsonSuccess,
  jsonUnauthorized,
  parseJson,
} from "@/lib/http";
import { createNotification, listNotifications } from "@/lib/notifications";
import { canCreateNotifications, getRole } from "@/lib/profile";
import { geoLocate } from "@/lib/geo";
import type { APIRoute } from "astro";

/* GET /api/notifications — list the signed-in user's activity notifications. */
export const GET: APIRoute = async (ctx) => {
  const session = await auth.api.getSession({ headers: ctx.request.headers });
  if (!session) return jsonUnauthorized("Session required");

  const items = await listNotifications(session.user.id).catch(() => null);
  if (!items) {
    return jsonError({ message: "Failed to fetch notifications", code: 500, status: "internal_error" });
  }

  return jsonSuccess({
    data: items,
    message: "Notifications fetched successfully",
    status: ApiStatus.SUCCESS,
    code: 200,
  });
};

const createNotificationBodySchema = z.object({
  type: z.string().trim().min(1).max(60).default("custom"),
  title: z.string().trim().min(1).max(120),
  message: z.string().trim().max(500).optional(),
});

/* POST /api/notifications — create a notification. Restricted to owner/admin accounts;
   regular ("user") accounts can only read, since the system generates their notifications. */
export const POST: APIRoute = async (ctx) => {
  const session = await auth.api.getSession({ headers: ctx.request.headers });
  if (!session) return jsonUnauthorized("Session required");

  const role = await getRole(session.user.id).catch(() => "user" as const);

  if (!canCreateNotifications(role)) {
    return jsonForbidden("Only owner or admin accounts can create notifications");
  }

  const body = await parseJson(ctx.request, createNotificationBodySchema).catch(() => null);

  if (!body || !body.ok) {
    return body?.response ?? jsonError({ message: "Invalid request", code: 400, status: "bad_request" });
  }

  const loc = await geoLocate(ctx.request.headers, ctx.clientAddress).catch(() => null);

  const created = await createNotification({
    userId: session.user.id,
    type: body.data.type,
    title: body.data.title,
    message: body.data.message ?? null,
    origin: loc?.origin ?? null,
    country: loc?.country ?? null,
    region: loc?.region ?? null,
    ipAddress: loc?.ip ?? null,
    metadata: { city: loc?.city ?? null, publicIp: loc?.publicIp ?? null, userAgent: loc?.userAgent ?? null, local: loc?.isLocal ?? false },
  }).catch(() => null);

  if (!created) {
    return jsonError({ message: "Failed to create notification", code: 500, status: "internal_error" });
  }
  return jsonCreated({ data: created, message: "Notification created successfully" });
};
