import { useState, useEffect, useRef, useCallback } from "react";
import { Modal, showToast } from "@/components/cosmos/shared";
import { IcCopy } from "@/components/cosmos/icons";
import { FormSteps, FormStep, FormStepsFooter, useFormSteps } from "@/components/cosmos/dashboard/components/FormSteps";
import { useT, fmt } from "@/lib/i18n/index";
import { liquidity as liquidityApi } from "@/lib/api-client";
import { DI } from "@/components/cosmos/dashboard/icons";
import { fmtDateTime } from "@/components/cosmos/dashboard/helpers";
import { ViewActivity } from "@/components/cosmos/dashboard/components/ActivityPanel";
import { RecordLink } from "@/components/cosmos/dashboard/components/RecordLink";
import { PreviewCard, shortAddress } from "@/components/cosmos/dashboard/components/RecordPreview";
import { usePaged, useGsapRows, usePolling, useListFilters, useUrlRequest } from "@/components/cosmos/dashboard/hooks";
import { Pill } from "@/components/cosmos/dashboard/components/Pill";
import { FilterBar } from "@/components/cosmos/dashboard/components/FilterBar";
import { ViewHead } from "@/components/cosmos/dashboard/components/ViewHead";
import { Field } from "@/components/cosmos/dashboard/components/Field";
import { AssetSelect } from "@/components/cosmos/dashboard/components/AssetSelect";
import { Pagination } from "@/components/cosmos/dashboard/components/Pagination";
import { FillRows } from "@/components/cosmos/dashboard/components/FillRows";
import { FreighterSign } from "@/components/cosmos/dashboard/components/FreighterSign";
import { STATUS_PILL, assetLabel, CopyBlock, CopyField } from "@/components/cosmos/dashboard/components/PayLinkDetail";
import { TableSkeleton } from "@/components/cosmos/dashboard/components/Skeleton";
import { RowMenu } from "@/components/cosmos/dashboard/components/RowMenu";
import { RecordDetail } from "@/components/cosmos/dashboard/components/RecordDetail";
import { StatusIcon, paymentTone, pillTone } from "@/components/cosmos/dashboard/components/StatusIcon";
import { TokenMark } from "@/components/cosmos/dashboard/components/TokenMark";
import { useCopy } from "@/components/cosmos/hooks/useCopy";
import { WalletSelect } from "@/components/cosmos/dashboard/components/OrgWallets";
import { DATE_RANGES, countBy, inRange, matchesQuery } from "@/lib/dashboard-filters";
import { explorerTxUrl, tierOf } from "@/lib/chains";

const STATUSES = ["PENDING", "SUBMITTED", "SUCCEEDED", "FAILED", "EXPIRED"];
const KINDS = ["DEPOSIT", "WITHDRAW"];
const DEFAULTS = { q: "", status: "all", kind: "all", date: "any" };
const ALLOWED = { status: ["all", ...STATUSES], kind: ["all", ...KINDS], date: DATE_RANGES };
const TERMINAL = ["SUCCEEDED", "FAILED"];

/* "XLM / USDC": the pool's asset pair. */
const pairLabel = (a, b) => `${assetLabel(a)} / ${assetLabel(b)}`;
const poolShort = (id) => `${(id || "").slice(0, 8)}…`;
const explorerTx = (o) => `https://stellar.expert/explorer/${o.network === "public" ? "public" : "testnet"}/tx/${o.txHash}`;

/* "1000 XLM + 100 USDC" (deposit caps) or "≥ 9.9 XLM + ≥ 0.99 USDC" (withdraw minimums). */
function opAmounts(o) {
  const pre = o.kind === "WITHDRAW" ? "≥ " : "";
  return `${pre}${o.amountA} ${assetLabel(o.assetA)} + ${pre}${o.amountB} ${assetLabel(o.assetB)}`;
}

