/* Platform-admin (owner/admin) views: global, cross-organization, read-only.
   Every list is the Payments table (product owner, 2026-10-27): its figures first, then the
   filter bar, then rows that open their detail, with the owning organization (the API
   consumer's apisixUsername, with the cosmos_ prefix stripped). IDs copy; counts/org cells
   cross-navigate (filtered by consumer).
   Data comes from the /api/admin/* proxy, which is owner/admin-gated server-side. */
import { useState, useEffect, useRef } from "react";
import { showToast } from "@/components/cosmos/shared";
import { useCopy } from "@/components/cosmos/hooks/useCopy";
import { useT, fmt } from "@/lib/i18n/index";
import { admin as adminApi } from "@/lib/api-client";
import { DI } from "@/components/cosmos/dashboard/icons";
import { IcCopy } from "@/components/cosmos/icons";
import { RowMenu } from "@/components/cosmos/dashboard/components/RowMenu";
import { fmtDateTime } from "@/components/cosmos/dashboard/helpers";
import { usePaged, useGsapRows } from "@/components/cosmos/dashboard/hooks";
import { Pill } from "@/components/cosmos/dashboard/components/Pill";
import { ViewHead } from "@/components/cosmos/dashboard/components/ViewHead";
import { ViewFigures } from "@/components/cosmos/dashboard/components/ActivityPanel";
import { FilterBar } from "@/components/cosmos/dashboard/components/FilterBar";
import { Pagination } from "@/components/cosmos/dashboard/components/Pagination";
import { FillRows } from "@/components/cosmos/dashboard/components/FillRows";
import { TableSkeleton } from "@/components/cosmos/dashboard/components/Skeleton";
import { RecordLink } from "@/components/cosmos/dashboard/components/RecordLink";
import { RecordDetail } from "@/components/cosmos/dashboard/components/RecordDetail";
import { AddressLink } from "@/components/cosmos/dashboard/components/AddressLink";
import { shortAddress } from "@/components/cosmos/dashboard/components/RecordPreview";
import { chainOf, networkLabel } from "@/components/cosmos/dashboard/components/PayLinkDetail";
import { StatusIcon, paymentTone, pillTone } from "@/components/cosmos/dashboard/components/StatusIcon";
import { explorerTxUrl, isChain, tierOf } from "@/lib/chains";
import { DISABLED_VIEWS } from "@/components/cosmos/dashboard/data";

/* ---- shared helpers ---- */
const PAY_FILTERS = ["all", "PENDING", "SUBMITTED", "SUCCEEDED", "FAILED", "EXPIRED", "CANCELLED"];
const ADMIN_PILL = {
  SUCCEEDED: "ok", FAILED: "fail", EXPIRED: "fail", CANCELLED: "fail", PENDING: "ref", SUBMITTED: "ref",
  // Cross-chain swaps (NEAR Intents).
  REFUNDED: "fail", AWAITING_DEPOSIT: "pend", DEPOSIT_DETECTED: "pend", INCOMPLETE_DEPOSIT: "pend", PROCESSING: "pend",
};
/* The swap tables the admin view reads: Stellar path payments, the two aggregator
   chains, and swaps between chains. Only Stellar follows the live/test network; the
   others run on mainnet only, so the environment switch does not filter them. */
const SWAP_VENUES = ["stellar", "solana", "monad", "crossChain"];
const CROSS_FILTERS = ["all", "AWAITING_DEPOSIT", "DEPOSIT_DETECTED", "INCOMPLETE_DEPOSIT", "PROCESSING", "SUCCEEDED", "REFUNDED", "FAILED", "EXPIRED"];
const NATIVE_TICKER = { stellar: "XLM", solana: "SOL", monad: "MON" };
// Fiat is off while its view is (DISABLED_VIEWS): its overview panel and the organizations'
// receiver / payin / payout columns go with it, so nothing links to a list that is not there.
const FIAT_ON = !DISABLED_VIEWS.includes("adminFiat");
// A product's kind as its catalog names it (t.dash.products.types), as the Products view's.
const PRODUCT_TYPES = { recurring: "Recurring", one_time: "One-time", link: "Payment link" };
const shortAsset = (asset, chain) =>
  !asset || asset === "native" ? NATIVE_TICKER[chain] || "XLM" : asset.length > 16 ? `${asset.slice(0, 4)}…${asset.slice(-4)}` : asset;
const netFromEnv = (env) => (env === "prod" ? "public" : "testnet");
const unwrapList = (res) => (Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : []);
// Owning-org label for a LIST row (consumer nested under row.consumer): prefer the
// resolved displayName, fall back to the stripped apisixUsername, then "-".
const stripUser = (u) => (u || "").replace(/^cosmos_/, "");
const orgOf = (row) => {
  const c = (row && row.consumer) || {};
  return c.displayName || stripUser(c.apisixUsername) || "-";
};
// Label for a CONSUMER row (AdminConsumersView), where the fields are top-level.
const consumerLabel = (c) => (c && (c.displayName || stripUser(c.apisixUsername) || c.id)) || "-";
// "native" is the coin of the row's chain; a row that names no chain is a Stellar one.
const assetOf = (asset, chain) => (!asset || asset === "native" ? NATIVE_TICKER[chain] || NATIVE_TICKER.stellar : asset);
const shortAcct = (a) => (a && a.length > 12 ? `${a.slice(0, 6)}…${a.slice(-4)}` : (a || "-"));
function fiatPill(status) {
  const s = (status || "").toLowerCase();
  if (["approved", "verified", "completed", "complete", "paid", "settled", "success"].includes(s)) return "ok";
  if (["rejected", "denied", "failed", "cancelled", "canceled", "error"].includes(s)) return "fail";
  return "ref";
}
/* Readable label for a raw provider status/KYC code so the admin tables never show a snake_case
   code: "on_hold" → "On hold", "pending_user" → "Pending user". Empty → "" (caller falls back). */
function humanizeStatus(status) {
  const s = String(status || "").trim().replace(/[_-]+/g, " ");
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}
// A status as the list's own catalog names it, else the code made readable.
const statusText = (labels, status) => (labels && labels[status]) || humanizeStatus(status) || "-";
// A receiver's KYC status and a fiat transfer's status as the organization's Fiat view words them.
const kycWord = (t, status) => {
  const k = String(status || "").toLowerCase();
  const m = t.dash.blindpay.receivers.statuses || {};
  return m[k] || (["approved", "verified", "completed", "complete"].includes(k) ? m.approved : ["rejected", "denied", "failed"].includes(k) ? m.rejected : humanizeStatus(status));
};
const fiatWord = (t, status) => (status ? statusText(t.dash.blindpay.txStatuses, String(status).toLowerCase()) : "");
// A cross-chain swap's status as a tone: settled, given back or failed, or still on its way.
const crossTone = (status) => (status === "SUCCEEDED" ? "ok" : ["FAILED", "REFUNDED", "EXPIRED"].includes(status) ? "fail" : "wait");
// The figures' counts: how many rows each tone holds, and how many organizations they span.
const tally = (rows, toneOf) => rows.reduce((n, r) => { const k = toneOf(r); n[k] = (n[k] || 0) + 1; return n; }, { ok: 0, fail: 0, wait: 0, off: 0 });
const orgSpan = (rows) => new Set(rows.map((r) => r.consumerId).filter(Boolean)).size;
// A row's transaction on its chain's explorer, or null when it has none (or no known chain).
const txUrl = (chain, network, hash) => (isChain(chain) ? explorerTxUrl(chain, tierOf(network), hash) : null);

