/* One order of the public P2P app (payments.cosmospay.lat/p2p?order=<id>), followed until it ends.
   A purchase: the merchant's account and the exact amount to transfer, with a countdown and
   "I transferred"; then the merchant releases the USDC to the wallet. A sale: the two transactions
   the wallet signs to lock the USDC in the order, a merchant accepts and pays into the seller's
   account, the seller releases once the money is there (or the settle window does). Every
   on-chain step is signed in the person's own wallet (WalletSign, EIP-6963), after the
   transaction is checked against the order's network (src/lib/p2p/tx-check.ts). */
import { useEffect, useRef, useState } from "react";
import { fmt, useLang, useT } from "@/lib/i18n/index";
import { WalletSign } from "@/components/cosmos/dashboard/components/WalletSign";
import { CopyField } from "@/components/cosmos/dashboard/components/PayLinkDetail";
import { StatusIcon } from "@/components/cosmos/dashboard/components/StatusIcon";
import { TokenMark } from "@/components/cosmos/dashboard/components/TokenMark";
import { ConfirmModal } from "@/components/cosmos/ui/ConfirmModal";
import { activeDeadline, clientActions, isTerminal, orderTone, pollDelay } from "@/lib/p2p/orders";
import { explorerTx } from "@/lib/p2p/tx-check";
import { AppApiError, appApi } from "@/lib/p2p/app-api";
import type { P2pMarket, P2pOrder } from "@/lib/p2p/types";
import { NBSP, Row, StepMark, TxRefused, accountRows, amountOnly, money, sendChecked, timeLeft, units, useNow } from "@/components/cosmos/p2p/p2p-ui";

type Confirming = null | "cancel" | "dispute";

