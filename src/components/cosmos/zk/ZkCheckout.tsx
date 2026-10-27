/* The ZK checkout (payments.cosmospay.lat/zk/{id}): the payer pays a ZK payment privately.
   The payment is read from the gateway in the payer's browser (src/lib/zk/checkout-api.ts); paying
   runs entirely here: Freighter signs, bb.js proves (the page is cross-origin isolated), and the
   confidential transfers go out (the merchant's net amount, the 0.18% commission, and the
   merchant fee when the payment has one). The Payments API then checks each on-chain, with the
   token's auditor key, before it says "paid".
   The wallet and the prover load only when the payer starts paying. */
import { useEffect, useRef, useState } from "react";
import { fmt, initLang, useT } from "@/lib/i18n/index";
import { canProve } from "@/lib/zk/bb-loader";
import { confirmZkCheckout, fetchZkCheckout, type ZkCheckout as Payment } from "@/lib/zk/checkout-api";
import { toUnits } from "@/lib/zk/amounts";
import type { ZkPhase, ZkWallet } from "@/lib/zk/wallet";

type Step = "register" | "fund" | "pay" | "fee" | "merchantFee" | "confirm";
const ALL_STEPS: Step[] = ["register", "fund", "pay", "fee", "merchantFee", "confirm"];
/* A payment with no merchant fee makes no third transfer. */
const stepsOf = (p: Payment | null): Step[] => ALL_STEPS.filter((s) => s !== "merchantFee" || !!p?.merchantFee);
type StepState = "todo" | "active" | "done" | "skipped";

const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;
const explorerTx = (network: string, hash: string) => `https://stellar.expert/explorer/${network === "public" ? "public" : "testnet"}/tx/${hash}`;

