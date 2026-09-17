/* OpenAPI registration for the support desk (src/pages/api/support/**).

   Access has two shapes here and the reference should say which is which: a customer
   reaches their OWN tickets, staff (owner/admin/support) reach every ticket. Both use the
   same `/api/support/tickets/{id}` routes — the difference is who is answered 403 — while
   `/api/support/admin/tickets` is staff-only by definition.

   The status/priority vocabularies are imported from lib/support-status.ts so the
   documented enums cannot drift from the ones the handler validates against. */
import {
  errors,
  jsonCreated,
  jsonOk,
  registerRoutes,
  sessionSecurity,
} from '@/lib/openapi/route-helpers';
import { z } from '@/lib/openapi/zod';
import { TICKET_PRIORITIES, TICKET_STATUSES } from '@/lib/support-status';
import { idParam, jsonBody } from '@/schemas/shared/openapi-params';

const TAG = 'Support';

const ticketStatus = z
  .enum(TICKET_STATUSES as unknown as [string, ...string[]])
  .openapi('TicketStatus', { example: 'open' });

const ticketPriority = z
  .enum(TICKET_PRIORITIES as unknown as [string, ...string[]])
  .openapi('TicketPriority', { example: 'normal' });

const ticketSummarySchema = z
  .object({
    id: z.string().openapi({ example: 'tkt_clx9z8a1b0000' }),
    subject: z.string().openapi({ example: 'Webhook retries stopped' }),
    status: ticketStatus,
    priority: ticketPriority,
    createdAt: z.string().openapi({ example: '2026-09-17T12:34:56.000Z' }),
    updatedAt: z.string().openapi({ example: '2026-09-17T13:00:00.000Z' }),
    lastMessage: z.string().openapi({ example: 'We re-queued the failed deliveries.' }),
    lastFromStaff: z.boolean().openapi({ example: true }),
    lastAt: z.string().openapi({ example: '2026-09-17T13:00:00.000Z' }),
    unread: z
      .number()
      .int()
      .openapi({ example: 1, description: "Messages from the other side this caller hasn't read." }),
  })
  .openapi('SupportTicketSummary', { description: 'A ticket as the list shows it.' });

/* The staff list carries the customer behind the ticket; the customer's own list does not
   (they are the customer). */
const staffTicketSummarySchema = ticketSummarySchema
  .extend({
    user: z
      .object({
        id: z.string().openapi({ example: 'usr_abc' }),
        name: z.string().nullable().openapi({ example: 'Ada Lovelace' }),
        email: z.string().nullable().openapi({ example: 'ada@example.com' }),
        image: z.string().nullable().openapi({ example: null }),
      })
      .openapi({ description: 'The customer who opened the ticket.' }),
    lastSeen: z.string().nullable().openapi({ example: '2026-09-17T12:50:00.000Z' }),
  })
  .openapi('SupportTicketStaffSummary', { description: 'A ticket as the staff inbox shows it.' });

const messageSchema = z
  .object({
    id: z.string().openapi({ example: 'msg_clx9z8a1b0000' }),
    ticketId: z.string().openapi({ example: 'tkt_clx9z8a1b0000' }),
    userId: z.string().openapi({ example: 'usr_abc', description: 'The ticket owner.' }),
    senderId: z.string().openapi({ example: 'usr_staff' }),
    senderName: z.string().nullable().openapi({ example: 'Cosmos Support' }),
    fromStaff: z.boolean().openapi({ example: true }),
    body: z.string().openapi({ example: 'We re-queued the failed deliveries.' }),
    readByUser: z.boolean().openapi({ example: false }),
    readByStaff: z.boolean().openapi({ example: true }),
    readByUserAt: z.string().nullable().openapi({ example: null }),
    readByStaffAt: z.string().nullable().openapi({ example: '2026-09-17T13:00:05.000Z' }),
    createdAt: z.string().openapi({ example: '2026-09-17T13:00:00.000Z' }),
  })
  .openapi('SupportMessage', { description: 'One message in a ticket thread.' });

const ticketThreadSchema = z
  .object({
    id: z.string().openapi({ example: 'tkt_clx9z8a1b0000' }),
    subject: z.string().openapi({ example: 'Webhook retries stopped' }),
    status: ticketStatus,
    priority: ticketPriority,
    messages: z.array(messageSchema).openapi({ description: 'Oldest first, up to 500.' }),
  })
  .openapi('SupportTicketThread');