export function P2pOrderPanel({ id, address, market, onNew, onSessionEnded, onStatus }: {
  id: string;
  address: string;
  market: P2pMarket;
  onNew: () => void;
  onSessionEnded: () => void;
  /* The order moved (the wallet's list reads it again). */
  onStatus?: (status: string) => void;
}) {
  const t = useT();
  const lang = useLang();
  const a = (t.p2pPublic as any).app;
  const o = a.order;
  const p = t.p2p as any;
  const api = useRef(appApi()).current;
  const [order, setOrder] = useState<P2pOrder | null | undefined>(undefined);
  const [reference, setReference] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState<Confirming>(null);
  // The sale's two transactions: sent once each, so a retry never locks twice.
  const sent = useRef<{ approve?: string; open?: string }>({});
  const [signed, setSigned] = useState(false);

  const fail = (e: unknown, fallback: string) => {
    if (e instanceof AppApiError && e.status === 401) { onSessionEnded(); return; }
    setError(e instanceof TxRefused ? e.message : e instanceof AppApiError && e.status === 429 ? a.errors.limited : e instanceof AppApiError && e.status === 0 ? a.errors.network : fallback);
  };

  // Read it now and again while it moves (every few seconds; never once it is over).
  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const read = () => {
      api.order(id)
        .then((x) => {
          if (!alive) return;
          setOrder(x);
          const delay = pollDelay(x.status);
          if (delay) timer = setTimeout(read, document.hidden ? delay * 3 : delay);
        })
        .catch((e) => {
          if (!alive) return;
          if (e instanceof AppApiError && e.status === 401) { onSessionEnded(); return; }
          if (e instanceof AppApiError && e.status === 404) { setOrder(null); return; }
          timer = setTimeout(read, 10_000);
        });
    };
    read();
    return () => { alive = false; if (timer) clearTimeout(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // A note about what was just sent belongs to that step; the list follows every move.
  const status0 = order ? order.status : null;
  useEffect(() => {
    if (!status0) return;
    setNote("");
    onStatus?.(status0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status0]);

  const now = useNow(!!order && !isTerminal(order.status));
  if (order === undefined) return <div className="swapper p2pa-order" aria-busy="true"><div className="pp-loading"><span className="pp-spinner" aria-hidden="true" /><span>{a.cta.loading}</span></div></div>;
  if (order === null) {
    return (
      <div className="swapper p2pa-order" role="alert">
        <p className="swap-hint is-error">{o.wrongWallet}</p>
        <button type="button" className="btn btn-dark swap-cta" onClick={onNew}>{o.newOrder}</button>
      </div>
    );
  }

  const network = market.networks.find((n) => n.id === order.network) ?? null;
  const buy = order.kind === "BUY";
  const actions = clientActions(order, now);
  const deadline = activeDeadline(order);
  const tone = orderTone(order.status);
  const msgs = { mismatch: a.errors.txMismatch, reverted: a.errors.reverted };

  const refresh = (x: P2pOrder) => setOrder(x);
  const act = async (action: "paid" | "cancel" | "dispute") => {
    setBusy(true);
    setError("");
    try {
      refresh(await api.act(order.id, action, action === "paid" ? { reference } : {}));
    } catch (e) {
      fail(e, action === "paid" ? o.reportFailed : o.actionFailed);
    } finally {
      setBusy(false);
    }
  };

  /* A sale: approve, then open with the deposit, each from the session's wallet. */
  const signOpen = async (wallet, from: string, progress: (s: string) => void) => {
    if (!network || !order.transactions) return;
    setError("");
    const approve = order.transactions.find((x) => x.action === "approve" || x.description === "approve");
    const open = order.transactions.find((x) => x !== approve);
    if (!approve || !open) throw new TxRefused(msgs.mismatch);
    if (!sent.current.approve) {
      progress(fmt(t.dash.wallet.confirmIn, { wallet: wallet.name }));
      sent.current.approve = await sendChecked(wallet, from, approve, network, { approveToken: order.token, onMining: () => progress(o.mining), messages: msgs });
    }
    if (!sent.current.open) {
      progress(fmt(t.dash.wallet.confirmIn, { wallet: wallet.name }));
      sent.current.open = await sendChecked(wallet, from, open, network, { onMining: () => progress(o.mining), messages: msgs });
    }
    setSigned(true);
    setNote(o.sent);
  };

  /* A sale's release, cancel or dispute: built by the server for this wallet, signed here. */
  const signAction = (action: "release" | "cancel" | "dispute") => async (wallet, from: string, progress: (s: string) => void) => {
    if (!network) return;
    setError("");
    const tx = await api.transaction(order.id, action);
    progress(fmt(t.dash.wallet.confirmIn, { wallet: wallet.name }));
    await sendChecked(wallet, from, tx, network, { onMining: () => progress(o.mining), messages: msgs });
    setNote(o.sent);
  };

  const status = p.status[order.status] ?? order.status;
  const pays = buy ? money(lang, order.fiatAmount, order.currency) : units(lang, order.tokenAmount, order.token);
  // A purchase delivers the amount less the fees (protocol and partner), as its price said.
  const net = Number(order.tokenAmount) * (1 - ((order.feeBps ?? 0) + (order.integratorFeeBps ?? 0)) / 10_000);
  const gets = buy ? units(lang, Math.floor(net * 1e6) / 1e6, order.token) : money(lang, order.fiatAmount, order.currency);
  const releaseTx = explorerTx(network, order.txs?.release ?? order.txs?.open ?? null);
  const shortId = order.id.slice(0, 8);
  const walletSign = (onUse, title?: string) => (
    <WalletSign ecosystem="evm" chainName={network?.name ?? order.network} signer={address} busy={busy} title={title} onUse={async (w, from, progress) => {
      try { await onUse(w, from, progress); } catch (e) { if (e instanceof TxRefused || e instanceof AppApiError) { fail(e, o.actionFailed); return; } throw e; }
    }} />
  );

  const done = order.status === "completed" || order.status === "resolved";
  const ended = isTerminal(order.status) || order.status === "disputed";
  const endTitle = { completed: o.completedTitle, cancelled: o.cancelledTitle, expired: o.expiredTitle, failed: o.failedTitle, disputed: o.disputedTitle, resolved: o.resolvedTitle }[order.status];
  const endBody = { completed: buy ? fmt(o.completedBuy, { amount: amountOnly(lang, order.tokenAmount), token: order.token }) : o.completedSell, cancelled: o.cancelledBody, expired: o.expiredBody, failed: o.failedBody, disputed: o.disputedBody, resolved: o.resolvedBody }[order.status];

  return (
    <section className="swapper p2pa-order arrive" aria-labelledby="p2pa-order-h">
      <div className="p2pa-order-head">
        <div>
          <p className="p2pa-eyebrow">{p.kinds[order.kind]} · {fmt(o.eyebrow, { id: shortId })}</p>
          <h2 id="p2pa-order-h" className={`p2pa-status is-${tone}`}><StatusIcon tone={tone} size={20} /><span>{status}</span></h2>
        </div>
        {deadline && (
          <p className="p2pa-clock" role="timer" aria-live="off">{fmt(o.clock[deadline.kind === "pay" ? (buy ? "payBuy" : "paySell") : deadline.kind], { time: timeLeft(deadline.at, now) })}</p>
        )}
      </div>

      <dl className="p2pa-sum">
        <Row k={buy ? a.summary.pay : a.youSell}><b>{pays}</b></Row>
        <Row k={a.summary.receive}><b>{gets}</b></Row>
        {order.merchant && <Row k={a.summary.merchant}>{order.merchant.displayName}</Row>}
        <Row k={a.summary.network}><span className="cell-mark"><TokenMark symbol={order.token} chain={order.network} chainName={network?.name ?? order.network} size={18} /><span>{order.token}{NBSP}·{NBSP}{network?.name ?? order.network}</span></span></Row>
        <Row k={a.summary.method}>{p.rails[order.rail] ?? order.rail}</Row>
      </dl>

      {/* Opening: the matcher's transaction (a purchase) or the seller's own two (a sale). */}
      {order.status === "pending" && (buy || signed || !order.transactions?.length) && (
        <div className="pp-loading p2pa-wait" role="status"><span className="pp-spinner" aria-hidden="true" /><span>{signed ? o.sent : o.pending}</span></div>
      )}
      {order.status === "pending" && !buy && !signed && !!order.transactions?.length && (
        <div className="p2pa-block">
          <h3>{o.sign}</h3>
          <p className="p2pa-muted">{o.signBody}</p>
          <ol className="p2pa-steps">
            <li><StepMark state={sent.current.approve ? "done" : "active"} />{fmt(o.stepApprove, { amount: amountOnly(lang, order.tokenAmount), token: order.token })}</li>
            <li><StepMark state={sent.current.open ? "done" : sent.current.approve ? "active" : "todo"} />{o.stepOpen}</li>
          </ol>
          {walletSign(signOpen)}
        </div>
      )}

      {/* A purchase waiting for the transfer: where, how much, and the report. */}
      {buy && order.status === "awaiting_payment" && (
        <div className="p2pa-block">
          <h3>{o.transferTitle}</h3>
          <p className="p2pa-big">{money(lang, order.fiatAmount, order.currency)}</p>
          <p className="p2pa-muted">{o.transferBody}</p>
          {order.paymentDetails && (
            <div className="paylink-fields">
              {accountRows(t, order.paymentDetails).map(([k, v]) => <CopyField key={k} label={k} value={v} />)}
              <CopyField label={o.amount} value={Number(order.fiatAmount).toFixed(order.currency === "CLP" ? 0 : 2)} />
            </div>
          )}
          <div className="fld p2pa-ref">
            <label className="field-l" htmlFor="p2pa-ref">{o.reference}</label>
            <input id="p2pa-ref" className="field" value={reference} maxLength={60} autoComplete="off" onChange={(e) => setReference(e.target.value)} aria-describedby="p2pa-ref-h" />
            <p className="field-help" id="p2pa-ref-h">{o.referenceHint}</p>
          </div>
          <button type="button" className="btn btn-dark swap-cta" disabled={busy || !actions.includes("paid")} onClick={() => act("paid")}>{busy ? o.reporting : o.transferred}</button>
        </div>
      )}
      {buy && order.status === "paid" && (
        <div className="p2pa-block" role="status"><h3>{o.paidTitle}</h3><p className="p2pa-muted">{o.paidBody}</p></div>
      )}

      {/* A sale on its way: waiting for a merchant, then for its transfer, then the release. */}
      {!buy && order.status === "awaiting_acceptance" && <p className="p2pa-block p2pa-muted" role="status">{o.waitingMerchant}</p>}
      {!buy && order.status === "awaiting_payment" && <p className="p2pa-block p2pa-muted" role="status">{fmt(o.merchantPaying, { amount: amountOnly(lang, order.fiatAmount, order.currency), currency: order.currency })}</p>}
      {!buy && order.status === "paid" && (
        <div className="p2pa-block">
          <h3>{o.confirmTitle}</h3>
          <p className="p2pa-muted">{fmt(o.confirmBody, { amount: amountOnly(lang, order.fiatAmount, order.currency), currency: order.currency })}</p>
          {walletSign(signAction("release"), fmt(o.release, { token: order.token }))}
        </div>
      )}

      {ended && endTitle && (
        <div className={`p2pa-end is-${done ? "ok" : tone}`} role="status">
          <b>{endTitle}</b>
          <p>{endBody}</p>
          {done && releaseTx && <a className="pp-link" href={releaseTx} target="_blank" rel="noopener noreferrer">{o.explorer}</a>}
        </div>
      )}

      {note && !ended && <p className="swap-hint" role="status">{note}</p>}
      {error && <p className="swap-hint is-error" role="alert">{error}</p>}

      <div className="p2pa-actions">
        {actions.includes("cancel") && <button type="button" className="btn btn-soft btn-sm" disabled={busy} onClick={() => setConfirm("cancel")}>{o.cancel}</button>}
        {actions.includes("dispute") && <button type="button" className="btn btn-soft btn-sm" disabled={busy} onClick={() => setConfirm("dispute")}>{o.dispute}</button>}
        {ended && <button type="button" className="btn btn-dark btn-sm" onClick={onNew}>{o.newOrder}</button>}
      </div>

      {/* A purchase's cancel or dispute goes through the API (Cosmos Pay acts for the buyer); a
          sale's is the seller's own transaction, signed in the wallet. */}
      {confirm && buy && (
        <ConfirmModal
          title={confirm === "cancel" ? o.cancelTitle : o.disputeTitle} body={confirm === "cancel" ? o.cancelBody : o.disputeBody}
          confirmLabel={confirm === "cancel" ? o.cancel : o.dispute} cancelLabel={a.back} danger={confirm === "cancel"}
          onConfirm={() => act(confirm)} onClose={() => setConfirm(null)}
        />
      )}
      {confirm && !buy && (
        <div className="p2pa-block">
          <h3>{confirm === "cancel" ? o.cancelTitle : o.disputeTitle}</h3>
          <p className="p2pa-muted">{confirm === "cancel" ? o.cancelBody : o.disputeBody}</p>
          {walletSign(signAction(confirm))}
          <button type="button" className="btn btn-soft btn-sm" onClick={() => setConfirm(null)}>{a.back}</button>
        </div>
      )}
    </section>
  );
}
