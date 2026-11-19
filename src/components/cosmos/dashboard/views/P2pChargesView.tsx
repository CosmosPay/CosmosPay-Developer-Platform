/* P2pChargesView: collections in local money that settle in stablecoins. A charge names an amount
   in a currency, the network and token it settles in and the registered wallet that receives it;
   its link opens the hosted payer page on the payments domain, where the payer gives their name,
   document and email, transfers to the merchant Cosmos Pay matched and reports it. The token
   arrives in the wallet once the merchant releases. Share it as a link or a QR code. */
import { useEffect, useMemo, useRef, useState } from "react";
import { useT, useLang, fmt } from "@/lib/i18n/index";
import { Modal, showToast } from "@/components/cosmos/shared";
import { ConfirmModal } from "@/components/cosmos/ui/ConfirmModal";
import { IcCopy } from "@/components/cosmos/icons";
import { DI } from "@/components/cosmos/dashboard/icons";
import { fmtDate, fmtDateTime, fmtWhen } from "@/components/cosmos/dashboard/helpers";
import { usePaged, useGsapRows, useListFilters, useUrlRequest } from "@/components/cosmos/dashboard/hooks";
import { useCopy } from "@/components/cosmos/hooks/useCopy";
import { ViewHead } from "@/components/cosmos/dashboard/components/ViewHead";
import { ViewFigures } from "@/components/cosmos/dashboard/components/ActivityPanel";
import { FilterBar } from "@/components/cosmos/dashboard/components/FilterBar";
import { TableSkeleton } from "@/components/cosmos/dashboard/components/Skeleton";
import { FillRows } from "@/components/cosmos/dashboard/components/FillRows";
import { Pagination } from "@/components/cosmos/dashboard/components/Pagination";
import { RowMenu } from "@/components/cosmos/dashboard/components/RowMenu";
import { RecordLink } from "@/components/cosmos/dashboard/components/RecordLink";
import { PreviewCard, shortAddress } from "@/components/cosmos/dashboard/components/RecordPreview";
import { Pill } from "@/components/cosmos/dashboard/components/Pill";
import { StatusIcon } from "@/components/cosmos/dashboard/components/StatusIcon";
import { Field } from "@/components/cosmos/dashboard/components/Field";
import { Select } from "@/components/cosmos/dashboard/components/Select";
import { CopyBlock } from "@/components/cosmos/dashboard/components/PayLinkDetail";
import { CurrencyMark, currencyName } from "@/components/cosmos/dashboard/components/RampWidget";
import { FormSteps, FormStep, FormStepsFooter, useFormSteps } from "@/components/cosmos/dashboard/components/FormSteps";
import { BulkActions, SelectCell, SelectHead, useBulkDelete, useSelection } from "@/components/cosmos/dashboard/components/BulkSelect";
import { countBy, inRange, matchesQuery, DATE_RANGES } from "@/lib/dashboard-filters";
import { parseFiat } from "@/lib/p2p/amounts";
import type { P2pAccount, P2pCharge, P2pChargeStatus, P2pMarket } from "@/lib/p2p/types";
import {
  p2pApi, useP2pMarket, useP2pList, networkOf, networkName, fiatText, P2pTokenMark, P2pAddress, Check, accountOptions, networkOptions,
} from "@/components/cosmos/dashboard/p2p/shared";

const STATES: P2pChargeStatus[] = ["open", "paid", "expired", "cancelled"];
/* A charge lasts 30 days at most (the server's limit); the longest choice stays a few minutes short of it. */
const EXPIRIES = ["1h", "24h", "7d", "30d"] as const;
const EXPIRY_MS: Record<string, number> = { "1h": 3_600_000, "24h": 86_400_000, "7d": 7 * 86_400_000, "30d": 30 * 86_400_000 - 10 * 60_000 };
/* Only a PNG data URL is drawn as the QR (what the Payments API answers). */
const PNG = /^data:image\/png;base64,[A-Za-z0-9+/=]+$/;
const tone = (s: string) => (s === "paid" ? "ok" : s === "open" ? "wait" : s === "expired" ? "fail" : "off");

