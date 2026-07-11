/* Platform-admin (owner/admin) views — global, cross-organization, read-only.
   Every list is searchable + paginated (mirrors PaymentsView) and shows the owning
   organization (the API consumer's apisixUsername, with the cosmos_ prefix stripped).
   IDs are click-to-copy; counts/org cells cross-navigate (filtered by consumer).
   Data comes from the /api/admin/* proxy, which is owner/admin-gated server-side. */
import { useState, useEffect, useRef } from "react";
import { showToast } from "@/components/cosmos/shared";
import { useCopy } from "@/components/cosmos/hooks/useCopy";
import { useT, fmt } from "@/lib/i18n/index";
import { admin as adminApi } from "@/lib/api-client";
import { DI } from "@/components/cosmos/dashboard/icons";
import { fmtDateTime } from "@/components/cosmos/dashboard/helpers";
import { usePaged, useGsapRows } from "@/components/cosmos/dashboard/hooks";
import { Pill } from "@/components/cosmos/dashboard/components/Pill";
import { ViewHead } from "@/components/cosmos/dashboard/components/ViewHead";
import { Toolbar } from "@/components/cosmos/dashboard/components/Toolbar";
import { Pagination } from "@/components/cosmos/dashboard/components/Pagination";

/* ---- shared helpers ---- */
const PAY_FILTERS = ["all", "PENDING", "SUBMITTED", "SUCCEEDED", "FAILED"];
const ADMIN_PILL = { SUCCEEDED: "ok", FAILED: "fail", EXPIRED: "fail", CANCELLED: "fail", PENDING: "ref", SUBMITTED: "ref" };
const netFromEnv = (env) => (env === "prod" ? "public" : "testnet");
const unwrapList = (res) => (Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : []);
// Owning-org label for a LIST row (consumer nested under row.consumer): prefer the
// resolved displayName, fall back to the stripped apisixUsername, then "—".
const stripUser = (u) => (u || "").replace(/^cosmos_/, "");
const orgOf = (row) => {
  const c = (row && row.consumer) || {};
  return c.displayName || stripUser(c.apisixUsername) || "—";
};
// Label for a CONSUMER row (AdminConsumersView), where the fields are top-level.
const consumerLabel = (c) => (c && (c.displayName || stripUser(c.apisixUsername) || c.id)) || "—";
const assetOf = (asset) => (!asset || asset === "native" ? "XLM" : asset);
const shortAcct = (a) => (a && a.length > 12 ? `${a.slice(0, 6)}…${a.slice(-4)}` : (a || "—"));
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

/* Click-to-copy value. Shows `display` (or the value) end-truncated in a monospace
   cell; clicking copies the FULL raw value and toasts. */
function CopyText({ value, display, width = 190, muted = false }) {
  const t = useT();
  const [done, copy] = useCopy();
  const text = value == null ? "" : String(value);
  if (!text || text === "—") return <span className="cust">—</span>;
  return (
    <button
      type="button" title={text}
      onClick={(e) => { e.stopPropagation(); copy(text, t.toasts.copied); }}
      style={{
        background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left",
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: muted ? 11.5 : 12.5,
        opacity: muted ? 0.7 : 1, color: "var(--ink)", maxWidth: width, overflow: "hidden",
        textOverflow: "ellipsis", whiteSpace: "nowrap", display: "inline-block", verticalAlign: "middle",
      }}
    >
      {done ? "✓ " : ""}{display || text}
    </button>
  );
}

/* An id cell (primary id + optional secondary id such as txHash), both copyable. */
function IdTd({ id, secondary }) {
  return (
    <td className="tid">
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <CopyText value={id} />
        {secondary ? <CopyText value={secondary} muted /> : null}
      </div>
    </td>
  );
}

/* A name cell with copyable ids beneath it (e.g. local id + provider id). */
function NameTd({ name, ids = [] }) {
  const list = ids.filter(Boolean);
  return (
    <td>
      <div>{name || "—"}</div>
      {list.length > 0 && <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 2 }}>{list.map((v, i) => <CopyText key={i} value={v} muted />)}</div>}
    </td>
  );
}

