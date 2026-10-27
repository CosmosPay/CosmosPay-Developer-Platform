import { useState, useEffect, useRef, useCallback } from "react";
import { Modal, showToast } from "@/components/cosmos/shared";
import { useT, fmt } from "@/lib/i18n/index";
import { products as prodApi } from "@/lib/api-client";
import { DI } from "@/components/cosmos/dashboard/icons";
import { usePaged, useGsapRows, goFiltered, useListFilters } from "@/components/cosmos/dashboard/hooks";
import { fmtDate } from "@/components/cosmos/dashboard/helpers";
import { IcCheck, IcCopy } from "@/components/cosmos/icons";
import { Pill } from "@/components/cosmos/dashboard/components/Pill";
import { ViewHead } from "@/components/cosmos/dashboard/components/ViewHead";
import { Field, Sel } from "@/components/cosmos/dashboard/components/Field";
import { Pagination } from "@/components/cosmos/dashboard/components/Pagination";
import { FillRows } from "@/components/cosmos/dashboard/components/FillRows";
import { FilterBar } from "@/components/cosmos/dashboard/components/FilterBar";
import { countBy, inRange, matchesQuery } from "@/lib/dashboard-filters";
import { TableSkeleton } from "@/components/cosmos/dashboard/components/Skeleton";
import { RowMenu } from "@/components/cosmos/dashboard/components/RowMenu";
import { StatusIcon } from "@/components/cosmos/dashboard/components/StatusIcon";
import { RecordLink } from "@/components/cosmos/dashboard/components/RecordLink";
import { PreviewCard } from "@/components/cosmos/dashboard/components/RecordPreview";
import { ViewFigures } from "@/components/cosmos/dashboard/components/ActivityPanel";
import { ConfirmModal } from "@/components/cosmos/ui/ConfirmModal";

