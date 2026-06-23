/* support.ts — in-dashboard support as a ticket system. A customer can open several
   tickets in parallel; each has a subject, a status (open | pending | resolved | closed)
   and its own message thread. Staff (owner/admin/support) reply and change the status. */
import { prisma } from "@/lib/prisma";
import { safeNotify } from "@/lib/notifications";
import { TICKET_STATUSES, isTicketStatus, type TicketStatus, TICKET_PRIORITIES, isTicketPriority, type TicketPriority } from "@/lib/support-status";

export { TICKET_STATUSES, isTicketStatus, type TicketStatus, TICKET_PRIORITIES, isTicketPriority, type TicketPriority };

/* ---------------- customer ---------------- */

export async function createTicket(userId: string, subject: string, body: string, senderName?: string | null) {
  const ticket = await prisma.supportTicket.create({ data: { userId, subject: subject.trim().slice(0, 140) || "Untitled", status: "open" } });
  await prisma.supportMessage.create({
    data: { ticketId: ticket.id, userId, senderId: userId, senderName: senderName ?? null, fromStaff: false, body: body.trim(), readByUser: true, readByStaff: false },
  });
  return ticket;
}

function summarize(t: { id: string; subject: string; status: string; priority: string; createdAt: Date; updatedAt: Date; messages: { body: string; fromStaff: boolean; createdAt: Date }[] }, unread: number) {
  return {
    id: t.id,
    subject: t.subject,
    status: t.status,
    priority: t.priority,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
    lastMessage: t.messages[0]?.body ?? "",
    lastFromStaff: t.messages[0]?.fromStaff ?? false,
    lastAt: t.messages[0]?.createdAt ?? t.updatedAt,
    unread,
  };
}

/* The customer's own tickets, newest activity first, each with last message + unread count. */
export async function listMyTickets(userId: string) {
  const tickets = await prisma.supportTicket.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    include: { messages: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  const unread = await prisma.supportMessage.groupBy({ by: ["ticketId"], where: { ticket: { userId }, fromStaff: true, readByUser: false }, _count: { _all: true } });
  const map = new Map(unread.map((g) => [g.ticketId, g._count._all]));
  return tickets.map((t) => summarize(t, map.get(t.id) ?? 0));
}

/* Staff: every ticket (optionally filtered by status), newest activity first. */
export async function listAllTickets(statusFilter?: string) {
  const where = isTicketStatus(statusFilter) ? { status: statusFilter } : {};
  const tickets = await prisma.supportTicket.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    take: 200,
    include: { user: { select: { id: true, name: true, email: true, image: true, profile: { select: { lastSeenAt: true } } } }, messages: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  const unread = await prisma.supportMessage.groupBy({ by: ["ticketId"], where: { fromStaff: false, readByStaff: false }, _count: { _all: true } });
  const map = new Map(unread.map((g) => [g.ticketId, g._count._all]));
  return tickets.map((t) => {
    const { profile, ...user } = t.user as { profile?: { lastSeenAt: Date | null } | null } & Record<string, unknown>;
    return { ...summarize(t, map.get(t.id) ?? 0), user, lastSeen: profile?.lastSeenAt ?? null };
  });
}

export async function getTicket(ticketId: string) {
  return prisma.supportTicket.findUnique({ where: { id: ticketId } });
}

export async function listTicketMessages(ticketId: string, limit = 500) {
  return prisma.supportMessage.findMany({ where: { ticketId }, orderBy: { createdAt: "asc" }, take: limit });
}

export async function sendTicketMessage(ticketId: string, input: { senderId: string; senderName?: string | null; fromStaff: boolean; body: string }) {
  const ticket = await prisma.supportTicket.findUnique({ where: { id: ticketId } });
  if (!ticket) return null;
  const msg = await prisma.supportMessage.create({
    data: {
      ticketId,
      userId: ticket.userId,
      senderId: input.senderId,
      senderName: input.senderName ?? null,
      fromStaff: input.fromStaff,
      body: input.body.trim(),
      readByUser: !input.fromStaff,
      readByStaff: input.fromStaff,
    },
  });
  // Keep the status sensible: a customer reply reopens a resolved/closed ticket; a staff
  // reply on a brand-new ticket moves it to "pending" (awaiting the customer).
  let status = ticket.status;
  if (!input.fromStaff && (ticket.status === "resolved" || ticket.status === "closed")) status = "open";
  if (input.fromStaff && ticket.status === "open") status = "pending";
  await prisma.supportTicket.update({ where: { id: ticketId }, data: { status } });
  // Notify the customer when staff replies, so it surfaces in their bell + activity feed.
  if (input.fromStaff) {
    safeNotify({ userId: ticket.userId, type: "support.reply", title: "New support reply", message: input.body.trim().slice(0, 140), metadata: { ticketId } });
  }
  return msg;
}

/* Total unread support messages (staff → this user) across all their tickets. */
export async function countUnreadForUser(userId: string) {
  return prisma.supportMessage.count({ where: { ticket: { userId }, fromStaff: true, readByUser: false } });
}

export async function setTicketStatus(ticketId: string, status: TicketStatus) {
  return prisma.supportTicket.update({ where: { id: ticketId }, data: { status } });
}

/* Staff: update a ticket's status and/or priority. */
export async function updateTicket(ticketId: string, data: { status?: TicketStatus; priority?: TicketPriority }) {
  const patch: { status?: string; priority?: string } = {};
  if (data.status && isTicketStatus(data.status)) patch.status = data.status;
  if (data.priority && isTicketPriority(data.priority)) patch.priority = data.priority;
  if (!("status" in patch) && !("priority" in patch)) return getTicket(ticketId);
  return prisma.supportTicket.update({ where: { id: ticketId }, data: patch });
}

/* Mark the other side's messages in a ticket as read, stamping when they were read.
   The read flag (an original column) and the timestamp (a newer column) are updated
   separately so the read flag still works on an older generated Prisma client. */
export async function markTicketRead(ticketId: string, asStaff: boolean) {
  const now = new Date();
  const fromStaff = !asStaff; // we mark the OTHER side's messages
  const flag = asStaff ? "readByStaff" : "readByUser";
  const stamp = asStaff ? "readByStaffAt" : "readByUserAt";
  const res = await prisma.supportMessage.updateMany({ where: { ticketId, fromStaff, [flag]: false }, data: { [flag]: true } });
  // Best-effort timestamp (separate query so a stale client doesn't break the read flag).
  await prisma.supportMessage.updateMany({ where: { ticketId, fromStaff, [stamp]: null }, data: { [stamp]: now } }).catch(() => {});
  return res;
}
