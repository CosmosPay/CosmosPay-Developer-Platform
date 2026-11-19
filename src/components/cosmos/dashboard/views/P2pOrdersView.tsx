/* P2pOrdersView: the P2P market's orders, from both sides. "To fill" are the orders Cosmos Pay
   matched to the organization's merchant wallets: on a purchase the merchant releases the tokens
   once the money arrived (checking it came from the named payer); on a sale or a payout it
   accepts, pays the beneficiary, marks it paid with the transfer's reference, and disputes if it
   must. "Yours" are the orders the organization opened for its users, charges and payouts: report
   a transfer, cancel, dispute, or release a payout the merchant paid. Every merchant action and
   every release is a transaction the wallet itself sends (WalletTxDialog); the rest are calls the
   Payments API makes through Cosmos Pay's matcher. Live orders are read again every 10 s, and each
   shows the deadline that runs now. */
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useT, useLang, fmt } from "@/lib/i18n/index";
import { Modal, showToast } from "@/components/cosmos/shared";
import { ConfirmModal } from "@/components/cosmos/ui/ConfirmModal";
import { IcCopy } from "@/components/cosmos/icons";
import { DI } from "@/components/cosmos/dashboard/icons";
import { fmtDateTime, fmtWhen } from "@/components/cosmos/dashboard/helpers";
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
import { StatusIcon } from "@/components/cosmos/dashboard/components/StatusIcon";
import { Field } from "@/components/cosmos/dashboard/components/Field";
import { CurrencyMark, currencyName } from "@/components/cosmos/dashboard/components/RampWidget";
import { countBy, inRange, matchesQuery, DATE_RANGES } from "@/lib/dashboard-filters";
import { clientActions, isTerminal, merchantActions, merchantSells, orderTone, type ClientAction, type MerchantAction } from "@/lib/p2p/orders";
import { RAILS, isRailId } from "@/lib/p2p/rails";
import { type P2pAccount, type P2pMarket, type P2pOrder, type P2pOrderKind } from "@/lib/p2p/types";
import {
  p2pApi, useP2pMarket, useP2pList, networkOf, networkName, fiatText, tokenText, durationText, NetworkCell, P2pTokenMark, P2pAddress, P2pTx,
  OrderStatus, OrderCountdown, WalletTxDialog, buildTx, accountName, railName, Notice,
} from "@/components/cosmos/dashboard/p2p/shared";

const KINDS: P2pOrderKind[] = ["BUY", "SELL", "CHARGE", "PAYOUT"];
type Side = "merchant" | "client";


