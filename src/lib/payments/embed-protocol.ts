/* embed-protocol.ts — the contract between the hosted checkout and the merchant embed
   (src/embed, served as public/embed/cosmos-pay.js).

   One message crosses windows: when `<cosmos-pay-button>` opens the hosted checkout in a
   popup, the checkout (src/scripts/payments/checkout.ts) posts the link's status to
   `window.opener` every time it changes. Both sides import this module, so the shape is
   written once. Pure: unit-tested under plain node (tests/unit/embedProtocol.test.ts).

   The payload is the public id and the status, nothing else — no URI, address or amount.
   That is what lets the checkout post it with targetOrigin "*": anyone who can open the
   checkout for an id can already read both from the public `GET /v1/payment-links/{id}`.

   The element then re-dispatches it as DOM events on itself. Those events are UI hints for
   the merchant's page; a merchant confirms a payment server-side (webhook or API), never
   from an event a page script can fake. */
import { isLinkStatus, isPaymentLinkId, type LinkStatus } from "@/lib/payments/payment-link";

export const MESSAGE_SOURCE = "cosmos-pay";
export const MESSAGE_TYPE = "status";

export interface StatusMessage {
  source: typeof MESSAGE_SOURCE;
  type: typeof MESSAGE_TYPE;
  id: string;
  status: LinkStatus;
}

/** Fired on the element on every status change, `detail: { id, status }`. */
export const STATUS_EVENT = "cosmospay:status";
/** Fired on the element, after STATUS_EVENT, when the status is the settled one. */
export const PAID_EVENT = "cosmospay:paid";

/* The settled status: the server moves a link to SUCCEEDED once the payment is verified
   on-chain. SUBMITTED is not paid yet (the network may still refuse it). */
export const PAID_STATUS: LinkStatus = "SUCCEEDED";

export function isPaidStatus(status: LinkStatus): boolean {
  return status === PAID_STATUS;
}

/** The message the hosted checkout posts to its opener. */
export function statusMessage(id: string, status: LinkStatus): StatusMessage {
  return { source: MESSAGE_SOURCE, type: MESSAGE_TYPE, id, status };
}

/** What a `message` event carries, reduced to what the filter reads. */
export interface IncomingMessage {
  origin: string;
  source: unknown;
  data: unknown;
}

export interface ExpectedSender {
  /** The payments origin, e.g. `https://payments.cosmospay.lat`. */
  origin: string;
  /** The popup this element opened (the WindowProxy `window.open` returned). */
  source: unknown;
  /** The link that popup is showing. */
  id: string;
}

/**
 * The status inside a `message` event, or null when the event is not one the embed asked
 * for. Every check must pass: the payments origin (not a look-alike, not `null`), the very
 * window the element opened (another tab of the same origin is not it), the exact shape, a
 * known status, and the id the element opened. Only `id` and `status` are read back; any
 * other field in the data is ignored rather than passed on.
 */
export function readStatusMessage(
  event: IncomingMessage,
  expected: ExpectedSender,
): { id: string; status: LinkStatus } | null {
  if (!expected.origin || event.origin !== expected.origin) return null;
  if (expected.source == null || event.source !== expected.source) return null;
  const data = event.data;
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  const d = data as Record<string, unknown>;
  if (d.source !== MESSAGE_SOURCE || d.type !== MESSAGE_TYPE) return null;
  if (typeof d.id !== "string" || !isPaymentLinkId(d.id) || d.id !== expected.id) return null;
  if (!isLinkStatus(d.status)) return null;
  return { id: d.id, status: d.status };
}