export function ZkCheckout({ id, apiBase, lang }: { id: string; apiBase: string; lang: string }) {
  initLang(lang);
  const t = useT();
  const z = t.zk;
  const [load, setLoad] = useState<"loading" | "ok" | "not-found" | "error">("loading");
  const [payment, setPayment] = useState<Payment | null>(null);
  const [steps, setSteps] = useState<Record<Step, StepState>>({ register: "todo", fund: "todo", pay: "todo", fee: "todo", merchantFee: "todo", confirm: "todo" });
  const [phase, setPhase] = useState<ZkPhase | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wallet = useRef<ZkWallet | null>(null);
  // The transfers already sent, so a retry after a failure never pays twice.
  const sent = useRef<{ payment?: string; fee?: string; merchantFee?: string }>({});

  const reload = () => {
    setLoad("loading");
    fetchZkCheckout(apiBase, id).then((r) => {
      if (r.kind === "ok") { setPayment(r.value); setLoad("ok"); }
      else setLoad(r.kind === "not-found" ? "not-found" : "error");
    });
  };
  useEffect(reload, [apiBase, id]);
  useEffect(() => () => { wallet.current?.destroy(); }, []);

  const mark = (s: Step, state: StepState) => setSteps((x) => ({ ...x, [s]: state }));
  const freighterMessage = (e: unknown): string => {
    const problem = (e as { problem?: string })?.problem;
    if (problem === "missing") return z.freighter.missing;
    if (problem === "declined") return z.freighter.declined;
    if (problem === "wrongNetwork") return fmt(z.freighter.wrongNetwork, { network: payment?.network === "public" ? "Mainnet" : "Testnet" });
    return e instanceof Error ? e.message : String(e);
  };

  const pay = async () => {
    if (!payment || busy) return;
    setBusy(true);
    setError(null);
    try {
      const { ZkWallet } = await import("@/lib/zk/wallet");
      const deployment = { network: payment.network, rpcUrl: payment.rpcUrl, networkPassphrase: payment.networkPassphrase, token: payment.token, verifier: payment.verifier, auditorRegistry: payment.auditorRegistry, auditorId: payment.auditorId };
      // The payer signs with Freighter: the key transaction's root first, so an account created here
      // also opens in the private accounts table, which takes only a signed XDR (an account
      // registered here with the SEP-53 root, as this page and the table once did, would not:
      // product owner, 2026-10-27); the SEP-53 root next, for the accounts created that way.
      const signer = async () => (await import("@/lib/zk/freighter-signer")).connectFreighter(deployment.networkPassphrase);
      const w = wallet.current ?? (await ZkWallet.connect(deployment, await signer(), setPhase, ["transaction", "message"]));
      wallet.current = w;
      const total = toUnits(payment.amount);
      if (steps.register !== "done") {
        if (await w.isRegistered()) mark("register", "skipped");
        else { mark("register", "active"); await w.register(setPhase); mark("register", "done"); }
      }
      if (steps.fund !== "done" && steps.fund !== "skipped") { mark("fund", "active"); await w.fund(total, setPhase); mark("fund", "done"); }
      if (!sent.current.payment) {
        mark("pay", "active");
        sent.current.payment = await w.transfer(payment.recipient, toUnits(payment.netAmount), setPhase);
        mark("pay", "done");
      }
      if (!sent.current.fee) {
        mark("fee", "active");
        sent.current.fee = await w.transfer(payment.feeAccount, toUnits(payment.feeAmount), setPhase);
        mark("fee", "done");
      }
      if (payment.merchantFee && !sent.current.merchantFee) {
        mark("merchantFee", "active");
        sent.current.merchantFee = await w.transfer(payment.merchantFee.wallet, toUnits(payment.merchantFee.amount), setPhase);
        mark("merchantFee", "done");
      }
      const paymentTx = sent.current.payment;
      const feeTx = sent.current.fee;
      mark("confirm", "active");
      setPhase("waiting");
      const res = await confirmZkCheckout(apiBase, id, {
        paymentTxHash: paymentTx,
        feeTxHash: feeTx,
        ...(sent.current.merchantFee ? { merchantFeeTxHash: sent.current.merchantFee } : {}),
      });
      if (res.kind !== "ok") throw new Error(res.kind === "error" && res.message ? res.message : z.checkout.loadError);
      mark("confirm", "done");
      setPayment(res.value);
    } catch (e) {
      setError(freighterMessage(e));
      setSteps((x) => Object.fromEntries(ALL_STEPS.map((s) => [s, x[s] === "active" ? "todo" : x[s]])) as Record<Step, StepState>);
    } finally {
      setBusy(false);
      setPhase(null);
    }
  };

  if (load === "loading") return <div className="zk-card" aria-busy="true"><div className="zk-skel" /><div className="zk-skel short" /></div>;
  if (load !== "ok" || !payment) {
    return (
      <div className="zk-card" role="alert">
        <p className="zk-msg">{load === "not-found" ? z.checkout.notFound : z.checkout.loadError}</p>
        {load === "error" && <button type="button" className="btn btn-outline-w btn-sm" onClick={reload}>{z.checkout.retry}</button>}
      </div>
    );
  }

  const expired = payment.status === "EXPIRED" || (payment.status === "PENDING" && Date.parse(payment.expiresAt) <= Date.now());
  const paid = payment.status === "SUCCEEDED";
  const provable = canProve();

  return (
    <section className="zk-card" aria-labelledby="zk-title">
      <h1 id="zk-title" className="zk-title">{z.checkout.title}</h1>
      {payment.description && <p className="zk-desc">{payment.description}</p>}
      <div className="zk-amount"><span>{z.youPay}</span><b>{payment.amount} {payment.token.symbol}</b></div>
      <dl className="zk-rows">
        <div><dt>{z.checkout.to}</dt><dd className="zk-mono" title={payment.recipient}>{short(payment.recipient)}</dd></div>
        <div><dt>{z.merchantGets}</dt><dd>{payment.netAmount} {payment.token.symbol}</dd></div>
        <div><dt>{z.commission}</dt><dd>{payment.feeAmount} {payment.token.symbol} <span className="zk-muted">({z.commissionRate})</span></dd></div>
        {payment.merchantFee && <div><dt>{z.merchantFee}</dt><dd>{payment.merchantFee.amount} {payment.token.symbol}</dd></div>}
      </dl>

      {paid ? (
        <div className="zk-done" role="status">
          <b>{z.checkout.paid}</b>
          <p>{z.checkout.paidBody}</p>
          {(payment.paymentTxHash || payment.feeTxHash) && (
            <p className="zk-links">{z.checkout.transactions}: {[payment.paymentTxHash, payment.feeTxHash].filter(Boolean).map((h) => <a key={h!} href={explorerTx(payment.network, h!)} target="_blank" rel="noopener noreferrer" className="zk-mono">{short(h!)}</a>)}</p>
          )}
        </div>
      ) : expired ? (
        <p className="zk-msg" role="status">{z.checkout.expired}</p>
      ) : (
        <>
          <ol className="zk-steps">
            {stepsOf(payment).map((s) => (
              <li key={s} className={`zk-step is-${steps[s]}`}>
                <span className="zk-step-dot" aria-hidden="true" />
                <span>{z.checkout.steps[s]}</span>
                {steps[s] === "active" && phase && <small className="zk-phase" role="status">{z.phases[phase]}</small>}
              </li>
            ))}
          </ol>
          {!provable && <p className="zk-msg" role="alert">{z.cannotProve}</p>}
          {error && <p className="zk-error" role="alert">{error}</p>}
          <button type="button" className="btn btn-dark zk-cta" onClick={pay} disabled={busy || !provable}>{z.checkout.payPrivately}</button>
        </>
      )}
    </section>
  );
}
