import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Modal, showToast } from "@/components/cosmos/shared";
import { useT, fmt } from "@/lib/i18n/index";
import { crossChainSwaps as api } from "@/lib/api-client";
import { DI } from "@/components/cosmos/dashboard/icons";
import { fmtDateTime } from "@/components/cosmos/dashboard/helpers";
import { usePaged, useGsapRows, usePolling } from "@/components/cosmos/dashboard/hooks";
import { Pill } from "@/components/cosmos/dashboard/components/Pill";
import { Toolbar } from "@/components/cosmos/dashboard/components/Toolbar";
import { ViewHead } from "@/components/cosmos/dashboard/components/ViewHead";
import { Field } from "@/components/cosmos/dashboard/components/Field";
import { Pagination } from "@/components/cosmos/dashboard/components/Pagination";
import { CopyBlock, CopyField } from "@/components/cosmos/dashboard/components/PayLinkDetail";

const CHAINS = ["stellar", "solana", "monad"];
const CHAIN_NAMES = { stellar: "Stellar", solana: "Solana", monad: "Monad" };
const PLACEHOLDER = { stellar: "G…", solana: "Base58…", monad: "0x…" };
const FINAL = ["SUCCEEDED", "REFUNDED", "FAILED"];
const OPEN = ["AWAITING_DEPOSIT", "DEPOSIT_DETECTED", "INCOMPLETE_DEPOSIT", "PROCESSING"];
const FILTER_KEYS = ["all", "open", "SUCCEEDED", "REFUNDED", "FAILED"];
/* Status → the pill styles the dashboard already has. */
const PILL = {
  AWAITING_DEPOSIT: "pend", DEPOSIT_DETECTED: "pend", INCOMPLETE_DEPOSIT: "pend", PROCESSING: "pend",
  SUCCEEDED: "ok", REFUNDED: "fail", FAILED: "fail", EXPIRED: "fail",
};

const route = (s) =>
  `${s.amountIn} ${s.originAsset} (${CHAIN_NAMES[s.originChain] || s.originChain}) → ${s.amountOut || `~${s.amountOutEstimated}`} ${s.destinationAsset} (${CHAIN_NAMES[s.destinationChain] || s.destinationChain})`;