const TYPE_TO_KIND = { Recurring: "recurring", "One-time": "one_time", "Payment link": "link" };
const KIND_TO_TYPE = { recurring: "Recurring", one_time: "One-time", link: "Payment link" };
const assetLabel = (a) => (!a || a === "native" ? "XLM" : a);
const KINDS = ["recurring", "one_time", "link"];
const STATES = ["active", "inactive"];
const DEFAULTS = { q: "", status: "all", kind: "all", date: "any" };
const ALLOWED = { status: ["all", ...STATES], kind: ["all", ...KINDS] };
const stateOf = (p) => (p.active ? "active" : "inactive");

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
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const { filters, set, reset, active } = useListFilters(DEFAULTS, ALLOWED);
  const fl = t.dash.filters;

  const load = useCallback(() => {
    setLoading(true);
    prodApi.list(env)
      .then((r) => { setItems((r && Array.isArray(r.data)) ? r.data : []); setError(false); })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [env]);
  useEffect(() => { load(); }, [load]);

  // The search reads the product as listed: its name, price, asset and type.
  const matches = (p, skip) =>
    (skip === "status" || filters.status === "all" || stateOf(p) === filters.status) &&
    (skip === "kind" || filters.kind === "all" || p.kind === filters.kind) &&
    inRange(p.createdAt, filters.date) &&
    matchesQuery([p.name, p.amount, assetLabel(p.asset), pr.types[KIND_TO_TYPE[p.kind]]], filters.q);
  const view = items.filter((p) => matches(p, null));
  const stateCounts = countBy(items.filter((p) => matches(p, "status")), stateOf);
  const kindCounts = countBy(items.filter((p) => matches(p, "kind")), (p) => p.kind);
  const pg = usePaged(view, JSON.stringify(filters));
  const tref = useRef(null); useGsapRows(tref, pg.page + "|" + view.length);
  const addButton = canManage && <button className="btn btn-dark btn-sm" onClick={() => setModal(true)}>{DI.plus} {pr.add}</button>;

  const onCreated = (p) => { setModal(false); setItems((x) => [p, ...x]); };
  const onUpdated = (p) => { setItems((x) => x.map((i) => (i.id === p.id ? { ...i, ...p } : i))); setDetail(null); };
  const sell = (p) => goFiltered(onGo, "payments", { create: "1", amount: p.amount, asset: p.asset || "native", note: p.name });
  // On sale or not, from the row: the same update the detail's checkbox makes.
  const toggle = (p) => prodApi.update(p.id, env, orgId, { active: !p.active })
    .then((u) => { setItems((x) => x.map((i) => (i.id === p.id ? { ...i, ...(u && u.id ? u : { active: !p.active }) } : i))); showToast(p.active ? pr.deactivated : pr.activated); })
    .catch((e) => showToast((e && e.message) || pr.detail.saveError, "error"));
  // Deleting a product is confirmed first, as every delete is.
  const confirmDelete = () => {
    const p = toDelete;
    if (!p || deleting) return;
    setDeleting(true);
    prodApi.remove(p.id, env, orgId)
      .then(() => { setItems((x) => x.filter((i) => i.id !== p.id)); setDetail(null); setToDelete(null); })
      .catch((e) => showToast((e && e.message) || pr.deleteError, "error"))
      .finally(() => setDeleting(false));
  };

  return (
    <>
      <ViewHead title={pr.title} />
      <ViewFigures
        label={pr.title} loading={loading} failed={error}
        items={[
          { key: "products", label: pr.figures.products, value: items.length },
          { key: "active", label: cx.active, value: items.filter((p) => p.active).length },
          { key: "priced", label: pr.figures.priced, value: items.filter((p) => p.amount).length },
          { key: "recurring", label: pr.types.Recurring, value: items.filter((p) => p.kind === "recurring").length },
        ]}
      />
      <FilterBar
        label={fl.label}
        query={filters.q} onQuery={(v) => set("q", v)} placeholder={pr.searchPlaceholder}
        status={{
          label: fl.status, value: filters.status, onChange: (v) => set("status", v),
          options: [
            { key: "all", label: fl.allStatuses, count: items.filter((p) => matches(p, "status")).length },
            ...STATES.map((st) => ({ key: st, label: st === "active" ? cx.active : cx.inactive, count: stateCounts[st] || 0, icon: <StatusIcon tone={st === "active" ? "ok" : "off"} size={16} /> })),
          ],
        }}
        selects={[{ key: "kind", label: fl.kind, value: filters.kind, onChange: (v) => set("kind", v), options: [{ key: "all", label: fl.allKinds }, ...KINDS.map((k) => ({ key: k, label: pr.types[KIND_TO_TYPE[k]], count: kindCounts[k] || 0 }))] }]}
        date={filters.date} onDate={(v) => set("date", v)}
        active={active} onReset={reset}
        shown={view.length} total={loading ? undefined : items.length} loading={loading}
        actions={addButton}
      />
      <div className="panel">
        {!loading && (
          <div className="t-scroll" tabIndex={0} ref={tref}><table className="tx"><thead><tr><th>{pr.tableHead.name}</th><th>{pr.tableHead.price}</th><th>{pr.tableHead.type}</th><th>{pr.tableHead.status}</th><th>{pr.tableHead.created}</th><th><span className="sr-only">{t.dash.common.actions}</span></th></tr></thead>
            <tbody>{!error && pg.slice.map((p) => (
              <tr key={p.id} className="row-click" onClick={() => setDetail(p)}>
                <td className="tid">
                  <div className="cust-cell">
                    <span className="am-sq">{DI.products}</span>
                    <RecordLink
                      onOpen={() => setDetail(p)} copy={p.id}
                      preview={() => <PreviewCard label={pr.tableHead.name} title={p.id} headline={<><b>{p.name}</b><span className={`hub-st-t ${p.active ? "ok" : "wait"}`}>{p.active ? cx.active : cx.inactive}</span></>} fields={[[pr.tableHead.price, p.amount ? `${p.amount} ${assetLabel(p.asset)}` : cx.customerSet], [pr.tableHead.type, pr.types[KIND_TO_TYPE[p.kind]] || p.kind]]} />}
                    >{p.name}</RecordLink>
                  </div>
                </td>
                <td className="amt">{p.amount ? `${p.amount} ${assetLabel(p.asset)}` : cx.customerSet}</td>
                <td className="cust">{pr.types[KIND_TO_TYPE[p.kind]] || p.kind}</td>
                <td><Pill st={p.active ? "ok" : "ref"} tone={p.active ? "ok" : "off"} label={p.active ? cx.active : cx.inactive} /></td>
                <td className="cust">{fmtDate(p.createdAt)}</td>
                <td className="row-actions" onClick={(e) => e.stopPropagation()}>
                  <button className="icon-mini" title={t.dash.common.details} aria-label={`${t.dash.common.details}: ${p.name}`} onClick={() => setDetail(p)}>{canManage ? DI.edit : DI.docs}</button>
                  {canSell && <button className="icon-mini" disabled={!(p.amount && p.active)} title={p.amount && p.active ? t.dash.overview.hub.createLink : t.dash.common.sellNeeds} aria-label={`${t.dash.overview.hub.createLink}: ${p.name}`} onClick={() => sell(p)}>{DI.payments}</button>}
                  {canManage && <button className="icon-mini danger" title={cx.delete} aria-label={`${cx.delete}: ${p.name}`} onClick={() => setToDelete(p)}>{DI.trash}</button>}
                  <RowMenu
                    label={fmt(t.dash.common.rowActions, { name: p.name })}
                    items={[
                      { key: "open", label: canManage ? pr.edit : pr.detail.title, icon: canManage ? DI.edit : DI.docs, onClick: () => setDetail(p) },
                      ...(canManage ? [{ key: "toggle", label: p.active ? pr.deactivate : pr.activate, icon: DI.refresh, onClick: () => toggle(p) }] : []),
                      ...(canSell ? [{ key: "sell", label: t.dash.overview.hub.createLink, icon: DI.payments, disabled: !(p.amount && p.active), hint: t.dash.common.sellNeeds, onClick: () => sell(p) }] : []),
                      { key: "copy", label: t.dash.common.copyId, icon: <IcCopy />, onClick: () => navigator.clipboard?.writeText(p.id).then(() => showToast(t.toasts.copied)).catch(() => {}) },
                      ...(canManage ? [{ key: "delete", label: cx.delete, icon: DI.trash, danger: true, onClick: () => setToDelete(p) }] : []),
                    ]}
                  />
                </td>
              </tr>
            ))}
              <FillRows
                n={pg.size - (error ? 0 : pg.count)} cols={6}
                empty={error ? cx.loadError : null}
              />
            </tbody>
          </table></div>
        )}
        {loading && <TableSkeleton label={cx.loading} cols={6} />}
        {!loading && <Pagination {...pg} />}
      </div>
      {modal && <CreateProductModal pr={pr} env={env} orgId={orgId} onClose={() => setModal(false)} onCreated={onCreated} />}
      {toDelete && <ConfirmModal title={pr.deleteTitle} body={fmt(pr.deleteBody, { name: toDelete.name })} confirmLabel={cx.delete} cancelLabel={t.dash.common.cancel} onConfirm={confirmDelete} onClose={() => { if (!deleting) setToDelete(null); }} />}
      {detail && <ProductDetailModal pr={pr} cx={cx} product={detail} env={env} orgId={orgId} canManage={canManage} canSell={canSell} onClose={() => setDetail(null)} onUpdated={onUpdated} onSell={() => sell(detail)} onDelete={() => setToDelete(detail)} />}
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
    // A cleared price is sent as null, so the product goes back to a customer-set amount.
    const amount = form.amount.trim() || null;
    prodApi.update(product.id, env, orgId, {
      name: form.name.trim(),
      ...(amount || product.amount ? { amount } : {}),
      kind: TYPE_TO_KIND[form.type] || "one_time",
      active: form.active,
    })
      .then((p) => onUpdated(p && p.id ? p : { ...product, name: form.name.trim(), amount, active: form.active, kind: TYPE_TO_KIND[form.type] }))
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
          <button className="btn btn-soft" onClick={onClose}>{canManage ? t.dash.common.cancel : t.ui.close}</button>
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
