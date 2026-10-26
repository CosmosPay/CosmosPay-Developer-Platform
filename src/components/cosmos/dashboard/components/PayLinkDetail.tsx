import { useState, useEffect } from "react";
import { Modal, showToast, IcCopy, IcCheck, checkoutUrl } from "@/components/cosmos/shared";
import { useCopy } from "@/components/cosmos/hooks/useCopy";
import { useT, fmt } from "@/lib/i18n/index";
import { paymentIntents as payApi } from "@/lib/api-client";
import { DI } from "@/components/cosmos/dashboard/icons";
import { fmtDateTime } from "@/components/cosmos/dashboard/helpers";
import { CheckoutDesignPicker } from "@/components/cosmos/dashboard/components/CheckoutDesignPicker";
import { RowMenu } from "@/components/cosmos/dashboard/components/RowMenu";
import { TokenMark } from "@/components/cosmos/dashboard/components/TokenMark";
import { CHAIN_NAMES, TEST_NETWORKS, assetLabel as chainAssetLabel, explorerTxUrl, isChain, tierOf } from "@/lib/chains";

/* Map an upstream status to a status-pill class (reuses the existing ok/fail/ref pills). */
export const STATUS_PILL = { SUCCEEDED: "ok", FAILED: "fail", EXPIRED: "fail", CANCELLED: "fail", PENDING: "ref", SUBMITTED: "ref" };

/* The chain a record settles on (Stellar for a record from before chains). */
export const chainOf = (record) => (record && isChain(record.chain) ? record.chain : "stellar");
/* "native" as the chain's coin (XLM, SOL, MON), a code as stored, a long token shortened. */
export function assetLabel(asset, chain = "stellar") { return chainAssetLabel(chain, asset); }
export function amountLabel(intent, pl) { return intent.amount ? `${intent.amount} ${assetLabel(intent.asset, chainOf(intent))}` : pl.anyAmount; }
/* "Solana · Devnet" in the sandbox, "Solana" on mainnet. */
export function networkLabel(record) {
  const chain = chainOf(record);
  return tierOf(record && record.network) === "public" ? CHAIN_NAMES[chain] : `${CHAIN_NAMES[chain]} · ${TEST_NETWORKS[chain]}`;
}

/* The explorer page of the record's on-chain transaction, on its chain and network; null until
   there is a transaction (or when the hash is not one of that chain's). */
export function explorerUrl(intent) {
  return intent ? explorerTxUrl(chainOf(intent), tierOf(intent.network), intent.txHash) : null;
}
export function hasTransaction(intent) { return !!explorerUrl(intent); }

/* Shared table row-actions cell: view the payment, open its transaction (only when one
   exists; otherwise an empty slot keeps the icons in line, never a button that does nothing),
   and delete (only when the caller can manage AND the link isn't paid).
   Reused by the Payments and Balances tables so both behave identically. */
/* A payment's amount with its token's mark (and its network's badge): what the row handles. */
export function PaymentAmount({ intent, pl, size = 24 }) {
  const chain = chainOf(intent);
  return (
    <span className="cell-mark">
      <TokenMark symbol={assetLabel(intent.asset, chain)} chain={chain} chainName={CHAIN_NAMES[chain]} size={size} />
      <span>{amountLabel(intent, pl)}</span>
    </span>
  );
}

/* A payment row's actions. Every row draws the same buttons (product owner: no gaps): the explorer
   is disabled until there is a transaction, deletion once the payment completed, each saying why;
   then the row's "⋮" menu with everything a payment offers. */
export function PayLinkRowActions({ intent, t, pl, onView, canManage = false, onDelete }) {
  const cm = t.dash.common;
  const [, copy] = useCopy();
  const url = explorerUrl(intent);
  const paid = intent.status === "SUCCEEDED";
  const short = intent.id.length > 14 ? `${intent.id.slice(0, 6)}…${intent.id.slice(-4)}` : intent.id;
  return (
    <td className="paylink-row-actions" onClick={(e) => e.stopPropagation()}>
      <button className="icon-mini" title={pl.detail.eyebrow} aria-label={pl.detail.eyebrow} onClick={() => onView(intent)}>{DI.docs}</button>
      {url
        ? <a className="icon-mini" title={t.dash.balances.explorer} aria-label={t.dash.balances.explorer} href={url} target="_blank" rel="noopener noreferrer">{DI.network}</a>
        : <button type="button" className="icon-mini" disabled title={cm.noTxYet} aria-label={`${t.dash.balances.explorer}: ${cm.noTxYet}`}>{DI.network}</button>}
      {canManage && <button className="icon-mini danger" disabled={paid} title={paid ? cm.paidNoDelete : pl.detail.delete} aria-label={paid ? `${pl.detail.delete}: ${cm.paidNoDelete}` : pl.detail.delete} onClick={() => onDelete(intent)}>{DI.trash}</button>}
      <RowMenu
        label={fmt(cm.rowActions, { name: short })}
        items={[
          { key: "open", label: cm.details, icon: DI.docs, onClick: () => onView(intent) },
          { key: "tab", label: cm.openNewTab, icon: DI.link, href: `/dashboard?view=payments&open=${encodeURIComponent(intent.id)}`, external: true },
          { key: "copy", label: cm.copyId, icon: <IcCopy />, onClick: () => copy(intent.id, t.toasts.copied) },
          { key: "link", label: cm.copyLink, icon: <IcCopy />, onClick: () => copy(checkoutUrl(intent.id), t.toasts.copied) },
          { key: "checkout", label: pl.detail.openCheckout, icon: DI.payments, href: checkoutUrl(intent.id), external: true },
          { key: "explorer", label: t.dash.balances.explorer, icon: DI.network, href: url, external: true, disabled: !url, hint: cm.noTxYet },
          ...(canManage ? [{ key: "delete", label: pl.detail.delete, icon: DI.trash, danger: true, disabled: paid, hint: cm.paidNoDelete, onClick: () => onDelete(intent) }] : []),
        ]}
      />
    </td>
  );
}

