import { useState, useEffect, useRef, useCallback } from "react";
import { Modal, showToast } from "@/components/cosmos/shared";
import { useT, fmt } from "@/lib/i18n/index";
import { customers as custApi, paymentIntents as payApi } from "@/lib/api-client";
import { DI } from "@/components/cosmos/dashboard/icons";
import { fmtDate, fmtDateTime } from "@/components/cosmos/dashboard/helpers";
import { usePaged, useGsapRows, goFiltered } from "@/components/cosmos/dashboard/hooks";
import { Toolbar } from "@/components/cosmos/dashboard/components/Toolbar";
import { ViewHead } from "@/components/cosmos/dashboard/components/ViewHead";
import { Field } from "@/components/cosmos/dashboard/components/Field";
import { Pagination } from "@/components/cosmos/dashboard/components/Pagination";
import { Pill } from "@/components/cosmos/dashboard/components/Pill";
import { STATUS_PILL } from "@/components/cosmos/dashboard/components/PayLinkDetail";
import { TableSkeleton } from "@/components/cosmos/dashboard/components/Skeleton";
import { matchesQuery } from "@/lib/dashboard-filters";
import { CHAINS, assetLabel, explorerAccountUrl, isAddress, isChain } from "@/lib/chains";

const shortAcct = (a) => (a && a.length > 12 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a);
/* A customer's account may be on Stellar, Solana or Monad: its explorer is the one of the chain its
   address belongs to, on the environment's network. */
const acctExplorer = (account, env) => {
  const chain = CHAINS.find((c) => isAddress(c, account || ""));
  return chain ? explorerAccountUrl(chain, env === "prod" ? "public" : "testnet", account) : null;
};

/* A customer's payments are the payments their wallet paid: the count and each payment open in the
   Payments view (searched by that wallet, or the payment's own detail). */
