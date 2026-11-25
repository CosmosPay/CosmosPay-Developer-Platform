/* QrChargesView: the Fiat group's "QR charges" (product owner, 2026-11-12: "the QR system with the
   P2P we already have"). A charge is an amount in local money shown as a QR: the payer opens its
   page on the payments domain (/fiat/{id}) and pays by bank transfer to an alias and a CVU (the
   charge reads `processing` once the transfer arrived, while the token is on its way) or with a
   local method in the P2P marketplace's secure window; either way the token is delivered to the
   organization's own EVM account. No provider is named ("Never name a provider"). The detail says
   which ways the payer has (`methods`) and, once paid, which one paid it (`paidMethod`). Under the
   figures, the "Bank transfers" card (TransferAccountCard): the organization's own receiving account
   for transfers, which a charge in pesos needs before it can be paid that way.

   The Payments API's /v1/onramp/p2p/payment-requests (list, create, read, cancel), reached through
   the dashboard's /api/onramp proxy like the on-ramp's sessions. The Payments table: figures counted
   from the list, the filter row with "New charge", rows that open the charge's detail (its QR and
   link while it is open, followed every 5 s until it is paid), cancel asking first. Creating is a
   dialog in steps (FormSteps): the amount in local money with the market's estimate of the token
   it buys, then the token on its network and the account that receives it (one of the
   organization's EVM wallets, or an address typed and checked against its EIP-55 checksum), then
   the description and how long it can be paid. The checks are src/lib/qr-charges.ts (tested). */
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useT, useLang, fmt } from "@/lib/i18n/index";
import { onramp } from "@/lib/api-client";
import { DI } from "@/components/cosmos/dashboard/icons";
import { fmtDateTime } from "@/components/cosmos/dashboard/helpers";
import { usePaged, useGsapRows, useListFilters, useUrlRequest } from "@/components/cosmos/dashboard/hooks";
import { Modal, showToast } from "@/components/cosmos/shared";
import { IcCheck, IcCopy } from "@/components/cosmos/icons";
import { useCopy } from "@/components/cosmos/hooks/useCopy";
import { ConfirmModal } from "@/components/cosmos/ui/ConfirmModal";
import { ViewHead } from "@/components/cosmos/dashboard/components/ViewHead";
import { ViewFigures } from "@/components/cosmos/dashboard/components/ActivityPanel";
import { FilterBar } from "@/components/cosmos/dashboard/components/FilterBar";
import { TableSkeleton, Sk } from "@/components/cosmos/dashboard/components/Skeleton";
import { FillRows } from "@/components/cosmos/dashboard/components/FillRows";
import { Pagination } from "@/components/cosmos/dashboard/components/Pagination";
import { RowMenu } from "@/components/cosmos/dashboard/components/RowMenu";
import { RecordLink } from "@/components/cosmos/dashboard/components/RecordLink";
import { PreviewCard, shortAddress } from "@/components/cosmos/dashboard/components/RecordPreview";
import { AddressLink, TxLink } from "@/components/cosmos/dashboard/components/AddressLink";
import { Pill } from "@/components/cosmos/dashboard/components/Pill";
import { StatusIcon, type StatusTone } from "@/components/cosmos/dashboard/components/StatusIcon";
import { Field } from "@/components/cosmos/dashboard/components/Field";
import { Select } from "@/components/cosmos/dashboard/components/Select";
import { CopyBlock } from "@/components/cosmos/dashboard/components/PayLinkDetail";
import { NetworkMark, useOrgWallets } from "@/components/cosmos/dashboard/components/OrgWallets";
import { FormSteps, FormStep, FormStepsFooter, useFormSteps } from "@/components/cosmos/dashboard/components/FormSteps";
import { TransferAccountCard } from "@/components/cosmos/dashboard/components/TransferAccountCard";
import {
  CurrencyMark, RampPicker, RampTokenMark, RampTokenSheet, currencyName, rampChainMark, rampChainName, rampExplorer, rampTxExplorer, tokenUsd,
  type RampMarket, type RampToken,
} from "@/components/cosmos/dashboard/components/RampWidget";
import { DATE_RANGES, countBy, inRange, matchesQuery } from "@/lib/dashboard-filters";
import {
  CHARGE_POLL_MS, CHARGE_STATUSES, DEFAULT_EXPIRY, EXPIRY_PRESETS,
  chargeAmountProblem, chargeBody, chargeEstimate, chargeIsLive, chargeIsPayable, chargeMethods, chargePaidMethod, chargePhase,
  descriptionProblem, evmAddressProblem, safeChargeUrl, safeQrDataUrl, sameEvmAccount, type ChargeStatus, type QrCharge,
} from "@/lib/qr-charges";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const NBSP = String.fromCharCode(160);
const PATH = "p2p/payment-requests";
const DEFAULTS = { q: "", status: "all", currency: "all", chain: "all", date: "any" };
const ALLOWED = { status: ["all", ...CHARGE_STATUSES], date: DATE_RANGES };

/* A status as the Payments table draws it: its colour and its mark. */
const PILL: Record<ChargeStatus, { st: string; tone: StatusTone }> = {
  open: { st: "pend", tone: "wait" },
  // The money arrived by bank transfer and the token is on its way: still pending, not final.
  processing: { st: "pend", tone: "wait" },
  paid: { st: "ok", tone: "ok" },
  expired: { st: "fail", tone: "fail" },
  cancelled: { st: "ref", tone: "off" },
};

