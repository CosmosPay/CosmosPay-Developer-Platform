/* OverviewView: the organization's payments at a glance, strictly after the product owner's
   gateway-dashboard reference: a dark account card (its arrows step through the organizations)
   beside a grey panel with the totals, the organization ID and the main action; the payments
   activity by day, week, month or year (a five-column strip over paired bars); and the
   transaction list with its filter row and a menu per payment. Every figure comes from the
   Payments API (/v1/summary, /v1/summary/series and the payment list); nothing is sample data. */
import { useState, useEffect, useMemo, type FormEvent } from "react";
import { useT, useLang, fmt } from "@/lib/i18n/index";
import { metrics as metricsApi, paymentIntents as payApi } from "@/lib/api-client";
import { planSpec } from "@/lib/plans";
import { DOCS, PAYMENTS } from "@/components/cosmos/lib/constants";
import { useCopy } from "@/components/cosmos/hooks/useCopy";
import { showToast } from "@/components/cosmos/shared";
import { IcCheck, IcCopy } from "@/components/cosmos/icons";
import { DI } from "@/components/cosmos/dashboard/icons";
import { fmtDateTime } from "@/components/cosmos/dashboard/helpers";
import { useOutside } from "@/components/cosmos/dashboard/hooks";
import { BarChart } from "@/components/cosmos/dashboard/components/BarChart";
import { explorerUrl } from "@/components/cosmos/dashboard/components/PayLinkDetail";

const CHAIN_NAME = { stellar: "Stellar", solana: "Solana", monad: "Monad" };
const NATIVE = { stellar: "XLM", solana: "SOL", monad: "MON" };
const short = (a) => (a && a.length > 14 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a || "-");
/* The list endpoint's asset, as the summary labels it: the chain's coin for "native", the code
   before an issuer, a long mint or contract address shortened. */
const assetText = (asset, chain) => {
  if (!asset || asset === "native") return NATIVE[chain] || "XLM";
  const code = String(asset).split(":")[0];
  return code.length > 12 ? short(code) : code;
};
const CHART_PERIODS = ["day", "week", "month", "year"];
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
const NO_FILTERS = { onlySettled: false, id: "", amount: "", date: "", chain: "", wallet: "" };

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

/* A payment's menu: copy its id, open it on its chain's explorer (once it has a transaction),
   or in the Payments view. A disclosure: Escape and a click elsewhere close it. */
function RowMenu({ p, onGo }) {
  const t = useT();
  const h = t.dash.overview.hub;
  const [open, setOpen] = useState(false);
  const ref = useOutside(() => setOpen(false));
  const id = `hub-menu-${p.id}`;
  const copy = () => {
    navigator.clipboard?.writeText(p.id).then(() => showToast(t.toasts.copied)).catch(() => {});
    setOpen(false);
  };
  return (
    <div className="hub-menu-wrap" ref={ref} onKeyDown={(e) => { if (e.key === "Escape" && open) { e.stopPropagation(); setOpen(false); } }}>
      <button type="button" className="hub-kebab" aria-label={fmt(h.rowMenu, { id: short(p.id) })} aria-haspopup="true" aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)}>
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="5" r="1.7" /><circle cx="12" cy="12" r="1.7" /><circle cx="12" cy="19" r="1.7" /></svg>
      </button>
      <ul className="hub-menu" id={id} role="list" hidden={!open}>
        <li><button type="button" onClick={copy}>{DI.link}{h.copyId}</button></li>
        {p.txHash && (p.chain || "stellar") === "stellar" && <li><a href={explorerUrl(p)} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)}>{DI.network}{h.explorer}</a></li>}
        <li><button type="button" onClick={() => { setOpen(false); onGo("payments"); }}>{DI.payments}{h.openPayments}</button></li>
      </ul>
    </div>
  );
}

