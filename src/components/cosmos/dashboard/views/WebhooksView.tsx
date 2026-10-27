import { useState, useEffect, useRef, useCallback } from "react";
import { Modal, IcCheck, IcCopy, showToast, copyText } from "@/components/cosmos/shared";
import { useT, fmt } from "@/lib/i18n/index";
import { webhooks as whApi } from "@/lib/api-client";
import { DI } from "@/components/cosmos/dashboard/icons";
import { fmtDateTime } from "@/components/cosmos/dashboard/helpers";
import { usePaged, useGsapRows, useListFilters } from "@/components/cosmos/dashboard/hooks";
import { Pill } from "@/components/cosmos/dashboard/components/Pill";
import { ViewHead } from "@/components/cosmos/dashboard/components/ViewHead";
import { ViewActivity } from "@/components/cosmos/dashboard/components/ActivityPanel";
import { Field } from "@/components/cosmos/dashboard/components/Field";
import { Pagination } from "@/components/cosmos/dashboard/components/Pagination";
import { FillRows } from "@/components/cosmos/dashboard/components/FillRows";
import { FilterBar } from "@/components/cosmos/dashboard/components/FilterBar";
import { countBy, matchesQuery } from "@/lib/dashboard-filters";
import { TableSkeleton } from "@/components/cosmos/dashboard/components/Skeleton";
import { RowMenu } from "@/components/cosmos/dashboard/components/RowMenu";
import { StatusIcon, paymentTone, pillTone } from "@/components/cosmos/dashboard/components/StatusIcon";
import { RecordLink } from "@/components/cosmos/dashboard/components/RecordLink";
import { PreviewCard } from "@/components/cosmos/dashboard/components/RecordPreview";
import { ConfirmModal } from "@/components/cosmos/ui/ConfirmModal";

const EVENT_TYPES = [
  "PAYMENT_INTENT_CREATED",
  "PAYMENT_INTENT_UPDATED",
  "PAYMENT_INTENT_SUCCEEDED",
  "PAYMENT_INTENT_FAILED",
  "PAYMENT_INTENT_CANCELLED",
  "PAYMENT_INTENT_DELETED",
  "ZK_PAYMENT_SUCCEEDED",
];
/* PAYMENT_INTENT_SUCCEEDED → payment_intent.succeeded, ZK_PAYMENT_SUCCEEDED → zk_payment.succeeded */
const humanize = (e) => e.toLowerCase().replace(/^(payment_intent|zk_payment)_/, "$1.");
const DELIVERY_PILL = { SUCCEEDED: "ok", FAILED: "fail", PENDING: "ref" };
const STATES = ["active", "inactive"];
const DEFAULTS = { q: "", status: "all" };
const ALLOWED = { status: ["all", ...STATES] };
const stateOf = (w) => (w.enabled ? "active" : "inactive");