/* The four figures of a list whose rows carry a status: all of them (and the organizations they
   span), the completed ones, those still in progress and the failed ones. */
function statusFigures(a, rows, toneOf, labels = {}) {
  const n = tally(rows, toneOf);
  const orgs = orgSpan(rows);
  return [
    { key: "total", label: labels.total || a.figures.total, value: rows.length, sub: orgs ? (orgs === 1 ? a.figures.inOrgsOne : fmt(a.figures.inOrgs, { n: orgs })) : undefined },
    { key: "ok", label: labels.ok || a.figures.done, value: n.ok },
    { key: "wait", label: labels.wait || a.figures.open, value: n.wait + n.off },
    { key: "fail", label: labels.fail || a.figures.failed, value: n.fail },
  ];
}

/* A status filter's options, as Payments': "all", then each status the list holds (or the one
   chosen) with its mark and how many rows have it. */
function statusOptions(a, statuses, rows, current, labels, toneOf) {
  const counts = rows.reduce((n, r) => { n[r.status] = (n[r.status] || 0) + 1; return n; }, {});
  return [
    { value: "all", label: a.filters.all },
    ...statuses.filter((k) => k !== "all" && (counts[k] || current === k)).map((k) => ({ value: k, label: statusText(labels, k), icon: <StatusIcon tone={toneOf(k)} size={16} />, count: counts[k] || 0 })),
  ];
}

/* A row's detail (the shared RecordDetail): its fields, then the explorer when it has a
   transaction, its ids and whatever else it names to copy, and "only this organization". */
function AdminDetail({ eyebrow, title, fields, id, row = null, onFilter = null, explorer = null, copies = [], extra = [], onClose }) {
  const t = useT();
  const a = t.dash.admin;
  const [, copy] = useCopy();
  return (
    <RecordDetail
      eyebrow={eyebrow} title={title} fields={fields} onClose={onClose}
      actions={[
        ...extra,
        ...(explorer ? [{ key: "explorer", label: t.dash.balances.explorer, icon: DI.network, href: explorer, kind: extra.length ? "soft" : "dark" }] : []),
        ...(id ? [{ key: "id", label: t.dash.common.copyId, icon: <IcCopy />, onClick: () => copy(id, t.toasts.copied) }] : []),
        ...copies.filter((c) => c.value).map((c) => ({ key: c.key, label: c.label, icon: <IcCopy />, onClick: () => copy(c.value, t.toasts.copied) })),
        ...(onFilter && row && row.consumerId ? [{ key: "org", label: a.filterByOrg, icon: DI.org, onClick: () => { onClose(); onFilter(row); } }] : []),
      ]}
    />
  );
}

/* The row's first cell, as Payments': its id (or name) opens the detail, copies, and shows in
   full on hover; `sub` is a muted line beneath it. */
function IdTd({ id, label = null, sub = null, onOpen }) {
  return (
    <td className="tid">
      <RecordLink onOpen={onOpen} copy={id} title={id}>{label || <code>{shortAddress(String(id || "-"))}</code>}</RecordLink>
      {sub ? <div className="cust" style={{ fontSize: 12 }}>{sub}</div> : null}
    </td>
  );
}

/* The owning-organization cell, clickable to filter the CURRENT view by that org. */
function OrgTd({ row, onFilter }) {
  const label = orgOf(row);
  if (onFilter && row.consumerId) {
    return <td className="cust"><button type="button" className="link-btn" style={{ font: "inherit", cursor: "pointer" }} title={label} onClick={(e) => { e.stopPropagation(); onFilter(row); }}>{label}</button></td>;
  }
  return <td className="cust">{label}</td>;
}

/* A row's actions (as every list's): its details, `children` (the row's own action), its
   transaction on the explorer when the list has one (drawn disabled when this row has none),
   then the "⋮" with the same plus its id and whatever else it names to copy, and "only this
   organization". `explorer` undefined: the list has no transactions. */
function AdminRowMenu({ label, id, row = null, onFilter = null, onOpen = null, explorer = undefined, copies = [], extra = [], children = null }) {
  const t = useT();
  const a = t.dash.admin;
  const cm = t.dash.common;
  const [, copy] = useCopy();
  const name = label || id;
  const ex = t.dash.balances.explorer;
  return (
    <td className="row-actions" onClick={(e) => e.stopPropagation()}>
      {onOpen && <button type="button" className="icon-mini" title={cm.details} aria-label={`${cm.details}: ${name}`} onClick={onOpen}>{DI.docs}</button>}
      {children}
      {explorer !== undefined && (explorer
        ? <a className="icon-mini" href={explorer} target="_blank" rel="noopener noreferrer" title={ex} aria-label={`${ex}: ${name}`}>{DI.network}</a>
        : <button type="button" className="icon-mini" disabled title={cm.noTxYet} aria-label={`${ex}: ${name}`}>{DI.network}</button>)}
      <RowMenu
        label={fmt(cm.rowActions, { name })}
        items={[
          ...(onOpen ? [{ key: "open", label: cm.details, icon: DI.docs, onClick: onOpen }] : []),
          ...extra,
          { key: "id", label: cm.copyId, icon: <IcCopy />, disabled: !id, onClick: () => copy(id, t.toasts.copied) },
          ...copies.filter((c) => c.value).map((c) => ({ key: c.key, label: c.label, icon: <IcCopy />, onClick: () => copy(c.value, t.toasts.copied) })),
          ...(explorer ? [{ key: "explorer", label: ex, icon: DI.network, href: explorer, external: true }] : []),
          ...(onFilter && row && row.consumerId ? [{ key: "org", label: a.filterByOrg, icon: DI.org, onClick: () => onFilter(row) }] : []),
        ]}
      />
    </td>
  );
}

/* A removable "Organization: <label> ✕" chip shown when a consumer filter is active. */
function FilterChip({ a, label, onClear }) {
  return (
    <div className="paylink-actions" style={{ marginBottom: 12, alignItems: "center" }}>
      <span className="env-tag">{DI.org} {a.orgFilter}: {label}</span>
      <button type="button" className="btn btn-soft btn-sm" onClick={onClear}>{a.clearFilter} ✕</button>
    </div>
  );
}

/* Fetch a global admin list once (and refetch when deps change). */
function useAdminRows(fetcher, deps) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetcher()
      .then((res) => { if (alive) { setRows(unwrapList(res)); setError(false); } })
      .catch((err) => { if (alive) { setError(true); showToast((err && err.message) || "Couldn't load data.", "error"); } })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return { rows, setRows, loading, error };
}

/* Owner/admin row actions for a fiat receiver in the GLOBAL admin view (no org/env on
   access/enable; admin is global). Approve is shown ONLY for pending_review (mirrors the
   org-scoped Fiat rule); otherwise the disable/enable toggle when at the provider. */
