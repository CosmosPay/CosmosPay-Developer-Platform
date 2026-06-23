/* support-status.ts — ticket status + priority values, shared by server + client (no imports). */
export const TICKET_STATUSES = ["open", "pending", "resolved", "closed"] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

export function isTicketStatus(s: unknown): s is TicketStatus {
  return typeof s === "string" && (TICKET_STATUSES as readonly string[]).includes(s);
}

export const TICKET_PRIORITIES = ["low", "normal", "high", "urgent"] as const;
export type TicketPriority = (typeof TICKET_PRIORITIES)[number];

export function isTicketPriority(p: unknown): p is TicketPriority {
  return typeof p === "string" && (TICKET_PRIORITIES as readonly string[]).includes(p);
}
