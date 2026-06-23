import { z } from "zod";
import { auth } from "@/lib/auth";
import { jsonCreated, jsonError, jsonSuccess, jsonUnauthorized, parseJson } from "@/lib/http";
import { createTicket, listMyTickets } from "@/lib/support";
import type { APIRoute } from "astro";

/* GET /api/support/tickets — the signed-in customer's own tickets. */
export const GET: APIRoute = async (ctx) => {
  const session = await auth.api.getSession({ headers: ctx.request.headers });
  if (!session) return jsonUnauthorized("Session required");

  const tickets = await listMyTickets(session.user.id).catch(() => null);
  if (!tickets) return jsonError({ message: "Failed to load tickets", code: 500, status: "internal_error" });
  return jsonSuccess({ data: tickets, message: "Tickets loaded" });
};

const createBodySchema = z.object({
  subject: z.string().trim().min(1).max(140),
  body: z.string().trim().min(1).max(4000),
});

/* POST /api/support/tickets — open a new ticket with its first message. */
export const POST: APIRoute = async (ctx) => {
  const session = await auth.api.getSession({ headers: ctx.request.headers });
  if (!session) return jsonUnauthorized("Session required");

  const body = await parseJson(ctx.request, createBodySchema).catch(() => null);
  if (!body || !body.ok) {
    return body?.response ?? jsonError({ message: "Invalid request", code: 400, status: "bad_request" });
  }

  const ticket = await createTicket(session.user.id, body.data.subject, body.data.body, session.user.name).catch(() => null);
  if (!ticket) return jsonError({ message: "Failed to open ticket", code: 500, status: "internal_error" });
  return jsonCreated({ data: { id: ticket.id, subject: ticket.subject, status: ticket.status }, message: "Ticket opened" });
};
