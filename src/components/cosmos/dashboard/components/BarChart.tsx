/* BarChart: two figures per day, week, month or year as paired bars (the overview's activity:
   settled volume and payments, payments and failures, swaps and completed ones...), with a tooltip
   on hover; the hovered bucket's label turns bold, as in the gateway-dashboard reference. Two
   different quantities get an axis each (`a` left, `b` right); two counts of the same thing share
   the left one (`shared`), in whole steps. The figures are also in a visually hidden table, so the
   chart is never the only way to read them. */
import { useState } from "react";

export interface BarPoint {
  date: string; // YYYY-MM-DD
  a: number;
  b: number;
}

interface Props {
  data: BarPoint[];
  label: string;
  aLabel: string;
  bLabel: string;
  dateLabel: string;
  lang: string;
  /** What one bar is; labels and the tooltip follow it. */
  period?: "day" | "week" | "month" | "year";
  /** Both series are counts on the left axis; otherwise `b` is a count on its own right axis. */
  shared?: boolean;
}

const H = 220;
const PAD_TOP = 12;
const PAD_BOTTOM = 26;
const GROUP = 28;

/* A round ceiling for an axis: 1, 2, 2.5 or 5 times a power of ten. */
function niceMax(v: number): number {
  if (v <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
}
/* A count axis: a round ceiling whose quarters are whole numbers. */
const countMax = (v: number) => Math.max(4, Math.ceil(niceMax(v) / 4) * 4);

export function BarChart({ data, label, aLabel, bLabel, dateLabel, lang, period = "day", shared = false }: Props) {
  const [hover, setHover] = useState<number | null>(null);
  const w = Math.max(data.length, 1) * GROUP;
  const plotH = H - PAD_TOP - PAD_BOTTOM;
  const aPeak = Math.max(0, ...data.map((d) => d.a));
  const bPeak = Math.max(0, ...data.map((d) => d.b));
  const aMax = shared ? countMax(Math.max(aPeak, bPeak)) : niceMax(aPeak);
  const bMax = shared ? aMax : countMax(bPeak);
  const y = (v: number, max: number) => PAD_TOP + plotH - (v / max) * plotH;
  const num = new Intl.NumberFormat(lang, { maximumFractionDigits: 2 });
  const whole = new Intl.NumberFormat(lang, { maximumFractionDigits: 0 });
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
  const aFmt = shared ? whole : num;

  return (
    <div className={shared ? "bars shared" : "bars"} onMouseLeave={() => setHover(null)}>
      <div className="bars-axis bars-axis-l" aria-hidden="true">
        {[1, 0.75, 0.5, 0.25, 0].map((f) => <span key={f}>{aFmt.format(aMax * f)}</span>)}
      </div>
      <div className="bars-plot">
        <svg className="bars-svg" viewBox={`0 0 ${w} ${H}`} preserveAspectRatio="none" role="img" aria-label={label}>
          {[0, 0.25, 0.5, 0.75, 1].map((f) => (
            <line key={f} x1="0" x2={w} y1={PAD_TOP + plotH * f} y2={PAD_TOP + plotH * f} className="bars-grid" vectorEffect="non-scaling-stroke" />
          ))}
          {data.map((d, i) => {
            const x = i * GROUP;
            return (
              <g key={d.date} onMouseEnter={() => setHover(i)} className={hover === i ? "on" : undefined} style={{ ["--i" as string]: i }}>
                <rect x={x} y={0} width={GROUP} height={H} className="bars-hit" />
                <rect className="bar-a" x={x + 7} width="6" y={y(d.a, aMax)} height={Math.max(0, PAD_TOP + plotH - y(d.a, aMax))} rx="3" />
                <rect className="bar-b" x={x + 15} width="6" y={y(d.b, bMax)} height={Math.max(0, PAD_TOP + plotH - y(d.b, bMax))} rx="3" />
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
            <span><i className="dot-a" />{aLabel}<em>{aFmt.format(tip.a)}</em></span>
            <span><i className="dot-b" />{bLabel}<em>{whole.format(tip.b)}</em></span>
          </div>
        )}
      </div>
      {!shared && (
        <div className="bars-axis bars-axis-r" aria-hidden="true">
          {[1, 0.75, 0.5, 0.25, 0].map((f) => <span key={f}>{whole.format(bMax * f)}</span>)}
        </div>
      )}
      <table className="sr-only">
        <caption>{label}</caption>
        <thead><tr><th scope="col">{dateLabel}</th><th scope="col">{aLabel}</th><th scope="col">{bLabel}</th></tr></thead>
        <tbody>{data.map((d) => <tr key={d.date}><th scope="row">{d.date}</th><td>{aFmt.format(d.a)}</td><td>{whole.format(d.b)}</td></tr>)}</tbody>
      </table>
    </div>
  );
}