registerRoutes([
  {
    method: 'get',
    path: '/api/support/tickets',
    tags: [TAG],
    summary: 'List my tickets',
    description:
      "The signed-in customer's own tickets, most recent activity first, each with its last message and unread count.",
    security: sessionSecurity,
    responses: {
      200: jsonOk(z.array(ticketSummarySchema), 'ListSupportTicketsResponse', 'Tickets loaded'),
      401: errors.unauthorized,
      500: errors.internalError,
    },
  },
  {
    method: 'post',
    path: '/api/support/tickets',
    tags: [TAG],
    summary: 'Open a ticket',
    description: 'Opens a ticket with its first message.',
    security: sessionSecurity,
    request: jsonBody(
      z
        .object({
          subject: z.string().max(140).openapi({ example: 'Webhook retries stopped' }),
          body: z.string().max(4000).openapi({ example: 'Deliveries have been failing since 12:00 UTC.' }),
        })
        .openapi('CreateSupportTicketBody'),
    ),
    responses: {
      201: jsonCreated(
        z.object({
          id: z.string().openapi({ example: 'tkt_clx9z8a1b0000' }),
          subject: z.string().openapi({ example: 'Webhook retries stopped' }),
          status: ticketStatus,
        }),
        'CreateSupportTicketResponse',
        'Ticket opened',
      ),
      400: errors.badRequest,
      401: errors.unauthorized,
      500: errors.internalError,
    },
  },
  {
    method: 'get',
    path: '/api/support/tickets/{id}',
    tags: [TAG],
    summary: 'Read a ticket',
    description:
      "The thread, oldest message first. Readable by the ticket owner or by staff; anyone else is answered 403. Reading also marks the OTHER side's messages as read.",
    security: sessionSecurity,
    request: { params: idParam },
    responses: {
      200: jsonOk(ticketThreadSchema, 'GetSupportTicketResponse', 'Ticket loaded'),
      401: errors.unauthorized,
      403: errors.forbidden,
      404: errors.notFound,
      500: errors.internalError,
    },
  },
  {
    method: 'post',
    path: '/api/support/tickets/{id}',
    tags: [TAG],
    summary: 'Reply to a ticket',
    description:
      'Adds a message. Owner or staff; `fromStaff` is decided by the caller\'s role, never by the body.',
    security: sessionSecurity,
    request: {
      params: idParam,
      ...jsonBody(
        z
          .object({ body: z.string().max(4000).openapi({ example: 'Thanks — retries are flowing again.' }) })
          .openapi('SendSupportMessageBody'),
      ),
    },
    responses: {
      201: jsonCreated(messageSchema, 'SendSupportMessageResponse', 'Message sent'),
      400: errors.badRequest,
      401: errors.unauthorized,
      403: errors.forbidden,
      404: errors.notFound,
      500: errors.internalError,
    },
  },
  {
    method: 'patch',
    path: '/api/support/tickets/{id}',
    tags: [TAG],
    summary: 'Change status or priority',
    description: 'Staff only (owner/admin/support). A customer is answered 403.',
    security: sessionSecurity,
    request: {
      params: idParam,
      ...jsonBody(
        z
          .object({ status: ticketStatus.optional(), priority: ticketPriority.optional() })
          .openapi('UpdateSupportTicketBody'),
      ),
    },
    responses: {
      200: jsonOk(
        z.object({
          id: z.string().openapi({ example: 'tkt_clx9z8a1b0000' }),
          status: ticketStatus,
          priority: ticketPriority,
        }),
        'UpdateSupportTicketResponse',
        'Ticket updated',
      ),
      400: errors.badRequest,
      401: errors.unauthorized,
      403: errors.forbidden,
      404: errors.notFound,
      500: errors.internalError,
    },
  },
  {
    method: 'get',
    path: '/api/support/unread',
    tags: [TAG],
    summary: 'Unread reply count',
    description: 'Number of unread staff replies for the signed-in account — drives the sidebar dot.',
    security: sessionSecurity,
    responses: {
      200: jsonOk(
        z.object({ count: z.number().int().openapi({ example: 2 }) }),
        'SupportUnreadResponse',
        'OK',
      ),
      401: errors.unauthorized,
    },
  },
  {
    method: 'get',
    path: '/api/support/admin/tickets',
    tags: [TAG],
    summary: 'List every ticket (staff)',
    description:
      'The staff inbox: up to 200 tickets, most recent activity first, each with the customer behind it. Staff only. An unknown `status` is ignored rather than rejected.',
    security: sessionSecurity,
    request: {
      query: z.object({
        status: z
          .enum(TICKET_STATUSES as unknown as [string, ...string[]])
          .optional()
          .openapi({ param: { name: 'status', in: 'query' }, example: 'open' }),
      }),
    },
    responses: {
      200: jsonOk(
        z.array(staffTicketSummarySchema),
        'ListAllSupportTicketsResponse',
        'Tickets loaded',
      ),
      401: errors.unauthorized,
      403: errors.forbidden,
      500: errors.internalError,
    },
  },
]);
