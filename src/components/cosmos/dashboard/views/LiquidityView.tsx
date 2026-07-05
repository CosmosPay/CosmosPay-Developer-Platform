import { useState, useEffect, useRef, useCallback } from "react";
import { Modal, showToast } from "@/components/cosmos/shared";
import { useT, fmt } from "@/lib/i18n/index";
import { liquidity as liquidityApi } from "@/lib/api-client";
import { DI } from "@/components/cosmos/dashboard/icons";
import { fmtDateTime } from "@/components/cosmos/dashboard/helpers";
import { usePaged, useGsapRows, usePolling } from "@/components/cosmos/dashboard/hooks";
import { Pill } from "@/components/cosmos/dashboard/components/Pill";
import { Toolbar } from "@/components/cosmos/dashboard/components/Toolbar";
import { ViewHead } from "@/components/cosmos/dashboard/components/ViewHead";
import { Field } from "@/components/cosmos/dashboard/components/Field";
import { AssetSelect } from "@/components/cosmos/dashboard/components/AssetSelect";
import { Pagination } from "@/components/cosmos/dashboard/components/Pagination";
import { STATUS_PILL, assetLabel, CopyBlock, CopyField } from "@/components/cosmos/dashboard/components/PayLinkDetail";

const FILTER_KEYS = ["all", "PENDING", "SUBMITTED", "SUCCEEDED", "FAILED"];
const TERMINAL = ["SUCCEEDED", "FAILED"];

/* "XLM / USDC" — the pool's asset pair. */
const pairLabel = (a, b) => `${assetLabel(a)} / ${assetLabel(b)}`;
const poolShort = (id) => `${(id || "").slice(0, 8)}…`;
const explorerTx = (o) => `https://stellar.expert/explorer/${o.network === "public" ? "public" : "testnet"}/tx/${o.txHash}`;

/* "1000 XLM + 100 USDC" (deposit caps) or "≥ 9.9 XLM + ≥ 0.99 USDC" (withdraw minimums). */
function opAmounts(o) {
  const pre = o.kind === "WITHDRAW" ? "≥ " : "";
  return `${pre}${o.amountA} ${assetLabel(o.assetA)} + ${pre}${o.amountB} ${assetLabel(o.assetB)}`;
}

