/* Amounts of a ZK payment. They travel as decimal strings (XLM, 7 decimals) and are proven in
   stroops. Pure, so it is unit-tested (tests/unit/zkAmounts.test.ts).

   ZK payments as a service cost 0.01% per transaction (1 basis point), taken from the payment:
   the payer pays the amount, the recipient receives it minus the commission (and the
   organization's own fee, when it has one), Cosmos Pay the commission. The Payments API
   computes the same split (ceil, at least one stroop) and is the authority; this copy only shows
   it before the payment exists. */

export const ZK_FEE_BPS = 1;
export const ZK_DECIMALS = 7;

/** "12.5" -> 125000000n. Refuses anything but plain digits and more decimals than the asset has. */
export function toUnits(amount: string, decimals = ZK_DECIMALS): bigint {
  const [whole, frac = "", extra] = amount.trim().split(".");
  if (extra !== undefined || !/^\d+$/.test(whole) || !/^\d*$/.test(frac) || frac.length > decimals) {
    throw new Error(`invalid amount ${amount}`);
  }
  return BigInt(whole) * 10n ** BigInt(decimals) + BigInt(frac.padEnd(decimals, "0") || "0");
}

/** 125000000n -> "12.5" (no trailing zeros). */
export function fromUnits(units: bigint, decimals = ZK_DECIMALS): string {
  const neg = units < 0n;
  const digits = (neg ? -units : units).toString().padStart(decimals + 1, "0");
  const whole = digits.slice(0, -decimals);
  const frac = digits.slice(-decimals).replace(/0+$/, "");
  return `${neg ? "-" : ""}${whole}${frac ? `.${frac}` : ""}`;
}

/** The commission on `units`: 0.01%, rounded up, at least one unit. */
export function zkFee(units: bigint, bps = ZK_FEE_BPS): bigint {
  if (units <= 0n) return 0n;
  const fee = (units * BigInt(bps) + 9999n) / 10000n;
  return fee > 0n ? fee : 1n;
}

/** The organization's own fee on a private payment: `bps` of the amount plus `fixed` units. */
export interface ZkMerchantTerms { bps: number; fixed: bigint; paidBy: "recipient" | "payer" }

/**
 * The split of a payment of `units`: Cosmos Pay's commission, the organization's own fee (the
 * percentage rounded down, plus the fixed part), what the recipient gets and what the payer pays.
 * The commission is a share of `units` either way; the organization's fee comes out of it
 * (`recipient`) or is paid on top (`payer`), as the API splits it.
 */
export function zkSplit(units: bigint, bps = ZK_FEE_BPS, merchant: ZkMerchantTerms | null = null): { fee: bigint; merchantFee: bigint; net: bigint; total: bigint } {
  const fee = zkFee(units, bps);
  const merchantFee = merchant ? (units * BigInt(merchant.bps)) / 10000n + merchant.fixed : 0n;
  const onTop = merchant?.paidBy === "payer";
  return { fee, merchantFee, net: units - fee - (onTop ? 0n : merchantFee), total: units + (onTop ? merchantFee : 0n) };
}
