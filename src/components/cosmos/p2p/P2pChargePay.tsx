/* The hosted charge page (payments.cosmospay.lat/p2p/{chargeId}): a merchant's payment request in
   local money, paid by bank transfer to a P2P merchant Cosmos Pay picks, the merchant's USDC then
   released to the charge's wallet. The payer gives their name, document and email (the merchant
   checks the transfer comes from that person; the receipt goes to the email), then sees the
   account and the exact amount with a countdown, transfers, and presses "I transferred"; the page
   follows the order until the merchant confirms.

   Everything is read from the gateway's keyless routes in the payer's browser
   (src/lib/p2p/checkout-api.ts, the trust boundary: every field checked, text only into the page),
   never through this server. The payer's order and its token stay in this tab (sessionStorage),
   so a reload resumes it. The checkout's look (checkout.css): the card, the amount, the countdown
   digits, the rows with their copy buttons. */
import { useEffect, useRef, useState, type FormEvent } from "react";
import { fmt, initLang, useLang, useT } from "@/lib/i18n/index";
import { copyText } from "@/components/cosmos/lib/clipboard";
import {
  cancelChargeOrder, fetchCharge, fetchChargeOrder, openChargeOrder, reportChargePaid, saveOrder, savedOrder,
  type CheckoutCharge, type CheckoutOrder,
} from "@/lib/p2p/checkout-api";
import { checkEmail, checkHolderName, checkPayerDocument, type FieldError } from "@/lib/p2p/rails";
import { countdown, isTerminal, msLeft, pollDelay } from "@/lib/p2p/orders";
import { accountRows, errorText, money, useNow } from "@/components/cosmos/p2p/p2p-ui";

type Load = "loading" | "ok" | "not-found" | "error";

function CopyRow({ label, value, copyLabel, copiedLabel }: { label: string; value: string; copyLabel: string; copiedLabel: string }) {
  const [done, setDone] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copy = () => copyText(value).then(() => {
    setDone(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setDone(false), 1600);
  }).catch(() => {});
  return (
    <div className="pp-row">
      <dt>{label}</dt>
      <dd>
        <code className="pp-code">{value}</code>
        <button type="button" className="pp-copy" onClick={copy} aria-label={`${copyLabel}: ${label}`}>{done ? copiedLabel : copyLabel}</button>
      </dd>
    </div>
  );
}

function Digits({ ms, label }: { ms: number; label: string }) {
  const text = countdown(ms);
  return (
    <div className="ck-timer p2pc-timer" role="timer" aria-label={`${label}: ${text}`}>
      <span className="ck-timer-caption" aria-hidden="true">{label}</span>
      <span className="ck-digits" aria-hidden="true">
        {[...text].map((c, i) => (c === ":" ? <span key={i} className="ck-sep">:</span> : <span key={i} className="ck-d">{c}</span>))}
      </span>
    </div>
  );
}