function AdminReceiverActions({ a, row, env, onAccessChanged, onApproved, onFilter = null, onOpen = null }) {
  const af = a.fiat;
  const [busy, setBusy] = useState("");
  const status = (row.kycStatus || "").toLowerCase();
  const disabled = !!row.disabled;
  const isInactive = status === "inactive";
  const isPendingReview = status === "pending_review";
  const isPendingUser = status === "pending_user";
  const atProvider = !isInactive && !isPendingReview && !isPendingUser;

  // The customer returns to /kyc/return/<org>/<env>/<receiver>; for an admin row the
  // owning org comes from the enriched organizations[0].id (fallback to the consumer id).
  const orgId = (Array.isArray(row.organizations) && row.organizations[0] && row.organizations[0].id) || row.consumerId || (row.consumer && row.consumer.id) || "";
  const redirectUrl = `${window.location.origin}/kyc/return/${encodeURIComponent(orgId)}/${env || "dev"}/${encodeURIComponent(row.id)}`;

  const approve = (e) => {
    e.stopPropagation();
    if (busy) return;
    setBusy("approve");
    adminApi.approveReceiver(row.id, redirectUrl, row.dossierVersion)
      .then((res) => {
        const email = res && res.email;
        showToast((res && res.message) || (res && res.emailed && email ? fmt(af.termsSent, { email }) : af.approved));
        onApproved(row.id);
      })
      .catch((err) => showToast((err && err.message) || af.approveError, "error"))
      .finally(() => setBusy(""));
  };
  const toggle = (e) => {
    e.stopPropagation();
    if (busy) return;
    setBusy("access");
    adminApi.setReceiverAccess(row.id, !disabled)
      .then((rec) => {
        showToast(disabled ? af.accountEnabled : af.accountDisabled);
        const next = rec && typeof rec === "object" && typeof rec.disabled === "boolean" ? rec.disabled : !disabled;
        onAccessChanged(row.id, next);
      })
      .catch((err) => showToast((err && err.message) || af.accessError, "error"))
      .finally(() => setBusy(""));
  };
  // Resend the KYC verification (terms acceptance) email to a pending_user customer. The
  // provider enforces a once/day limit; that error surfaces via showToast.
  const resend = (e) => {
    e.stopPropagation();
    if (busy) return;
    setBusy("resend");
    adminApi.resendReceiverTos(row.id, redirectUrl)
      .then((res) => showToast(fmt(af.verificationSent, { email: (res && res.email) || row.email || "" })))
      .catch((err) => showToast((err && err.message) || af.resendError, "error"))
      .finally(() => setBusy(""));
  };

  return (
    <AdminRowMenu label={row.name || row.email || row.id} id={row.id} row={row} onFilter={onFilter} onOpen={onOpen} copies={[{ key: "email", label: a.copyEmail, value: row.email }, { key: "provider", label: a.copyProviderId, value: row.blindpayId }]}>
      {disabled
        ? <button type="button" className="btn btn-violet btn-sm" disabled={busy === "access"} onClick={toggle}>{af.enable}</button>
        : isPendingReview
          ? <button type="button" className="btn btn-violet btn-sm" disabled={busy === "approve"} onClick={approve}>{af.approve}</button>
          : isPendingUser
            ? <button type="button" className="btn btn-soft btn-sm" disabled={busy === "resend"} onClick={resend}>{busy === "resend" ? af.sending : af.resendVerification}</button>
            : atProvider
              ? <button type="button" className="btn btn-soft btn-sm danger-soft" disabled={busy === "access"} onClick={toggle}>{af.disable}</button>
              : null}
    </AdminRowMenu>
  );
}

/* Generic searchable + paginated admin table. `rows` is already status-filtered by the
   caller; this adds the list's figures (counted by the caller over every row it fetched), the
   filter bar (the search and the list's selects, over the panel, as every list's), pagination
   and row animation. */
function AdminTable({ a, loading, error, q, setQ, searchPlaceholder, heads, rows, haystack, renderRow, resetKey, filters = [], figures = null, figuresLabel = "" }) {
  const t = useT();
  const view = q ? rows.filter((row) => haystack(row).toLowerCase().includes(q.toLowerCase())) : rows;
  const pg = usePaged(view, `${resetKey || ""}|${q}`);
  const tref = useRef(null); useGsapRows(tref, pg.page + "|" + view.length);
  const active = (q ? 1 : 0) + filters.filter((f) => f.value !== f.options[0].value).length;
  const reset = () => { setQ(""); filters.forEach((f) => { if (f.value !== f.options[0].value) f.onChange(f.options[0].value); }); };
  return (
    <>
    {figures && <ViewFigures label={figuresLabel} items={figures} loading={loading} failed={error} />}
    <FilterBar
      label={t.dash.filters.label}
      query={q} onQuery={setQ} placeholder={searchPlaceholder}
      selects={filters.map((f) => ({ key: f.key, label: f.label, value: f.value, onChange: f.onChange, options: f.options.map((o) => ({ key: o.value, label: o.label, icon: o.icon, count: o.count })) }))}
      active={active} onReset={reset}
      shown={view.length} total={loading ? undefined : rows.length} loading={loading}
    />
    <div className="panel">
      {!loading && (
        <div className="t-scroll" tabIndex={0} ref={tref}><table className="tx"><thead><tr>{heads.map((h, i) => <th key={i}>{h === "" ? <span className="sr-only">{t.dash.common.actions}</span> : h}</th>)}</tr></thead>
          <tbody>
            {!error && pg.slice.map(renderRow)}
            <FillRows n={pg.size - (error ? 0 : pg.count)} cols={heads.length} empty={error ? a.loadError : null} />
          </tbody>
        </table></div>
      )}
      {loading && <TableSkeleton label={a.loading} cols={heads.length} />}
      {!loading && <Pagination {...pg} />}
    </div>
    </>
  );
}

/* ======================= Overview (global summary) ======================= */
function Breakdown({ obj, pillOf, labelOf = (k) => k }) {
  const entries = Object.entries(obj || {});
  if (!entries.length) return <span className="field-note">-</span>;
  return (
    <div className="paylink-actions" style={{ flexWrap: "wrap", gap: 10 }}>
      {entries.map(([k, v]) => (
        <span key={k} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <Pill st={(pillOf || (() => "ref"))(k)} label={labelOf(k)} /> <b>{v}</b>
        </span>
      ))}
    </div>
  );
}

/* Every figure opens the list it counts (`goToAdmin`): the organizations, customers and products,
   payments, swaps by venue and each fiat list. Webhook endpoints have no admin list, so that card
   is a figure only. */