export function CustomersView({ canManage = true, orgId, env = "dev", onGo = (v) => {} }) {
  const t = useT();
  const cv = t.dash.customers;
  const cx = t.dash.cosmos;
  const [q, setQ] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [modal, setModal] = useState(false);
  const [detail, setDetail] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    custApi.list(env)
      .then((r) => { setRows((r && Array.isArray(r.data)) ? r.data : []); setError(false); })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [env]);
  useEffect(() => { load(); }, [load]);

  const view = rows.filter((c) => matchesQuery([c.name, c.alias, c.email, c.account], q));
  const pg = usePaged(view, q);
  const tref = useRef(null); useGsapRows(tref, pg.page + "|" + view.length);

  const onCreated = (c) => { setModal(false); setRows((x) => [c, ...x]); };
  const onUpdated = (c) => { setRows((x) => x.map((i) => (i.id === c.id ? { ...i, ...c } : i))); setDetail((d) => (d && d.id === c.id ? { ...d, ...c } : d)); };
  const paymentsOf = (c) => goFiltered(onGo, "payments", { q: c.account });
  const remove = (c) => custApi.remove(c.id, env, orgId)
    .then(() => { setRows((x) => x.filter((i) => i.id !== c.id)); setDetail(null); })
    .catch((e) => showToast((e && e.message) || cx.delete, "error"));

  return (
    <>
      <ViewHead title={cv.title}>{canManage && <button className="btn btn-dark btn-sm" onClick={() => setModal(true)}>{DI.plus} {cv.add}</button>}</ViewHead>
      <div className="panel">
        <Toolbar q={q} setQ={setQ} placeholder={cv.searchPlaceholder} />
        {!loading && !error && view.length > 0 && (
          <div className="t-scroll" tabIndex={0} ref={tref}><table className="tx"><thead><tr><th>{cv.tableHead.name}</th><th>{cv.tableHead.email}</th><th>{cv.tableHead.spend}</th><th>{cv.tableHead.payments}</th><th>{cv.tableHead.since}</th><th><span className="sr-only">{t.dash.common.actions}</span></th></tr></thead>
            <tbody>{pg.slice.map((c) => (
              <tr key={c.id} className="row-click" onClick={() => setDetail(c)}>
                <td><div className="cust-cell"><span className="av-sm">{(c.alias || c.name || "?").slice(0, 2).toUpperCase()}</span>{c.alias || c.name}</div></td>
                <td className="cust">{c.email || (c.account ? shortAcct(c.account) : "-")}</td>
                <td className="amt">{c.total || "0"}</td>
                <td className="cust">{c.account && c.payments ? <button type="button" className="link-btn" onClick={(e) => { e.stopPropagation(); paymentsOf(c); }}>{c.succeeded ?? 0}/{c.payments}</button> : `${c.succeeded ?? 0}/${c.payments ?? 0}`}</td>
                <td className="cust">{fmtDate(c.createdAt)}</td>
                <td style={{ textAlign: "right", whiteSpace: "nowrap" }} onClick={(e) => e.stopPropagation()}>
                  <button className="icon-mini" title={cx.custDetail.title} aria-label={cx.custDetail.title} onClick={() => setDetail(c)}>{DI.docs}</button>
                  {canManage && <button className="icon-mini danger" title={cx.delete} aria-label={cx.delete} onClick={() => remove(c)}>{DI.trash}</button>}
                </td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
        {loading && <TableSkeleton label={cx.loading} />}
        {!loading && error && <div className="empty">{cx.loadError}</div>}
        {!loading && !error && !view.length && (
          <div className="empty">
            {rows.length ? t.dash.filters.noMatch : cv.empty}
            {!rows.length && canManage && <div><button type="button" className="btn btn-dark btn-sm" onClick={() => setModal(true)}>{DI.plus} {cv.add}</button></div>}
          </div>
        )}
        {!loading && !error && view.length > 0 && <Pagination {...pg} />}
      </div>
      {modal && <CustomerFormModal cv={cv} cx={cx} env={env} orgId={orgId} onClose={() => setModal(false)} onSaved={onCreated} />}
      {detail && <CustomerDetailModal cv={cv} cx={cx} customer={detail} env={env} orgId={orgId} canManage={canManage} onClose={() => setDetail(null)} onUpdated={onUpdated} onDelete={() => remove(detail)} onOpenPayment={(id) => goFiltered(onGo, "payments", { open: id })} onAllPayments={() => paymentsOf(detail)} />}
    </>
  );
}

/* Create form. */
function CustomerFormModal({ cv, cx, env, orgId, onClose, onSaved }) {
  const t = useT();
  const m = cv.modal;
  const [name, setName] = useState("");
  const [alias, setAlias] = useState("");
  const [email, setEmail] = useState("");
  const [account, setAccount] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = () => {
    if (!name.trim() || busy) return;
    setBusy(true);
    custApi.create(env, orgId, { name: name.trim(), ...(alias.trim() ? { alias: alias.trim() } : {}), ...(email.trim() ? { email: email.trim() } : {}), ...(account.trim() ? { account: account.trim() } : {}) })
      .then((c) => onSaved(c))
      .catch((e) => showToast((e && e.message) || cv.title, "error"))
      .finally(() => setBusy(false));
  };
  return (
    <Modal onClose={onClose}>
      <div className="modal-body">
        <div className="modal-eyebrow">{m.eyebrow}</div>
        <h3>{m.title}</h3>
        <Field label={m.name} value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme Inc." autoFocus />
        <Field label={cx.custDetail.alias} hint={t.dash.common.optional} value={alias} onChange={(e) => setAlias(e.target.value)} placeholder={t.dash.examples.customerName} />
        <Field label={m.email} hint={t.dash.common.optional} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="billing@acme.com" />
        <Field label={cx.custDetail.account} hint={t.dash.common.optional} value={account} onChange={(e) => setAccount(e.target.value)} placeholder={cx.custDetail.accountPlaceholder} />
        <div className="modal-actions">
          <button className="btn btn-violet" disabled={!name.trim() || busy} onClick={submit}>{m.add}</button>
          <button className="btn btn-soft" onClick={onClose}>{t.dash.common.cancel}</button>
        </div>
      </div>
    </Modal>
  );
}

/* Drill-down: editable info + the customer's on-chain payments. */
function CustomerDetailModal({ cv, cx, customer, env, orgId, canManage, onClose, onUpdated, onDelete, onOpenPayment, onAllPayments }) {
  const t = useT();
  const cd = cx.custDetail;
  const m = cv.modal;
  const [edit, setEdit] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pays, setPays] = useState(null);
  const [form, setForm] = useState({ name: customer.name || "", alias: customer.alias || "", email: customer.email || "", account: customer.account || "", reference: customer.reference || "", note: customer.note || "" });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  // The customer's payments = intents whose payer matches their account.
  useEffect(() => {
    if (!customer.account) { setPays([]); return; }
    let alive = true;
    payApi.list(env, { take: 100 })
      .then((res) => { if (alive) setPays((Array.isArray(res?.data) ? res.data : []).filter((p) => p.source === customer.account)); })
      .catch(() => { if (alive) setPays([]); });
    return () => { alive = false; };
  }, [customer.account, env]);

  const save = () => {
    if (!form.name.trim() || busy) return;
    setBusy(true);
    custApi.update(customer.id, env, orgId, { name: form.name.trim(), alias: form.alias.trim(), email: form.email.trim(), account: form.account.trim(), reference: form.reference.trim(), note: form.note.trim() })
      .then((u) => { onUpdated(u); setEdit(false); })
      .catch((e) => showToast((e && e.message) || cd.save, "error"))
      .finally(() => setBusy(false));
  };

  return (
    <Modal onClose={onClose}>
      <div className="modal-body">
        <div className="modal-eyebrow">{cd.title}</div>
        <h3>{customer.alias || customer.name}</h3>

        {edit ? (
          <>
            <Field label={m.name} value={form.name} onChange={set("name")} autoFocus />
            <Field label={cd.alias} hint={t.dash.common.optional} value={form.alias} onChange={set("alias")} placeholder={t.dash.examples.customerName} />
            <Field label={m.email} hint={t.dash.common.optional} type="email" value={form.email} onChange={set("email")} />
            <Field label={cd.account} hint={t.dash.common.optional} value={form.account} onChange={set("account")} placeholder={cd.accountPlaceholder} />
            <Field label={cd.note} hint={t.dash.common.optional} value={form.note} onChange={set("note")} />
            <div className="modal-actions">
              <button className="btn btn-violet" disabled={!form.name.trim() || busy} onClick={save}>{cd.save}</button>
              <button className="btn btn-soft" onClick={() => setEdit(false)}>{t.dash.common.cancel}</button>
            </div>
          </>
        ) : (
          <>
            <div className="paylink-fields" style={{ marginBottom: 18 }}>
              {[[m.name, customer.name], [cd.alias, customer.alias], [m.email, customer.email], [cd.account, customer.account], [cd.note, customer.note], [cv.tableHead.spend, customer.total], [cv.tableHead.payments, `${customer.succeeded ?? 0}/${customer.payments ?? 0}`]]
                .filter(([, v]) => v !== null && v !== undefined && v !== "")
                .map(([k, v]) => (<div className="paylink-field" key={k}><span className="pf-k">{k}</span><span className="pf-v">{String(v)}</span></div>))}
            </div>
            <div className="paylink-actions" style={{ marginBottom: 18 }}>
              {canManage && <button className="btn btn-dark btn-sm" onClick={() => setEdit(true)}>{DI.edit} {cd.edit}</button>}
              {customer.account && acctExplorer(customer.account, env) && <a className="btn btn-soft btn-sm" href={acctExplorer(customer.account, env)} target="_blank" rel="noopener noreferrer">{DI.network} {cd.onChain}</a>}
              {canManage && <button className="btn btn-soft danger-soft" onClick={onDelete}>{DI.trash} {cx.delete}</button>}
            </div>

            <div className="cust-pays-head">
              <label className="field-l">{cd.payments}</label>
              {pays !== null && pays.length > 0 && <button type="button" className="link-btn" onClick={onAllPayments}>{t.dash.overview.hub.viewAll}</button>}
            </div>
            {pays === null && <TableSkeleton label={cx.loading} />}
            {/* Payments are matched by the wallet that paid: without one there is nothing to match. */}
            {pays !== null && pays.length === 0 && !customer.account && (
              <div className="empty">
                {cd.noAccount}
                {canManage && <div><button type="button" className="btn btn-dark btn-sm" onClick={() => setEdit(true)}>{DI.edit} {cd.edit}</button></div>}
              </div>
            )}
            {pays !== null && pays.length === 0 && customer.account && <div className="empty">{cd.noPayments}</div>}
            {pays !== null && pays.length > 0 && (
              <div className="t-scroll" tabIndex={0}><table className="tx"><tbody>
                {pays.map((p) => (
                  <tr key={p.id} className="row-click" tabIndex={0} onClick={() => onOpenPayment(p.id)} onKeyDown={(e) => { if (e.key === "Enter") onOpenPayment(p.id); }}>
                    <td className="tid">{p.id}</td>
                    <td className="amt">{p.amount || "-"} {assetLabel(isChain(p.chain) ? p.chain : "stellar", p.asset)}</td>
                    <td><Pill st={STATUS_PILL[p.status] || "ref"} label={(t.dash.paylinks.status && t.dash.paylinks.status[p.status]) || p.status} /></td>
                    <td className="cust">{fmtDateTime(p.createdAt)}</td>
                  </tr>
                ))}
              </tbody></table></div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}
