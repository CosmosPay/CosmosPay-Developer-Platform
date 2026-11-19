/* P2pOffersView: what the organization's merchant wallets offer on the P2P market. An offer sells
   tokens for local money (people buy from it) or buys them (people sell to it), on one network and
   token, in one currency over its payment methods, at a price that lasts its time to live (a price
   older than that is not matched until it is refreshed; bots refresh it through the API), between
   a minimum and a maximum per order. Cosmos Pay picks the merchant for each order; there is no
   order book. The Payments table: figures, filters, rows that open the offer to edit, bulk delete. */
import { useEffect, useMemo, useRef, useState } from "react";
import { useT, useLang, fmt } from "@/lib/i18n/index";
import { Modal, showToast } from "@/components/cosmos/shared";
import { ConfirmModal } from "@/components/cosmos/ui/ConfirmModal";
import { IcCopy } from "@/components/cosmos/icons";
import { DI } from "@/components/cosmos/dashboard/icons";
import { fmtDateTime, fmtWhen } from "@/components/cosmos/dashboard/helpers";
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
import { countBy, inRange, matchesQuery, DATE_RANGES } from "@/lib/dashboard-filters";
import { parseDecimal } from "@/lib/p2p/amounts";
import { fiatDecimals } from "@/lib/p2p/rails";
import type { P2pAccount, P2pMarket, P2pOffer, P2pOfferSide, P2pPaymentMethod } from "@/lib/p2p/types";
import {
  p2pApi, useP2pMarket, useP2pList, useNow, networkOf, networkName, fiatText, NetworkCell, P2pTokenMark, accountName, railName, Check, Notice, accountOptions, networkOptions,
} from "@/components/cosmos/dashboard/p2p/shared";

const TTLS = [300, 900, 3600, 21600, 86400];
const SIDES: P2pOfferSide[] = ["SELL_TOKEN", "BUY_TOKEN"];

/** Whether an offer's price is past its time to live (it is not matched until refreshed). */
export const isStale = (o: P2pOffer, now = Date.now()) => Date.parse(o.priceUpdatedAt) + o.priceTtlSeconds * 1000 < now;
const stateOf = (o: P2pOffer, now: number) => (!o.active ? "paused" : isStale(o, now) ? "stale" : "active");

