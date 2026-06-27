import { useState, useEffect, useRef, useCallback } from "react";
import { Modal, showToast } from "@/components/cosmos/shared";
import { useT } from "@/lib/i18n/index";
import { products as prodApi } from "@/lib/api-client";
import { DI } from "@/components/cosmos/dashboard/icons";
import { usePaged, useGsapRows } from "@/components/cosmos/dashboard/hooks";
import { Pill } from "@/components/cosmos/dashboard/components/Pill";
import { ViewHead } from "@/components/cosmos/dashboard/components/ViewHead";
import { Field, Sel } from "@/components/cosmos/dashboard/components/Field";
import { Pagination } from "@/components/cosmos/dashboard/components/Pagination";

const TYPE_TO_KIND = { Recurring: "recurring", "One-time": "one_time", "Payment link": "link" };
const KIND_TO_TYPE = { recurring: "Recurring", one_time: "One-time", link: "Payment link" };
const assetLabel = (a) => (!a || a === "native" ? "XLM" : a);

export function ProductsView({ canManage = true, orgId, env = "dev" }) {
  const t = useT();
  const pr = t.dash.products;
  const cx = t.dash.cosmos;
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [modal, setModal] = useState(false);

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
  const remove = (p) => prodApi.remove(p.id, env, orgId)
    .then(() => setItems((x) => x.filter((i) => i.id !== p.id)))
    .catch((e) => showToast((e && e.message) || cx.delete, "error"));

  return (
    <>
      <ViewHead title={pr.title} sub={pr.sub}>{canManage && <button className="btn btn-dark btn-sm" onClick={() => setModal(true)}>{DI.plus} {pr.add}</button>}</ViewHead>
      <div className="panel">
        {!loading && !error && items.length > 0 && (
          <div className="t-scroll" ref={tref}><table className="tx"><thead><tr><th>{pr.tableHead.name}</th><th>{pr.tableHead.price}</th><th>{pr.tableHead.type}</th><th>{pr.tableHead.status}</th><th></th></tr></thead>
            <tbody>{pg.slice.map((p) => (
              <tr key={p.id}>
                <td><div className="cust-cell"><span className="am-sq">{DI.products}</span>{p.name}</div></td>
                <td className="amt">{p.amount ? `${p.amount} ${assetLabel(p.asset)}` : cx.customerSet}</td>
                <td className="cust">{pr.types[KIND_TO_TYPE[p.kind]] || p.kind}</td>
                <td><Pill st={p.active ? "ok" : "ref"} label={p.active ? cx.active : cx.inactive} /></td>
                <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                  {canManage && <button className="icon-mini danger" title={cx.delete} aria-label={cx.delete} onClick={() => remove(p)}>{DI.trash}</button>}
                </td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
        {loading && <div className="empty">{cx.loading}</div>}
        {!loading && error && <div className="empty">{cx.loadError}</div>}
        {!loading && !error && !items.length && <div className="empty">{pr.modal.desc}</div>}
        {!loading && !error && items.length > 0 && <Pagination {...pg} />}
      </div>
      {modal && <CreateProductModal pr={pr} env={env} orgId={orgId} onClose={() => setModal(false)} onCreated={onCreated} />}
    </>
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
        <p>{m.desc}</p>
        <Field label={m.name} value={name} onChange={(e) => setName(e.target.value)} placeholder="Pro plan — monthly" autoFocus />
        <Field label={m.price} hint={m.priceHint} value={price} onChange={(e) => setPrice(e.target.value)} placeholder="49.00" inputMode="decimal" />
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