export function CrossChainSwapsView({ canManage = true, orgId, env = "dev" }) {
  const t = useT();
  const cc = t.dash.crossChain;
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const [modal, setModal] = useState(false);
  const [detail, setDetail] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    api.list(orgId, env, { take: 100 })
      .then((res) => { setRows(Array.isArray(res?.data) ? res.data : []); setError(false); })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [env, orgId]);
  useEffect(() => { load(); }, [load]);
  const refresh = useCallback(() => {
    api.list(orgId, env, { take: 100 }).then((res) => setRows(Array.isArray(res?.data) ? res.data : [])).catch(() => {});
  }, [env, orgId]);
  usePolling(refresh, 10000);

  const view = rows.filter((s) => {
    if (filter === "open" && !OPEN.includes(s.status)) return false;
    if (filter !== "all" && filter !== "open" && s.status !== filter) return false;
    if (!q) return true;
    const hay = `${s.id} ${s.recipient} ${s.refundTo} ${s.depositAddress} ${s.originAsset} ${s.destinationAsset}`.toLowerCase();
    return hay.includes(q.toLowerCase());
  });
  const pg = usePaged(view, q + "|" + filter);
  const tref = useRef(null); useGsapRows(tref, pg.page + "|" + view.length);

  return (
    <>
      <ViewHead title={cc.title} sub={fmt(cc.sub, { n: rows.length })}>
        {canManage && <button className="btn btn-dark btn-sm" onClick={() => setModal(true)}>{DI.plus} {cc.create}</button>}
      </ViewHead>
      {!canManage && <div className="note-bar" style={{ marginBottom: 16 }}>{DI.link}<span>{cc.readOnly}</span></div>}
      {env !== "prod" && <div className="note-bar" style={{ marginBottom: 16 }}>{DI.network}<span>{cc.mainnetOnly}</span></div>}
      <div className="filter-tabs">{FILTER_KEYS.map((k) => <button key={k} className={filter === k ? "on" : ""} onClick={() => setFilter(k)}>{cc.filters[k]}</button>)}</div>
      <div className="panel">
        <Toolbar q={q} setQ={setQ} placeholder={cc.searchPlaceholder} />
        {!loading && !error && view.length > 0 && (
          <div className="t-scroll" ref={tref}><table className="tx"><thead><tr><th>{cc.tableHead.id}</th><th>{cc.tableHead.route}</th><th>{cc.tableHead.status}</th><th>{cc.tableHead.created}</th></tr></thead>
            <tbody>{pg.slice.map((s) => (
              <tr key={s.id} className="row-click" onClick={() => setDetail(s)}>
                <td className="tid">{s.id}</td>
                <td className="amt">{route(s)}</td>
                <td><Pill st={PILL[s.status] || "ref"} label={cc.status[s.status] || s.status} /></td>
                <td className="cust">{fmtDateTime(s.createdAt)}</td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
        {loading && <div className="empty">{cc.loading}</div>}
        {!loading && error && <div className="empty">{cc.loadError}</div>}
        {!loading && !error && !view.length && <div className="empty">{cc.empty}</div>}
        {!loading && !error && view.length > 0 && <Pagination {...pg} />}
      </div>
      {modal && <CreateModal cc={cc} orgId={orgId} env={env} onClose={() => setModal(false)} onCreated={(s) => { setModal(false); setRows((r) => [s, ...r]); setDetail(s); }} />}
      {detail && <DetailModal cc={cc} swap={detail} orgId={orgId} env={env} canManage={canManage} onClose={() => setDetail(null)} />}
    </>
  );
}

/* A chain picker and the assets NEAR Intents lists on it. */
function LegPicker({ cc, label, chain, onChain, asset, onAsset, assets }) {
  const options = assets.filter((a) => a.chain === chain);
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
      <div className="fld">
        <label className="field-l">{label} · {cc.modal.chain}</label>
        <select className="field" value={chain} onChange={(e) => onChain(e.target.value)}>
          {CHAINS.map((c) => <option key={c} value={c}>{CHAIN_NAMES[c]}</option>)}
        </select>
      </div>
      <div className="fld">
        <label className="field-l">{cc.modal.asset}</label>
        <select className="field" value={asset} onChange={(e) => onAsset(e.target.value)} disabled={!options.length}>
          {!options.length && <option value="">{cc.modal.assetsLoading}</option>}
          {options.map((a) => (
            <option key={a.assetId} value={a.contract && chain === "stellar" ? `${a.symbol}:${a.contract}` : a.contract || a.symbol}>
              {a.symbol}{a.contract ? ` · ${a.contract.slice(0, 6)}…${a.contract.slice(-4)}` : ""}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function CreateModal({ cc, orgId, env, onClose, onCreated }) {
  const t = useT();
  const m = cc.modal;
  const [assets, setAssets] = useState([]);
  const [originChain, setOriginChain] = useState("stellar");
  const [destinationChain, setDestinationChain] = useState("solana");
  const [originAsset, setOriginAsset] = useState("");
  const [destinationAsset, setDestinationAsset] = useState("");
  const [amount, setAmount] = useState("");
  const [recipient, setRecipient] = useState("");
  const [refundTo, setRefundTo] = useState("");
  const [slippageBps, setSlippageBps] = useState("");
  const [quote, setQuote] = useState(null);
  const [quoting, setQuoting] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    api.assets(orgId, env).then((list) => { if (alive) setAssets(Array.isArray(list) ? list : []); }).catch(() => {});
    return () => { alive = false; };
  }, [orgId, env]);

  // Default each leg to the chain's first listed asset once the list arrives.
  const firstOf = useMemo(() => (chain) => {
    const a = assets.find((x) => x.chain === chain);
    if (!a) return "";
    return a.contract && chain === "stellar" ? `${a.symbol}:${a.contract}` : a.contract || a.symbol;
  }, [assets]);
  useEffect(() => { setOriginAsset(firstOf(originChain)); }, [originChain, firstOf]);
  useEffect(() => { setDestinationAsset(firstOf(destinationChain)); }, [destinationChain, firstOf]);

  const reset = (setter) => (v) => { setter(v); setQuote(null); };
  const sameChain = originChain === destinationChain;
  const baseValid = !sameChain && originAsset && destinationAsset && amount.trim() && recipient.trim() && refundTo.trim();

  const body = () => ({
    org: orgId,
    environment: env,
    originChain, originAsset, destinationChain, destinationAsset,
    amount: amount.trim(),
    recipient: recipient.trim(),
    refundTo: refundTo.trim(),
    ...(slippageBps.trim() ? { slippageBps: Number(slippageBps.trim()) } : {}),
  });

  const getQuote = () => {
    if (!baseValid || quoting) return;
    setQuoting(true);
    api.quote(body()).then(setQuote)
      .catch((err) => showToast((err && err.message) || cc.quoteError, "error"))
      .finally(() => setQuoting(false));
  };
  const create = () => {
    if (!baseValid || busy) return;
    setBusy(true);
    api.create(body()).then(onCreated)
      .catch((err) => showToast((err && err.message) || cc.createError, "error"))
      .finally(() => setBusy(false));
  };

  return (
    <Modal onClose={onClose}>
      <div className="modal-body">
        <div className="modal-eyebrow">{m.eyebrow}</div>
        <h3>{m.title}</h3>
        <p>{m.desc}</p>
        <LegPicker cc={cc} label={m.from} chain={originChain} onChain={reset(setOriginChain)} asset={originAsset} onAsset={reset(setOriginAsset)} assets={assets} />
        <Field label={m.amount} value={amount} onChange={(e) => reset(setAmount)(e.target.value)} placeholder="100" inputMode="decimal" />
        <Field label={m.refundTo} hint={m.refundToHint} value={refundTo} onChange={(e) => reset(setRefundTo)(e.target.value)} placeholder={PLACEHOLDER[originChain]} />
        <LegPicker cc={cc} label={m.to} chain={destinationChain} onChain={reset(setDestinationChain)} asset={destinationAsset} onAsset={reset(setDestinationAsset)} assets={assets} />
        <Field label={m.recipient} hint={m.recipientHint} value={recipient} onChange={(e) => reset(setRecipient)(e.target.value)} placeholder={PLACEHOLDER[destinationChain]} />
        <Field label={m.slippage} hint={m.slippageHint} value={slippageBps} onChange={(e) => reset(setSlippageBps)(e.target.value)} placeholder="100" inputMode="numeric" />

        <div className="paylink-actions" style={{ marginBottom: 14 }}>
          <button className="btn btn-soft btn-sm" disabled={!baseValid || quoting} onClick={getQuote}>{quoting ? m.quoting : m.getQuote}</button>
        </div>

        {quote && (
          <div className="paylink-fields" style={{ marginBottom: 16 }}>
            <div className="modal-eyebrow" style={{ marginBottom: 8 }}>{m.quoteTitle}</div>
            <CopyField label={m.estimated} value={`${quote.destination.amount} ${quote.destination.asset}`} />
            <CopyField label={m.minimum} value={`${quote.destination.minimum} ${quote.destination.asset}`} />
            <CopyField label={m.fee} value={`${quote.fee.amount} ${quote.fee.asset} (${quote.fee.bps} bps)`} />
            <CopyField label={m.eta} value={`${quote.timeEstimateSeconds} ${m.seconds}`} />
            <p className="field-note">{m.feeNote}</p>
          </div>
        )}

        <div className="modal-actions">
          <button className="btn btn-violet" disabled={!baseValid || busy || env !== "prod"} onClick={create}>{busy ? m.creating : m.create}</button>
          <button className="btn btn-soft" onClick={onClose}>{t.dash.common.cancel}</button>
        </div>
      </div>
    </Modal>
  );
}

function DetailModal({ cc, swap, orgId, env, canManage, onClose }) {
  const d = cc.detail;
  const [data, setData] = useState(swap);
  const [txHash, setTxHash] = useState("");
  const [busy, setBusy] = useState(false);

  // The list rows carry no QR: fetch the full record once, then poll until final.
  useEffect(() => {
    let alive = true;
    api.get(swap.id, orgId, env).then((full) => { if (alive && full) setData(full); }).catch(() => {});
    return () => { alive = false; };
  }, [swap.id, orgId, env]);
  useEffect(() => {
    if (FINAL.includes(data.status)) return;
    let alive = true;
    const h = setInterval(() => {
      if (document.hidden) return;
      api.get(swap.id, orgId, env).then((full) => { if (alive && full) setData(full); }).catch(() => {});
    }, 6000);
    return () => { alive = false; clearInterval(h); };
  }, [swap.id, orgId, env, data.status]);

  const report = () => {
    if (!txHash.trim() || busy) return;
    setBusy(true);
    api.reportDeposit(swap.id, orgId, env, txHash.trim())
      .then((fresh) => { if (fresh) setData(fresh); showToast(d.reported); setTxHash(""); })
      .catch((err) => showToast((err && err.message) || d.reported, "error"))
      .finally(() => setBusy(false));
  };

  const F = d.fields;
  const awaiting = data.status === "AWAITING_DEPOSIT" || data.status === "INCOMPLETE_DEPOSIT";
  const fields = [
    [F.id, data.id],
    [F.status, cc.status[data.status] || data.status],
    [F.route, route(data)],
    [F.amountIn, `${data.amountIn} ${data.originAsset}`],
    [F.estimated, `${data.amountOutEstimated} ${data.destinationAsset}`],
    [F.minimum, `${data.amountOutMin} ${data.destinationAsset}`],
    [F.fee, `${data.feeAmount} ${data.originAsset} (${data.feeBps} bps)`],
    [F.recipient, data.recipient],
    [F.refundTo, data.refundTo],
    [F.amountOut, data.amountOut ? `${data.amountOut} ${data.destinationAsset}` : null],
    [F.refunded, data.refundedAmount ? `${data.refundedAmount} ${data.originAsset}` : null],
    [F.expires, awaiting ? fmtDateTime(data.expiresAt) : null],
    [F.quoteSignature, data.quoteSignature],
    [F.created, fmtDateTime(data.createdAt)],
  ].filter(([, v]) => v !== null && v !== undefined && v !== "");
  const txs = [...(data.originTxHashes || []), ...(data.destinationTxHashes || [])];

  return (
    <Modal onClose={onClose}>
      <div className="modal-body paylink-detail">
        <div className="modal-eyebrow">{d.eyebrow}</div>
        <h3>{d.title}</h3>

        {awaiting && (
          <>
            <p>{fmt(d.pay, { amount: data.amountIn, asset: data.originAsset })}</p>
            {data.qr && (
              <div className="paylink-qr-wrap">
                <img className="paylink-qr" src={data.qr} alt={d.scan} width={220} height={220} />
                <div className="paylink-qr-cap">{d.scan}</div>
              </div>
            )}
            <CopyField label={F.depositAddress} value={data.depositAddress} />
            {data.depositMemo && <CopyField label={F.depositMemo} value={data.depositMemo} />}
            {data.depositMemo && <p className="field-note">{d.memoWarning}</p>}
            <CopyBlock label={d.depositUri} value={data.depositUri}>
              <div className="paylink-actions"><a className="btn btn-dark btn-sm" href={data.depositUri}>{DI.link} {d.openWallet}</a></div>
            </CopyBlock>
          </>
        )}

        <div className="paylink-fields">
          {fields.map(([label, v]) => <CopyField key={label} label={label} value={v} />)}
        </div>

        {txs.length > 0 && (
          <div className="paylink-fields">
            <div className="modal-eyebrow" style={{ marginBottom: 8 }}>{d.txs}</div>
            {txs.map((x) => (
              <div key={x.hash} className="paylink-actions"><a className="btn btn-soft btn-sm" href={x.explorerUrl} target="_blank" rel="noopener noreferrer">{DI.network} {x.hash.slice(0, 10)}…</a></div>
            ))}
          </div>
        )}

        {canManage && awaiting && (
          <div className="paylink-block">
            <div className="paylink-block-head"><label className="field-l">{d.reportTitle}</label></div>
            <p className="field-note">{d.reportDesc}</p>
            <input className="field" value={txHash} onChange={(e) => setTxHash(e.target.value)} placeholder={d.reportPlaceholder} />
            <div className="modal-actions">
              <button className="btn btn-violet" disabled={!txHash.trim() || busy} onClick={report}>{busy ? d.reporting : d.report}</button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
