/* PaymentRecordView: one payment on a view of its own (product owner: a payment opens on its own
   page, not in a dialog), at /dashboard?view=payment&id=<id>, a history entry of its own so Back
   returns to the list it came from. At the top, the payment at a glance: its status and amount,
   the actions (its checkout, the explorer once there is a transaction, deleting it while it is
   not settled), its id, network, date and both accounts. While it can still be paid (pending),
   the QR (it stays in view) beside everything a payer or a developer may need: the checkout
   link, the wallet link, the unsigned XDR, every field, checking a transaction hash on Stellar,
   and last the checkout's design. Once it cannot be paid (submitted, paid, failed, expired) it is
   history only: its fields, and the explorer once there is a transaction. The record is
   read by id (the list's row may be stale) and followed while it is not final, every few seconds:
   under its header, its progress live (product owner, 2026-10-27): created, the payer on the
   payment page (the hosted checkout reports when it last read the link, `checkoutSeenAt`: within
   the last half minute means someone is on it now), processing (a transaction was sent), and paid
   or how it ended. */
import { useEffect, useState } from "react";
import { showToast, checkoutUrl } from "@/components/cosmos/shared";
import { fmt, useT } from "@/lib/i18n/index";
import { paymentIntents as payApi } from "@/lib/api-client";
import { DI } from "@/components/cosmos/dashboard/icons";
import { fmtDateTime } from "@/components/cosmos/dashboard/helpers";
import { ViewHead } from "@/components/cosmos/dashboard/components/ViewHead";
import { ListSkeleton } from "@/components/cosmos/dashboard/components/Skeleton";
import { CheckoutDesignPicker } from "@/components/cosmos/dashboard/components/CheckoutDesignPicker";
import { CopyBlock, CopyField, PaymentAmount, STATUS_PILL, assetLabel, amountLabel, chainOf, explorerUrl, networkLabel } from "@/components/cosmos/dashboard/components/PayLinkDetail";
import { Pill } from "@/components/cosmos/dashboard/components/Pill";
import { paymentTone } from "@/components/cosmos/dashboard/components/StatusIcon";
import { NetworkMark } from "@/components/cosmos/dashboard/components/OrgWallets";
import { AddressLink } from "@/components/cosmos/dashboard/components/AddressLink";
import { CopyRef } from "@/components/cosmos/dashboard/components/RecordLink";
import { shortAddress } from "@/components/cosmos/dashboard/components/RecordPreview";

const TERMINAL = ["SUCCEEDED", "FAILED", "CANCELLED", "EXPIRED"];
/* How recent the checkout's last read must be to count as a payer on the page now: it polls every
   few seconds and the API notes a read at most every ten. */
const ON_PAGE_MS = 30_000;
/* How often an open payment is read again. */
const FOLLOW_MS = 4000;

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
    const h = setInterval(() => { if (!document.hidden) payApi.get(id, env).then((p) => { if (alive && p && p.id) setData(p); }).catch(() => {}); }, FOLLOW_MS);
    return () => { alive = false; clearInterval(h); };
  }, [id, env, status]);

  return (
    <>
      <ViewHead title={pl.detail.eyebrow} />
      {data === undefined && <div className="panel"><ListSkeleton label={t.dash.cosmos.loading} rows={4} pairs={5} /></div>}
      {data === null && <div className="panel"><div className="empty">{t.dash.common.notFound}</div></div>}
      {data && <PaymentRecord data={data} setData={setData} env={env} canManage={canManage} onDeleted={onBack} />}
    </>
  );
}

/* The payment's progress, live: where it stands in one sentence, then its steps. "On the page"
   holds while the checkout read the link within ON_PAGE_MS, so the clock ticks with the reads. */
