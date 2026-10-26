/* PaymentRecordView: one payment on a view of its own (product owner: a payment opens on its own
   page, not in a dialog), at /dashboard?view=payment&id=<id>, a history entry of its own so Back
   returns to the list it came from. At the top, the payment at a glance: its status and amount,
   the actions (its checkout, the explorer once there is a transaction, deleting it while it is
   not settled), its id, network, date and both accounts. Under it, the QR (it stays in view)
   beside everything a payer or a developer may need: the checkout link, the wallet link, the
   unsigned XDR, every field, for an open Stellar payment checking a transaction hash, and last
   the checkout's design. The record is
   read by id (the list's row may be stale) and followed while it is not final. */
import { useEffect, useState } from "react";
import { showToast, checkoutUrl } from "@/components/cosmos/shared";
import { useT } from "@/lib/i18n/index";
import { paymentIntents as payApi } from "@/lib/api-client";
import { DI } from "@/components/cosmos/dashboard/icons";
import { fmtDateTime } from "@/components/cosmos/dashboard/helpers";
import { ViewHead } from "@/components/cosmos/dashboard/components/ViewHead";
import { ListSkeleton } from "@/components/cosmos/dashboard/components/Skeleton";
import { CheckoutDesignPicker } from "@/components/cosmos/dashboard/components/CheckoutDesignPicker";
import { CopyBlock, CopyField, PaymentAmount, STATUS_PILL, assetLabel, amountLabel, chainOf, explorerUrl, networkLabel } from "@/components/cosmos/dashboard/components/PayLinkDetail";
import { Pill } from "@/components/cosmos/dashboard/components/Pill";
import { StatusIcon, paymentTone } from "@/components/cosmos/dashboard/components/StatusIcon";
import { NetworkMark } from "@/components/cosmos/dashboard/components/OrgWallets";
import { AddressLink } from "@/components/cosmos/dashboard/components/AddressLink";
import { CopyRef } from "@/components/cosmos/dashboard/components/RecordLink";

const TERMINAL = ["SUCCEEDED", "FAILED", "CANCELLED", "EXPIRED"];

export function PaymentRecordView({ id, env, canManage = false, onBack }) {
  const t = useT();
  const pl = t.dash.paylinks;
  // undefined while it loads, null when it is not in this organization or environment.
  const [data, setData] = useState(undefined);
  useEffect(() => {
    let alive = true;
    setData(undefined);
    payApi.get(id, env).then((p) => { if (alive) setData(p && p.id ? p : null); }).catch(() => { if (alive) setData(null); });
    return () => { alive = false; };
  }, [id, env]);
  // Followed while it is not final, so it flips to paid or failed on screen.
  const status = data && data.status;
  useEffect(() => {
    if (!status || TERMINAL.includes(status)) return;
    let alive = true;
    const h = setInterval(() => { if (!document.hidden) payApi.get(id, env).then((p) => { if (alive && p && p.id) setData(p); }).catch(() => {}); }, 5000);
    return () => { alive = false; clearInterval(h); };
  }, [id, env, status]);

  return (
    <>
      <ViewHead title={pl.detail.eyebrow} />
      <div className="record-back">
        <button type="button" className="link-btn" onClick={onBack}>{t.dash.overview.hub.viewAll}</button>
      </div>
      {data === undefined && <div className="panel"><ListSkeleton label={t.dash.cosmos.loading} rows={4} pairs={5} /></div>}
      {data === null && <div className="panel"><div className="empty">{t.dash.common.notFound}</div></div>}
      {data && <PaymentRecord data={data} setData={setData} env={env} canManage={canManage} onDeleted={onBack} />}
    </>
  );
}

