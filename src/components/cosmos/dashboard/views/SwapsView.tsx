/* SwapsView: every swap of the organization in one list and one form, whatever the chains. On
   one chain the Payments API routes it through that chain's market (the Stellar DEX, Jupiter on
   Solana, Kuru Flow on Monad); between two chains NEAR Intents settles it. Non-custodial: the API
   builds the transaction or the deposit address, the person's wallet signs and pays. */
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Modal, showToast } from "@/components/cosmos/shared";
import { useT, fmt } from "@/lib/i18n/index";
import { swaps as swapsApi, crossChainSwaps as crossApi } from "@/lib/api-client";
import { DI } from "@/components/cosmos/dashboard/icons";
import { fmtDateTime } from "@/components/cosmos/dashboard/helpers";
import { usePaged, useGsapRows, usePolling, useListFilters } from "@/components/cosmos/dashboard/hooks";
import { Pill } from "@/components/cosmos/dashboard/components/Pill";
import { ViewHead } from "@/components/cosmos/dashboard/components/ViewHead";
import { FilterBar } from "@/components/cosmos/dashboard/components/FilterBar";
import { TableSkeleton } from "@/components/cosmos/dashboard/components/Skeleton";
import { Pagination } from "@/components/cosmos/dashboard/components/Pagination";
import { FreighterSign } from "@/components/cosmos/dashboard/components/FreighterSign";
import { SwapWidget } from "@/components/cosmos/dashboard/components/SwapWidget";
import { CrossChainSwapDetailModal } from "@/components/cosmos/dashboard/components/CrossChainSwapDetail";
import { assetLabel, CopyBlock, CopyField } from "@/components/cosmos/dashboard/components/PayLinkDetail";
import { CHAINS, NETWORK_IDS, assetLabel as chainAssetLabel, explorerTxUrl, networkName, tierOf } from "@/lib/chains";
import { DATE_RANGES, countBy, inRange, matchesQuery } from "@/lib/dashboard-filters";

const TERMINAL = ["SUCCEEDED", "FAILED"];
/* A swap stops changing once it settled, failed, or expired without a transaction (an expired
   Solana or Monad swap with a hash is still looked for on-chain). */
const settled = (s) => TERMINAL.includes(s.status) || (s.status === "EXPIRED" && !s.txHash);
/* One vocabulary for both kinds: a swap on one chain (PENDING → SUBMITTED → SUCCEEDED) and one
   between chains (AWAITING_DEPOSIT → … → SUCCEEDED or REFUNDED). */
const GROUPS = ["open", "succeeded", "refunded", "failed", "expired"];
const groupOf = (status) =>
  status === "SUCCEEDED" ? "succeeded" : status === "FAILED" ? "failed" : status === "EXPIRED" ? "expired" : status === "REFUNDED" ? "refunded" : "open";
const GROUP_PILL = { open: "pend", succeeded: "ok", refunded: "ref", failed: "fail", expired: "fail" };
const TYPES = ["same", "cross"];

