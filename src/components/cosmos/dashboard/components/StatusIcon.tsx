/* StatusIcon: a status as a small mark, the overview's transactions' (a check on ink when done, a
   cross on red when failed, a clock while waiting, a dash when off or inactive). Rows lead with
   it and status filters show it beside each option (product owner: more visual, simpler).
   Decorative: the status is always written next to it. */
export type StatusTone = "ok" | "fail" | "wait" | "off";

export function StatusIcon({ tone, size = 20 }: { tone: StatusTone; size?: number }) {
  const style = { width: size, height: size };
  if (tone === "ok") return <span className="hub-st ok" style={style} aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg></span>;
  if (tone === "fail") return <span className="hub-st fail" style={style} aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M7 7l10 10M17 7L7 17" /></svg></span>;
  if (tone === "off") return <span className="hub-st off" style={style} aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M7 12h10" /></svg></span>;
  return <span className="hub-st wait" style={style} aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="12" cy="12" r="8" /><path d="M12 8v4l3 2" /></svg></span>;
}

/* A payment's status as a tone: settled, failed (failed, cancelled or expired) or waiting. */
export const paymentTone = (status: string): StatusTone =>
  status === "SUCCEEDED" ? "ok" : ["FAILED", "CANCELLED", "EXPIRED"].includes(status) ? "fail" : "wait";
/* A Pill state as a tone, for lists that already map their statuses to pills. */
export const pillTone = (pill: string): StatusTone => (pill === "ok" ? "ok" : pill === "fail" ? "fail" : pill === "ref" ? "off" : "wait");
