/* OverviewView: the organization's payments at a glance, laid out after the product
   owner's gateway-dashboard reference: a navy account card beside the totals, a period
   switch over a daily bar chart, then the latest settled payments and the activity feed.
   Every figure is the Payments API's /v1/summary; nothing here is sample data. */
import { useState, useEffect } from "react";
import { useT, useLang, fmt } from "@/lib/i18n/index";
import { metrics as metricsApi, paymentIntents as payApi } from "@/lib/api-client";
import { planSpec } from "@/lib/plans";
import { DOCS, PAYMENTS } from "@/components/cosmos/lib/constants";
import { useCopy } from "@/components/cosmos/hooks/useCopy";
import { IcCheck, IcCopy } from "@/components/cosmos/icons";
import { DI } from "@/components/cosmos/dashboard/icons";
import { fmtDateTime, notifIcon, fmtWhen, humanizeLocal, notifMeta } from "@/components/cosmos/dashboard/helpers";
import { Pill } from "@/components/cosmos/dashboard/components/Pill";
import { BarChart } from "@/components/cosmos/dashboard/components/BarChart";

const STATUS_PILL = { SUCCEEDED: "ok", FAILED: "fail", EXPIRED: "fail", CANCELLED: "fail", PENDING: "ref", SUBMITTED: "ref" };
const CHAIN_NAME = { stellar: "Stellar", solana: "Solana", monad: "Monad" };
const short = (a) => (a && a.length > 14 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a);
const NATIVE = { stellar: "XLM", solana: "SOL", monad: "MON" };
/* The list endpoint's asset, as the summary labels it: the chain's coin for "native", the
   code before an issuer, a long mint or contract address shortened. */
const assetText = (asset, chain) => {
  if (!asset || asset === "native") return NATIVE[chain] || "XLM";
  const code = String(asset).split(":")[0];
  return code.length > 12 ? short(code) : code;
};
/* The latest-payments periods, as the start of the window. "today" starts at local midnight. */
const PERIODS = ["today", "week", "month", "year"];
const periodStart = (period) => {
  const now = new Date();
  if (period === "today") return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const days = { week: 7, month: 30, year: 365 }[period];
  return new Date(now.getTime() - days * 86400000);
};