/* A single copyable key/value row (click anywhere on it to copy the value). */
export function CopyField({ label, value }) {
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
export function CopyBlock({ label, value, children }) {
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
  const [savingTheme, setSavingTheme] = useState(false);
  // A Stellar payment still open can be checked against a transaction the payer sent from a
  // wallet that never reported back: the Payments API verifies it and settles the link.
  const [txHash, setTxHash] = useState("");
  const [checking, setChecking] = useState(false);
  const canCheck = canManage && chainOf(intent) === "stellar" && ["PENDING", "SUBMITTED"].includes(data.status);
  const hashOk = /^[0-9a-fA-F]{64}$/.test(txHash.trim());
  const check = () => {
    if (!hashOk || checking) return;
    setChecking(true);
    payApi.validate(data.id, env, txHash.trim())
      .then((r) => {
        if (r && r.paymentIntent) setData((x) => ({ ...x, ...r.paymentIntent }));
        else payApi.get(data.id, env).then((full) => { if (full) setData(full); }).catch(() => {});
        if (r && r.valid) { showToast(d.check.ok); setTxHash(""); }
        else showToast((r && r.reason) || d.check.bad, "error");
      })
      .catch((err) => showToast((err && err.message) || d.check.bad, "error"))
      .finally(() => setChecking(false));
  };

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

  // The checkout design can change at any time, paid links included: it only changes how
  // payments.cosmospay.lat draws the page. Optimistic, rolled back if the server refuses.
  const changeTheme = (checkoutTheme) => {
    const before = data.checkoutTheme;
    setData((x) => ({ ...x, checkoutTheme }));
    setSavingTheme(true);
    payApi.update(data.id, env, { checkoutTheme })
      .then((updated) => { if (updated) setData((x) => ({ ...x, checkoutTheme: updated.checkoutTheme || checkoutTheme })); showToast(pl.design.saved); })
      .catch(() => { setData((x) => ({ ...x, checkoutTheme: before })); showToast(pl.design.saveError, "error"); })
      .finally(() => setSavingTheme(false));
  };

  const F = d.fields;
  const fields = [
    [F.id, data.id],
    [F.status, (pl.status && pl.status[data.status]) || data.status],
    [F.kind, pl.kinds[data.kind] || data.kind],
    [F.network, networkLabel(data)],
    [F.destination, data.destination],
    [F.source, data.source],
    [F.amount, amountLabel(data, pl)],
    [F.asset, assetLabel(data.asset, chainOf(data))],
    [chainOf(data) === "stellar" ? pl.modal.assetIssuer : t.dash.tokens.address[chainOf(data)], data.assetIssuer],
    [F.memo, data.memo],
    [F.message, data.msg],
    // The on-chain transaction id, only present once paid/submitted.
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

        {/* The hosted page on payments.cosmospay.lat: what to send a payer who has no
            wallet open on this screen. It reads the link itself and follows its status. */}
        <CopyBlock label={d.checkout} value={checkoutUrl(data.id)}>
          <div className="paylink-actions">
            <a className="btn btn-dark btn-sm" href={checkoutUrl(data.id)} target="_blank" rel="noopener noreferrer">{DI.link} {d.openCheckout}</a>
          </div>
        </CopyBlock>

        {canManage && (
          <div className="paylink-block">
            <div className="paylink-block-head"><span className="field-l">{pl.design.label}</span></div>
            <CheckoutDesignPicker bare value={data.checkoutTheme || "classic"} disabled={savingTheme} onChange={changeTheme} />
          </div>
        )}

        <CopyBlock label={d.uriLabels[chainOf(data)]} value={data.uri}>
          <div className="paylink-actions">
            <a className="btn btn-soft btn-sm" href={data.uri}>{DI.link} {d.openWallet}</a>
            {/* No transaction exists until the payment is submitted/paid. */}
            {hasTransaction(data) && <a className="btn btn-soft btn-sm" href={explorerUrl(data)} target="_blank" rel="noopener noreferrer">{DI.network} {t.dash.balances.explorer}</a>}
          </div>
        </CopyBlock>

        {data.xdr && <CopyBlock label={d.xdr} value={data.xdr} />}

        <div className="paylink-fields">
          {fields.map(([label, v]) => <CopyField key={label} label={label} value={v} />)}
        </div>

        {canCheck && (
          <div className="paylink-block">
            <div className="paylink-block-head"><label className="field-l" htmlFor="paylink-check">{d.check.label}</label></div>
            <div className="paylink-check">
              <input id="paylink-check" className="field" value={txHash} onChange={(e) => setTxHash(e.target.value)} placeholder={d.check.placeholder} spellCheck={false} autoComplete="off" />
              <button type="button" className="btn btn-dark btn-sm" disabled={!hashOk || checking} onClick={check}>{d.check.submit}</button>
            </div>
          </div>
        )}

        {/* A paid (settled) link is an immutable record: it can't be deleted. */}
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
