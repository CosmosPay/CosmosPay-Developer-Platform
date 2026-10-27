/* OverviewView: the organization at a glance, after the product owner's gateway-dashboard
   reference: a dark account card (its arrows step through the organizations, shown only when
   there is another one) with the settled volume in USD, beside a white panel with the quick links
   as tiles (they follow what the viewer opens: src/lib/dashboard-usage.ts, kept by the shell; the
   balances have their own view), the organization ID and the main actions; the activity by
   day, week, month or year (components/ActivityPanel.tsx, shared with the views); and the
   transaction list with the dashboard's filter bar, a menu per payment and rows per page, each
   payment's id previewing it and both accounts linking to their explorer with a copy button.
   Every figure comes from the Payments API (/v1/summary, /v1/summary/series and the payment
   list); nothing is sample data. While a figure loads, a skeleton holds its place; then it
   counts up (Odometer). */
import { useState, useEffect, useRef } from "react";
import { useT, useLang, fmt } from "@/lib/i18n/index";
import { metrics as metricsApi, paymentIntents as payApi, organizations as orgsApi } from "@/lib/api-client";
import { planSpec } from "@/lib/plans";
import { planStatusOf, planStatusTone } from "@/lib/plan-status";
import { useCopy } from "@/components/cosmos/hooks/useCopy";
import { checkoutUrl, showToast } from "@/components/cosmos/shared";
import { ConfirmModal } from "@/components/cosmos/ui/ConfirmModal";
import { IcCheck, IcCopy } from "@/components/cosmos/icons";
import { DI } from "@/components/cosmos/dashboard/icons";
import { fmtDateTime } from "@/components/cosmos/dashboard/helpers";
import { useListFilters, usePaged, goFiltered, openRecord, recordHref } from "@/components/cosmos/dashboard/hooks";
import { ActivityPanel, countText, type MetricKey } from "@/components/cosmos/dashboard/components/ActivityPanel";
import { Odometer } from "@/components/cosmos/dashboard/components/Odometer";
import { Pagination } from "@/components/cosmos/dashboard/components/Pagination";
import { RecordLink } from "@/components/cosmos/dashboard/components/RecordLink";
import { RowMenu } from "@/components/cosmos/dashboard/components/RowMenu";
import { StatusIcon, paymentTone } from "@/components/cosmos/dashboard/components/StatusIcon";
import { TokenMark } from "@/components/cosmos/dashboard/components/TokenMark";
import { NetworkMark } from "@/components/cosmos/dashboard/components/OrgWallets";
import { PaymentPreview } from "@/components/cosmos/dashboard/components/RecordPreview";
import { AddressLink, shortAddress } from "@/components/cosmos/dashboard/components/AddressLink";
import { FilterBar } from "@/components/cosmos/dashboard/components/FilterBar";
import { Sk, ListSkeleton } from "@/components/cosmos/dashboard/components/Skeleton";
import { explorerUrl, chainOf, assetLabel } from "@/components/cosmos/dashboard/components/PayLinkDetail";
import { CHAINS, CHAIN_NAMES } from "@/lib/chains";
import { countBy, matchesQuery } from "@/lib/dashboard-filters";

const short = (a) => (a && a.length > 14 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a || "-");
/* The activity's figures (components/ActivityPanel.tsx), each a tab over its own chart: settled
   volume, payments, swaps of every kind, liquidity operations and webhook deliveries. */
const METRICS: MetricKey[] = ["volume", "payments", "swaps", "liquidity", "webhooks"];
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

/* A payment's menu (RowMenu, as every list's): its detail in Payments, a new tab, its id, its
   checkout link and page, its transaction on the explorer (disabled until there is one), and
   deleting it for whoever may create payments (disabled once paid, as in Payments). */