/* The organization id, copyable: the merchant code of the reference. */
function OrgIdPill({ id, label }) {
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

export function OverviewView({ org, notifications, onViewActivity, onGo = (v) => {}, env = "dev" }) {
  const t = useT();
  const lang = useLang();
  const o = t.dash.overview;
  const h = o.hub;
  const nt = t.dash.notifications;
  const [sum, setSum] = useState(null);
  // The latest settled payments of the chosen period (null until read, or if it cannot be).
  const [period, setPeriod] = useState("month");
  const [periodRows, setPeriodRows] = useState(null);
  const [range, setRange] = useState(30);

  useEffect(() => {
    let alive = true;
    metricsApi.summary(env).then((d) => { if (alive) setSum(d); }).catch(() => { if (alive) setSum(null); });
    return () => { alive = false; };
  }, [env]);
  useEffect(() => {
    let alive = true;
    payApi.list(env, { org: org.id, status: "SUCCEEDED", createdFrom: periodStart(period).toISOString(), take: 5 })
      .then((res) => { if (alive) setPeriodRows(Array.isArray(res?.data) ? res.data : []); })
      .catch(() => { if (alive) setPeriodRows(null); });
    return () => { alive = false; };
  }, [env, org.id, period]);

  const num = new Intl.NumberFormat(lang, { maximumFractionDigits: 2 });
  // Amounts arrive as exact decimal strings; grouped for reading, never re-rounded below 7 places.
  const amount = (v) => { const n = Number(v); return Number.isFinite(n) ? new Intl.NumberFormat(lang, { minimumFractionDigits: 2, maximumFractionDigits: 7 }).format(n) : v; };
  const totals = (sum && sum.totals) || {};
  const volume = (sum && sum.volume) || [];
  const primary = volume[0];
  const series = ((sum && sum.series) || []).slice(-range).map((s) => ({ date: s.date, volume: Number(s.volume) || 0, count: Number(s.count) || 0 }));
  const rangeVolume = series.reduce((a, s) => a + s.volume, 0);
  const rangeCount = series.reduce((a, s) => a + s.count, 0);
  // Growth of the settled volume against the window just before it, when the summary's 30-day
  // series holds that window (the 7-day view; the 30-day view has none) and it had volume.
  const fullVolume = ((sum && sum.series) || []).map((s) => Number(s.volume) || 0);
  const prevWindow = fullVolume.length >= range * 2 ? fullVolume.slice(-range * 2, -range) : null;
  const prevVolume = prevWindow ? prevWindow.reduce((a, v) => a + v, 0) : 0;
  const growth = prevWindow && prevVolume > 0 ? ((rangeVolume - prevVolume) / prevVolume) * 100 : null;
  const webhooks = (sum && sum.webhooks) || {};
  const recent = (sum && sum.recent) || [];
  const rows = periodRows
    ? periodRows.map((p) => ({ id: p.id, status: p.status, chain: p.chain, amount: p.amount, asset: assetText(p.asset, p.chain), destination: p.destination, createdAt: p.createdAt }))
    : recent;
  const plan = planSpec(org.plan);
  const since = org.createdAt ? new Date(org.createdAt).toLocaleDateString(lang, { day: "numeric", month: "short", year: "numeric" }) : null;
  const tier = env === "prod" ? t.dash.paylinks.network.prod : t.dash.paylinks.network.dev;

  const kpis = [
    { k: h.kpiTotal, v: num.format(totals.all ?? 0) },
    { k: h.kpiSucceeded, v: num.format(totals.succeeded ?? 0) },
    { k: h.kpiFailed, v: num.format((totals.failed ?? 0) + (totals.cancelled ?? 0)) },
    { k: h.kpiRate, v: `${num.format(totals.successRate ?? 0)}%` },
  ];
  const summary = [
    {
      k: h.sumVolume,
      v: num.format(rangeVolume),
      sub: growth === null ? null : fmt(h.growthVs, { pct: `${growth >= 0 ? "↑" : "↓"} ${num.format(Math.round(Math.abs(growth) * 10) / 10)}%`, n: range }),
      trend: growth === null ? "" : growth >= 0 ? "up" : "down",
    },
    { k: h.sumCount, v: num.format(rangeCount) },
    { k: h.sumPayers, v: num.format((sum && sum.customers) ?? 0) },
    { k: h.sumWebhooks, v: num.format(webhooks.deliveries ?? 0), sub: webhooks.failedDeliveries ? fmt(h.sumWebhooksFailed, { n: webhooks.failedDeliveries }) : null },
  ];

  return (
    <div className="hub">
      {/* The account card: who is collecting, on which network, at what rate, and how much. */}
      <section className="hub-hero" aria-label={org.name}>
        <div className="hub-card">
          <div className="hub-card-top">
            <span className="hub-org-av" aria-hidden="true">{(org.name || "?").slice(0, 1).toUpperCase()}</span>
            <div className="hub-org">
              <b>{org.name}</b>
              <span className="hub-status"><span className="hub-status-ic" aria-hidden="true"><IcCheck /></span>{h.active}{since && <em>{fmt(h.since, { date: since })}</em>}</span>
            </div>
            <button type="button" className="hub-gear" onClick={() => onGo("settings")} aria-label={t.dash.viewLabels.settings} title={t.dash.viewLabels.settings}>{DI.settings}</button>
          </div>
          <div className="hub-card-bottom">
            <div>
              <span className="hub-label">{h.settled}</span>
              <div className="hub-balance">
                {primary ? `${amount(primary.amount)} ${primary.asset}` : <span className="hub-muted">{h.noVolume}</span>}
                {volume.length > 1 && <span className="hub-more">{fmt(h.moreAssets, { n: volume.length - 1 })}</span>}
              </div>
            </div>
            <p className="hub-terms">
              {/* A plan without a per-payment rate (Community: "-") shows no rate line. */}
              {plan.perTx && plan.perTx !== "-" && <span>{h.rate} <b>{plan.perTx}</b></span>}
              <span><b>{tier}</b></span>
            </p>
          </div>
        </div>
        <div className="hub-side">
          <div className="hub-kpis">
            {kpis.map((m) => (
              <div className="hub-kpi" key={m.k}><span>{m.k}</span><b>{m.v}</b></div>
            ))}
          </div>
          <div className="hub-actions">
            <OrgIdPill id={org.id} label={h.orgId} />
            <div className="hub-cta">
              <button type="button" className="btn btn-dark" onClick={() => onGo("payments")}>{DI.plus} {h.createLink}</button>
              <div className="hub-links">
                <a href={DOCS}>{h.docs}</a>
                <a href={`${PAYMENTS}/integrations`} target="_blank" rel="noopener">{h.designs}</a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Activity over the period. */}
      <section className="hub-section" aria-labelledby="hub-activity">
        <div className="hub-section-head">
          <h2 id="hub-activity">{h.activity}</h2>
          <div className="seg-tabs" role="group" aria-label={h.activity}>
            {[7, 30].map((r) => (
              <button key={r} type="button" className={range === r ? "on" : ""} aria-pressed={range === r} onClick={() => setRange(r)}>
                {r === 7 ? h.period7 : h.period30}
              </button>
            ))}
          </div>
        </div>
        <div className="panel hub-panel">
          <div className="hub-summary">
            {summary.map((m) => (
              <div key={m.k}><span>{m.k}</span><b>{m.v}</b>{m.sub && <em className={m.trend || undefined}>{m.sub}</em>}</div>
            ))}
          </div>
          <div className="hub-legend" aria-hidden="true">
            <span><i className="dot-vol" />{h.legendVolume}</span>
            <span><i className="dot-cnt" />{h.legendCount}</span>
          </div>
          <BarChart
            data={series.length ? series : [{ date: new Date().toISOString().slice(0, 10), volume: 0, count: 0 }]}
            label={fmt(h.chartLabel, { n: range })}
            volumeLabel={h.legendVolume}
            countLabel={h.legendCount}
            dateLabel={h.thDate}
            lang={lang}
          />
        </div>
      </section>

      <div className="hub-columns">
        <section className="hub-section" aria-labelledby="hub-tx">
          <div className="hub-section-head">
            <h2 id="hub-tx">{h.transactions}</h2>
            <div className="seg-tabs" role="group" aria-label={h.transactions}>
              {PERIODS.map((p) => (
                <button key={p} type="button" className={period === p ? "on" : ""} aria-pressed={period === p} onClick={() => setPeriod(p)}>
                  {h.periods[p]}
                </button>
              ))}
            </div>
          </div>
          <div className="panel">
            {rows.length > 0 ? (
              <div className="t-scroll"><table className="tx hub-tx"><thead><tr><th>{h.thId}</th><th>{h.thDate}</th><th>{h.thAmount}</th><th>{h.thNetwork}</th><th>{h.thTo}</th><th>{h.thStatus}</th></tr></thead>
                <tbody>{rows.map((p) => (
                  <tr key={p.id}>
                    <td className="tid"><span className="hub-idcell"><span className="hub-ok" aria-hidden="true"><IcCheck /></span>{short(p.id)}</span></td>
                    <td className="cust">{fmtDateTime(p.createdAt)}</td>
                    <td className="amt">{p.amount ? amount(p.amount) : "-"} {p.asset}</td>
                    <td className="cust">{CHAIN_NAME[p.chain] || p.chain || "Stellar"}</td>
                    <td className="cust"><code>{short(p.destination)}</code></td>
                    <td><Pill st={STATUS_PILL[p.status] || "ref"} label={(t.dash.paylinks.status && t.dash.paylinks.status[p.status]) || p.status} /></td>
                  </tr>
                ))}</tbody>
              </table></div>
            ) : <div className="empty">{periodRows ? h.noPeriodTx : t.dash.cosmos.empty}</div>}
            <button type="button" className="link-btn hub-viewall" onClick={() => onGo("payments")}>{h.viewAll}</button>
          </div>
        </section>

        <section className="hub-section" aria-labelledby="hub-feed">
          <div className="hub-section-head">
            <h2 id="hub-feed">{o.recentActivity}</h2>
            {onViewActivity && <button type="button" className="link-btn" onClick={onViewActivity}>{nt.viewAll}</button>}
          </div>
          <div className="panel">
            <div className="act-list">
              {(notifications || []).slice(0, 6).map((n) => (<div className="act" key={n.id}><div className="am">{notifIcon(n.type)}</div><div><div className="at">{(nt.types && nt.types[n.type]) || n.title}</div><div className="as">{notifMeta(n) || humanizeLocal(n.message)}</div></div><div className="ax">{fmtWhen(n.createdAt)}</div></div>))}
              {!(notifications || []).length && <div className="empty" style={{ padding: "26px 12px" }}>{nt.empty}</div>}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