function PaymentProgress({ data }) {
  const t = useT();
  const pl = t.dash.paylinks;
  const lv = pl.detail.live;
  const [now, setNow] = useState(() => Date.now());
  const open = !TERMINAL.includes(data.status);
  useEffect(() => {
    if (!open) return;
    const h = setInterval(() => setNow(Date.now()), FOLLOW_MS);
    return () => clearInterval(h);
  }, [open]);
  const status = data.status;
  const seen = data.checkoutSeenAt ? new Date(data.checkoutSeenAt).getTime() : null;
  const onPage = status === "PENDING" && seen !== null && now - seen < ON_PAGE_MS;
  const sent = status === "SUBMITTED" || status === "SUCCEEDED";
  const ended = ["FAILED", "CANCELLED", "EXPIRED"].includes(status);
  const statusLabel = (pl.status && pl.status[status]) || status;
  const time = (v) => (v ? fmtDateTime(v) : null);
  // Each step: its name, its state (done, live, current, fail, todo) and when, when known.
  const steps = [
    { key: "created", label: lv.created, state: "done", at: time(data.createdAt) },
    { key: "page", label: lv.page, state: onPage ? "live" : seen !== null || sent ? "done" : ended ? "todo" : "current", at: onPage ? lv.now : time(data.checkoutSeenAt) },
    { key: "sent", label: lv.processing, state: status === "SUBMITTED" ? "live" : status === "SUCCEEDED" ? "done" : "todo", at: null },
    { key: "end", label: ended ? statusLabel : lv.paid, state: status === "SUCCEEDED" ? "done" : ended ? "fail" : "todo", at: status === "SUCCEEDED" || ended ? time(data.updatedAt) : null },
  ];
  const headline = onPage ? lv.onPageNow
    : status === "SUBMITTED" ? lv.processingNow
    : status === "SUCCEEDED" ? lv.paidNow
    : ended ? fmt(lv.ended, { status: statusLabel })
    : seen !== null ? fmt(lv.lastSeen, { time: fmtDateTime(data.checkoutSeenAt) })
    : lv.waiting;
  const tone = onPage || status === "SUBMITTED" ? "live" : status === "SUCCEEDED" ? "ok" : ended ? "fail" : "wait";
  return (
    <section className="panel pay-live" aria-labelledby="pay-live-t">
      <div className="pay-live-head">
        <h2 id="pay-live-t" className="pay-live-title">{lv.title}</h2>
        <p className={`pay-live-now ${tone}`} role="status" aria-live="polite"><i className="pay-live-dot" aria-hidden="true" />{headline}</p>
      </div>
      <ol className="pay-steps">
        {steps.map((s) => (
          <li key={s.key} className={`pay-step ${s.state}`} aria-current={s.state === "live" || s.state === "current" ? "step" : undefined}>
            <span className="pay-step-mark" aria-hidden="true">
              {s.state === "done" && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg>}
              {s.state === "fail" && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M7 7l10 10M17 7L7 17" /></svg>}
            </span>
            <span className="pay-step-l">{s.label}</span>
            {s.at && <span className="pay-step-at">{s.at}</span>}
          </li>
        ))}
      </ol>
    </section>
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
  // Only a pending payment can still be paid: once submitted, paid, failed or expired the record
  // is history (product owner), with no checkout, QR, wallet link or design to offer.
  const payable = data.status === "PENDING";
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
    // The organization's own fee, paid to its wallet in the same transaction.
    [F.merchantFee, data.merchantFee ? `${data.merchantFee.amount} ${assetLabel(data.merchantFee.asset, chain)} · ${shortAddress(data.merchantFee.wallet)}` : null],
    // The on-chain transaction id, only present once paid or submitted.
    [F.txHash, data.txHash],
  ].filter(([, v]) => v !== null && v !== undefined && v !== "");

  return (
    <div className="pay-record">
      {/* The payment at a glance. */}
      <section className="panel pay-record-head" aria-label={d.eyebrow}>
        <div className="pay-record-top">
          <div className="pay-record-amount">
            <PaymentAmount intent={data} pl={pl} size={30} />
            <Pill st={STATUS_PILL[data.status] || "ref"} tone={tone} label={(pl.status && pl.status[data.status]) || data.status} />
          </div>
          <div className="pay-record-actions">
            {payable && <a className="btn btn-dark btn-sm" href={checkoutUrl(data.id)} target="_blank" rel="noopener noreferrer">{DI.link} {d.openCheckout}</a>}
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

      <PaymentProgress data={data} />

      {(payable || fields.length > 0 || canCheck) && <div className={payable ? "pay-record-grid" : "pay-record-grid history"}>
        {payable && <section className="panel pay-record-qr" aria-label={d.scan}>
          {data.qr
            ? <img className="paylink-qr" src={data.qr} alt={d.scan} width={220} height={220} />
            : <div className="paylink-qr paylink-qr-skel" aria-hidden="true" />}
          <div className="paylink-qr-cap">{d.scan}</div>
          {data.qr && <a className="btn btn-soft btn-sm" href={data.qr} download={`paylink-${data.id}.png`}>{DI.download} {d.downloadQr}</a>}
        </section>}

        <section className="panel pay-record-main paylink-detail">
          {/* The hosted page on payments.cosmospay.lat: what to send a payer who has no wallet
              open on this screen. It reads the link itself and follows its status. */}
          {payable && <CopyBlock label={d.checkout} value={checkoutUrl(data.id)} />}
          {payable && data.uri && (
            <CopyBlock label={d.uriLabels[chain]} value={data.uri}>
              <div className="paylink-actions">
                <a className="btn btn-soft btn-sm" href={data.uri}>{DI.link} {d.openWallet}</a>
              </div>
            </CopyBlock>
          )}
          {payable && data.xdr && <CopyBlock label={d.xdr} value={data.xdr} />}
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
          {canManage && payable && (
            <div className="paylink-block">
              <div className="paylink-block-head"><span className="field-l">{pl.design.label}</span></div>
              <CheckoutDesignPicker bare compact value={data.checkoutTheme || "classic"} disabled={savingTheme} onChange={changeTheme} />
            </div>
          )}
        </section>
      </div>}
    </div>
  );
}
