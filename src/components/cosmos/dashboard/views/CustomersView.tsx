import { useState, useEffect, useRef, useCallback } from "react";
import { Modal, showToast } from "@/components/cosmos/shared";
import { useT, fmt } from "@/lib/i18n/index";
import { customers as custApi, paymentIntents as payApi } from "@/lib/api-client";
import { DI } from "@/components/cosmos/dashboard/icons";
import { fmtDate, fmtDateTime } from "@/components/cosmos/dashboard/helpers";
import { usePaged, useGsapRows, goFiltered, useListFilters, openRecord, recordHref } from "@/components/cosmos/dashboard/hooks";
import { FilterBar } from "@/components/cosmos/dashboard/components/FilterBar";
import { ViewHead } from "@/components/cosmos/dashboard/components/ViewHead";
import { Field } from "@/components/cosmos/dashboard/components/Field";
import { Select } from "@/components/cosmos/dashboard/components/Select";
import { Pagination } from "@/components/cosmos/dashboard/components/Pagination";
import { FillRows } from "@/components/cosmos/dashboard/components/FillRows";
import { Pill } from "@/components/cosmos/dashboard/components/Pill";
import { STATUS_PILL } from "@/components/cosmos/dashboard/components/PayLinkDetail";
import { TableSkeleton } from "@/components/cosmos/dashboard/components/Skeleton";
import { RowMenu } from "@/components/cosmos/dashboard/components/RowMenu";
import { paymentTone } from "@/components/cosmos/dashboard/components/StatusIcon";
import { RecordLink } from "@/components/cosmos/dashboard/components/RecordLink";
import { PaymentPreview, PreviewCard, shortAddress } from "@/components/cosmos/dashboard/components/RecordPreview";
import { AddressLink } from "@/components/cosmos/dashboard/components/AddressLink";
import { NetworkMark } from "@/components/cosmos/dashboard/components/OrgWallets";
import { ViewFigures } from "@/components/cosmos/dashboard/components/ActivityPanel";
import { ConfirmModal } from "@/components/cosmos/ui/ConfirmModal";
import { BulkActions, SelectCell, SelectHead, useBulkDelete, useSelection } from "@/components/cosmos/dashboard/components/BulkSelect";
import { IcCopy } from "@/components/cosmos/icons";
import { countBy, inRange, matchesQuery } from "@/lib/dashboard-filters";
import { CHAINS, CHAIN_NAMES, assetLabel, isAddress, isChain } from "@/lib/chains";

const DEFAULTS = { q: "", chain: "all", date: "any" };
const ALLOWED = { chain: ["all", ...CHAINS] };
const MONTH_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_WALLETS = 20;
const shortAcct = (a) => (a && a.length > 12 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a);
const walletsOf = (c) => (Array.isArray(c?.wallets) ? c.wallets : []);
const networkOf = (env) => (env === "prod" ? "public" : "testnet");
/* The network choice of a wallet, each with its mark. */
const CHAIN_OPTIONS = CHAINS.map((c) => ({ value: c, label: CHAIN_NAMES[c], icon: <NetworkMark chain={c} size={18} /> }));
const newWalletRow = () => ({ key: Math.random().toString(36).slice(2), chain: "stellar", address: "", label: "" });

/* A customer's wallets in a cell: each one's network mark, overlapping, then the address when
   there is one wallet or how many when there are more. */
function WalletStack({ wallets, count }) {
  if (!wallets.length) return <span>-</span>;
  return (
    <span className="cust-wallets" title={wallets.map((w) => `${CHAIN_NAMES[w.chain] || w.chain}: ${w.address}`).join("\n")}>
      <span className="cust-wallet-marks" aria-hidden="true">{wallets.slice(0, 3).map((w) => <NetworkMark key={w.id} chain={w.chain} size={20} />)}</span>
      <span>{wallets.length === 1 ? shortAcct(wallets[0].address) : fmt(count, { n: wallets.length })}</span>
    </span>
  );
}