export function AdminOverviewView({ env = "dev", goToAdmin = null }) {
  const t = useT();
  const a = t.dash.admin;
  const ao = a.overview;
  const network = netFromEnv(env);
  const [sum, setSum] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    adminApi.summary(network)
      .then((d) => { if (alive) { setSum(d); setError(false); } })
      .catch((err) => { if (alive) { setError(true); showToast((err && err.message) || a.loadError, "error"); } })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [network]);

  const pi = (sum && sum.paymentIntents) || {};
  const sw = (sum && sum.swaps) || {};
  const csw = (sum && sum.chainSwaps) || {};
  const xsw = (sum && sum.crossChainSwaps) || {};
  const fiat = (sum && sum.fiat) || {};

  return (
    <>
      <ViewHead title={ao.title} />
      {loading && <div className="panel"><TableSkeleton label={a.loading} /></div>}
      {!loading && error && <div className="panel"><div className="empty">{a.loadError}</div></div>}
      {!loading && !error && sum && (
        <>
          <div className="metrics">
            {[["consumers", sum.consumers, "adminConsumers"], ["customers", sum.customers, "adminCustomers"], ["products", sum.products, "adminProducts"], ["webhooks", sum.webhookEndpoints, null]].map(([k, v, to]) => (
              to && goToAdmin
                ? <button type="button" className="metric metric-link" key={k} onClick={() => goToAdmin(to, null)}><div className="ml">{ao.cards[k]}</div><div className="mv">{v ?? 0}</div></button>
                : <div className="metric" key={k}><div className="ml">{ao.cards[k]}</div><div className="mv">{v ?? 0}</div></div>
            ))}
          </div>

          <div className="panels">
            <div className="panel"><div className="panel-head"><h3>{ao.payments}</h3>{goToAdmin && <button type="button" className="hub-link" onClick={() => goToAdmin("adminPayments", null)}>{a.viewList}</button>}</div>
              <div style={{ padding: "0 16px 16px" }}><div className="mv" style={{ marginBottom: 10 }}>{pi.total ?? 0}</div><Breakdown obj={pi.byStatus} pillOf={(k) => ADMIN_PILL[k] || "ref"} labelOf={(k) => statusText(t.dash.paylinks.status, k)} /></div>
            </div>
            <div className="panel"><div className="panel-head"><h3>{ao.swaps}</h3>{goToAdmin && <button type="button" className="hub-link" onClick={() => goToAdmin("adminSwaps", { tab: "stellar" })}>{a.viewList}</button>}</div>
              <div style={{ padding: "0 16px 16px" }}><div className="mv" style={{ marginBottom: 10 }}>{sw.total ?? 0}</div><Breakdown obj={sw.byStatus} pillOf={(k) => ADMIN_PILL[k] || "ref"} labelOf={(k) => statusText(t.dash.swaps.status, k)} /></div>
            </div>
            <div className="panel"><div className="panel-head"><h3>{ao.chainSwaps}</h3>{goToAdmin && <button type="button" className="hub-link" onClick={() => goToAdmin("adminSwaps", { tab: "solana" })}>{a.viewList}</button>}</div>
              <div style={{ padding: "0 16px 16px" }}><div className="mv" style={{ marginBottom: 10 }}>{csw.total ?? 0}</div><Breakdown obj={csw.byStatus} pillOf={(k) => ADMIN_PILL[k] || "ref"} labelOf={(k) => statusText(t.dash.swaps.status, k)} /></div>
            </div>
            <div className="panel"><div className="panel-head"><h3>{ao.crossChainSwaps}</h3>{goToAdmin && <button type="button" className="hub-link" onClick={() => goToAdmin("adminSwaps", { tab: "crossChain" })}>{a.viewList}</button>}</div>
              <div style={{ padding: "0 16px 16px" }}><div className="mv" style={{ marginBottom: 10 }}>{xsw.total ?? 0}</div><Breakdown obj={xsw.byStatus} pillOf={(k) => ADMIN_PILL[k] || "ref"} labelOf={(k) => statusText(t.dash.crossChain.status, k)} /></div>
            </div>
          </div>

          {FIAT_ON && (
          <div className="panel" style={{ marginTop: 16 }}><div className="panel-head"><h3>{ao.fiat}</h3></div>
            <div style={{ padding: "4px 16px 16px" }}>
              {[["receivers", fiat.receivers], ["payins", fiat.payins], ["payouts", fiat.payouts]].map(([k, obj]) => (
                <div key={k} style={{ marginBottom: 14 }}>
                  <div className="admin-fiat-head">
                    <label className="field-l">{ao[k]}: {(obj && obj.total) ?? 0}</label>
                    {goToAdmin && <button type="button" className="hub-link" onClick={() => goToAdmin("adminFiat", { tab: k })}>{a.viewList}</button>}
                  </div>
                  <Breakdown obj={obj && obj.byStatus} pillOf={fiatPill} labelOf={(st) => (k === "receivers" ? kycWord(t, st) : fiatWord(t, st)) || st} />
                </div>
              ))}
            </div>
          </div>
          )}

          <div className="panel" style={{ marginTop: 16 }}><div className="panel-head"><h3>{ao.volume}</h3></div>
            {Array.isArray(sum.volume) && sum.volume.length > 0 ? (
              <div className="t-scroll" tabIndex={0}><table className="tx"><thead><tr><th>{ao.volHead.asset}</th><th>{ao.volHead.amount}</th><th>{ao.volHead.count}</th></tr></thead>
                <tbody>{sum.volume.map((v, i) => (
                  <tr key={i}><td>{assetOf(v.asset, v.chain)}</td><td className="amt">{v.amount}</td><td className="cust">{v.count}</td></tr>
                ))}</tbody>
              </table></div>
            ) : <div className="empty">{a.empty}</div>}
          </div>
        </>
      )}
    </>
  );
}

/* ======================= Payment intents ======================= */
export function AdminPaymentsView({ env = "dev", adminFilter, goToAdmin }) {
  const t = useT();
  const a = t.dash.admin;
  const ap = a.payments;
  const network = netFromEnv(env);
  const consumer = adminFilter && adminFilter.consumer;
  const { rows, loading, error } = useAdminRows(() => adminApi.paymentIntents({ network, consumer, take: 200 }), [network, consumer]);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const [open, setOpen] = useState(null);
  const statusFiltered = rows.filter((p) => filter === "all" || p.status === filter);
  const onOrgFilter = (row) => goToAdmin && goToAdmin("adminPayments", { consumer: row.consumerId, label: orgOf(row) });
  const labels = t.dash.paylinks.status;
  const explorer = (p) => txUrl(chainOf(p), p.network || network, p.txHash);
  const amount = (p) => `${p.amount || "-"} ${assetOf(p.asset, p.chain)}`;

  return (
    <>
      <ViewHead title={ap.title} />
      {consumer && <FilterChip a={a} label={adminFilter.label} onClear={() => goToAdmin && goToAdmin("adminPayments", null)} />}
      <AdminTable
        a={a} loading={loading} error={error} q={q} setQ={setQ} searchPlaceholder={ap.searchPlaceholder} tag={network} resetKey={filter}
        figures={statusFigures(a, rows, (p) => paymentTone(p.status))} figuresLabel={ap.title}
        filters={[{ key: "status", label: t.dash.filters.status, value: filter, onChange: setFilter, options: statusOptions(a, PAY_FILTERS, rows, filter, labels, paymentTone) }]}
        heads={[ap.tableHead.id, ap.tableHead.org, ap.tableHead.destination, ap.tableHead.amount, ap.tableHead.status, ap.tableHead.created, ""]}
        rows={statusFiltered}
        haystack={(p) => `${p.id || ""} ${p.txHash || ""} ${orgOf(p)} ${p.destination || ""} ${p.amount || ""} ${p.asset || ""} ${p.status || ""} ${statusText(labels, p.status)}`}
        empty={ap.empty}
        renderRow={(p) => (
          <tr key={p.id} className="row-click" onClick={() => setOpen(p)}>
            <IdTd id={p.id} onOpen={() => setOpen(p)} />
            <OrgTd row={p} onFilter={onOrgFilter} />
            <td className="cust">{shortAcct(p.destination)}</td>
            <td className="amt">{amount(p)}</td>
            <td><Pill st={ADMIN_PILL[p.status] || "ref"} tone={paymentTone(p.status)} label={statusText(labels, p.status)} /></td>
            <td className="cust">{fmtDateTime(p.createdAt)}</td>
            <AdminRowMenu id={p.id} row={p} onFilter={onOrgFilter} onOpen={() => setOpen(p)} explorer={explorer(p)} copies={[{ key: "tx", label: a.copyTx, value: p.txHash }, { key: "dest", label: a.copyDestination, value: p.destination }]} />
          </tr>
        )}
      />
      {open && (
        <AdminDetail
          eyebrow={ap.one} title={shortAddress(open.id)} id={open.id} row={open} onFilter={onOrgFilter} onClose={() => setOpen(null)}
          explorer={explorer(open)} copies={[{ key: "dest", label: a.copyDestination, value: open.destination }]}
          fields={[
            [ap.tableHead.id, <code key="id">{open.id}</code>],
            [ap.tableHead.org, orgOf(open)],
            [ap.tableHead.status, statusText(labels, open.status)],
            [ap.tableHead.amount, amount(open)],
            [a.network, networkLabel({ ...open, network: open.network || network })],
            [ap.tableHead.destination, open.destination && <AddressLink key="d" chain={chainOf(open)} network={open.network || network} address={open.destination} label={ap.tableHead.destination} />],
            [a.transaction, open.txHash && <code key="tx">{shortAddress(open.txHash)}</code>],
            [ap.tableHead.created, fmtDateTime(open.createdAt)],
          ]}
        />
      )}
    </>
  );
}

