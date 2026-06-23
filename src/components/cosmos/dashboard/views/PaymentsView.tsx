import { useState, useEffect, useRef, useCallback } from "react";
import { Modal, ConfirmModal, showToast } from "@/components/cosmos/shared";
import { useT, fmt } from "@/lib/i18n/index";
import { paymentIntents as payApi } from "@/lib/api-client";
import { DI } from "../icons";
import { fmtDateTime } from "../helpers";
import { usePaged, useGsapRows, usePolling } from "../hooks";
import { Pill } from "../components/Pill";
import { Toolbar } from "../components/Toolbar";
import { ViewHead } from "../components/ViewHead";
import { Field, Sel } from "../components/Field";
import { Pagination } from "../components/Pagination";
import { PayLinkDetailModal, PayLinkRowActions, STATUS_PILL, amountLabel } from "../components/PayLinkDetail";

const FILTER_KEYS = ["all", "PENDING", "SUCCEEDED", "FAILED"];

export function PaymentsView({ canManage = true, orgId, env = "dev" }) {
  const t = useT();
  const pl = t.dash.paylinks;
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const [modal, setModal] = useState(false);   // create modal
  const [detail, setDetail] = useState(null);  // a payment intent shown in the detail modal
  const [toDelete, setToDelete] = useState(null); // a payment intent pending delete confirmation
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    payApi.list(env, { org: orgId, take: 100 })
      .then((res) => { setRows(Array.isArray(res?.data) ? res.data : []); setError(false); })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [env, orgId]);
  useEffect(() => { load(); }, [load]);
  // Live updates: silently refresh the list while the tab is visible so a payment
  // that settles on-chain flips its status in the table without a manual reload.
  const refresh = useCallback(() => {
    payApi.list(env, { org: orgId, take: 100 })
      .then((res) => setRows(Array.isArray(res?.data) ? res.data : []))
      .catch(() => {});
  }, [env, orgId]);
  usePolling(refresh, 8000);

  // The upstream list isn't network-scoped, so separate testnet vs public here to
  // match the active environment switcher (dev → testnet, prod → public).
  const wantNet = env === "prod" ? "public" : "testnet";
  const view = rows.filter((p) => {
    if (p.network && p.network !== wantNet) return false;
    if (filter !== "all" && p.status !== filter) return false;
    if (!q) return true;
    const hay = `${p.id} ${p.destination} ${p.memo || ""} ${p.reference || ""}`.toLowerCase();
    return hay.includes(q.toLowerCase());
  });
  const pg = usePaged(view, q + "|" + filter);
  const tref = useRef(null); useGsapRows(tref, pg.page + "|" + view.length);

  const onCreated = (intent) => { setModal(false); setRows((r) => [intent, ...r]); setDetail(intent); };
  const onDeleted = (id) => { setRows((r) => r.filter((x) => x.id !== id)); setDetail(null); };
  // Delete from the table row — confirmed via the shared ConfirmModal.
  const confirmDelete = () => {
    if (!toDelete || deleting) return;
    setDeleting(true);
    payApi.remove(toDelete.id, env)
      .then(() => { onDeleted(toDelete.id); setToDelete(null); })
      .catch((err) => showToast((err && err.message) || pl.deleteError, "error"))
      .finally(() => setDeleting(false));
  };

  return (
    <>
      <ViewHead title={pl.title} sub={fmt(pl.sub, { n: rows.length })}>
        {canManage && <button className="btn btn-dark btn-sm" onClick={() => setModal(true)}>{DI.plus} {pl.create}</button>}
      </ViewHead>
      {!canManage && <div className="note-bar" style={{ marginBottom: 16 }}>{DI.link}<span>{pl.readOnly}</span></div>}
      <div className="filter-tabs">{FILTER_KEYS.map((k) => <button key={k} className={filter === k ? "on" : ""} onClick={() => setFilter(k)}>{pl.filters[k]}</button>)}</div>
      <div className="panel">
        <Toolbar q={q} setQ={setQ} placeholder={pl.searchPlaceholder}>
          <span className="env-tag">{DI.network} {env === "prod" ? pl.network.prod : pl.network.dev}</span>
        </Toolbar>
        {!loading && !error && view.length > 0 && (
          <div className="t-scroll" ref={tref}><table className="tx"><thead><tr><th>{pl.tableHead.id}</th><th>{pl.tableHead.type}</th><th>{pl.detail.fields.network}</th><th>{pl.tableHead.amount}</th><th>{pl.tableHead.status}</th><th>{pl.tableHead.created}</th><th></th></tr></thead>
            <tbody>{pg.slice.map((p) => (
              <tr key={p.id} className="row-click" onClick={() => setDetail(p)}>
                <td className="tid">{p.id}</td>
                <td className="cust">{pl.kinds[p.kind] || p.kind}</td>
                <td><span className="net-badge">{p.network === "public" ? pl.network.prod : pl.network.dev}</span></td>
                <td className="amt">{amountLabel(p, pl)}</td>
                <td><Pill st={STATUS_PILL[p.status] || "ref"} label={(pl.status && pl.status[p.status]) || p.status} /></td>
                <td className="cust">{fmtDateTime(p.createdAt)}</td>
                <PayLinkRowActions intent={p} t={t} pl={pl} onView={setDetail} canManage={canManage} onDelete={setToDelete} />
              </tr>
            ))}</tbody>
          </table></div>
        )}
        {loading && <div className="empty">{pl.loading}</div>}
        {!loading && error && <div className="empty">{pl.loadError}</div>}
        {!loading && !error && !view.length && <div className="empty">{pl.empty}</div>}
        {!loading && !error && view.length > 0 && <Pagination {...pg} />}
      </div>
      {modal && <CreatePayLinkModal pl={pl} orgId={orgId} env={env} onClose={() => setModal(false)} onCreated={onCreated} />}
      {detail && <PayLinkDetailModal pl={pl} intent={detail} env={env} canManage={canManage} onClose={() => setDetail(null)} onDeleted={onDeleted} />}
      {toDelete && <ConfirmModal title={pl.detail.deleteTitle} body={fmt(pl.detail.deleteBody, { id: toDelete.id })} confirmLabel={pl.detail.deleteConfirm} cancelLabel={t.dash.common.cancel} onConfirm={confirmDelete} onClose={() => setToDelete(null)} />}
    </>
  );
}

