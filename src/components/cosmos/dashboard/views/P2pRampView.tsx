/* P2pRampView: the Fiat group's On-ramp (side "buy": local money to stablecoins, paid to P2P
   sellers; the Payments API's /v1/onramp/p2p) and Off-ramp (side "sell": stablecoins to local money,
   paid by P2P buyers; /v1/offramp/p2p), through the dashboard's /api/onramp and /api/offramp proxies.
   The Swaps view's layout (product owner: "take the swap as the example"): its figures, the filter
   row with the view's button, which opens the ramp widget in a dialog (components/RampWidget.tsx),
   then the sessions opened as the Payments table, each row opening its detail with the hosted
   window's link. The provider is never named ("Never name a provider"). */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useT, useLang, fmt } from "@/lib/i18n/index";
import { DI } from "@/components/cosmos/dashboard/icons";
import { fmtDateTime } from "@/components/cosmos/dashboard/helpers";
import { usePaged, useGsapRows, useListFilters, useUrlRequest } from "@/components/cosmos/dashboard/hooks";
import { Modal, showToast } from "@/components/cosmos/shared";
import { IcCopy } from "@/components/cosmos/icons";
import { useCopy } from "@/components/cosmos/hooks/useCopy";
import { ViewHead } from "@/components/cosmos/dashboard/components/ViewHead";
import { ViewFigures } from "@/components/cosmos/dashboard/components/ActivityPanel";
import { FilterBar } from "@/components/cosmos/dashboard/components/FilterBar";
import { TableSkeleton } from "@/components/cosmos/dashboard/components/Skeleton";
import { FillRows } from "@/components/cosmos/dashboard/components/FillRows";
import { Pagination } from "@/components/cosmos/dashboard/components/Pagination";
import { RowMenu } from "@/components/cosmos/dashboard/components/RowMenu";
import { RecordLink } from "@/components/cosmos/dashboard/components/RecordLink";
import { RecordDetail } from "@/components/cosmos/dashboard/components/RecordDetail";
import { PreviewCard, shortAddress } from "@/components/cosmos/dashboard/components/RecordPreview";
import { AddressLink } from "@/components/cosmos/dashboard/components/AddressLink";
import { TokenMark } from "@/components/cosmos/dashboard/components/TokenMark";
import {
  RampWidget, CurrencyMark, currencyName, methodName, rampApi, rampChainName, rampExplorer,
  type RampMarket, type RampSide,
} from "@/components/cosmos/dashboard/components/RampWidget";
import { DATE_RANGES, countBy, inRange, matchesQuery } from "@/lib/dashboard-filters";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export function P2pRampView({ side, canManage = false, orgId, env = "dev" }: { side: RampSide; canManage?: boolean; orgId: string; env?: string }) {
  const t = useT();
  const lang = useLang();
  const r = t.dash.ramp;
  const s = r[side];
  const fl = t.dash.filters;
  const cm = t.dash.common;
  const [, copy] = useCopy();
  // undefined while it loads, null when it could not be read.
  const [market, setMarket] = useState<RampMarket | null | undefined>(undefined);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [creating, setCreating] = useState(false);
  const [detail, setDetail] = useState<any>(null);
  const defaults = useMemo(() => ({ q: "", currency: "all", date: "any" }), []);
  const { filters, set, reset, active } = useListFilters(defaults, { date: DATE_RANGES });

  // The market and the sessions together; an answer for an organization or environment the
  // view has since left is dropped.
  useEffect(() => {
    let current = true;
    setMarket(undefined);
    setLoading(true);
    const api = rampApi(side);
    api.get("p2p/market", env, orgId)
      .then((m) => { if (current) setMarket(m && Array.isArray(m.currencies) ? m : null); })
      .catch(() => { if (current) setMarket(null); });
    api.get("p2p/sessions", env, orgId)
      .then((res) => { if (current) { setRows(Array.isArray(res?.data) ? res.data : []); setError(false); } })
      .catch(() => { if (current) { setRows([]); setError(true); } })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [side, orgId, env]);

  // The overview or a link may ask for the widget (?create=1) or a session (?open=<id>).
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
    rampApi(side).get(`p2p/sessions/${encodeURIComponent(openId)}`, env, orgId)
      .then((rec) => (rec && rec.id ? setDetail(rec) : showToast(cm.notFound, "error")))
      .catch(() => showToast(cm.notFound, "error"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openId, loading]);

  const num = (v, max = 2) => {
    const n = Number(v);
    return Number.isFinite(n) ? new Intl.NumberFormat(lang, { maximumFractionDigits: max }).format(n) : String(v ?? "");
  };
  const methodLabel = useCallback((row) => {
    const m = market?.currencies.find((c) => c.id === row.currency)?.paymentMethods.find((x) => x.id === row.paymentMethod);
    return m ? methodName(m.name, row.currency) : row.paymentMethod;
  }, [market]);
  // What each row pays and receives, in the side's direction.
  // No break inside an amount (NBSP): "120,000 ARS" wraps as a whole in a narrow cell.
  const NBSP = String.fromCharCode(160);
  const paid = (x) => [num(x.amount), side === "buy" ? x.currency : x.token].join(NBSP);
  const got = (x) => ["≈", num(x.estimatedAmountOut), side === "buy" ? x.token : x.currency].join(NBSP);
  const fiatMark = (x, size = 22) => <CurrencyMark id={x.currency} size={size} />;
  const tokenMark = (x, size = 22) => <TokenMark symbol={x.token} chain="arb" chainName={rampChainName(x.chainId)} size={size} />;

  const matches = (x, skip) =>
    (skip === "currency" || filters.currency === "all" || x.currency === filters.currency) &&
    inRange(x.createdAt, filters.date) &&
    matchesQuery([x.id, x.address, x.currency, x.token, x.amount, x.estimatedAmountOut, x.reference, methodLabel(x), currencyName(x.currency, lang)], filters.q);
  const view = rows.filter((x) => matches(x, null));
  const currencyRows = rows.filter((x) => matches(x, "currency"));
  const currencyCounts = countBy(currencyRows, (x) => x.currency);
  const currencyIds = [...new Set<string>([...(market?.currencies ?? []).map((c) => c.id), ...rows.map((x) => x.currency)])];

  const pg = usePaged(view, JSON.stringify(filters));
  const tref = useRef(null); useGsapRows(tref, pg.page + "|" + view.length);

  // Figures first, counted from the list.
  const weekAgo = Date.now() - WEEK_MS;
  const stable = rows.reduce((sum, x) => sum + (Number(side === "buy" ? x.estimatedAmountOut : x.amount) || 0), 0);
  const byCurrency = countBy(rows, (x) => x.currency);
  const topCurrency = Object.entries(byCurrency).sort((a, b) => b[1] - a[1])[0]?.[0];
  const figures = [
    { key: "count", label: s.figures.count, value: String(rows.length) },
    { key: "week", label: s.figures.week, value: String(rows.filter((x) => new Date(x.createdAt).getTime() >= weekAgo).length) },
    { key: "stable", label: s.figures.stable, value: num(stable) },
    { key: "currencies", label: s.figures.currencies, value: String(Object.keys(byCurrency).length), sub: topCurrency ? fmt(s.figures.top, { currency: currencyName(topCurrency, lang) }) : undefined },
  ];

  const onCreated = (session, opened) => {
    setRows((list) => [session, ...list]);
    setCreating(false);
    showToast(opened ? s.opened : s.blocked, opened ? "success" : "error");
  };

  const rowItems = (x) => [
    { key: "open", label: cm.details, icon: DI.docs, onClick: () => setDetail(x) },
    { key: "window", label: s.openWindow, icon: DI.link, href: x.widgetUrl, external: true },
    { key: "link", label: s.copyLink, icon: <IcCopy />, onClick: () => copy(x.widgetUrl, t.toasts.copied) },
    { key: "copy", label: cm.copyId, icon: <IcCopy />, onClick: () => copy(x.id, t.toasts.copied) },
  ];
  const addressCell = (x) => (
    <AddressLink chain="arb" address={x.address} label={s.addressRole} networkName={rampChainName(x.chainId)} explorer={rampExplorer(x.chainId, x.address)} />
  );

  return (
    <>
      <ViewHead title={s.title} />
      <ViewFigures items={figures} loading={loading} failed={error} label={s.figuresLabel} />
      {!canManage && <div className="note-bar" style={{ marginBottom: 16 }}>{DI.link}<span>{s.readOnly}</span></div>}
      <FilterBar
        label={fl.label}
        query={filters.q} onQuery={(v) => set("q", v)} placeholder={s.searchPlaceholder}
        selects={[{
          key: "currency", label: r.currency, value: filters.currency, onChange: (v) => set("currency", v),
          options: [
            { key: "all", label: r.allCurrencies, count: currencyRows.length },
            ...currencyIds.map((id) => ({ key: id, label: `${currencyName(id, lang)} (${id})`, icon: <CurrencyMark id={id} size={18} />, count: currencyCounts[id] || 0 })),
          ],
        }]}
        date={filters.date} onDate={(v) => set("date", v)}
        active={active} onReset={reset}
        shown={view.length} total={loading ? undefined : rows.length} loading={loading}
        actions={canManage && <button type="button" className="btn btn-dark btn-sm" onClick={() => setCreating(true)}>{DI.plus} {s.create}</button>}
      />
      {creating && (
        <Modal onClose={() => setCreating(false)} label={s.widgetTitle}>
          <div className="modal-body swap-modal">
            <RampWidget side={side} market={market} env={env} orgId={orgId} onCreated={onCreated} />
          </div>
        </Modal>
      )}
      <div className="panel">
        {loading && <TableSkeleton label={s.loading} cols={7} />}
        {!loading && (
          <div className="t-scroll" tabIndex={0} ref={tref}><table className="tx"><thead><tr>
            <th>{s.head.id}</th><th>{s.head.pays}</th><th>{s.head.receives}</th><th>{s.head.method}</th><th>{s.head.address}</th><th>{s.head.created}</th>
            <th><span className="sr-only">{cm.actions}</span></th>
          </tr></thead>
            <tbody>{!error && pg.slice.map((x) => (
              <tr key={x.id} className="row-click" onClick={() => setDetail(x)}>
                <td className="tid" onClick={(e) => e.stopPropagation()}>
                  <RecordLink
                    href={`/dashboard?view=${side === "buy" ? "onramp" : "offramp"}&open=${encodeURIComponent(x.id)}`} onOpen={() => setDetail(x)} copy={x.id} title={x.id}
                    preview={() => <PreviewCard label={s.head.id} title={x.id} headline={<b>{paid(x)} → {got(x)}</b>} fields={[[s.head.method, methodLabel(x)], [s.head.created, fmtDateTime(x.createdAt)]]} />}
                  ><code>{shortAddress(x.id)}</code></RecordLink>
                </td>
                <td className="amt"><span className="cell-mark">{side === "buy" ? fiatMark(x) : tokenMark(x)}<span>{paid(x)}</span></span></td>
                <td className="amt"><span className="cell-mark">{side === "buy" ? tokenMark(x) : fiatMark(x)}<span>{got(x)}</span></span></td>
                <td className="cust">{methodLabel(x)}</td>
                <td onClick={(e) => e.stopPropagation()}>{addressCell(x)}</td>
                <td className="cust">{fmtDateTime(x.createdAt)}</td>
                <td className="row-actions" onClick={(e) => e.stopPropagation()}>
                  <button type="button" className="icon-mini" title={cm.details} aria-label={cm.details} onClick={() => setDetail(x)}>{DI.docs}</button>
                  <a className="icon-mini" title={s.openWindow} aria-label={`${s.openWindow}: ${shortAddress(x.id)}`} href={x.widgetUrl} target="_blank" rel="noopener noreferrer">{DI.link}</a>
                  <RowMenu label={fmt(cm.rowActions, { name: shortAddress(x.id) })} items={rowItems(x)} />
                </td>
              </tr>
            ))}
              <FillRows n={pg.size - (error ? 0 : pg.count)} cols={7} empty={error ? s.listError : null} />
            </tbody>
          </table></div>
        )}
        {!loading && <Pagination {...pg} />}
      </div>
      {detail && (
        <RecordDetail
          eyebrow={s.eyebrow} title={detail.id} onClose={() => setDetail(null)}
          fields={[
            [s.head.pays, <span className="cell-mark">{side === "buy" ? fiatMark(detail, 20) : tokenMark(detail, 20)}<span>{paid(detail)}</span></span>],
            [s.head.receives, <span className="cell-mark">{side === "buy" ? tokenMark(detail, 20) : fiatMark(detail, 20)}<span>{got(detail)}</span></span>],
            [s.head.method, methodLabel(detail)],
            [s.head.address, addressCell(detail)],
            [r.network, rampChainName(detail.chainId)],
            [r.reference, <code>{detail.reference}</code>],
            [s.head.created, fmtDateTime(detail.createdAt)],
          ]}
          actions={[
            { key: "window", label: s.openWindow, icon: DI.link, href: detail.widgetUrl, kind: "dark" },
            { key: "link", label: s.copyLink, icon: <IcCopy />, onClick: () => copy(detail.widgetUrl, t.toasts.copied) },
            { key: "copy", label: cm.copyId, icon: <IcCopy />, onClick: () => copy(detail.id, t.toasts.copied) },
          ]}
        />
      )}
    </>
  );
}