export function LiquidityView({ canManage = true, orgId, env = "dev" }) {
  const t = useT();
  const lq = t.dash.liquidity;
  const [tab, setTab] = useState("operations");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
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
  usePolling(refresh, 8000);

  const view = rows.filter((o) => {
    if (filter !== "all" && o.status !== filter) return false;
    if (!q) return true;
    const hay = `${o.id} ${o.source || ""} ${o.poolId || ""} ${o.assetA || ""} ${o.assetB || ""}`.toLowerCase();
    return hay.includes(q.toLowerCase());
  });
  const pg = usePaged(view, q + "|" + filter);
  const tref = useRef(null); useGsapRows(tref, pg.page + "|" + view.length);

  const onCreated = (op) => { setModal(null); setRows((r) => [op, ...r]); setDetail(op); };

  return (
    <>
      <ViewHead title={lq.title} sub={fmt(lq.sub, { n: rows.length })}>
        {canManage && (
          <>
            <button className="btn btn-dark btn-sm" onClick={() => setModal({ kind: "deposit" })}>{DI.plus} {lq.deposit}</button>
            <button className="btn btn-soft btn-sm" onClick={() => setModal({ kind: "withdraw" })}>{lq.withdraw}</button>
          </>
        )}
      </ViewHead>
      {!canManage && <div className="note-bar" style={{ marginBottom: 16 }}>{DI.link}<span>{lq.readOnly}</span></div>}

      <div className="filter-tabs">
        {["operations", "pools", "positions"].map((k) => (
          <button key={k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>{lq.tabs[k]}</button>
        ))}
      </div>

      {tab === "operations" && (
        <>
          <div className="filter-tabs">{FILTER_KEYS.map((k) => <button key={k} className={filter === k ? "on" : ""} onClick={() => setFilter(k)}>{lq.filters[k]}</button>)}</div>
          <div className="panel">
            <Toolbar q={q} setQ={setQ} placeholder={lq.searchPlaceholder}>
              <span className="env-tag">{DI.network} {env === "prod" ? lq.network.prod : lq.network.dev}</span>
            </Toolbar>
            {!loading && !error && view.length > 0 && (
              <div className="t-scroll" ref={tref}><table className="tx"><thead><tr><th>{lq.opsHead.id}</th><th>{lq.opsHead.kind}</th><th>{lq.opsHead.pool}</th><th>{lq.opsHead.amounts}</th><th>{lq.opsHead.status}</th><th>{lq.opsHead.created}</th></tr></thead>
                <tbody>{pg.slice.map((o) => (
                  <tr key={o.id} className="row-click" onClick={() => setDetail(o)}>
                    <td className="tid">{o.id}</td>
                    <td>{lq.kind[o.kind] || o.kind}</td>
                    <td>{pairLabel(o.assetA, o.assetB)}</td>
                    <td className="amt">{o.kind === "WITHDRAW" && o.shares ? `${o.shares} ${lq.sharesUnit}` : opAmounts(o)}</td>
                    <td><Pill st={STATUS_PILL[o.status] || "ref"} label={lq.status[o.status] || o.status} /></td>
                    <td className="cust">{fmtDateTime(o.createdAt)}</td>
                  </tr>
                ))}</tbody>
              </table></div>
            )}
            {loading && <div className="empty">{lq.loading}</div>}
            {!loading && error && <div className="empty">{lq.loadError}</div>}
            {!loading && !error && !view.length && <div className="empty">{lq.empty}</div>}
            {!loading && !error && view.length > 0 && <Pagination {...pg} />}
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
          lq={lq} orgId={orgId} env={env} canManage={canManage}
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
      {loaded && pools.length > 0 && (
        <div className="t-scroll"><table className="tx"><thead><tr><th>{p.head.pool}</th><th>{p.head.reserves}</th><th>{p.head.shares}</th><th>{p.head.trustlines}</th><th>{p.head.fee}</th>{canManage && <th />}</tr></thead>
          <tbody>{pools.map((pool) => (
            <tr key={pool.id}>
              <td className="tid" title={pool.id}>{pool.reserves?.length === 2 ? pairLabel(pool.reserves[0].asset, pool.reserves[1].asset) : poolShort(pool.id)}</td>
              <td className="amt">{(pool.reserves || []).map((r) => `${r.amount} ${assetLabel(r.asset)}`).join(" · ")}</td>
              <td>{pool.totalShares}</td>
              <td>{pool.totalTrustlines}</td>
              <td>{(pool.feeBp / 100).toFixed(2)}%</td>
              {canManage && <td><button className="btn btn-soft btn-sm" onClick={() => onDeposit(pool)}>{lq.deposit}</button></td>}
            </tr>
          ))}</tbody>
        </table></div>
      )}
      {loading && !loaded && <div className="empty">{p.loading}</div>}
      {loaded && !pools.length && <div className="empty">{p.empty}</div>}
    </div>
  );
}

/* ---------------- positions (an account's pool shares) ---------------- */
function PositionsPanel({ lq, orgId, env, canManage, onWithdraw }) {
  const p = lq.positions;
  const [account, setAccount] = useState("");
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const valid = /^G[A-Z2-7]{55}$/.test(account.trim());

  const search = () => {
    if (!valid || loading) return;
    setLoading(true);
    liquidityApi.positions(account.trim(), orgId, env)
      .then((res) => { setPositions(Array.isArray(res?.data) ? res.data : []); setLoaded(true); })
      .catch((err) => showToast((err && err.message) || p.error, "error"))
      .finally(() => setLoading(false));
  };

  return (
    <div className="panel">
      <div className="paylink-fields" style={{ marginBottom: 12 }}>
        <Field label={p.account} hint={p.accountHint} value={account} onChange={(e) => setAccount(e.target.value)} placeholder="G…" />
        <div className="paylink-actions">
          <button className="btn btn-soft btn-sm" disabled={!valid || loading} onClick={search}>{loading ? p.loadingBtn : p.load}</button>
        </div>
      </div>
      {loaded && positions.length > 0 && (
        <div className="t-scroll"><table className="tx"><thead><tr><th>{p.head.pool}</th><th>{p.head.shares}</th><th>{p.head.share}</th><th>{p.head.redeemable}</th>{canManage && <th />}</tr></thead>
          <tbody>{positions.map((pos) => (
            <tr key={pos.poolId}>
              <td className="tid" title={pos.poolId}>{pos.reserves?.length === 2 ? pairLabel(pos.reserves[0].asset, pos.reserves[1].asset) : poolShort(pos.poolId)}</td>
              <td className="amt">{pos.shares}</td>
              <td>{(pos.shareOfPoolBps / 100).toFixed(2)}%</td>
              <td className="amt">{(pos.redeemable || []).map((r) => `${r.amount} ${assetLabel(r.asset)}`).join(" · ")}</td>
              {canManage && <td><button className="btn btn-soft btn-sm" onClick={() => onWithdraw(pos)}>{lq.withdraw}</button></td>}
            </tr>
          ))}</tbody>
        </table></div>
      )}
      {loaded && !positions.length && <div className="empty">{p.empty}</div>}
      {!loaded && <div className="empty">{p.prompt}</div>}
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

  return (
    <Modal onClose={onClose}>
      <div className="modal-body">
        <div className="modal-eyebrow">{m.eyebrow}</div>
        <h3>{m.depositTitle}</h3>
        <p>{m.depositDesc}</p>
        <Field label={m.source} hint={m.sourceHint} value={source} onChange={(e) => setSource(e.target.value)} placeholder="G…" autoFocus />
        <AssetSelect network={net} label={m.assetA} codeLabel={m.assetA} issuerLabel={m.assetAIssuer} hint={m.assetHint} issuerHint={m.issuerHint}
          code={assetACode} issuer={assetAIssuer} onCode={setAssetACode} onIssuer={setAssetAIssuer}
          customText={t.dash.common.assetCustom} codePlaceholder="XLM" />
        <AssetSelect network={net} label={m.assetB} codeLabel={m.assetB} issuerLabel={m.assetBIssuer} hint={m.assetHint} issuerHint={m.issuerHint}
          code={assetBCode} issuer={assetBIssuer} onCode={setAssetBCode} onIssuer={setAssetBIssuer}
          customText={t.dash.common.assetCustom} codePlaceholder="USDC" />
        <Field label={m.maxAmountA} hint={m.maxAmountAHint} value={maxAmountA} onChange={(e) => setMaxAmountA(e.target.value)} placeholder="1000" inputMode="decimal" />
        <Field label={m.maxAmountB} hint={m.maxAmountBHint} value={maxAmountB} onChange={(e) => setMaxAmountB(e.target.value)} placeholder="100" inputMode="decimal" />
        <Field label={m.slippage} hint={m.slippageHint} value={slippageBps} onChange={(e) => setSlippageBps(e.target.value)} placeholder="50" inputMode="numeric" />
        <p className="field-note">{m.trustNote}</p>
        <div className="modal-actions">
          <button className="btn btn-violet" disabled={!canCreate || busy} onClick={submit}>{busy ? m.creating : m.create}</button>
          <button className="btn btn-soft" onClick={onClose}>{t.dash.common.cancel}</button>
        </div>
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

  const submit = () => {
    if (!signed.trim() || busy) return;
    setBusy(true);
    setOutcome(null);
    liquidityApi.submit(op.id, orgId, env, signed.trim())
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

  const isTerminal = TERMINAL.includes(data.status);

  return (
    <Modal onClose={onClose}>
      <div className="modal-body paylink-detail">
        <div className="modal-eyebrow">{d.eyebrow}</div>
        <h3>{data.kind === "WITHDRAW" ? d.titleWithdraw : d.titleDeposit}</h3>

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

        {/* Submit the signed transaction (only while the operation is not yet terminal). */}
        {canManage && data.xdr && !isTerminal && (
          <div className="paylink-block">
            <div className="paylink-block-head"><label className="field-l">{d.submitTitle}</label></div>
            <p className="field-note">{d.submitDesc}</p>
            <textarea className="field" rows={4} value={signed} onChange={(e) => setSigned(e.target.value)} placeholder={d.submitPlaceholder} />
            <div className="modal-actions">
              <button className="btn btn-violet" disabled={!signed.trim() || busy} onClick={submit}>{busy ? d.submitting : d.submit}</button>
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