/* The owning-organization cell — clickable to filter the CURRENT view by that org. */
function OrgTd({ row, onFilter }) {
  const label = orgOf(row);
  if (onFilter && row.consumerId) {
    return <td className="cust"><button type="button" className="link-btn" style={{ font: "inherit", cursor: "pointer" }} title={label} onClick={() => onFilter(row)}>{label}</button></td>;
  }
  return <td className="cust">{label}</td>;
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
   access/enable — admin is global). Approve is shown ONLY for pending_review (mirrors the
   org-scoped Fiat rule); otherwise the disable/enable toggle when at the provider. */
function AdminReceiverActions({ a, row, env, onAccessChanged, onApproved }) {
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
    adminApi.approveReceiver(row.id, redirectUrl)
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
    <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
      {disabled
        ? <button type="button" className="btn btn-violet btn-sm" disabled={busy === "access"} onClick={toggle}>{af.enable}</button>
        : isPendingReview
          ? <button type="button" className="btn btn-violet btn-sm" disabled={busy === "approve"} onClick={approve}>{af.approve}</button>
          : isPendingUser
            ? <button type="button" className="btn btn-soft btn-sm" disabled={busy === "resend"} onClick={resend}>{busy === "resend" ? af.sending : af.resendVerification}</button>
            : atProvider
              ? <button type="button" className="btn btn-soft btn-sm danger-soft" disabled={busy === "access"} onClick={toggle}>{af.disable}</button>
              : null}
    </td>
  );
}

/* Generic searchable + paginated admin table. `rows` is already status-filtered by the
   caller; this adds the search box, pagination and row animation. */
function AdminTable({ a, loading, error, q, setQ, searchPlaceholder, tag, heads, rows, haystack, renderRow, empty, resetKey }) {
  const view = q ? rows.filter((row) => haystack(row).toLowerCase().includes(q.toLowerCase())) : rows;
  const pg = usePaged(view, `${resetKey || ""}|${q}`);
  const tref = useRef(null); useGsapRows(tref, pg.page);
  return (
    <div className="panel">
      <Toolbar q={q} setQ={setQ} placeholder={searchPlaceholder}>
        {tag ? <span className="env-tag">{DI.network} {tag}</span> : null}
      </Toolbar>
      {!loading && !error && view.length > 0 && (
        <div className="t-scroll" ref={tref}><table className="tx"><thead><tr>{heads.map((h, i) => <th key={i}>{h}</th>)}</tr></thead>
          <tbody>{pg.slice.map(renderRow)}</tbody>
        </table></div>
      )}
      {loading && <div className="empty">{a.loading}</div>}
      {!loading && error && <div className="empty">{a.loadError}</div>}
      {!loading && !error && !view.length && <div className="empty">{empty}</div>}
      {!loading && !error && view.length > 0 && <Pagination {...pg} />}
    </div>
  );
}

/* ======================= Overview (global summary) ======================= */
function Breakdown({ obj, pillOf }) {
  const entries = Object.entries(obj || {});
  if (!entries.length) return <span className="field-note">—</span>;
  return (
    <div className="paylink-actions" style={{ flexWrap: "wrap", gap: 10 }}>
      {entries.map(([k, v]) => (
        <span key={k} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <Pill st={(pillOf || (() => "ref"))(k)} label={k} /> <b>{v}</b>
        </span>
      ))}
    </div>
  );
}