/* A customer's payments are the payments any of their wallets paid: with one wallet the count
   opens the Payments view searched by it, with more the customer's own detail lists them all. */
export function CustomersView({ canManage = true, orgId, env = "dev", onGo = (v) => {} }) {
  const t = useT();
  const cv = t.dash.customers;
  const cx = t.dash.cosmos;
  const { filters, set, reset, active } = useListFilters(DEFAULTS, ALLOWED);
  const q = filters.q;
  const fl = t.dash.filters;
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [modal, setModal] = useState(false);
  const [detail, setDetail] = useState(null);
  // The detail opened straight in its edit form (the row's "Edit"), and the customer to delete.
  const [editing, setEditing] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    custApi.list(env)
      .then((r) => { setRows((r && Array.isArray(r.data)) ? r.data : []); setError(false); })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [env]);
  useEffect(() => { load(); }, [load]);

  const matches = (c, skip) =>
    (skip === "chain" || filters.chain === "all" || walletsOf(c).some((w) => w.chain === filters.chain)) &&
    inRange(c.createdAt, filters.date) &&
    matchesQuery([c.name, c.alias, c.email, ...walletsOf(c).flatMap((w) => [w.address, w.label, CHAIN_NAMES[w.chain]])], q);
  const view = rows.filter((c) => matches(c, null));
  const chainCounts = countBy(rows.filter((c) => matches(c, "chain")).flatMap((c) => [...new Set(walletsOf(c).map((w) => w.chain))]), (x) => x);
  const pg = usePaged(view, JSON.stringify(filters));
  const tref = useRef(null); useGsapRows(tref, pg.page + "|" + view.length);
  // Several at a time (product owner, 2026-10-27).
  const nameOfCust = (c) => c.alias || c.name;
  const sel = useSelection(canManage ? view.map((c) => c.id) : []);
  const bulk = useBulkDelete({
    sel, nameOf: (id) => { const c = rows.find((x) => x.id === id); return c ? nameOfCust(c) : id; },
    remove: (id) => custApi.remove(id, env, orgId), onRemoved: (ids) => setRows((x) => x.filter((i) => !ids.includes(i.id))),
  });
  const addButton = canManage && (sel.count ? <BulkActions sel={sel} onDelete={bulk.ask} busy={bulk.busy} /> : <button className="btn btn-dark btn-sm" onClick={() => setModal(true)}>{DI.plus} {cv.add}</button>);
  // The figures, from the list itself: customers, the ones with a wallet, their payments, the new ones.
  const sumPays = rows.reduce((n, c) => n + (c.payments || 0), 0);
  const sumOk = rows.reduce((n, c) => n + (c.succeeded || 0), 0);
  const recent = rows.filter((c) => c.createdAt && Date.now() - new Date(c.createdAt).getTime() < MONTH_MS).length;

  const onCreated = (c) => { setModal(false); setRows((x) => [c, ...x]); };
  const onUpdated = (c) => { setRows((x) => x.map((i) => (i.id === c.id ? { ...i, ...c } : i))); setDetail((d) => (d && d.id === c.id ? { ...d, ...c } : d)); };
  const paymentsOf = (c) => {
    const wallets = walletsOf(c);
    if (wallets.length === 1) goFiltered(onGo, "payments", { q: wallets[0].address });
    else setDetail(c);
  };
  const open = (c, edit = false) => { setEditing(edit); setDetail(c); };
  // Deleting a customer is confirmed first, as every delete is.
  const confirmDelete = () => {
    const c = toDelete;
    if (!c || deleting) return;
    setDeleting(true);
    custApi.remove(c.id, env, orgId)
      .then(() => { setRows((x) => x.filter((i) => i.id !== c.id)); setDetail(null); setToDelete(null); })
      .catch((e) => showToast((e && e.message) || cv.deleteError, "error"))
      .finally(() => setDeleting(false));
  };

  return (
    <>
      <ViewHead title={cv.title} />
      <ViewFigures
        label={cv.title} loading={loading} failed={error}
        items={[
          { key: "customers", label: cv.figures.customers, value: rows.length },
          { key: "wallets", label: cv.figures.withWallet, value: rows.filter((c) => walletsOf(c).length > 0).length },
          { key: "payments", label: cv.figures.payments, value: sumPays, sub: fmt(cv.figures.succeeded, { n: sumOk }) },
          { key: "new", label: cv.figures.recent, value: recent },
        ]}
      />
      <FilterBar
        label={fl.label}
        query={q} onQuery={(v) => set("q", v)} placeholder={cv.searchPlaceholder}
        selects={[
          { key: "chain", label: fl.network, value: filters.chain, onChange: (v) => set("chain", v), options: [{ key: "all", label: fl.allNetworks }, ...CHAINS.map((c) => ({ key: c, label: CHAIN_NAMES[c], icon: <NetworkMark chain={c} size={18} />, count: chainCounts[c] || 0 }))] },
        ]}
        date={filters.date} onDate={(v) => set("date", v)}
        active={active} onReset={reset}
        shown={view.length} total={loading ? undefined : rows.length} loading={loading}
        actions={addButton}
      />
      <div className="panel">
        {!loading && (
          <div className="t-scroll" tabIndex={0} ref={tref}><table className="tx"><thead><tr>{canManage && <SelectHead sel={sel} pageIds={pg.slice.map((c) => c.id)} />}<th>{cv.tableHead.name}</th><th>{cv.tableHead.wallets}</th><th>{cv.tableHead.email}</th><th>{cv.tableHead.spend}</th><th>{cv.tableHead.payments}</th><th>{cv.tableHead.since}</th><th><span className="sr-only">{t.dash.common.actions}</span></th></tr></thead>
            <tbody>{!error && pg.slice.map((c) => {
              const wallets = walletsOf(c);
              return (
                <tr key={c.id} className="row-click" onClick={() => open(c)}>
                  {canManage && <SelectCell sel={sel} id={c.id} name={nameOfCust(c)} />}
                  <td className="tid">
                    <div className="cust-cell">
                      <span className="av-sm">{(c.alias || c.name || "?").slice(0, 2).toUpperCase()}</span>
                      <RecordLink
                        onOpen={() => open(c)} copy={c.id}
                        preview={() => <PreviewCard label={cv.tableHead.name} title={c.id} headline={<b>{c.alias || c.name}</b>} fields={[[cv.tableHead.email, c.email || "-"], [cv.tableHead.wallets, wallets.length ? wallets.map((w) => `${CHAIN_NAMES[w.chain] || w.chain} ${shortAcct(w.address)}`).join(", ") : "-"], [cv.tableHead.spend, c.total || "0"], [cv.tableHead.payments, `${c.succeeded ?? 0}/${c.payments ?? 0}`], [cv.tableHead.since, fmtDate(c.createdAt)]]} />}
                      >{c.alias || c.name}</RecordLink>
                    </div>
                  </td>
                  <td className="cust"><WalletStack wallets={wallets} count={cv.walletsCount} /></td>
                  <td className="cust">{c.email || "-"}</td>
                  <td className="amt">{c.total || "0"}</td>
                  <td className="cust">{c.payments ? <button type="button" className="link-btn" onClick={(e) => { e.stopPropagation(); paymentsOf(c); }}>{c.succeeded ?? 0}/{c.payments}</button> : `${c.succeeded ?? 0}/${c.payments ?? 0}`}</td>
                  <td className="cust">{fmtDate(c.createdAt)}</td>
                  <td className="row-actions" onClick={(e) => e.stopPropagation()}>
                    <button className="icon-mini" title={t.dash.common.details} aria-label={`${t.dash.common.details}: ${c.alias || c.name}`} onClick={() => open(c)}>{DI.docs}</button>
                    {canManage && <button className="icon-mini" title={cx.custDetail.edit} aria-label={`${cx.custDetail.edit}: ${c.alias || c.name}`} onClick={() => open(c, true)}>{DI.edit}</button>}
                    {canManage && <button className="icon-mini danger" title={cx.delete} aria-label={`${cx.delete}: ${c.alias || c.name}`} onClick={() => setToDelete(c)}>{DI.trash}</button>}
                    <RowMenu
                      label={fmt(t.dash.common.rowActions, { name: c.alias || c.name || c.id })}
                      items={[
                        { key: "open", label: t.dash.common.details, icon: DI.docs, onClick: () => open(c) },
                        ...(canManage ? [
                          { key: "edit", label: cx.custDetail.edit, icon: DI.edit, onClick: () => open(c, true) },
                          { key: "wallet", label: cx.custDetail.addWallet, icon: DI.plus, disabled: wallets.length >= MAX_WALLETS, onClick: () => open(c) },
                        ] : []),
                        { key: "copy", label: t.dash.common.copyId, icon: <IcCopy />, onClick: () => navigator.clipboard?.writeText(c.id).then(() => showToast(t.toasts.copied)).catch(() => {}) },
                        { key: "payments", label: t.dash.overview.hub.viewAll, icon: DI.payments, disabled: !c.payments, hint: wallets.length ? cx.custDetail.noPayments : cx.custDetail.noAccount, onClick: () => paymentsOf(c) },
                        ...(canManage ? [{ key: "delete", label: cx.delete, icon: DI.trash, danger: true, onClick: () => setToDelete(c) }] : []),
                      ]}
                    />
                  </td>
                </tr>
              );
            })}
              <FillRows
                n={pg.size - (error ? 0 : pg.count)} cols={canManage ? 8 : 7}
                empty={error ? cx.loadError : null}
              />
            </tbody>
          </table></div>
        )}
        {loading && <TableSkeleton label={cx.loading} cols={7} />}
        {!loading && <Pagination {...pg} />}
      </div>
      {modal && <CustomerFormModal cv={cv} cx={cx} env={env} orgId={orgId} onClose={() => setModal(false)} onSaved={onCreated} />}
      {bulk.dialog}
      {toDelete && <ConfirmModal title={cv.deleteTitle} body={fmt(cv.deleteBody, { name: toDelete.alias || toDelete.name })} confirmLabel={cx.delete} cancelLabel={t.dash.common.cancel} onConfirm={confirmDelete} onClose={() => { if (!deleting) setToDelete(null); }} />}
      {detail && <CustomerDetailModal key={detail.id} cv={cv} cx={cx} customer={detail} startEditing={editing} env={env} orgId={orgId} canManage={canManage} onClose={() => { setDetail(null); setEditing(false); }} onUpdated={onUpdated} onDelete={() => setToDelete(detail)} onOpenPayment={(id) => { setDetail(null); openRecord("payment", id); }} />}
    </>
  );
}

