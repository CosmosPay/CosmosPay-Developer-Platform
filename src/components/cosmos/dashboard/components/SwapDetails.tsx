/* The screens a swap opens once created, shared by the dashboard (the organization's proxies) and
   the public swap pages (the gateway with the shared public key): both pass a SwapApi
   (src/lib/swap-api.ts). One per kind of record:
   - a swap on Stellar: Freighter in one click, the SEP-7 QR / link / XDR for any other wallet, or a
     signed envelope pasted back;
   - a swap on Solana or Monad: the transaction (and any approval) to sign elsewhere, pasted back;
   - a swap between chains: NEAR Intents' deposit address (CrossChainSwapDetailModal);
   - USDT0 out of Stellar: the Soroban transaction to sign (Freighter or another wallet), then the
     LayerZero message followed to its destination.
   Each reads its record again until it settles. */
import { useEffect, useState } from "react";
import { Modal, showToast } from "@/components/cosmos/shared";
import { fmt, useT } from "@/lib/i18n/index";
import { DI } from "@/components/cosmos/dashboard/icons";
import { fmtDateTime } from "@/components/cosmos/dashboard/helpers";
import { FreighterSign } from "@/components/cosmos/dashboard/components/FreighterSign";
import { CrossChainSwapDetailModal } from "@/components/cosmos/dashboard/components/CrossChainSwapDetail";
import { assetLabel, CopyBlock, CopyField } from "@/components/cosmos/dashboard/components/PayLinkDetail";
import { assetLabel as chainAssetLabel, explorerTxUrl, networkName, tierOf } from "@/lib/chains";
import type { SwapApi, SwapRecordKind } from "@/lib/swap-api";

const TERMINAL = ["SUCCEEDED", "FAILED", "DELIVERED"];
/* A record stops changing once it settled, failed, or expired without a transaction (an expired
   Solana or Monad swap with a hash is still looked for on-chain). */
const settled = (s) => TERMINAL.includes(s.status) || (s.status === "EXPIRED" && !s.txHash);
const chainOfSwap = (s) => s.chain || "stellar";
const swapExplorer = (s) => explorerTxUrl(chainOfSwap(s), tierOf(s.network), s.txHash);

/* Polls a record until it is terminal so its status and hashes update live. */
function useRecord(api: SwapApi, kind: SwapRecordKind, rec, complete: (r) => boolean, everyMs = 5000) {
  const [data, setData] = useState(rec);
  useEffect(() => {
    if (complete(data)) return;
    let alive = true;
    api.get(kind, rec.id).then((full) => { if (alive && full) setData(full); }).catch(() => {});
    return () => { alive = false; };
  }, [rec.id, api]);
  useEffect(() => {
    if (settled(data)) return;
    let alive = true;
    const h = setInterval(() => {
      if (document.hidden) return;
      api.get(kind, rec.id).then((full) => { if (alive && full) setData(full); }).catch(() => {});
    }, everyMs);
    return () => { alive = false; clearInterval(h); };
  }, [rec.id, api, data.status, data.txHash]);
  return [data, setData];
}

/** The screen for a created record of any kind. */
export function SwapRecordDetail({ api, kind, record, canManage = true, onClose }: { api: SwapApi; kind: SwapRecordKind; record; canManage?: boolean; onClose: () => void }) {
  if (kind === "cross") return <CrossChainSwapDetailModal swap={record} api={api} canManage={canManage} onClose={onClose} />;
  if (kind === "usdt0") return <Usdt0TransferDetailModal transfer={record} api={api} canManage={canManage} onClose={onClose} />;
  if (chainOfSwap(record) === "stellar") return <SwapDetailModal swap={record} api={api} canManage={canManage} onClose={onClose} />;
  return <ChainSwapDetailModal swap={record} api={api} canManage={canManage} onClose={onClose} />;
}

