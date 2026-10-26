import { useState, useEffect, useRef, useCallback } from "react";
import { Modal, showToast } from "@/components/cosmos/shared";
import { useT } from "@/lib/i18n/index";
import { products as prodApi } from "@/lib/api-client";
import { DI } from "@/components/cosmos/dashboard/icons";
import { usePaged, useGsapRows, goFiltered } from "@/components/cosmos/dashboard/hooks";
import { IcCheck } from "@/components/cosmos/icons";
import { Pill } from "@/components/cosmos/dashboard/components/Pill";
import { ViewHead } from "@/components/cosmos/dashboard/components/ViewHead";
import { Field, Sel } from "@/components/cosmos/dashboard/components/Field";
import { Pagination } from "@/components/cosmos/dashboard/components/Pagination";
import { TableSkeleton } from "@/components/cosmos/dashboard/components/Skeleton";

const TYPE_TO_KIND = { Recurring: "recurring", "One-time": "one_time", "Payment link": "link" };
const KIND_TO_TYPE = { recurring: "Recurring", one_time: "One-time", link: "Payment link" };
const assetLabel = (a) => (!a || a === "native" ? "XLM" : a);

/* A product opens its detail: editable (name, price, type, whether it is on sale) for whoever may
   manage products, and, when it has a price, the payment link that sells it (the Payments form,
   filled with its amount, asset and name). */
