/* StackChart: one bar per day, week, month or year, split by how each operation ended: completed,
   still pending, not completed (product owner, 2026-10-27: a chart has to tell something, compare
   what completed with what did not or is still pending). Hovering a bucket shows its total, each
   part with its share of it, and what the bucket is worth when the server values it (the swaps'
   settled volume in USD). With `currency` it draws one amount instead (the settled volume), on its
   own axis: one axis per chart, never two scales on one plot. Square bars (product owner), a 2px
   surface gap between stacked parts, solid hairline grid; the figures are also in a visually
   hidden table, so the chart is never the only way to read them. */
import { useState } from "react";

export interface StackPart {
  key: string;
  label: string;
  /** How the part is drawn: completed, pending or not completed. */
  tone: "done" | "wait" | "fail";
}
export interface StackPoint {
  date: string; // YYYY-MM-DD
  /** One value per part, in the parts' order. */
  values: number[];
  /** Lines the tooltip adds under the parts: [label, value already formatted]. */
  extra?: [string, string][];
}

interface Props {
  data: StackPoint[];
  parts: StackPart[];
  label: string;
  dateLabel: string;
  totalLabel: string;
  lang: string;
  period?: "day" | "week" | "month" | "year";
  /** The values are amounts of this currency (ISO code), named once by the legend. */
  currency?: string;
}

const H = 220;
const PAD_TOP = 12;
const PAD_BOTTOM = 26;
const GROUP = 28;
const BAR = 16;
/* The surface gap between two stacked parts. */
const GAP = 2;

/* A round ceiling for an axis: 1, 2, 2.5 or 5 times a power of ten. */
function niceMax(v: number): number {
  if (v <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
}
/* A count axis: a round ceiling whose quarters are whole numbers. */
const countMax = (v: number) => Math.max(4, Math.ceil(niceMax(v) / 4) * 4);

export function StackChart({ data, parts, label, dateLabel, totalLabel, lang, period = "day", currency = undefined }: Props) {
  const [hover, setHover] = useState<number | null>(null);
  const w = Math.max(data.length, 1) * GROUP;
  const plotH = H - PAD_TOP - PAD_BOTTOM;
  const total = (d: StackPoint) => d.values.reduce((a, b) => a + (b || 0), 0);
  const peak = Math.max(0, ...data.map(total));
  const max = currency ? niceMax(peak) : countMax(peak);
  const whole = new Intl.NumberFormat(lang, { maximumFractionDigits: 0 });
  const money = new Intl.NumberFormat(lang, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const moneyAxis = new Intl.NumberFormat(lang, { notation: "compact", maximumSignificantDigits: 3 });
  const value = currency ? money : whole;
  const axis = currency ? moneyAxis : whole;
  const pct = new Intl.NumberFormat(lang, { style: "percent", maximumFractionDigits: 0 });
  const day = new Intl.DateTimeFormat(lang, { day: "numeric", month: "short", timeZone: "UTC" });
  const fullDay = new Intl.DateTimeFormat(lang, { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  const monthFmt = new Intl.DateTimeFormat(lang, { month: "short", timeZone: "UTC" });
  const monthYear = new Intl.DateTimeFormat(lang, { month: "long", year: "numeric", timeZone: "UTC" });
  const yearFmt = new Intl.DateTimeFormat(lang, { year: "numeric", timeZone: "UTC" });
  const at = (d: string) => new Date(`${d}T00:00:00Z`);
  // The axis label of a bucket, and the tooltip's title (a week is its first and last day).
  const short = (d: string) => (period === "month" ? monthFmt : period === "year" ? yearFmt : day).format(at(d));
  const title = (d: string) => {
    if (period === "month") return monthYear.format(at(d));
    if (period === "year") return yearFmt.format(at(d));
    if (period === "week") return day.formatRange(at(d), new Date(at(d).getTime() + 6 * 86400000));
    return fullDay.format(at(d));
  };
  // Labels count back from the newest bucket, so it always has one and no label crowds it.
  const every = data.length > 14 ? 5 : 1;
  const tip = hover !== null ? data[hover] : null;
  const unit = plotH / max;
  const split = parts.length > 1;

  return (
    <div className={`bars shared stack${currency ? " money" : ""}`} onMouseLeave={() => setHover(null)}>
      <div className="bars-axis bars-axis-l" aria-hidden="true">
        {[1, 0.75, 0.5, 0.25, 0].map((f) => <span key={f}>{axis.format(max * f)}</span>)}
      </div>
      <div className="bars-plot">
        <svg className="bars-svg" viewBox={`0 0 ${w} ${H}`} preserveAspectRatio="none" role="img" aria-label={label}>
          {[0, 0.25, 0.5, 0.75, 1].map((f) => (
            <line key={f} x1="0" x2={w} y1={PAD_TOP + plotH * f} y2={PAD_TOP + plotH * f} className="bars-grid" vectorEffect="non-scaling-stroke" />
          ))}
          {data.map((d, i) => {
            const x = i * GROUP + (GROUP - BAR) / 2;
            let base = PAD_TOP + plotH;
            let drawn = 0;
            return (
              <g key={d.date} onMouseEnter={() => setHover(i)} className={hover === i ? "on" : undefined} style={{ ["--i" as string]: i }}>
                <rect x={i * GROUP} y={0} width={GROUP} height={H} className="bars-hit" />
                {/* Completed at the baseline, then pending, then not completed on top; each part
                    above another leaves a surface gap under it. */}
                {d.values.map((v, k) => {
                  if (!v) return null;
                  const h = v * unit;
                  const gap = drawn > 0 ? Math.min(GAP, h / 2) : 0;
                  base -= h;
                  drawn += 1;
                  return <rect key={parts[k].key} className={`bar-s ${parts[k].tone}`} x={x} width={BAR} y={base} height={h - gap} />;
                })}
              </g>
            );
          })}
        </svg>
        <div className="bars-x" aria-hidden="true">
          {data.map((d, i) => <span key={d.date} className={hover === i ? "on" : undefined}>{(data.length - 1 - i) % every === 0 || hover === i ? short(d.date) : ""}</span>)}
        </div>
        {tip && hover !== null && (
          <div className={`bars-tip${hover > data.length / 2 ? " left" : ""}`} style={{ left: `${((hover + 0.5) / data.length) * 100}%` }} aria-hidden="true">
            <b>{title(tip.date)}</b>
            {split && <span className="bars-tip-total">{totalLabel}<em>{value.format(total(tip))}</em></span>}
            {parts.map((p, k) => (
              <span key={p.key}>
                <i className={`dot-s ${p.tone}`} />{p.label}
                <em>{value.format(tip.values[k] || 0)}{split && total(tip) > 0 ? <small>{pct.format((tip.values[k] || 0) / total(tip))}</small> : null}</em>
              </span>
            ))}
            {tip.extra?.map(([k, v]) => <span key={k} className="bars-tip-extra">{k}<em>{v}</em></span>)}
          </div>
        )}
      </div>
      <table className="sr-only">
        <caption>{label}</caption>
        <thead><tr><th scope="col">{dateLabel}</th>{parts.map((p) => <th key={p.key} scope="col">{p.label}</th>)}{data[0]?.extra?.map(([k]) => <th key={k} scope="col">{k}</th>)}</tr></thead>
        <tbody>{data.map((d) => <tr key={d.date}><th scope="row">{title(d.date)}</th>{parts.map((p, k) => <td key={p.key}>{value.format(d.values[k] || 0)}</td>)}{d.extra?.map(([k, v]) => <td key={k}>{v}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}