function PaymentRecord({ data, setData, env, canManage, onDeleted }) {
  const t = useT();
  const pl = t.dash.paylinks;
  const d = pl.detail;
  const h = t.dash.overview.hub;
  const cm = t.dash.common;
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [savingTheme, setSavingTheme] = useState(false);
  // A Stellar payment still open can be checked against a transaction the payer sent from a
  // wallet that never reported back: the Payments API verifies it and settles the link.
  const [txHash, setTxHash] = useState("");
  const [checking, setChecking] = useState(false);
  const chain = chainOf(data);
  const paid = data.status === "SUCCEEDED";
  const tone = paymentTone(data.status);
  const canCheck = canManage && chain === "stellar" && ["PENDING", "SUBMITTED"].includes(data.status);
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
  const remove = () => {
    if (busy) return;
    setBusy(true);
    payApi.remove(data.id, env)
      .then(() => { showToast(d.deleteTitle); onDeleted(); })
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
  const explorer = explorerUrl(data);
  const F = d.fields;
  const fields = [
    [F.kind, pl.kinds[data.kind] || data.kind],
    [F.amount, amountLabel(data, pl)],
    [F.asset, assetLabel(data.asset, chain)],
    [chain === "stellar" ? pl.modal.assetIssuer : t.dash.tokens.address[chain], data.assetIssuer],
    [F.memo, data.memo],
    [F.message, data.msg],
    // The on-chain transaction id, only present once paid or submitted.
    [F.txHash, data.txHash],
  ].filter(([, v]) => v !== null && v !== undefined && v !== "");

  return (
    <div className="pay-record">
      {/* The payment at a glance. */}
      <section className="panel pay-record-head" aria-label={d.eyebrow}>
        <div className="pay-record-top">
          <StatusIcon tone={tone} size={30} />
          <div className="pay-record-amount">
            <PaymentAmount intent={data} pl={pl} size={30} />
            <Pill st={STATUS_PILL[data.status] || "ref"} tone={tone} label={(pl.status && pl.status[data.status]) || data.status} />
          </div>
          <div className="pay-record-actions">
            <a className="btn btn-dark btn-sm" href={checkoutUrl(data.id)} target="_blank" rel="noopener noreferrer">{DI.link} {d.openCheckout}</a>
            {/* No transaction exists until the payment is submitted or paid: drawn, disabled. */}
            {explorer
              ? <a className="btn btn-outline-w btn-sm" href={explorer} target="_blank" rel="noopener noreferrer">{DI.network} {t.dash.balances.explorer}</a>
              : <button type="button" className="btn btn-outline-w btn-sm" disabled title={cm.noTxYet}>{DI.network} {t.dash.balances.explorer}</button>}
            {/* A paid (settled) link is an immutable record: it can't be deleted. */}
            {canManage && (confirming ? (
              <>
                <button type="button" className="btn btn-danger btn-sm" disabled={busy} onClick={remove}>{d.deleteConfirm}</button>
                <button type="button" className="btn btn-soft btn-sm" onClick={() => setConfirming(false)}>{cm.cancel}</button>
              </>
            ) : (
              <button type="button" className="btn btn-soft btn-sm danger-soft" disabled={paid} title={paid ? cm.paidNoDelete : undefined} onClick={() => setConfirming(true)}>{DI.trash} {d.delete}</button>
            ))}
          </div>
        </div>
        <dl className="pay-record-facts">
          <div><dt>{F.id}</dt><dd><span className="ref"><code>{data.id}</code><CopyRef value={data.id} /></span></dd></div>
          <div><dt>{F.network}</dt><dd><span className="cell-mark"><NetworkMark chain={chain} size={18} /><span>{networkLabel(data)}</span></span></dd></div>
          <div><dt>{F.created}</dt><dd>{fmtDateTime(data.createdAt)}</dd></div>
          <div><dt>{h.thFrom}</dt><dd><AddressLink chain={chain} network={data.network} address={data.source} label={h.thFrom} /></dd></div>
          <div><dt>{h.thTo}</dt><dd><AddressLink chain={chain} network={data.network} address={data.destination} label={h.thTo} /></dd></div>
        </dl>
      </section>

      <div className="pay-record-grid">
        <section className="panel pay-record-qr" aria-label={d.scan}>
          {data.qr
            ? <img className="paylink-qr" src={data.qr} alt={d.scan} width={220} height={220} />
            : <div className="paylink-qr paylink-qr-skel" aria-hidden="true" />}
          <div className="paylink-qr-cap">{d.scan}</div>
          {data.qr && <a className="btn btn-soft btn-sm" href={data.qr} download={`paylink-${data.id}.png`}>{DI.download} {d.downloadQr}</a>}
        </section>

        <section className="panel pay-record-main paylink-detail">
          {/* The hosted page on payments.cosmospay.lat: what to send a payer who has no wallet
              open on this screen. It reads the link itself and follows its status. */}
          <CopyBlock label={d.checkout} value={checkoutUrl(data.id)} />
          {data.uri && (
            <CopyBlock label={d.uriLabels[chain]} value={data.uri}>
              <div className="paylink-actions">
                <a className="btn btn-soft btn-sm" href={data.uri}>{DI.link} {d.openWallet}</a>
              </div>
            </CopyBlock>
          )}
          {data.xdr && <CopyBlock label={d.xdr} value={data.xdr} />}
          {fields.length > 0 && (
            <div className="paylink-fields">
              {fields.map(([label, v]) => <CopyField key={label} label={label} value={v} />)}
            </div>
          )}
          {canCheck && (
            <div className="paylink-block">
              <div className="paylink-block-head"><label className="field-l" htmlFor="paylink-check">{d.check.label}</label></div>
              <div className="paylink-check">
                <input id="paylink-check" className="field" value={txHash} onChange={(e) => setTxHash(e.target.value)} placeholder={d.check.placeholder} spellCheck={false} autoComplete="off" />
                <button type="button" className="btn btn-dark btn-sm" disabled={!hashOk || checking} onClick={check}>{d.check.submit}</button>
              </div>
            </div>
          )}
          {/* The checkout's look last: it takes room, and the essentials come first. */}
          {canManage && (
            <div className="paylink-block">
              <div className="paylink-block-head"><span className="field-l">{pl.design.label}</span></div>
              <CheckoutDesignPicker bare value={data.checkoutTheme || "classic"} disabled={savingTheme} onChange={changeTheme} />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