export function AdminOverviewView({ env = "dev" }) {
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
  const fiat = (sum && sum.fiat) || {};

  return (
    <>
      <ViewHead title={ao.title} sub={ao.sub} />
      {loading && <div className="panel"><div className="empty">{a.loading}</div></div>}
      {!loading && error && <div className="panel"><div className="empty">{a.loadError}</div></div>}
      {!loading && !error && sum && (
        <>
          <div className="metrics">
            {[["consumers", sum.consumers], ["customers", sum.customers], ["products", sum.products], ["webhooks", sum.webhookEndpoints]].map(([k, v]) => (
              <div className="metric" key={k}><div className="ml">{ao.cards[k]}</div><div className="mv">{v ?? 0}</div></div>
            ))}
          </div>

          <div className="panels">
            <div className="panel"><div className="panel-head"><h3>{ao.payments}</h3></div>
              <div style={{ padding: "0 16px 16px" }}><div className="mv" style={{ marginBottom: 10 }}>{pi.total ?? 0}</div><Breakdown obj={pi.byStatus} pillOf={(k) => ADMIN_PILL[k] || "ref"} /></div>
            </div>
            <div className="panel"><div className="panel-head"><h3>{ao.swaps}</h3></div>
              <div style={{ padding: "0 16px 16px" }}><div className="mv" style={{ marginBottom: 10 }}>{sw.total ?? 0}</div><Breakdown obj={sw.byStatus} pillOf={(k) => ADMIN_PILL[k] || "ref"} /></div>
            </div>
          </div>

          <div className="panel" style={{ marginTop: 16 }}><div className="panel-head"><h3>{ao.fiat}</h3></div>
            <div style={{ padding: "4px 16px 16px" }}>
              {[["receivers", fiat.receivers], ["payins", fiat.payins], ["payouts", fiat.payouts]].map(([k, obj]) => (
                <div key={k} style={{ marginBottom: 14 }}>
                  <label className="field-l">{ao[k]} · {(obj && obj.total) ?? 0}</label>
                  <Breakdown obj={obj && obj.byStatus} pillOf={fiatPill} />
                </div>
              ))}
            </div>
          </div>

          <div className="panel" style={{ marginTop: 16 }}><div className="panel-head"><h3>{ao.volume}</h3></div>
            {Array.isArray(sum.volume) && sum.volume.length > 0 ? (
              <div className="t-scroll"><table className="tx"><thead><tr><th>{ao.volHead.asset}</th><th>{ao.volHead.amount}</th><th>{ao.volHead.count}</th></tr></thead>
                <tbody>{sum.volume.map((v, i) => (
                  <tr key={i}><td>{assetOf(v.asset)}</td><td className="amt">{v.amount}</td><td className="cust">{v.count}</td></tr>
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
  const statusFiltered = rows.filter((p) => filter === "all" || p.status === filter);
  const onOrgFilter = (row) => goToAdmin && goToAdmin("adminPayments", { consumer: row.consumerId, label: orgOf(row) });

  return (
    <>
      <ViewHead title={ap.title} sub={ap.sub} />
      {consumer && <FilterChip a={a} label={adminFilter.label} onClear={() => goToAdmin && goToAdmin("adminPayments", null)} />}
      <div className="filter-tabs">{PAY_FILTERS.map((k) => <button key={k} className={filter === k ? "on" : ""} onClick={() => setFilter(k)}>{a.filters[k]}</button>)}</div>
      <AdminTable
        a={a} loading={loading} error={error} q={q} setQ={setQ} searchPlaceholder={ap.searchPlaceholder} tag={network} resetKey={filter}
        heads={[ap.tableHead.id, ap.tableHead.org, ap.tableHead.destination, ap.tableHead.amount, ap.tableHead.status, ap.tableHead.created]}
        rows={statusFiltered}
        haystack={(p) => `${p.id || ""} ${p.txHash || ""} ${orgOf(p)} ${p.destination || ""} ${p.amount || ""} ${p.asset || ""} ${p.status || ""}`}
        empty={ap.empty}
        renderRow={(p) => (
          <tr key={p.id}>
            <IdTd id={p.id} secondary={p.txHash} />
            <OrgTd row={p} onFilter={onOrgFilter} />
            <td className="cust">{shortAcct(p.destination)}</td>
            <td className="amt">{p.amount || "—"} {assetOf(p.asset)}</td>
            <td><Pill st={ADMIN_PILL[p.status] || "ref"} label={p.status || "—"} /></td>
            <td className="cust">{fmtDateTime(p.createdAt)}</td>
          </tr>
        )}
      />
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
  const { rows, loading, error } = useAdminRows(() => adminApi.swaps({ network, consumer, take: 200 }), [network, consumer]);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const statusFiltered = rows.filter((s) => filter === "all" || s.status === filter);
  const route = (s) => `${s.sendAmount ?? "—"} ${assetOf(s.sendAsset)} → ${s.destEstimated ?? s.swapAmount ?? "—"} ${s.destAsset || ""}`.trim();
  const onOrgFilter = (row) => goToAdmin && goToAdmin("adminSwaps", { consumer: row.consumerId, label: orgOf(row) });

  return (
    <>
      <ViewHead title={as.title} sub={as.sub} />
      {consumer && <FilterChip a={a} label={adminFilter.label} onClear={() => goToAdmin && goToAdmin("adminSwaps", null)} />}
      <div className="filter-tabs">{PAY_FILTERS.map((k) => <button key={k} className={filter === k ? "on" : ""} onClick={() => setFilter(k)}>{a.filters[k]}</button>)}</div>
      <AdminTable
        a={a} loading={loading} error={error} q={q} setQ={setQ} searchPlaceholder={as.searchPlaceholder} tag={network} resetKey={filter}
        heads={[as.tableHead.id, as.tableHead.org, as.tableHead.route, as.tableHead.status, as.tableHead.created]}
        rows={statusFiltered}
        haystack={(s) => `${s.id || ""} ${s.txHash || ""} ${orgOf(s)} ${s.source || ""} ${s.destination || ""} ${s.sendAsset || ""} ${s.destAsset || ""} ${s.status || ""}`}
        empty={as.empty}
        renderRow={(s) => (
          <tr key={s.id}>
            <IdTd id={s.id} secondary={s.txHash} />
            <OrgTd row={s} onFilter={onOrgFilter} />
            <td className="amt">{route(s)}</td>
            <td><Pill st={ADMIN_PILL[s.status] || "ref"} label={s.status || "—"} /></td>
            <td className="cust">{fmtDateTime(s.createdAt)}</td>
          </tr>
        )}
      />
    </>
  );
}

/* ======================= Fiat (receivers / payins / payouts) ======================= */
function FiatList({ sub, a, consumer, onOrgFilter, env }) {
  const af = a.fiat;
  const [q, setQ] = useState("");
  const fetcher = sub === "receivers"
    ? () => adminApi.receivers({ consumer, take: 200 })
    : sub === "payins"
      ? () => adminApi.payins({ consumer, take: 200 })
      : () => adminApi.payouts({ consumer, take: 200 });
  const { rows, setRows, loading, error } = useAdminRows(fetcher, [sub, consumer]);
  const onAccessChanged = (id, disabled) => setRows((rs) => rs.map((x) => (x.id === id ? { ...x, disabled } : x)));
  const onApproved = (id) => setRows((rs) => rs.map((x) => (x.id === id ? { ...x, kycStatus: "pending_user" } : x)));

  if (sub === "receivers") {
    return (
      <AdminTable
        a={a} loading={loading} error={error} q={q} setQ={setQ} searchPlaceholder={af.searchReceivers}
        heads={[af.receiverHead.name, af.receiverHead.org, af.receiverHead.type, af.receiverHead.status, af.receiverHead.created, ""]}
        rows={rows} empty={af.emptyReceivers}
        haystack={(x) => `${x.name || ""} ${orgOf(x)} ${x.type || ""} ${x.kycStatus || ""} ${x.disabled ? "disabled" : ""} ${x.email || ""} ${x.id || ""} ${x.blindpayId || ""}`}
        renderRow={(x) => (
          <tr key={x.id}>
            <NameTd name={x.name || x.email || x.blindpayId || x.id} ids={[x.id, x.blindpayId]} />
            <OrgTd row={x} onFilter={onOrgFilter} />
            <td className="cust">{x.type || "—"}</td>
            <td>{x.disabled ? <Pill st="fail" label={af.disabled} /> : <Pill st={fiatPill(x.kycStatus)} label={humanizeStatus(x.kycStatus) || af.statusUnknown} />}</td>
            <td className="cust">{fmtDateTime(x.createdAt)}</td>
            <AdminReceiverActions a={a} row={x} env={env} onAccessChanged={onAccessChanged} onApproved={onApproved} />
          </tr>
        )}
      />
    );
  }
  if (sub === "payins") {
    return (
      <AdminTable
        a={a} loading={loading} error={error} q={q} setQ={setQ} searchPlaceholder={af.searchPayins}
        heads={[af.payinHead.id, af.payinHead.org, af.payinHead.asset, af.payinHead.method, af.payinHead.amount, af.payinHead.status, af.payinHead.created]}
        rows={rows} empty={af.emptyPayins}
        haystack={(x) => `${x.id || ""} ${orgOf(x)} ${x.token || ""} ${x.network || ""} ${x.paymentMethod || ""} ${x.status || ""}`}
        renderRow={(x) => (
          <tr key={x.id}>
            <IdTd id={x.id} />
            <OrgTd row={x} onFilter={onOrgFilter} />
            <td className="cust">{x.token || "—"}{x.network ? ` · ${x.network}` : ""}</td>
            <td className="cust">{x.paymentMethod || "—"}</td>
            <td className="amt">{x.senderAmount ?? "—"} → {x.receiverAmount ?? "—"}</td>
            <td><Pill st={fiatPill(x.status)} label={humanizeStatus(x.status) || af.statusUnknown} /></td>
            <td className="cust">{fmtDateTime(x.createdAt)}</td>
          </tr>
        )}
      />
    );
  }
  return (
    <AdminTable
      a={a} loading={loading} error={error} q={q} setQ={setQ} searchPlaceholder={af.searchPayouts}
      heads={[af.payoutHead.id, af.payoutHead.org, af.payoutHead.asset, af.payoutHead.rail, af.payoutHead.amount, af.payoutHead.status, af.payoutHead.created]}
      rows={rows} empty={af.emptyPayouts}
      haystack={(x) => `${x.id || ""} ${orgOf(x)} ${x.token || ""} ${x.network || ""} ${x.rail || ""} ${x.status || ""}`}
      renderRow={(x) => (
        <tr key={x.id}>
          <IdTd id={x.id} />
          <OrgTd row={x} onFilter={onOrgFilter} />
          <td className="cust">{x.token || "—"}{x.network ? ` · ${x.network}` : ""}</td>
          <td className="cust">{x.rail || "—"}</td>
          <td className="amt">{x.senderAmount ?? "—"} → {x.receiverAmount ?? "—"}</td>
          <td><Pill st={fiatPill(x.status)} label={humanizeStatus(x.status) || af.statusUnknown} /></td>
          <td className="cust">{fmtDateTime(x.createdAt)}</td>
        </tr>
      )}
    />
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
      <ViewHead title={af.title} sub={af.sub} />
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
  const onOrgFilter = (row) => goToAdmin && goToAdmin("adminCustomers", { consumer: row.consumerId, label: orgOf(row) });
  return (
    <>
      <ViewHead title={ac.title} sub={ac.sub} />
      {consumer && <FilterChip a={a} label={adminFilter.label} onClear={() => goToAdmin && goToAdmin("adminCustomers", null)} />}
      <AdminTable
        a={a} loading={loading} error={error} q={q} setQ={setQ} searchPlaceholder={ac.searchPlaceholder}
        heads={[ac.tableHead.name, ac.tableHead.org, ac.tableHead.email, ac.tableHead.account, ac.tableHead.created]}
        rows={rows} empty={ac.empty}
        haystack={(c) => `${c.name || ""} ${c.alias || ""} ${orgOf(c)} ${c.email || ""} ${c.account || ""} ${c.id || ""}`}
        renderRow={(c) => (
          <tr key={c.id}>
            <NameTd name={c.name || c.alias || c.email || c.id} ids={[c.id]} />
            <OrgTd row={c} onFilter={onOrgFilter} />
            <td className="cust">{c.email || "—"}</td>
            <td className="cust">{shortAcct(c.account)}</td>
            <td className="cust">{fmtDateTime(c.createdAt)}</td>
          </tr>
        )}
      />
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
  const onOrgFilter = (row) => goToAdmin && goToAdmin("adminProducts", { consumer: row.consumerId, label: orgOf(row) });
  return (
    <>
      <ViewHead title={ap.title} sub={ap.sub} />
      {consumer && <FilterChip a={a} label={adminFilter.label} onClear={() => goToAdmin && goToAdmin("adminProducts", null)} />}
      <AdminTable
        a={a} loading={loading} error={error} q={q} setQ={setQ} searchPlaceholder={ap.searchPlaceholder}
        heads={[ap.tableHead.name, ap.tableHead.org, ap.tableHead.price, ap.tableHead.kind, ap.tableHead.created]}
        rows={rows} empty={ap.empty}
        haystack={(p) => `${p.name || ""} ${orgOf(p)} ${p.kind || ""} ${p.asset || ""} ${p.id || ""}`}
        renderRow={(p) => (
          <tr key={p.id}>
            <NameTd name={p.name || p.id} ids={[p.id]} />
            <OrgTd row={p} onFilter={onOrgFilter} />
            <td className="amt">{p.amount ? `${p.amount} ${assetOf(p.asset)}` : "—"}</td>
            <td className="cust">{p.kind || "—"}</td>
            <td className="cust">{fmtDateTime(p.createdAt)}</td>
          </tr>
        )}
      />
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
  const cnt = (row, k) => (row && row._count && row._count[k]) ?? 0;
  // A clickable count cell that drills into the target admin view, filtered by this org.
  const countTd = (c, k, view, tab) => {
    const n = cnt(c, k);
    if (!goToAdmin || !c.id || !n) return <td className="cust">{n}</td>;
    return <td className="cust"><button type="button" className="link-btn" style={{ font: "inherit", cursor: "pointer" }} onClick={() => goToAdmin(view, { consumer: c.id, label: consumerLabel(c), tab })}>{n}</button></td>;
  };
  const orgNames = (c) => (Array.isArray(c.organizations) ? c.organizations.map((o) => o && o.name).filter(Boolean) : []);
  const accountLine = (c) => [c.accountName, c.accountEmail].filter(Boolean).join(" · ");
  return (
    <>
      <ViewHead title={ac.title} sub={ac.sub} />
      <p className="field-note" style={{ marginTop: -8, marginBottom: 12 }}>{ac.note}</p>
      <AdminTable
        a={a} loading={loading} error={error} q={q} setQ={setQ} searchPlaceholder={ac.searchPlaceholder}
        heads={[ac.tableHead.org, ac.tableHead.payments, ac.tableHead.swaps, ac.tableHead.products, ac.tableHead.customers, ac.tableHead.receivers, ac.tableHead.payins, ac.tableHead.payouts, ac.tableHead.webhooks, ac.tableHead.created]}
        rows={rows} empty={ac.empty}
        haystack={(c) => `${consumerLabel(c)} ${orgNames(c).join(" ")} ${c.accountName || ""} ${c.accountEmail || ""} ${c.apisixUsername || ""} ${c.id || ""}`}
        renderRow={(c) => {
          const names = orgNames(c);
          const acct = accountLine(c);
          return (
          <tr key={c.id}>
            <td>
              <div>{consumerLabel(c)}{names.length > 1 ? <span className="cust" style={{ fontSize: 12 }} title={names.join(", ")}> {fmt(ac.moreOrgs, { n: names.length - 1 })}</span> : null}</div>
              {acct ? <div className="cust" style={{ fontSize: 12 }}>{ac.account}: {acct}</div> : null}
              <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 2 }}>
                <CopyText value={c.apisixUsername} display={stripUser(c.apisixUsername)} muted />
                <CopyText value={c.id} muted />
              </div>
            </td>
            {countTd(c, "paymentIntents", "adminPayments")}
            {countTd(c, "swaps", "adminSwaps")}
            {countTd(c, "products", "adminProducts")}
            {countTd(c, "customers", "adminCustomers")}
            {countTd(c, "blindpayReceivers", "adminFiat", "receivers")}
            {countTd(c, "payins", "adminFiat", "payins")}
            {countTd(c, "payouts", "adminFiat", "payouts")}
            <td className="cust">{cnt(c, "webhookEndpoints")}</td>
            <td className="cust">{fmtDateTime(c.createdAt)}</td>
          </tr>
        ); }}
      />
    </>
  );
}