/* ======================= Swaps ======================= */
export function AdminSwapsView({ env = "dev", adminFilter, goToAdmin }) {
  const t = useT();
  const a = t.dash.admin;
  const as = a.swaps;
  const network = netFromEnv(env);
  const consumer = adminFilter && adminFilter.consumer;
  // The overview opens it on a venue (`adminFilter.tab`): Stellar, a chain or cross-chain.
  const [venue, setVenue] = useState((adminFilter && adminFilter.tab) || "stellar");
  useEffect(() => { if (adminFilter && adminFilter.tab) setVenue(adminFilter.tab); }, [adminFilter]);
  const fetcher =
    venue === "stellar" ? () => adminApi.swaps({ network, consumer, take: 200 })
      : venue === "crossChain" ? () => adminApi.crossChainSwaps({ consumer, take: 200 })
        : () => adminApi.chainSwaps({ chain: venue, consumer, take: 200 });
  const { rows, loading, error } = useAdminRows(fetcher, [network, consumer, venue]);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const [open, setOpen] = useState(null);
  const cross = venue === "crossChain";
  const filters = cross ? CROSS_FILTERS : PAY_FILTERS;
  const labels = cross ? t.dash.crossChain.status : t.dash.swaps.status;
  const toneOf = cross ? crossTone : paymentTone;
  const statusFiltered = rows.filter((s) => filter === "all" || s.status === filter);
  // Stellar follows the environment; the aggregator chains run on mainnet; a cross-chain swap's
  // deposit is on whichever chain it came from, which has no explorer here unless it is ours.
  const explorer = (s) => (cross ? txUrl(String(s.originChain || "").toLowerCase(), "public", s.depositTxHash) : txUrl(venue, venue === "stellar" ? network : "public", s.txHash));
  const route = (s) =>
    venue === "crossChain"
      ? `${s.amountIn} ${s.originAsset} (${s.originChain}) → ${s.amountOut || s.amountOutEstimated} ${s.destinationAsset} (${s.destinationChain})`
      : venue === "stellar"
        ? `${s.sendAmount ?? "-"} ${assetOf(s.sendAsset, "stellar")} → ${s.destEstimated ?? s.swapAmount ?? "-"} ${s.destAsset || ""}`.trim()
        : `${s.sendAmount ?? "-"} ${shortAsset(s.sendAsset, venue)} → ${s.destEstimated ?? "-"} ${shortAsset(s.destAsset, venue)}`;
  const onOrgFilter = (row) => goToAdmin && goToAdmin("adminSwaps", { consumer: row.consumerId, label: orgOf(row) });

  return (
    <>
      <ViewHead title={as.title} />
      {consumer && <FilterChip a={a} label={adminFilter.label} onClear={() => goToAdmin && goToAdmin("adminSwaps", null)} />}
      <AdminTable
        a={a} loading={loading} error={error} q={q} setQ={setQ} searchPlaceholder={as.searchPlaceholder} tag={venue === "stellar" ? network : "public"} resetKey={filter + venue}
        figures={statusFigures(a, rows, (s) => toneOf(s.status))} figuresLabel={as.title}
        filters={[
          // the venue is the list itself, so it is never "unset": its first value is Stellar
          { key: "venue", label: t.dash.filters.network, value: venue, onChange: (v) => { setVenue(v); setFilter("all"); }, options: SWAP_VENUES.map((k) => ({ value: k, label: as.venues[k] })) },
          { key: "status", label: t.dash.filters.status, value: filter, onChange: setFilter, options: statusOptions(a, filters, rows, filter, labels, toneOf) },
        ]}
        heads={[as.tableHead.id, as.tableHead.org, as.tableHead.route, as.tableHead.status, as.tableHead.created, ""]}
        rows={statusFiltered}
        haystack={(s) => `${s.id || ""} ${s.txHash || ""} ${orgOf(s)} ${s.source || ""} ${s.destination || ""} ${s.sendAsset || ""} ${s.destAsset || ""} ${s.recipient || ""} ${s.refundTo || ""} ${s.depositAddress || ""} ${s.status || ""} ${statusText(labels, s.status)}`}
        empty={as.empty}
        renderRow={(s) => (
          <tr key={s.id} className="row-click" onClick={() => setOpen(s)}>
            <IdTd id={s.id} onOpen={() => setOpen(s)} />
            <OrgTd row={s} onFilter={onOrgFilter} />
            <td className="amt">{route(s)}</td>
            <td><Pill st={ADMIN_PILL[s.status] || "ref"} tone={toneOf(s.status)} label={statusText(labels, s.status)} /></td>
            <td className="cust">{fmtDateTime(s.createdAt)}</td>
            <AdminRowMenu id={s.id} row={s} onFilter={onOrgFilter} onOpen={() => setOpen(s)} explorer={explorer(s)} copies={[{ key: "tx", label: a.copyTx, value: s.txHash || s.depositTxHash }, { key: "deposit", label: a.copyDeposit, value: s.depositAddress }]} />
          </tr>
        )}
      />
      {open && (
        <AdminDetail
          eyebrow={as.one} title={shortAddress(open.id)} id={open.id} row={open} onFilter={onOrgFilter} onClose={() => setOpen(null)}
          explorer={explorer(open)} copies={[{ key: "deposit", label: a.copyDeposit, value: open.depositAddress }]}
          fields={[
            [as.tableHead.id, <code key="id">{open.id}</code>],
            [as.tableHead.org, orgOf(open)],
            [t.dash.filters.network, as.venues[venue]],
            [as.tableHead.status, statusText(labels, open.status)],
            [as.tableHead.route, route(open)],
            [as.from, (open.source || open.refundTo) && <code key="f">{shortAddress(open.source || open.refundTo)}</code>],
            [as.to, (open.destination || open.recipient) && <code key="r">{shortAddress(open.destination || open.recipient)}</code>],
            [as.deposit, open.depositAddress && <code key="dep">{shortAddress(open.depositAddress)}</code>],
            [a.transaction, (open.txHash || open.depositTxHash) && <code key="tx">{shortAddress(open.txHash || open.depositTxHash)}</code>],
            [as.tableHead.created, fmtDateTime(open.createdAt)],
          ]}
        />
      )}
    </>
  );
}