const statusIcon = (status) => {
  if (status === SETTLED) return <span className="hub-st ok" aria-hidden="true"><IcCheck /></span>;
  if (FAILED.includes(status)) return <span className="hub-st fail" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M7 7l10 10M17 7L7 17" /></svg></span>;
  return <span className="hub-st wait" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="12" cy="12" r="8" /><path d="M12 8v4l3 2" /></svg></span>;
};

export function OverviewView({ org, orgs = [], onSwitchOrg = (id) => {}, onGo = (v) => {}, env = "dev" }) {
  const t = useT();
  const lang = useLang();
  const h = t.dash.overview.hub;
  const [sum, setSum] = useState(null);
  const [chartPeriod, setChartPeriod] = useState("month");
  const [series, setSeries] = useState(null);
  const [listPeriod, setListPeriod] = useState("month");
  const [rows, setRows] = useState(null);
  const [draft, setDraft] = useState(NO_FILTERS);
  const [filters, setFilters] = useState(NO_FILTERS);

  useEffect(() => {
    let alive = true;
    metricsApi.summary(env).then((d) => { if (alive) setSum(d); }).catch(() => { if (alive) setSum(null); });
    return () => { alive = false; };
  }, [env]);
  useEffect(() => {
    let alive = true;
    metricsApi.series(env, chartPeriod).then((d) => { if (alive) setSeries(d); }).catch(() => { if (alive) setSeries(null); });
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
  const totals = (sum && sum.totals) || {};
  const volume = (sum && sum.volume) || [];
  const primary = volume[0];
  const plan = planSpec(org.plan);
  const created = org.createdAt ? new Date(org.createdAt).toLocaleDateString(lang, { day: "numeric", month: "short", year: "numeric" }) : null;
  const tier = env === "prod" ? t.dash.paylinks.network.prod : t.dash.paylinks.network.dev;

  // The organizations the arrows step through (the shell passes the usable ones).
  const at = orgs.findIndex((o) => o.id === org.id);
  const step = (d) => { if (orgs.length > 1) onSwitchOrg(orgs[(at + d + orgs.length) % orgs.length].id); };

  const kpis = [
    { k: h.kpiTotal, v: num.format(totals.all ?? 0) },
    { k: h.kpiSucceeded, v: num.format(totals.succeeded ?? 0) },
    { k: h.kpiFailed, v: num.format((totals.failed ?? 0) + (totals.cancelled ?? 0) + (totals.expired ?? 0)) },
    { k: h.kpiRate, v: `${num.format(totals.successRate ?? 0)}%` },
  ];

  // The chart's window and the one before it, for growth.
  const win = (series && series.totals) || { count: 0, succeeded: 0, failed: 0, volume: "0", payers: 0 };
  const before = (series && series.previous) || { count: 0, volume: "0" };
  const growth = (cur, prev) => (prev > 0 ? ((cur - prev) / prev) * 100 : null);
  const gVolume = growth(Number(win.volume) || 0, Number(before.volume) || 0);
  const gCount = growth(win.count || 0, before.count || 0);
  const pct = (g) => `${g >= 0 ? "↑" : "↓"} ${num.format(Math.round(Math.abs(g) * 10) / 10)}%`;
  const bars = ((series && series.buckets) || []).map((b) => ({ date: b.start, volume: Number(b.volume) || 0, count: b.count || 0 }));

  // The list, as the filters narrow it (applied by the filter button, as in the reference).
  const shown = useMemo(() => (rows || []).filter((p) => {
    if (filters.onlySettled && p.status !== SETTLED) return false;
    if (filters.id && !p.id.toLowerCase().includes(filters.id.trim().toLowerCase())) return false;
    if (filters.amount && !String(p.amount ?? "").startsWith(filters.amount.trim())) return false;
    if (filters.date && !String(p.createdAt).startsWith(filters.date)) return false;
    if (filters.chain && (p.chain || "stellar") !== filters.chain) return false;
    if (filters.wallet) {
      const w = filters.wallet.trim().toLowerCase();
      if (!`${p.source ?? ""} ${p.destination ?? ""}`.toLowerCase().includes(w)) return false;
    }
    return true;
  }), [rows, filters]);
  const apply = (e: FormEvent) => { e.preventDefault(); setFilters(draft); };
  const set = (k) => (e) => setDraft((d) => ({ ...d, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

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
                <b>{org.name}</b>
                <span className="hub-org-sub">{h.plan} {t.dash.planNames[org.plan] || org.plan || ""}</span>
              </div>
              <button type="button" className="hub-gear" onClick={() => onGo("settings")} aria-label={t.dash.viewLabels.settings} title={t.dash.viewLabels.settings}>{DI.settings}</button>
            </div>
            <div className="hub-card-mid">
              <span className="hub-status"><span className="hub-status-ic" aria-hidden="true"><IcCheck /></span>{h.active}</span>
              {created && <span className="hub-created">{fmt(h.created, { date: created })}</span>}
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
                {plan.perTx && plan.perTx !== "-" && <span>{h.fee} <b>{plan.perTx}</b></span>}
                <span className="hub-terms-net">{tier}</span>
              </p>
            </div>
          </div>
        </div>
        <div className="hub-side">
          <div className="hub-kpis">
            {kpis.map((m) => (
              <div className="hub-kpi" key={m.k}><span>{m.k}</span><b>{m.v}</b></div>
            ))}
          </div>
          <div className="hub-actions">
            <div className="hub-field">
              <OrgIdField id={org.id} label={h.orgId} />
              <a className="hub-link" href={DOCS}>{h.docs}</a>
            </div>
            <div className="hub-cta">
              <button type="button" className="btn btn-dark" onClick={() => onGo("payments")}>{h.createLink}</button>
              <a className="hub-link" href={`${PAYMENTS}/integrations`} target="_blank" rel="noopener">{h.designs}</a>
            </div>
          </div>
        </div>
      </section>

      {/* Activity by period: the strip and the paired bars. */}
      <section className="hub-section" aria-labelledby="hub-activity">
        <div className="hub-section-head">
          <h2 id="hub-activity">{h.activity}</h2>
          <div className="seg-tabs" role="group" aria-label={h.activity}>
            {CHART_PERIODS.map((p) => (
              <button key={p} type="button" className={chartPeriod === p ? "on" : ""} aria-pressed={chartPeriod === p} onClick={() => setChartPeriod(p)}>{h.chartPeriods[p]}</button>
            ))}
          </div>
        </div>
        <div className="panel hub-panel">
          <div className="hub-summary">
            <div><span>{h.sumVolume}</span><b>{num.format(Number(win.volume) || 0)}</b></div>
            <div><span>{h.sumCount}</span><b>{num.format(win.count || 0)}</b></div>
            <div><span>{h.sumFailed}</span><b>{num.format(win.failed || 0)}</b></div>
            <div><span>{h.sumPayers}</span><b>{num.format(win.payers || 0)}</b></div>
            <div title={h.growthTitle}>
              <span>{h.sumGrowth}</span>
              {/* Nothing before this window to compare with: one dash, not one per figure. */}
              <span className="hub-growth">
                {gVolume === null && gCount === null ? <em>-</em> : (
                  <>
                    <em className={gVolume === null ? "" : gVolume >= 0 ? "up" : "down"}><span className="sr-only">{h.growthVolume} </span>{gVolume === null ? "-" : pct(gVolume)}</em>
                    <em className={gCount === null ? "" : gCount >= 0 ? "up" : "down"}><span className="sr-only">{h.growthCount} </span>{gCount === null ? "-" : pct(gCount)}</em>
                  </>
                )}
              </span>
            </div>
          </div>
          <div className="hub-legend" aria-hidden="true">
            <span><i className="dot-vol" />{h.legendVolume}</span>
            <span><i className="dot-cnt" />{h.legendCount}</span>
          </div>
          <BarChart
            data={bars.length ? bars : [{ date: new Date().toISOString().slice(0, 10), volume: 0, count: 0 }]}
            label={h.chartLabels[chartPeriod]}
            volumeLabel={h.legendVolume}
            countLabel={h.legendCount}
            dateLabel={h.thDate}
            lang={lang}
            period={chartPeriod}
          />
        </div>
      </section>

      {/* The transaction list: a filter row, then one line per payment. */}
      <section className="hub-section" aria-labelledby="hub-tx">
        <div className="hub-section-head">
          <h2 id="hub-tx">{h.txTitle}</h2>
          <div className="seg-tabs" role="group" aria-label={h.txTitle}>
            {LIST_PERIODS.map((p) => (
              <button key={p} type="button" className={listPeriod === p ? "on" : ""} aria-pressed={listPeriod === p} onClick={() => setListPeriod(p)}>{h.periods[p]}</button>
            ))}
          </div>
        </div>
        <form className="hub-filters" role="search" aria-label={h.filtersLabel} onSubmit={apply}>
          <div className="hub-filter-row">
            <label className="hub-switch" title={h.onlySettled}>
              <input type="checkbox" role="switch" checked={draft.onlySettled} onChange={set("onlySettled")} />
              <span className="hub-switch-ui" aria-hidden="true" />
              <span className="sr-only">{h.onlySettled}</span>
            </label>
            <input className="hub-filter" type="search" placeholder={h.thId} aria-label={h.thId} value={draft.id} onChange={set("id")} />
            <input className="hub-filter" inputMode="decimal" placeholder={h.thAmount} aria-label={h.thAmount} value={draft.amount} onChange={set("amount")} />
            <input className="hub-filter" type="date" aria-label={h.thDate} value={draft.date} onChange={set("date")} />
            <select className="hub-filter" aria-label={h.network} value={draft.chain} onChange={set("chain")}>
              <option value="">{h.allNetworks}</option>
              {Object.entries(CHAIN_NAME).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <input className="hub-filter hub-filter-wide" type="search" placeholder={h.wallet} aria-label={h.wallet} value={draft.wallet} onChange={set("wallet")} />
          </div>
          <button type="submit" className="hub-filter-go" aria-label={h.applyFilters} title={h.applyFilters}>{DI.search}</button>
        </form>
        <div className="panel hub-txlist">
          {rows === null ? (
            <div className="empty">{t.dash.cosmos.loading || "…"}</div>
          ) : shown.length ? (
            <>
              <p className="sr-only" role="status">{fmt(h.shown, { n: shown.length, total: rows.length })}</p>
              <ul className="hub-rows" role="list">
                {shown.slice(0, 20).map((p) => (
                  <li className="hub-row" key={p.id}>
                    {statusIcon(p.status)}
                    <dl className="hub-cells">
                      <div><dt>{h.thId}</dt><dd><code>{short(p.id)}</code></dd></div>
                      <div><dt>{h.thStatus}</dt><dd className={`hub-st-t ${p.status === SETTLED ? "ok" : FAILED.includes(p.status) ? "fail" : "wait"}`}>{(h.status && h.status[p.status]) || p.status}</dd></div>
                      <div><dt>{h.thDate}</dt><dd>{fmtDateTime(p.createdAt)}</dd></div>
                      <div><dt>{h.thAmount}</dt><dd><b>{p.amount ? amount(p.amount) : "-"}</b> {assetText(p.asset, p.chain)}</dd></div>
                      <div><dt>{h.thNetwork}</dt><dd>{CHAIN_NAME[p.chain] || "Stellar"}</dd></div>
                      <div><dt>{h.thFrom}</dt><dd><code>{short(p.source)}</code></dd></div>
                      <div><dt>{h.thTo}</dt><dd><code>{short(p.destination)}</code></dd></div>
                    </dl>
                    <RowMenu p={p} onGo={onGo} />
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <div className="empty">{rows.length ? h.noMatch : h.noTx}</div>
          )}
          <button type="button" className="link-btn hub-viewall" onClick={() => onGo("payments")}>{h.viewAll}</button>
        </div>
      </section>
    </div>
  );
}
