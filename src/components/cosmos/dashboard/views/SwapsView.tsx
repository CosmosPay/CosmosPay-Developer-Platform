import { useState, useEffect, useRef, useCallback } from "react";
import { Modal, showToast } from "@/components/cosmos/shared";
import { useT, fmt } from "@/lib/i18n/index";
import { swaps as swapsApi } from "@/lib/api-client";
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
const CHAINS = ["stellar", "solana", "monad"];
const NATIVE = { stellar: "XLM", solana: "SOL", monad: "MON" };
/* Where each chain's swaps land when the chain (not the swap) is named. */
const PLACEHOLDER = { stellar: "G…", solana: "Base58…", monad: "0x…" };

/* An asset as the table shows it: the chain's ticker for "native", a long mint or
   contract shortened, a Stellar code as is. */
function chainAsset(asset, chain = "stellar") {
  if (!asset || asset === "native") return NATIVE[chain] || "XLM";
  return asset.length > 16 ? `${asset.slice(0, 4)}…${asset.slice(-4)}` : asset;
}

/* "0.5 XLM → ~12.3 USDC" — the swap's sent → received route for the table. */
function swapRoute(s) {
  const chain = s.chain || "stellar";
  const sent = `${s.sendAmount ?? "—"} ${chain === "stellar" ? assetLabel(s.sendAsset) : chainAsset(s.sendAsset, chain)}`;
  const got = `${s.destEstimated ?? s.swapAmount ?? "—"} ${chain === "stellar" ? s.destAsset || "" : chainAsset(s.destAsset, chain)}`.trim();
  return `${sent} → ${got}`;
}

/* The explorer each chain's transactions are read on. */
const EXPLORERS = {
  stellar: (s) => `https://stellar.expert/explorer/${s.network === "public" ? "public" : "testnet"}/tx/${s.txHash}`,
  solana: (s) => `https://solscan.io/tx/${s.txHash}`,
  monad: (s) => `https://monadscan.com/tx/${s.txHash}`,
};
const explorerTx = (s) => EXPLORERS[s.chain || "stellar"](s);

