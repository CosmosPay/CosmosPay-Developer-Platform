/* P2pMethodsView: the accounts the organization's merchant wallets are paid into (a CBU, CVU or
   alias in Argentina, a PIX key in Brazil, a CLABE in Mexico, a bank account elsewhere), one per
   rail. A buyer matched to a sale offer sees the one for the rail it pays with; the Payments API
   keeps the details encrypted. Every field is checked as it is typed, with the rail's own rules
   (src/lib/p2p/rails.ts: check digits included), before anything is sent. */
import { useEffect, useMemo, useRef, useState } from "react";
import { useT, useLang, fmt } from "@/lib/i18n/index";
import { Modal, showToast } from "@/components/cosmos/shared";
import { ConfirmModal } from "@/components/cosmos/ui/ConfirmModal";
import { IcCopy } from "@/components/cosmos/icons";
import { DI } from "@/components/cosmos/dashboard/icons";
import { fmtDate, fmtWhen } from "@/components/cosmos/dashboard/helpers";
import { usePaged, useGsapRows, useListFilters, useUrlRequest } from "@/components/cosmos/dashboard/hooks";
import { ViewHead } from "@/components/cosmos/dashboard/components/ViewHead";
import { ViewFigures } from "@/components/cosmos/dashboard/components/ActivityPanel";
import { FilterBar } from "@/components/cosmos/dashboard/components/FilterBar";
import { TableSkeleton } from "@/components/cosmos/dashboard/components/Skeleton";
import { FillRows } from "@/components/cosmos/dashboard/components/FillRows";
import { Pagination } from "@/components/cosmos/dashboard/components/Pagination";
import { RowMenu } from "@/components/cosmos/dashboard/components/RowMenu";
import { RecordLink } from "@/components/cosmos/dashboard/components/RecordLink";
import { PreviewCard } from "@/components/cosmos/dashboard/components/RecordPreview";
import { Pill } from "@/components/cosmos/dashboard/components/Pill";
import { StatusIcon } from "@/components/cosmos/dashboard/components/StatusIcon";
import { Field } from "@/components/cosmos/dashboard/components/Field";
import { Select } from "@/components/cosmos/dashboard/components/Select";
import { CurrencyMark, currencyName } from "@/components/cosmos/dashboard/components/RampWidget";
import { FormSteps, FormStep, FormStepsFooter, useFormSteps } from "@/components/cosmos/dashboard/components/FormSteps";
import { BulkActions, SelectCell, SelectHead, useBulkDelete, useSelection } from "@/components/cosmos/dashboard/components/BulkSelect";
import { countBy, matchesQuery } from "@/lib/dashboard-filters";
import { RAILS, checkAccount, isRailId, normalizeDetails, type FieldKind, type RailField } from "@/lib/p2p/rails";
import type { P2pAccount, P2pMarket, P2pPaymentMethod } from "@/lib/p2p/types";
import { p2pApi, useP2pMarket, useP2pList, accountName, railName, fieldErrorText, Check, accountOptions } from "@/components/cosmos/dashboard/p2p/shared";

/** The account as one line: the rail's main field (an alias reads better than a CBU). */
export function accountSummary(t: any, rail: string, details: Record<string, string>, summary?: string): string {
  if (summary) return summary;
  if (details.alias) return details.alias;
  if (details.key) return details.key;
  const first = isRailId(rail) ? RAILS[rail].fields.find((f) => details[f.key] && !f.options) : null;
  const v = first ? details[first.key] : Object.values(details)[0] ?? "";
  return v.length > 12 ? `${v.slice(0, 4)}…${v.slice(-4)}` : v;
}

