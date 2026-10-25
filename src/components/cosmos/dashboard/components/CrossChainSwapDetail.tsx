/* CrossChainSwapDetailModal: one swap between chains (NEAR Intents), opened from the swaps list.
   While it waits for its deposit it shows where to pay (address, memo on Stellar, QR, wallet
   link) and lets the merchant report the deposit; then its legs' transactions. */
import { useState, useEffect } from "react";
import { Modal, showToast } from "@/components/cosmos/shared";
import { useT, fmt } from "@/lib/i18n/index";
import { crossChainSwaps as api } from "@/lib/api-client";
import { DI } from "@/components/cosmos/dashboard/icons";
import { fmtDateTime } from "@/components/cosmos/dashboard/helpers";
import { CopyBlock, CopyField } from "@/components/cosmos/dashboard/components/PayLinkDetail";
import { networkName } from "@/lib/chains";

export const CROSS_FINAL = ["SUCCEEDED", "REFUNDED", "FAILED"];

/* "100 XLM (Stellar) → ~0.08 SOL (Solana)". */
export const crossRoute = (s) =>
  `${s.amountIn} ${s.originAsset} (${networkName(s.originChain)}) → ${s.amountOut || `~${s.amountOutEstimated}`} ${s.destinationAsset} (${networkName(s.destinationChain)})`;

export function CrossChainSwapDetailModal({ swap, orgId, env, canManage, onClose }) {
  const t = useT();
  const cc = t.dash.crossChain;
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
    if (CROSS_FINAL.includes(data.status)) return;
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
      .catch((err) => showToast((err && err.message) || d.reportError, "error"))
      .finally(() => setBusy(false));
  };

  const F = d.fields;
  const awaiting = data.status === "AWAITING_DEPOSIT" || data.status === "INCOMPLETE_DEPOSIT";
  const fields = [
    [F.id, data.id],
    [F.status, cc.status[data.status] || data.status],
    [F.route, crossRoute(data)],
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
            {/* A wallet link where the network has a standard one; elsewhere the address (and memo) and the QR. */}
            {data.depositUri ? (
              <CopyBlock label={d.depositUri} value={data.depositUri}>
                <div className="paylink-actions"><a className="btn btn-dark btn-sm" href={data.depositUri}>{DI.link} {d.openWallet}</a></div>
              </CopyBlock>
            ) : <p className="field-note">{fmt(d.noLink, { chain: networkName(data.originChain) })}</p>}
          </>
        )}

        <div className="paylink-fields">
          {fields.map(([label, v]) => <CopyField key={label} label={label} value={v} />)}
        </div>

        {txs.length > 0 && (
          <div className="paylink-fields">
            <div className="modal-eyebrow">{d.txs}</div>
            {txs.map((x) => (
              <div key={x.hash} className="paylink-actions"><a className="btn btn-soft btn-sm" href={x.explorerUrl} target="_blank" rel="noopener noreferrer">{DI.network} {x.hash.slice(0, 10)}…</a></div>
            ))}
          </div>
        )}

        {canManage && awaiting && (
          <div className="paylink-block">
            <div className="paylink-block-head"><label className="field-l" htmlFor={`xswap-deposit-${data.id}`}>{d.reportTitle}</label></div>
            <p className="field-note">{d.reportDesc}</p>
            <input id={`xswap-deposit-${data.id}`} className="field" value={txHash} onChange={(e) => setTxHash(e.target.value)} placeholder={d.reportPlaceholder} />
            <div className="modal-actions">
              <button className="btn btn-violet" disabled={!txHash.trim() || busy} onClick={report}>{busy ? d.reporting : d.report}</button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