/* ======================= Fiat (receivers / payins / payouts) ======================= */
function FiatList({ sub, a, consumer, onOrgFilter, env }) {
  const t = useT();
  const af = a.fiat;
  const [q, setQ] = useState("");
  const fetcher = sub === "receivers"
    ? () => adminApi.receivers({ consumer, take: 200 })
    : sub === "payins"
      ? () => adminApi.payins({ consumer, take: 200 })
      : () => adminApi.payouts({ consumer, take: 200 });
  const { rows, setRows, loading, error } = useAdminRows(fetcher, [sub, consumer]);
  const [open, setOpen] = useState(null);
  const onAccessChanged = (id, disabled) => { setRows((rs) => rs.map((x) => (x.id === id ? { ...x, disabled } : x))); setOpen((o) => (o && o.id === id ? { ...o, disabled } : o)); };
  const onApproved = (id) => { setRows((rs) => rs.map((x) => (x.id === id ? { ...x, kycStatus: "pending_user" } : x))); setOpen((o) => (o && o.id === id ? { ...o, kycStatus: "pending_user" } : o)); };
  const kycText = (x) => (x.disabled ? af.disabled : kycWord(t, x.kycStatus) || af.statusUnknown);
  const typeText = (x) => (t.dash.blindpay.receivers.types || {})[x.type] || humanizeStatus(x.type) || "-";
  const txText = (x) => fiatWord(t, x.status) || af.statusUnknown;
  const moneyText = (x) => `${x.senderAmount ?? "-"} → ${x.receiverAmount ?? "-"}`;
  const assetText = (x) => `${x.token || "-"}${x.network ? ` · ${x.network}` : ""}`;
  // A transfer's figures: all of them, settled, in progress and failed (the provider's words).
  const moneyFigures = statusFigures(a, rows, (x) => pillTone(fiatPill(x.status)));

  if (sub === "receivers") {
    const receiverName = (x) => x.name || x.email || x.blindpayId || x.id;
    return (
      <>
      <AdminTable
        a={a} loading={loading} error={error} q={q} setQ={setQ} searchPlaceholder={af.searchReceivers}
        figures={statusFigures(a, rows, (x) => (x.disabled ? "fail" : pillTone(fiatPill(x.kycStatus)) === "ok" ? "ok" : "wait"), { ok: af.approved, wait: af.inReview, fail: af.disabled })} figuresLabel={af.tabs.receivers}
        heads={[af.receiverHead.name, af.receiverHead.org, af.receiverHead.type, af.receiverHead.status, af.receiverHead.created, ""]}
        rows={rows} empty={af.emptyReceivers}
        haystack={(x) => `${x.name || ""} ${orgOf(x)} ${x.type || ""} ${typeText(x)} ${x.kycStatus || ""} ${kycText(x)} ${x.email || ""} ${x.id || ""} ${x.blindpayId || ""}`}
        renderRow={(x) => (
          <tr key={x.id} className="row-click" onClick={() => setOpen(x)}>
            <IdTd id={x.id} label={receiverName(x)} sub={x.email && x.email !== receiverName(x) ? x.email : null} onOpen={() => setOpen(x)} />
            <OrgTd row={x} onFilter={onOrgFilter} />
            <td className="cust">{typeText(x)}</td>
            <td>{x.disabled ? <Pill st="fail" label={af.disabled} /> : <Pill st={fiatPill(x.kycStatus)} label={kycText(x)} />}</td>
            <td className="cust">{fmtDateTime(x.createdAt)}</td>
            <AdminReceiverActions a={a} row={x} env={env} onAccessChanged={onAccessChanged} onApproved={onApproved} onFilter={onOrgFilter} onOpen={() => setOpen(x)} />
          </tr>
        )}
      />
      {open && (
        <AdminDetail
          eyebrow={af.receiverOne} title={receiverName(open)} id={open.id} row={open} onFilter={onOrgFilter} onClose={() => setOpen(null)}
          copies={[{ key: "email", label: a.copyEmail, value: open.email }, { key: "provider", label: a.copyProviderId, value: open.blindpayId }]}
          fields={[
            [af.receiverHead.name, open.name],
            [af.email, open.email],
            [af.receiverHead.org, orgOf(open)],
            [af.receiverHead.type, typeText(open)],
            [af.receiverHead.status, kycText(open)],
            [af.providerId, open.blindpayId && <code key="p">{open.blindpayId}</code>],
            [a.payments.tableHead.id, <code key="id">{open.id}</code>],
            [af.receiverHead.created, fmtDateTime(open.createdAt)],
          ]}
        />
      )}
      </>
    );
  }
  const payin = sub === "payins";
  const head = payin ? af.payinHead : af.payoutHead;
  const via = (x) => (payin ? x.paymentMethod : x.rail);
  return (
    <>
    <AdminTable
      a={a} loading={loading} error={error} q={q} setQ={setQ} searchPlaceholder={payin ? af.searchPayins : af.searchPayouts}
      figures={moneyFigures} figuresLabel={af.tabs[sub]}
      heads={[head.id, head.org, head.asset, payin ? head.method : head.rail, head.amount, head.status, head.created, ""]}
      rows={rows} empty={payin ? af.emptyPayins : af.emptyPayouts}
      haystack={(x) => `${x.id || ""} ${orgOf(x)} ${x.token || ""} ${x.network || ""} ${via(x) || ""} ${x.status || ""} ${txText(x)}`}
      renderRow={(x) => (
        <tr key={x.id} className="row-click" onClick={() => setOpen(x)}>
          <IdTd id={x.id} onOpen={() => setOpen(x)} />
          <OrgTd row={x} onFilter={onOrgFilter} />
          <td className="cust">{assetText(x)}</td>
          <td className="cust">{via(x) || "-"}</td>
          <td className="amt">{moneyText(x)}</td>
          <td><Pill st={fiatPill(x.status)} label={txText(x)} /></td>
          <td className="cust">{fmtDateTime(x.createdAt)}</td>
          <AdminRowMenu id={x.id} row={x} onFilter={onOrgFilter} onOpen={() => setOpen(x)} />
        </tr>
      )}
    />
    {open && (
      <AdminDetail
        eyebrow={payin ? af.payinOne : af.payoutOne} title={shortAddress(open.id)} id={open.id} row={open} onFilter={onOrgFilter} onClose={() => setOpen(null)}
        fields={[
          [head.id, <code key="id">{open.id}</code>],
          [head.org, orgOf(open)],
          [head.status, txText(open)],
          [head.asset, assetText(open)],
          [payin ? head.method : head.rail, via(open)],
          [head.amount, moneyText(open)],
          [head.created, fmtDateTime(open.createdAt)],
        ]}
      />
    )}
    </>
  );
}

