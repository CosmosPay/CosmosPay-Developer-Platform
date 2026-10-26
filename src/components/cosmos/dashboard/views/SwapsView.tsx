/* SwapsView: every swap of the organization in one list and one form, whatever the chains. On
   one chain the Payments API routes it through that chain's market (the Stellar DEX, Jupiter on
   Solana, Kuru Flow on Monad); between two chains NEAR Intents settles it; USDT0 out of Stellar
   goes through LayerZero's OFT. Non-custodial: the API builds the transaction or the deposit
   address, the person's wallet signs and pays. The form and the screens a swap opens are shared
   with the public swap pages (components/SwapWidget.tsx, components/SwapDetails.tsx); here they
   call the organization's proxies (orgSwapApi). */
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useT } from "@/lib/i18n/index";
import { swaps as swapsApi, crossChainSwaps as crossApi, usdt0 as usdt0Api } from "@/lib/api-client";
import { orgSwapApi } from "@/lib/swap-api";
import { DI } from "@/components/cosmos/dashboard/icons";
import { fmtDateTime } from "@/components/cosmos/dashboard/helpers";
import { ViewActivity } from "@/components/cosmos/dashboard/components/ActivityPanel";
import { RecordLink } from "@/components/cosmos/dashboard/components/RecordLink";
import { PreviewCard } from "@/components/cosmos/dashboard/components/RecordPreview";
import { usePaged, useGsapRows, usePolling, useListFilters, useUrlRequest } from "@/components/cosmos/dashboard/hooks";
import { showToast } from "@/components/cosmos/shared";
import { Pill } from "@/components/cosmos/dashboard/components/Pill";
import { ViewHead } from "@/components/cosmos/dashboard/components/ViewHead";
import { FilterBar } from "@/components/cosmos/dashboard/components/FilterBar";
import { TableSkeleton } from "@/components/cosmos/dashboard/components/Skeleton";
import { Pagination } from "@/components/cosmos/dashboard/components/Pagination";
import { FillRows } from "@/components/cosmos/dashboard/components/FillRows";
import { SwapWidget } from "@/components/cosmos/dashboard/components/SwapWidget";
import { SwapRecordDetail } from "@/components/cosmos/dashboard/components/SwapDetails";
import { CHAINS, NETWORK_IDS, assetLabel as chainAssetLabel, networkName } from "@/lib/chains";
import { DATE_RANGES, countBy, inRange, matchesQuery } from "@/lib/dashboard-filters";

/* One vocabulary for every kind: a swap on one chain (PENDING → SUBMITTED → SUCCEEDED), one
   between chains (AWAITING_DEPOSIT → … → SUCCEEDED or REFUNDED) and USDT0 out of Stellar
   (PENDING → SUBMITTED → DELIVERED). */
const GROUPS = ["open", "succeeded", "refunded", "failed", "expired"];
const groupOf = (status) =>
  status === "SUCCEEDED" || status === "DELIVERED" ? "succeeded" : status === "FAILED" ? "failed" : status === "EXPIRED" ? "expired" : status === "REFUNDED" ? "refunded" : "open";
const GROUP_PILL = { open: "pend", succeeded: "ok", refunded: "ref", failed: "fail", expired: "fail" };
const TYPES = ["same", "cross", "usdt0"];

const chainOfSwap = (s) => s.chain || "stellar";
const asList = (res) => (Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : []);

/* Both kinds of swap as one kind of row. */
function sameRow(s) {
  const chain = chainOfSwap(s);
  return {
    key: `s:${s.id}`, kind: "same", id: s.id, from: chain, to: chain, status: s.status, createdAt: s.createdAt, raw: s,
    sent: `${s.sendAmount ?? "-"} ${chainAssetLabel(chain, s.sendAsset)}`,
    got: `${s.destEstimated ?? s.swapAmount ?? "-"} ${chainAssetLabel(chain, s.destAsset)}`,
    search: [s.id, s.source, s.destination, s.sendAsset, s.destAsset, s.txHash, s.memo],
  };
}
function usdt0Row(u) {
  return {
    key: `u:${u.id}`, kind: "usdt0", id: u.id, from: "stellar", to: u.to, status: u.status, createdAt: u.createdAt, raw: u,
    sent: `${u.amountSent ?? u.amount} USDT0`,
    got: `${u.amountReceived ?? "-"} ${u.receives ?? "USDT0"}`,
    search: [u.id, u.source, u.recipient, u.txHash, u.guid],
  };
}
function crossRow(x) {
  return {
    key: `x:${x.id}`, kind: "cross", id: x.id, from: x.originChain, to: x.destinationChain, status: x.status, createdAt: x.createdAt, raw: x,
    sent: `${x.amountIn} ${x.originAsset}`,
    got: `${x.amountOut || `~${x.amountOutEstimated}`} ${x.destinationAsset}`,
    search: [x.id, x.recipient, x.refundTo, x.depositAddress, x.originAsset, x.destinationAsset],
  };
}

