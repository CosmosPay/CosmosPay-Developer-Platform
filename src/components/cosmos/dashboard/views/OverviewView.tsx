/* OverviewView: the organization at a glance, after the product owner's gateway-dashboard
   reference: a dark account card (its arrows step through the organizations) beside a white
   panel with its balances (each token with its logo), the organization ID and the main actions;
   the activity by day, week, month or year (a strip over paired bars); and the transaction list
   with the dashboard's filter bar and a menu per payment. Every figure comes from the Payments
   API (/v1/summary, /v1/summary/series, /v1/balances and the payment list); nothing is sample
   data. While a figure loads, a skeleton holds its place. */
import { useState, useEffect } from "react";
import { useT, useLang, fmt } from "@/lib/i18n/index";
import { metrics as metricsApi, paymentIntents as payApi } from "@/lib/api-client";
import { planSpec } from "@/lib/plans";
import { DOCS } from "@/components/cosmos/lib/constants";
import { useCopy } from "@/components/cosmos/hooks/useCopy";
import { showToast } from "@/components/cosmos/shared";
import { IcCheck, IcCopy } from "@/components/cosmos/icons";
import { DI } from "@/components/cosmos/dashboard/icons";
import { fmtDateTime } from "@/components/cosmos/dashboard/helpers";
import { useOutside, useListFilters, usePresence, goFiltered } from "@/components/cosmos/dashboard/hooks";
import { BarChart } from "@/components/cosmos/dashboard/components/BarChart";
import { FilterBar } from "@/components/cosmos/dashboard/components/FilterBar";
import { Sk, ListSkeleton, ChartSkeleton } from "@/components/cosmos/dashboard/components/Skeleton";
import { explorerUrl, chainOf, assetLabel } from "@/components/cosmos/dashboard/components/PayLinkDetail";
import { CHAINS, CHAIN_NAMES, networkName, isChain, assetLabel as chainAsset } from "@/lib/chains";
import { TokenMark } from "@/components/cosmos/dashboard/components/TokenMark";
import { countBy, matchesQuery } from "@/lib/dashboard-filters";

const short = (a) => (a && a.length > 14 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a || "-");
const CHART_PERIODS = ["day", "week", "month", "year"];
/* The activity's figures, each a tab over its own chart: settled volume (with the payments
   created), payments (with the failed), swaps of every kind, liquidity operations (with the
   completed) and webhook deliveries (with the failed), and the view each one lives in. */
const METRICS = ["volume", "payments", "swaps", "liquidity", "webhooks"];
const METRIC_VIEW = { volume: "payments", payments: "payments", swaps: "swaps", liquidity: "liquidity", webhooks: "webhook" };
/* The list filter that matches a chart window (30 days, 12 weeks; longer windows show everything). */
const WINDOW_DATE = { day: "30d", week: "90d" };
/* The transaction list's periods, as the start of the window. "today" starts at local midnight. */
const LIST_PERIODS = ["today", "week", "month", "year"];
const periodStart = (period) => {
  const now = new Date();
  if (period === "today") return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const days = { week: 7, month: 30, year: 365 }[period];
  return new Date(now.getTime() - days * 86400000);
};
const SETTLED = "SUCCEEDED";
const FAILED = ["FAILED", "CANCELLED", "EXPIRED"];
/* The list's status groups: what a merchant asks of recent payments. */
const groupOf = (status) => (status === SETTLED ? "settled" : FAILED.includes(status) ? "failed" : "open");
const GROUPS = ["settled", "open", "failed"];
const DEFAULTS = { q: "", status: "all", chain: "all" };
const ALLOWED = { status: ["all", ...GROUPS], chain: ["all", ...CHAINS] };

/* The organization id, copyable: the merchant code of the reference. */
function OrgIdField({ id, label }) {
  const t = useT();
  const [done, copy] = useCopy();
  return (
    <button type="button" className={`hub-code${done ? " done" : ""}`} onClick={() => copy(id, t.toasts.copied)} aria-label={`${label}: ${id}`}>
      <span className="hub-code-k">{label}</span>
      <code>{id}</code>
      <span className="hub-code-ic" aria-hidden="true">{done ? <IcCheck /> : <IcCopy />}</span>
    </button>
  );
}

/* A balance's symbol: the chain's coin for "native", the code of a CODE:ISSUER asset. */
const balSymbol = (x) => (isChain(x.chain) ? chainAsset(x.chain, x.asset) : String(x.asset).split(":")[0]);