export function AdminFiatView({ env = "dev", adminFilter, goToAdmin }) {
  const t = useT();
  const a = t.dash.admin;
  const af = a.fiat;
  const consumer = adminFilter && adminFilter.consumer;
  const [sub, setSub] = useState((adminFilter && adminFilter.tab) || "receivers");
  // Cross-nav into Fiat may target a specific sub-tab (payins/payouts/receivers).
  useEffect(() => { if (adminFilter && adminFilter.tab) setSub(adminFilter.tab); }, [adminFilter]);
  const subs = ["receivers", "payins", "payouts"];
  const onOrgFilter = (row) => goToAdmin && goToAdmin("adminFiat", { consumer: row.consumerId, label: orgOf(row), tab: sub });
  return (
    <>
      <ViewHead title={af.title} />
      {consumer && <FilterChip a={a} label={adminFilter.label} onClear={() => goToAdmin && goToAdmin("adminFiat", null)} />}
      <div className="filter-tabs">{subs.map((k) => <button key={k} className={sub === k ? "on" : ""} onClick={() => setSub(k)}>{af.tabs[k]}</button>)}</div>
      <FiatList key={`${sub}|${consumer || ""}`} sub={sub} a={a} consumer={consumer} onOrgFilter={onOrgFilter} env={env} />
    </>
  );
}

/* ======================= Customers ======================= */
export function AdminCustomersView({ adminFilter, goToAdmin }) {
  const t = useT();
  const a = t.dash.admin;
  const ac = a.customers;
  const consumer = adminFilter && adminFilter.consumer;
  const { rows, loading, error } = useAdminRows(() => adminApi.customers({ consumer, take: 200 }), [consumer]);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(null);
  const onOrgFilter = (row) => goToAdmin && goToAdmin("adminCustomers", { consumer: row.consumerId, label: orgOf(row) });
  const nameOf = (c) => c.name || c.alias || c.email || c.id;
  const walletsOf = (c) => (Array.isArray(c.wallets) ? c.wallets : []);
  const orgs = orgSpan(rows);
  return (
    <>
      <ViewHead title={ac.title} />
      {consumer && <FilterChip a={a} label={adminFilter.label} onClear={() => goToAdmin && goToAdmin("adminCustomers", null)} />}
      <AdminTable
        a={a} loading={loading} error={error} q={q} setQ={setQ} searchPlaceholder={ac.searchPlaceholder}
        figures={[
          { key: "total", label: ac.title, value: rows.length, sub: orgs ? (orgs === 1 ? a.figures.inOrgsOne : fmt(a.figures.inOrgs, { n: orgs })) : undefined },
          { key: "wallet", label: ac.figures.withWallet, value: rows.filter((c) => walletsOf(c).length).length },
          { key: "email", label: ac.figures.withEmail, value: rows.filter((c) => c.email).length },
        ]}
        figuresLabel={ac.title}
        heads={[ac.tableHead.name, ac.tableHead.org, ac.tableHead.email, t.dash.customers.tableHead.wallets, ac.tableHead.created, ""]}
        rows={rows} empty={ac.empty}
        haystack={(c) => `${c.name || ""} ${c.alias || ""} ${orgOf(c)} ${c.email || ""} ${walletsOf(c).map((w) => w.address).join(" ")} ${c.id || ""}`}
        renderRow={(c) => (
          <tr key={c.id} className="row-click" onClick={() => setOpen(c)}>
            <IdTd id={c.id} label={nameOf(c)} onOpen={() => setOpen(c)} />
            <OrgTd row={c} onFilter={onOrgFilter} />
            <td className="cust">{c.email || "-"}</td>
            <td className="cust">{walletsOf(c).length ? (walletsOf(c).length === 1 ? shortAcct(walletsOf(c)[0].address) : fmt(t.dash.customers.walletsCount, { n: walletsOf(c).length })) : "-"}</td>
            <td className="cust">{fmtDateTime(c.createdAt)}</td>
            <AdminRowMenu label={nameOf(c)} id={c.id} row={c} onFilter={onOrgFilter} onOpen={() => setOpen(c)} copies={[{ key: "email", label: a.copyEmail, value: c.email }]} />
          </tr>
        )}
      />
      {open && (
        <AdminDetail
          eyebrow={ac.one} title={nameOf(open)} id={open.id} row={open} onFilter={onOrgFilter} onClose={() => setOpen(null)}
          copies={[{ key: "email", label: a.copyEmail, value: open.email }]}
          fields={[
            [ac.tableHead.name, open.name || open.alias],
            [ac.tableHead.email, open.email],
            [ac.tableHead.org, orgOf(open)],
            [t.dash.customers.tableHead.wallets, walletsOf(open).length ? (
              <span key="w" style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {walletsOf(open).map((w) => <AddressLink key={w.id || w.address} chain={w.chain || "stellar"} network={w.network} address={w.address} label={t.dash.customers.tableHead.wallets} />)}
              </span>
            ) : null],
            [a.payments.tableHead.id, <code key="id">{open.id}</code>],
            [ac.tableHead.created, fmtDateTime(open.createdAt)],
          ]}
        />
      )}
    </>
  );
}

/* ======================= Products ======================= */
export function AdminProductsView({ adminFilter, goToAdmin }) {
  const t = useT();
  const a = t.dash.admin;
  const ap = a.products;
  const consumer = adminFilter && adminFilter.consumer;
  const { rows, loading, error } = useAdminRows(() => adminApi.products({ consumer, take: 200 }), [consumer]);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(null);
  const onOrgFilter = (row) => goToAdmin && goToAdmin("adminProducts", { consumer: row.consumerId, label: orgOf(row) });
  const types = t.dash.products.types;
  const kindText = (p) => types[PRODUCT_TYPES[p.kind]] || humanizeStatus(p.kind) || "-";
  const price = (p) => (p.amount ? `${p.amount} ${assetOf(p.asset, p.chain)}` : "-");
  const orgs = orgSpan(rows);
  return (
    <>
      <ViewHead title={ap.title} />
      {consumer && <FilterChip a={a} label={adminFilter.label} onClear={() => goToAdmin && goToAdmin("adminProducts", null)} />}
      <AdminTable
        a={a} loading={loading} error={error} q={q} setQ={setQ} searchPlaceholder={ap.searchPlaceholder}
        figures={[
          { key: "total", label: ap.title, value: rows.length, sub: orgs ? (orgs === 1 ? a.figures.inOrgsOne : fmt(a.figures.inOrgs, { n: orgs })) : undefined },
          ...Object.keys(PRODUCT_TYPES).map((k) => ({ key: k, label: types[PRODUCT_TYPES[k]], value: rows.filter((p) => p.kind === k).length })),
        ]}
        figuresLabel={ap.title}
        heads={[ap.tableHead.name, ap.tableHead.org, ap.tableHead.price, ap.tableHead.kind, ap.tableHead.created, ""]}
        rows={rows} empty={ap.empty}
        haystack={(p) => `${p.name || ""} ${orgOf(p)} ${p.kind || ""} ${kindText(p)} ${p.asset || ""} ${p.id || ""}`}
        renderRow={(p) => (
          <tr key={p.id} className="row-click" onClick={() => setOpen(p)}>
            <IdTd id={p.id} label={p.name || null} onOpen={() => setOpen(p)} />
            <OrgTd row={p} onFilter={onOrgFilter} />
            <td className="amt">{price(p)}</td>
            <td className="cust">{kindText(p)}</td>
            <td className="cust">{fmtDateTime(p.createdAt)}</td>
            <AdminRowMenu label={p.name} id={p.id} row={p} onFilter={onOrgFilter} onOpen={() => setOpen(p)} />
          </tr>
        )}
      />
      {open && (
        <AdminDetail
          eyebrow={ap.one} title={open.name || shortAddress(open.id)} id={open.id} row={open} onFilter={onOrgFilter} onClose={() => setOpen(null)}
          fields={[
            [ap.tableHead.name, open.name],
            [ap.tableHead.org, orgOf(open)],
            [ap.tableHead.price, price(open)],
            [ap.tableHead.kind, kindText(open)],
            [a.payments.tableHead.id, <code key="id">{open.id}</code>],
            [ap.tableHead.created, fmtDateTime(open.createdAt)],
          ]}
        />
      )}
    </>
  );
}

