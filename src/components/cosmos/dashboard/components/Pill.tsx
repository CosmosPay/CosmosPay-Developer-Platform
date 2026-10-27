/* Pill: a status as coloured text led by its mark (StatusIcon; product owner: an icon, not a dot).
   `st` is the colour (ok, pend, fail, ref); `tone` the mark when it differs from the colour's
   (a pending payment is "ref" in colour but waiting, a clock). */
import { StatusIcon, pillTone, type StatusTone } from "@/components/cosmos/dashboard/components/StatusIcon";

export function Pill({ st, label, tone = undefined }: { st?: string; label: string; tone?: StatusTone }) {
  return <span className={`pill-st ${st || "ref"}`}><StatusIcon tone={tone || pillTone(st || "ref")} size={16} />{label}</span>;
}