export function LiquidityView({ canManage = true, canConnectWallets = false, orgId, env = "dev" }) {
  const t = useT();
  const lq = t.dash.liquidity;
  const [tab, setTab] = useState("operations");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const { filters, set, reset, active } = useListFilters(DEFAULTS, ALLOWED);
  const fl = t.dash.filters;
  const [modal, setModal] = useState(null); // { kind: 'deposit'|'withdraw', prefill? }
  const [detail, setDetail] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    liquidityApi.operations(orgId, env, { take: 100 })
      .then((res) => { setRows(Array.isArray(res?.data) ? res.data : []); setError(false); })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [env, orgId]);
  useEffect(() => { load(); }, [load]);
  // Live refresh while the tab is visible so an on-chain submission flips status.
  const refresh = useCallback(() => {
    liquidityApi.operations(orgId, env, { take: 100 })
      .then((res) => setRows(Array.isArray(res?.data) ? res.data : []))
      .catch(() => {});
  }, [env, orgId]);
  usePolling(refresh, 8000, { immediate: false });

  // An operation named from elsewhere (a notification) opens once the list is here.
  const [openId, clearOpen] = useUrlRequest("open");
  useEffect(() => {
    if (!openId || loading) return;
    clearOpen();
    setTab("operations");
    const hit = rows.find((o) => o.id === openId);
    if (hit) { setDetail(hit); return; }
    liquidityApi.operation(openId, orgId, env).then((op) => { if (op && op.id) setDetail(op); else showToast(t.dash.common.notFound, "error"); }).catch(() => showToast(t.dash.common.notFound, "error"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openId, loading]);

  const matches = (o, skip) =>
    (skip === "status" || filters.status === "all" || o.status === filters.status) &&
    (skip === "kind" || filters.kind === "all" || o.kind === filters.kind) &&
    inRange(o.createdAt, filters.date) &&
    matchesQuery([o.id, o.source, o.poolId, o.assetA, o.assetB, o.txHash], filters.q);
  const view = rows.filter((o) => matches(o, null));
  const statusCounts = countBy(rows.filter((o) => matches(o, "status")), (o) => o.status);
  const kindCounts = countBy(rows.filter((o) => matches(o, "kind")), (o) => o.kind);
  const pg = usePaged(view, JSON.stringify(filters));
  const tref = useRef(null); useGsapRows(tref, pg.page + "|" + view.length);

  const onCreated = (op) => { setModal(null); setRows((r) => [op, ...r]); setDetail(op); };

  return (
    <>
      <ViewHead title={lq.title} />
      {!canManage && <div className="note-bar" style={{ marginBottom: 16 }}>{DI.link}<span>{lq.readOnly}</span></div>}
      {/* Its own figures and chart: operations and the completed ones. */}
      <ViewActivity env={env} metrics={["liquidity"]} id="liq-activity" />

      {/* The sections, with the view's two actions at the row's right end (they serve every tab). */}
      <div className="tabs-row">
        <div className="filter-tabs" role="group" aria-label={lq.title}>
          {["operations", "pools", "positions"].map((k) => (
            <button key={k} type="button" className={tab === k ? "on" : ""} aria-pressed={tab === k} onClick={() => setTab(k)}>{lq.tabs[k]}</button>
          ))}
        </div>
        {canManage && (
          <div className="tabs-row-actions">
            <button className="btn btn-dark btn-sm" onClick={() => setModal({ kind: "deposit" })}>{DI.plus} {lq.deposit}</button>
            <button className="btn btn-soft btn-sm" onClick={() => setModal({ kind: "withdraw" })}>{lq.withdraw}</button>
          </div>
        )}
      </div>

      {tab === "operations" && (
        <>
          <FilterBar
            label={fl.label}
            query={filters.q} onQuery={(v) => set("q", v)} placeholder={lq.searchPlaceholder}
            status={{
              label: fl.status, value: filters.status, onChange: (v) => set("status", v),
              options: [
                { key: "all", label: lq.filters.all, count: rows.filter((o) => matches(o, "status")).length },
                ...STATUSES.filter((st) => statusCounts[st] || filters.status === st).map((st) => ({ key: st, label: lq.status[st] || st, count: statusCounts[st] || 0, icon: <StatusIcon tone={paymentTone(st)} size={16} /> })),
              ],
            }}
            selects={[{ key: "kind", label: fl.kind, value: filters.kind, onChange: (v) => set("kind", v), options: [{ key: "all", label: fl.allKinds }, ...KINDS.map((k) => ({ key: k, label: lq.kind[k] || k, count: kindCounts[k] || 0 }))] }]}
            date={filters.date} onDate={(v) => set("date", v)}
            active={active} onReset={reset}
            shown={view.length} total={loading ? undefined : rows.length} loading={loading}
          />
          <div className="panel">
            {!loading && (
              <div className="t-scroll" tabIndex={0} ref={tref}><table className="tx"><thead><tr><th>{lq.opsHead.id}</th><th>{lq.opsHead.kind}</th><th>{lq.opsHead.pool}</th><th>{lq.opsHead.amounts}</th><th>{lq.opsHead.status}</th><th>{lq.opsHead.created}</th><th><span className="sr-only">{t.dash.common.actions}</span></th></tr></thead>
                <tbody>{!error && pg.slice.map((o) => (
                  <tr key={o.id} className="row-click" onClick={() => setDetail(o)}>
                    <td className="tid">
                      <RecordLink
                        href={`/dashboard?view=liquidity&open=${encodeURIComponent(o.id)}`} onOpen={() => setDetail(o)} copy={o.id}
                        preview={() => <PreviewCard label={lq.opsHead.id} title={o.id} headline={<><b>{lq.kind[o.kind] || o.kind}</b><span className={`hub-st-t ${(STATUS_PILL[o.status] === "ok" ? "ok" : STATUS_PILL[o.status] === "fail" ? "fail" : "wait")}`}>{lq.status[o.status] || o.status}</span></>} fields={[[lq.opsHead.pool, pairLabel(o.assetA, o.assetB)], [lq.opsHead.amounts, o.kind === "WITHDRAW" && o.shares ? `${o.shares} ${lq.sharesUnit}` : opAmounts(o)], [lq.opsHead.created, fmtDateTime(o.createdAt)]]} />}
                       title={o.id}><code>{shortAddress(o.id)}</code></RecordLink>
                    </td>
                    <td className="cust">{lq.kind[o.kind] || o.kind}</td>
                    <td><span className="cell-mark"><TokenMark symbol={assetLabel(o.assetA)} chain="stellar" chainName="Stellar" size={24} /><span>{pairLabel(o.assetA, o.assetB)}</span></span></td>
                    <td className="amt">{o.kind === "WITHDRAW" && o.shares ? `${o.shares} ${lq.sharesUnit}` : opAmounts(o)}</td>
                    <td><Pill st={STATUS_PILL[o.status] || "ref"} tone={paymentTone(o.status)} label={lq.status[o.status] || o.status} /></td>
                    <td className="cust">{fmtDateTime(o.createdAt)}</td>
                    <LiqRowActions o={o} onView={() => setDetail(o)} />
                  </tr>
                ))}
                  <FillRows
                    n={pg.size - (error ? 0 : pg.count)} cols={7}
                    empty={error ? lq.loadError : null}
                  />
                </tbody>
              </table></div>
            )}
            {loading && <TableSkeleton label={lq.loading} cols={7} />}
            {!loading && <Pagination {...pg} />}
          </div>
        </>
      )}

      {tab === "pools" && (
        <PoolsPanel
          lq={lq} orgId={orgId} env={env} canManage={canManage}
          onDeposit={(pool) => {
            const [ra, rb] = pool.reserves || [];
            setModal({
              kind: "deposit",
              prefill: {
                assetACode: ra ? assetLabel(ra.asset) : "", assetAIssuer: ra?.issuer || "",
                assetBCode: rb ? assetLabel(rb.asset) : "", assetBIssuer: rb?.issuer || "",
              },
            });
          }}
        />
      )}

      {tab === "positions" && (
        <PositionsPanel
          lq={lq} orgId={orgId} env={env} canManage={canManage} canConnectWallets={canConnectWallets}
          onWithdraw={(pos) => setModal({ kind: "withdraw", prefill: { poolId: pos.poolId, shares: pos.shares } })}
        />
      )}

      {modal?.kind === "deposit" && <DepositModal lq={lq} orgId={orgId} env={env} prefill={modal.prefill} onClose={() => setModal(null)} onCreated={onCreated} />}
      {modal?.kind === "withdraw" && <WithdrawModal lq={lq} orgId={orgId} env={env} prefill={modal.prefill} onClose={() => setModal(null)} onCreated={onCreated} />}
      {detail && <LiquidityDetailModal lq={lq} op={detail} orgId={orgId} env={env} canManage={canManage} onClose={() => setDetail(null)} />}
    </>
  );
}

/* ---------------- pools browser (Horizon proxy) ---------------- */
/* An operation's actions: its detail, then its menu (a new tab, its id, its transaction). */
function LiqRowActions({ o, onView }) {
  const t = useT();
  const cm = t.dash.common;
  const [, copy] = useCopy();
  const tx = o.txHash ? explorerTxUrl("stellar", tierOf(o.network), o.txHash) : null;
  // Waiting on its signature: the detail is where it is signed and sent.
  const waiting = o.status === "PENDING";
  return (
    <td className="row-actions" onClick={(e) => e.stopPropagation()}>
      <button type="button" className="icon-mini" title={cm.details} aria-label={cm.details} onClick={onView}>{DI.docs}</button>
      {waiting && <button type="button" className="icon-mini" title={cm.continueOp} aria-label={`${cm.continueOp}: ${shortAddress(o.id)}`} onClick={onView}>{DI.key}</button>}
      {tx
        ? <a className="icon-mini" title={t.dash.balances.explorer} aria-label={t.dash.balances.explorer} href={tx} target="_blank" rel="noopener noreferrer">{DI.network}</a>
        : <button type="button" className="icon-mini" disabled title={cm.noTxYet} aria-label={`${t.dash.balances.explorer}: ${cm.noTxYet}`}>{DI.network}</button>}
      <RowMenu
        label={fmt(cm.rowActions, { name: shortAddress(o.id) })}
        items={[
          { key: "open", label: cm.details, icon: DI.docs, onClick: onView },
          ...(waiting ? [{ key: "continue", label: cm.continueOp, icon: DI.key, onClick: onView }] : []),
          { key: "tab", label: cm.openNewTab, icon: DI.link, href: `/dashboard?view=liquidity&open=${encodeURIComponent(o.id)}`, external: true },
          { key: "copy", label: cm.copyId, icon: <IcCopy />, onClick: () => copy(o.id, t.toasts.copied) },
          { key: "explorer", label: t.dash.balances.explorer, icon: DI.network, href: tx, external: true, disabled: !tx, hint: cm.noTxYet },
        ]}
      />
    </td>
  );
}

/* A pool's or a position's menu: its detail, its id, and the action its row offers. */
function PoolMenu({ id, action, onOpen }) {
  const t = useT();
  const cm = t.dash.common;
  const [, copy] = useCopy();
  return <RowMenu label={fmt(cm.rowActions, { name: shortAddress(id) })} items={[{ key: "open", label: cm.details, icon: DI.docs, onClick: onOpen }, ...(action ? [action] : []), { key: "copy", label: cm.copyId, icon: <IcCopy />, onClick: () => copy(id, t.toasts.copied) }]} />;
}

/* A pool's or a position's detail: its figures as listed, its id to copy, and its row's action. */
function PoolDetail({ title, eyebrow, id, fields, action, onClose }) {
  const t = useT();
  const [, copy] = useCopy();
  return (
    <RecordDetail
      eyebrow={eyebrow} title={title} onClose={onClose}
      fields={fields.map(([k, v]) => [k, v === null || v === undefined ? v : String(v)])}
      actions={[
        ...(action ? [{ ...action, kind: "dark" as const, onClick: () => { onClose(); action.onClick(); } }] : []),
        { key: "copy", label: t.dash.common.copyId, icon: <IcCopy />, onClick: () => copy(id, t.toasts.copied) },
      ]}
    />
  );
}

function PoolsPanel({ lq, orgId, env, canManage, onDeposit }) {
  const t = useT();
  const p = lq.pools;
  const net = env === "prod" ? "public" : "testnet";
  const [assetACode, setAssetACode] = useState("");
  const [assetAIssuer, setAssetAIssuer] = useState("");
  const [assetBCode, setAssetBCode] = useState("");
  const [assetBIssuer, setAssetBIssuer] = useState("");
  const [pools, setPools] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState(null);
  const pg = usePaged(pools, pools);
  const reserves = (pool) => (pool.reserves || []).map((r) => `${r.amount} ${assetLabel(r.asset)}`).join(" · ");
  const nameOf = (pool) => (pool.reserves?.length === 2 ? pairLabel(pool.reserves[0].asset, pool.reserves[1].asset) : poolShort(pool.id));
  const depositAction = (pool) => (canManage ? { key: "deposit", label: lq.deposit, icon: DI.plus, onClick: () => onDeposit(pool) } : null);

  const search = () => {
    if (loading) return;
    setLoading(true);
    const query = { limit: 50 };
    if (assetACode.trim()) { query.assetACode = assetACode.trim(); if (assetAIssuer.trim()) query.assetAIssuer = assetAIssuer.trim(); }
    if (assetBCode.trim()) { query.assetBCode = assetBCode.trim(); if (assetBIssuer.trim()) query.assetBIssuer = assetBIssuer.trim(); }
    liquidityApi.pools(orgId, env, query)
      .then((res) => { setPools(Array.isArray(res?.data) ? res.data : []); setLoaded(true); })
      .catch((err) => showToast((err && err.message) || p.error, "error"))
      .finally(() => setLoading(false));
  };
  useEffect(() => { search(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="panel">
      <div className="paylink-fields" style={{ marginBottom: 12 }}>
        <AssetSelect network={net} label={p.assetA} codeLabel={p.assetA} issuerLabel={p.assetAIssuer} hint={p.assetHint}
          code={assetACode} issuer={assetAIssuer} onCode={setAssetACode} onIssuer={setAssetAIssuer}
          customText={t.dash.common.assetCustom} anyText={t.dash.common.assetAny} allowAny codePlaceholder="XLM" />
        <AssetSelect network={net} label={p.assetB} codeLabel={p.assetB} issuerLabel={p.assetBIssuer} hint={p.assetHint}
          code={assetBCode} issuer={assetBIssuer} onCode={setAssetBCode} onIssuer={setAssetBIssuer}
          customText={t.dash.common.assetCustom} anyText={t.dash.common.assetAny} allowAny codePlaceholder="USDC" />
        <div className="paylink-actions">
          <button className="btn btn-soft btn-sm" disabled={loading} onClick={search}>{loading ? p.searching : p.search}</button>
        </div>
      </div>
      {loaded && !loading && (
        <div className="t-scroll" tabIndex={0}><table className="tx"><thead><tr><th>{p.head.pool}</th><th>{p.head.reserves}</th><th>{p.head.shares}</th><th>{p.head.trustlines}</th><th>{p.head.fee}</th><th><span className="sr-only">{t.dash.common.actions}</span></th></tr></thead>
          <tbody>{pg.slice.map((pool) => (
            <tr key={pool.id} className="row-click" onClick={() => setOpen(pool)}>
              <td className="tid">
                <RecordLink
                  title={pool.id} copy={pool.id} onOpen={() => setOpen(pool)}
                  preview={() => <PreviewCard label={p.head.pool} title={pool.id} wrap fields={[[p.head.reserves, (pool.reserves || []).map((r) => `${r.amount} ${assetLabel(r.asset)}`).join(" · ") || "-"], [p.head.shares, pool.totalShares], [p.head.trustlines, pool.totalTrustlines], [p.head.fee, `${(pool.feeBp / 100).toFixed(2)}%`]]} />}
                >{pool.reserves?.length === 2 ? pairLabel(pool.reserves[0].asset, pool.reserves[1].asset) : poolShort(pool.id)}</RecordLink>
              </td>
              <td className="amt">{(pool.reserves || []).map((r) => `${r.amount} ${assetLabel(r.asset)}`).join(" · ")}</td>
              <td>{pool.totalShares}</td>
              <td>{pool.totalTrustlines}</td>
              <td>{(pool.feeBp / 100).toFixed(2)}%</td>
              <td className="row-actions" onClick={(e) => e.stopPropagation()}>
                <button type="button" className="icon-mini" title={t.dash.common.details} aria-label={t.dash.common.details} onClick={() => setOpen(pool)}>{DI.docs}</button>
                {canManage && <button type="button" className="icon-mini" title={lq.deposit} aria-label={`${lq.deposit}: ${nameOf(pool)}`} onClick={() => onDeposit(pool)}>{DI.plus}</button>}
                <PoolMenu id={pool.id} action={depositAction(pool)} onOpen={() => setOpen(pool)} />
              </td>
            </tr>
          ))}
            <FillRows n={pg.size - pg.count} cols={6} />
          </tbody>
        </table></div>
      )}
      {loading && <TableSkeleton label={p.loading} cols={6} />}
      {loaded && !loading && <Pagination {...pg} />}
      {open && <PoolDetail eyebrow={p.head.pool} title={nameOf(open)} id={open.id} action={depositAction(open)} onClose={() => setOpen(null)}
        fields={[[p.head.pool, open.id], [p.head.reserves, reserves(open)], [p.head.shares, open.totalShares], [p.head.trustlines, open.totalTrustlines], [p.head.fee, `${(open.feeBp / 100).toFixed(2)}%`]]} />}
    </div>
  );
}

/* ---------------- positions (an account's pool shares) ----------------
   The account is one of the organization's Stellar wallets (Settings), picked from the list as the
   payment forms do; its positions load as soon as it is picked. */
function PositionsPanel({ lq, orgId, env, canManage, canConnectWallets, onWithdraw }) {
  const t = useT();
  const p = lq.positions;
  const [account, setAccount] = useState("");
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState(null);
  const pg = usePaged(positions, positions);
  // The latest request wins: picking another account while one loads drops the older answer.
  const req = useRef(0);

  const valid = /^G[A-Z2-7]{55}$/.test(account.trim());
  const redeemable = (pos) => (pos.redeemable || []).map((r) => `${r.amount} ${assetLabel(r.asset)}`).join(" · ");
  const nameOf = (pos) => (pos.reserves?.length === 2 ? pairLabel(pos.reserves[0].asset, pos.reserves[1].asset) : poolShort(pos.poolId));
  const withdrawAction = (pos) => (canManage ? { key: "withdraw", label: lq.withdraw, icon: DI.download, onClick: () => onWithdraw(pos) } : null);

  const search = (acct = account) => {
    if (!/^G[A-Z2-7]{55}$/.test(acct.trim())) return;
    const id = ++req.current;
    setLoading(true);
    liquidityApi.positions(acct.trim(), orgId, env)
      .then((res) => { if (id === req.current) { setPositions(Array.isArray(res?.data) ? res.data : []); setLoaded(true); } })
      .catch((err) => { if (id === req.current) showToast((err && err.message) || p.error, "error"); })
      .finally(() => { if (id === req.current) setLoading(false); });
  };

  return (
    <div className="panel">
      <div className="paylink-fields" style={{ marginBottom: 12 }}>
        <WalletSelect
          orgId={orgId} chain="stellar" id="lq-positions-account" label={p.account} canConnect={canConnectWallets}
          value={account} onChange={(a) => { setAccount(a); setLoaded(false); search(a); }}
        />
        <div className="paylink-actions">
          <button className="btn btn-soft btn-sm" disabled={!valid || loading} onClick={() => search()}>{loading ? p.loadingBtn : p.load}</button>
        </div>
      </div>
      {/* Until an account is picked the table waits, empty, saying what it needs. */}
      <div className="t-scroll" tabIndex={0}><table className="tx"><thead><tr><th>{p.head.pool}</th><th>{p.head.shares}</th><th>{p.head.share}</th><th>{p.head.redeemable}</th><th><span className="sr-only">{t.dash.common.actions}</span></th></tr></thead>
          <tbody>{loaded && pg.slice.map((pos) => (
            <tr key={pos.poolId} className="row-click" onClick={() => setOpen(pos)}>
              <td className="tid">
                <RecordLink
                  title={pos.poolId} copy={pos.poolId} onOpen={() => setOpen(pos)}
                  preview={() => <PreviewCard label={p.head.pool} title={pos.poolId} wrap fields={[[p.head.shares, pos.shares], [p.head.share, `${(pos.shareOfPoolBps / 100).toFixed(2)}%`], [p.head.redeemable, (pos.redeemable || []).map((r) => `${r.amount} ${assetLabel(r.asset)}`).join(" · ") || "-"]]} />}
                >{pos.reserves?.length === 2 ? pairLabel(pos.reserves[0].asset, pos.reserves[1].asset) : poolShort(pos.poolId)}</RecordLink>
              </td>
              <td className="amt">{pos.shares}</td>
              <td>{(pos.shareOfPoolBps / 100).toFixed(2)}%</td>
              <td className="amt">{(pos.redeemable || []).map((r) => `${r.amount} ${assetLabel(r.asset)}`).join(" · ")}</td>
              <td className="row-actions" onClick={(e) => e.stopPropagation()}>
                <button type="button" className="icon-mini" title={t.dash.common.details} aria-label={t.dash.common.details} onClick={() => setOpen(pos)}>{DI.docs}</button>
                {canManage && <button type="button" className="icon-mini" title={lq.withdraw} aria-label={`${lq.withdraw}: ${nameOf(pos)}`} onClick={() => onWithdraw(pos)}>{DI.download}</button>}
                <PoolMenu id={pos.poolId} action={withdrawAction(pos)} onOpen={() => setOpen(pos)} />
              </td>
            </tr>
          ))}
            <FillRows n={pg.size - (loaded ? pg.count : 0)} cols={5} />
          </tbody>
        </table></div>
      <Pagination {...pg} />
      {open && <PoolDetail eyebrow={p.head.pool} title={nameOf(open)} id={open.poolId} action={withdrawAction(open)} onClose={() => setOpen(null)}
        fields={[[p.head.pool, open.poolId], [p.head.shares, open.shares], [p.head.share, `${(open.shareOfPoolBps / 100).toFixed(2)}%`], [p.head.redeemable, redeemable(open)]]} />}
    </div>
  );
}

/* ---------------- deposit modal ---------------- */
function DepositModal({ lq, orgId, env, prefill, onClose, onCreated }) {
  const t = useT();
  const m = lq.modal;
  const net = env === "prod" ? "public" : "testnet";
  const [source, setSource] = useState("");
  const [assetACode, setAssetACode] = useState(prefill?.assetACode || "XLM");
  const [assetAIssuer, setAssetAIssuer] = useState(prefill?.assetAIssuer || "");
  const [assetBCode, setAssetBCode] = useState(prefill?.assetBCode || "USDC");
  const [assetBIssuer, setAssetBIssuer] = useState(prefill?.assetBIssuer || "");
  const [maxAmountA, setMaxAmountA] = useState("");
  const [maxAmountB, setMaxAmountB] = useState("");
  const [slippageBps, setSlippageBps] = useState("");
  const [busy, setBusy] = useState(false);

  const needsIssuerA = !!assetACode.trim() && !["xlm", "native"].includes(assetACode.trim().toLowerCase());
  const needsIssuerB = !!assetBCode.trim() && !["xlm", "native"].includes(assetBCode.trim().toLowerCase());
  const canCreate =
    source.trim() && maxAmountA.trim() &&
    (!needsIssuerA || assetAIssuer.trim()) && (!needsIssuerB || assetBIssuer.trim());

  const submit = () => {
    if (!canCreate || busy) return;
    setBusy(true);
    liquidityApi.deposit({
      org: orgId,
      environment: env,
      source: source.trim(),
      ...(assetACode.trim() ? { assetACode: assetACode.trim() } : {}),
      ...(needsIssuerA && assetAIssuer.trim() ? { assetAIssuer: assetAIssuer.trim() } : {}),
      ...(assetBCode.trim() ? { assetBCode: assetBCode.trim() } : {}),
      ...(needsIssuerB && assetBIssuer.trim() ? { assetBIssuer: assetBIssuer.trim() } : {}),
      maxAmountA: maxAmountA.trim(),
      ...(maxAmountB.trim() ? { maxAmountB: maxAmountB.trim() } : {}),
      ...(slippageBps.trim() ? { slippageBps: Number(slippageBps.trim()) } : {}),
    })
      .then((op) => onCreated(op))
      .catch((err) => showToast((err && err.message) || m.createError, "error"))
      .finally(() => setBusy(false));
  };

  /* Two steps (product owner, 2026-10-27: a long form goes in steps): the account and the pool's
     pair, then how much goes in and the slippage. */
  const steps = useFormSteps(2);
  const pairOk = !!source.trim() && (!needsIssuerA || !!assetAIssuer.trim()) && (!needsIssuerB || !!assetBIssuer.trim());

  return (
    <Modal onClose={onClose}>
      <div className="modal-body">
        <div className="modal-eyebrow">{m.eyebrow}</div>
        <h3>{m.depositTitle}</h3>
        <FormSteps names={[m.steps.pair, m.steps.amounts]} steps={steps} />
        <FormStep steps={steps}>
          {steps.step === 0 && (<>
            <p className="field-help">{m.depositDesc}</p>
            <Field label={m.source} hint={m.sourceHint} value={source} onChange={(e) => setSource(e.target.value)} placeholder="G…" autoFocus />
            <AssetSelect network={net} label={m.assetA} codeLabel={m.assetA} issuerLabel={m.assetAIssuer} hint={m.assetHint} issuerHint={m.issuerHint}
              code={assetACode} issuer={assetAIssuer} onCode={setAssetACode} onIssuer={setAssetAIssuer}
              customText={t.dash.common.assetCustom} codePlaceholder="XLM" />
            <AssetSelect network={net} label={m.assetB} codeLabel={m.assetB} issuerLabel={m.assetBIssuer} hint={m.assetHint} issuerHint={m.issuerHint}
              code={assetBCode} issuer={assetBIssuer} onCode={setAssetBCode} onIssuer={setAssetBIssuer}
              customText={t.dash.common.assetCustom} codePlaceholder="USDC" />
          </>)}
          {steps.step === 1 && (<>
            <Field label={m.maxAmountA} hint={m.maxAmountAHint} value={maxAmountA} onChange={(e) => setMaxAmountA(e.target.value)} placeholder="1000" inputMode="decimal" />
            <Field label={m.maxAmountB} hint={m.maxAmountBHint} value={maxAmountB} onChange={(e) => setMaxAmountB(e.target.value)} placeholder="100" inputMode="decimal" />
            <Field label={m.slippage} hint={m.slippageHint} value={slippageBps} onChange={(e) => setSlippageBps(e.target.value)} placeholder="50" inputMode="numeric" />
          </>)}
        </FormStep>
        <FormStepsFooter steps={steps} canNext={pairOk} onCancel={onClose} submitLabel={busy ? m.creating : m.create} onSubmit={submit} busy={busy} submitDisabled={!canCreate} />
      </div>
    </Modal>
  );
}

/* ---------------- withdraw modal ---------------- */
function WithdrawModal({ lq, orgId, env, prefill, onClose, onCreated }) {
  const t = useT();
  const m = lq.modal;
  const [source, setSource] = useState("");
  const [poolId, setPoolId] = useState(prefill?.poolId || "");
  const [shares, setShares] = useState(prefill?.shares || "");
  const [slippageBps, setSlippageBps] = useState("");
  const [busy, setBusy] = useState(false);

  const canCreate = source.trim() && /^[0-9a-f]{64}$/.test(poolId.trim()) && shares.trim();

  const submit = () => {
    if (!canCreate || busy) return;
    setBusy(true);
    liquidityApi.withdraw({
      org: orgId,
      environment: env,
      source: source.trim(),
      poolId: poolId.trim(),
      shares: shares.trim(),
      ...(slippageBps.trim() ? { slippageBps: Number(slippageBps.trim()) } : {}),
    })
      .then((op) => onCreated(op))
      .catch((err) => showToast((err && err.message) || m.createError, "error"))
      .finally(() => setBusy(false));
  };

  return (
    <Modal onClose={onClose}>
      <div className="modal-body">
        <div className="modal-eyebrow">{m.eyebrow}</div>
        <h3>{m.withdrawTitle}</h3>
        <p>{m.withdrawDesc}</p>
        <Field label={m.source} hint={m.withdrawSourceHint} value={source} onChange={(e) => setSource(e.target.value)} placeholder="G…" autoFocus />
        <Field label={m.poolId} hint={m.poolIdHint} value={poolId} onChange={(e) => setPoolId(e.target.value)} placeholder="dd7b1ab8…" />
        <Field label={m.shares} hint={m.sharesHint} value={shares} onChange={(e) => setShares(e.target.value)} placeholder="50" inputMode="decimal" />
        <Field label={m.slippage} hint={m.slippageHint} value={slippageBps} onChange={(e) => setSlippageBps(e.target.value)} placeholder="50" inputMode="numeric" />
        <div className="modal-actions">
          <button className="btn btn-violet" disabled={!canCreate || busy} onClick={submit}>{busy ? m.creating : m.create}</button>
          <button className="btn btn-soft" onClick={onClose}>{t.dash.common.cancel}</button>
        </div>
      </div>
    </Modal>
  );
}

/* ---------------- detail modal (QR + uri + xdr + submit signed tx) ---------------- */
function LiquidityDetailModal({ lq, op, orgId, env, canManage, onClose }) {
  const d = lq.detail;
  const [data, setData] = useState(op);
  const [signed, setSigned] = useState("");
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState(null);

  // Seed with the row, then fetch the full record for the QR/uri/xdr.
  useEffect(() => {
    if (data.qr && data.uri) return;
    let alive = true;
    liquidityApi.operation(op.id, orgId, env).then((full) => { if (alive && full) setData(full); }).catch(() => {});
    return () => { alive = false; };
  }, [op.id, orgId, env]);

  // Poll until the operation reaches a terminal state so status/txHash update live.
  useEffect(() => {
    if (TERMINAL.includes(data.status)) return;
    let alive = true;
    const h = setInterval(() => {
      if (document.hidden) return;
      liquidityApi.operation(op.id, orgId, env).then((full) => { if (alive && full) setData(full); }).catch(() => {});
    }, 5000);
    return () => { alive = false; clearInterval(h); };
  }, [op.id, orgId, env, data.status]);

  // The signed envelope comes from Freighter or from the paste box.
  const submit = (signedXdr = signed.trim()) => {
    if (!signedXdr || busy) return;
    setBusy(true);
    setOutcome(null);
    liquidityApi.submit(op.id, orgId, env, signedXdr)
      .then((res) => {
        setOutcome(res || {});
        if (res && res.operation) setData((cur) => ({ ...cur, ...res.operation }));
        if (res && res.submitted) showToast(d.submitted);
      })
      .catch((err) => { setOutcome({ submitted: false, reason: (err && err.message) || d.submitFailed }); })
      .finally(() => setBusy(false));
  };

  const F = d.fields;
  const fields = [
    [F.id, data.id],
    [F.kind, lq.kind[data.kind] || data.kind],
    [F.status, lq.status[data.status] || data.status],
    [F.network, data.network],
    [F.source, data.source],
    [F.pool, data.poolId],
    [F.pair, pairLabel(data.assetA, data.assetB)],
    [data.kind === "WITHDRAW" ? F.minReceived : F.maxDeposit, opAmounts(data)],
    [F.shares, data.shares ? `${data.shares} ${lq.sharesUnit}` : null],
    [F.priceBounds, data.minPrice && data.maxPrice ? `${data.minPrice} – ${data.maxPrice}` : null],
    [F.commission, data.feeBps ? `${data.feeAmountA} ${assetLabel(data.assetA)} + ${data.feeAmountB} ${assetLabel(data.assetB)} (${data.feeBps} ${lq.bps})` : null],
    [F.commissionMemo, data.commissionMemo],
    [F.txHash, data.txHash],
    [F.created, fmtDateTime(data.createdAt)],
  ].filter(([, v]) => v !== null && v !== undefined && v !== "");

  // Only a built, unsigned operation can be signed.
  const signable = canManage && !!data.xdr && data.status === "PENDING";
  const w = useT().dash.wallet;

  return (
    <Modal onClose={onClose}>
      <div className="modal-body paylink-detail">
        <div className="modal-eyebrow">{d.eyebrow}</div>
        <h3>{data.kind === "WITHDRAW" ? d.titleWithdraw : d.titleDeposit}</h3>

        {signable && (
          <div className="paylink-block">
            <div className="paylink-block-head"><span className="field-l">{w.signTitle}</span></div>
            <FreighterSign xdr={data.xdr} network={data.network} signer={data.source} busy={busy} onSigned={(x) => submit(x)} />
          </div>
        )}

        {data.qr && (
          <div className="paylink-qr-wrap">
            <img className="paylink-qr" src={data.qr} alt={d.scan} width={220} height={220} />
            <div className="paylink-qr-cap">{d.scan}</div>
            <a className="btn btn-soft btn-sm" href={data.qr} download={`liquidity-${data.id}.png`}>{DI.download} {d.downloadQr}</a>
          </div>
        )}

        {data.uri && (
          <CopyBlock label={d.uri} value={data.uri}>
            <div className="paylink-actions">
              <a className="btn btn-dark btn-sm" href={data.uri}>{DI.link} {d.openWallet}</a>
              {data.txHash && <a className="btn btn-soft btn-sm" href={explorerTx(data)} target="_blank" rel="noopener noreferrer">{DI.network} {d.viewExplorer}</a>}
            </div>
          </CopyBlock>
        )}

        {data.xdr && <CopyBlock label={d.xdr} value={data.xdr} />}

        <div className="paylink-fields">
          {fields.map(([label, v]) => <CopyField key={label} label={label} value={v} />)}
        </div>

        {/* Or a transaction signed in another wallet, pasted back. */}
        {signable && (
          <div className="paylink-block">
            <div className="paylink-block-head"><label className="field-l" htmlFor={`liq-signed-${data.id}`}>{d.submitTitle}</label></div>
            <p className="field-note">{d.submitDesc}</p>
            <textarea id={`liq-signed-${data.id}`} className="field" rows={4} value={signed} onChange={(e) => setSigned(e.target.value)} placeholder={d.submitPlaceholder} />
            <div className="modal-actions">
              <button className="btn btn-violet" disabled={!signed.trim() || busy} onClick={() => submit()}>{busy ? d.submitting : d.submit}</button>
            </div>
          </div>
        )}

        {outcome && (
          <div className="paylink-fields" style={{ marginTop: 8 }}>
            <CopyField label={F.status} value={outcome.submitted ? d.submitted : (outcome.reason || d.submitFailed)} />
            {outcome.txHash && <CopyField label={F.txHash} value={outcome.txHash} />}
            {Array.isArray(outcome.resultCodes) && outcome.resultCodes.length > 0 && <CopyField label={d.resultCodes} value={outcome.resultCodes.join(", ")} />}
          </div>
        )}
      </div>
    </Modal>
  );
}