export function P2pMethodsView({ canManage = false, orgId, env = "dev" }: { canManage?: boolean; orgId: string; env?: string }) {
  const t = useT();
  const lang = useLang();
  const p = t.p2p.methods;
  const cm = t.dash.common;
  const fl = t.dash.filters;
  const market = useP2pMarket(env, orgId);
  const methods = useP2pList<P2pPaymentMethod>("payment-methods", env, orgId);
  const accounts = useP2pList<P2pAccount>("accounts", env, orgId);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<P2pPaymentMethod | null>(null);
  const [toDelete, setToDelete] = useState<P2pPaymentMethod | null>(null);

  const [createReq, clearCreate] = useUrlRequest("create");
  useEffect(() => { if (createReq) { clearCreate(); if (canManage) setCreating(true); } /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [createReq]);

  const rows = methods.rows;
  const defaults = useMemo(() => ({ q: "", status: "all", currency: "all" }), []);
  const { filters, set, reset, active } = useListFilters(defaults, { status: ["all", "active", "inactive"] });
  const acc = (id: string) => accounts.rows.find((a) => a.id === id) ?? null;
  const nameOf = (m: P2pPaymentMethod) => m.label || `${railName(t, m.rail)} · ${m.currency}`;
  const match = (m: P2pPaymentMethod, skip?: string) =>
    (skip === "status" || filters.status === "all" || (m.active ? "active" : "inactive") === filters.status) &&
    (skip === "currency" || filters.currency === "all" || m.currency === filters.currency) &&
    matchesQuery([m.label, m.holderName, m.currency, railName(t, m.rail), accountName(acc(m.accountId)), ...Object.values(m.details)], filters.q);
  const view = rows.filter((m) => match(m));
  const stCounts = countBy(rows.filter((m) => match(m, "status")), (m) => (m.active ? "active" : "inactive"));
  const curCounts = countBy(rows.filter((m) => match(m, "currency")), (m) => m.currency);
  const currencies = [...new Set([...(market?.currencies ?? []).map((c) => c.code), ...rows.map((m) => m.currency)])];
  const pg = usePaged(view, JSON.stringify(filters));
  const tref = useRef(null); useGsapRows(tref, pg.page + "|" + view.length);
  const sel = useSelection(canManage ? view.map((m) => m.id) : []);
  const bulk = useBulkDelete({
    sel, nameOf: (id) => { const m = rows.find((x) => x.id === id); return m ? nameOf(m) : id; },
    remove: (id) => p2pApi.remove(`payment-methods/${encodeURIComponent(id)}`, env, orgId),
    onRemoved: (ids) => methods.setRows((x) => x.filter((m) => !ids.includes(m.id))),
  });
  const toggle = (m: P2pPaymentMethod) => p2pApi.patch(`payment-methods/${encodeURIComponent(m.id)}`, env, orgId, { active: !m.active })
    .then((u) => { methods.setRows((x) => x.map((y) => (y.id === m.id ? { ...y, ...u } : y))); showToast(m.active ? p.deactivated : p.activated); })
    .catch((e) => showToast(e?.message || p.saveFailed, "error"));
  const remove = () => {
    const m = toDelete;
    if (!m) return;
    p2pApi.remove(`payment-methods/${encodeURIComponent(m.id)}`, env, orgId)
      .then(() => { methods.setRows((x) => x.filter((y) => y.id !== m.id)); setToDelete(null); setEditing(null); showToast(p.deleted); })
      .catch((e) => { setToDelete(null); showToast(e?.message || p.deleteFailed, "error"); });
  };
  const loading = methods.loading;

  return (
    <>
      <ViewHead title={p.title} />
      <ViewFigures
        label={p.figuresLabel} loading={loading} failed={methods.error}
        items={[
          { key: "methods", label: p.figures.methods, value: rows.length },
          { key: "active", label: p.figures.active, value: rows.filter((m) => m.active).length },
          { key: "currencies", label: p.figures.currencies, value: new Set(rows.map((m) => m.currency)).size },
          { key: "wallets", label: p.figures.wallets, value: new Set(rows.map((m) => m.accountId)).size },
        ]}
      />
      {!canManage && <div className="note-bar" style={{ marginBottom: 16 }}>{DI.key}<span>{p.readOnly}</span></div>}
      <FilterBar
        label={fl.label}
        query={filters.q} onQuery={(v) => set("q", v)} placeholder={p.search}
        status={{
          label: fl.status, value: filters.status, onChange: (v) => set("status", v),
          options: [
            { key: "all", label: fl.allStatuses, count: rows.filter((m) => match(m, "status")).length },
            { key: "active", label: p.active, count: stCounts.active || 0, icon: <StatusIcon tone="ok" size={16} /> },
            { key: "inactive", label: p.inactive, count: stCounts.inactive || 0, icon: <StatusIcon tone="off" size={16} /> },
          ],
        }}
        selects={[{ key: "currency", label: t.p2p.offers.currency, value: filters.currency, onChange: (v) => set("currency", v), options: [{ key: "all", label: t.p2p.offers.allCurrencies }, ...currencies.map((c) => ({ key: c, label: `${currencyName(c, lang)} (${c})`, icon: <CurrencyMark id={c} size={18} />, count: curCounts[c] || 0 }))] }]}
        active={active} onReset={reset}
        shown={view.length} total={loading ? undefined : rows.length} loading={loading}
        actions={canManage && (sel.count ? <BulkActions sel={sel} onDelete={bulk.ask} busy={bulk.busy} /> : (
          <button type="button" className="btn btn-dark btn-sm" onClick={() => setCreating(true)} disabled={!market || !accounts.rows.length} title={!accounts.rows.length ? t.p2p.liquidity.bots.needWallet : undefined}>{DI.plus} {p.create}</button>
        ))}
      />
      <div className="panel">
        {loading && <TableSkeleton label={p.loading} cols={6} />}
        {!loading && (
          <div className="t-scroll" tabIndex={0} ref={tref}><table className="tx p2p-t"><thead><tr>
            {canManage && <SelectHead sel={sel} pageIds={pg.slice.map((m) => m.id)} />}
            <th>{p.head.method}</th><th>{p.head.account}</th><th>{p.head.holder}</th><th>{p.head.wallet}</th><th>{p.head.status}</th><th>{p.head.created}</th>
            <th><span className="sr-only">{cm.actions}</span></th>
          </tr></thead>
            <tbody>{!methods.error && pg.slice.map((m) => (
              <tr key={m.id} className="row-click" onClick={() => setEditing(m)}>
                {canManage && <SelectCell sel={sel} id={m.id} name={nameOf(m)} />}
                <td className="tid" onClick={(e) => e.stopPropagation()}>
                  <span className="cell-mark">
                    <CurrencyMark id={m.currency} size={22} />
                    <RecordLink onOpen={() => setEditing(m)} copy={m.id} title={m.id}
                      preview={() => <PreviewCard label={p.head.method} title={m.id} headline={<b>{nameOf(m)}</b>} fields={[[p.head.holder, m.holderName], [p.head.account, accountSummary(t, m.rail, m.details, m.summary)], [p.head.wallet, accountName(acc(m.accountId))]]} />}
                    >{nameOf(m)}</RecordLink>
                  </span>
                </td>
                <td className="cust"><code>{accountSummary(t, m.rail, m.details, m.summary)}</code></td>
                <td className="cust">{m.holderName}</td>
                <td className="cust">{accountName(acc(m.accountId))}</td>
                <td><Pill st={m.active ? "ok" : "ref"} tone={m.active ? "ok" : "off"} label={m.active ? p.active : p.inactive} /></td>
                <td className="cust">{fmtWhen(m.createdAt)}</td>
                <td className="row-actions" onClick={(e) => e.stopPropagation()}>
                  <button type="button" className="icon-mini" title={canManage ? p.edit : cm.details} aria-label={`${canManage ? p.edit : cm.details}: ${nameOf(m)}`} onClick={() => setEditing(m)}>{canManage ? DI.edit : DI.docs}</button>
                  {canManage && <button type="button" className="icon-mini danger" title={p.delete} aria-label={`${p.delete}: ${nameOf(m)}`} onClick={() => setToDelete(m)}>{DI.trash}</button>}
                  <RowMenu label={fmt(cm.rowActions, { name: nameOf(m) })} items={[
                    { key: "open", label: canManage ? p.edit : cm.details, icon: canManage ? DI.edit : DI.docs, onClick: () => setEditing(m) },
                    ...(canManage ? [{ key: "toggle", label: m.active ? p.deactivate : p.activate, icon: DI.refresh, onClick: () => toggle(m) }] : []),
                    { key: "copy", label: cm.copyId, icon: <IcCopy />, onClick: () => navigator.clipboard?.writeText(m.id).then(() => showToast(t.toasts.copied)).catch(() => {}) },
                    ...(canManage ? [{ key: "delete", label: p.delete, icon: DI.trash, danger: true, onClick: () => setToDelete(m) }] : []),
                  ]} />
                </td>
              </tr>
            ))}
              <FillRows n={pg.size - (methods.error ? 0 : pg.count)} cols={canManage ? 8 : 7} empty={methods.error ? p.listError : null} />
            </tbody>
          </table></div>
        )}
        {!loading && <Pagination {...pg} />}
      </div>
      {creating && market && (
        <MethodModal market={market} accounts={accounts.rows} env={env} orgId={orgId} onClose={() => setCreating(false)}
          onSaved={(m) => { methods.setRows((x) => [m, ...x]); setCreating(false); showToast(p.created); }} />
      )}
      {editing && market && (
        <MethodModal market={market} accounts={accounts.rows} env={env} orgId={orgId} method={editing} canManage={canManage} onClose={() => setEditing(null)}
          onSaved={(m) => { methods.setRows((x) => x.map((y) => (y.id === m.id ? { ...y, ...m } : y))); setEditing(null); showToast(p.saved); }}
          onDelete={() => setToDelete(editing)} />
      )}
      {bulk.dialog}
      {toDelete && <ConfirmModal title={p.deleteTitle} body={fmt(p.deleteBody, { name: nameOf(toDelete) })} confirmLabel={p.delete} cancelLabel={cm.cancel} onConfirm={remove} onClose={() => setToDelete(null)} />}
    </>
  );
}

/** A rail's account fields with their checks, shown under each field once it is touched. Also
    used by the payouts' beneficiary preview. */
export function RailFields({ rail, holderName, details, onChange, disabled = false, showAll = false }: {
  rail: string; holderName: string; details: Record<string, string>;
  onChange: (patch: { holderName?: string; details?: Record<string, string> }) => void;
  disabled?: boolean; showAll?: boolean;
}) {
  const t = useT();
  const fx = t.p2p.fields;
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const errors = checkAccount(rail, { holderName, details });
  const shown = (key: string) => (showAll || touched[key]) && errors[key];
  const touch = (key: string) => setTouched((x) => ({ ...x, [key]: true }));
  const known = isRailId(rail) ? RAILS[rail] : null;
  const fields: RailField[] = known ? [...known.fields] : Object.keys(details).map((key) => ({ key, kind: "text" as FieldKind }));
  const field = (f: RailField) => {
    const err = shown(f.key) ? fieldErrorText(t, f.kind, errors[f.key]) : "";
    if (f.options) {
      return (
        <div className="fld" key={f.key}>
          <span className="field-l" id={`p2p-rf-${f.key}`}>{fx[f.kind]}</span>
          <Select value={details[f.key] ?? ""} onChange={(v) => onChange({ details: { ...details, [f.key]: v } })} labelledBy={`p2p-rf-${f.key}`} disabled={disabled}
            options={f.options.map((o) => ({ value: o, label: t.p2p.options[f.kind]?.[o] ?? o }))} placeholder={t.ui.select} />
          {err && <p className="field-err" role="alert">{err}</p>}
        </div>
      );
    }
    const hint = f.oneOf ? t.p2p.hints.oneOf : t.p2p.hints[f.kind];
    return (
      <div key={f.key}>
        <Field label={fx[f.kind]} hint={hint} value={details[f.key] ?? ""} disabled={disabled} spellCheck={false} autoComplete="off"
          placeholder={t.p2p.placeholders[f.kind] ?? ""} onBlur={() => touch(f.key)}
          onChange={(e) => onChange({ details: { ...details, [f.key]: e.target.value } })} aria-invalid={err ? true : undefined} />
        {err && <p className="field-err" role="alert">{err}</p>}
      </div>
    );
  };
  const holderErr = shown("holderName") ? fieldErrorText(t, "text", errors.holderName) : "";
  return (
    <>
      <Field label={fx.holderName} value={holderName} disabled={disabled} placeholder={t.p2p.placeholders.holderName} onBlur={() => touch("holderName")} onChange={(e) => onChange({ holderName: e.target.value })} aria-invalid={holderErr ? true : undefined} />
      {holderErr && <p className="field-err" role="alert">{holderErr}</p>}
      {fields.map(field)}
    </>
  );
}

/* Adding (two steps: the wallet and rail, then the account) or editing a payment method. */
function MethodModal({ market, accounts, env, orgId, method = null, canManage = true, onClose, onSaved, onDelete }: {
  market: P2pMarket; accounts: P2pAccount[]; env: string; orgId: string; method?: P2pPaymentMethod | null; canManage?: boolean;
  onClose: () => void; onSaved: (m: P2pPaymentMethod) => void; onDelete?: () => void;
}) {
  const t = useT();
  const lang = useLang();
  const p = t.p2p.methods;
  const f = p.form;
  const editing = !!method;
  const steps = useFormSteps(editing ? 1 : 2);
  const [accountId, setAccountId] = useState(method?.accountId ?? accounts.find((a) => a.merchant)?.id ?? accounts[0]?.id ?? "");
  const [currency, setCurrency] = useState(method?.currency ?? market.currencies[0]?.code ?? "");
  const railsOf = (c: string) => market.currencies.find((x) => x.code === c)?.rails ?? [];
  const [rail, setRail] = useState(method?.rail ?? railsOf(currency)[0] ?? "");
  const [label, setLabel] = useState(method?.label ?? "");
  const [holderName, setHolderName] = useState(method?.holderName ?? "");
  const [details, setDetails] = useState<Record<string, string>>(method?.details ?? (rail === "br_pix" ? { keyType: "email" } : {}));
  const [active, setActive] = useState(method?.active ?? true);
  const [busy, setBusy] = useState(false);
  const [tried, setTried] = useState(false);
  useEffect(() => { if (!editing && !railsOf(currency).includes(rail)) setRail(railsOf(currency)[0] ?? ""); }, [currency]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!editing) setDetails(rail === "br_pix" ? { keyType: "email" } : {}); }, [rail]); // eslint-disable-line react-hooks/exhaustive-deps
  const errors = checkAccount(rail, { holderName, details });
  const ok = Object.keys(errors).length === 0;
  const save = () => {
    setTried(true);
    if (!ok || busy) return;
    setBusy(true);
    // The holder's document travels among the details (a CUIT, a RUT...), as the server takes it.
    const body = { label: label.trim() || undefined, holderName: holderName.trim(), details: normalizeDetails(rail, details) };
    const req = editing
      ? p2pApi.patch(`payment-methods/${encodeURIComponent(method!.id)}`, env, orgId, { ...body, active })
      : p2pApi.post("payment-methods", env, orgId, { ...body, accountId, currency, rail });
    req.then(onSaved).catch((e) => showToast(e?.message || p.saveFailed, "error")).finally(() => setBusy(false));
  };
  const accountFields = (
    <>
      <RailFields rail={rail} holderName={holderName} details={details} disabled={!canManage} showAll={tried}
        onChange={(x) => { if (x.holderName !== undefined) setHolderName(x.holderName); if (x.details) setDetails(x.details); }} />
      <Check checked={active} onChange={setActive} label={p.active} hint={f.activeHint} disabled={!canManage} />
    </>
  );
  return (
    <Modal onClose={() => { if (!busy) onClose(); }} label={editing ? p.edit : p.create}>
      <div className="modal-body">
        <div className="modal-eyebrow">{p.title}</div>
        <h3>{editing ? method!.label || `${railName(t, method!.rail)} · ${method!.currency}` : p.create}</h3>
        {editing ? (
          <>
            <div className="paylink-fields" style={{ marginBottom: 14 }}>
              {[[p.head.wallet, accountName(accounts.find((a) => a.id === method!.accountId))], [t.p2p.offers.currency, `${currencyName(method!.currency, lang)} (${method!.currency})`], [p.head.method, railName(t, method!.rail)]].map(([k, v]) => (
                <div className="paylink-field" key={k}><span className="pf-k">{k}</span><span className="pf-v">{v}</span></div>
              ))}
            </div>
            <Field label={f.label} hint={t.dash.common.optional} value={label} onChange={(e) => setLabel(e.target.value)} maxLength={40} disabled={!canManage} />
            {accountFields}
            <div className="modal-actions">
              {canManage && <button type="button" className="btn btn-violet" disabled={busy || (tried && !ok)} onClick={save}>{p.save}</button>}
              {canManage && onDelete && <button type="button" className="btn btn-soft danger-soft" onClick={onDelete}>{DI.trash} {p.delete}</button>}
              <button type="button" className="btn btn-soft" onClick={onClose}>{canManage ? t.dash.common.cancel : t.ui.close}</button>
            </div>
          </>
        ) : (
          <>
            <FormSteps names={[f.stepRail, f.stepAccount]} steps={steps} />
            <FormStep steps={steps}>
              {steps.step === 0 && (
                <>
                  <div className="fld">
                    <span className="field-l" id="p2p-pm-w">{p.head.wallet}</span>
                    <Select value={accountId} onChange={setAccountId} labelledBy="p2p-pm-w" options={accountOptions(accounts)} />
                  </div>
                  <div className="field-row">
                    <div className="fld">
                      <span className="field-l" id="p2p-pm-c">{t.p2p.offers.currency}</span>
                      <Select value={currency} onChange={setCurrency} labelledBy="p2p-pm-c" options={market.currencies.map((c) => ({ value: c.code, label: `${currencyName(c.code, lang)} (${c.code})`, icon: <CurrencyMark id={c.code} size={18} /> }))} />
                    </div>
                    <div className="fld">
                      <span className="field-l" id="p2p-pm-r">{p.head.method}</span>
                      <Select value={rail} onChange={setRail} labelledBy="p2p-pm-r" disabled={railsOf(currency).length < 2} options={railsOf(currency).map((r) => ({ value: r, label: railName(t, r) }))} />
                    </div>
                  </div>
                  <Field label={f.label} hint={f.labelHint} value={label} onChange={(e) => setLabel(e.target.value)} placeholder={f.labelPlaceholder} maxLength={40} />
                </>
              )}
              {steps.step === 1 && accountFields}
            </FormStep>
            <FormStepsFooter steps={steps} canNext={!!accountId && !!rail} onCancel={onClose} submitLabel={p.create} onSubmit={save} busy={busy} submitDisabled={tried && !ok} />
          </>
        )}
      </div>
    </Modal>
  );
}
