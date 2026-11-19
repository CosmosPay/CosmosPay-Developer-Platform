/* amounts.ts: token amounts between what people type (a decimal string, "12.5") and what the
   contract counts (base units, "12500000" for a 6-decimal token), without floating point, and the
   local-money amounts the P2P market quotes. Pure; tests/unit/p2pAmounts.test.ts. */
import { fiatDecimals } from "@/lib/p2p/rails";

const DECIMAL = /^(0|[1-9]\d*)(\.\d+)?$/;
const UNITS = /^(0|[1-9]\d*)$/;

/** A positive-or-zero decimal string with at most `decimals` places, else null. */
export function parseDecimal(value: string, decimals: number): string | null {
  const v = String(value ?? "").trim().replace(",", ".");
  if (!DECIMAL.test(v)) return null;
  const frac = v.split(".")[1] ?? "";
  return frac.length <= decimals ? v : null;
}

/** "12.5" with 6 decimals → "12500000"; null for anything that is not such an amount. */
export function toBaseUnits(value: string, decimals: number): string | null {
  const v = parseDecimal(value, decimals);
  if (v === null) return null;
  const [whole, frac = ""] = v.split(".");
  const units = `${whole}${frac.padEnd(decimals, "0")}`.replace(/^0+(?=\d)/, "");
  return units;
}

/** "12500000" with 6 decimals → "12.5" (no trailing zeros); the input as is when it is not units. */
export function fromBaseUnits(units: string | number | bigint, decimals: number): string {
  const s = String(units ?? "");
  if (!UNITS.test(s)) return s;
  if (decimals === 0) return s;
  const padded = s.padStart(decimals + 1, "0");
  const whole = padded.slice(0, -decimals);
  const frac = padded.slice(-decimals).replace(/0+$/, "");
  return frac ? `${whole}.${frac}` : whole;
}

/** a ≥ b for two base-unit strings. */
export function gteUnits(a: string, b: string): boolean {
  if (!UNITS.test(a) || !UNITS.test(b)) return false;
  return BigInt(a) >= BigInt(b);
}

/** A local-money amount a person typed for `currency` (its decimals: none for CLP, two for the
    rest) and above zero, or null. */
export function parseFiat(value: string, currency: string): string | null {
  const v = parseDecimal(value, fiatDecimals(currency));
  return v !== null && Number(v) > 0 ? v : null;
}

/** The bps of an amount, rounded down, in base units ("1000000" at 30 bps → "3000"). */
export function bpsOf(units: string, bps: number): string {
  if (!UNITS.test(units) || !Number.isInteger(bps) || bps < 0) return "0";
  return ((BigInt(units) * BigInt(bps)) / 10000n).toString();
}

/** A bps rate as a percent a person reads ("1.5%" for 150), in the reader's language. */
export function bpsLabel(bps: number, lang = "en"): string {
  const n = Number(bps) / 100;
  return `${new Intl.NumberFormat(lang, { maximumFractionDigits: 2 }).format(Number.isFinite(n) ? n : 0)}%`;
}