/* One wallet being written: its network, its address on that network and an optional name. The
   address is checked against the chosen network as it is typed. */
function WalletInputs({ row, onChange, onRemove, cd, autoFocus = false }) {
  const invalid = row.address.trim() !== "" && !isAddress(row.chain, row.address);
  return (
    <li className="cust-wallet-row">
      <Select value={row.chain} onChange={(chain) => onChange({ ...row, chain })} options={CHAIN_OPTIONS} label={cd.network} />
      <input
        className="field cust-wallet-addr" value={row.address} onChange={(e) => onChange({ ...row, address: e.target.value })}
        placeholder={cd.accountPlaceholder} aria-label={cd.account} aria-invalid={invalid || undefined} spellCheck={false} autoComplete="off" autoFocus={autoFocus}
      />
      <input className="field" value={row.label} maxLength={60} onChange={(e) => onChange({ ...row, label: e.target.value })} placeholder={cd.walletLabelPlaceholder} aria-label={cd.walletLabel} />
      {onRemove
        ? <button type="button" className="icon-mini danger" title={cd.removeWallet} aria-label={cd.removeWallet} onClick={onRemove}>{DI.trash}</button>
        : <span aria-hidden="true" />}
      {invalid && <p className="field-err cust-wallet-err" role="alert">{fmt(cd.invalidAddress, { network: CHAIN_NAMES[row.chain] })}</p>}
    </li>
  );
}

