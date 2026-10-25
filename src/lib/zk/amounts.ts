/* Amounts of a ZK payment. They travel as decimal strings (XLM, 7 decimals) and are proven in
   stroops. Pure, so it is unit-tested (tests/unit/zkAmounts.test.ts).

   ZK payments as a service cost 0.01% per transaction (1 basis point), taken from the payment:
   the payer pays the amount, the merchant receives it minus the commission, Cosmos Pay the
   commission. The Payments API computes the same split (ceil, at least one stroop) and is the
   authority; this copy only shows it before the payment exists. */

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

/** The split of a payment of `units`: what the merchant gets and what Cosmos Pay gets. */
export function zkSplit(units: bigint, bps = ZK_FEE_BPS): { fee: bigint; net: bigint } {
  const fee = zkFee(units, bps);
  return { fee, net: units - fee };
}
