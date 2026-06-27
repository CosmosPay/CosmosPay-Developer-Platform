import { useState, useEffect, useRef, useCallback } from "react";
import { Modal, IcCheck, IcCopy, showToast, copyText } from "@/components/cosmos/shared";
import { useT, fmt } from "@/lib/i18n/index";
import { webhooks as whApi } from "@/lib/api-client";
import { DI } from "@/components/cosmos/dashboard/icons";
import { fmtDateTime } from "@/components/cosmos/dashboard/helpers";
import { usePaged, useGsapRows } from "@/components/cosmos/dashboard/hooks";
import { Pill } from "@/components/cosmos/dashboard/components/Pill";
import { ViewHead } from "@/components/cosmos/dashboard/components/ViewHead";
import { Field } from "@/components/cosmos/dashboard/components/Field";
import { Pagination } from "@/components/cosmos/dashboard/components/Pagination";

const EVENT_TYPES = [
  "PAYMENT_INTENT_CREATED",
  "PAYMENT_INTENT_UPDATED",
  "PAYMENT_INTENT_SUCCEEDED",
  "PAYMENT_INTENT_FAILED",
  "PAYMENT_INTENT_CANCELLED",
  "PAYMENT_INTENT_DELETED",
];
/* PAYMENT_INTENT_SUCCEEDED → payment_intent.succeeded */
const humanize = (e) => e.toLowerCase().replace("payment_intent_", "payment_intent.");
const DELIVERY_PILL = { SUCCEEDED: "ok", FAILED: "fail", PENDING: "ref" };

