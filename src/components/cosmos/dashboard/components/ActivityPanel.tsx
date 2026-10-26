/* ActivityPanel: activity by day, week, month or year as figures over paired bars, the overview's
   and each view's own (product owner: Payments, private payments, swaps, liquidity and webhooks
   carry their figures and charts too). Several figures are WAI-ARIA tabs, each over its own chart;
   a single one stands alone. Each carries its growth against the window before. The data is the
   Payments API's `/v1/summary/series` (one call per period: `useSeries`, or the overview's own
   batched load), and every figure counts up (Odometer).
   Figures: volume (settled, USD, with its payers), payments (with the failed), swaps (every kind,
   with the completed), liquidity (operations, with the completed), webhooks (deliveries, with the
   failed), zkVolume and zkPayments (private payments: settled volume in USD with the completed,
   and created with the expired). */
import { useEffect, useState, type KeyboardEvent } from "react";
import { useT, useLang, fmt } from "@/lib/i18n/index";
import { metrics as metricsApi } from "@/lib/api-client";
import { goFiltered } from "@/components/cosmos/dashboard/hooks";
import { BarChart } from "@/components/cosmos/dashboard/components/BarChart";
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
    return { date: new Date(at).toISOString().slice(0, 10), a: 0, b: 0 };
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
  const zk = part("zkPayments");
  // Each figure: its label, value, the line under it, growth, and its chart (two series; a shared
  // axis for two counts of the same thing, a USD axis for a volume).
  const m = {
    volume: {
      label: h.sumVolume, value: usd(win.volumeUsd), sub: countText(win.payers, h.payersOne, h.payersN, num),
      growth: growth(Number(win.volumeUsd) || 0, Number(before.volumeUsd) || 0),
      a: h.legendVolume, b: h.legendCount, shared: false, currency: "USD",
      bars: series?.buckets?.map((x) => ({ date: x.start, a: Number(x.volumeUsd) || 0, b: x.count || 0 })),
      unpriced: win.unpriced,
    },
    payments: {
      label: h.sumCount, value: n(win.count), sub: countText(win.failed, h.paymentsFailedOne, h.paymentsFailedN, num),
      growth: growth(win.count || 0, before.count || 0),
      a: h.legendCount, b: h.sumFailed, shared: true,
      bars: series?.buckets?.map((x) => ({ date: x.start, a: x.count || 0, b: x.failed || 0 })),
    },
    swaps: {
      label: h.sumSwaps, value: n(part("swaps").totals?.count), sub: countText(part("swaps").totals?.succeeded, h.doneOne, h.doneN, num),
      growth: growth(part("swaps").totals?.count || 0, part("swaps").previous?.count || 0),
      a: h.sumSwaps, b: h.legendDone, shared: true,
      bars: part("swaps").buckets?.map((x) => ({ date: x.start, a: x.count || 0, b: x.succeeded || 0 })),
    },
    liquidity: {
      label: h.sumLiquidity, value: n(part("liquidity").totals?.count), sub: countText(part("liquidity").totals?.succeeded, h.doneOne, h.doneN, num),
      growth: growth(part("liquidity").totals?.count || 0, part("liquidity").previous?.count || 0),
      a: h.sumLiquidity, b: h.legendDone, shared: true,
      bars: part("liquidity").buckets?.map((x) => ({ date: x.start, a: x.count || 0, b: x.succeeded || 0 })),
    },
    webhooks: {
      label: h.sumWebhooks, value: n(part("webhooks").totals?.deliveries), sub: countText(part("webhooks").totals?.failed, h.webhooksFailedOne, h.sumWebhooksFailed, num),
      growth: growth(part("webhooks").totals?.deliveries || 0, part("webhooks").previous?.deliveries || 0),
      a: h.sumWebhooks, b: h.legendDeliveriesFailed, shared: true,
      bars: part("webhooks").buckets?.map((x) => ({ date: x.start, a: x.deliveries || 0, b: x.failed || 0 })),
    },
    zkVolume: {
      label: h.sumVolume, value: usd(zk.totals ? zk.totals.volumeUsd : "0"), sub: countText(zk.totals?.succeeded, h.doneOne, h.doneN, num),
      growth: growth(Number(zk.totals?.volumeUsd) || 0, Number(zk.previous?.volumeUsd) || 0),
      a: h.legendVolume, b: h.legendDone, shared: false, currency: "USD",
      bars: zk.buckets?.map((x) => ({ date: x.start, a: Number(x.volumeUsd) || 0, b: x.succeeded || 0 })),
    },
    zkPayments: {
      label: t.dash.viewLabels.zkPayments, value: n(zk.totals?.count), sub: countText(zk.totals?.expired, h.expiredOne, h.expiredN, num),
      growth: growth(zk.totals?.count || 0, zk.previous?.count || 0),
      a: h.legendCount, b: h.legendExpired, shared: true,
      bars: zk.buckets?.map((x) => ({ date: x.start, a: x.count || 0, b: x.expired || 0 })),
    },
  };
  const key = metrics.includes(metric) ? metric : metrics[0];
  const cur = m[key];
  const bars = cur.bars && cur.bars.length ? cur.bars : zeroBuckets(period);
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
          {x.sub}
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
            <div className="hub-legend" aria-hidden="true">
              <span><i className="dot-a" />{cur.a}</span>
              <span><i className="dot-b" />{cur.b}</span>
            </div>
            {cur.unpriced > 0 && <span className="hub-chart-note">{countText(cur.unpriced, h.usdUnpricedOne, h.usdUnpricedN, num)}</span>}
            {onGo && <button type="button" className="hub-link" onClick={openMetric}>{fmt(h.goTo, { view: t.dash.viewLabels[curView] })}</button>}
          </div>
          {first ? <ChartSkeleton label={h.chartLabels[period]} bars={12} /> : (
            <div className={loading ? "hub-chart is-loading" : "hub-chart"}>
              {/* Remounted per figure and period, so the bars grow again from the axis. */}
              <BarChart
                key={`${key}-${period}-${bars.length}`}
                data={bars}
                label={key === "volume" ? h.chartLabels[period] : `${cur.label} (${h.chartPeriods[period]})`}
                aLabel={cur.a}
                bLabel={cur.b}
                dateLabel={h.thDate}
                lang={lang}
                period={period}
                shared={cur.shared}
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