export function P2pChargesView({ canManage = false, orgId, env = "dev", orgName = "" }: { canManage?: boolean; orgId: string; env?: string; orgName?: string }) {
  const t = useT();
  const lang = useLang();
  const p = t.p2p.charges;
  const cm = t.dash.common;
  const fl = t.dash.filters;
  const market = useP2pMarket(env, orgId);
  const charges = useP2pList<P2pCharge>("charges", env, orgId, 20_000);
  const accounts = useP2pList<P2pAccount>("accounts", env, orgId);
  const [creating, setCreating] = useState(false);
  const [share, setShare] = useState<P2pCharge | null>(null);
  const [toDelete, setToDelete] = useState<P2pCharge | null>(null);

  const [createReq, clearCreate] = useUrlRequest("create");
  useEffect(() => { if (createReq) { clearCreate(); if (canManage) setCreating(true); } /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [createReq]);
  const [openReq, clearOpen] = useUrlRequest("open");
  useEffect(() => {
    if (!openReq || charges.loading) return;
    clearOpen();
    const hit = charges.rows.find((c) => c.id === openReq);
    if (hit) setShare(hit); else showToast(cm.notFound, "error");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openReq, charges.loading]);

  const rows = charges.rows;
  const defaults = useMemo(() => ({ q: "", status: "all", currency: "all", date: "any" }), []);
  const { filters, set, reset, active } = useListFilters(defaults, { status: ["all", ...STATES], date: DATE_RANGES });
  const name = (c: P2pCharge) => c.description || fiatText(c.fiatAmount, c.currency, lang);
  const match = (c: P2pCharge, skip?: string) =>
    (skip === "status" || filters.status === "all" || c.status === filters.status) &&
    (skip === "currency" || filters.currency === "all" || c.currency === filters.currency) &&
    inRange(c.createdAt, filters.date) &&
    matchesQuery([c.id, c.description, c.fiatAmount, c.currency, c.token, c.recipient, networkName(market, c.network), p.state[c.status]], filters.q);
  const view = rows.filter((c) => match(c));
  const stCounts = countBy(rows.filter((c) => match(c, "status")), (c) => c.status);
  const curCounts = countBy(rows.filter((c) => match(c, "currency")), (c) => c.currency);
  const currencies = [...new Set([...(market?.currencies ?? []).map((c) => c.code), ...rows.map((c) => c.currency)])];
  const pg = usePaged(view, JSON.stringify(filters));
  const tref = useRef(null); useGsapRows(tref, pg.page + "|" + view.length);
  const deletable = (c: P2pCharge) => c.status !== "paid";
  const sel = useSelection(canManage ? view.filter(deletable).map((c) => c.id) : []);
  const bulk = useBulkDelete({
    sel, nameOf: (id) => { const c = rows.find((x) => x.id === id); return c ? name(c) : id; },
    remove: (id) => p2pApi.remove(`charges/${encodeURIComponent(id)}`, env, orgId),
    onRemoved: (ids) => charges.setRows((x) => x.filter((c) => !ids.includes(c.id))),
  });
  const remove = () => {
    const c = toDelete;
    if (!c) return;
    p2pApi.remove(`charges/${encodeURIComponent(c.id)}`, env, orgId)
      .then(() => { charges.setRows((x) => x.filter((y) => y.id !== c.id)); setToDelete(null); setShare(null); showToast(p.deleted); })
      .catch((e) => { setToDelete(null); showToast(e?.message || p.deleteFailed, "error"); });
  };
  const copyLink = (c: P2pCharge) => navigator.clipboard?.writeText(c.url).then(() => showToast(t.toasts.copied)).catch(() => {});
  const loading = charges.loading;
  const week = Date.now() - 7 * 86_400_000;

  return (
    <>
      <ViewHead title={p.title} />
      <ViewFigures
        label={p.figuresLabel} loading={loading} failed={charges.error}
        items={[
          { key: "open", label: p.figures.open, value: rows.filter((c) => c.status === "open").length },
          { key: "paid", label: p.figures.paid, value: rows.filter((c) => c.status === "paid").length, sub: fmt(p.figures.paidWeek, { n: rows.filter((c) => c.status === "paid" && c.paidAt && Date.parse(c.paidAt) > week).length }) },
          { key: "multi", label: p.figures.reusable, value: rows.filter((c) => c.multiUse).length },
          { key: "expired", label: p.figures.expired, value: rows.filter((c) => c.status === "expired").length },
        ]}
      />
      {!canManage && <div className="note-bar" style={{ marginBottom: 16 }}>{DI.key}<span>{p.readOnly}</span></div>}
      <FilterBar
        label={fl.label}
        query={filters.q} onQuery={(v) => set("q", v)} placeholder={p.search}
        status={{
          label: fl.status, value: filters.status, onChange: (v) => set("status", v),
          options: [
            { key: "all", label: fl.allStatuses, count: rows.filter((c) => match(c, "status")).length },
            ...STATES.map((s) => ({ key: s, label: p.state[s], count: stCounts[s] || 0, icon: <StatusIcon tone={tone(s)} size={16} /> })),
          ],
        }}
        selects={[{ key: "currency", label: t.p2p.offers.currency, value: filters.currency, onChange: (v) => set("currency", v), options: [{ key: "all", label: t.p2p.offers.allCurrencies }, ...currencies.map((c) => ({ key: c, label: `${currencyName(c, lang)} (${c})`, icon: <CurrencyMark id={c} size={18} />, count: curCounts[c] || 0 }))] }]}
        date={filters.date} onDate={(v) => set("date", v)}
        active={active} onReset={reset}
        shown={view.length} total={loading ? undefined : rows.length} loading={loading}
        actions={canManage && (sel.count ? <BulkActions sel={sel} onDelete={bulk.ask} busy={bulk.busy} /> : (
          <button type="button" className="btn btn-dark btn-sm" onClick={() => setCreating(true)} disabled={!market || !accounts.rows.length} title={!accounts.rows.length ? t.p2p.liquidity.bots.needWallet : undefined}>{DI.plus} {p.create}</button>
        ))}
      />
      <div className="panel">
        {loading && <TableSkeleton label={p.loading} cols={7} />}
        {!loading && (
          <div className="t-scroll" tabIndex={0} ref={tref}><table className="tx p2p-t"><thead><tr>
            {canManage && <SelectHead sel={sel} pageIds={pg.slice.filter(deletable).map((c) => c.id)} />}
            <th>{p.head.charge}</th><th>{p.head.amount}</th><th>{p.head.settles}</th><th>{p.head.status}</th><th>{p.head.expires}</th><th>{p.head.created}</th>
            <th><span className="sr-only">{cm.actions}</span></th>
          </tr></thead>
            <tbody>{!charges.error && pg.slice.map((c) => (
              <tr key={c.id} className="row-click" onClick={() => setShare(c)}>
                {canManage && <SelectCell sel={sel} id={c.id} name={name(c)} disabled={!deletable(c)} hint={p.paidKept} />}
                <td className="tid" onClick={(e) => e.stopPropagation()}>
                  <div className="cust-cell">
                    <span className="am-sq">{DI.link}</span>
                    <RecordLink href={c.url} external onOpen={() => setShare(c)} copy={c.url} title={c.id}
                      preview={() => <PreviewCard label={p.head.charge} title={c.url} wrap headline={<><b>{fiatText(c.fiatAmount, c.currency, lang)}</b><Pill st={tone(c.status) === "ok" ? "ok" : tone(c.status) === "fail" ? "fail" : tone(c.status) === "off" ? "ref" : "pend"} tone={tone(c.status)} label={p.state[c.status]} /></>} fields={[[p.head.settles, `${c.token} · ${networkName(market, c.network)}`], [p.recipient, shortAddress(c.recipient)]]} />}
                    >{name(c)}</RecordLink>
                  </div>
                </td>
                <td className="amt"><span className="cell-mark"><CurrencyMark id={c.currency} size={20} /><span>{fiatText(c.fiatAmount, c.currency, lang)}</span></span></td>
                <td><span className="cell-mark"><P2pTokenMark market={market} network={c.network} symbol={c.token} size={20} /><span>{c.token}</span></span></td>
                <td><Pill st={tone(c.status) === "ok" ? "ok" : tone(c.status) === "fail" ? "fail" : tone(c.status) === "off" ? "ref" : "pend"} tone={tone(c.status)} label={`${p.state[c.status]}${c.multiUse ? ` · ${p.reusable}` : ""}`} /></td>
                <td className="cust">{c.expiresAt ? fmtDateTime(c.expiresAt) : p.noExpiry}</td>
                <td className="cust">{fmtWhen(c.createdAt)}</td>
                <td className="row-actions" onClick={(e) => e.stopPropagation()}>
                  <button type="button" className="icon-mini" title={p.share} aria-label={`${p.share}: ${name(c)}`} onClick={() => setShare(c)}>{DI.link}</button>
                  <button type="button" className="icon-mini" title={cm.copyLink} aria-label={`${cm.copyLink}: ${name(c)}`} onClick={() => copyLink(c)}><IcCopy /></button>
                  {canManage && <button type="button" className="icon-mini danger" disabled={!deletable(c)} title={deletable(c) ? p.delete : p.paidKept} aria-label={`${p.delete}: ${name(c)}`} onClick={() => setToDelete(c)}>{DI.trash}</button>}
                  <RowMenu label={fmt(cm.rowActions, { name: name(c) })} items={[
                    { key: "share", label: p.share, icon: DI.link, onClick: () => setShare(c) },
                    { key: "open", label: p.openPage, icon: DI.link, href: c.url, external: true },
                    { key: "link", label: cm.copyLink, icon: <IcCopy />, onClick: () => copyLink(c) },
                    { key: "copy", label: cm.copyId, icon: <IcCopy />, onClick: () => navigator.clipboard?.writeText(c.id).then(() => showToast(t.toasts.copied)).catch(() => {}) },
                    { key: "orders", label: p.viewOrders, icon: DI.p2p, href: `/dashboard?view=p2pOrders&q=${encodeURIComponent(c.id)}` },
                    ...(canManage ? [{ key: "delete", label: p.delete, icon: DI.trash, danger: true, disabled: !deletable(c), hint: p.paidKept, onClick: () => setToDelete(c) }] : []),
                  ]} />
                </td>
              </tr>
            ))}
              <FillRows n={pg.size - (charges.error ? 0 : pg.count)} cols={canManage ? 8 : 7} empty={charges.error ? p.listError : null} />
            </tbody>
          </table></div>
        )}
        {!loading && <Pagination {...pg} />}
      </div>
      {creating && market && (
        <ChargeModal market={market} accounts={accounts.rows} env={env} orgId={orgId} orgName={orgName} onClose={() => setCreating(false)}
          onCreated={(c) => { charges.setRows((x) => [c, ...x]); setCreating(false); setShare(c); showToast(p.created); }} />
      )}
      {share && <ShareCharge charge={share} market={market} canManage={canManage} onClose={() => setShare(null)} onDelete={() => setToDelete(share)} />}
      {bulk.dialog}
      {toDelete && <ConfirmModal title={p.deleteTitle} body={fmt(p.deleteBody, { name: name(toDelete) })} confirmLabel={p.delete} cancelLabel={cm.cancel} onConfirm={remove} onClose={() => setToDelete(null)} />}
    </>
  );
}

/* A charge to share: its link to copy or open, its QR code, and what it asks for. */
function ShareCharge({ charge: c, market, canManage, onClose, onDelete }: { charge: P2pCharge; market: P2pMarket | null | undefined; canManage: boolean; onClose: () => void; onDelete: () => void }) {
  const t = useT();
  const lang = useLang();
  const p = t.p2p.charges;
  const [, copy] = useCopy();
  return (
    <Modal onClose={onClose} label={p.share}>
      <div className="modal-body paylink-detail">
        <div className="modal-eyebrow">{p.head.charge} · {p.state[c.status]}</div>
        <h3>{fiatText(c.fiatAmount, c.currency, lang)}</h3>
        {c.status === "open" && c.qr && PNG.test(c.qr) && (
          <div className="paylink-qr-wrap">
            <img className="paylink-qr" src={c.qr} alt={p.qrAlt} width={200} height={200} />
            <div className="paylink-qr-cap">{p.scan}</div>
          </div>
        )}
        <CopyBlock label={p.link} value={c.url} />
        <div className="paylink-fields" style={{ margin: "14px 0" }}>
          {([
            [p.payee, c.payeeName],
            [p.description, c.description],
            [p.head.settles, <span className="cell-mark"><P2pTokenMark market={market} network={c.network} symbol={c.token} size={18} /><span>{`${c.token} · ${networkName(market, c.network)}`}</span></span>],
            [p.recipient, <P2pAddress market={market} network={c.network} address={c.recipient} label={p.recipient} />],
            [p.head.expires, c.expiresAt ? fmtDateTime(c.expiresAt) : p.noExpiry],
            [p.uses, c.multiUse ? p.reusable : p.singleUse],
            [p.paidAt, c.paidAt ? fmtDateTime(c.paidAt) : null],
            [p.head.created, fmtDateTime(c.createdAt)],
          ] as [string, any][]).filter(([, v]) => v).map(([k, v]) => <div className="paylink-field" key={k}><span className="pf-k">{k}</span><span className="pf-v">{v}</span></div>)}
        </div>
        <div className="paylink-actions">
          <a className="btn btn-dark btn-sm" href={c.url} target="_blank" rel="noopener noreferrer">{DI.link} {p.openPage}</a>
          <button type="button" className="btn btn-soft btn-sm" onClick={() => copy(c.url, t.toasts.copied)}><IcCopy /> {t.dash.common.copyLink}</button>
          {canManage && <button type="button" className="btn btn-soft danger-soft btn-sm" disabled={c.status === "paid"} title={c.status === "paid" ? p.paidKept : undefined} onClick={onDelete}>{DI.trash} {p.delete}</button>}
          <button type="button" className="btn btn-soft btn-sm" onClick={onClose}>{t.ui.close}</button>
        </div>
      </div>
    </Modal>
  );
}

/* Creating a charge: the amount and what it is for, then where it settles and for how long. */
/* The name the payer page shows, as the server takes it: 2 to 60 letters, digits, spaces and . , & ' ( ) - */
const PAYEE = /^[\p{L}\p{M}\p{N}][\p{L}\p{M}\p{N} .,&'()-]{1,59}$/u;

function ChargeModal({ market, accounts, env, orgId, orgName = "", onClose, onCreated }: { market: P2pMarket; accounts: P2pAccount[]; env: string; orgId: string; orgName?: string; onClose: () => void; onCreated: (c: P2pCharge) => void }) {
  const t = useT();
  const lang = useLang();
  const p = t.p2p.charges;
  const f = p.form;
  const fl = t.dash.filters;
  const steps = useFormSteps(2);
  const [currency, setCurrency] = useState(market.currencies[0]?.code ?? "");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [payeeName, setPayeeName] = useState(PAYEE.test(orgName.trim()) ? orgName.trim() : "");
  const [network, setNetwork] = useState(market.networks[0]?.id ?? "");
  const net = networkOf(market, network);
  const [token, setToken] = useState(net?.tokens[0]?.symbol ?? "");
  const [recipient, setRecipient] = useState(accounts[0]?.id ?? "");
  const [expiry, setExpiry] = useState<string>("7d");
  const [multiUse, setMultiUse] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (net && !net.tokens.some((x) => x.symbol === token)) setToken(net.tokens[0]?.symbol ?? ""); }, [network]); // eslint-disable-line react-hooks/exhaustive-deps
  const fiat = parseFiat(amount, currency);
  const payeeOk = PAYEE.test(payeeName.trim());
  const step1Ok = !!currency && fiat !== null && payeeOk;
  const step2Ok = !!net && !!token && !!recipient;
  const create = () => {
    if (!step1Ok || !step2Ok || busy) return;
    setBusy(true);
    p2pApi.post("charges", env, orgId, {
      currency, fiatAmount: fiat, network, token, recipient, payeeName: payeeName.trim(),
      description: description.trim() || undefined,
      expiresAt: new Date(Date.now() + EXPIRY_MS[expiry]).toISOString(),
      multiUse,
    })
      .then(onCreated)
      .catch((e) => showToast(e?.message || p.createFailed, "error"))
      .finally(() => setBusy(false));
  };
  return (
    <Modal onClose={() => { if (!busy) onClose(); }} label={p.create}>
      <div className="modal-body">
        <div className="modal-eyebrow">{p.title}</div>
        <h3>{p.create}</h3>
        <FormSteps names={[f.stepAmount, f.stepSettle]} steps={steps} />
        <FormStep steps={steps}>
          {steps.step === 0 && (
            <>
              <div className="field-row">
                <Field label={f.amount} value={amount} onChange={(e) => setAmount(e.target.value.trim().replace(",", "."))} inputMode="decimal" placeholder="85000" autoFocus aria-invalid={amount && fiat === null ? true : undefined} />
                <div className="fld">
                  <span className="field-l" id="p2p-ch-c">{t.p2p.offers.currency}</span>
                  <Select value={currency} onChange={setCurrency} labelledBy="p2p-ch-c" options={market.currencies.map((c) => ({ value: c.code, label: `${currencyName(c.code, lang)} (${c.code})`, icon: <CurrencyMark id={c.code} size={18} /> }))} />
                </div>
              </div>
              <Field label={f.payeeName} hint={f.payeeHint} value={payeeName} onChange={(e) => setPayeeName(e.target.value)} maxLength={60} placeholder={t.dash.examples.customerName} aria-invalid={payeeName && !payeeOk ? true : undefined} />
              <Field label={p.description} hint={f.descriptionHint} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={120} placeholder={t.dash.examples.order} />
            </>
          )}
          {steps.step === 1 && (
            <>
              <div className="field-row">
                <div className="fld">
                  <span className="field-l" id="p2p-ch-n">{fl.network}</span>
                  <Select value={network} onChange={setNetwork} labelledBy="p2p-ch-n" options={networkOptions(market)} />
                </div>
                <div className="fld">
                  <span className="field-l" id="p2p-ch-t">{t.p2p.offers.form.token}</span>
                  <Select value={token} onChange={setToken} labelledBy="p2p-ch-t" disabled={(net?.tokens.length ?? 0) < 2} options={(net?.tokens ?? []).map((x) => ({ value: x.symbol, label: x.symbol, icon: <P2pTokenMark market={market} network={network} symbol={x.symbol} size={18} /> }))} />
                </div>
              </div>
              <div className="fld">
                <span className="field-l" id="p2p-ch-r">{p.recipient}</span>
                <Select value={recipient} onChange={setRecipient} labelledBy="p2p-ch-r" describedBy="p2p-ch-r-h" options={accountOptions(accounts)} />
                <p className="field-help" id="p2p-ch-r-h">{f.recipientHint}</p>
              </div>
              <div className="fld">
                <span className="field-l" id="p2p-ch-e">{p.head.expires}</span>
                <Select value={expiry} onChange={setExpiry} labelledBy="p2p-ch-e" options={EXPIRIES.map((k) => ({ value: k, label: f.expiries[k] }))} />
              </div>
              <Check checked={multiUse} onChange={setMultiUse} label={f.multiUse} hint={f.multiUseHint} />
            </>
          )}
        </FormStep>
        <FormStepsFooter steps={steps} canNext={step1Ok} onCancel={onClose} submitLabel={p.create} onSubmit={create} busy={busy} submitDisabled={!step2Ok} />
      </div>
    </Modal>
  );
}