export function WebhooksView({ canManage = true, orgId, env = "dev" }) {
  const t = useT();
  const wv = t.dash.webhooks;
  const cx = t.dash.cosmos;
  const [eps, setEps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [modal, setModal] = useState(false);
  const [reveal, setReveal] = useState(null);   // { url, secret }
  const [selected, setSelected] = useState(null); // endpoint whose deliveries are shown

  const load = useCallback(() => {
    setLoading(true);
    whApi.list(env)
      .then((d) => { setEps(Array.isArray(d) ? d : []); setError(false); })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [env]);
  useEffect(() => { load(); }, [load]);

  const pg = usePaged(eps, eps.length);
  const tref = useRef(null); useGsapRows(tref, pg.page + "|" + eps.length);

  const onCreated = (ep) => { setModal(false); setEps((p) => [ep, ...p]); if (ep.secret) setReveal({ url: ep.url, secret: ep.secret }); };

  const ping = (ep) => whApi.ping(ep.id, env, orgId)
    .then((r) => showToast(r && r.ok ? cx.pingOk : cx.pingFail, r && r.ok ? "success" : "error"))
    .catch((e) => showToast((e && e.message) || cx.pingFail, "error"));

  const toggle = (ep) => whApi.update(ep.id, env, orgId, { enabled: !ep.enabled })
    .then((u) => setEps((p) => p.map((x) => x.id === ep.id ? { ...x, ...u } : x)))
    .catch((e) => showToast((e && e.message) || wv.title, "error"));

  const rotate = (ep) => whApi.rotateSecret(ep.id, env, orgId)
    .then((u) => { if (u && u.secret) setReveal({ url: ep.url, secret: u.secret }); })
    .catch((e) => showToast((e && e.message) || cx.rotate, "error"));

  const remove = (ep) => whApi.remove(ep.id, env, orgId)
    .then(() => { setEps((p) => p.filter((x) => x.id !== ep.id)); if (selected && selected.id === ep.id) setSelected(null); })
    .catch((e) => showToast((e && e.message) || cx.delete, "error"));

  return (
    <>
      <ViewHead title={wv.title} sub={wv.sub}>{canManage && <button className="btn btn-dark btn-sm" onClick={() => setModal(true)}>{DI.plus} {wv.add}</button>}</ViewHead>
      <div className="panel" style={{ marginBottom: 16 }}>
        <div className="panel-head"><h3>{wv.endpoints}</h3><span className="env-tag">{DI.network} {env === "prod" ? "Public" : "Testnet"}</span></div>
        {!loading && !error && eps.length > 0 && (
          <div className="t-scroll" ref={tref}><table className="tx"><thead><tr><th>{wv.tableHead.url}</th><th>{wv.tableHead.events}</th><th>{wv.tableHead.status}</th><th></th></tr></thead>
            <tbody>{pg.slice.map((w) => (
              <tr key={w.id} className={`row-click${selected && selected.id === w.id ? " row-on" : ""}`} onClick={() => setSelected(w)}>
                <td className="tid">{w.url}</td>
                <td className="cust">{w.eventTypes && w.eventTypes.length ? fmt(wv.eventsCount, { n: w.eventTypes.length }) : cx.allEvents}</td>
                <td><Pill st={w.enabled ? "ok" : "ref"} label={w.enabled ? cx.active : cx.inactive} /></td>
                <td style={{ textAlign: "right", whiteSpace: "nowrap" }} onClick={(e) => e.stopPropagation()}>
                  {canManage && <button className="icon-mini" title={cx.ping} aria-label={cx.ping} onClick={() => ping(w)}>{DI.activity}</button>}
                  {canManage && <button className="icon-mini" title={cx.rotate} aria-label={cx.rotate} onClick={() => rotate(w)}>{DI.key}</button>}
                  {canManage && <button className="icon-mini" title={w.enabled ? cx.disable : cx.enable} aria-label={w.enabled ? cx.disable : cx.enable} onClick={() => toggle(w)}>{DI.network}</button>}
                  {canManage && <button className="icon-mini danger" title={cx.delete} aria-label={cx.delete} onClick={() => remove(w)}>{DI.trash}</button>}
                </td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
        {loading && <div className="empty">{cx.loading}</div>}
        {!loading && error && <div className="empty">{cx.loadError}</div>}
        {!loading && !error && !eps.length && <div className="empty">{wv.modal.desc}</div>}
        {!loading && !error && eps.length > 0 && <Pagination {...pg} />}
      </div>

      {selected && <DeliveriesPanel wv={wv} cx={cx} endpoint={selected} env={env} orgId={orgId} canManage={canManage} />}

      {modal && <CreateWebhookModal wv={wv} cx={cx} env={env} orgId={orgId} onClose={() => setModal(false)} onCreated={onCreated} />}
      {reveal && <RevealSecretModal cx={cx} data={reveal} onClose={() => setReveal(null)} />}
    </>
  );
}

function DeliveriesPanel({ wv, cx, endpoint, env, orgId, canManage }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(() => {
    setLoading(true);
    whApi.deliveries(endpoint.id, env, { take: 20 })
      .then((d) => setRows((d && Array.isArray(d.data)) ? d.data : []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [endpoint.id, env]);
  useEffect(() => { load(); }, [load]);
  const redeliver = (d) => whApi.redeliver(endpoint.id, d.id, env, orgId).then(load).catch(() => {});
  return (
    <div className="panel">
      <div className="panel-head"><h3>{cx.deliveries}</h3><span className="cust" style={{ fontSize: 12.5 }}>{endpoint.url}</span></div>
      {loading && <div className="empty">{cx.loading}</div>}
      {!loading && !rows.length && <div className="empty">{cx.noDeliveries}</div>}
      {!loading && rows.length > 0 && (
        <div className="t-scroll"><table className="tx"><thead><tr><th>{wv.tableHead.event}</th><th>{wv.tableHead.response}</th><th>{wv.tableHead.status}</th><th>{wv.tableHead.when}</th><th></th></tr></thead>
          <tbody>{rows.map((d) => (
            <tr key={d.id}>
              <td className="tid">{(cx.eventLabels && cx.eventLabels[d.eventType]) || humanize(d.eventType)}</td>
              <td className="cust">{d.responseStatus ?? "—"}</td>
              <td><Pill st={DELIVERY_PILL[d.status] || "ref"} label={d.status} /></td>
              <td className="cust">{fmtDateTime(d.lastAttemptAt || d.createdAt)}</td>
              <td style={{ textAlign: "right" }}>{canManage && <button className="link-btn" onClick={() => redeliver(d)}>{cx.redeliver}</button>}</td>
            </tr>
          ))}</tbody>
        </table></div>
      )}
    </div>
  );
}

function CreateWebhookModal({ wv, cx, env, orgId, onClose, onCreated }) {
  const t = useT();
  const m = wv.modal;
  const [url, setUrl] = useState("");
  const [ev, setEv] = useState(["PAYMENT_INTENT_SUCCEEDED"]);
  const [busy, setBusy] = useState(false);
  const toggle = (e) => setEv((v) => v.includes(e) ? v.filter((x) => x !== e) : [...v, e]);
  const submit = () => {
    if (!url.trim() || busy) return;
    setBusy(true);
    whApi.create(env, orgId, { url: url.trim(), ...(ev.length ? { eventTypes: ev } : {}) })
      .then((ep) => onCreated(ep))
      .catch((e) => showToast((e && e.message) || wv.title, "error"))
      .finally(() => setBusy(false));
  };
  return (
    <Modal onClose={onClose}>
      <div className="modal-body">
        <div className="modal-eyebrow">{m.eyebrow}</div>
        <h3>{m.title}</h3>
        <p>{m.desc}</p>
        <Field label={m.urlLabel} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://api.acme.com/hooks/cosmos" autoFocus />
        <label className="field-l" style={{ marginTop: 14 }}>{m.eventsLabel}</label>
        <div className="chk-list">{EVENT_TYPES.map((e) => (
          <label key={e} className={`chk${ev.includes(e) ? " on" : ""}`}>
            <input type="checkbox" checked={ev.includes(e)} onChange={() => toggle(e)} />
            <span className="chk-box">{ev.includes(e) && <IcCheck />}</span>{(cx.eventLabels && cx.eventLabels[e]) || humanize(e)}
          </label>
        ))}</div>
        <div className="modal-actions">
          <button className="btn btn-violet" disabled={!url.trim() || busy} onClick={submit}>{m.add}</button>
          <button className="btn btn-soft" onClick={onClose}>{t.dash.common.cancel}</button>
        </div>
      </div>
    </Modal>
  );
}

function RevealSecretModal({ cx, data, onClose }) {
  const t = useT();
  return (
    <Modal onClose={onClose}>
      <div className="modal-body">
        <div className="modal-eyebrow">{cx.secret}</div>
        <h3>{data.url}</h3>
        <p>{cx.secretNote}</p>
        <div className="paylink-block">
          <div className="paylink-block-head"><label className="field-l">{cx.secret}</label>
            <button type="button" className="copy-mini" title={t.toasts.copied} aria-label={t.toasts.copied} onClick={() => copyText(data.secret).then(() => showToast(t.toasts.copied))}><IcCopy /></button>
          </div>
          <div className="paylink-code">{data.secret}</div>
        </div>
        <div className="modal-actions"><button className="btn btn-violet" onClick={onClose}>{t.dash.common.cancel}</button></div>
      </div>
    </Modal>
  );
}