export function SwapsView({ canManage = true, orgId, env = "dev" }) {
  const t = useT();
  const sw = t.dash.swaps;
  const [chain, setChain] = useState("stellar");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const [modal, setModal] = useState(false);
  const [detail, setDetail] = useState(null);

  // Solana (Jupiter) and Monad (Kuru Flow) exist on mainnet only.
  const unavailable = chain !== "stellar" && env !== "prod";

  const load = useCallback(() => {
    setLoading(true);
    swapsApi.list(orgId, env, { take: 100, chain })
      .then((res) => { setRows(Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : []); setError(false); })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [env, orgId, chain]);
  useEffect(() => { load(); }, [load]);
  // Live refresh while the tab is visible so an on-chain submission flips status.
  const refresh = useCallback(() => {
    swapsApi.list(orgId, env, { take: 100, chain })
      .then((res) => setRows(Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : []))
      .catch(() => {});
  }, [env, orgId, chain]);
  usePolling(refresh, 8000);

  const view = rows.filter((s) => {
    if (filter !== "all" && s.status !== filter) return false;
    if (!q) return true;
    const hay = `${s.id} ${s.source || ""} ${s.destination || ""} ${s.sendAsset || ""} ${s.destAsset || ""}`.toLowerCase();
    return hay.includes(q.toLowerCase());
  });
  const pg = usePaged(view, q + "|" + filter + "|" + chain);
  const tref = useRef(null); useGsapRows(tref, pg.page + "|" + view.length);

  const onCreated = (swap) => { setModal(false); setRows((r) => [swap, ...r]); setDetail(swap); };

  return (
    <>
      <ViewHead title={sw.title} sub={fmt(sw.sub, { n: rows.length })}>
        {canManage && <button className="btn btn-dark btn-sm" disabled={unavailable} onClick={() => setModal(true)}>{DI.plus} {sw.create}</button>}
      </ViewHead>
      {!canManage && <div className="note-bar" style={{ marginBottom: 16 }}>{DI.link}<span>{sw.readOnly}</span></div>}
      <div className="filter-tabs" style={{ marginBottom: 8 }} aria-label={sw.chainLabel}>
        {CHAINS.map((c) => <button key={c} className={chain === c ? "on" : ""} onClick={() => { setChain(c); setDetail(null); }}>{sw.chains[c]} · {sw.venues[c]}</button>)}
      </div>
      {unavailable && <div className="note-bar" style={{ marginBottom: 16 }}>{DI.network}<span>{sw.mainnetOnly}</span></div>}
      <div className="filter-tabs">{FILTER_KEYS.map((k) => <button key={k} className={filter === k ? "on" : ""} onClick={() => setFilter(k)}>{sw.filters[k]}</button>)}</div>
      <div className="panel">
        <Toolbar q={q} setQ={setQ} placeholder={sw.searchPlaceholder}>
          <span className="env-tag">{DI.network} {env === "prod" ? sw.network.prod : sw.network.dev}</span>
        </Toolbar>
        {!loading && !error && view.length > 0 && (
          <div className="t-scroll" ref={tref}><table className="tx"><thead><tr><th>{sw.tableHead.id}</th><th>{sw.tableHead.route}</th><th>{sw.tableHead.status}</th><th>{sw.tableHead.created}</th></tr></thead>
            <tbody>{pg.slice.map((s) => (
              <tr key={s.id} className="row-click" onClick={() => setDetail(s)}>
                <td className="tid">{s.id}</td>
                <td className="amt">{swapRoute(s)}</td>
                <td><Pill st={STATUS_PILL[s.status] || "ref"} label={(sw.status && sw.status[s.status]) || s.status} /></td>
                <td className="cust">{fmtDateTime(s.createdAt)}</td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
        {loading && <div className="empty">{sw.loading}</div>}
        {!loading && error && <div className="empty">{sw.loadError}</div>}
        {!loading && !error && !view.length && <div className="empty">{sw.empty}</div>}
        {!loading && !error && view.length > 0 && <Pagination {...pg} />}
      </div>
      {modal && chain === "stellar" && <CreateSwapModal sw={sw} orgId={orgId} env={env} onClose={() => setModal(false)} onCreated={onCreated} />}
      {modal && chain !== "stellar" && <CreateChainSwapModal sw={sw} chain={chain} orgId={orgId} env={env} onClose={() => setModal(false)} onCreated={onCreated} />}
      {detail && !detail.chain && <SwapDetailModal sw={sw} swap={detail} orgId={orgId} env={env} canManage={canManage} onClose={() => setDetail(null)} />}
      {detail && detail.chain && <ChainSwapDetailModal sw={sw} swap={detail} orgId={orgId} env={env} canManage={canManage} onClose={() => setDetail(null)} />}
    </>
  );
}

/* ---------------- create modal (quote → create) ---------------- */
function CreateSwapModal({ sw, orgId, env, onClose, onCreated }) {
  const t = useT();
  const m = sw.modal;
  const [source, setSource] = useState("");
  const [amount, setAmount] = useState("");
  const [destAssetCode, setDestAssetCode] = useState("USDC");
  const [destAssetIssuer, setDestAssetIssuer] = useState("");
  const [slippageBps, setSlippageBps] = useState("");
  const [quote, setQuote] = useState(null);
  const [quoting, setQuoting] = useState(false);
  const [busy, setBusy] = useState(false);

  const needsIssuer = !!destAssetCode.trim() && !["xlm", "native"].includes(destAssetCode.trim().toLowerCase());
  const baseValid = amount.trim() && destAssetCode.trim() && (!needsIssuer || destAssetIssuer.trim());
  const canCreate = baseValid && source.trim();

  const quoteBody = () => ({
    org: orgId,
    environment: env,
    amount: amount.trim(),
    destAssetCode: destAssetCode.trim(),
    ...(needsIssuer && destAssetIssuer.trim() ? { destAssetIssuer: destAssetIssuer.trim() } : {}),
    ...(slippageBps.trim() ? { slippageBps: Number(slippageBps.trim()) } : {}),
  });

  // Re-quoting after an input change clears the stale quote so the user re-prices.
  const onChange = (setter) => (e) => { setter(e.target.value); setQuote(null); };

  const getQuote = () => {
    if (!baseValid || quoting) return;
    setQuoting(true);
    swapsApi.quote(quoteBody())
      .then((qt) => setQuote(qt))
      .catch((err) => showToast((err && err.message) || sw.quoteError, "error"))
      .finally(() => setQuoting(false));
  };

  const submit = () => {
    if (!canCreate || busy) return;
    setBusy(true);
    swapsApi.create({ ...quoteBody(), source: source.trim() })
      .then((swap) => onCreated(swap))
      .catch((err) => showToast((err && err.message) || sw.createError, "error"))
      .finally(() => setBusy(false));
  };

  const fee = quote && quote.fee;
  const dest = quote && quote.destination;

  return (
    <Modal onClose={onClose}>
      <div className="modal-body">
        <div className="modal-eyebrow">{m.eyebrow}</div>
        <h3>{m.title}</h3>
        <p>{m.desc}</p>
        <Field label={m.source} hint={m.sourceHint} value={source} onChange={onChange(setSource)} placeholder="G…" autoFocus />
        <Field label={m.amount} hint={m.amountHint} value={amount} onChange={onChange(setAmount)} placeholder="100.00" inputMode="decimal" />
        <AssetSelect
          network={env === "prod" ? "public" : "testnet"}
          label={m.destAsset} codeLabel={m.destAsset} issuerLabel={m.destIssuer}
          hint={m.destAssetHint} issuerHint={m.destIssuerHint}
          code={destAssetCode} issuer={destAssetIssuer}
          onCode={(v) => { setDestAssetCode(v); setQuote(null); }}
          onIssuer={(v) => { setDestAssetIssuer(v); setQuote(null); }}
          customText={t.dash.common.assetCustom} codePlaceholder="USDC"
        />
        <Field label={m.slippage} hint={m.slippageHint} value={slippageBps} onChange={onChange(setSlippageBps)} placeholder="50" inputMode="numeric" />

        <div className="paylink-actions" style={{ marginBottom: 14 }}>
          <button className="btn btn-soft btn-sm" disabled={!baseValid || quoting} onClick={getQuote}>{quoting ? m.quoting : m.getQuote}</button>
        </div>

        {quote && (
          <div className="paylink-fields" style={{ marginBottom: 16 }}>
            <div className="modal-eyebrow" style={{ marginBottom: 8 }}>{m.quoteTitle}</div>
            {dest && <CopyField label={m.estimated} value={`${dest.estimated} ${destAssetCode.trim().toUpperCase()}`} />}
            {dest && dest.minimum != null && <CopyField label={m.minimum} value={`${dest.minimum} ${destAssetCode.trim().toUpperCase()}`} />}
            {fee && <CopyField label={m.fee} value={`${fee.amount} ${assetLabel(fee.asset)} (${fee.bps} ${m.bps})`} />}
            <p className="field-note">{m.feeNote}</p>
          </div>
        )}

        <div className="modal-actions">
          <button className="btn btn-violet" disabled={!canCreate || busy} onClick={submit}>{busy ? m.creating : m.create}</button>
          <button className="btn btn-soft" onClick={onClose}>{t.dash.common.cancel}</button>
        </div>
      </div>
    </Modal>
  );
}

/* ---------------- create modal for Solana (Jupiter) / Monad (Kuru Flow) ---------------- */
function CreateChainSwapModal({ sw, chain, orgId, env, onClose, onCreated }) {
  const t = useT();
  const m = sw.modal;
  const c = sw.chainModal;
  const [source, setSource] = useState("");
  const [amount, setAmount] = useState("");
  const [sourceAssetCode, setSourceAssetCode] = useState(NATIVE[chain]);
  const [destAssetCode, setDestAssetCode] = useState("");
  const [slippageBps, setSlippageBps] = useState("");
  const [quote, setQuote] = useState(null);
  const [quoting, setQuoting] = useState(false);
  const [busy, setBusy] = useState(false);

  const baseValid = amount.trim() && sourceAssetCode.trim() && destAssetCode.trim();
  const canCreate = baseValid && source.trim();

  const quoteBody = () => ({
    org: orgId,
    environment: env,
    chain,
    amount: amount.trim(),
    sourceAssetCode: sourceAssetCode.trim(),
    destAssetCode: destAssetCode.trim(),
    ...(slippageBps.trim() ? { slippageBps: Number(slippageBps.trim()) } : {}),
  });
  const onChange = (setter) => (e) => { setter(e.target.value); setQuote(null); };

  const getQuote = () => {
    if (!baseValid || quoting) return;
    setQuoting(true);
    swapsApi.quote(quoteBody())
      .then((qt) => setQuote(qt))
      .catch((err) => showToast((err && err.message) || sw.quoteError, "error"))
      .finally(() => setQuoting(false));
  };

  const submit = () => {
    if (!canCreate || busy) return;
    setBusy(true);
    swapsApi.create({ ...quoteBody(), source: source.trim() })
      .then((swap) => onCreated(swap))
      .catch((err) => showToast((err && err.message) || sw.createError, "error"))
      .finally(() => setBusy(false));
  };

  const fee = quote && quote.fee;
  const dest = quote && quote.destination;
  const assetHint = (hint) => fmt(hint, { native: NATIVE[chain] });

  return (
    <Modal onClose={onClose}>
      <div className="modal-body">
        <div className="modal-eyebrow">{sw.chains[chain]}</div>
        <h3>{m.title}</h3>
        <p>{fmt(c.desc, { chain: sw.chains[chain], venue: sw.venues[chain] })}</p>
        <Field label={m.source} hint={c.sourceHint[chain]} value={source} onChange={onChange(setSource)} placeholder={PLACEHOLDER[chain]} autoFocus />
        <Field label={c.sourceAsset} hint={assetHint(c.sourceAssetHint)} value={sourceAssetCode} onChange={onChange(setSourceAssetCode)} placeholder={NATIVE[chain]} />
        <Field label={m.amount} value={amount} onChange={onChange(setAmount)} placeholder="1.00" inputMode="decimal" />
        <Field label={m.destAsset} hint={assetHint(c.destAssetHint)} value={destAssetCode} onChange={onChange(setDestAssetCode)} placeholder={PLACEHOLDER[chain]} />
        <Field label={m.slippage} hint={m.slippageHint} value={slippageBps} onChange={onChange(setSlippageBps)} placeholder="50" inputMode="numeric" />

        <div className="paylink-actions" style={{ marginBottom: 14 }}>
          <button className="btn btn-soft btn-sm" disabled={!baseValid || quoting} onClick={getQuote}>{quoting ? m.quoting : m.getQuote}</button>
        </div>

        {quote && (
          <div className="paylink-fields" style={{ marginBottom: 16 }}>
            <div className="modal-eyebrow" style={{ marginBottom: 8 }}>{m.quoteTitle}</div>
            {dest && <CopyField label={m.estimated} value={`${dest.estimated} ${chainAsset(dest.asset, chain)}`} />}
            {dest && dest.minimum != null && <CopyField label={m.minimum} value={`${dest.minimum} ${chainAsset(dest.asset, chain)}`} />}
            {fee && <CopyField label={m.fee} value={`${fee.amount} ${chainAsset(fee.asset, chain)} (${fee.bps} ${m.bps})`} />}
            <p className="field-note">{c.feeNote}</p>
          </div>
        )}

        <div className="modal-actions">
          <button className="btn btn-violet" disabled={!canCreate || busy} onClick={submit}>{busy ? m.creating : m.create}</button>
          <button className="btn btn-soft" onClick={onClose}>{t.dash.common.cancel}</button>
        </div>
      </div>
    </Modal>
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
    if (TERMINAL.includes(data.status)) return;
    let alive = true;
    const h = setInterval(() => {
      if (document.hidden) return;
      swapsApi.get(swap.id, orgId, env).then((full) => { if (alive && full) setData(full); }).catch(() => {});
    }, 5000);
    return () => { alive = false; clearInterval(h); };
  }, [swap.id, orgId, env, data.status]);
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

  const submit = () => {
    if (!signed.trim() || busy) return;
    setBusy(true);
    setOutcome(null);
    swapsApi.submit(swap.id, orgId, env, { signedXdr: signed.trim() })
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

  const isTerminal = TERMINAL.includes(data.status);

  return (
    <Modal onClose={onClose}>
      <div className="modal-body paylink-detail">
        <div className="modal-eyebrow">{d.eyebrow}</div>
        <h3>{d.title}</h3>

        {data.qr && (
          <div className="paylink-qr-wrap">
            <img className="paylink-qr" src={data.qr} alt={d.scan} width={220} height={220} />
            <div className="paylink-qr-cap">{d.scan}</div>
            <a className="btn btn-soft btn-sm" href={data.qr} download={`swap-${data.id}.png`}>{DI.download} {d.downloadQr}</a>
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

        {/* Submit the signed transaction (only while the swap is not yet terminal). */}
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
    [F.sent, data.sendAmount ? `${data.sendAmount} ${chainAsset(data.sendAsset, chain)}` : null],
    [F.received, data.destEstimated ? `${data.destEstimated} ${chainAsset(data.destAsset, chain)}` : null],
    [F.minimum, data.destMin ? `${data.destMin} ${chainAsset(data.destAsset, chain)}` : null],
    [F.fee, data.feeAmount ? `${data.feeAmount} ${chainAsset(data.destAsset, chain)} (${data.feeBps} ${sw.modal.bps})` : null],
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
            <a className="btn btn-soft btn-sm" href={explorerTx(data)} target="_blank" rel="noopener noreferrer">{DI.network} {d.viewExplorer}</a>
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