export function P2pChargePay({ id, apiBase, lang }: { id: string; apiBase: string; lang: string }) {
  initLang(lang);
  const t = useT();
  const L = useLang();
  const y = (t.p2pPublic as any).pay;
  const p = t.p2p as any;
  const [load, setLoad] = useState<Load>("loading");
  const [charge, setCharge] = useState<CheckoutCharge | null>(null);
  const [order, setOrder] = useState<CheckoutOrder | null>(null);
  const token = useRef<string | null>(null);
  const [form, setForm] = useState({ name: "", document: "", email: "", rail: "" });
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [reference, setReference] = useState("");

  const readCharge = () => {
    setLoad("loading");
    fetchCharge(apiBase, id).then((r) => {
      if (r.kind === "ok") {
        setCharge(r.value);
        setForm((f) => ({ ...f, rail: r.value.rails.includes(f.rail) ? f.rail : r.value.rails[0] }));
        setLoad("ok");
      } else setLoad(r.kind === "not-found" ? "not-found" : "error");
    });
  };

  // The charge, and the payer's order from this tab when there is one.
  useEffect(() => {
    readCharge();
    const saved = savedOrder(id);
    if (saved) {
      token.current = saved.payerToken;
      fetchChargeOrder(apiBase, saved.orderId, saved.payerToken).then((r) => {
        if (r.kind === "ok") setOrder(r.value);
        else if (r.kind === "not-found") { saveOrder(id, null); token.current = null; }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiBase, id]);

  // Follow the order while it moves.
  useEffect(() => {
    if (!order || !token.current) return;
    const delay = pollDelay(order.status);
    if (!delay) return;
    const h = setTimeout(() => {
      fetchChargeOrder(apiBase, order.id, token.current!).then((r) => {
        if (r.kind === "ok") setOrder(r.value);
        else setOrder((o) => (o ? { ...o } : o));
      });
    }, document.hidden ? delay * 3 : delay);
    return () => clearTimeout(h);
  }, [order, apiBase]);

  const now = useNow(!!order && !isTerminal(order.status));

  if (load === "loading") {
    return <div className="ck"><div className="ck-card ck-solo" aria-busy="true"><div className="pp-loading"><span className="pp-spinner" aria-hidden="true" /><span>{y.payer.submitting}</span></div></div></div>;
  }
  if (load !== "ok" || !charge) {
    return (
      <div className="ck"><div className="ck-card ck-solo" role="alert">
        <p className="pp-body">{load === "not-found" ? y.notFound : y.loadError}</p>
        {load === "error" && <button type="button" className="btn btn-outline-w btn-sm" onClick={readCharge}>{y.retry}</button>}
      </div></div>
    );
  }

  const errors: Record<string, FieldError | null> = {
    name: checkHolderName(form.name),
    document: checkPayerDocument(charge.currency, form.document),
    email: checkEmail(form.email),
  };
  const show = (k: string) => (touched[k] ? errors[k] : null);
  const formOk = !Object.values(errors).some(Boolean) && !!form.rail;

  const start = async (e: FormEvent) => {
    e.preventDefault();
    setTouched({ name: true, document: true, email: true });
    if (!formOk || busy) return;
    setBusy(true);
    setError("");
    const r = await openChargeOrder(apiBase, id, { rail: form.rail, name: form.name, document: form.document, email: form.email });
    setBusy(false);
    if (r.kind === "ok") {
      token.current = r.value.payerToken;
      saveOrder(id, { orderId: r.value.order.id, payerToken: r.value.payerToken });
      setOrder(r.value.order);
    } else setError(r.kind === "error" && r.status === 409 ? y.payer.busy : r.kind === "error" && r.status === 429 ? y.payer.limited : y.payer.failed);
  };

  /* The payer gives up before paying: the order is cancelled and the charge is free again. */
  const cancel = async () => {
    if (!order || !token.current || busy) return;
    setBusy(true);
    setError("");
    const r = await cancelChargeOrder(apiBase, order.id, token.current);
    setBusy(false);
    if (r.kind === "ok") setOrder(r.value);
    else setError(y.transfer.cancelFailed);
  };

  const reportPaid = async () => {
    if (!order || !token.current || busy) return;
    setBusy(true);
    setError("");
    const r = await reportChargePaid(apiBase, order.id, token.current, reference);
    setBusy(false);
    if (r.kind === "ok") setOrder(r.value);
    else setError(y.transfer.failed);
  };

  const again = () => { saveOrder(id, null); token.current = null; setOrder(null); setError(""); readCharge(); };

  const st = y.status;
  const requestClosed = !order && charge.status !== "open";
  // No merchant takes this amount on any rail right now: nothing to pay into yet.
  const noRails = !order && !requestClosed && charge.rails.length === 0;
  const phase = order
    ? ({ pending: ["wait", st.preparing, ""], awaiting_payment: ["wait", st.waiting, ""], paid: ["wait", st.paid, st.paidBody], completed: ["paid", st.completed, st.completedBody], resolved: ["paid", st.completed, st.completedBody], expired: ["expired", st.expired, st.expiredBody], cancelled: ["cancelled", st.cancelled, st.cancelledBody], failed: ["failed", st.cancelled, st.cancelledBody], disputed: ["wait", st.disputed, st.disputedBody], awaiting_acceptance: ["wait", st.preparing, ""] } as Record<string, [string, string, string]>)[order.status]
    : requestClosed
      ? ([charge.status === "paid" ? "paid" : charge.status === "expired" ? "expired" : "cancelled", charge.status === "paid" ? st.requestPaid : charge.status === "expired" ? st.requestExpired : st.requestCancelled, ""] as [string, string, string])
      : null;
  const payLeft = order?.payBy ? msLeft(order.payBy, now) : 0;

  return (
    <div className="ck">
      <div className="ck-card ck-solo p2pc">
        <div className="ck-brand">
          <span className="cosmos-mark ck-mark" aria-hidden="true" />
          <span className="ck-eyebrow">{y.eyebrow}</span>
        </div>
        <div className="ck-amount">
          <span className="ck-caption">{y.toPay}</span>
          <h1 className="pp-amount">{money(L, charge.fiatAmount, charge.currency)}</h1>
          {charge.payeeName && <p className="pp-hint">{fmt(y.payee, { payee: charge.payeeName })}</p>}
          {charge.description && <p className="pp-msg">{charge.description}</p>}
        </div>

        <div className="pp-status" role="status" aria-live="polite">
          {phase && <span className="pp-pill" data-phase={phase[0]}>{phase[1]}</span>}
          {phase && phase[2] && <p className="pp-body">{phase[2]}</p>}
        </div>

        {/* Who pays: asked before any account is shown (the merchant checks the payer). */}
        {!order && !requestClosed && (
          noRails
            ? <p className="pp-hint" role="alert">{y.payer.noRails}</p>
            : (
              <form className="ck-payer p2pc-payer" onSubmit={start} noValidate>
                <span className="ck-field-label">{y.payer.title}</span>
                <p className="pp-hint">{y.payer.body}</p>
                <label className="p2pc-l" htmlFor="p2pc-name">{y.payer.name}</label>
                <input id="p2pc-name" className="ck-payer-input" autoComplete="name" maxLength={100} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} onBlur={() => setTouched((x) => ({ ...x, name: true }))} aria-invalid={show("name") ? true : undefined} aria-describedby="p2pc-name-e" />
                <p className="pp-hint p2pc-e" id="p2pc-name-e">{errorText(t, "holderName", show("name"))}</p>
                <label className="p2pc-l" htmlFor="p2pc-doc">{y.payer.document}</label>
                <input id="p2pc-doc" className="ck-payer-input" autoComplete="off" spellCheck={false} maxLength={20} value={form.document} onChange={(e) => setForm((f) => ({ ...f, document: e.target.value }))} onBlur={() => setTouched((x) => ({ ...x, document: true }))} aria-invalid={show("document") ? true : undefined} aria-describedby="p2pc-doc-e" />
                <p className="pp-hint p2pc-e" id="p2pc-doc-e">{errorText(t, "document", show("document"))}</p>
                <label className="p2pc-l" htmlFor="p2pc-email">{y.payer.email}</label>
                <input id="p2pc-email" className="ck-payer-input" type="email" inputMode="email" autoComplete="email" autoCapitalize="off" spellCheck={false} maxLength={254} value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} onBlur={() => setTouched((x) => ({ ...x, email: true }))} aria-invalid={show("email") ? true : undefined} aria-describedby="p2pc-email-e" />
                <p className="pp-hint p2pc-e" id="p2pc-email-e">{errorText(t, "text", show("email")) ?? y.payer.emailHint}</p>
                {charge.rails.length > 1 && (
                  <>
                    <label className="p2pc-l" htmlFor="p2pc-rail">{y.payer.method}</label>
                    <select id="p2pc-rail" className="ck-payer-input ck-xc-select" value={form.rail} onChange={(e) => setForm((f) => ({ ...f, rail: e.target.value }))}>
                      {charge.rails.map((r) => <option key={r} value={r}>{p.rails[r] ?? r}</option>)}
                    </select>
                  </>
                )}
                <button type="submit" className="btn btn-dark ck-primary p2pc-cta" disabled={busy}>{busy ? y.payer.submitting : y.payer.submit}</button>
              </form>
            )
        )}

        {order?.status === "pending" && <div className="pp-loading"><span className="pp-spinner" aria-hidden="true" /><span>{st.preparing}</span></div>}

        {/* The account and the exact amount, with the time left, then "I transferred". */}
        {order?.status === "awaiting_payment" && order.paymentDetails && (
          <div className="p2pc-transfer">
            {order.payBy && <Digits ms={payLeft} label={y.transfer.timeLeft} />}
            <p className="ck-field-label">{y.transfer.title}</p>
            {order.merchantName && <p className="pp-hint">{fmt(y.to, { merchant: order.merchantName })}</p>}
            <p className="pp-amount p2pc-exact">{money(L, order.fiatAmount, order.currency)}</p>
            <p className="pp-hint">{y.transfer.body}</p>
            <dl className="pp-details">
              {accountRows(t, order.paymentDetails).map(([k, v]) => <CopyRow key={k} label={k} value={v} copyLabel={y.transfer.copy} copiedLabel={y.transfer.copied} />)}
              <CopyRow label={y.transfer.amount} value={Number(order.fiatAmount).toFixed(order.currency === "CLP" ? 0 : 2)} copyLabel={y.transfer.copy} copiedLabel={y.transfer.copied} />
            </dl>
            <label className="p2pc-l" htmlFor="p2pc-ref">{y.transfer.reference}</label>
            <input id="p2pc-ref" className="ck-payer-input" autoComplete="off" maxLength={60} value={reference} onChange={(e) => setReference(e.target.value)} aria-describedby="p2pc-ref-h" />
            <p className="pp-hint" id="p2pc-ref-h">{y.transfer.referenceHint}</p>
            <button type="button" className="btn btn-dark ck-primary p2pc-cta" disabled={busy || payLeft <= 0} onClick={reportPaid}>{busy ? y.transfer.sending : y.transfer.done}</button>
            <button type="button" className="btn btn-soft btn-sm p2pc-again" disabled={busy} onClick={cancel}>{y.transfer.cancel}</button>
          </div>
        )}

        {order && ["expired", "cancelled", "failed"].includes(order.status) && charge.status === "open" && (
          <button type="button" className="btn btn-outline-w btn-sm p2pc-again" onClick={again}>{y.startAgain}</button>
        )}
        {error && <p className="pp-hint p2pc-error" role="alert">{error}</p>}
      </div>
    </div>
  );
}