/* A payment's menu: copy its id, open it on its chain's explorer (once it has a transaction),
   or its detail in the Payments view. A disclosure: Escape and a click elsewhere close it. */
function RowMenu({ p, onGo }) {
  const t = useT();
  const h = t.dash.overview.hub;
  const [open, setOpen] = useState(false);
  const menu = usePresence(open, 120);
  const ref = useOutside(() => setOpen(false));
  const id = `hub-menu-${p.id}`;
  const href = explorerUrl(p);
  const copy = () => {
    navigator.clipboard?.writeText(p.id).then(() => showToast(t.toasts.copied)).catch(() => {});
    setOpen(false);
  };
  return (
    <div className="hub-menu-wrap" ref={ref} onKeyDown={(e) => { if (e.key === "Escape" && open) { e.stopPropagation(); setOpen(false); } }}>
      <button type="button" className="hub-kebab" aria-label={fmt(h.rowMenu, { id: short(p.id) })} aria-haspopup="true" aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)}>
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="5" r="1.7" /><circle cx="12" cy="12" r="1.7" /><circle cx="12" cy="19" r="1.7" /></svg>
      </button>
      <ul className="hub-menu" id={id} role="list" hidden={!menu.mounted} data-state={menu.state}>
        <li><button type="button" onClick={copy}>{DI.link}{h.copyId}</button></li>
        {href && <li><a href={href} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)}>{DI.network}{h.explorer}</a></li>}
        <li><button type="button" onClick={() => { setOpen(false); goFiltered(onGo, "payments", { open: p.id }); }}>{DI.payments}{h.openPayments}</button></li>
      </ul>
    </div>
  );
}

const statusIcon = (status) => {
  if (status === SETTLED) return <span className="hub-st ok" aria-hidden="true"><IcCheck /></span>;
  if (FAILED.includes(status)) return <span className="hub-st fail" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M7 7l10 10M17 7L7 17" /></svg></span>;
  return <span className="hub-st wait" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="12" cy="12" r="8" /><path d="M12 8v4l3 2" /></svg></span>;
};

/* The overview list's period as the Payments view's date filter ("year" has none: everything). */
const LIST_DATE = { today: "today", week: "7d", month: "30d" };
/* Plural-safe counts: the singular has its own string. */
const countText = (n, one, many, num) => (n === 1 ? one : fmt(many, { n: num.format(n || 0) }));

