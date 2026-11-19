/* orders.ts: what a P2P order's status means on screen (its tone, whether it is over, which
   deadline is running) and which actions each side may take on it, as the contract allows them.
   Pure; tests/unit/p2pOrders.test.ts.

   The contract's rules (design section 1): `release` from Active or Paid by the seller (or its
   PERM_RELEASE bot); `markPaid` by the buyer side before the payment deadline; `accept` by the
   buyer of a bonded order; `cancel` while Offered by either side, while Active by the buyer side,
   while Paid only by the buyer; `dispute` from Paid by the buyer side, or by the seller inside a
   settle window. On a purchase (BUY, CHARGE) the merchant is the seller and Cosmos Pay acts for
   the buyer; on a sale or a payout (SELL, PAYOUT) the merchant is the buyer. */
import type { P2pOrder, P2pOrderKind, P2pOrderStatus } from "@/lib/p2p/types";

export type OrderTone = "ok" | "fail" | "wait" | "off";

const TERMINAL: readonly P2pOrderStatus[] = ["completed", "cancelled", "expired", "resolved", "failed"];

export function isTerminal(status: string): boolean {
  return (TERMINAL as readonly string[]).includes(status);
}

/** The status's mark: done (completed, resolved), failed (failed, expired, cancelled), off while a
    dispute waits for review, waiting otherwise. */
export function orderTone(status: string): OrderTone {
  if (status === "completed" || status === "resolved") return "ok";
  if (status === "failed" || status === "expired" || status === "cancelled") return "fail";
  if (status === "disputed") return "off";
  return "wait";
}

/** The Pill colour the dashboard draws for a status (ok, pend, fail, ref). */
export function orderPill(status: string): "ok" | "pend" | "fail" | "ref" {
  const tone = orderTone(status);
  return tone === "ok" ? "ok" : tone === "fail" ? "fail" : tone === "off" ? "ref" : "pend";
}

/** The deadline running now, or null: acceptance while a bonded order waits for its merchant,
    payment while it is active, the settle window once paid (a sale's). */
export function activeDeadline(order: Pick<P2pOrder, "status" | "deadlines">): { kind: "accept" | "pay" | "settle"; at: string } | null {
  const d = order.deadlines ?? { acceptBy: null, payBy: null, settleBy: null };
  if (order.status === "awaiting_acceptance" && d.acceptBy) return { kind: "accept", at: d.acceptBy };
  if (order.status === "awaiting_payment" && d.payBy) return { kind: "pay", at: d.payBy };
  if (order.status === "paid" && d.settleBy) return { kind: "settle", at: d.settleBy };
  return null;
}

/** Milliseconds left until `at` (never below zero), from `now`. */
export function msLeft(at: string | null | undefined, now = Date.now()): number {
  const t = at ? Date.parse(at) : NaN;
  return Number.isFinite(t) ? Math.max(0, t - now) : 0;
}

/** A countdown as m:ss, or h:mm:ss from an hour up. */
export function countdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

/** Whether the merchant is the seller of an order of this kind (it sold tokens for local money). */
export const merchantSells = (kind: P2pOrderKind) => kind === "BUY" || kind === "CHARGE";

export type MerchantAction = "accept" | "markPaid" | "release" | "cancel" | "dispute";

/** What the merchant can do on its order now, signed with its wallet. On a purchase it releases
    once the money arrived (also before Cosmos Pay marks it paid); on a sale or payout it accepts,
    pays the beneficiary and marks it paid, declines or cancels before paying, and disputes once
    paid. */
export function merchantActions(order: Pick<P2pOrder, "kind" | "status" | "deadlines">, now = Date.now()): MerchantAction[] {
  const live = (at: string | null) => !at || msLeft(at, now) > 0;
  if (merchantSells(order.kind)) {
    if (order.status === "awaiting_payment" || order.status === "paid") {
      const actions: MerchantAction[] = ["release"];
      if (order.status === "paid" && order.deadlines?.settleBy && live(order.deadlines.settleBy)) actions.push("dispute");
      return actions;
    }
    return [];
  }
  switch (order.status) {
    case "awaiting_acceptance":
      return live(order.deadlines?.acceptBy ?? null) ? ["accept", "cancel"] : ["cancel"];
    case "awaiting_payment":
      return live(order.deadlines?.payBy ?? null) ? ["markPaid", "cancel"] : ["cancel"];
    case "paid":
      return ["dispute"];
    default:
      return [];
  }
}

export type ClientAction = "paid" | "cancel" | "dispute" | "release";

/** What the client (the organization that created the order for its user) can do now. A
    purchase: report the transfer, cancel before paying, dispute once paid. A payout (the client is
    the seller): cancel before the merchant accepts, release once the merchant marked it paid,
    dispute inside a settle window. A sale is its user's: the user's wallet releases or cancels it,
    so the client only follows it. */
export function clientActions(order: Pick<P2pOrder, "kind" | "status" | "deadlines">, now = Date.now()): ClientAction[] {
  if (merchantSells(order.kind)) {
    if (order.status === "awaiting_payment") return msLeft(order.deadlines?.payBy, now) > 0 || !order.deadlines?.payBy ? ["paid", "cancel"] : ["cancel"];
    if (order.status === "paid") return ["dispute"];
    return [];
  }
  if (order.kind === "SELL") return [];
  switch (order.status) {
    case "awaiting_acceptance":
      return ["cancel"];
    case "awaiting_payment":
      return [];
    case "paid": {
      const settle = order.deadlines?.settleBy;
      return settle && msLeft(settle, now) > 0 ? ["release", "dispute"] : ["release"];
    }
    default:
      return [];
  }
}

/** How often to read an order again while it moves: every 4 s while something is about to
    happen on-chain, 10 s while a person has to act, never once it is over. */
export function pollDelay(status: string): number | null {
  if (isTerminal(status)) return null;
  return status === "pending" ? 4000 : 10000;
}
