/* ActivityPanel: activity by day, week, month or year as figures over a chart, the overview's
   and each view's own (product owner: Payments, private payments, swaps, liquidity and webhooks
   carry their figures and charts too). Several figures are WAI-ARIA tabs, each over its own chart;
   a single one stands alone. Each carries its growth against the window before. The data is the
   Payments API's `/v1/summary/series` (one call per period: `useSeries`, or the overview's own
   batched load), and every figure counts up (Odometer).
   A chart tells something (product owner, 2026-10-27): every count is split by how it ended
   (completed, pending, not completed: StackChart), its legend gives each part's total and share,
   and the tooltip adds what the bucket settled in USD where the server values it (payments,
   swaps, private payments). A volume is one amount on its own axis, never a second scale on the
   same plot. Each figure carries an insight line, not a bare number: the completed share, the
   average ticket, what swaps settled, the fees.
   Figures: volume (settled, USD), payments, swaps (every kind), liquidity (operations), webhooks
   (deliveries), zkVolume and zkPayments (private payments: settled volume in USD, and created). */
import { useEffect, useState, type KeyboardEvent, type ReactNode } from "react";
import { useT, useLang, fmt } from "@/lib/i18n/index";
import { metrics as metricsApi } from "@/lib/api-client";
import { goFiltered } from "@/components/cosmos/dashboard/hooks";
import { StackChart, type StackPart } from "@/components/cosmos/dashboard/components/StackChart";
import { Odometer } from "@/components/cosmos/dashboard/components/Odometer";
import { Sk, ChartSkeleton } from "@/components/cosmos/dashboard/components/Skeleton";

export type SeriesPeriod = "day" | "week" | "month" | "year";
export type MetricKey = "volume" | "payments" | "swaps" | "liquidity" | "webhooks" | "zkVolume" | "zkPayments";

export const CHART_PERIODS: SeriesPeriod[] = ["day", "week", "month", "year"];
/* The view each figure lives in, for "Go to …" (the overview only). */
const METRIC_VIEW: Record<MetricKey, string> = { volume: "payments", payments: "payments", swaps: "swaps", liquidity: "liquidity", webhooks: "webhook", zkVolume: "zkPayments", zkPayments: "zkPayments" };
/* The list filter that matches a chart window (30 days, 12 weeks; longer windows show everything). */
const WINDOW_DATE = { day: "30d", week: "90d" };
/* A chart with nothing to draw (no buckets, or a part the server does not send) shows the window's
   buckets at zero (product owner: fill with 0), as the server draws them: UTC, weeks from Monday,
   30 days, 12 weeks, 12 months or 5 years. */
const WINDOW_SIZE = { day: 30, week: 12, month: 12, year: 5 };
function zeroBuckets(period: SeriesPeriod) {
  const now = new Date();
  const y = now.getUTCFullYear(), mo = now.getUTCMonth(), d = now.getUTCDate();
  const monday = d - ((now.getUTCDay() + 6) % 7);
  return Array.from({ length: WINDOW_SIZE[period] }, (_, k) => {
    const i = WINDOW_SIZE[period] - 1 - k;
    const at = period === "day" ? Date.UTC(y, mo, d - i) : period === "week" ? Date.UTC(y, mo, monday - 7 * i) : period === "month" ? Date.UTC(y, mo - i, 1) : Date.UTC(y - i, 0, 1);
    return { date: new Date(at).toISOString().slice(0, 10), values: [] as number[] };
  });
}
/* Plural-safe counts: the singular has its own string. */
export const countText = (n, one, many, num) => (n === 1 ? one : fmt(many, { n: num.format(n || 0) }));

/* A view's own series: one call per environment and period (undefined while the first one loads,
   null when it failed). */