const hrefOf = (id: string) => `/dashboard?view=charges&open=${encodeURIComponent(id)}`;
const isCharge = (c: any): c is QrCharge => !!c && typeof c.id === "string" && typeof c.status === "string";

/* Numbers in the reader's language: local money with its cents once it has any, a token amount
   with two decimals from 1 up and four significant digits below. */
function useFormat() {
  const lang = useLang();
  return useMemo(() => {
    const money = (v: number | string) => {
      const n = Number(v);
      return Number.isFinite(n) ? new Intl.NumberFormat(lang, { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 }).format(n) : String(v ?? "");
    };
    const units = (v: number | string) => {
      const n = Number(v);
      if (!Number.isFinite(n)) return String(v ?? "");
      return n >= 1 ? new Intl.NumberFormat(lang, { maximumFractionDigits: 2 }).format(n) : new Intl.NumberFormat(lang, { maximumSignificantDigits: 4 }).format(n);
    };
    const rate = (v: number) => new Intl.NumberFormat(lang, { maximumFractionDigits: v >= 100 ? 2 : 4 }).format(v);
    return { lang, money, units, rate, fiat: (amount: string, currency: string) => [money(amount), currency].join(NBSP) };
  }, [lang]);
}

export function QrChargesView({ canManage = false, orgId, env = "dev" }: { canManage?: boolean; orgId: string; env?: string }) {
  const t = useT();
  const c = t.dash.charges;
  const r = t.dash.ramp;
  const fl = t.dash.filters;
  const cm = t.dash.common;
  const f = useFormat();
  const [, copy] = useCopy();
  // undefined while it loads, null when it could not be read.
  const [market, setMarket] = useState<RampMarket | null | undefined>(undefined);
  const [rows, setRows] = useState<QrCharge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [creating, setCreating] = useState(false);
  const [detail, setDetail] = useState<QrCharge | null>(null);
  const [toCancel, setToCancel] = useState<QrCharge | null>(null);
  const { filters, set, reset, active } = useListFilters(DEFAULTS, ALLOWED);

  // The market (for the dialog and the networks' names) and the charges together; an answer for an
  // organization or environment the view has since left is dropped.
  useEffect(() => {
    let current = true;
    setMarket(undefined);
    setLoading(true);
    onramp.get("p2p/market", env, orgId)
      .then((m) => { if (current) setMarket(m && Array.isArray(m.currencies) ? m : null); })
      .catch(() => { if (current) setMarket(null); });
    onramp.get(PATH, env, orgId, { take: 100 })
      .then((res) => { if (current) { setRows(Array.isArray(res?.data) ? res.data.filter(isCharge) : []); setError(false); } })
      .catch(() => { if (current) { setRows([]); setError(true); } })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [orgId, env]);

  // A charge read again (the detail's polling, a cancel) replaces its row and the open detail.
  const upsert = useCallback((charge: QrCharge) => {
    setRows((list) => (list.some((x) => x.id === charge.id) ? list.map((x) => (x.id === charge.id ? charge : x)) : [charge, ...list]));
    setDetail((d) => (d && d.id === charge.id ? charge : d));
    setToCancel((x) => (x && x.id === charge.id ? charge : x));
  }, []);

  // The overview or a link may ask for the dialog (?create=1) or a charge (?open=<id>).
  const [createReq, clearCreate] = useUrlRequest("create");
  useEffect(() => {
    if (!createReq) return;
    clearCreate();
    if (canManage) setCreating(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createReq]);
  const [openId, clearOpen] = useUrlRequest("open");
  useEffect(() => {
    if (!openId || loading) return;
    clearOpen();
    const hit = rows.find((x) => x.id === openId);
    if (hit) { setDetail(hit); return; }
    onramp.get(`${PATH}/${encodeURIComponent(openId)}`, env, orgId)
      .then((rec) => (isCharge(rec) ? setDetail(rec) : showToast(cm.notFound, "error")))
      .catch(() => showToast(cm.notFound, "error"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openId, loading]);

  const cancel = async (charge: QrCharge) => {
    try {
      const done = await onramp.post(`${PATH}/${encodeURIComponent(charge.id)}/cancel`, env, orgId, {});
      if (isCharge(done)) upsert(done);
      showToast(c.detail.cancelled);
    } catch (e: any) {
      // Paid, expired or cancelled since it was read: say so and show what it is now.
      if (e?.status === 409 || e?.code === 409) {
        showToast(c.detail.closed, "error");
        onramp.get(`${PATH}/${encodeURIComponent(charge.id)}`, env, orgId).then((rec) => { if (isCharge(rec)) upsert(rec); }).catch(() => {});
      } else {
        showToast(c.detail.cancelError, "error");
      }
    }
  };

  const networks = market?.networks ?? undefined;
  const chainName = (x: Pick<QrCharge, "chainId">) => rampChainName(x.chainId, networks);
  const phaseOf = (x: QrCharge) => chargePhase(x);
  const statusLabel = (x: QrCharge) => c.status[phaseOf(x)];
  // What the organization receives: the delivered amount once paid, else the estimate.
  const receives = (x: QrCharge) => {
    if (x.status === "paid" && x.paidAmount) return [f.units(x.paidAmount), x.token].join(NBSP);
    return x.estimatedAmountOut == null ? "-" : ["≈", f.units(x.estimatedAmountOut), x.token].join(NBSP);
  };
  const closesAt = (x: QrCharge) => fmtDateTime(x.status === "paid" ? x.paidAt : x.expiresAt);
  const title = (x: QrCharge) => x.description || shortAddress(x.id);

  const matches = (x: QrCharge, skip: string | null) =>
    (skip === "status" || filters.status === "all" || phaseOf(x) === filters.status) &&
    (skip === "currency" || filters.currency === "all" || x.currency === filters.currency) &&
    (skip === "chain" || filters.chain === "all" || String(x.chainId) === filters.chain) &&
    inRange(x.createdAt, filters.date) &&
    matchesQuery([x.id, x.description, x.amount, x.currency, x.token, x.tokenAddress, x.address, x.paidTxHash, statusLabel(x), currencyName(x.currency, f.lang), chainName(x), ...chargeMethods(x).map((m) => c.methods[m])], filters.q);
  const view = rows.filter((x) => matches(x, null));
  const statusRows = rows.filter((x) => matches(x, "status"));
  const statusCounts = countBy(statusRows, (x) => phaseOf(x));
  const currencyRows = rows.filter((x) => matches(x, "currency"));
  const currencyCounts = countBy(currencyRows, (x) => x.currency);
  const currencyIds = [...new Set<string>([...(market?.currencies ?? []).map((x) => x.id), ...rows.map((x) => x.currency)])];
  const chainRows = rows.filter((x) => matches(x, "chain"));
  const chainCounts = countBy(chainRows, (x) => String(x.chainId));
  const chainIds = [...new Set<number>([...(market?.networks ?? []).map((n) => n.chainId), ...rows.map((x) => Number(x.chainId))])];

  const pg = usePaged(view, JSON.stringify(filters));
  const tref = useRef(null); useGsapRows(tref, pg.page + "|" + view.length);

  // Figures first, counted from the list: how many, how many are open, how many were paid and what
  // they collected in the currency most paid in.
  const weekAgo = Date.now() - WEEK_MS;
  const paid = rows.filter((x) => x.status === "paid");
  const paidBy = countBy(paid, (x) => x.currency);
  const topPaid = Object.entries(paidBy).sort((a, b) => b[1] - a[1])[0]?.[0];
  const collected = topPaid ? paid.filter((x) => x.currency === topPaid).reduce((sum, x) => sum + (Number(x.amount) || 0), 0) : 0;
  const others = Object.keys(paidBy).length - 1;
  const figures = [
    { key: "count", label: c.figures.count, value: String(rows.length), sub: fmt(c.figures.week, { n: rows.filter((x) => Date.parse(x.createdAt) >= weekAgo).length }) },
    { key: "open", label: c.figures.open, value: String(rows.filter((x) => phaseOf(x) === "open").length) },
    { key: "paid", label: c.figures.paid, value: String(paid.length), sub: rows.length ? fmt(c.figures.paidShare, { pct: Math.round((paid.length / rows.length) * 100) }) : undefined },
    {
      key: "collected", label: c.figures.collected, value: topPaid ? f.fiat(String(collected), topPaid) : "0",
      sub: others > 1 ? fmt(c.figures.otherCurrencies, { n: others }) : others === 1 ? c.figures.otherCurrency : undefined,
    },
  ];

  const fiatMark = (x: QrCharge, size = 22) => <CurrencyMark id={x.currency} size={size} />;
  const tokenMark = (x: QrCharge, size = 22) => <RampTokenMark token={{ symbol: x.token, chainId: x.chainId }} networks={networks} size={size} />;
  const linkOf = (x: QrCharge) => safeChargeUrl(x.url, x.id);
  const txUrl = (x: QrCharge) => rampTxExplorer(x.chainId, x.paidTxHash);

  const rowItems = (x: QrCharge) => {
    const open = phaseOf(x) === "open";
    const link = linkOf(x);
    return [
      { key: "open", label: cm.details, icon: DI.docs, onClick: () => setDetail(x) },
      { key: "tab", label: cm.openNewTab, icon: DI.link, href: hrefOf(x.id), external: true },
      { key: "link", label: c.detail.copyLink, icon: <IcCopy />, disabled: !open || !link, hint: c.detail.onlyOpen, onClick: () => link && copy(link, t.toasts.copied) },
      { key: "page", label: c.detail.openPage, icon: DI.payments, href: open ? link : null, external: true, disabled: !open || !link, hint: c.detail.onlyOpen },
      { key: "copy", label: cm.copyId, icon: <IcCopy />, onClick: () => copy(x.id, t.toasts.copied) },
      { key: "explorer", label: c.detail.viewTx, icon: DI.network, href: txUrl(x), external: true, disabled: !txUrl(x), hint: cm.noTxYet },
      ...(canManage ? [{ key: "cancel", label: c.detail.cancel, icon: DI.trash, danger: true, disabled: !open, hint: c.detail.onlyOpen, onClick: () => setToCancel(x) }] : []),
    ];
  };

  return (
    <>
      <ViewHead title={c.title} />
      <ViewFigures items={figures} loading={loading} failed={error} label={c.figuresLabel} />
      {!canManage && <div className="note-bar" style={{ marginBottom: 16 }}>{DI.charges}<span>{c.readOnly}</span></div>}
      {/* The organization's own account for bank transfers: what a charge in pesos needs to take them. */}
      <TransferAccountCard canManage={canManage} orgId={orgId} env={env} />
      <FilterBar
        label={fl.label}
        query={filters.q} onQuery={(v) => set("q", v)} placeholder={c.searchPlaceholder}
        status={{
          label: fl.status, value: filters.status, onChange: (v) => set("status", v),
          options: [
            { key: "all", label: fl.allStatuses, count: statusRows.length },
            ...CHARGE_STATUSES.map((st) => ({ key: st, label: c.status[st], count: statusCounts[st] || 0, icon: <StatusIcon tone={PILL[st].tone} size={16} /> })),
          ],
        }}
        selects={[{
          key: "currency", label: r.currency, value: filters.currency, onChange: (v) => set("currency", v),
          options: [
            { key: "all", label: r.allCurrencies, count: currencyRows.length },
            ...currencyIds.map((id) => ({ key: id, label: `${currencyName(id, f.lang)} (${id})`, icon: <CurrencyMark id={id} size={18} />, count: currencyCounts[id] || 0 })),
          ],
        }, {
          key: "chain", label: fl.network, value: filters.chain, onChange: (v) => set("chain", v),
          options: [
            { key: "all", label: fl.allNetworks, count: chainRows.length },
            ...chainIds.map((id) => ({ key: String(id), label: rampChainName(id, networks), icon: <NetworkMark chain={rampChainMark(id)} size={18} />, count: chainCounts[String(id)] || 0 })),
          ],
        }]}
        date={filters.date} onDate={(v) => set("date", v)}
        active={active} onReset={reset}
        shown={view.length} total={loading ? undefined : rows.length} loading={loading}
        actions={canManage && <button type="button" className="btn btn-dark btn-sm" onClick={() => setCreating(true)}>{DI.plus} {c.create}</button>}
      />
      <div className="panel">
        {loading && <TableSkeleton label={c.loading} cols={7} />}
        {!loading && (
          <div className="t-scroll" tabIndex={0} ref={tref}><table className="tx"><thead><tr>
            <th>{c.head.charge}</th><th>{c.head.amount}</th><th>{c.head.receives}</th><th>{c.head.status}</th><th>{c.head.created}</th><th>{c.head.closes}</th>
            <th><span className="sr-only">{cm.actions}</span></th>
          </tr></thead>
            <tbody>{!error && pg.slice.map((x) => {
              const st = PILL[phaseOf(x)];
              const open = phaseOf(x) === "open";
              const link = linkOf(x);
              return (
                <tr key={x.id} className="row-click" onClick={() => setDetail(x)}>
                  <td className="tid" onClick={(e) => e.stopPropagation()}>
                    <RecordLink
                      href={hrefOf(x.id)} onOpen={() => setDetail(x)} copy={x.id} title={x.id}
                      preview={() => (
                        <PreviewCard
                          label={c.eyebrow} title={x.description || x.id}
                          headline={<><b>{f.fiat(x.amount, x.currency)}</b><span className={`hub-st-t ${st.tone}`}>{statusLabel(x)}</span></>}
                          fields={[[c.head.receives, receives(x)], [c.detail.network, chainName(x)], [c.head.created, fmtDateTime(x.createdAt)]]}
                        />
                      )}
                    >{x.description ? <span className="qrc-name">{x.description}</span> : <code>{shortAddress(x.id)}</code>}</RecordLink>
                  </td>
                  <td className="amt"><span className="cell-mark">{fiatMark(x)}<span>{f.fiat(x.amount, x.currency)}</span></span></td>
                  <td className="amt"><span className="cell-mark">{tokenMark(x)}<span>{receives(x)}<small className="qrc-sub">{chainName(x)}</small></span></span></td>
                  <td><Pill st={st.st} tone={st.tone} label={statusLabel(x)} /></td>
                  <td className="cust">{fmtDateTime(x.createdAt)}</td>
                  <td className="cust">{closesAt(x)}</td>
                  <td className="row-actions" onClick={(e) => e.stopPropagation()}>
                    <button type="button" className="icon-mini" title={cm.details} aria-label={cm.details} onClick={() => setDetail(x)}>{DI.docs}</button>
                    {open && link
                      ? <a className="icon-mini" title={c.detail.openPage} aria-label={`${c.detail.openPage}: ${title(x)}`} href={link} target="_blank" rel="noopener noreferrer">{DI.payments}</a>
                      : <button type="button" className="icon-mini" disabled title={c.detail.onlyOpen} aria-label={`${c.detail.openPage}: ${c.detail.onlyOpen}`}>{DI.payments}</button>}
                    {canManage && (
                      <button type="button" className="icon-mini danger" disabled={!open} title={open ? c.detail.cancel : c.detail.onlyOpen} aria-label={open ? `${c.detail.cancel}: ${title(x)}` : `${c.detail.cancel}: ${c.detail.onlyOpen}`} onClick={() => setToCancel(x)}>{DI.trash}</button>
                    )}
                    <RowMenu label={fmt(cm.rowActions, { name: title(x) })} items={rowItems(x)} />
                  </td>
                </tr>
              );
            })}
              <FillRows n={pg.size - (error ? 0 : pg.count)} cols={7} empty={error ? c.listError : null} />
            </tbody>
          </table></div>
        )}
        {!loading && <Pagination {...pg} />}
      </div>
      {creating && (
        <CreateChargeModal
          market={market} env={env} orgId={orgId}
          onClose={() => setCreating(false)}
          onCreated={(charge) => { upsert(charge); setCreating(false); setDetail(charge); showToast(c.modal.created); }}
        />
      )}
      {detail && (
        <ChargeDetail
          charge={detail} networks={networks} env={env} orgId={orgId} canManage={canManage}
          onUpdate={upsert} onCancel={() => setToCancel(detail)} onClose={() => setDetail(null)}
        />
      )}
      {toCancel && (
        <ConfirmModal
          title={c.detail.cancelTitle} body={c.detail.cancelBody} confirmLabel={c.detail.cancel} cancelLabel={c.detail.keep}
          onConfirm={() => cancel(toCancel)} onClose={() => setToCancel(null)}
        />
      )}
    </>
  );
}

/* A charge's detail: while it is open, its QR (the API's PNG, shown only when it is one) and the
   payer page's link to copy or open; what the payer pays and what the organization receives, the
   ways the payer can pay, the receiving account, the deadline; once paid, how it was paid, what was
   delivered and its transaction (a bank transfer's delivery may report none). An open or processing
   charge is read again every 5 s while this is on screen (and the tab is visible), so it turns
   processing and paid here on its own. */
function ChargeDetail({ charge, networks, env, orgId, canManage, onUpdate, onCancel, onClose }: {
  charge: QrCharge;
  networks?: RampMarket["networks"];
  env: string;
  orgId: string;
  canManage: boolean;
  onUpdate: (charge: QrCharge) => void;
  onCancel: () => void;
  onClose: () => void;
}) {
  const t = useT();
  const c = t.dash.charges;
  const d = c.detail;
  const cm = t.dash.common;
  const f = useFormat();
  const [, copy] = useCopy();
  const phase = chargePhase(charge);
  const live = chargeIsLive(charge);
  const payable = chargeIsPayable(charge);

  // Read it again on opening (the list may be older), then every 5 s while it is open.
  useEffect(() => {
    let alive = true;
    const read = () => {
      onramp.get(`${PATH}/${encodeURIComponent(charge.id)}`, env, orgId)
        .then((rec) => { if (alive && isCharge(rec) && rec.id === charge.id) onUpdate(rec); })
        .catch(() => {});
    };
    read();
    if (!live) return () => { alive = false; };
    const h = setInterval(() => { if (!document.hidden) read(); }, CHARGE_POLL_MS);
    return () => { alive = false; clearInterval(h); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [charge.id, live, env, orgId]);

  // Received or paid while on screen: say so once.
  const was = useRef(charge.status);
  useEffect(() => {
    if (was.current !== "paid" && charge.status === "paid") showToast(d.paid);
    else if (was.current === "open" && charge.status === "processing") showToast(d.processing);
    was.current = charge.status;
  }, [charge.status, d.paid, d.processing]);

  const st = PILL[phase];
  const qr = payable ? safeQrDataUrl(charge.qr) : null;
  const link = safeChargeUrl(charge.url, charge.id);
  const chain = rampChainName(charge.chainId, networks);
  const tx = rampTxExplorer(charge.chainId, charge.paidTxHash);
  const token = (amount: string) => (
    <span className="cell-mark"><RampTokenMark token={{ symbol: charge.token, chainId: charge.chainId }} networks={networks} size={20} /><span>{amount}</span></span>
  );
  // The ways the payer has, in the server's order, one per line.
  const methods = chargeMethods(charge);
  const methodList = methods.length ? <span className="qrc-methods">{methods.map((m) => <span key={m}>{c.methods[m]}</span>)}</span> : null;
  const paidWith = chargePaidMethod(charge);
  const fields: [string, ReactNode][] = [
    [d.pays, <span className="cell-mark"><CurrencyMark id={charge.currency} size={20} /><span>{f.fiat(charge.amount, charge.currency)}</span></span>],
    charge.status === "paid" && charge.paidAmount
      ? [d.received, token([f.units(charge.paidAmount), charge.token].join(NBSP))]
      : [d.estimate, charge.estimatedAmountOut == null ? null : token(["≈", f.units(charge.estimatedAmountOut), charge.token].join(NBSP))],
    paidWith ? [d.payment, paidWith === "transfer" ? d.paidTransfer : d.paidP2p] : [d.methods, methodList],
    [d.network, <span className="cell-mark"><NetworkMark chain={rampChainMark(charge.chainId)} size={18} /><span>{chain}</span></span>],
    [d.address, <AddressLink chain={rampChainMark(charge.chainId)} address={charge.address} label={d.address} networkName={chain} explorer={rampExplorer(charge.chainId, charge.address)} />],
    [d.created, fmtDateTime(charge.createdAt)],
    phase === "paid" ? [d.paidAt, fmtDateTime(charge.paidAt)] : [d.expires, fmtDateTime(charge.expiresAt)],
    [d.tx, charge.paidTxHash ? <TxLink chain={rampChainMark(charge.chainId)} hash={charge.paidTxHash} label={d.txLabel} explorer={tx} networkName={chain} /> : null],
    [d.id, <RecordLink copy={charge.id} title={charge.id}><code>{shortAddress(charge.id)}</code></RecordLink>],
  ];

  return (
    <Modal onClose={onClose} label={charge.description || c.eyebrow}>
      <div className="modal-body qrc-detail">
        <div className="modal-eyebrow">{c.eyebrow}</div>
        <h3>{charge.description || f.fiat(charge.amount, charge.currency)}</h3>
        <p className="qrc-state" role="status" aria-live="polite"><Pill st={st.st} tone={st.tone} label={c.status[phase]} /></p>
        <div className={`qrc-body${payable ? " has-qr" : ""}`}>
          {payable && (
            <figure className="qrc-qr">
              {qr
                ? <img className="paylink-qr" src={qr} alt={d.scan} width={220} height={220} />
                : <div className="paylink-qr paylink-qr-skel" aria-hidden="true" />}
              <figcaption className="paylink-qr-cap">{d.scan}</figcaption>
              {qr && <a className="btn btn-soft btn-sm" href={qr} download={`charge-${charge.id}.png`}>{DI.download} {d.downloadQr}</a>}
            </figure>
          )}
          <div className="qrc-info">
            {payable && link && <CopyBlock label={d.link} value={link} />}
            <div className="paylink-fields">
              {fields.filter(([, v]) => v !== null && v !== undefined && v !== "").map(([k, v]) => (
                <div className="paylink-field" key={k}><span className="pf-k">{k}</span><span className="pf-v">{v}</span></div>
              ))}
            </div>
          </div>
        </div>
        <div className="paylink-actions">
          {payable && link && <a className="btn btn-dark btn-sm" href={link} target="_blank" rel="noopener noreferrer">{DI.payments} {d.openPage}</a>}
          {payable && link && <button type="button" className="btn btn-soft btn-sm" onClick={() => copy(link, t.toasts.copied)}><IcCopy /> {d.copyLink}</button>}
          {tx && <a className="btn btn-soft btn-sm" href={tx} target="_blank" rel="noopener noreferrer">{DI.network} {d.viewTx}</a>}
          <button type="button" className="btn btn-soft btn-sm" onClick={() => copy(charge.id, t.toasts.copied)}><IcCopy /> {cm.copyId}</button>
          {canManage && payable && <button type="button" className="btn btn-soft danger-soft btn-sm" onClick={onCancel}>{DI.trash} {d.cancel}</button>}
        </div>
      </div>
    </Modal>
  );
}

/* The create dialog, in three steps (product owner, 2026-10-27: a long form goes in steps): the
   amount in local money with what it buys at the market price; the token, on its network, and the
   account it is delivered to; the description and how long it can be paid, with who does what once
   the QR is shown. "Next" only once the step is valid; the server checks the terms again. */
function CreateChargeModal({ market, env, orgId, onClose, onCreated }: {
  market: RampMarket | null | undefined;
  env: string;
  orgId: string;
  onClose: () => void;
  onCreated: (charge: QrCharge) => void;
}) {
  const t = useT();
  const c = t.dash.charges;
  const m = c.modal;
  const w = t.dash.ramp.widget;
  const f = useFormat();
  const [currency, setCurrency] = useState("");
  const [amount, setAmount] = useState("");
  const [token, setToken] = useState<RampToken | null>(null);
  const [mode, setMode] = useState<"wallet" | "typed">("wallet");
  const [wallet, setWallet] = useState("");
  const [typed, setTyped] = useState("");
  const [description, setDescription] = useState("");
  const [expires, setExpires] = useState<number>(DEFAULT_EXPIRY);
  const [picker, setPicker] = useState<null | "currency" | "token">(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const currencies = market?.currencies ?? [];
  const networks = market?.networks ?? [];
  // Defaults as the ramp's: pesos when they can be paid with, else the first currency; the token
  // the marketplace settles in, read again from its list for its USD price and logo.
  useEffect(() => {
    if (!market) return;
    const first = market.currencies.find((x) => x.id === "ARS") ?? market.currencies[0];
    setCurrency((id) => (market.currencies.some((x) => x.id === id) ? id : first?.id ?? ""));
    const dt = market.defaultToken;
    setToken((tk) => tk ?? dt);
    let alive = true;
    onramp.get("p2p/tokens", env, orgId, { chainId: dt.chainId, q: dt.address, take: 1 })
      .then((page) => {
        const hit = Array.isArray(page?.data) ? page.data[0] : null;
        if (alive && hit) setToken((tk) => (tk && tk.chainId === hit.chainId && tk.address.toLowerCase() === hit.address.toLowerCase() ? { ...tk, priceUsd: hit.priceUsd, logoUrl: hit.logoUrl, main: hit.main } : tk));
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [market, env, orgId]);

  // The organization's EVM wallets (Monad's, proven with a personal_sign: plain accounts, the same
  // address on every EVM network). None, or none readable: the address is typed.
  const orgWallets = useOrgWallets(orgId);
  const evmWallets = useMemo(() => (orgWallets || []).filter((x: any) => x.chain === "monad"), [orgWallets]);
  const hasWallets = evmWallets.length > 0;
  const useWallet = hasWallets && mode === "wallet";
  useEffect(() => {
    if (hasWallets && !evmWallets.some((x: any) => sameEvmAccount(x.address, wallet))) setWallet(evmWallets[0].address);
  }, [hasWallets, evmWallets, wallet]);

  const cur = currencies.find((x) => x.id === currency) ?? null;
  const usd = tokenUsd(token);
  const chain = token ? rampChainName(token.chainId, networks) : "";
  const amountProblem = chargeAmountProblem(amount, cur?.minAmount);
  const minText = cur ? f.fiat(cur.minAmount, cur.id) : "";
  const estimate = amountProblem === null && cur ? chargeEstimate(amount, cur.price, usd) : null;
  const perToken = cur && usd ? Number(cur.price) * usd : null;
  const address = useWallet ? wallet : typed;
  const addressProblem = evmAddressProblem(address);
  const descProblem = descriptionProblem(description);
  const body = chargeBody({
    currency, amount, minAmount: cur?.minAmount, chainId: token?.chainId, token: token?.address,
    address, description, expiresInMinutes: expires,
  });

  const steps = useFormSteps(3);
  const stepOk = [!!cur && amountProblem === null, !!token && addressProblem === null, descProblem === null && !!body];

  const amountError = amount.trim() === "" ? null
    : amountProblem === "shape" ? w.ctaAmountBad
    : amountProblem === "min" ? fmt(w.ctaMin, { min: minText })
    : null;
  const addressError = typed.trim() === "" || useWallet ? null
    : addressProblem === "shape" ? m.addressShape
    : addressProblem === "checksum" ? m.addressChecksum
    : null;
  const descError = descProblem === "long" ? m.descriptionLong : descProblem === "line" ? m.descriptionLine : null;

  const submit = async () => {
    if (!body || busy) return;
    setBusy(true);
    setProblem(null);
    try {
      const created = await onramp.post(PATH, env, orgId, body);
      if (!isCharge(created)) throw new Error(m.createError);
      onCreated(created);
    } catch (e: any) {
      // The server's reason (a term the market no longer takes) under the dialog's own words.
      setProblem(e?.message && e.message !== m.createError ? `${m.createError} ${e.message}` : m.createError);
    } finally {
      setBusy(false);
    }
  };

  const chev = <svg className="token-btn-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>;
  const curLabel = (id: string) => currencyName(id, f.lang, currencies.find((x) => x.id === id)?.name);
  const oneToken = networks.length === 1 && networks[0].tokenCount <= 1;
  const estimateText = estimate !== null && token ? fmt(m.estimate, { amount: f.units(estimate), token: token.symbol }) : "";

  const rateLine = cur && token && perToken !== null && (
    <div className="sq">
      <div className="sq-head">
        <span className="sq-rate">{`1 ${token.symbol} = ${f.rate(perToken)} ${cur.id}`}</span>
        <span className="sq-src">{w.market}</span>
      </div>
    </div>
  );

  return (
    <Modal onClose={onClose} label={m.title}>
      <div className="modal-body qrc-form">
        <div className="modal-eyebrow">{c.eyebrow}</div>
        <h3>{m.title}</h3>
        {market === undefined && (
          <div className="qrc-wait" aria-busy="true" aria-label={c.loading}><Sk className="lg" w="100%" /><Sk w="60%" /></div>
        )}
        {market === null && <p className="field-err" role="alert">{t.dash.ramp.marketError}</p>}
        {market && (
          <>
            <FormSteps names={[m.steps.amount, m.steps.receive, m.steps.details]} steps={steps} />
            <FormStep steps={steps}>
              {steps.step === 0 && (<>
                <div className="fld">
                  <div className="sp pl-amount">
                    <div className="sp-top"><label htmlFor="qrc-amount">{m.pays}</label>{cur && <span className="sp-usd">{fmt(w.min, { min: minText })}</span>}</div>
                    <div className="sp-row">
                      <input
                        id="qrc-amount" className="sp-amount" inputMode="decimal" autoComplete="off" placeholder="0" value={amount}
                        onChange={(e) => setAmount(e.target.value.trim().replace(",", "."))}
                        aria-invalid={amountError ? true : undefined} aria-describedby={amountError ? "qrc-amount-e" : "qrc-estimate"}
                      />
                      <button type="button" className="token-btn" onClick={() => setPicker("currency")} aria-haspopup="dialog" disabled={currencies.length < 2}
                        aria-label={fmt(w.changeCurrency, { currency: cur ? curLabel(cur.id) : "" })}>
                        {cur && <CurrencyMark id={cur.id} />}
                        <span className="token-btn-t"><b>{cur?.id ?? "-"}</b><small>{cur ? curLabel(cur.id) : ""}</small></span>
                        {currencies.length > 1 && chev}
                      </button>
                    </div>
                  </div>
                  {amountError && <p className="field-err" id="qrc-amount-e" role="alert">{amountError}</p>}
                </div>
                {rateLine}
                <p className={`qrc-est${estimateText ? "" : " is-empty"}`} id="qrc-estimate" aria-live="polite">
                  {estimateText ? <span className="arrive" key={estimateText}>{estimateText}</span> : null}
                </p>
              </>)}

              {steps.step === 1 && (<>
                <div className="sp sp-get qrc-get">
                  <div className="sp-top"><span id="qrc-get-l">{m.token}</span></div>
                  <div className="sp-row">
                    <output className={`sp-amount is-estimate${estimate !== null ? "" : " is-empty"}`} aria-labelledby="qrc-get-l">
                      {estimate !== null ? `≈ ${f.units(estimate)}` : "0"}
                    </output>
                    {token && (oneToken
                      ? <span className="token-btn is-fixed"><RampTokenMark token={token} networks={networks} /><span className="token-btn-t"><b>{token.symbol}</b><small>{chain}</small></span></span>
                      : (
                        <button type="button" className="token-btn" onClick={() => setPicker("token")} aria-haspopup="dialog" aria-label={fmt(w.changeToken, { token: token.symbol, chain })}>
                          <RampTokenMark token={token} networks={networks} />
                          <span className="token-btn-t"><b>{token.symbol}</b><small>{chain}</small></span>
                          {chev}
                        </button>
                      ))}
                  </div>
                </div>

                {hasWallets && (
                  <div className="fld">
                    <span className="field-l" id="qrc-mode-l">{m.receive}</span>
                    <div className="zka-choices" role="radiogroup" aria-labelledby="qrc-mode-l">
                      {(["wallet", "typed"] as const).map((k) => (
                        <button key={k} type="button" role="radio" aria-checked={mode === k} className={`zka-choice${mode === k ? " on" : ""}`} onClick={() => setMode(k)}>
                          <span className="zka-choice-mark" aria-hidden="true">{mode === k && <IcCheck />}</span>
                          <span>
                            <b>{k === "wallet" ? m.modeWallet : m.modeTyped}</b>
                            <span className="zka-choice-d">{k === "wallet" ? m.modeWalletDesc : m.modeTypedDesc}</span>
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {orgWallets === undefined && <Sk className="lg" w="100%" />}
                {useWallet ? (
                  <div className="fld arrive">
                    <span className="field-l" id="qrc-wallet-l">{m.wallet}</span>
                    <Select
                      id="qrc-wallet" labelledBy="qrc-wallet-l" describedBy="qrc-wallet-h" value={evmWallets.find((x: any) => sameEvmAccount(x.address, wallet))?.address ?? ""}
                      onChange={setWallet}
                      options={evmWallets.map((x: any) => ({ value: x.address, label: x.label || shortAddress(x.address), hint: x.label ? shortAddress(x.address) : undefined, icon: <NetworkMark chain={token ? rampChainMark(token.chainId) : "monad"} size={22} /> }))}
                    />
                    <p className="field-help" id="qrc-wallet-h">{fmt(m.walletHint, { network: chain })}</p>
                  </div>
                ) : orgWallets !== undefined && (
                  <div className="arrive">
                    <Field
                      label={fmt(m.address, { network: chain })} hint={fmt(m.addressHint, { network: chain })}
                      value={typed} onChange={(e) => setTyped(e.target.value)}
                      placeholder={t.dash.ramp.addressPlaceholder} autoComplete="off" spellCheck={false}
                      aria-invalid={addressError ? true : undefined}
                    />
                    {addressError && <p className="field-err" role="alert">{addressError}</p>}
                  </div>
                )}
              </>)}

              {steps.step === 2 && (<>
                <Field
                  label={<>{m.description} <span className="field-hint">{t.dash.common.optional}</span></>} hint={m.descriptionHint}
                  value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t.dash.examples.order} maxLength={160}
                  aria-invalid={descError ? true : undefined}
                />
                {descError && <p className="field-err" role="alert">{descError}</p>}
                <div className="fld">
                  <span className="field-l" id="qrc-expires-l">{m.expires}</span>
                  <div className="seg-tabs seg-fill" role="group" aria-labelledby="qrc-expires-l">
                    {EXPIRY_PRESETS.map((min) => (
                      <button key={min} type="button" className={expires === min ? "on" : ""} aria-pressed={expires === min} onClick={() => setExpires(min)}>{m.expiries[`m${min}`]}</button>
                    ))}
                  </div>
                </div>
                {/* Who does what once the QR is shown: a list, each step with who takes it. */}
                <ol className="zka-sigs qrc-flow" aria-label={m.flowLabel}>
                  {(["scan", "verify", "paid"] as const).map((k, i) => (
                    <li key={k}>
                      <span className="fstep-n" aria-hidden="true">{i + 1}</span>
                      <span className="zka-sig-t">{m.flow[k]}</span>
                      <span className="zka-sig-who">{k === "paid" ? m.who.cosmos : m.who.payer}</span>
                    </li>
                  ))}
                </ol>
              </>)}
            </FormStep>
            {problem && <p className="field-err" role="alert">{problem}</p>}
            <FormStepsFooter
              steps={steps} canNext={stepOk[steps.step]} onCancel={onClose}
              submitLabel={busy ? m.submitting : m.submit} onSubmit={submit} busy={busy} submitDisabled={!body}
            />
          </>
        )}
      </div>

      {picker === "currency" && (
        <RampPicker
          title={m.pickCurrency}
          selected={currency}
          searchable={currencies.length > 6}
          items={currencies.map((x) => ({
            key: x.id, mark: <CurrencyMark id={x.id} size={34} />, title: x.id, sub: curLabel(x.id),
            aside: token && usd ? `1 ${token.symbol} = ${f.rate(Number(x.price) * usd)} ${x.id}` : undefined,
            search: [x.id, x.name, curLabel(x.id), ...x.paymentMethods.map((pm) => pm.name)].join(" "),
          }))}
          onPick={(id) => { setPicker(null); setCurrency(id); }}
          onClose={() => setPicker(null)}
        />
      )}
      {picker === "token" && token && (
        <RampTokenSheet
          side="buy" env={env} orgId={orgId} networks={networks} selected={token}
          onPick={(tk) => { setPicker(null); setToken(tk); }}
          onClose={() => setPicker(null)}
        />
      )}
    </Modal>
  );
}