export function OverviewView({ org, orgs = [], onSwitchOrg = (id) => {}, onGo = (v) => {}, canCreatePayments = false, env = "dev" }) {
  const t = useT();
  const lang = useLang();
  const h = t.dash.overview.hub;
  const fl = t.dash.filters;
  // undefined while loading, null when the request failed.
  const [sum, setSum] = useState(undefined);
  const [bals, setBals] = useState(undefined);
  const [chartPeriod, setChartPeriod] = useState("month");
  const [metric, setMetric] = useState("volume");
  const [series, setSeries] = useState(undefined);
  const [seriesLoading, setSeriesLoading] = useState(true);
  const [listPeriod, setListPeriod] = useState("month");
  const [rows, setRows] = useState(null);
  const { filters, set, reset, active } = useListFilters(DEFAULTS, ALLOWED);

  useEffect(() => {
    let alive = true;
    setSum(undefined);
    metricsApi.summary(env).then((d) => { if (alive) setSum(d); }).catch(() => { if (alive) setSum(null); });
    setBals(undefined);
    metricsApi.balances(env).then((d) => { if (alive) setBals(Array.isArray(d?.data) ? d.data : []); }).catch(() => { if (alive) setBals(null); });
    return () => { alive = false; };
  }, [env]);
  useEffect(() => {
    let alive = true;
    setSeriesLoading(true);
    metricsApi.series(env, chartPeriod)
      .then((d) => { if (alive) setSeries(d); })
      .catch(() => { if (alive) setSeries(null); })
      .finally(() => { if (alive) setSeriesLoading(false); });
    return () => { alive = false; };
  }, [env, chartPeriod]);
  useEffect(() => {
    let alive = true;
    setRows(null);
    payApi.list(env, { org: org.id, createdFrom: periodStart(listPeriod).toISOString(), take: 100 })
      .then((res) => { if (alive) setRows(Array.isArray(res?.data) ? res.data : []); })
      .catch(() => { if (alive) setRows([]); });
    return () => { alive = false; };
  }, [env, org.id, listPeriod]);

  const num = new Intl.NumberFormat(lang, { maximumFractionDigits: 2 });
  // Amounts arrive as exact decimal strings; grouped for reading, never re-rounded below 7 places.
  const amount = (v) => { const n = Number(v); return Number.isFinite(n) ? new Intl.NumberFormat(lang, { minimumFractionDigits: 2, maximumFractionDigits: 7 }).format(n) : v; };
  const sumLoading = sum === undefined;
  const volume = (sum && sum.volume) || [];
  const primary = volume[0];
  const plan = planSpec(org.plan);
  const created = org.createdAt ? new Date(org.createdAt).toLocaleDateString(lang, { day: "numeric", month: "short", year: "numeric" }) : null;
  const tier = env === "prod" ? t.dash.env.production : t.dash.env.sandbox;

  // The organizations the arrows step through (the shell passes the usable ones).
  const at = orgs.findIndex((o) => o.id === org.id);
  const step = (d) => { if (orgs.length > 1) onSwitchOrg(orgs[(at + d + orgs.length) % orgs.length].id); };


  // The chart's window and the one before it, for growth.
  const firstSeries = series === undefined;
  const win = (series && series.totals) || { count: 0, succeeded: 0, failed: 0, volume: "0", payers: 0 };
  const before = (series && series.previous) || { count: 0, failed: 0, volume: "0" };
  // Beyond payments (the same window): every swap (on one chain, between chains, USDT0), liquidity
  // operations and webhook deliveries.
  const part = (k) => (series && series[k]) || {};
  const growth = (cur, prev) => (prev > 0 ? ((cur - prev) / prev) * 100 : null);
  const pct = (g) => `${g >= 0 ? "↑" : "↓"} ${num.format(Math.round(Math.abs(g) * 10) / 10)}%`;
  const n = (v) => num.format(v || 0);
  // Each figure: its tab (label, value, the line under it, growth) and its chart (two series, a
  // shared axis for two counts of the same thing). A part whose buckets the server does not send
  // has no chart, never a flat one that looks like data.
  const m = {
    volume: {
      label: h.sumVolume, value: n(Number(win.volume)), sub: countText(win.payers, h.payersOne, h.payersN, num),
      growth: growth(Number(win.volume) || 0, Number(before.volume) || 0),
      a: h.legendVolume, b: h.legendCount, shared: false,
      bars: series && series.buckets && series.buckets.map((x) => ({ date: x.start, a: Number(x.volume) || 0, b: x.count || 0 })),
    },
    payments: {
      label: h.sumCount, value: n(win.count), sub: countText(win.failed, h.paymentsFailedOne, h.paymentsFailedN, num),
      growth: growth(win.count || 0, before.count || 0),
      a: h.legendCount, b: h.sumFailed, shared: true,
      bars: series && series.buckets && series.buckets.map((x) => ({ date: x.start, a: x.count || 0, b: x.failed || 0 })),
    },
    swaps: {
      label: h.sumSwaps, value: n(part("swaps").totals?.count), sub: countText(part("swaps").totals?.succeeded, h.doneOne, h.doneN, num),
      growth: growth(part("swaps").totals?.count || 0, part("swaps").previous?.count || 0),
      a: h.sumSwaps, b: h.legendDone, shared: true,
      bars: part("swaps").buckets && part("swaps").buckets.map((x) => ({ date: x.start, a: x.count || 0, b: x.succeeded || 0 })),
    },
    liquidity: {
      label: h.sumLiquidity, value: n(part("liquidity").totals?.count), sub: countText(part("liquidity").totals?.succeeded, h.doneOne, h.doneN, num),
      growth: growth(part("liquidity").totals?.count || 0, part("liquidity").previous?.count || 0),
      a: h.sumLiquidity, b: h.legendDone, shared: true,
      bars: part("liquidity").buckets && part("liquidity").buckets.map((x) => ({ date: x.start, a: x.count || 0, b: x.succeeded || 0 })),
    },
    webhooks: {
      label: h.sumWebhooks, value: n(part("webhooks").totals?.deliveries), sub: countText(part("webhooks").totals?.failed, h.webhooksFailedOne, h.sumWebhooksFailed, num),
      growth: growth(part("webhooks").totals?.deliveries || 0, part("webhooks").previous?.deliveries || 0),
      a: h.sumWebhooks, b: h.sumFailed, shared: true,
      bars: part("webhooks").buckets && part("webhooks").buckets.map((x) => ({ date: x.start, a: x.deliveries || 0, b: x.failed || 0 })),
    },
  };
  const cur = m[metric];
  const curView = METRIC_VIEW[metric];
  // Its view, filtered to the chart's window where the view has a date filter.
  const openMetric = () => {
    const date = curView === "webhook" ? null : WINDOW_DATE[chartPeriod];
    goFiltered(onGo, curView, date ? { date } : {});
  };
  // Tabs by arrow keys (automatic activation), Home and End.
  const onTabKey = (e) => {
    const at = METRICS.indexOf(metric);
    const next = e.key === "ArrowRight" || e.key === "ArrowDown" ? at + 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? at - 1 : e.key === "Home" ? 0 : e.key === "End" ? METRICS.length - 1 : null;
    if (next === null) return;
    e.preventDefault();
    const k = METRICS[(next + METRICS.length) % METRICS.length];
    setMetric(k);
    document.getElementById(`hub-m-${k}`)?.focus();
  };
  // A figure of a tab, or its skeleton while its period loads.
  // A window that could not be read shows a dash, never zeros that look like data.
  const fig = (x) => (seriesLoading
    ? <Sk className="lg" w="64%" />
    : series === null ? <b className="arrive">-</b>
    : (
      <>
        <b className="arrive">{x.value}</b>
        <small className="hub-sub arrive">
          {x.sub}
          {x.growth !== null && <em className={x.growth >= 0 ? "up" : "down"} title={h.growthTitle}><span className="sr-only">{h.growthTitle}: </span>{pct(x.growth)}</em>}
        </small>
      </>
    ));

  // The list, as the filter bar narrows it; each control counts what the others leave.
  const all = rows || [];
  const matches = (p, skip) =>
    (skip === "status" || filters.status === "all" || groupOf(p.status) === filters.status) &&
    (skip === "chain" || filters.chain === "all" || chainOf(p) === filters.chain) &&
    matchesQuery([p.id, p.source, p.destination, p.amount, p.asset, p.memo, CHAIN_NAMES[chainOf(p)]], filters.q);
  const shown = all.filter((p) => matches(p, null));
  const groupCounts = countBy(all.filter((p) => matches(p, "status")), (p) => groupOf(p.status));
  const chainCounts = countBy(all.filter((p) => matches(p, "chain")), (p) => chainOf(p));

  return (
    <div className="hub">
      {/* The account card and its panel: who is collecting, at what rate, how much, and the main action. */}
      <section className="hub-hero" aria-label={org.name}>
        <div className="hub-card">
          <div className="hub-steps">
            <button type="button" className="hub-step" onClick={() => step(-1)} disabled={orgs.length < 2} aria-label={h.prevOrg}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 15l6-6 6 6" /></svg></button>
            <button type="button" className="hub-step" onClick={() => step(1)} disabled={orgs.length < 2} aria-label={h.nextOrg}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg></button>
          </div>
          <div className="hub-card-main">
            <div className="hub-card-top">
              <div className="hub-org">
                {/* The shell has no organization until its list arrives: a skeleton holds the name. */}
                {org.id ? <b>{org.name}</b> : <Sk className="lg sk-on-dark" w="10em" />}
                {org.id && <span className="hub-org-sub">{h.plan} {t.dash.planNames[org.plan] || org.plan || ""}</span>}
              </div>
              <button type="button" className="hub-gear" onClick={() => onGo("settings")} aria-label={t.dash.viewLabels.settings} title={t.dash.viewLabels.settings}>{DI.settings}</button>
            </div>
            <div className="hub-card-mid">
              <span className="hub-status"><span className="hub-status-ic" aria-hidden="true"><IcCheck /></span>{h.active}</span>
              {created && <span className="hub-created">{fmt(h.created, { date: created })}</span>}
            </div>
            <div className="hub-card-bottom">
              <div aria-busy={sumLoading || undefined}>
                <span className="hub-label">{h.settled}</span>
                <div className="hub-balance">
                  {sumLoading ? <Sk className="lg sk-on-dark" w="9em" /> : primary ? <span className="arrive">{`${amount(primary.amount)} ${primary.asset}`}</span> : <span className="hub-muted">{h.noVolume}</span>}
                  {volume.length > 1 && <button type="button" className="hub-more" onClick={() => onGo("balances")}>{fmt(h.moreAssets, { n: volume.length - 1 })}</button>}
                </div>
              </div>
              <p className="hub-terms">
                {plan.perTx && plan.perTx !== "-" && <span>{h.fee} <b>{plan.perTx}</b></span>}
                <span className="hub-terms-net">{tier}</span>
              </p>
            </div>
          </div>
        </div>
        {/* Beside the card: what the organization holds, its ID and the two main actions. */}
        <div className="hub-side">
          <div className="hub-side-head">
            <h2 className="hub-side-t">{h.balances}</h2>
            <button type="button" className="hub-link" onClick={() => onGo("balances")}>{h.allBalances}</button>
          </div>
          <ul className="hub-bals" role="list" aria-busy={bals === undefined || undefined}>
            {bals === undefined
              ? [0, 1, 2].map((i) => <li key={i} className="hub-bal"><Sk className="round" w="32px" /><span className="hub-bal-t"><Sk w="7em" /><Sk w="4em" /></span></li>)
              : (bals || []).slice(0, 4).map((x) => (
                <li key={`${x.chain}:${x.asset}`} className="arrive">
                  <button type="button" className="hub-bal" onClick={() => onGo("balances")}>
                    <TokenMark symbol={balSymbol(x)} chain={x.chain} chainName={networkName(x.chain)} size={32} />
                    <span className="hub-bal-t"><b>{amount(x.amount)} {balSymbol(x)}</b><span>{networkName(x.chain)}</span></span>
                  </button>
                </li>
              ))}
            {Array.isArray(bals) && !bals.length && <li className="hub-bal-empty">{h.noBalances}</li>}
            {bals === null && <li className="hub-bal-empty" role="alert">{t.dash.admin.loadError}</li>}
          </ul>
          <div className="hub-actions">
            <div className="hub-field">
              <OrgIdField id={org.id} label={h.orgId} />
              <a className="hub-link" href={DOCS}>{h.docs}</a>
            </div>
            <div className="hub-cta">
              {canCreatePayments && <button type="button" className="btn btn-dark" onClick={() => goFiltered(onGo, "payments", { create: "1" })}>{h.createLink}</button>}
              <button type="button" className="btn btn-outline-w" onClick={() => onGo("swaps")}>{h.newSwap}</button>
            </div>
          </div>
        </div>
      </section>

      {/* Activity by period: the strip and the paired bars. */}
      <section className="hub-section" aria-labelledby="hub-activity">
        <div className="hub-section-head">
          <h2 id="hub-activity">{h.activity}</h2>
          <div className="seg-tabs" role="group" aria-label={h.periodLabel}>
            {CHART_PERIODS.map((p) => (
              <button key={p} type="button" className={chartPeriod === p ? "on" : ""} aria-pressed={chartPeriod === p} onClick={() => setChartPeriod(p)}>{h.chartPeriods[p]}</button>
            ))}
          </div>
        </div>
        <div className="panel hub-panel" aria-busy={seriesLoading || undefined}>
          <div className="hub-metrics" role="tablist" aria-label={h.activity} onKeyDown={onTabKey}>
            {METRICS.map((k) => (
              <button
                key={k} type="button" role="tab" id={`hub-m-${k}`}
                className={metric === k ? "hub-metric on" : "hub-metric"}
                aria-selected={metric === k} aria-controls="hub-metric-panel" tabIndex={metric === k ? 0 : -1}
                onClick={() => setMetric(k)}
              >
                <span className="hub-metric-k">{m[k].label}</span>
                {fig(m[k])}
              </button>
            ))}
          </div>
          <div id="hub-metric-panel" role="tabpanel" aria-labelledby={`hub-m-${metric}`}>
            <div className="hub-chart-head">
              <div className="hub-legend" aria-hidden="true">
                <span><i className="dot-a" />{cur.a}</span>
                <span><i className="dot-b" />{cur.b}</span>
              </div>
              <button type="button" className="hub-link" onClick={openMetric}>{fmt(h.goTo, { view: t.dash.viewLabels[curView] })}</button>
            </div>
            {firstSeries ? <ChartSkeleton label={h.chartLabels[chartPeriod]} bars={12} /> : series !== null && !cur.bars ? (
              <p className="hub-nochart">{h.noBreakdown}</p>
            ) : (
              <div className={seriesLoading ? "hub-chart is-loading" : "hub-chart"}>
                {/* Remounted per figure and period, so the bars grow again from the axis. */}
                <BarChart
                  key={`${metric}-${chartPeriod}-${(cur.bars || []).length}`}
                  data={cur.bars && cur.bars.length ? cur.bars : [{ date: new Date().toISOString().slice(0, 10), a: 0, b: 0 }]}
                  label={metric === "volume" ? h.chartLabels[chartPeriod] : `${cur.label} (${h.chartPeriods[chartPeriod]})`}
                  aLabel={cur.a}
                  bLabel={cur.b}
                  dateLabel={h.thDate}
                  lang={lang}
                  period={chartPeriod}
                  shared={cur.shared}
                />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* The transaction list: the filter bar, then one line per payment. */}
      <section className="hub-section" aria-labelledby="hub-tx">
        <div className="hub-section-head">
          <h2 id="hub-tx">{h.txTitle}</h2>
          <div className="seg-tabs" role="group" aria-label={h.txTitle}>
            {LIST_PERIODS.map((p) => (
              <button key={p} type="button" className={listPeriod === p ? "on" : ""} aria-pressed={listPeriod === p} onClick={() => setListPeriod(p)}>{h.periods[p]}</button>
            ))}
          </div>
        </div>
        <FilterBar
          label={h.filtersLabel}
          query={filters.q} onQuery={(v) => set("q", v)} placeholder={h.searchPlaceholder}
          status={{
            label: fl.status, value: filters.status, onChange: (v) => set("status", v),
            options: [
              { key: "all", label: fl.allStatuses, count: all.filter((p) => matches(p, "status")).length },
              ...GROUPS.map((g) => ({ key: g, label: h.groups[g], count: groupCounts[g] || 0 })),
            ],
          }}
          selects={[{ key: "chain", label: fl.network, value: filters.chain, onChange: (v) => set("chain", v), options: [{ key: "all", label: fl.allNetworks }, ...CHAINS.map((c) => ({ key: c, label: CHAIN_NAMES[c], count: chainCounts[c] || 0 }))] }]}
          active={active} onReset={reset}
          shown={Math.min(shown.length, 20)} total={rows === null ? undefined : all.length} loading={rows === null}
        />
        <div className="panel hub-txlist">
          {rows === null ? (
            <ListSkeleton label={t.dash.cosmos.loading} rows={5} pairs={7} />
          ) : shown.length ? (
            <ul className="hub-rows arrive" role="list">
              {shown.slice(0, 20).map((p) => (
                <li className="hub-row" key={p.id}>
                  {statusIcon(p.status)}
                  <dl className="hub-cells">
                    <div><dt>{h.thId}</dt><dd><code>{short(p.id)}</code></dd></div>
                    <div><dt>{h.thStatus}</dt><dd className={`hub-st-t ${p.status === SETTLED ? "ok" : FAILED.includes(p.status) ? "fail" : "wait"}`}>{(h.status && h.status[p.status]) || p.status}</dd></div>
                    <div><dt>{h.thDate}</dt><dd>{fmtDateTime(p.createdAt)}</dd></div>
                    <div><dt>{h.thAmount}</dt><dd><b>{p.amount ? amount(p.amount) : "-"}</b> {assetLabel(p.asset, chainOf(p))}</dd></div>
                    <div><dt>{h.thNetwork}</dt><dd>{CHAIN_NAMES[chainOf(p)]}</dd></div>
                    <div><dt>{h.thFrom}</dt><dd><code>{short(p.source)}</code></dd></div>
                    <div><dt>{h.thTo}</dt><dd><code>{short(p.destination)}</code></dd></div>
                  </dl>
                  <RowMenu p={p} onGo={onGo} />
                </li>
              ))}
            </ul>
          ) : (
            <div className="empty">
              {all.length ? h.noMatch : h.noTx}
              {all.length > 0 && active > 0 && <div><button type="button" className="fbar-reset" onClick={reset}>{fl.clear}</button></div>}
            </div>
          )}
          {/* The whole list, keeping what this one is narrowed to (the period, the network, the
              search, and "settled", the one status group the Payments view has as a status). */}
          <button
            type="button" className="link-btn hub-viewall"
            onClick={() => goFiltered(onGo, "payments", {
              ...(LIST_DATE[listPeriod] ? { date: LIST_DATE[listPeriod] } : {}),
              ...(filters.chain !== "all" ? { chain: filters.chain } : {}),
              ...(filters.q ? { q: filters.q } : {}),
              ...(filters.status === "settled" ? { status: SETTLED } : {}),
            })}
          >{h.viewAll}</button>
        </div>
      </section>
    </div>
  );
}
