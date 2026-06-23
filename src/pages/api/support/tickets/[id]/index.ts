import { z } from "zod";
import { auth } from "@/lib/auth";
import { jsonCreated, jsonError, jsonForbidden, jsonNotFound, jsonSuccess, jsonUnauthorized, parseJson } from "@/lib/http";
import { getRole, isStaff } from "@/lib/profile";
import { getTicket, listTicketMessages, markTicketRead, sendTicketMessage, updateTicket, TICKET_STATUSES, TICKET_PRIORITIES } from "@/lib/support";
import type { APIRoute } from "astro";

const paramsSchema = z.object({ id: z.string().min(1) });

/* Resolve the ticket + whether the caller may access it (owner or staff). */
async function authorize(ctx: Parameters<APIRoute>[0]) {
  const session = await auth.api.getSession({ headers: ctx.request.headers });
  if (!session) return { error: jsonUnauthorized("Session required") } as const;
  const params = paramsSchema.safeParse(ctx.params);
  if (!params.success) return { error: jsonNotFound("Ticket not found") } as const;
  const ticket = await getTicket(params.data.id).catch(() => null);
  if (!ticket) return { error: jsonNotFound("Ticket not found") } as const;
  const staff = isStaff(await getRole(session.user.id).catch(() => "user" as const));
  if (ticket.userId !== session.user.id && !staff) return { error: jsonForbidden("You can't access this ticket") } as const;
  return { session, ticket, staff } as const;
}

/* GET /api/support/tickets/:id — the ticket's messages (owner or staff). Marks the other
   side's messages read. */
export const GET: APIRoute = async (ctx) => {
  const a = await authorize(ctx);
  if ("error" in a) return a.error;

  const messages = await listTicketMessages(a.ticket.id).catch(() => null);
  if (!messages) return jsonError({ message: "Failed to load ticket", code: 500, status: "internal_error" });
  await markTicketRead(a.ticket.id, a.staff).catch(() => {});
  return jsonSuccess({ data: { id: a.ticket.id, subject: a.ticket.subject, status: a.ticket.status, priority: a.ticket.priority, messages }, message: "Ticket loaded" });
};

const sendBodySchema = z.object({ body: z.string().trim().min(1).max(4000) });

/* POST /api/support/tickets/:id — add a message (owner or staff). */
export const POST: APIRoute = async (ctx) => {
  const a = await authorize(ctx);
  if ("error" in a) return a.error;

  const body = await parseJson(ctx.request, sendBodySchema).catch(() => null);
  if (!body || !body.ok) {
    return body?.response ?? jsonError({ message: "Invalid request", code: 400, status: "bad_request" });
  }

  const created = await sendTicketMessage(a.ticket.id, {
    senderId: a.session.user.id,
    senderName: a.session.user.name,
    fromStaff: a.staff,
    body: body.data.body,
  }).catch(() => null);
  if (!created) return jsonError({ message: "Failed to send message", code: 500, status: "internal_error" });
  return jsonCreated({ data: created, message: "Message sent" });
};

const patchBodySchema = z.object({
  status: z.enum(TICKET_STATUSES as unknown as [string, ...string[]]).optional(),
  priority: z.enum(TICKET_PRIORITIES as unknown as [string, ...string[]]).optional(),
});

/* PATCH /api/support/tickets/:id — change the ticket status and/or priority (staff only). */
export const PATCH: APIRoute = async (ctx) => {
  const a = await authorize(ctx);
  if ("error" in a) return a.error;
  if (!a.staff) return jsonForbidden("Staff access required");

  const body = await parseJson(ctx.request, patchBodySchema).catch(() => null);
  if (!body || !body.ok) {
    return body?.response ?? jsonError({ message: "Invalid request", code: 400, status: "bad_request" });
  }

  const updated = await updateTicket(a.ticket.id, { status: body.data.status as never, priority: body.data.priority as never }).catch(() => null);
  if (!updated) return jsonError({ message: "Failed to update ticket", code: 500, status: "internal_error" });
  return jsonSuccess({ data: { id: updated.id, status: updated.status, priority: updated.priority }, message: "Ticket updated" });
};