function PaymentMenu({ p, canDelete = false, onDelete }) {
  const t = useT();
  const h = t.dash.overview.hub;
  const cm = t.dash.common;
  const [, copy] = useCopy();
  const href = explorerUrl(p);
  return (
    <RowMenu
      label={fmt(h.rowMenu, { id: short(p.id) })}
      items={[
        { key: "open", label: cm.details, icon: DI.payments, onClick: () => openRecord("payment", p.id) },
        { key: "tab", label: cm.openNewTab, icon: DI.link, href: recordHref("payment", p.id), external: true },
        { key: "copy", label: h.copyId, icon: <IcCopy />, onClick: () => copy(p.id, t.toasts.copied) },
        { key: "link", label: cm.copyLink, icon: <IcCopy />, disabled: p.status !== "PENDING", hint: cm.notPayable, onClick: () => copy(checkoutUrl(p.id), t.toasts.copied) },
        { key: "checkout", label: t.dash.paylinks.detail.openCheckout, icon: DI.payments, href: checkoutUrl(p.id), external: true, disabled: p.status !== "PENDING", hint: cm.notPayable },
        { key: "explorer", label: h.explorer, icon: DI.network, href, external: true, disabled: !href, hint: cm.noTxYet },
        ...(canDelete ? [{ key: "delete", label: t.dash.paylinks.detail.delete, icon: DI.trash, danger: true, disabled: p.status === "SUCCEEDED", hint: cm.paidNoDelete, onClick: () => onDelete(p) }] : []),
      ]}
    />
  );
}

/* The overview list's period as the Payments view's date filter ("year" has none: everything). */
const LIST_DATE = { today: "today", week: "7d", month: "30d" };