const walletReady = (row) => row.address.trim() !== "" && isAddress(row.chain, row.address);
const walletBody = (row) => ({ chain: row.chain, address: row.address.trim(), ...(row.label.trim() ? { label: row.label.trim() } : {}) });

/* Create form: the customer and the wallets they pay from, on any network. */
function CustomerFormModal({ cv, cx, env, orgId, onClose, onSaved }) {
  const t = useT();
  const m = cv.modal;
  const cd = cx.custDetail;
  const [name, setName] = useState("");
  const [alias, setAlias] = useState("");
  const [email, setEmail] = useState("");
  const [wallets, setWallets] = useState([newWalletRow()]);
  const [busy, setBusy] = useState(false);
  const filled = wallets.filter((w) => w.address.trim() !== "");
  const valid = filled.every(walletReady);
  const setRow = (key) => (next) => setWallets((ws) => ws.map((w) => (w.key === key ? next : w)));
  const submit = () => {
    if (!name.trim() || !valid || busy) return;
    setBusy(true);
    custApi.create(env, orgId, { name: name.trim(), ...(alias.trim() ? { alias: alias.trim() } : {}), ...(email.trim() ? { email: email.trim() } : {}), ...(filled.length ? { wallets: filled.map(walletBody) } : {}) })
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
        <Field label={cd.alias} hint={t.dash.common.optional} value={alias} onChange={(e) => setAlias(e.target.value)} placeholder={t.dash.examples.customerName} />
        <Field label={m.email} hint={t.dash.common.optional} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="billing@acme.com" />
        <div className="fld">
          <span className="field-l">{m.wallets}</span>
          <ul className="cust-wallet-rows" role="list">
            {wallets.map((w) => (
              <WalletInputs key={w.key} row={w} cd={cd} onChange={setRow(w.key)} onRemove={wallets.length > 1 ? () => setWallets((ws) => ws.filter((x) => x.key !== w.key)) : null} />
            ))}
          </ul>
          {wallets.length < MAX_WALLETS && (
            <button type="button" className="link-btn cust-wallet-more" onClick={() => setWallets((ws) => [...ws, newWalletRow()])}>{DI.plus} {m.addAnother}</button>
          )}
          <p className="field-help">{m.walletsHint}</p>
        </div>
        <div className="modal-actions">
          <button className="btn btn-violet" disabled={!name.trim() || !valid || busy} onClick={submit}>{m.add}</button>
          <button className="btn btn-soft" onClick={onClose}>{t.dash.common.cancel}</button>
        </div>
      </div>
    </Modal>
  );
}