/* ======================= Consumers (organizations) ======================= */
export function AdminConsumersView({ goToAdmin }) {
  const t = useT();
  const a = t.dash.admin;
  const ac = a.consumers;
  const { rows, loading, error } = useAdminRows(() => adminApi.consumers({ take: 200 }), []);
  const [q, setQ] = useState("");
  // "swaps" counts every chain: Stellar path payments, Solana/Monad swaps and cross-chain.
  const cnt = (row, k) =>
    k === "swaps"
      ? ["swaps", "chainSwaps", "crossChainSwaps"].reduce((n, key) => n + ((row && row._count && row._count[key]) ?? 0), 0)
      : (row && row._count && row._count[k]) ?? 0;
  // A clickable count cell that drills into the target admin view, filtered by this org.
  const countTd = (c, k, view, tab) => {
    const n = cnt(c, k);
    if (!goToAdmin || !c.id || !n) return <td className="cust">{n}</td>;
    return <td className="cust"><button type="button" className="link-btn" style={{ font: "inherit", cursor: "pointer" }} onClick={(e) => { e.stopPropagation(); goToAdmin(view, { consumer: c.id, label: consumerLabel(c), tab }); }}>{n}</button></td>;
  };
  const orgNames = (c) => (Array.isArray(c.organizations) ? c.organizations.map((o) => o && o.name).filter(Boolean) : []);
  const accountLine = (c) => [c.accountName, c.accountEmail].filter(Boolean).join(" · ");
  const [open, setOpen] = useState(null);
  const sum = (k) => rows.reduce((n, c) => n + cnt(c, k), 0);
  // The lists an organization's detail and menu open, filtered by it.
  const lists = (c) => (goToAdmin && c.id ? [
    { key: "payments", label: ac.tableHead.payments, icon: DI.payments, onClick: () => goToAdmin("adminPayments", { consumer: c.id, label: consumerLabel(c) }) },
    { key: "swaps", label: ac.tableHead.swaps, icon: DI.swaps, onClick: () => goToAdmin("adminSwaps", { consumer: c.id, label: consumerLabel(c) }) },
    { key: "customers", label: ac.tableHead.customers, icon: DI.customers, onClick: () => goToAdmin("adminCustomers", { consumer: c.id, label: consumerLabel(c) }) },
  ] : []);
  return (
    <>
      <ViewHead title={ac.title} />
      <AdminTable
        a={a} loading={loading} error={error} q={q} setQ={setQ} searchPlaceholder={ac.searchPlaceholder}
        figures={[
          { key: "orgs", label: ac.title, value: rows.length },
          { key: "active", label: ac.figures.active, value: rows.filter((c) => cnt(c, "paymentIntents") + cnt(c, "swaps") > 0).length },
          { key: "payments", label: ac.tableHead.payments, value: sum("paymentIntents") },
          { key: "swaps", label: ac.tableHead.swaps, value: sum("swaps") },
        ]}
        figuresLabel={ac.title}
        heads={[ac.tableHead.org, ac.tableHead.payments, ac.tableHead.swaps, ac.tableHead.products, ac.tableHead.customers, ...(FIAT_ON ? [ac.tableHead.receivers, ac.tableHead.payins, ac.tableHead.payouts] : []), ac.tableHead.webhooks, ac.tableHead.created, ""]}
        rows={rows} empty={ac.empty}
        haystack={(c) => `${consumerLabel(c)} ${orgNames(c).join(" ")} ${c.accountName || ""} ${c.accountEmail || ""} ${c.apisixUsername || ""} ${c.id || ""}`}
        renderRow={(c) => {
          const names = orgNames(c);
          const acct = accountLine(c);
          return (
          <tr key={c.id} className="row-click" onClick={() => setOpen(c)}>
            <IdTd
              id={c.id} onOpen={() => setOpen(c)}
              label={<>{consumerLabel(c)}{names.length > 1 ? <span className="cust" style={{ fontSize: 12 }} title={names.join(", ")}> {fmt(ac.moreOrgs, { n: names.length - 1 })}</span> : null}</>}
              sub={acct ? `${ac.account}: ${acct}` : null}
            />
            {countTd(c, "paymentIntents", "adminPayments")}
            {countTd(c, "swaps", "adminSwaps")}
            {countTd(c, "products", "adminProducts")}
            {countTd(c, "customers", "adminCustomers")}
            {FIAT_ON && countTd(c, "blindpayReceivers", "adminFiat", "receivers")}
            {FIAT_ON && countTd(c, "payins", "adminFiat", "payins")}
            {FIAT_ON && countTd(c, "payouts", "adminFiat", "payouts")}
            <td className="cust">{cnt(c, "webhookEndpoints")}</td>
            <td className="cust">{fmtDateTime(c.createdAt)}</td>
            <AdminRowMenu
              label={consumerLabel(c)} id={c.id} onOpen={() => setOpen(c)}
              copies={[{ key: "user", label: ac.copyConsumer, value: c.apisixUsername }, { key: "email", label: a.copyEmail, value: c.accountEmail }]}
              extra={lists(c)}
            />
          </tr>
        ); }}
      />
      {open && (
        <AdminDetail
          eyebrow={ac.one} title={consumerLabel(open)} id={open.id} onClose={() => setOpen(null)}
          extra={lists(open).map((x, i) => ({ ...x, kind: i === 0 ? "dark" : "soft", onClick: () => { setOpen(null); x.onClick(); } }))}
          copies={[{ key: "user", label: ac.copyConsumer, value: open.apisixUsername }, { key: "email", label: a.copyEmail, value: open.accountEmail }]}
          fields={[
            [ac.figures.orgs, orgNames(open).join(", ") || consumerLabel(open)],
            [ac.account, accountLine(open)],
            [ac.gatewayUser, open.apisixUsername && <code key="u">{stripUser(open.apisixUsername)}</code>],
            [ac.tableHead.payments, String(cnt(open, "paymentIntents"))],
            [ac.tableHead.swaps, String(cnt(open, "swaps"))],
            [ac.tableHead.products, String(cnt(open, "products"))],
            [ac.tableHead.customers, String(cnt(open, "customers"))],
            [ac.tableHead.webhooks, String(cnt(open, "webhookEndpoints"))],
            [a.payments.tableHead.id, <code key="id">{open.id}</code>],
            [ac.tableHead.created, fmtDateTime(open.createdAt)],
          ]}
        />
      )}
    </>
  );
}