/* ---------------- a swap on Stellar (QR + uri + xdr + submit signed tx) ---------------- */
function SwapDetailModal({ api, swap, canManage, onClose }) {
  const t = useT();
  const sw = t.dash.swaps;
  const d = sw.detail;
  // Seed with the row, then fetch the full record for the QR/uri/xdr.
  const [data, setData] = useRecord(api, "same", swap, (s) => !!(s.qr && s.uri));
  const [signed, setSigned] = useState("");
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState(null);

  // The signed envelope comes from Freighter or from the paste box.
  const submit = (signedXdr = signed.trim()) => {
    if (!signedXdr || busy) return;
    setBusy(true);
    setOutcome(null);
    api.submit("same", swap.id, { signedXdr })
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
  const w = t.dash.wallet;

  return (
    <Modal onClose={onClose}>
      <div className="modal-body paylink-detail">
        <div className="modal-eyebrow">{d.eyebrow}</div>
        <h3>{d.title}</h3>

        {/* Swapping into an asset the account does not trust yet: the same transaction adds the
            trustline first. Said before the signature, since it also holds 0.5 XLM in reserve. */}
        {data.status === "PENDING" && data.trustline && (
          <p className="field-help swap-trustline" role="note">{fmt(d.trustlineNote, { asset: data.trustline.code })}</p>
        )}

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

/* ---------------- a swap on Solana / Monad (transaction + approval + submit) ---------------- */
function ChainSwapDetailModal({ api, swap, canManage, onClose }) {
  const t = useT();
  const sw = t.dash.swaps;
  const d = sw.detail;
  const c = sw.chainDetail;
  const chain = swap.chain;
  const [data, setData] = useRecord(api, "same", swap, (s) => !!s.transaction);
  const [signed, setSigned] = useState("");
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState(null);

  const submit = () => {
    if (!signed.trim() || busy) return;
    setBusy(true);
    setOutcome(null);
    api.submit("same", swap.id, { signedTransaction: signed.trim() })
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

/* ---------------- USDT0 out of Stellar (LayerZero's OFT) ---------------- */
function Usdt0TransferDetailModal({ api, transfer, canManage, onClose }) {
  const t = useT();
  const sw = t.dash.swaps;
  const d = sw.detail;
  const u = sw.usdt0;
  const [data, setData] = useRecord(api, "usdt0", transfer, (x) => !!(x.xdr || x.status !== "PENDING"), 8000);
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState(null);
  const dest = networkName(data.to);

  const submit = (signedXdr: string) => {
    if (!signedXdr || busy) return;
    setBusy(true);
    setOutcome(null);
    api.submit("usdt0", transfer.id, { signedXdr })
      .then((res) => {
        setOutcome(res || {});
        if (res && res.transfer) setData((cur) => ({ ...cur, ...res.transfer }));
        if (res && res.submitted) showToast(d.submitted);
      })
      .catch((err) => { setOutcome({ submitted: false, reason: (err && err.message) || d.submitFailed }); })
      .finally(() => setBusy(false));
  };

  const F = d.fields;
  const fields = [
    [F.id, data.id],
    [F.status, (sw.status && sw.status[data.status]) || data.status],
    [F.source, data.source],
    [u.destination, dest],
    [u.recipient, data.recipient],
    [F.sent, data.amountSent ? `${data.amountSent} USDT0` : null],
    [u.arrives, data.amountReceived ? `${data.amountReceived} ${data.receives}` : null],
    // Cosmos Pay's commission, paid by the fee wrapper (none without one).
    [F.fee, Number(data.feeAmount) > 0 ? `${data.feeAmount} USDT0 (${data.feeBps} ${sw.modal.bps})` : null],
    [u.fee, data.nativeFee ? `${data.nativeFee} XLM` : null],
    [F.txHash, data.txHash],
    [u.destTx, data.destinationTxHash],
    [F.created, fmtDateTime(data.createdAt)],
  ].filter(([, v]) => v !== null && v !== undefined && v !== "");

  const signable = canManage && !!data.xdr && data.status === "PENDING";
  const w = t.dash.wallet;
  const stellarTx = data.txHash ? explorerTxUrl("stellar", tierOf(data.network), data.txHash) : null;

  return (
    <Modal onClose={onClose}>
      <div className="modal-body paylink-detail">
        <div className="modal-eyebrow">USDT0 · LayerZero</div>
        <h3>{fmt(u.title, { chain: dest })}</h3>

        {data.status === "SUBMITTED" && <p className="field-help swap-trustline" role="status">{fmt(u.travelling, { chain: dest })}</p>}
        {data.status === "DELIVERED" && <p className="field-help swap-trustline" role="status">{fmt(u.delivered, { chain: dest })}</p>}

        {signable && (
          <div className="paylink-block">
            <div className="paylink-block-head"><span className="field-l">{w.signTitle}</span></div>
            <FreighterSign xdr={data.xdr} network={data.network} signer={data.source} busy={busy} onSigned={(x) => submit(x)} />
          </div>
        )}

        {data.status === "PENDING" && data.qr && (
          <div className="paylink-qr-wrap">
            <img className="paylink-qr" src={data.qr} alt={d.scan} width={220} height={220} />
            <div className="paylink-qr-cap">{d.scan}</div>
          </div>
        )}
        {data.status === "PENDING" && data.uri && (
          <CopyBlock label={d.uri} value={data.uri}>
            <div className="paylink-actions"><a className="btn btn-dark btn-sm" href={data.uri}>{DI.link} {d.openWallet}</a></div>
          </CopyBlock>
        )}
        {data.status === "PENDING" && data.xdr && <CopyBlock label={d.xdr} value={data.xdr} />}

        {(stellarTx || data.scanUrl) && (
          <div className="paylink-actions" style={{ marginBottom: 12 }}>
            {stellarTx && <a className="btn btn-soft btn-sm" href={stellarTx} target="_blank" rel="noopener noreferrer">{DI.network} {d.viewExplorer}</a>}
            {data.scanUrl && <a className="btn btn-soft btn-sm" href={data.scanUrl} target="_blank" rel="noopener noreferrer">{DI.network} {u.scan}</a>}
          </div>
        )}

        <div className="paylink-fields">
          {fields.map(([label, v]) => <CopyField key={label} label={label} value={v} />)}
        </div>

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