/* Drill-down: editable info, the customer's wallets (added and removed one at a time), and the
   payments any of them made. */
function CustomerDetailModal({ cv, cx, customer, startEditing = false, env, orgId, canManage, onClose, onUpdated, onDelete, onOpenPayment }) {
  const t = useT();
  const cd = cx.custDetail;
  const m = cv.modal;
  const [edit, setEdit] = useState(startEditing && canManage);
  const [busy, setBusy] = useState(false);
  const [pays, setPays] = useState(null);
  const [form, setForm] = useState({ name: customer.name || "", alias: customer.alias || "", email: customer.email || "", reference: customer.reference || "", note: customer.note || "" });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const wallets = walletsOf(customer);
  const addresses = wallets.map((w) => w.address).join(",");

  // The customer's payments = intents whose payer is one of their wallets.
  useEffect(() => {
    if (!wallets.length) { setPays([]); return; }
    let alive = true;
    const mine = new Set(wallets.map((w) => w.address));
    payApi.list(env, { take: 100 })
      .then((res) => { if (alive) setPays((Array.isArray(res?.data) ? res.data : []).filter((p) => mine.has(p.source))); })
      .catch(() => { if (alive) setPays([]); });
    return () => { alive = false; };
  }, [addresses, env]);

  const changeWallets = (next) => onUpdated({ ...customer, wallets: next, account: next[0]?.address ?? null });
  const save = () => {
    if (!form.name.trim() || busy) return;
    setBusy(true);
    custApi.update(customer.id, env, orgId, { name: form.name.trim(), alias: form.alias.trim(), email: form.email.trim(), reference: form.reference.trim(), note: form.note.trim() })
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
            <Field label={cd.note} hint={t.dash.common.optional} value={form.note} onChange={set("note")} />
            <div className="modal-actions">
              <button className="btn btn-violet" disabled={!form.name.trim() || busy} onClick={save}>{cd.save}</button>
              <button className="btn btn-soft" onClick={() => setEdit(false)}>{t.dash.common.cancel}</button>
            </div>
          </>
        ) : (
          <>
            <div className="paylink-fields" style={{ marginBottom: 18 }}>
              {[[m.name, customer.name], [cd.alias, customer.alias], [m.email, customer.email], [cd.note, customer.note], [cv.tableHead.spend, customer.total], [cv.tableHead.payments, `${customer.succeeded ?? 0}/${customer.payments ?? 0}`]]
                .filter(([, v]) => v !== null && v !== undefined && v !== "")
                .map(([k, v]) => (<div className="paylink-field" key={k}><span className="pf-k">{k}</span><span className="pf-v">{String(v)}</span></div>))}
            </div>
            <div className="paylink-actions" style={{ marginBottom: 18 }}>
              {canManage && <button className="btn btn-dark btn-sm" onClick={() => setEdit(true)}>{DI.edit} {cd.edit}</button>}
              {canManage && <button className="btn btn-soft danger-soft" onClick={onDelete}>{DI.trash} {cx.delete}</button>}
            </div>

            <CustomerWallets customer={customer} wallets={wallets} env={env} orgId={orgId} canManage={canManage} onChange={changeWallets} />

            <div className="cust-pays-head">
              <label className="field-l">{cd.payments}</label>
            </div>
            {pays === null && <TableSkeleton label={cx.loading} />}
            {/* Payments are matched by the wallets that paid. No payments is empty rows: no "nothing
                here" text anywhere (product owner, 2026-10-27). */}
            {pays !== null && (
              <div className="t-scroll" tabIndex={0}><table className="tx"><tbody>
                {pays.length === 0 && <FillRows n={3} cols={4} />}
                {pays.map((p) => (
                  <tr key={p.id} className="row-click" tabIndex={0} onClick={() => onOpenPayment(p.id)} onKeyDown={(e) => { if (e.key === "Enter") onOpenPayment(p.id); }}>
                    <td className="tid"><RecordLink href={recordHref("payment", p.id)} onOpen={() => onOpenPayment(p.id)} copy={p.id} preview={() => <PaymentPreview p={p} />} title={p.id}><code>{shortAddress(p.id)}</code></RecordLink></td>
                    <td className="amt">{p.amount || "-"} {assetLabel(isChain(p.chain) ? p.chain : "stellar", p.asset)}</td>
                    <td><Pill st={STATUS_PILL[p.status] || "ref"} tone={paymentTone(p.status)} label={(t.dash.paylinks.status && t.dash.paylinks.status[p.status]) || p.status} /></td>
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

/* The customer's wallets, one row each: its network, its address (to the explorer), the payments it
   made (opening them in Payments), and removing it; under them, adding one. */
function CustomerWallets({ customer, wallets, env, orgId, canManage, onChange }) {
  const t = useT();
  const cd = t.dash.cosmos.custDetail;
  const cv = t.dash.customers;
  const [row, setRow] = useState(null);
  const [busy, setBusy] = useState(false);
  const [toRemove, setToRemove] = useState(null);

  const add = () => {
    if (!row || !walletReady(row) || busy) return;
    setBusy(true);
    custApi.addWallet(customer.id, env, orgId, walletBody(row))
      .then((w) => { onChange([...wallets.filter((x) => x.id !== w.id), w]); setRow(null); })
      .catch((e) => showToast((e && e.message) || cd.addWallet, "error"))
      .finally(() => setBusy(false));
  };
  // Removing a wallet is confirmed first, as every delete is.
  const confirmRemove = () => {
    const w = toRemove;
    if (!w || busy) return;
    setBusy(true);
    custApi.removeWallet(customer.id, w.id, env, orgId)
      .then(() => { onChange(wallets.filter((x) => x.id !== w.id)); setToRemove(null); })
      .catch((e) => showToast((e && e.message) || cd.removeWallet, "error"))
      .finally(() => setBusy(false));
  };

  return (
    <section className="cust-wallets-panel" aria-label={cd.wallets}>
      <div className="cust-pays-head">
        <span className="field-l">{cd.wallets}</span>
        {canManage && !row && wallets.length < MAX_WALLETS && (
          <button type="button" className="link-btn" onClick={() => setRow(newWalletRow())}>{DI.plus} {cd.addWallet}</button>
        )}
      </div>
      {(wallets.length > 0 || !row) && (
        <div className="t-scroll" tabIndex={0}><table className="tx"><thead><tr><th>{cd.network}</th><th>{cd.account}</th><th><span className="sr-only">{t.dash.common.actions}</span></th></tr></thead><tbody>
          {wallets.length === 0 && <FillRows n={2} cols={3} />}
          {wallets.map((w) => {
            return (
              <tr key={w.id}>
                <td><span className="cust-cell"><NetworkMark chain={w.chain} size={24} /><span>{w.label || CHAIN_NAMES[w.chain] || w.chain}{w.label && <small className="cust-wallet-net">{CHAIN_NAMES[w.chain] || w.chain}</small>}</span></span></td>
                <td className="cust"><AddressLink chain={w.chain} network={networkOf(env)} address={w.address} label={cd.account} /></td>
                <td className="row-actions">
                  {canManage && <button type="button" className="icon-mini danger" title={cd.removeWallet} aria-label={`${cd.removeWallet}: ${shortAcct(w.address)}`} onClick={() => setToRemove(w)}>{DI.trash}</button>}
                </td>
              </tr>
            );
          })}
        </tbody></table></div>
      )}
      {row && (
        <div className="cust-wallet-add">
          <ul className="cust-wallet-rows" role="list">
            <WalletInputs row={row} cd={cd} onChange={setRow} onRemove={null} autoFocus />
          </ul>
          <div className="modal-actions">
            <button type="button" className="btn btn-dark btn-sm" disabled={!walletReady(row) || busy} onClick={add}>{cd.addWallet}</button>
            <button type="button" className="btn btn-soft btn-sm" onClick={() => setRow(null)}>{t.dash.common.cancel}</button>
          </div>
        </div>
      )}
      {toRemove && <ConfirmModal title={cv.removeWalletTitle} body={fmt(cv.removeWalletBody, { account: shortAcct(toRemove.address), name: customer.alias || customer.name })} confirmLabel={cd.removeWallet} cancelLabel={t.dash.common.cancel} onConfirm={confirmRemove} onClose={() => { if (!busy) setToRemove(null); }} />}
    </section>
  );
}
