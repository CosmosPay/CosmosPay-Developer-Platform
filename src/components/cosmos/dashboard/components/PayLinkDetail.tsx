import { useState, useEffect } from "react";
import { Modal, showToast, IcCopy, IcCheck } from "@/components/cosmos/shared";
import { useCopy } from "@/components/cosmos/hooks/useCopy";
import { useT } from "@/lib/i18n/index";
import { paymentIntents as payApi } from "@/lib/api-client";
import { DI } from "@/components/cosmos/dashboard/icons";
import { fmtDateTime } from "@/components/cosmos/dashboard/helpers";

/* Map an upstream status to a status-pill class (reuses the existing ok/fail/ref pills). */
export const STATUS_PILL = { SUCCEEDED: "ok", FAILED: "fail", EXPIRED: "fail", CANCELLED: "fail", PENDING: "ref", SUBMITTED: "ref" };

/* "native" → XLM; otherwise the asset code as stored. */
export function assetLabel(asset) { return !asset || asset === "native" ? "XLM" : asset; }
export function amountLabel(intent, pl) { return intent.amount ? `${intent.amount} ${assetLabel(intent.asset)}` : pl.anyAmount; }

/* A settled/submitted intent carries an on-chain transaction hash. Only then does
   an explorer link / transaction id make sense. */
export function hasTransaction(intent) { return !!(intent && intent.txHash); }

/* stellar.expert link to the on-chain transaction (only valid when txHash exists). */
export function explorerUrl(intent) {
  const net = intent.network === "public" ? "public" : "testnet";
  return `https://stellar.expert/explorer/${net}/tx/${intent.txHash}`;
}

/* Shared table row-actions cell: view the payment, open the Stellar tx (only when one
   exists), and delete (only when the caller can manage AND the link isn't paid).
   Reused by the Payments and Balances tables so both behave identically. */
export function PayLinkRowActions({ intent, t, pl, onView, canManage = false, onDelete }) {
  return (
    <td className="paylink-row-actions" onClick={(e) => e.stopPropagation()}>
      <button className="icon-mini" title={pl.detail.eyebrow} aria-label={pl.detail.eyebrow} onClick={() => onView(intent)}>{DI.docs}</button>
      {hasTransaction(intent)
        ? <a className="icon-mini" title={t.dash.balances.explorer} aria-label={t.dash.balances.explorer} href={explorerUrl(intent)} target="_blank" rel="noopener noreferrer">{DI.network}</a>
        : <button className="icon-mini" title={t.dash.balances.explorer} aria-label={t.dash.balances.explorer} disabled>{DI.network}</button>}
      {canManage && intent.status !== "SUCCEEDED" && <button className="icon-mini danger" title={pl.detail.delete} aria-label={pl.detail.delete} onClick={() => onDelete(intent)}>{DI.trash}</button>}
    </td>
  );
}

/* A single copyable key/value row (click anywhere on it to copy the value). */
function CopyField({ label, value }) {
  const t = useT();
  const [done, copy] = useCopy();
  const text = String(value);
  return (
    <button type="button" className={`paylink-field copyable${done ? " done" : ""}`} onClick={() => copy(text, t.toasts.copied)} title={t.toasts.copy || label}>
      <span className="pf-k">{label}</span>
      <span className="pf-v">{text}</span>
      <span className="pf-copy">{done ? <IcCheck /> : <IcCopy />}</span>
    </button>
  );
}

/* A labelled, copyable long-text block (the SEP-7 URI or the unsigned XDR). */
function CopyBlock({ label, value, children }) {
  const t = useT();
  const [done, copy] = useCopy();
  return (
    <div className="paylink-block">
      <div className="paylink-block-head">
        <label className="field-l">{label}</label>
        <button type="button" className={`copy-mini${done ? " done" : ""}`} onClick={() => copy(value, t.toasts.copied)} title={t.toasts.copy || label} aria-label={t.toasts.copy || label}>
          {done ? <IcCheck /> : <IcCopy />}
        </button>
      </div>
      <div className="paylink-code" onClick={() => copy(value, t.toasts.copied)} title={t.toasts.copy || label}>{value}</div>
      {children}
    </div>
  );
}

/* Shared detail modal: QR + SEP-7 URI + (unsigned XDR) + explorer link + copyable
   fields. Used by both Payments and Balances so a settlement opens the same view. */