export function SwapsView({ canManage = true, orgId, env = "dev", defaultType = "all" }) {
  const t = useT();
  const sw = t.dash.swaps;
  const cc = t.dash.crossChain;
  const fl = t.dash.filters;
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const defaults = useMemo(() => ({ q: "", status: "all", type: defaultType, chain: "all", date: "any" }), [defaultType]);
  const { filters, set, reset, active } = useListFilters(defaults, { status: ["all", ...GROUPS], type: ["all", ...TYPES], chain: ["all", ...NETWORK_IDS], date: DATE_RANGES });
  const [detail, setDetail] = useState(null);
  const api = useMemo(() => orgSwapApi(orgId, env), [orgId, env]);

  // Swaps on each chain, between chains and USDT0's transfers are five lists upstream; read
  // together, newest first.
  const fetchAll = useCallback(() => Promise.all([
    ...CHAINS.map((c) => swapsApi.list(orgId, env, { take: 100, chain: c }).then(asList).catch(() => null)),
    crossApi.list(orgId, env, { take: 100 }).then(asList).catch(() => null),
    usdt0Api.list(orgId, env, { take: 100 }).then(asList).catch(() => null),
  ]).then((parts) => {
    if (parts.every((p) => p === null)) throw new Error("unavailable");
    return [
      ...parts.slice(0, CHAINS.length).flatMap((p) => (p || []).map(sameRow)),
      ...(parts[CHAINS.length] || []).map(crossRow),
      ...(parts[CHAINS.length + 1] || []).map(usdt0Row),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }), [orgId, env]);
  const load = useCallback(() => {
    setLoading(true);
    fetchAll().then((list) => { setRows(list); setError(false); }).catch(() => setError(true)).finally(() => setLoading(false));
  }, [fetchAll]);
  useEffect(() => { load(); }, [load]);
  // Live refresh while the tab is visible, so a swap settling on-chain flips its status.
  const refresh = useCallback(() => { fetchAll().then(setRows).catch(() => {}); }, [fetchAll]);
  usePolling(refresh, 10000, { immediate: false });

  // A swap named from elsewhere (a notification) opens once the list is here, read by id from
  // each kind's route when the list does not hold it.
  const [openId, clearOpen] = useUrlRequest("open");
  useEffect(() => {
    if (!openId || loading) return;
    clearOpen();
    const hit = rows.find((r) => r.id === openId);
    if (hit) { setDetail(hit); return; }
    (async () => {
      for (const [kind, toRow] of [["same", sameRow], ["cross", crossRow], ["usdt0", usdt0Row]] as const) {
        try { const rec = await api.get(kind, openId); if (rec && rec.id) { setDetail(toRow(rec)); return; } } catch (e) {}
      }
      showToast(t.dash.common.notFound, "error");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openId, loading]);

  const matches = (r, skip) =>
    (skip === "status" || filters.status === "all" || groupOf(r.status) === filters.status) &&
    (skip === "type" || filters.type === "all" || r.kind === filters.type) &&
    (skip === "chain" || filters.chain === "all" || r.from === filters.chain || r.to === filters.chain) &&
    inRange(r.createdAt, filters.date) &&
    matchesQuery([...r.search, r.sent, r.got, networkName(r.from), networkName(r.to)], filters.q);
  const view = rows.filter((r) => matches(r, null));
  const groupCounts = countBy(rows.filter((r) => matches(r, "status")), (r) => groupOf(r.status));
  const typeCounts = countBy(rows.filter((r) => matches(r, "type")), (r) => r.kind);
  const chainRows = rows.filter((r) => matches(r, "chain"));
  // The networks to filter by: ours, and any other a swap went through.
  const networks = [...new Set<string>([...CHAINS, ...rows.flatMap((r) => [r.from, r.to])])];
  const chainCounts = Object.fromEntries(networks.map((c) => [c, chainRows.filter((r) => r.from === c || r.to === c).length]));

  const pg = usePaged(view, JSON.stringify(filters));
  const tref = useRef(null); useGsapRows(tref, pg.page + "|" + view.length);

  // A swap the widget opened joins the list and opens its detail (to sign, or to fund).
  const onCreated = (kind, rec) => { const row = kind === "cross" ? crossRow(rec) : kind === "usdt0" ? usdt0Row(rec) : sameRow(rec); setRows((r) => [row, ...r]); setDetail(row); };
  const statusLabel = (r) => (r.kind === "cross" ? cc.status[r.status] : sw.status[r.status]) || r.status;
  const chainsLabel = (r) => (r.from !== r.to ? `${networkName(r.from)} → ${networkName(r.to)}` : networkName(r.from));

  return (
    <>
      <ViewHead title={sw.title} />
      {canManage ? <SwapWidget api={api} tier={env === "prod" ? "public" : "testnet"} onCreated={onCreated} /> : <div className="note-bar" style={{ marginBottom: 16 }}>{DI.link}<span>{sw.readOnly}</span></div>}
      {/* Its own figures and chart: swaps of every kind and the completed ones. */}
      <ViewActivity env={env} metrics={["swaps"]} id="swaps-activity" />
      <div className="hub-section-head swaps-list-head"><h2 id="swaps-list-h">{sw.listTitle}</h2></div>
      <FilterBar
        label={fl.label}
        query={filters.q} onQuery={(v) => set("q", v)} placeholder={sw.searchPlaceholder}
        status={{
          label: fl.status, value: filters.status, onChange: (v) => set("status", v),
          options: [
            { key: "all", label: fl.allStatuses, count: rows.filter((r) => matches(r, "status")).length },
            ...GROUPS.filter((g) => groupCounts[g] || filters.status === g).map((g) => ({ key: g, label: sw.groups[g], count: groupCounts[g] || 0 })),
          ],
        }}
        selects={[
          { key: "type", label: sw.typeLabel, value: filters.type, onChange: (v) => set("type", v), options: [{ key: "all", label: sw.types.all }, ...TYPES.map((k) => ({ key: k, label: sw.types[k], count: typeCounts[k] || 0 }))] },
          { key: "chain", label: fl.network, value: filters.chain, onChange: (v) => set("chain", v), options: [{ key: "all", label: fl.allNetworks }, ...networks.map((c) => ({ key: c, label: networkName(c), count: chainCounts[c] }))] },
        ]}
        date={filters.date} onDate={(v) => set("date", v)}
        active={active} onReset={reset}
        shown={view.length} total={loading ? undefined : rows.length} loading={loading}
      />
      <div className="panel">
        {loading && <TableSkeleton label={sw.loading} cols={5} />}
        {!loading && (
          <div className="t-scroll" tabIndex={0} ref={tref}><table className="tx"><thead><tr><th>{sw.tableHead.id}</th><th>{sw.tableHead.chains}</th><th>{sw.tableHead.route}</th><th>{sw.tableHead.status}</th><th>{sw.tableHead.created}</th></tr></thead>
            <tbody>{!error && pg.slice.map((r) => (
              <tr key={r.key} className="row-click" onClick={() => setDetail(r)}>
                <td className="tid">
                  <RecordLink
                    href={`/dashboard?view=swaps&open=${encodeURIComponent(r.id)}`} onOpen={() => setDetail(r)}
                    preview={() => <PreviewCard label={sw.tableHead.id} title={r.id} headline={<><b>{r.sent} → {r.got}</b><span className={`hub-st-t ${(GROUP_PILL[groupOf(r.status)] === "ok" ? "ok" : GROUP_PILL[groupOf(r.status)] === "fail" ? "fail" : "wait")}`}>{statusLabel(r)}</span></>} fields={[[sw.tableHead.chains, chainsLabel(r)], [sw.tableHead.created, fmtDateTime(r.createdAt)]]} />}
                  >{r.id}</RecordLink>
                </td>
                <td><span className="net-badge">{chainsLabel(r)}</span></td>
                <td className="amt">{r.sent} → {r.got}</td>
                <td><Pill st={GROUP_PILL[groupOf(r.status)]} label={statusLabel(r)} /></td>
                <td className="cust">{fmtDateTime(r.createdAt)}</td>
              </tr>
            ))}
              <FillRows
                n={pg.size - (error ? 0 : pg.count)} cols={5}
                empty={error ? sw.loadError : !view.length ? (
                  <>
                    {rows.length ? fl.noMatch : sw.empty}
                    {rows.length > 0 && active > 0 && <button type="button" className="fbar-reset" onClick={reset}>{fl.clear}</button>}
                  </>
                ) : null}
              />
            </tbody>
          </table></div>
        )}
        {!loading && <Pagination {...pg} />}
      </div>
      {detail && <SwapRecordDetail api={api} kind={detail.kind} record={detail.raw} canManage={canManage} onClose={() => setDetail(null)} />}
    </>
  );
}