export function ProductsView({ canManage = true, canSell = false, orgId, env = "dev", onGo = (v) => {} }) {
  const t = useT();
  const pr = t.dash.products;
  const cx = t.dash.cosmos;
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [modal, setModal] = useState(false);
  const [detail, setDetail] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    prodApi.list(env)
      .then((r) => { setItems((r && Array.isArray(r.data)) ? r.data : []); setError(false); })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [env]);
  useEffect(() => { load(); }, [load]);

  const pg = usePaged(items, items.length);
  const tref = useRef(null); useGsapRows(tref, pg.page + "|" + items.length);

  const onCreated = (p) => { setModal(false); setItems((x) => [p, ...x]); };
  const onUpdated = (p) => { setItems((x) => x.map((i) => (i.id === p.id ? { ...i, ...p } : i))); setDetail(null); };
  const sell = (p) => goFiltered(onGo, "payments", { create: "1", amount: p.amount, asset: p.asset || "native", note: p.name });
  const remove = (p) => prodApi.remove(p.id, env, orgId)
    .then(() => { setItems((x) => x.filter((i) => i.id !== p.id)); setDetail(null); })
    .catch((e) => showToast((e && e.message) || cx.delete, "error"));

  return (
    <>
      <ViewHead title={pr.title}>{canManage && <button className="btn btn-dark btn-sm" onClick={() => setModal(true)}>{DI.plus} {pr.add}</button>}</ViewHead>
      <div className="panel">
        {!loading && !error && items.length > 0 && (
          <div className="t-scroll" tabIndex={0} ref={tref}><table className="tx"><thead><tr><th>{pr.tableHead.name}</th><th>{pr.tableHead.price}</th><th>{pr.tableHead.type}</th><th>{pr.tableHead.status}</th><th><span className="sr-only">{t.dash.common.actions}</span></th></tr></thead>
            <tbody>{pg.slice.map((p) => (
              <tr key={p.id} className="row-click" onClick={() => setDetail(p)}>
                <td><div className="cust-cell"><span className="am-sq">{DI.products}</span>{p.name}</div></td>
                <td className="amt">{p.amount ? `${p.amount} ${assetLabel(p.asset)}` : cx.customerSet}</td>
                <td className="cust">{pr.types[KIND_TO_TYPE[p.kind]] || p.kind}</td>
                <td><Pill st={p.active ? "ok" : "ref"} label={p.active ? cx.active : cx.inactive} /></td>
                <td style={{ textAlign: "right", whiteSpace: "nowrap" }} onClick={(e) => e.stopPropagation()}>
                  <button className="icon-mini" title={pr.detail.title} aria-label={pr.detail.title} onClick={() => setDetail(p)}>{DI.docs}</button>
                  {canManage && <button className="icon-mini danger" title={cx.delete} aria-label={cx.delete} onClick={() => remove(p)}>{DI.trash}</button>}
                </td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
        {loading && <TableSkeleton label={cx.loading} />}
        {!loading && error && <div className="empty">{cx.loadError}</div>}
        {!loading && !error && !items.length && (
          <div className="empty">
            {pr.modal.desc}
            {canManage && <div><button type="button" className="btn btn-dark btn-sm" onClick={() => setModal(true)}>{DI.plus} {pr.add}</button></div>}
          </div>
        )}
        {!loading && !error && items.length > 0 && <Pagination {...pg} />}
      </div>
      {modal && <CreateProductModal pr={pr} env={env} orgId={orgId} onClose={() => setModal(false)} onCreated={onCreated} />}
      {detail && <ProductDetailModal pr={pr} cx={cx} product={detail} env={env} orgId={orgId} canManage={canManage} canSell={canSell} onClose={() => setDetail(null)} onUpdated={onUpdated} onSell={() => sell(detail)} onDelete={() => remove(detail)} />}
    </>
  );
}

/* A product's detail: its fields, editable for whoever may manage products, with "on sale" as a
   checkbox (an inactive product is kept but not sold), and the payment link that sells it. */
function ProductDetailModal({ pr, cx, product, env, orgId, canManage, canSell, onClose, onUpdated, onSell, onDelete }) {
  const t = useT();
  const m = pr.modal;
  const d = pr.detail;
  const [form, setForm] = useState({ name: product.name || "", amount: product.amount || "", type: KIND_TO_TYPE[product.kind] || "One-time", active: !!product.active });
  const [busy, setBusy] = useState(false);
  const amountOk = !form.amount.trim() || /^\d+(\.\d{1,7})?$/.test(form.amount.trim());
  const save = () => {
    if (!form.name.trim() || !amountOk || busy) return;
    setBusy(true);
    prodApi.update(product.id, env, orgId, {
      name: form.name.trim(),
      ...(form.amount.trim() ? { amount: form.amount.trim() } : {}),
      kind: TYPE_TO_KIND[form.type] || "one_time",
      active: form.active,
    })
      .then((p) => onUpdated(p && p.id ? p : { ...product, ...form, kind: TYPE_TO_KIND[form.type] }))
      .catch((e) => showToast((e && e.message) || d.saveError, "error"))
      .finally(() => setBusy(false));
  };
  return (
    <Modal onClose={onClose}>
      <div className="modal-body">
        <div className="modal-eyebrow">{d.title}</div>
        <h3>{product.name}</h3>
        {canManage ? (
          <>
            <Field label={m.name} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            <Field label={`${pr.tableHead.price} (${assetLabel(product.asset)})`} hint={m.priceHint} value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} placeholder="49.00" inputMode="decimal" />
            <Sel label={m.type} value={form.type} onChange={(v) => setForm((f) => ({ ...f, type: v }))} options={["Recurring", "One-time", "Payment link"]} labels={pr.types} />
            <label className={`chk${form.active ? " on" : ""}`} style={{ marginTop: 14 }}>
              <input type="checkbox" checked={form.active} onChange={() => setForm((f) => ({ ...f, active: !f.active }))} />
              <span className="chk-box">{form.active && <IcCheck />}</span>{d.active}
            </label>
            <p className="field-note">{d.activeHint}</p>
          </>
        ) : (
          <div className="paylink-fields" style={{ marginBottom: 18 }}>
            {[[m.name, product.name], [pr.tableHead.price, product.amount ? `${product.amount} ${assetLabel(product.asset)}` : cx.customerSet], [m.type, pr.types[KIND_TO_TYPE[product.kind]] || product.kind], [pr.tableHead.status, product.active ? cx.active : cx.inactive]]
              .map(([k, v]) => (<div className="paylink-field" key={k}><span className="pf-k">{k}</span><span className="pf-v">{String(v)}</span></div>))}
          </div>
        )}
        <div className="modal-actions">
          {canManage && <button className="btn btn-violet" disabled={!form.name.trim() || !amountOk || busy} onClick={save}>{d.save}</button>}
          {canSell && product.amount && product.active && <button className="btn btn-soft" onClick={onSell}>{t.dash.overview.hub.createLink}</button>}
          {canManage && <button className="btn btn-soft danger-soft" onClick={onDelete}>{DI.trash} {cx.delete}</button>}
        </div>
      </div>
    </Modal>
  );
}

function CreateProductModal({ pr, env, orgId, onClose, onCreated }) {
  const t = useT();
  const m = pr.modal;
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [asset, setAsset] = useState("");
  const [type, setType] = useState("Recurring");
  const [busy, setBusy] = useState(false);
  const submit = () => {
    if (!name.trim() || busy) return;
    setBusy(true);
    prodApi.create(env, orgId, {
      name: name.trim(),
      ...(price.trim() ? { amount: price.trim() } : {}),
      ...(asset.trim() ? { assetCode: asset.trim() } : {}),
      kind: TYPE_TO_KIND[type] || "one_time",
    })
      .then((p) => onCreated(p))
      .catch((e) => showToast((e && e.message) || pr.title, "error"))
      .finally(() => setBusy(false));
  };
  return (
    <Modal onClose={onClose}>
      <div className="modal-body">
        <div className="modal-eyebrow">{m.eyebrow}</div>
        <h3>{m.title}</h3>
        <Field label={m.name} value={name} onChange={(e) => setName(e.target.value)} placeholder={t.dash.examples.productName} autoFocus />
        {/* The asset is its own field below, so the price names no currency. */}
        <Field label={pr.tableHead.price} hint={m.priceHint} value={price} onChange={(e) => setPrice(e.target.value)} placeholder="49.00" inputMode="decimal" />
        <Field label={t.dash.paylinks.modal.asset} value={asset} onChange={(e) => setAsset(e.target.value)} placeholder="XLM" />
        <Sel label={m.type} value={type} onChange={setType} options={["Recurring", "One-time", "Payment link"]} labels={pr.types} />
        <div className="modal-actions">
          <button className="btn btn-violet" disabled={!name.trim() || busy} onClick={submit}>{m.create}</button>
          <button className="btn btn-soft" onClick={onClose}>{t.dash.common.cancel}</button>
        </div>
      </div>
    </Modal>
  );
}
