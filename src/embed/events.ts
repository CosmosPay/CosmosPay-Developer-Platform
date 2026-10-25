/* events.ts — the DOM events both elements fire on themselves.

   `cosmospay:status` on every status change, then `cosmospay:paid` when that status is the
   settled one; both with `detail: { id, status }`, bubbling and composed, so a listener on
   the element or on the document hears them. They are UI hints only: any script on the page
   can dispatch the same events, so a merchant confirms a payment server-side (the webhook or
   the API), never from one of these. */
import { isPaidStatus, PAID_EVENT, STATUS_EVENT } from "@/lib/payments/embed-protocol";
import type { LinkStatus } from "@/lib/payments/payment-link";

export function emitStatus(target: EventTarget, id: string, status: LinkStatus): void {
  const init = () => ({ detail: { id, status }, bubbles: true, composed: true });
  target.dispatchEvent(new CustomEvent(STATUS_EVENT, init()));
  if (isPaidStatus(status)) target.dispatchEvent(new CustomEvent(PAID_EVENT, init()));
}