export function P2pOffersView({ canManage = false, orgId, env = "dev" }: { canManage?: boolean; orgId: string; env?: string }) {
  const t = useT();
  const lang = useLang();
  const p = t.p2p.offers;
  const cm = t.dash.common;
  const fl = t.dash.filters;
  const market = useP2pMarket(env, orgId);
  const offers = useP2pList<P2pOffer>("offers", env, orgId, 30_000);
  const accounts = useP2pList<P2pAccount>("accounts", env, orgId);
  const methods = useP2pList<P2pPaymentMethod>("payment-methods", env, orgId);
  const now = useNow(15_000);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<P2pOffer | null>(null);
  const [toDelete, setToDelete] = useState<P2pOffer | null>(null);
  const merchants = accounts.rows.filter((a) => a.merchant);

  const [createReq, clearCreate] = useUrlRequest("create");
  useEffect(() => { if (createReq) { clearCreate(); if (canManage) setCreating(true); } /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [createReq]);

  const defaults = useMemo(() => ({ q: "", status: "all", side: "all", chain: "all", currency: "all", date: "any" }), []);
  const { filters, set, reset, active } = useListFilters(defaults, { status: ["all", "active", "paused", "stale"], side: ["all", ...SIDES], date: DATE_RANGES });
  const rows = offers.rows;
  const acc = (id: string) => accounts.rows.find((a) => a.id === id) ?? null;
  const match = (o: P2pOffer, skip?: string) =>
    (skip === "status" || filters.status === "all" || stateOf(o, now) === filters.status) &&
    (skip === "side" || filters.side === "all" || o.side === filters.side) &&
    (skip === "chain" || filters.chain === "all" || o.network === filters.chain) &&
    (skip === "currency" || filters.currency === "all" || o.currency === filters.currency) &&
    inRange(o.createdAt, filters.date) &&
    matchesQuery([o.id, o.token, o.currency, o.price, accountName(acc(o.accountId)), ...o.rails.map((r) => railName(t, r)), networkName(market, o.network), p.sides[o.side]], filters.q);
  const view = rows.filter((o) => match(o));
  const statusCounts = countBy(rows.filter((o) => match(o, "status")), (o) => stateOf(o, now));
  const sideCounts = countBy(rows.filter((o) => match(o, "side")), (o) => o.side);
  const chainCounts = countBy(rows.filter((o) => match(o, "chain")), (o) => o.network);
  const curCounts = countBy(rows.filter((o) => match(o, "currency")), (o) => o.currency);
  const currencies = [...new Set([...(market?.currencies ?? []).map((c) => c.code), ...rows.map((o) => o.currency)])];
  const pg = usePaged(view, JSON.stringify(filters));
  const tref = useRef(null); useGsapRows(tref, pg.page + "|" + view.length);
  const sel = useSelection(canManage ? view.map((o) => o.id) : []);
  const label = (o: P2pOffer) => `${p.sides[o.side]} ${o.token} · ${o.currency}`;
  const bulk = useBulkDelete({
    sel, nameOf: (id) => { const o = rows.find((x) => x.id === id); return o ? label(o) : id; },
    remove: (id) => p2pApi.remove(`offers/${encodeURIComponent(id)}`, env, orgId),
    onRemoved: (ids) => offers.setRows((x) => x.filter((o) => !ids.includes(o.id))),
  });

  const toggle = (o: P2pOffer) => p2pApi.patch(`offers/${encodeURIComponent(o.id)}`, env, orgId, { active: !o.active })
    .then((u) => { offers.setRows((x) => x.map((y) => (y.id === o.id ? { ...y, ...u } : y))); showToast(o.active ? p.paused : p.activated); })
    .catch((e) => showToast(e?.message || p.saveFailed, "error"));
  const remove = () => {
    const o = toDelete;
    if (!o) return;
    p2pApi.remove(`offers/${encodeURIComponent(o.id)}`, env, orgId)
      .then(() => { offers.setRows((x) => x.filter((y) => y.id !== o.id)); setToDelete(null); setEditing(null); showToast(p.deleted); })
      .catch((e) => { setToDelete(null); showToast(e?.message || p.deleteFailed, "error"); });
  };

  const priceText = (o: P2pOffer) => `1 ${o.token} = ${fiatText(o.price, o.currency, lang)}`;
  const limitsText = (o: P2pOffer) => fmt(p.limitsValue, { min: fiatText(o.minFiat, o.currency, lang), max: fiatText(o.maxFiat, o.currency, lang) });
  const pill = (o: P2pOffer) => {
    const s = stateOf(o, now);
    return <Pill st={s === "active" ? "ok" : s === "stale" ? "pend" : "ref"} tone={s === "active" ? "ok" : s === "stale" ? "wait" : "off"} label={p.state[s]} />;
  };
  const items = (o: P2pOffer) => [
    { key: "open", label: canManage ? p.edit : cm.details, icon: canManage ? DI.edit : DI.docs, onClick: () => setEditing(o) },
    ...(canManage ? [{ key: "toggle", label: o.active ? p.pause : p.activate, icon: DI.refresh, onClick: () => toggle(o) }] : []),
    { key: "copy", label: cm.copyId, icon: <IcCopy />, onClick: () => navigator.clipboard?.writeText(o.id).then(() => showToast(t.toasts.copied)).catch(() => {}) },
    ...(canManage ? [{ key: "delete", label: p.delete, icon: DI.trash, danger: true, onClick: () => setToDelete(o) }] : []),
  ];
  const loading = offers.loading;
  const stale = rows.filter((o) => o.active && isStale(o, now)).length;

  return (
    <>
      <ViewHead title={p.title} />
      <ViewFigures
        label={p.figuresLabel} loading={loading} failed={offers.error}
        items={[
          { key: "offers", label: p.figures.offers, value: rows.length },
          { key: "active", label: p.figures.active, value: rows.filter((o) => stateOf(o, now) === "active").length },
          { key: "sell", label: p.figures.sell, value: rows.filter((o) => o.side === "SELL_TOKEN").length, sub: fmt(p.figures.buySub, { n: rows.filter((o) => o.side === "BUY_TOKEN").length }) },
          { key: "stale", label: p.figures.stale, value: stale, sub: p.figures.staleSub },
        ]}
      />
      {!canManage && <div className="note-bar" style={{ marginBottom: 16 }}>{DI.key}<span>{p.readOnly}</span></div>}
      <FilterBar
        label={fl.label}
        query={filters.q} onQuery={(v) => set("q", v)} placeholder={p.search}
        status={{
          label: fl.status, value: filters.status, onChange: (v) => set("status", v),
          options: [
            { key: "all", label: fl.allStatuses, count: rows.filter((o) => match(o, "status")).length },
            ...(["active", "stale", "paused"] as const).map((k) => ({ key: k, label: p.state[k], count: statusCounts[k] || 0, icon: <StatusIcon tone={k === "active" ? "ok" : k === "stale" ? "wait" : "off"} size={16} /> })),
          ],
        }}
        selects={[
          { key: "side", label: p.side, value: filters.side, onChange: (v) => set("side", v), options: [{ key: "all", label: p.allSides }, ...SIDES.map((s) => ({ key: s, label: p.sides[s], count: sideCounts[s] || 0 }))] },
          { key: "chain", label: fl.network, value: filters.chain, onChange: (v) => set("chain", v), options: [{ key: "all", label: fl.allNetworks }, ...(market?.networks ?? []).map((n) => ({ key: n.id, label: n.name, count: chainCounts[n.id] || 0 }))] },
          { key: "currency", label: p.currency, value: filters.currency, onChange: (v) => set("currency", v), options: [{ key: "all", label: p.allCurrencies }, ...currencies.map((c) => ({ key: c, label: `${currencyName(c, lang)} (${c})`, icon: <CurrencyMark id={c} size={18} />, count: curCounts[c] || 0 }))] },
        ]}
        date={filters.date} onDate={(v) => set("date", v)}
        active={active} onReset={reset}
        shown={view.length} total={loading ? undefined : rows.length} loading={loading}
        actions={canManage && (sel.count ? <BulkActions sel={sel} onDelete={bulk.ask} busy={bulk.busy} /> : (
          <button type="button" className="btn btn-dark btn-sm" onClick={() => setCreating(true)} disabled={!market || !merchants.length} title={!merchants.length ? p.needMerchant : undefined}>{DI.plus} {p.create}</button>
        ))}
      />
      <div className="panel">
        {loading && <TableSkeleton label={p.loading} cols={7} />}
        {!loading && (
          <div className="t-scroll" tabIndex={0} ref={tref}><table className="tx p2p-t"><thead><tr>
            {canManage && <SelectHead sel={sel} pageIds={pg.slice.map((o) => o.id)} />}
            <th>{p.head.offer}</th><th>{p.head.methods}</th><th>{p.head.price}</th><th>{p.head.limits}</th><th>{p.head.status}</th><th>{p.head.updated}</th>
            <th><span className="sr-only">{cm.actions}</span></th>
          </tr></thead>
            <tbody>{!offers.error && pg.slice.map((o) => (
              <tr key={o.id} className="row-click" onClick={() => setEditing(o)}>
                {canManage && <SelectCell sel={sel} id={o.id} name={label(o)} />}
                <td className="tid" onClick={(e) => e.stopPropagation()}>
                  <span className="cell-mark">
                    <P2pTokenMark market={market} network={o.network} symbol={o.token} />
                    <RecordLink onOpen={() => setEditing(o)} copy={o.id} title={o.id}
                      preview={() => <PreviewCard label={p.head.offer} title={o.id} headline={<><b>{label(o)}</b>{pill(o)}</>} fields={[[p.head.price, priceText(o)], [p.head.limits, limitsText(o)], [p.wallet, accountName(acc(o.accountId))], [t.dash.filters.network, networkName(market, o.network)]]} />}
                    >{label(o)}</RecordLink>
                  </span>
                </td>
                <td className="cust"><span className="cell-mark"><CurrencyMark id={o.currency} size={18} /><span>{o.rails.map((r) => railName(t, r)).join(", ")}</span></span></td>
                <td className="amt">{priceText(o)}</td>
                <td className="cust">{limitsText(o)}</td>
                <td>{pill(o)}</td>
                <td className="cust">{fmtWhen(o.priceUpdatedAt)}</td>
                <td className="row-actions" onClick={(e) => e.stopPropagation()}>
                  <button type="button" className="icon-mini" title={canManage ? p.edit : cm.details} aria-label={`${canManage ? p.edit : cm.details}: ${label(o)}`} onClick={() => setEditing(o)}>{canManage ? DI.edit : DI.docs}</button>
                  {canManage && <button type="button" className="icon-mini" title={o.active ? p.pause : p.activate} aria-label={`${o.active ? p.pause : p.activate}: ${label(o)}`} onClick={() => toggle(o)}>{DI.refresh}</button>}
                  {canManage && <button type="button" className="icon-mini danger" title={p.delete} aria-label={`${p.delete}: ${label(o)}`} onClick={() => setToDelete(o)}>{DI.trash}</button>}
                  <RowMenu label={fmt(cm.rowActions, { name: label(o) })} items={items(o)} />
                </td>
              </tr>
            ))}
              <FillRows n={pg.size - (offers.error ? 0 : pg.count)} cols={canManage ? 8 : 7} empty={offers.error ? p.listError : null} />
            </tbody>
          </table></div>
        )}
        {!loading && <Pagination {...pg} />}
      </div>
      {creating && market && (
        <OfferModal market={market} accounts={merchants} methods={methods.rows} env={env} orgId={orgId} onClose={() => setCreating(false)}
          onSaved={(o) => { offers.setRows((x) => [o, ...x]); setCreating(false); showToast(p.created); }} />
      )}
      {editing && market && (
        <OfferModal market={market} accounts={merchants.length ? merchants : accounts.rows} methods={methods.rows} env={env} orgId={orgId} offer={editing} canManage={canManage} onClose={() => setEditing(null)}
          onSaved={(o) => { offers.setRows((x) => x.map((y) => (y.id === o.id ? { ...y, ...o } : y))); setEditing(null); showToast(p.saved); }}
          onDelete={() => setToDelete(editing)} />
      )}
      {bulk.dialog}
      {toDelete && <ConfirmModal title={p.deleteTitle} body={fmt(p.deleteBody, { name: label(toDelete) })} confirmLabel={p.delete} cancelLabel={cm.cancel} onConfirm={remove} onClose={() => setToDelete(null)} />}
    </>
  );
}

/* Creating an offer (two steps: what it trades, then its price and limits) or editing one (its
   price, time to live, limits, methods and whether it is on). */
function OfferModal({ market, accounts, methods, env, orgId, offer = null, canManage = true, onClose, onSaved, onDelete }: {
  market: P2pMarket; accounts: P2pAccount[]; methods: P2pPaymentMethod[]; env: string; orgId: string; offer?: P2pOffer | null; canManage?: boolean;
  onClose: () => void; onSaved: (o: P2pOffer) => void; onDelete?: () => void;
}) {
  const t = useT();
  const lang = useLang();
  const p = t.p2p.offers;
  const f = p.form;
  const fl = t.dash.filters;
  const editing = !!offer;
  const steps = useFormSteps(editing ? 1 : 2);
  const [side, setSide] = useState<P2pOfferSide>(offer?.side ?? "SELL_TOKEN");
  const [accountId, setAccountId] = useState(offer?.accountId ?? accounts[0]?.id ?? "");
  const [network, setNetwork] = useState(offer?.network ?? market.networks[0]?.id ?? "");
  const net = networkOf(market, network);
  const [token, setToken] = useState(offer?.token ?? net?.tokens[0]?.symbol ?? "");
  const [currency, setCurrency] = useState(offer?.currency ?? market.currencies[0]?.code ?? "");
  const railsOf = (c: string) => market.currencies.find((x) => x.code === c)?.rails ?? [];
  const [rails, setRails] = useState<string[]>(offer?.rails ?? railsOf(currency).slice(0, 1));
  const [price, setPrice] = useState(offer?.price ?? "");
  const [ttl, setTtl] = useState(String(offer?.priceTtlSeconds ?? 900));
  const [min, setMin] = useState(offer?.minFiat ?? "");
  const [max, setMax] = useState(offer?.maxFiat ?? "");
  const [active, setActive] = useState(offer?.active ?? true);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (!editing && net && !net.tokens.some((x) => x.symbol === token)) setToken(net.tokens[0]?.symbol ?? ""); }, [network]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!editing) setRails(railsOf(currency).slice(0, 1)); }, [currency]); // eslint-disable-line react-hooks/exhaustive-deps

  // A sale offer is paid into the merchant's own account for each method: one must be active.
  const methodFor = (rail: string) => methods.find((m) => m.accountId === accountId && m.rail === rail && m.active);
  const missing = side === "SELL_TOKEN" ? rails.filter((r) => !methodFor(r)) : [];
  const dec = fiatDecimals(currency);
  const priceOk = parseDecimal(price, 8) !== null && Number(price) > 0;
  const minOk = parseDecimal(min, dec) !== null && Number(min) > 0;
  const maxOk = parseDecimal(max, dec) !== null && Number(max) >= Number(min);
  const step1Ok = !!accountId && !!net && !!token && !!currency && rails.length > 0 && missing.length === 0;
  const step2Ok = priceOk && minOk && maxOk;

  const save = () => {
    if (busy || !step2Ok || (!editing && !step1Ok)) return;
    setBusy(true);
    const body = { price: price.trim(), priceTtlSeconds: Number(ttl), minFiat: min.trim(), maxFiat: max.trim(), rails, active };
    const req = editing
      ? p2pApi.patch(`offers/${encodeURIComponent(offer!.id)}`, env, orgId, body)
      : p2pApi.post("offers", env, orgId, { ...body, accountId, side, network, token, currency });
    req.then(onSaved).catch((e) => showToast(e?.message || p.saveFailed, "error")).finally(() => setBusy(false));
  };

  const sideCards = (
    <div className="zka-choices" role="radiogroup" aria-label={p.side}>
      {SIDES.map((s) => (
        <button key={s} type="button" role="radio" aria-checked={side === s} className={`zka-choice${side === s ? " on" : ""}`} onClick={() => setSide(s)}>
          <span className="zka-choice-mark" aria-hidden="true" />
          <span><b>{p.sides[s]}</b><small className="p2p-choice-d">{f.sideDesc[s]}</small></span>
        </button>
      ))}
    </div>
  );
  const railChecks = (
    <div className="fld">
      <span className="field-l">{p.head.methods}</span>
      <div className="p2p-perms">
        {railsOf(currency).map((r) => (
          <Check key={r} checked={rails.includes(r)} onChange={(on) => setRails((x) => (on ? [...x, r] : x.filter((y) => y !== r)))} label={railName(t, r)}
            hint={side === "SELL_TOKEN" && rails.includes(r) && !methodFor(r) ? f.noMethod : undefined} disabled={!canManage} />
        ))}
      </div>
    </div>
  );
  const priceFields = (
    <>
      <Field label={fmt(f.price, { token, currency })} hint={f.priceHint} value={price} onChange={(e) => setPrice(e.target.value.trim().replace(",", "."))} inputMode="decimal" placeholder="1415.50" disabled={!canManage} aria-invalid={price && !priceOk ? true : undefined} />
      <div className="fld">
        <span className="field-l" id="p2p-ttl-l">{f.ttl}</span>
        <Select value={ttl} onChange={setTtl} labelledBy="p2p-ttl-l" disabled={!canManage} options={TTLS.map((s) => ({ value: String(s), label: f.ttls[String(s)] }))} />
      </div>
      <div className="field-row">
        <Field label={fmt(f.min, { currency })} value={min} onChange={(e) => setMin(e.target.value.trim().replace(",", "."))} inputMode="decimal" placeholder="10000" disabled={!canManage} aria-invalid={min && !minOk ? true : undefined} />
        <Field label={fmt(f.max, { currency })} value={max} onChange={(e) => setMax(e.target.value.trim().replace(",", "."))} inputMode="decimal" placeholder="2500000" disabled={!canManage} aria-invalid={max && !maxOk ? true : undefined} />
      </div>
      <Check checked={active} onChange={setActive} label={f.active} hint={f.activeHint} disabled={!canManage} />
    </>
  );

  return (
    <Modal onClose={() => { if (!busy) onClose(); }} label={editing ? p.edit : p.create}>
      <div className="modal-body">
        <div className="modal-eyebrow">{p.title}</div>
        <h3>{editing ? `${p.sides[offer!.side]} ${offer!.token} · ${offer!.currency}` : p.create}</h3>
        {editing ? (
          <>
            <div className="paylink-fields" style={{ marginBottom: 14 }}>
              {[[p.wallet, accountName(accounts.find((a) => a.id === offer!.accountId))], [fl.network, <NetworkCell market={market} id={offer!.network} />], [p.currency, `${currencyName(offer!.currency, lang)} (${offer!.currency})`], [f.priceUpdated, new Date(offer!.priceUpdatedAt).toLocaleString(lang)]].map(([k, v]) => (
                <div className="paylink-field" key={String(k)}><span className="pf-k">{k}</span><span className="pf-v">{v}</span></div>
              ))}
            </div>
            {railChecks}
            {priceFields}
            {missing.length > 0 && <p className="field-err" role="alert">{fmt(f.missingMethods, { methods: missing.map((r) => railName(t, r)).join(", ") })}</p>}
            <div className="modal-actions">
              {canManage && <button type="button" className="btn btn-violet" disabled={!step2Ok || missing.length > 0 || busy} onClick={save}>{p.save}</button>}
              {canManage && onDelete && <button type="button" className="btn btn-soft danger-soft" onClick={onDelete}>{DI.trash} {p.delete}</button>}
              <button type="button" className="btn btn-soft" onClick={onClose}>{canManage ? t.dash.common.cancel : t.ui.close}</button>
            </div>
          </>
        ) : (
          <>
            <FormSteps names={[f.stepTrade, f.stepPrice]} steps={steps} />
            <FormStep steps={steps}>
              {steps.step === 0 && (
                <>
                  {sideCards}
                  <div className="field-row">
                    <div className="fld">
                      <span className="field-l" id="p2p-of-w">{p.wallet}</span>
                      <Select value={accountId} onChange={setAccountId} labelledBy="p2p-of-w" options={accountOptions(accounts)} />
                    </div>
                    <div className="fld">
                      <span className="field-l" id="p2p-of-n">{fl.network}</span>
                      <Select value={network} onChange={setNetwork} labelledBy="p2p-of-n" options={networkOptions(market)} />
                    </div>
                  </div>
                  <div className="field-row">
                    <div className="fld">
                      <span className="field-l" id="p2p-of-t">{f.token}</span>
                      <Select value={token} onChange={setToken} labelledBy="p2p-of-t" disabled={(net?.tokens.length ?? 0) < 2} options={(net?.tokens ?? []).map((x) => ({ value: x.symbol, label: x.symbol, icon: <P2pTokenMark market={market} network={network} symbol={x.symbol} size={18} /> }))} />
                    </div>
                    <div className="fld">
                      <span className="field-l" id="p2p-of-c">{p.currency}</span>
                      <Select value={currency} onChange={setCurrency} labelledBy="p2p-of-c" options={market.currencies.map((c) => ({ value: c.code, label: `${currencyName(c.code, lang)} (${c.code})`, icon: <CurrencyMark id={c.code} size={18} /> }))} />
                    </div>
                  </div>
                  {railChecks}
                  {missing.length > 0 && <Notice id="p2p-of-miss" title={f.missingTitle}>{fmt(f.missingMethods, { methods: missing.map((r) => railName(t, r)).join(", ") })}</Notice>}
                </>
              )}
              {steps.step === 1 && priceFields}
            </FormStep>
            <FormStepsFooter steps={steps} canNext={step1Ok} onCancel={onClose} submitLabel={p.create} onSubmit={save} busy={busy} submitDisabled={!step2Ok} />
          </>
        )}
      </div>
    </Modal>
  );
}