/* ---------------- create modal ---------------- */
function CreatePayLinkModal({ pl, orgId, env, onClose, onCreated }) {
  const t = useT();
  const m = pl.modal;
  const [kind, setKind] = useState("pay");
  const [destination, setDestination] = useState("");
  const [source, setSource] = useState("");
  const [amount, setAmount] = useState("");
  const [assetCode, setAssetCode] = useState("");
  const [assetIssuer, setAssetIssuer] = useState("");
  const [memo, setMemo] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const isTx = kind === "tx";
  const needsIssuer = !!assetCode.trim() && assetCode.trim().toLowerCase() !== "xlm";
  // A tx intent requires source + amount; both flavours require a destination; a
  // non-native asset requires an issuer.
  const valid = destination.trim() && (!isTx || (source.trim() && amount.trim())) && (!needsIssuer || assetIssuer.trim());

  const submit = () => {
    if (!valid || busy) return;
    setBusy(true);
    const body = {
      org: orgId,
      environment: env,
      kind,
      destination: destination.trim(),
      ...(source.trim() ? { source: source.trim() } : {}),
      ...(amount.trim() ? { amount: amount.trim() } : {}),
      ...(assetCode.trim() ? { assetCode: assetCode.trim() } : {}),
      ...(needsIssuer && assetIssuer.trim() ? { assetIssuer: assetIssuer.trim() } : {}),
      ...(memo.trim() ? { memo: memo.trim() } : {}),
      ...(msg.trim() ? { msg: msg.trim() } : {}),
    };
    payApi.create(body)
      .then((intent) => onCreated(intent))
      .catch((err) => showToast((err && err.message) || pl.createError, "error"))
      .finally(() => setBusy(false));
  };

  return (
    <Modal onClose={onClose}>
      <div className="modal-body">
        <div className="modal-eyebrow">{m.eyebrow}</div>
        <h3>{m.title}</h3>
        <p>{m.desc}</p>
        <Sel label={m.kind} value={kind} onChange={setKind} options={["pay", "tx"]} labels={{ pay: m.kindPay, tx: m.kindTx }} />
        <p className="field-note">{isTx ? m.kindTxHint : m.kindPayHint}</p>
        <Field label={m.destination} hint={m.destinationHint} value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="G…" autoFocus />
        {isTx && <Field label={m.source} hint={m.sourceHint} value={source} onChange={(e) => setSource(e.target.value)} placeholder="G…" />}
        <Field label={m.amount} hint={isTx ? undefined : m.amountHint} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="120.50" inputMode="decimal" />
        <Field label={m.asset} value={assetCode} onChange={(e) => setAssetCode(e.target.value)} placeholder="XLM" />
        {needsIssuer && <Field label={m.assetIssuer} hint={m.assetIssuerHint} value={assetIssuer} onChange={(e) => setAssetIssuer(e.target.value)} placeholder="G…" />}
        <Field label={m.memo} hint={m.memoHint} value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="123456789" inputMode="numeric" />
        <Field label={m.message} hint={m.messageHint} value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Order #24" />
        <div className="modal-actions">
          <button className="btn btn-violet" disabled={!valid || busy} onClick={submit}>{m.submit}</button>
          <button className="btn btn-soft" onClick={onClose}>{t.dash.common.cancel}</button>
        </div>
      </div>
    </Modal>
  );
}