export function P2pOrdersView({ canManage = false, orgId, env = "dev" }: { canManage?: boolean; orgId: string; env?: string }) {
  const t = useT();
  const lang = useLang();
  const p = t.p2p.orders;
  const cm = t.dash.common;
  const fl = t.dash.filters;
  const market = useP2pMarket(env, orgId);
  const [side, setSide] = useState<Side>("merchant");
  const merchant = useP2pList<P2pOrder>("merchant/orders", env, orgId, 10_000);
  const client = useP2pList<P2pOrder>("orders", env, orgId, 10_000);
  const accounts = useP2pList<P2pAccount>("accounts", env, orgId);
  const list = side === "merchant" ? merchant : client;
  const [detail, setDetail] = useState<{ order: P2pOrder; side: Side } | null>(null);

  const [openReq, clearOpen] = useUrlRequest("open");
  useEffect(() => {
    if (!openReq || merchant.loading || client.loading) return;
    clearOpen();
    const m = merchant.rows.find((o) => o.id === openReq);
    const c = client.rows.find((o) => o.id === openReq);
    if (m) { setSide("merchant"); setDetail({ order: m, side: "merchant" }); return; }
    if (c) { setSide("client"); setDetail({ order: c, side: "client" }); return; }
    showToast(cm.notFound, "error");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openReq, merchant.loading, client.loading]);
  // A detail on screen follows its order as the lists are read again.
  useEffect(() => {
    if (!detail) return;
    const fresh = (detail.side === "merchant" ? merchant.rows : client.rows).find((o) => o.id === detail.order.id);
    if (fresh && fresh !== detail.order) setDetail({ order: fresh, side: detail.side });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [merchant.rows, client.rows]);

  const defaults = useMemo(() => ({ q: "", status: "all", kind: "all", chain: "all", currency: "all", date: "any" }), []);
  const { filters, set, reset, active } = useListFilters(defaults, { status: ["all", "live", "done", "failed"], kind: ["all", ...KINDS], date: DATE_RANGES });
  const group = (o: P2pOrder) => (!isTerminal(o.status) ? "live" : orderTone(o.status) === "ok" ? "done" : "failed");
  const rows = list.rows;
  const match = (o: P2pOrder, skip?: string) =>
    (skip === "status" || filters.status === "all" || group(o) === filters.status) &&
    (skip === "kind" || filters.kind === "all" || o.kind === filters.kind) &&
    (skip === "chain" || filters.chain === "all" || o.network === filters.chain) &&
    (skip === "currency" || filters.currency === "all" || o.currency === filters.currency) &&
    inRange(o.createdAt, filters.date) &&
    matchesQuery([o.id, o.fiatAmount, o.tokenAmount, o.currency, o.token, o.payer?.name, o.merchant?.displayName, o.externalReference, o.paidReference, t.p2p.kinds[o.kind], t.p2p.status[o.status], networkName(market, o.network)], filters.q);
  const view = rows.filter((o) => match(o));
  const stCounts = countBy(rows.filter((o) => match(o, "status")), group);
  const kindCounts = countBy(rows.filter((o) => match(o, "kind")), (o) => o.kind);
  const chainCounts = countBy(rows.filter((o) => match(o, "chain")), (o) => o.network);
  const curCounts = countBy(rows.filter((o) => match(o, "currency")), (o) => o.currency);
  const currencies = [...new Set(rows.map((o) => o.currency))];
  const pg = usePaged(view, JSON.stringify(filters) + side);
  const tref = useRef(null); useGsapRows(tref, pg.page + "|" + view.length + side);

  // Figures for both sides together: what waits on the organization first.
  const now = Date.now();
  const toAct = merchant.rows.filter((o) => merchantActions(o, now).some((a) => a !== "cancel" && a !== "dispute")).length + client.rows.filter((o) => clientActions(o, now).some((a) => a === "paid" || a === "release")).length;
  const live = [...merchant.rows, ...client.rows].filter((o) => !isTerminal(o.status)).length;
  const done30 = merchant.rows.filter((o) => o.status === "completed" && Date.parse(o.createdAt) > now - 30 * 86_400_000);
  const disputed = [...merchant.rows, ...client.rows].filter((o) => o.status === "disputed").length;
  const figures = [
    { key: "act", label: p.figures.toAct, value: toAct, sub: p.figures.toActSub },
    { key: "live", label: p.figures.live, value: live },
    { key: "done", label: p.figures.filled, value: done30.length, sub: p.figures.filledSub },
    { key: "disputed", label: p.figures.disputed, value: disputed, sub: p.figures.disputedSub },
  ];

  const kindLabel = (o: P2pOrder) => t.p2p.kinds[o.kind] || o.kind;
  const counterparty = (o: P2pOrder) => (side === "merchant" ? (merchantSells(o.kind) ? o.payer?.name : o.paymentDetails?.holderName) : o.merchant?.displayName) || "-";
  const mainOf = (o: P2pOrder): string | null => {
    if (!canManage) return null;
    if (side === "merchant") return merchantActions(o).find((a) => a !== "cancel" && a !== "dispute") ?? null;
    return clientActions(o).find((a) => a === "paid" || a === "release") ?? null;
  };
  const loading = list.loading;

  return (
    <>
      <ViewHead title={p.title} />
      <ViewFigures items={figures} loading={merchant.loading || client.loading} failed={merchant.error && client.error} label={p.figuresLabel} />
      {!canManage && <div className="note-bar" style={{ marginBottom: 16 }}>{DI.key}<span>{p.readOnly}</span></div>}
      <div className="tabs-row">
        <div className="filter-tabs" role="group" aria-label={p.title}>
          {(["merchant", "client"] as Side[]).map((k) => (
            <button key={k} type="button" className={side === k ? "on" : ""} aria-pressed={side === k} onClick={() => setSide(k)}>{p.tabs[k]}</button>
          ))}
        </div>
      </div>
      <FilterBar
        label={fl.label}
        query={filters.q} onQuery={(v) => set("q", v)} placeholder={p.search}
        status={{
          label: fl.status, value: filters.status, onChange: (v) => set("status", v),
          options: [
            { key: "all", label: fl.allStatuses, count: rows.filter((o) => match(o, "status")).length },
            { key: "live", label: p.groups.live, count: stCounts.live || 0, icon: <StatusIcon tone="wait" size={16} /> },
            { key: "done", label: p.groups.done, count: stCounts.done || 0, icon: <StatusIcon tone="ok" size={16} /> },
            { key: "failed", label: p.groups.failed, count: stCounts.failed || 0, icon: <StatusIcon tone="fail" size={16} /> },
          ],
        }}
        selects={[
          { key: "kind", label: fl.kind, value: filters.kind, onChange: (v) => set("kind", v), options: [{ key: "all", label: fl.allKinds }, ...KINDS.map((k) => ({ key: k, label: t.p2p.kinds[k], count: kindCounts[k] || 0 }))] },
          { key: "chain", label: fl.network, value: filters.chain, onChange: (v) => set("chain", v), options: [{ key: "all", label: fl.allNetworks }, ...(market?.networks ?? []).map((n) => ({ key: n.id, label: n.name, count: chainCounts[n.id] || 0 }))] },
          { key: "currency", label: t.p2p.offers.currency, value: filters.currency, onChange: (v) => set("currency", v), options: [{ key: "all", label: t.p2p.offers.allCurrencies }, ...currencies.map((c) => ({ key: c, label: `${currencyName(c, lang)} (${c})`, icon: <CurrencyMark id={c} size={18} />, count: curCounts[c] || 0 }))] },
        ]}
        date={filters.date} onDate={(v) => set("date", v)}
        active={active} onReset={reset}
        shown={view.length} total={loading ? undefined : rows.length} loading={loading}
      />
      <div className="panel">
        {loading && <TableSkeleton label={p.loading} cols={7} />}
        {!loading && (
          <div className="t-scroll" tabIndex={0} ref={tref}><table className="tx p2p-t"><thead><tr>
            <th>{p.head.order}</th><th>{p.head.amount}</th><th>{p.head.status}</th><th>{p.head.left}</th><th>{side === "merchant" ? p.head.counterpartyMerchant : p.head.counterpartyClient}</th><th>{p.head.created}</th>
            <th><span className="sr-only">{cm.actions}</span></th>
          </tr></thead>
            <tbody>{!list.error && pg.slice.map((o) => {
              const main = mainOf(o);
              return (
                <tr key={o.id} className="row-click" onClick={() => setDetail({ order: o, side })}>
                  <td className="tid" onClick={(e) => e.stopPropagation()}>
                    <span className="cell-mark">
                      <span className="am-sq">{DI.p2p}</span>
                      <RecordLink href={`/dashboard?view=p2pOrders&open=${encodeURIComponent(o.id)}`} onOpen={() => setDetail({ order: o, side })} copy={o.id} title={o.id}
                        preview={() => <PreviewCard label={kindLabel(o)} title={o.id} headline={<><b>{fiatText(o.fiatAmount, o.currency, lang)}</b><OrderStatus status={o.status} /></>} fields={[[p.head.tokens, tokenText(o.tokenAmount, o.token, lang)], [p.fields.rail, railName(t, o.rail)], [t.dash.filters.network, networkName(market, o.network)]]} />}
                      ><span>{kindLabel(o)} <code>{shortAddress(o.id)}</code></span></RecordLink>
                    </span>
                  </td>
                  <td className="amt"><span className="cell-mark"><CurrencyMark id={o.currency} size={20} /><span>{fiatText(o.fiatAmount, o.currency, lang)}<small className="p2p-sub">{tokenText(o.tokenAmount, o.token, lang)}</small></span></span></td>
                  <td><OrderStatus status={o.status} /></td>
                  <td className="cust"><OrderCountdown order={o} compact /></td>
                  <td className="cust">{counterparty(o)}</td>
                  <td className="cust">{fmtWhen(o.createdAt)}</td>
                  <td className="row-actions" onClick={(e) => e.stopPropagation()}>
                    <button type="button" className="icon-mini" title={cm.details} aria-label={`${cm.details}: ${shortAddress(o.id)}`} onClick={() => setDetail({ order: o, side })}>{DI.docs}</button>
                    {canManage && <button type="button" className="icon-mini" disabled={!main} title={main ? p.actions[main] : p.nothingToDo} aria-label={`${main ? p.actions[main] : p.nothingToDo}: ${shortAddress(o.id)}`} onClick={() => setDetail({ order: o, side })}>{DI.refresh}</button>}
                    <RowMenu label={fmt(cm.rowActions, { name: shortAddress(o.id) })} items={[
                      { key: "open", label: cm.details, icon: DI.docs, onClick: () => setDetail({ order: o, side }) },
                      { key: "tab", label: cm.openNewTab, icon: DI.link, href: `/dashboard?view=p2pOrders&open=${encodeURIComponent(o.id)}`, external: true },
                      { key: "copy", label: cm.copyId, icon: <IcCopy />, onClick: () => navigator.clipboard?.writeText(o.id).then(() => showToast(t.toasts.copied)).catch(() => {}) },
                      { key: "explorer", label: p.explorer, icon: DI.network, disabled: !o.txs?.open, hint: cm.noTxYet, href: o.txs?.open && networkOf(market, o.network)?.explorer ? `${networkOf(market, o.network)!.explorer}/tx/${o.txs.open}` : undefined, external: true },
                    ]} />
                  </td>
                </tr>
              );
            })}
              <FillRows n={pg.size - (list.error ? 0 : pg.count)} cols={7} empty={list.error ? p.listError : null} />
            </tbody>
          </table></div>
        )}
        {!loading && <Pagination {...pg} />}
      </div>
      {detail && (
        <OrderDetail order={detail.order} side={detail.side} market={market} accounts={accounts.rows} env={env} orgId={orgId} canManage={canManage}
          onClose={() => setDetail(null)}
          onChanged={(o) => { (detail.side === "merchant" ? merchant : client).setRows((x) => x.map((y) => (y.id === o.id ? o : y))); setDetail({ order: o, side: detail.side }); }}
          onSoon={() => { setTimeout(() => { merchant.reload(); client.reload(); }, 4500); setTimeout(() => { merchant.reload(); client.reload(); }, 9000); }} />
      )}
    </>
  );
}

/** One labelled value of an account the transfer goes to, with its copy button. */
function CopyLine({ label, value }: { label: string; value: string }) {
  const t = useT();
  const [done, copy] = useCopy();
  return (
    <div className="paylink-field p2p-copy-line">
      <span className="pf-k">{label}</span>
      <span className="pf-v"><code>{value}</code>
        <button type="button" className={`copy-mini${done ? " done" : ""}`} onClick={() => copy(value, t.toasts.copied)} aria-label={`${t.dash.common.copy}: ${label}`} title={t.dash.common.copy}><IcCopy /></button>
      </span>
    </div>
  );
}

/** An account's fields as copyable lines (holder, document and the rail's details). */
export function BankAccountLines({ account }: { account: { rail: string; holderName: string; document?: string | null; details: Record<string, string> } }) {
  const t = useT();
  const fx = t.p2p.fields;
  const rail = isRailId(account.rail) ? RAILS[account.rail] : null;
  const label = (key: string) => {
    const f = rail?.fields.find((x) => x.key === key);
    return f ? fx[f.kind] : key;
  };
  const optionLabel = (key: string, v: string) => {
    const f = rail?.fields.find((x) => x.key === key);
    return f?.options ? t.p2p.options[f.kind]?.[v] ?? v : v;
  };
  return (
    <div className="paylink-fields p2p-account">
      <CopyLine label={fx.holderName} value={account.holderName} />
      {account.document && <CopyLine label={rail ? fx[rail.document] : fx.document} value={account.document} />}
      {Object.entries(account.details).map(([k, v]) => <CopyLine key={k} label={label(k)} value={optionLabel(k, v)} />)}
    </div>
  );
}

/* An order's detail and every action its side may take now. */
function OrderDetail({ order: o, side, market, accounts, env, orgId, canManage, onClose, onChanged, onSoon }: {
  order: P2pOrder; side: Side; market: P2pMarket | null | undefined; accounts: P2pAccount[]; env: string; orgId: string; canManage: boolean;
  onClose: () => void; onChanged: (o: P2pOrder) => void; onSoon: () => void;
}) {
  const t = useT();
  const lang = useLang();
  const p = t.p2p.orders;
  const net = networkOf(market, o.network);
  const sells = merchantSells(o.kind);
  const [reference, setReference] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<ClientAction | MerchantAction | null>(null);
  const [signing, setSigning] = useState<MerchantAction | "release" | null>(null);
  // The registered wallet that acts: the merchant's (seller of a purchase, buyer of a sale) or the
  // client's on a payout (its seller).
  const own = (address: string | null) => accounts.find((a) => address && a.address.toLowerCase() === address.toLowerCase()) ?? null;
  const merchantWallet = side === "merchant" ? own(sells ? o.seller : o.buyer) : null;
  const clientWallet = side === "client" ? own(o.seller) : null;
  const actions: (MerchantAction | ClientAction)[] = !canManage ? [] : side === "merchant" ? merchantActions(o) : clientActions(o);

  const callApi = (action: ClientAction) => {
    setBusy(true);
    p2pApi.post(`orders/${encodeURIComponent(o.id)}/${action}`, env, orgId, action === "paid" ? { reference: reference.trim() || undefined } : {})
      .then((u) => { onChanged(u && u.id ? u : o); showToast(p.done[action]); onSoon(); })
      .catch((e) => showToast(e?.message || p.failed, "error"))
      .finally(() => { setBusy(false); setConfirm(null); });
  };
  const run = (a: MerchantAction | ClientAction) => {
    if (side === "client" && a !== "release") {
      if (a === "paid") callApi("paid"); else setConfirm(a);
      return;
    }
    setSigning(a as MerchantAction);
  };
  const signer = side === "merchant" ? merchantWallet : clientWallet;
  const deadlineNote = o.status === "awaiting_payment" && side === "merchant" && sells ? <Notice id="p2p-od-check" title={p.checkPayerTitle}>{fmt(p.checkPayer, { name: o.payer?.name ?? "-", amount: fiatText(o.fiatAmount, o.currency, lang) })}</Notice> : null;

  const fields: [string, ReactNode][] = [
    [p.fields.status, <span className="cell-mark"><OrderStatus status={o.status} /><OrderCountdown order={o} /></span>],
    [p.head.fiat, fiatText(o.fiatAmount, o.currency, lang)],
    [p.head.tokens, tokenText(o.tokenAmount, o.token, lang, 6)],
    [p.fields.price, `1 ${o.token} = ${fiatText(o.price, o.currency, lang)}`],
    [p.fields.rail, railName(t, o.rail)],
    [t.dash.filters.network, <NetworkCell market={market} id={o.network} />],
    ...(o.bond ? [[p.fields.bond, tokenText(o.bond, o.token, lang)] as [string, ReactNode]] : []),
    ...(o.merchant && side === "client" ? [[p.fields.merchant, `${o.merchant.displayName} · ${o.merchant.medianReleaseSeconds ? fmt(t.p2p.merchant.release, { time: durationText(t, o.merchant.medianReleaseSeconds) }) : t.p2p.merchant.new}`] as [string, ReactNode]] : []),
    ...(o.payer ? [[p.fields.payer, `${o.payer.name} · ${o.payer.document}`] as [string, ReactNode]] : []),
    [p.fields.buyer, <P2pAddress market={market} network={o.network} address={o.buyer} label={p.fields.buyer} />],
    [p.fields.seller, <P2pAddress market={market} network={o.network} address={o.seller} label={p.fields.seller} />],
    ...(o.paidReference ? [[p.fields.reference, <code>{o.paidReference}</code>] as [string, ReactNode]] : []),
    ...(o.externalReference ? [[p.fields.externalReference, <code>{o.externalReference}</code>] as [string, ReactNode]] : []),
    ...(Object.entries(o.txs ?? {}).filter(([, h]) => h).map(([k, h]) => [p.txs[k] ?? k, <P2pTx market={market} network={o.network} hash={h} label={p.txs[k] ?? k} />] as [string, ReactNode])),
    [p.head.created, fmtDateTime(o.createdAt)],
  ];
  const accountTitle = side === "merchant" ? p.payToTitle : p.merchantAccountTitle;

  if (signing && signer && net) {
    const action = signing === "release" ? "release" : signing;
    return (
      <WalletTxDialog
        eyebrow={`${t.p2p.kinds[o.kind]} · ${shortAddress(o.id)}`} title={p.actions[action]} signer={signer.address} network={net} market={market}
        fields={[[p.head.fiat, fiatText(o.fiatAmount, o.currency, lang)], [p.head.tokens, tokenText(o.tokenAmount, o.token, lang, 6)], [p.fields.wallet, accountName(signer)], ...(action === "markPaid" && reference.trim() ? [[p.fields.reference, reference.trim()] as [string, ReactNode]] : [])]}
        note={action === "release" ? <Notice id="p2p-rel-n" title={p.releaseTitle}>{p.releaseBody}</Notice> : action === "dispute" ? <Notice id="p2p-dis-n" title={p.disputeTitle}>{p.disputeBody}</Notice> : null}
        steps={[{ key: action, label: p.actions[action], build: () => buildTx(env, orgId, { network: o.network, from: signer.id, action, args: { orderId: o.id, ...(action === "markPaid" && reference.trim() ? { reference: reference.trim() } : {}) } }) }]}
        onClose={() => setSigning(null)} onDone={() => { setSigning(null); onSoon(); }}
      />
    );
  }

  return (
    <Modal onClose={() => { if (!busy) onClose(); }} label={p.title}>
      <div className="modal-body paylink-detail">
        <div className="modal-eyebrow">{t.p2p.kinds[o.kind]} · {side === "merchant" ? p.tabs.merchant : p.tabs.client}</div>
        <h3 title={o.id}>{fiatText(o.fiatAmount, o.currency, lang)}</h3>
        <div className="paylink-fields" style={{ marginBottom: 16 }}>
          {fields.map(([k, v], i) => <div className="paylink-field" key={`${i}-${k}`}><span className="pf-k">{k}</span><span className="pf-v">{v}</span></div>)}
        </div>
        {o.paymentDetails && (
          <div className="paylink-block">
            <div className="paylink-block-head"><span className="field-l">{accountTitle}</span></div>
            <BankAccountLines account={o.paymentDetails} />
          </div>
        )}
        {deadlineNote}
        {actions.includes("markPaid") && (
          <Field label={p.referenceLabel} hint={p.referenceHint} value={reference} onChange={(e) => setReference(e.target.value)} maxLength={60} placeholder={p.referencePlaceholder} />
        )}
        {actions.includes("paid") && (
          <Field label={p.referenceLabel} hint={t.dash.common.optional} value={reference} onChange={(e) => setReference(e.target.value)} maxLength={60} placeholder={p.referencePlaceholder} />
        )}
        {actions.length > 0 && !signer && (side === "merchant" || actions.includes("release")) && <Notice id="p2p-od-nowallet" title={p.noWalletTitle}>{p.noWallet}</Notice>}
        <div className="paylink-actions">
          {actions.map((a, i) => {
            const needsWallet = side === "merchant" || a === "release";
            const danger = a === "cancel" || a === "dispute";
            return (
              <button key={a} type="button" className={`btn btn-sm ${i === 0 && !danger ? "btn-dark" : danger ? "btn-soft danger-soft" : "btn-soft"}`}
                disabled={busy || (needsWallet && (!signer || !net))} onClick={() => run(a)}>{p.actions[a]}</button>
            );
          })}
          <button type="button" className="btn btn-soft btn-sm" onClick={onClose} disabled={busy}>{t.ui.close}</button>
        </div>
      </div>
      {confirm && (
        <ConfirmModal title={p.confirm[confirm].title} body={p.confirm[confirm].body} confirmLabel={p.actions[confirm]} cancelLabel={t.dash.common.cancel}
          onConfirm={() => callApi(confirm as ClientAction)} onClose={() => setConfirm(null)} />
      )}
    </Modal>
  );
}