export function OverviewView({ org, orgs = [], onSwitchOrg = (id) => {}, onGo = (v) => {}, canCreatePayments = false, env = "dev", quick = [], onQuickUse = (key) => {} }) {
  const t = useT();
  const lang = useLang();
  const h = t.dash.overview.hub;
  const fl = t.dash.filters;
  // undefined while loading, null when the request failed.
  const [sum, setSum] = useState(undefined);
  const [chartPeriod, setChartPeriod] = useState("month");
  const [series, setSeries] = useState(undefined);
  const [seriesLoading, setSeriesLoading] = useState(true);
  const [listPeriod, setListPeriod] = useState("month");
  const [rows, setRows] = useState(null);
  // The payment to delete from its menu, confirmed first.
  const [toDelete, setToDelete] = useState(null);
  const confirmDelete = () => {
    const p = toDelete;
    if (!p) return;
    payApi.remove(p.id, env)
      .then(() => setRows((r) => (r || []).filter((x) => x.id !== p.id)))
      .catch((e) => showToast((e && e.message) || t.dash.paylinks.deleteError, "error"));
  };
  // The organization's wallets, so an account's card can say it is one of them.
  const [wallets, setWallets] = useState([]);
  const { filters, set, reset, active } = useListFilters(DEFAULTS, ALLOWED);

  // The first look arrives in one go (product owner: never request after request): the summary,
  // the chart's window and the transactions together, for this environment and organization.
  // allSettled, so one that fails never holds back the others. A period changed afterwards
  // fetches only its own part; `fetched` remembers what each part last asked for.
  const fetched = useRef({ series: "", list: "" });
  const seriesKey = `${env}|${chartPeriod}`;
  const listKey = `${env}|${org.id}|${listPeriod}`;
  const listQuery = () => ({ org: org.id || undefined, createdFrom: periodStart(listPeriod).toISOString(), take: 100 });
  useEffect(() => {
    let alive = true;
    setSum(undefined);
    setSeriesLoading(true);
    setRows(null);
    fetched.current = { series: seriesKey, list: listKey };
    Promise.allSettled([metricsApi.summary(env), metricsApi.series(env, chartPeriod), payApi.list(env, listQuery()), org.id ? orgsApi.wallets(org.id) : Promise.resolve([])]).then(([s, w, l, ow]) => {
      if (!alive) return;
      setSum(s.status === "fulfilled" ? s.value : null);
      setSeries(w.status === "fulfilled" ? w.value : null);
      setSeriesLoading(false);
      setRows(l.status === "fulfilled" && Array.isArray(l.value?.data) ? l.value.data : []);
      setWallets(ow.status === "fulfilled" && Array.isArray(ow.value) ? ow.value : []);
    });
    return () => { alive = false; };
  }, [env, org.id]);
  useEffect(() => {
    if (fetched.current.series === seriesKey) return;
    fetched.current.series = seriesKey;
    let alive = true;
    setSeriesLoading(true);
    metricsApi.series(env, chartPeriod)
      .then((d) => { if (alive) setSeries(d); })
      .catch(() => { if (alive) setSeries(null); })
      .finally(() => { if (alive) setSeriesLoading(false); });
    return () => { alive = false; };
  }, [seriesKey]);
  useEffect(() => {
    if (fetched.current.list === listKey) return;
    fetched.current.list = listKey;
    let alive = true;
    setRows(null);
    payApi.list(env, listQuery())
      .then((res) => { if (alive) setRows(Array.isArray(res?.data) ? res.data : []); })
      .catch(() => { if (alive) setRows([]); });
    return () => { alive = false; };
  }, [listKey]);

  const num = new Intl.NumberFormat(lang, { maximumFractionDigits: 2 });
  // Amounts arrive as exact decimal strings; grouped for reading, never re-rounded below 7 places.
  const amount = (v) => { const n = Number(v); return Number.isFinite(n) ? new Intl.NumberFormat(lang, { minimumFractionDigits: 2, maximumFractionDigits: 7 }).format(n) : v; };
  // The settled volume is in USD (product owner): the server prices each asset; null means it
  // could not price at all, shown as a dash rather than a sum of unlike assets.
  const usdFmt = new Intl.NumberFormat(lang, { style: "currency", currency: "USD" });
  const usd = (v) => (v === null || v === undefined || !Number.isFinite(Number(v)) ? "-" : usdFmt.format(Number(v)));
  const sumLoading = sum === undefined;
  const volume = (sum && sum.volume) || [];
  const plan = planSpec(org.plan);
  const created = org.createdAt ? new Date(org.createdAt).toLocaleDateString(lang, { day: "numeric", month: "short", year: "numeric" }) : null;
  const tier = env === "prod" ? t.dash.env.production : t.dash.env.sandbox;

  // The organizations the arrows step through (the shell passes the usable ones).
  const at = orgs.findIndex((o) => o.id === org.id);
  const step = (d) => { if (orgs.length > 1) onSwitchOrg(orgs[(at + d + orgs.length) % orgs.length].id); };

  // The list, as the filter bar narrows it; each control counts what the others leave.
  const all = rows || [];
  const matches = (p, skip) =>
    (skip === "status" || filters.status === "all" || groupOf(p.status) === filters.status) &&
    (skip === "chain" || filters.chain === "all" || chainOf(p) === filters.chain) &&
    matchesQuery([p.id, p.source, p.destination, p.amount, p.asset, p.memo, CHAIN_NAMES[chainOf(p)]], filters.q);
  const shown = all.filter((p) => matches(p, null));
  const groupCounts = countBy(all.filter((p) => matches(p, "status")), (p) => groupOf(p.status));
  const chainCounts = countBy(all.filter((p) => matches(p, "chain")), (p) => chainOf(p));
  const pg = usePaged(shown, `${listPeriod}|${filters.q}|${filters.status}|${filters.chain}`);
  // What an account's card says beyond the address: the organization wallet it is, and the
  // payments of this list it paid or received, with the last one.
  const cm = t.dash.common;
  const accountContext = (addr) => () => {
    const w = wallets.find((x) => x.address === addr);
    const mine = all.filter((x) => x.source === addr || x.destination === addr);
    const last = mine.reduce((a, x) => (!a || x.createdAt > a ? x.createdAt : a), null);
    return [
      ...(w ? [[cm.orgWallet, w.label || shortAddress(w.address)]] : []),
      [cm.paymentsHere, num.format(mine.length)],
      ...(last ? [[cm.lastPayment, fmtDateTime(last)]] : []),
    ];
  };
  // A short or empty page keeps its height: the missing rows are drawn empty, and an empty one
  // stays empty (product owner: no message in the table).
  const fill = Math.max(0, pg.size - pg.count);
  // A quick link to a view switches in place on a plain click (the shell counts the view it opens);
  // the docs are a page of their own, counted here before the page leaves.
  const followQuick = (q) => (e) => {
    if (q.key === "docs") { onQuickUse(q.key); return; }
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    onGo(q.key);
  };

  return (
    <div className="hub">
      {/* The account card and its panel: who is collecting, at what rate, how much, and the main action. */}
      <section className="hub-hero" aria-label={org.name}>
        <div className={orgs.length > 1 ? "hub-card" : "hub-card solo"}>
          {/* The arrows switch organization quickly; with nothing to switch to they are not drawn. */}
          {orgs.length > 1 && <div className="hub-steps">
            <button type="button" className="hub-step" onClick={() => step(-1)} aria-label={h.prevOrg}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 15l6-6 6 6" /></svg></button>
            <button type="button" className="hub-step" onClick={() => step(1)} aria-label={h.nextOrg}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg></button>
          </div>}
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
              {/* The plan's standing: green active, yellow paused or overdue, red suspended. */}
              {(() => {
                const st = planStatusOf(org.planStatus);
                const tone = planStatusTone(st);
                return (
                  <span className={`hub-status ${tone}`}>
                    <span className="hub-status-ic" aria-hidden="true">
                      {st === "active" ? <IcCheck /> : st === "paused" ? <svg viewBox="0 0 24 24" fill="currentColor"><rect x="7" y="6" width="3.5" height="12" rx="1" /><rect x="13.5" y="6" width="3.5" height="12" rx="1" /></svg>
                        : st === "past_due" ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M12 6v8" /><path d="M12 18.5v.01" /></svg>
                        : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M7 7l10 10M17 7L7 17" /></svg>}
                    </span>
                    {h.planStatus[st]}
                  </span>
                );
              })()}
              {created && <span className="hub-created">{fmt(h.created, { date: created })}</span>}
            </div>
            <div className="hub-card-bottom">
              <div aria-busy={sumLoading || undefined}>
                <span className="hub-label">{h.settled}</span>
                <div className="hub-balance">
                  {sumLoading ? <Sk className="lg sk-on-dark" w="9em" />
                    : sum === null ? <span className="hub-muted">-</span>
                    : !volume.length ? <span className="hub-muted">{h.noVolume}</span>
                    : <Odometer className="arrive" text={usd(sum.volumeUsd)} />}
                </div>
                {sum && sum.unpriced > 0 && <small className="hub-card-note">{countText(sum.unpriced, h.usdUnpricedOne, h.usdUnpricedN, num)}</small>}
              </div>
              <p className="hub-terms">
                {plan.perTx && plan.perTx !== "-" && <span>{h.fee} <b>{plan.perTx}</b></span>}
                <span className="hub-terms-net">{tier}</span>
              </p>
            </div>
          </div>
        </div>
        {/* Beside the card: the quick links (Documentation, API keys, Webhooks and API logs until the
            viewer's own use says otherwise), the organization's ID and the two main actions. */}
        <div className="hub-side">
          <div className="hub-side-head">
            <h2 className="hub-side-t" id="hub-quick">{h.quick}</h2>
          </div>
          <ul className="hub-bals hub-quick" role="list" aria-labelledby="hub-quick">
            {quick.map((q) => (
              <li key={q.key}>
                <a className="hub-bal hub-quick-a" href={q.href} onClick={followQuick(q)}>
                  <span className="hub-quick-ic" aria-hidden="true">{q.icon}</span>
                  <b>{q.label}</b>
                </a>
              </li>
            ))}
          </ul>
          <div className="hub-actions">
            <div className="hub-field">
              <OrgIdField id={org.id} label={h.orgId} />
            </div>
            <div className="hub-cta">
              {canCreatePayments && <button type="button" className="btn btn-dark" onClick={() => goFiltered(onGo, "payments", { create: "1" })}>{h.createLink}</button>}
              {/* The swap form is a dialog on the Swaps view now: this opens it there (without the
                  right to swap, the view opens on its list). */}
              <button type="button" className="btn btn-outline-w" onClick={() => goFiltered(onGo, "swaps", { create: "1" })}>{h.newSwap}</button>
            </div>
          </div>
        </div>
      </section>

      {/* Activity by period: the figures over their charts, each linking into its view. */}
      <ActivityPanel id="hub-activity" series={series} loading={seriesLoading} period={chartPeriod} onPeriod={setChartPeriod} metrics={METRICS} onGo={onGo} />

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
              ...GROUPS.map((g) => ({ key: g, label: h.groups[g], count: groupCounts[g] || 0, icon: <StatusIcon tone={g === "settled" ? "ok" : g === "failed" ? "fail" : "wait"} size={16} /> })),
            ],
          }}
          selects={[{ key: "chain", label: fl.network, value: filters.chain, onChange: (v) => set("chain", v), options: [{ key: "all", label: fl.allNetworks }, ...CHAINS.map((c) => ({ key: c, label: CHAIN_NAMES[c], count: chainCounts[c] || 0, icon: <NetworkMark chain={c} size={18} /> }))] }]}
          active={active} onReset={reset}
          shown={shown.length} total={rows === null ? undefined : all.length} loading={rows === null}
        />
        <div className="panel hub-txlist">
          {rows === null ? (
            <ListSkeleton label={t.dash.cosmos.loading} rows={5} pairs={7} />
          ) : (
            <ul className="hub-rows arrive" role="list">
              {pg.slice.map((p) => (
                // The whole row opens the payment's own view; its id is the link the keyboard reaches.
                <li className="hub-row is-link" key={p.id} onClick={(e) => { if (!(e.target as HTMLElement).closest("a, button")) openRecord("payment", p.id); }}>
                  <StatusIcon tone={paymentTone(p.status)} />
                  <dl className="hub-cells">
                    {/* The id opens the payment and previews it on hover; both accounts open on their
                        explorer and copy (product owner). */}
                    <div><dt>{h.thId}</dt><dd><RecordLink href={recordHref("payment", p.id)} onOpen={() => openRecord("payment", p.id)} copy={p.id} preview={() => <PaymentPreview p={p} status={(h.status && h.status[p.status]) || p.status} />}><code>{short(p.id)}</code></RecordLink></dd></div>
                    <div><dt>{h.thStatus}</dt><dd className={`hub-st-t ${p.status === SETTLED ? "ok" : FAILED.includes(p.status) ? "fail" : "wait"}`}>{(h.status && h.status[p.status]) || p.status}</dd></div>
                    <div><dt>{h.thDate}</dt><dd>{fmtDateTime(p.createdAt)}</dd></div>
                    <div><dt>{h.thAmount}</dt><dd><span className="cell-mark"><TokenMark symbol={assetLabel(p.asset, chainOf(p))} chain={chainOf(p)} chainName={CHAIN_NAMES[chainOf(p)]} size={18} /><span><b>{p.amount ? amount(p.amount) : "-"}</b> {assetLabel(p.asset, chainOf(p))}</span></span></dd></div>
                    <div><dt>{h.thNetwork}</dt><dd><span className="cell-mark"><NetworkMark chain={chainOf(p)} size={18} /><span>{CHAIN_NAMES[chainOf(p)]}</span></span></dd></div>
                    <div><dt>{h.thFrom}</dt><dd><AddressLink chain={chainOf(p)} network={p.network} address={p.source} label={h.thFrom} context={accountContext(p.source)} /></dd></div>
                    <div><dt>{h.thTo}</dt><dd><AddressLink chain={chainOf(p)} network={p.network} address={p.destination} label={h.thTo} context={accountContext(p.destination)} /></dd></div>
                  </dl>
                  <PaymentMenu p={p} canDelete={canCreatePayments} onDelete={setToDelete} />
                </li>
              ))}
              {Array.from({ length: fill }, (_, i) => <li className="hub-row row-fill" key={`fill-${i}`} aria-hidden="true" />)}
            </ul>
          )}
          {rows !== null && (
            <Pagination {...pg}>
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
            </Pagination>
          )}
        </div>
      </section>
      {toDelete && <ConfirmModal title={t.dash.paylinks.detail.deleteTitle} body={fmt(t.dash.paylinks.detail.deleteBody, { id: toDelete.id })} confirmLabel={t.dash.paylinks.detail.deleteConfirm} cancelLabel={t.dash.common.cancel} onConfirm={confirmDelete} onClose={() => setToDelete(null)} />}
    </div>
  );
}