const chainOfSwap = (s) => s.chain || "stellar";
const swapExplorer = (s) => explorerTxUrl(chainOfSwap(s), tierOf(s.network), s.txHash);
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

  // Swaps on each chain and swaps between chains are four lists upstream; read together, newest first.
  const fetchAll = useCallback(() => Promise.all([
    ...CHAINS.map((c) => swapsApi.list(orgId, env, { take: 100, chain: c }).then(asList).catch(() => null)),
    crossApi.list(orgId, env, { take: 100 }).then(asList).catch(() => null),
  ]).then((parts) => {
    if (parts.every((p) => p === null)) throw new Error("unavailable");
    return [
      ...parts.slice(0, CHAINS.length).flatMap((p) => (p || []).map(sameRow)),
      ...(parts[CHAINS.length] || []).map(crossRow),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }), [orgId, env]);
  const load = useCallback(() => {
    setLoading(true);
    fetchAll().then((list) => { setRows(list); setError(false); }).catch(() => setError(true)).finally(() => setLoading(false));
  }, [fetchAll]);
  useEffect(() => { load(); }, [load]);
  // Live refresh while the tab is visible, so a swap settling on-chain flips its status.
  const refresh = useCallback(() => { fetchAll().then(setRows).catch(() => {}); }, [fetchAll]);
  usePolling(refresh, 10000);

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
  const onCreated = (kind, rec) => { const row = kind === "cross" ? crossRow(rec) : sameRow(rec); setRows((r) => [row, ...r]); setDetail(row); };
  const statusLabel = (r) => (r.kind === "cross" ? cc.status[r.status] : sw.status[r.status]) || r.status;
  const chainsLabel = (r) => (r.from !== r.to ? `${networkName(r.from)} → ${networkName(r.to)}` : networkName(r.from));

  return (
    <>
      <ViewHead title={sw.title} />
      {canManage ? <SwapWidget orgId={orgId} env={env} onCreated={onCreated} /> : <div className="note-bar" style={{ marginBottom: 16 }}>{DI.link}<span>{sw.readOnly}</span></div>}
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
        {!loading && !error && view.length > 0 && (
          <div className="t-scroll" tabIndex={0} ref={tref}><table className="tx"><thead><tr><th>{sw.tableHead.id}</th><th>{sw.tableHead.chains}</th><th>{sw.tableHead.route}</th><th>{sw.tableHead.status}</th><th>{sw.tableHead.created}</th></tr></thead>
            <tbody>{pg.slice.map((r) => (
              <tr key={r.key} className="row-click" onClick={() => setDetail(r)}>
                <td className="tid">{r.id}</td>
                <td><span className="net-badge">{chainsLabel(r)}</span></td>
                <td className="amt">{r.sent} → {r.got}</td>
                <td><Pill st={GROUP_PILL[groupOf(r.status)]} label={statusLabel(r)} /></td>
                <td className="cust">{fmtDateTime(r.createdAt)}</td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
        {!loading && error && <div className="empty">{sw.loadError}</div>}
        {!loading && !error && !view.length && (
          <div className="empty">
            {rows.length ? fl.noMatch : sw.empty}
            {rows.length > 0 && active > 0 && <div><button type="button" className="fbar-reset" onClick={reset}>{fl.clear}</button></div>}
          </div>
        )}
        {!loading && !error && view.length > 0 && <Pagination {...pg} />}
      </div>
      {detail && detail.kind === "cross" && <CrossChainSwapDetailModal swap={detail.raw} orgId={orgId} env={env} canManage={canManage} onClose={() => setDetail(null)} />}
      {detail && detail.kind === "same" && detail.from === "stellar" && <SwapDetailModal sw={sw} swap={detail.raw} orgId={orgId} env={env} canManage={canManage} onClose={() => setDetail(null)} />}
      {detail && detail.kind === "same" && detail.from !== "stellar" && <ChainSwapDetailModal sw={sw} swap={detail.raw} orgId={orgId} env={env} canManage={canManage} onClose={() => setDetail(null)} />}
    </>
  );
}

/* Polls a swap until it is terminal so status and txHash update live. */
function useSwapRecord(swap, orgId, env, complete) {
  const [data, setData] = useState(swap);
  useEffect(() => {
    if (complete(data)) return;
    let alive = true;
    swapsApi.get(swap.id, orgId, env).then((full) => { if (alive && full) setData(full); }).catch(() => {});
    return () => { alive = false; };
  }, [swap.id, orgId, env]);
  useEffect(() => {
    if (settled(data)) return;
    let alive = true;
    const h = setInterval(() => {
      if (document.hidden) return;
      swapsApi.get(swap.id, orgId, env).then((full) => { if (alive && full) setData(full); }).catch(() => {});
    }, 5000);
    return () => { alive = false; clearInterval(h); };
  }, [swap.id, orgId, env, data.status, data.txHash]);
  return [data, setData];
}

/* ---------------- detail modal (QR + uri + xdr + submit signed tx) ---------------- */
function SwapDetailModal({ sw, swap, orgId, env, canManage, onClose }) {
  const d = sw.detail;
  // Seed with the row, then fetch the full record for the QR/uri/xdr.
  const [data, setData] = useSwapRecord(swap, orgId, env, (s) => !!(s.qr && s.uri));
  const [signed, setSigned] = useState("");
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState(null);

  // The signed envelope comes from Freighter or from the paste box.
  const submit = (signedXdr = signed.trim()) => {
    if (!signedXdr || busy) return;
    setBusy(true);
    setOutcome(null);
    swapsApi.submit(swap.id, orgId, env, { signedXdr })
      .then((res) => {
        setOutcome(res || {});
        if (res && res.swap) setData((cur) => ({ ...cur, ...res.swap }));
        if (res && res.submitted) showToast(d.submitted);
      })
      .catch((err) => { setOutcome({ submitted: false, reason: (err && err.message) || d.submitFailed }); })
      .finally(() => setBusy(false));
  };

  const F = d.fields;
  const fields = [
    [F.id, data.id],
    [F.status, (sw.status && sw.status[data.status]) || data.status],
    [F.network, data.network],
    [F.source, data.source],
    [F.destination, data.destination],
    [F.sent, data.sendAmount ? `${data.sendAmount} ${assetLabel(data.sendAsset)}` : null],
    [F.received, data.destEstimated ? `${data.destEstimated} ${data.destAsset}` : null],
    [F.minimum, data.destMin ? `${data.destMin} ${data.destAsset}` : null],
    [F.fee, data.feeAmount ? `${data.feeAmount} ${assetLabel(data.sendAsset)} (${data.feeBps} ${sw.modal.bps})` : null],
    [F.memo, data.memo],
    [F.commissionMemo, data.commissionMemo],
    [F.txHash, data.txHash],
    [F.created, fmtDateTime(data.createdAt)],
  ].filter(([, v]) => v !== null && v !== undefined && v !== "");

  // Only a built, unsigned swap can be signed: a submitted one is on its way, an expired one's
  // time bounds have passed.
  const signable = canManage && !!data.xdr && data.status === "PENDING";
  const w = useT().dash.wallet;

  return (
    <Modal onClose={onClose}>
      <div className="modal-body paylink-detail">
        <div className="modal-eyebrow">{d.eyebrow}</div>
        <h3>{d.title}</h3>

        {signable && (
          <div className="paylink-block">
            <div className="paylink-block-head"><span className="field-l">{w.signTitle}</span></div>
            <FreighterSign xdr={data.xdr} network={data.network} signer={data.source} busy={busy} onSigned={(x) => submit(x)} />
          </div>
        )}

        {/* What other wallets sign from, while the swap waits for its signature. */}
        {data.status === "PENDING" && data.qr && (
          <div className="paylink-qr-wrap">
            <img className="paylink-qr" src={data.qr} alt={d.scan} width={220} height={220} />
            <div className="paylink-qr-cap">{d.scan}</div>
            <a className="btn btn-soft btn-sm" href={data.qr} download={`swap-${data.id}.png`}>{DI.download} {d.downloadQr}</a>
          </div>
        )}

        {data.status === "PENDING" && data.uri && (
          <CopyBlock label={d.uri} value={data.uri}>
            <div className="paylink-actions">
              <a className="btn btn-dark btn-sm" href={data.uri}>{DI.link} {d.openWallet}</a>
            </div>
          </CopyBlock>
        )}

        {data.status === "PENDING" && data.xdr && <CopyBlock label={d.xdr} value={data.xdr} />}

        {/* The hash exists before signing; the explorer only knows it once it was sent. */}
        {data.txHash && data.status !== "PENDING" && (
          <div className="paylink-actions" style={{ marginBottom: 12 }}>
            <a className="btn btn-soft btn-sm" href={swapExplorer(data)} target="_blank" rel="noopener noreferrer">{DI.network} {d.viewExplorer}</a>
          </div>
        )}

        <div className="paylink-fields">
          {fields.map(([label, v]) => <CopyField key={label} label={label} value={v} />)}
        </div>

        {/* Or a transaction signed in another wallet, pasted back. */}
        {signable && (
          <div className="paylink-block">
            <div className="paylink-block-head"><label className="field-l" htmlFor={`swap-signed-${data.id}`}>{d.submitTitle}</label></div>
            <p className="field-note">{d.submitDesc}</p>
            <textarea id={`swap-signed-${data.id}`} className="field" rows={4} value={signed} onChange={(e) => setSigned(e.target.value)} placeholder={d.submitPlaceholder} />
            <div className="modal-actions">
              <button className="btn btn-violet" disabled={!signed.trim() || busy} onClick={() => submit()}>{busy ? d.submitting : d.submit}</button>
            </div>
          </div>
        )}

        <SubmitOutcome d={d} outcome={outcome} />
      </div>
    </Modal>
  );
}

/* ---------------- detail modal for Solana / Monad (transaction + approval + submit) ---------------- */
function ChainSwapDetailModal({ sw, swap, orgId, env, canManage, onClose }) {
  const d = sw.detail;
  const c = sw.chainDetail;
  const chain = swap.chain;
  const [data, setData] = useSwapRecord(swap, orgId, env, (s) => !!s.transaction);
  const [signed, setSigned] = useState("");
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState(null);

  const submit = () => {
    if (!signed.trim() || busy) return;
    setBusy(true);
    setOutcome(null);
    swapsApi.submit(swap.id, orgId, env, { signedTransaction: signed.trim() })
      .then((res) => {
        setOutcome(res || {});
        if (res && res.swap) setData((cur) => ({ ...cur, ...res.swap }));
        if (res && res.submitted) showToast(d.submitted);
      })
      .catch((err) => { setOutcome({ submitted: false, reason: (err && err.message) || d.submitFailed }); })
      .finally(() => setBusy(false));
  };

  const tx = data.transaction || {};
  // Solana hands out base64 bytes; Monad a call object the wallet signs as EIP-1559.
  const txText = tx.encoding === "base64" ? tx.data : JSON.stringify(tx, null, 2);
  const F = d.fields;
  const fields = [
    [F.id, data.id],
    [F.status, (sw.status && sw.status[data.status]) || data.status],
    [c.provider, `${sw.venues[chain]} · ${sw.chains[chain]}`],
    [F.source, data.source],
    [F.sent, data.sendAmount ? `${data.sendAmount} ${chainAssetLabel(chain, data.sendAsset)}` : null],
    [F.received, data.destEstimated ? `${data.destEstimated} ${chainAssetLabel(chain, data.destAsset)}` : null],
    [F.minimum, data.destMin ? `${data.destMin} ${chainAssetLabel(chain, data.destAsset)}` : null],
    [F.fee, data.feeAmount ? `${data.feeAmount} ${chainAssetLabel(chain, data.destAsset)} (${data.feeBps} ${sw.modal.bps})` : null],
    [c.expires, data.status === "PENDING" ? fmtDateTime(data.expiresAt) : null],
    [F.txHash, data.txHash],
    [F.created, fmtDateTime(data.createdAt)],
  ].filter(([, v]) => v !== null && v !== undefined && v !== "");

  const isTerminal = TERMINAL.includes(data.status);

  return (
    <Modal onClose={onClose}>
      <div className="modal-body paylink-detail">
        <div className="modal-eyebrow">{d.eyebrow} · {sw.chains[chain]}</div>
        <h3>{c.title}</h3>

        {data.approval && data.status === "PENDING" && (
          <CopyBlock label={c.approval} value={JSON.stringify(data.approval, null, 2)}>
            <p className="field-note">{c.approvalNote}</p>
          </CopyBlock>
        )}
        {data.transaction && data.status === "PENDING" && <CopyBlock label={c.transaction} value={txText} />}
        {data.txHash && (
          <div className="paylink-actions" style={{ marginBottom: 12 }}>
            <a className="btn btn-soft btn-sm" href={swapExplorer(data)} target="_blank" rel="noopener noreferrer">{DI.network} {d.viewExplorer}</a>
          </div>
        )}

        <div className="paylink-fields">
          {fields.map(([label, v]) => <CopyField key={label} label={label} value={v} />)}
        </div>

        {canManage && !isTerminal && data.status !== "EXPIRED" && (
          <div className="paylink-block">
            <div className="paylink-block-head"><label className="field-l">{d.submitTitle}</label></div>
            <p className="field-note">{c.submitDesc}</p>
            <textarea className="field" rows={4} value={signed} onChange={(e) => setSigned(e.target.value)} placeholder={c.submitPlaceholder} />
            <div className="modal-actions">
              <button className="btn btn-violet" disabled={!signed.trim() || busy} onClick={submit}>{busy ? d.submitting : d.submit}</button>
            </div>
          </div>
        )}

        <SubmitOutcome d={d} outcome={outcome} />
      </div>
    </Modal>
  );
}

function SubmitOutcome({ d, outcome }) {
  if (!outcome) return null;
  return (
    <div className="paylink-fields" style={{ marginTop: 8 }}>
      <CopyField label={d.fields.status} value={outcome.submitted ? d.submitted : (outcome.reason || d.submitFailed)} />
      {outcome.txHash && <CopyField label={d.fields.txHash} value={outcome.txHash} />}
      {Array.isArray(outcome.resultCodes?.operations) && outcome.resultCodes.operations.length > 0 && <CopyField label={d.resultCodes} value={outcome.resultCodes.operations.join(", ")} />}
      {typeof outcome.resultCodes === "string" && <CopyField label={d.resultCodes} value={outcome.resultCodes} />}
    </div>
  );
}