export function useSeries(env: string, initial: SeriesPeriod = "month") {
  const [period, setPeriod] = useState<SeriesPeriod>(initial);
  const [series, setSeries] = useState<any>(undefined);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    setLoading(true);
    metricsApi.series(env, period)
      .then((d) => { if (alive) setSeries(d); })
      .catch(() => { if (alive) setSeries(null); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [env, period]);
  return { period, setPeriod, series, loading };
}

export function ActivityPanel({ id, series, loading, period, onPeriod, metrics, onGo = null, className = "" }: {
  /* The section's heading id, unique on the page. */
  id: string;
  series: any;
  loading: boolean;
  period: SeriesPeriod;
  onPeriod: (p: SeriesPeriod) => void;
  metrics: MetricKey[];
  /* With it, each chart links into the view its figure lives in (the overview). */
  onGo?: ((view: string) => void) | null;
  className?: string;
}) {
  const t = useT();
  const lang = useLang();
  const h = t.dash.overview.hub;
  const [metric, setMetric] = useState<MetricKey>(metrics[0]);
  const num = new Intl.NumberFormat(lang, { maximumFractionDigits: 2 });
  const usdFmt = new Intl.NumberFormat(lang, { style: "currency", currency: "USD" });
  const usd = (v) => (v === null || v === undefined || !Number.isFinite(Number(v)) ? "-" : usdFmt.format(Number(v)));
  const n = (v) => num.format(v || 0);
  const first = series === undefined;
  const win = (series && series.totals) || { count: 0, succeeded: 0, failed: 0, volume: "0", volumeUsd: "0", payers: 0, unpriced: 0 };
  const before = (series && series.previous) || { count: 0, failed: 0, volume: "0", volumeUsd: "0" };
  // Beyond payments (the same window): every swap, liquidity operations, webhook deliveries and
  // private payments.
  const part = (k) => (series && series[k]) || {};
  const growth = (cur, prev) => (prev > 0 ? ((cur - prev) / prev) * 100 : null);
  const pct = (g) => `${g >= 0 ? "↑" : "↓"} ${num.format(Math.round(Math.abs(g) * 10) / 10)}%`;
  const shareFmt = new Intl.NumberFormat(lang, { style: "percent", maximumFractionDigits: 0 });
  const share = (x, of) => (of > 0 ? shareFmt.format(x / of) : null);
  // The completed share of a window, as its figure's insight line (nothing when nothing ran).
  const doneShare = (done, all) => (all > 0 ? fmt(h.doneShare, { pct: share(done, all) }) : null);
  const zk = part("zkPayments");
  const sw = part("swaps");
  const lq = part("liquidity");
  const wh = part("webhooks");
  // The parts a count splits into: completed at the baseline, then pending, then not completed.
  const DONE: StackPart = { key: "done", label: h.partDone, tone: "done" };
  const WAIT: StackPart = { key: "wait", label: h.partPending, tone: "wait" };
  const NOT: StackPart = { key: "fail", label: h.partNotDone, tone: "fail" };
  // [completed, pending, not completed] of a bucket or window: pending is what is neither.
  const outcome = (x, gaveUp = "failed") => {
    const all = (x && x.count) || 0, done = (x && x.succeeded) || 0, lost = (x && x[gaveUp]) || 0;
    return [done, Math.max(0, all - done - lost), lost];
  };
  const settled = (x) => [[h.tipSettledUsd, usd(x.volumeUsd)]] as [string, string][];
  // Each figure: its label, value, insight lines, growth, and its chart (the parts it splits into,
  // their window totals for the legend, and one point per bucket).
  const m = {
    volume: {
      label: h.sumVolume, value: usd(win.volumeUsd),
      sub: [countText(win.payers, h.payersOne, h.payersN, num), win.succeeded > 0 && Number(win.volumeUsd) > 0 ? fmt(h.avgTicket, { amount: usd(Number(win.volumeUsd) / win.succeeded) }) : null],
      growth: growth(Number(win.volumeUsd) || 0, Number(before.volumeUsd) || 0),
      parts: [{ key: "usd", label: h.legendVolume, tone: "done" }] as StackPart[], currency: "USD",
      points: series?.buckets?.map((x) => ({ date: x.start, values: [Number(x.volumeUsd) || 0], extra: [[h.partDone, n(x.succeeded)]] as [string, string][] })),
      unpriced: win.unpriced,
    },
    payments: {
      label: h.sumCount, value: n(win.count),
      sub: [doneShare(win.succeeded, win.count), countText(win.failed, h.paymentsFailedOne, h.paymentsFailedN, num)],
      growth: growth(win.count || 0, before.count || 0),
      parts: [DONE, WAIT, NOT], totals: outcome(win),
      points: series?.buckets?.map((x) => ({ date: x.start, values: outcome(x), extra: settled(x) })),
    },
    swaps: {
      label: h.sumSwaps, value: n(sw.totals?.count),
      sub: [sw.totals && Number(sw.totals.volumeUsd) > 0 ? fmt(h.settledAmount, { amount: usd(sw.totals.volumeUsd) }) : null, doneShare(sw.totals?.succeeded, sw.totals?.count)],
      growth: growth(sw.totals?.count || 0, sw.previous?.count || 0),
      parts: [DONE, WAIT, NOT], totals: outcome(sw.totals),
      points: sw.buckets?.map((x) => ({ date: x.start, values: outcome(x), extra: settled(x) })),
    },
    liquidity: {
      label: h.sumLiquidity, value: n(lq.totals?.count),
      sub: [doneShare(lq.totals?.succeeded, lq.totals?.count), countText(lq.totals?.failed, h.paymentsFailedOne, h.paymentsFailedN, num)],
      growth: growth(lq.totals?.count || 0, lq.previous?.count || 0),
      parts: [DONE, WAIT, NOT], totals: outcome(lq.totals),
      points: lq.buckets?.map((x) => ({ date: x.start, values: outcome(x) })),
    },
    webhooks: {
      label: h.sumWebhooks, value: n(wh.totals?.deliveries),
      sub: [wh.totals?.deliveries > 0 ? fmt(h.deliveredShare, { pct: share(wh.totals.deliveries - (wh.totals.failed || 0), wh.totals.deliveries) }) : null, countText(wh.totals?.failed, h.webhooksFailedOne, h.sumWebhooksFailed, num)],
      growth: growth(wh.totals?.deliveries || 0, wh.previous?.deliveries || 0),
      parts: [{ key: "done", label: h.partDelivered, tone: "done" }, { key: "fail", label: h.legendDeliveriesFailed, tone: "fail" }] as StackPart[],
      totals: [Math.max(0, (wh.totals?.deliveries || 0) - (wh.totals?.failed || 0)), wh.totals?.failed || 0],
      points: wh.buckets?.map((x) => ({ date: x.start, values: [Math.max(0, (x.deliveries || 0) - (x.failed || 0)), x.failed || 0] })),
    },
    zkVolume: {
      label: h.sumVolume, value: usd(zk.totals ? zk.totals.volumeUsd : "0"),
      sub: [countText(zk.totals?.succeeded, h.doneOne, h.doneN, num), zk.totals && Number(zk.totals.feesUsd) > 0 ? fmt(h.feesAmount, { amount: usd(zk.totals.feesUsd) }) : null],
      growth: growth(Number(zk.totals?.volumeUsd) || 0, Number(zk.previous?.volumeUsd) || 0),
      parts: [{ key: "usd", label: h.legendVolume, tone: "done" }] as StackPart[], currency: "USD",
      points: zk.buckets?.map((x) => ({ date: x.start, values: [Number(x.volumeUsd) || 0], extra: [[h.partDone, n(x.succeeded)]] as [string, string][] })),
    },
    zkPayments: {
      label: t.dash.viewLabels.zkPayments, value: n(zk.totals?.count),
      sub: [doneShare(zk.totals?.succeeded, zk.totals?.count), countText(zk.totals?.expired, h.expiredOne, h.expiredN, num)],
      growth: growth(zk.totals?.count || 0, zk.previous?.count || 0),
      parts: [DONE, WAIT, { key: "fail", label: h.legendExpired, tone: "fail" }] as StackPart[], totals: outcome(zk.totals, "expired"),
      points: zk.buckets?.map((x) => ({ date: x.start, values: outcome(x, "expired"), extra: settled(x) })),
    },
  };
  const key = metrics.includes(metric) ? metric : metrics[0];
  const cur = m[key];
  const points = cur.points && cur.points.length ? cur.points : zeroBuckets(period);
  const curTotal = cur.totals ? cur.totals.reduce((a, b) => a + b, 0) : 0;
  const curView = METRIC_VIEW[key];
  // Its view, filtered to the chart's window where the view has a date filter.
  const openMetric = () => {
    if (!onGo) return;
    const date = curView === "webhook" ? null : WINDOW_DATE[period];
    goFiltered(onGo, curView, date ? { date } : {});
  };
  // Tabs by arrow keys (automatic activation), Home and End.
  const onTabKey = (e: KeyboardEvent) => {
    const at = metrics.indexOf(key);
    const next = e.key === "ArrowRight" || e.key === "ArrowDown" ? at + 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? at - 1 : e.key === "Home" ? 0 : e.key === "End" ? metrics.length - 1 : null;
    if (next === null) return;
    e.preventDefault();
    const k = metrics[(next + metrics.length) % metrics.length];
    setMetric(k);
    document.getElementById(`${id}-m-${k}`)?.focus();
  };
  // A figure, or its skeleton while its period loads; a window that could not be read shows a
  // dash, never zeros that look like data.
  const fig = (x) => (loading
    ? <Sk className="lg" w="64%" />
    : series === null ? <b className="arrive">-</b>
    : (
      <>
        <b className="arrive"><Odometer text={x.value} /></b>
        <small className="hub-sub arrive">
          {x.sub.filter(Boolean).map((s) => <span key={s}>{s}</span>)}
          {x.growth !== null && <em className={x.growth >= 0 ? "up" : "down"} title={h.growthTitle}><span className="sr-only">{h.growthTitle}: </span>{pct(x.growth)}</em>}
        </small>
      </>
    ));
  const many = metrics.length > 1;

  return (
    <section className={`hub-section${className ? ` ${className}` : ""}`} aria-labelledby={id}>
      <div className="hub-section-head">
        <h2 id={id}>{h.activity}</h2>
        <div className="seg-tabs" role="group" aria-label={h.periodLabel}>
          {CHART_PERIODS.map((p) => (
            <button key={p} type="button" className={period === p ? "on" : ""} aria-pressed={period === p} onClick={() => onPeriod(p)}>{h.chartPeriods[p]}</button>
          ))}
        </div>
      </div>
      <div className="panel hub-panel" aria-busy={loading || undefined}>
        {many ? (
          <div className={`hub-metrics n${metrics.length}`} role="tablist" aria-label={h.activity} onKeyDown={onTabKey}>
            {metrics.map((k) => (
              <button
                key={k} type="button" role="tab" id={`${id}-m-${k}`}
                className={key === k ? "hub-metric on" : "hub-metric"}
                aria-selected={key === k} aria-controls={`${id}-panel`} tabIndex={key === k ? 0 : -1}
                onClick={() => setMetric(k)}
              >
                <span className="hub-metric-k">{m[k].label}</span>
                {fig(m[k])}
              </button>
            ))}
          </div>
        ) : (
          <div className="hub-metrics n1">
            <div className="hub-metric solo"><span className="hub-metric-k">{cur.label}</span>{fig(cur)}</div>
          </div>
        )}
        <div id={`${id}-panel`} role={many ? "tabpanel" : undefined} aria-labelledby={many ? `${id}-m-${key}` : undefined}>
          <div className="hub-chart-head">
            {/* Each part with its total and share of the window; the chart's table says it too. */}
            <div className="hub-legend" aria-hidden="true">
              {cur.parts.map((p, i) => (
                <span key={p.key}>
                  <i className={`dot-s ${p.tone}`} />{p.label}
                  {cur.totals && <><b>{n(cur.totals[i])}</b>{curTotal > 0 && <small>{share(cur.totals[i], curTotal)}</small>}</>}
                </span>
              ))}
            </div>
            {cur.unpriced > 0 && <span className="hub-chart-note">{countText(cur.unpriced, h.usdUnpricedOne, h.usdUnpricedN, num)}</span>}
            {onGo && <button type="button" className="hub-link" onClick={openMetric}>{fmt(h.goTo, { view: t.dash.viewLabels[curView] })}</button>}
          </div>
          {first ? <ChartSkeleton label={h.chartLabels[period]} bars={12} /> : (
            <div className={loading ? "hub-chart is-loading" : "hub-chart"}>
              {/* Remounted per figure and period, so the bars grow again from the axis. */}
              <StackChart
                key={`${key}-${period}-${points.length}`}
                data={points}
                parts={cur.parts}
                label={`${cur.label} (${h.chartPeriods[period]})`}
                dateLabel={h.thDate}
                totalLabel={h.tipTotal}
                lang={lang}
                period={period}
                currency={cur.currency}
              />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/* A view's own activity: its series and the panel, for the figures named. */
export function ViewActivity({ env, metrics, id }: { env: string; metrics: MetricKey[]; id: string }) {
  const s = useSeries(env);
  return <ActivityPanel id={id} className="view-activity" series={s.series} loading={s.loading} period={s.period} onPeriod={s.setPeriod} metrics={metrics} />;
}

/** One figure of a list that has no activity series of its own. */
export interface ViewFigure { key: string; label: string; value: ReactNode; sub?: ReactNode }

/* The figures before a list whose numbers come from the list itself (customers, products, keys,
   logs...): the activity panel's figure strip without its chart, so every view starts the same
   way (product owner, 2026-10-27: figures first, then the tables). A skeleton while the list
   loads; a dash, never a zero, when it could not be read. */
export function ViewFigures({ items, loading = false, failed = false, label }: { items: ViewFigure[]; loading?: boolean; failed?: boolean; label: string }) {
  return (
    <section className="view-figures" aria-label={label} aria-busy={loading || undefined}>
      <div className="panel hub-panel">
        <div className={`hub-metrics n${items.length}`}>
          {items.map((x) => (
            <div key={x.key} className="hub-metric solo">
              <span className="hub-metric-k">{x.label}</span>
              {loading
                ? <Sk className="lg" w="64%" />
                : failed ? <b className="arrive">-</b>
                : (
                  <>
                    <b className="arrive">{typeof x.value === "string" || typeof x.value === "number" ? <Odometer text={String(x.value)} /> : x.value}</b>
                    {x.sub !== undefined && <small className="hub-sub arrive">{x.sub}</small>}
                  </>
                )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