export function PayLinkDetailModal({ pl, intent, env, canManage = false, onClose, onDeleted = () => {} }) {
  const t = useT();
  const d = pl.detail;
  // List rows don't carry the derived QR (and may have a stale status), so fetch the
  // full record. Seed with the row we already have for an instant first paint.
  const [data, setData] = useState(intent);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (data.qr) return;
    let alive = true;
    payApi.get(intent.id, env).then((full) => { if (alive && full) setData(full); }).catch(() => {});
    return () => { alive = false; };
  }, [intent.id, env]);

  // Live updates while the modal is open: poll until the intent reaches a terminal
  // state, so the user sees it flip to paid/failed in real time (status, tx id, QR).
  useEffect(() => {
    const TERMINAL = ["SUCCEEDED", "FAILED", "CANCELLED", "EXPIRED"];
    if (TERMINAL.includes(data.status)) return;
    let alive = true;
    const tick = () => payApi.get(intent.id, env).then((full) => { if (alive && full) setData(full); }).catch(() => {});
    const h = setInterval(() => { if (!document.hidden) tick(); }, 5000);
    return () => { alive = false; clearInterval(h); };
  }, [intent.id, env, data.status]);

  const remove = () => {
    if (busy) return;
    setBusy(true);
    payApi.remove(data.id, env)
      .then(() => { showToast(d.deleteTitle); onDeleted(data.id); })
      .catch((err) => showToast((err && err.message) || pl.deleteError, "error"))
      .finally(() => setBusy(false));
  };

  const F = d.fields;
  const fields = [
    [F.id, data.id],
    [F.status, (pl.status && pl.status[data.status]) || data.status],
    [F.kind, pl.kinds[data.kind] || data.kind],
    [F.network, data.network],
    [F.destination, data.destination],
    [F.source, data.source],
    [F.amount, amountLabel(data, pl)],
    [F.asset, assetLabel(data.asset)],
    [pl.modal.assetIssuer, data.assetIssuer],
    [F.memo, data.memo],
    [F.message, data.msg],
    // Stellar transaction id — only present once paid/submitted.
    [F.txHash, data.txHash],
    [F.created, fmtDateTime(data.createdAt)],
  ].filter(([, v]) => v !== null && v !== undefined && v !== "");

  return (
    <Modal onClose={onClose}>
      <div className="modal-body paylink-detail">
        <div className="modal-eyebrow">{d.eyebrow}</div>
        <h3>{d.title}</h3>

        <div className="paylink-qr-wrap">
          {data.qr
            ? <img className="paylink-qr" src={data.qr} alt={d.scan} width={220} height={220} />
            : <div className="paylink-qr paylink-qr-skel" aria-hidden="true" />}
          <div className="paylink-qr-cap">{d.scan}</div>
          {data.qr && <a className="btn btn-soft btn-sm" href={data.qr} download={`paylink-${data.id}.png`}>{DI.download} {d.downloadQr}</a>}
        </div>

        <CopyBlock label={d.uri} value={data.uri}>
          <div className="paylink-actions">
            <a className="btn btn-dark btn-sm" href={data.uri}>{DI.link} {d.openWallet}</a>
            {/* No transaction exists until the payment is submitted/paid. */}
            {hasTransaction(data) && <a className="btn btn-soft btn-sm" href={explorerUrl(data)} target="_blank" rel="noopener noreferrer">{DI.network} {t.dash.balances.explorer}</a>}
          </div>
        </CopyBlock>

        {data.xdr && <CopyBlock label={d.xdr} value={data.xdr} />}

        <div className="paylink-fields">
          {fields.map(([label, v]) => <CopyField key={label} label={label} value={v} />)}
        </div>

        {/* A paid (settled) link is an immutable record — it can't be deleted. */}
        {canManage && data.status !== "SUCCEEDED" && (
          <div className="modal-actions">
            {confirming ? (
              <>
                <button className="btn btn-danger" disabled={busy} onClick={remove}>{d.deleteConfirm}</button>
                <button className="btn btn-soft" onClick={() => setConfirming(false)}>{t.dash.common.cancel}</button>
              </>
            ) : (
              <button className="btn btn-soft danger-soft" onClick={() => setConfirming(true)}>{DI.trash} {d.delete}</button>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