export function WebhooksView({ canManage = true, orgId, env = "dev" }) {
  const t = useT();
  const wv = t.dash.webhooks;
  const cx = t.dash.cosmos;
  const [eps, setEps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null); // endpoint whose URL and events are being edited
  const [reveal, setReveal] = useState(null);   // { url, secret }
  const [selected, setSelected] = useState(null); // endpoint whose deliveries are shown
  // Deleting an endpoint and rotating its secret (which breaks the old one) are confirmed first.
  const [confirm, setConfirm] = useState(null); // { kind: "delete" | "rotate", ep }
  const [confirming, setConfirming] = useState(false);
  const { filters, set, reset, active } = useListFilters(DEFAULTS, ALLOWED);
  const fl = t.dash.filters;

  const load = useCallback(() => {
    setLoading(true);
    whApi.list(env)
      .then((d) => { setEps(Array.isArray(d) ? d : []); setError(false); })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [env]);
  useEffect(() => { load(); }, [load]);
  // Another environment lists other endpoints: the deliveries shown belonged to this one's.
  useEffect(() => { setSelected(null); }, [env]);

  // The search reads an endpoint's URL and the events it receives, by name and by code.
  const eventNames = (w) => (w.eventTypes || []).flatMap((e) => [e, (cx.eventLabels && cx.eventLabels[e]) || humanize(e)]);
  const matches = (w, skip) =>
    (skip === "status" || filters.status === "all" || stateOf(w) === filters.status) &&
    matchesQuery([w.url, w.description, ...eventNames(w)], filters.q);
  const view = eps.filter((w) => matches(w, null));
  const stateCounts = countBy(eps.filter((w) => matches(w, "status")), stateOf);
  const pg = usePaged(view, JSON.stringify(filters));
  const tref = useRef(null); useGsapRows(tref, pg.page + "|" + view.length);
  const addButton = canManage && <button className="btn btn-dark btn-sm" onClick={() => setModal(true)}>{DI.plus} {wv.add}</button>;

  const onCreated = (ep) => { setModal(false); setEps((p) => [ep, ...p]); if (ep.secret) setReveal({ url: ep.url, secret: ep.secret }); };
  const onEdited = (ep) => {
    setEditing(null);
    setEps((p) => p.map((x) => (x.id === ep.id ? { ...x, ...ep } : x)));
    setSelected((cur) => (cur && cur.id === ep.id ? { ...cur, ...ep } : cur));
  };

  const ping = (ep) => whApi.ping(ep.id, env, orgId)
    .then((r) => showToast(r && r.ok ? cx.pingOk : cx.pingFail, r && r.ok ? "success" : "error"))
    .catch((e) => showToast((e && e.message) || cx.pingFail, "error"));

  const toggle = (ep) => whApi.update(ep.id, env, orgId, { enabled: !ep.enabled })
    .then((u) => setEps((p) => p.map((x) => x.id === ep.id ? { ...x, ...u } : x)))
    .catch((e) => showToast((e && e.message) || wv.title, "error"));

  const rotate = (ep) => whApi.rotateSecret(ep.id, env, orgId)
    .then((u) => { if (u && u.secret) setReveal({ url: ep.url, secret: u.secret }); });

  const remove = (ep) => whApi.remove(ep.id, env, orgId)
    .then(() => { setEps((p) => p.filter((x) => x.id !== ep.id)); if (selected && selected.id === ep.id) setSelected(null); });

  const runConfirm = () => {
    if (!confirm || confirming) return;
    setConfirming(true);
    (confirm.kind === "delete" ? remove(confirm.ep) : rotate(confirm.ep))
      .then(() => setConfirm(null))
      .catch((e) => showToast((e && e.message) || (confirm.kind === "delete" ? cx.delete : cx.rotate), "error"))
      .finally(() => setConfirming(false));
  };

  return (
    <>
      <ViewHead title={wv.title} />
      {/* Its own figures and chart: deliveries and the failed ones. */}
      <ViewActivity env={env} metrics={["webhooks"]} id="wh-activity" />
      <FilterBar
        label={fl.label}
        query={filters.q} onQuery={(v) => set("q", v)} placeholder={wv.searchPlaceholder}
        status={{
          label: fl.status, value: filters.status, onChange: (v) => set("status", v),
          options: [
            { key: "all", label: fl.allStatuses, count: eps.filter((w) => matches(w, "status")).length },
            ...STATES.map((st) => ({ key: st, label: st === "active" ? cx.active : cx.inactive, count: stateCounts[st] || 0, icon: <StatusIcon tone={st === "active" ? "ok" : "off"} size={16} /> })),
          ],
        }}
        active={active} onReset={reset}
        shown={view.length} total={loading ? undefined : eps.length} loading={loading}
        actions={addButton}
      />
      <div className="panel">
        {!loading && (
          <div className="t-scroll" tabIndex={0} ref={tref}><table className="tx"><thead><tr><th>{wv.tableHead.url}</th><th>{wv.tableHead.events}</th><th>{wv.tableHead.status}</th><th>{wv.tableHead.created}</th><th><span className="sr-only">{t.dash.common.actions}</span></th></tr></thead>
            <tbody>{!error && pg.slice.map((w) => (
              <tr key={w.id} className={`row-click${selected && selected.id === w.id ? " row-on" : ""}`} onClick={() => setSelected(w)}>
                <td className="tid">
                  <span className="cell-mark"><span className="am-sq">{DI.webhook}</span>
                  <RecordLink
                    onOpen={() => setSelected(w)} copy={w.url}
                    preview={() => <PreviewCard label={wv.tableHead.url} title={w.url} wrap headline={<span className={`hub-st-t ${w.enabled ? "ok" : "wait"}`}>{w.enabled ? cx.active : cx.inactive}</span>} fields={[[wv.tableHead.events, w.eventTypes && w.eventTypes.length ? w.eventTypes.map((e) => (cx.eventLabels && cx.eventLabels[e]) || humanize(e)).join(", ") : cx.allEvents]]} />}
                  >{w.url}</RecordLink>
                  </span>
                </td>
                <td className="cust">
                  {/* The events it receives, named on hover; whoever manages webhooks changes them from here. */}
                  {(() => {
                    const n = w.eventTypes ? w.eventTypes.length : 0;
                    const text = n === 1 ? wv.eventsOne : n ? fmt(wv.eventsCount, { n }) : cx.allEvents;
                    const names = n ? w.eventTypes.map((e) => (cx.eventLabels && cx.eventLabels[e]) || humanize(e)).join(", ") : undefined;
                    return canManage
                      ? <button type="button" className="link-btn" title={names} onClick={(e) => { e.stopPropagation(); setEditing(w); }}>{text}</button>
                      : <span title={names}>{text}</span>;
                  })()}
                </td>
                <td><Pill st={w.enabled ? "ok" : "ref"} tone={w.enabled ? "ok" : "off"} label={w.enabled ? cx.active : cx.inactive} /></td>
                <td className="cust">{fmtDateTime(w.createdAt)}</td>
                <td className="row-actions" onClick={(e) => e.stopPropagation()}>
                  {/* The details are the endpoint's deliveries, under the table. */}
                  <button className="icon-mini" title={cx.deliveries} aria-label={`${cx.deliveries}: ${w.url}`} onClick={() => setSelected(w)}>{DI.docs}</button>
                  {canManage && <button className="icon-mini" title={wv.edit} aria-label={`${wv.edit}: ${w.url}`} onClick={() => setEditing(w)}>{DI.edit}</button>}
                  {canManage && <button className="icon-mini" title={cx.ping} aria-label={`${cx.ping}: ${w.url}`} onClick={() => ping(w)}>{DI.activity}</button>}
                  {canManage && <button className="icon-mini danger" title={cx.delete} aria-label={`${cx.delete}: ${w.url}`} onClick={() => setConfirm({ kind: "delete", ep: w })}>{DI.trash}</button>}
                  <RowMenu
                    label={fmt(t.dash.common.rowActions, { name: w.url })}
                    items={[
                      { key: "open", label: cx.deliveries, icon: DI.docs, onClick: () => setSelected(w) },
                      { key: "url", label: t.dash.common.copyUrl, icon: <IcCopy />, onClick: () => copyText(w.url).then(() => showToast(t.toasts.copied)).catch(() => {}) },
                      { key: "id", label: t.dash.common.copyId, icon: <IcCopy />, onClick: () => copyText(w.id).then(() => showToast(t.toasts.copied)).catch(() => {}) },
                      ...(canManage ? [
                        { key: "edit", label: wv.edit, icon: DI.edit, onClick: () => setEditing(w) },
                        { key: "ping", label: cx.ping, icon: DI.activity, onClick: () => ping(w) },
                        { key: "toggle", label: w.enabled ? cx.disable : cx.enable, icon: DI.refresh, onClick: () => toggle(w) },
                        { key: "rotate", label: cx.rotate, icon: DI.key, onClick: () => setConfirm({ kind: "rotate", ep: w }) },
                        { key: "delete", label: cx.delete, icon: DI.trash, danger: true, onClick: () => setConfirm({ kind: "delete", ep: w }) },
                      ] : []),
                    ]}
                  />
                </td>
              </tr>
            ))}
              <FillRows
                n={pg.size - (error ? 0 : pg.count)} cols={5}
                empty={error ? cx.loadError : null}
              />
            </tbody>
          </table></div>
        )}
        {loading && <TableSkeleton label={cx.loading} cols={5} />}
        {!loading && <Pagination {...pg} />}
      </div>

      {selected && <DeliveriesPanel key={selected.id} wv={wv} cx={cx} endpoint={selected} env={env} orgId={orgId} canManage={canManage} />}
      {confirm && (
        <ConfirmModal
          title={confirm.kind === "delete" ? wv.deleteTitle : wv.rotateTitle}
          body={fmt(confirm.kind === "delete" ? wv.deleteBody : wv.rotateBody, { url: confirm.ep.url })}
          confirmLabel={confirm.kind === "delete" ? cx.delete : cx.rotate} cancelLabel={t.dash.common.cancel}
          onConfirm={runConfirm} onClose={() => { if (!confirming) setConfirm(null); }}
        />
      )}

      {modal && <WebhookFormModal wv={wv} cx={cx} env={env} orgId={orgId} onClose={() => setModal(false)} onSaved={onCreated} />}
      {editing && <WebhookFormModal wv={wv} cx={cx} env={env} orgId={orgId} endpoint={editing} onClose={() => setEditing(null)} onSaved={onEdited} />}
      {reveal && <RevealSecretModal cx={cx} data={reveal} onClose={() => setReveal(null)} />}
    </>
  );
}

/* An endpoint's latest deliveries, all or only the failed ones (asked of the server); a delivery
   opens its detail: the event, every attempt's outcome and the error the endpoint answered. */
function DeliveriesPanel({ wv, cx, endpoint, env, orgId, canManage }) {
  const t = useT();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [only, setOnly] = useState("all");
  const [open, setOpen] = useState(null);
  const pg = usePaged(rows, only + "|" + endpoint.id);
  const load = useCallback(() => {
    setLoading(true);
    whApi.deliveries(endpoint.id, env, { take: 50, ...(only === "failed" ? { status: "FAILED" } : {}) })
      .then((d) => { setRows((d && Array.isArray(d.data)) ? d.data : []); setFailed(false); })
      .catch(() => { setRows([]); setFailed(true); })
      .finally(() => setLoading(false));
  }, [endpoint.id, env, only]);
  useEffect(() => { load(); }, [load]);
  const redeliver = (d) => whApi.redeliver(endpoint.id, d.id, env, orgId).then(() => { showToast(wv.resent); load(); }).catch((e) => showToast((e && e.message) || cx.redeliver, "error"));
  // A second list on the page: its heading (with the endpoint and the all/failed switch), then the table.
  return (
    <section className="hub-section wh-deliveries" aria-labelledby="wh-deliveries-t">
      <div className="hub-section-head">
        <h2 id="wh-deliveries-t">{cx.deliveries} <small className="wh-deliveries-url">{endpoint.url}</small></h2>
        <div className="seg-tabs" role="group" aria-label={cx.deliveries}>
          {["all", "failed"].map((k) => <button key={k} type="button" className={only === k ? "on" : ""} aria-pressed={only === k} onClick={() => setOnly(k)}>{wv.only[k]}</button>)}
        </div>
      </div>
      <div className="panel">
      {loading && <TableSkeleton label={cx.loading} cols={5} />}
      {!loading && (
        <div className="t-scroll" tabIndex={0}><table className="tx"><thead><tr><th>{wv.tableHead.event}</th><th>{wv.tableHead.response}</th><th>{wv.tableHead.status}</th><th>{wv.tableHead.when}</th><th><span className="sr-only">{t.dash.common.actions}</span></th></tr></thead>
          <tbody>{pg.slice.map((d) => (
            <tr key={d.id} className="row-click" onClick={() => setOpen(d)}>
              <td className="tid">
                <span className="cell-mark"><StatusIcon tone={pillTone(DELIVERY_PILL[d.status] || "ref")} />
                <RecordLink
                  onOpen={() => setOpen(d)} copy={d.eventId || d.id}
                  preview={() => <PreviewCard label={wv.eventId} title={d.eventId || d.id} headline={<><b>{(cx.eventLabels && cx.eventLabels[d.eventType]) || humanize(d.eventType)}</b><span className={`hub-st-t ${DELIVERY_PILL[d.status] === "ok" ? "ok" : DELIVERY_PILL[d.status] === "fail" ? "fail" : "wait"}`}>{d.status}</span></>} fields={[[wv.tableHead.response, d.responseStatus ?? "-"], [wv.attempts, d.attempts ?? "-"], [wv.tableHead.when, fmtDateTime(d.lastAttemptAt || d.createdAt)]]} />}
                >{(cx.eventLabels && cx.eventLabels[d.eventType]) || humanize(d.eventType)}</RecordLink>
                </span>
              </td>
              <td className="cust">{d.responseStatus ?? "-"}</td>
              <td><Pill st={DELIVERY_PILL[d.status] || "ref"} tone={d.status === "PENDING" ? "wait" : undefined} label={d.status} /></td>
              <td className="cust">{fmtDateTime(d.lastAttemptAt || d.createdAt)}</td>
              <td className="row-actions" onClick={(e) => e.stopPropagation()}>
                <button className="icon-mini" title={wv.delivery} aria-label={wv.delivery} onClick={() => setOpen(d)}>{DI.docs}</button>
                {canManage && <button type="button" className="icon-mini" title={cx.redeliver} aria-label={cx.redeliver} onClick={() => redeliver(d)}>{DI.refresh}</button>}
                <RowMenu
                  label={fmt(t.dash.common.rowActions, { name: d.eventId || d.id })}
                  items={[
                    { key: "open", label: wv.delivery, icon: DI.docs, onClick: () => setOpen(d) },
                    { key: "copy", label: t.dash.common.copyId, icon: <IcCopy />, onClick: () => copyText(d.eventId || d.id).then(() => showToast(t.toasts.copied)).catch(() => {}) },
                    ...(canManage ? [{ key: "redeliver", label: cx.redeliver, icon: DI.refresh, onClick: () => redeliver(d) }] : []),
                  ]}
                />
              </td>
            </tr>
          ))}
            <FillRows n={pg.size - pg.count} cols={5} empty={failed ? cx.loadError : null} />
          </tbody>
        </table></div>
      )}
      {!loading && <Pagination {...pg} />}
      </div>
      {open && (
        <Modal onClose={() => setOpen(null)}>
          <div className="modal-body">
            <div className="modal-eyebrow">{wv.delivery}</div>
            <h3>{(cx.eventLabels && cx.eventLabels[open.eventType]) || humanize(open.eventType)}</h3>
            <div className="paylink-fields" style={{ marginBottom: 18 }}>
              {[[wv.tableHead.status, open.status], [wv.tableHead.response, open.responseStatus ?? "-"], [wv.attempts, open.attempts ?? "-"], [wv.error, open.error], [wv.eventId, open.eventId], [wv.tableHead.when, fmtDateTime(open.lastAttemptAt || open.createdAt)], [endpoint.url ? wv.tableHead.url : null, endpoint.url]]
                .filter(([k, v]) => k && v !== null && v !== undefined && v !== "")
                .map(([k, v]) => (<div className="paylink-field" key={k}><span className="pf-k">{k}</span><span className="pf-v">{String(v)}</span></div>))}
            </div>
            <div className="modal-actions">
              {canManage && <button className="btn btn-violet" onClick={() => { redeliver(open); setOpen(null); }}>{cx.redeliver}</button>}
              <button className="btn btn-soft" onClick={() => setOpen(null)}>{t.ui.close}</button>
            </div>
          </div>
        </Modal>
      )}
    </section>
  );
}

/* Adds an endpoint, or (`endpoint`) changes an existing one's URL and events. */
function WebhookFormModal({ wv, cx, env, orgId, endpoint = null, onClose, onSaved }) {
  const t = useT();
  const m = wv.modal;
  const [url, setUrl] = useState(endpoint ? endpoint.url : "");
  const [ev, setEv] = useState(endpoint ? (endpoint.eventTypes || []) : ["PAYMENT_INTENT_SUCCEEDED"]);
  const [busy, setBusy] = useState(false);
  const toggle = (e) => setEv((v) => v.includes(e) ? v.filter((x) => x !== e) : [...v, e]);
  const submit = () => {
    if (!url.trim() || busy) return;
    setBusy(true);
    (endpoint
      ? whApi.update(endpoint.id, env, orgId, { url: url.trim(), eventTypes: ev }).then((u) => ({ ...endpoint, ...(u || {}), url: url.trim(), eventTypes: ev }))
      : whApi.create(env, orgId, { url: url.trim(), ...(ev.length ? { eventTypes: ev } : {}) }))
      .then((ep) => onSaved(ep))
      .catch((e) => showToast((e && e.message) || wv.title, "error"))
      .finally(() => setBusy(false));
  };
  return (
    <Modal onClose={onClose}>
      <div className="modal-body">
        <div className="modal-eyebrow">{m.eyebrow}</div>
        <h3>{endpoint ? wv.editTitle : m.title}</h3>
        <Field label={m.urlLabel} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://api.acme.com/hooks/cosmos" autoFocus />
        <label className="field-l" style={{ marginTop: 14 }}>{m.eventsLabel}</label>
        <div className="chk-list">{EVENT_TYPES.map((e) => (
          <label key={e} className={`chk${ev.includes(e) ? " on" : ""}`}>
            <input type="checkbox" checked={ev.includes(e)} onChange={() => toggle(e)} />
            <span className="chk-box">{ev.includes(e) && <IcCheck />}</span>{(cx.eventLabels && cx.eventLabels[e]) || humanize(e)}
          </label>
        ))}</div>
        <div className="modal-actions">
          <button className="btn btn-violet" disabled={!url.trim() || busy} onClick={submit}>{endpoint ? wv.save : m.add}</button>
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
            <button type="button" className="copy-mini" title={t.ui.copyToClipboard} aria-label={t.ui.copyToClipboard} onClick={() => copyText(data.secret).then(() => showToast(t.toasts.copied))}><IcCopy /></button>
          </div>
          <div className="paylink-code">{data.secret}</div>
        </div>
        <div className="modal-actions"><button className="btn btn-violet" onClick={onClose}>{t.ui.close}</button></div>
      </div>
    </Modal>
  );
}
