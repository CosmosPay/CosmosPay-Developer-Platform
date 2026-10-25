/* The merchant's confidential account (payments.cosmospay.lat/zk/account): the Stellar account
   that receives ZK payments. Freighter connects it and derives its confidential key; the page
   registers it on Cosmos Pay's confidential token, shows its balances (rebuilt from chain events
   and checked against the on-chain commitments) and moves them: incoming to available, a deposit
   of public XLM, a withdrawal back to public XLM. Proofs are generated here (the page is cross-
   origin isolated); nothing about the key leaves the browser. */
import { useEffect, useRef, useState } from "react";
import { fmt, initLang, useT } from "@/lib/i18n/index";
import { canProve } from "@/lib/zk/bb-loader";
import { fetchZkConfig, type ZkNetworkConfig } from "@/lib/zk/checkout-api";
import { fromUnits, toUnits } from "@/lib/zk/amounts";
import type { ZkBalances, ZkPhase, ZkWallet } from "@/lib/zk/wallet";

const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

export function ZkAccount({ apiBase, lang, network, dashboardUrl }: { apiBase: string; lang: string; network: "testnet" | "public"; dashboardUrl: string }) {
  initLang(lang);
  const t = useT();
  const z = t.zk;
  const [config, setConfig] = useState<ZkNetworkConfig | null | undefined>(undefined);
  const [balances, setBalances] = useState<ZkBalances | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [phase, setPhase] = useState<ZkPhase | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const wallet = useRef<ZkWallet | null>(null);

  useEffect(() => {
    fetchZkConfig(apiBase, network).then((r) => setConfig(r.kind === "ok" ? r.value : null));
    return () => { wallet.current?.destroy(); };
  }, [apiBase, network]);

  // Development builds only: a prover self-test the browser checks can call (no wallet, no network).
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    (window as unknown as { __zkSelfTest?: unknown }).__zkSelfTest = async (token: string, account: string) => (await import("@/lib/zk/wallet")).selfTestProver(token, account);
  }, []);

  const problem = (e: unknown): string => {
    const p = (e as { problem?: string })?.problem;
    if (p === "missing") return z.freighter.missing;
    if (p === "declined") return z.freighter.declined;
    if (p === "wrongNetwork") return fmt(z.freighter.wrongNetwork, { network: network === "public" ? "Mainnet" : "Testnet" });
    return e instanceof Error ? e.message : String(e);
  };

  /* Runs one action with the wallet, then reads the balances again. */
  const run = async (name: string, action: (w: ZkWallet) => Promise<unknown>) => {
    if (!config || busy) return;
    setBusy(name);
    setError(null);
    try {
      if (!wallet.current) {
        const { ZkWallet } = await import("@/lib/zk/wallet");
        wallet.current = await ZkWallet.connect(config, setPhase);
        setAddress(wallet.current.address);
      }
      await action(wallet.current);
      setPhase("waiting");
      setBalances(await wallet.current.balances());
    } catch (e) {
      setError(problem(e));
    } finally {
      setBusy(null);
      setPhase(null);
    }
  };

  const units = (() => {
    try { return amount.trim() ? toUnits(amount) : null; } catch { return null; }
  })();

  if (config === undefined) return <div className="zk-card" aria-busy="true"><div className="zk-skel" /><div className="zk-skel short" /></div>;
  if (config === null) return <div className="zk-card" role="status"><p className="zk-msg">{z.unavailable}</p></div>;

  const isolated = canProve();
  const sym = config.token.symbol;
  return (
    <section className="zk-card" aria-labelledby="zk-account-title">
      <h1 id="zk-account-title" className="zk-title">{z.account.title}</h1>
      {!isolated && <p className="zk-msg" role="alert">{z.notIsolated}</p>}
      {!address ? (
        <button type="button" className="btn btn-dark zk-cta" onClick={() => run("connect", async () => {})} disabled={!!busy || !isolated}>{z.account.connect}</button>
      ) : (
        <>
          <p className="zk-muted">{fmt(z.account.connected, { account: short(address) })}</p>
          {balances && !balances.registered ? (
            <button type="button" className="btn btn-dark zk-cta" onClick={() => run("register", (w) => w.register(setPhase))} disabled={!!busy}>{z.account.register}</button>
          ) : balances ? (
            <>
              <p className="zk-ok" role="status">{z.account.registered}</p>
              <dl className="zk-rows">
                <div><dt>{z.account.spendable}</dt><dd>{fromUnits(balances.spendable)} {sym}</dd></div>
                <div><dt>{z.account.receiving}</dt><dd>{fromUnits(balances.receiving)} {sym}</dd></div>
              </dl>
              <div className="zk-actions">
                <button type="button" className="btn btn-outline-w btn-sm" onClick={() => run("merge", (w) => w.merge(setPhase))} disabled={!!busy || balances.receiving === 0n}>{z.account.merge}</button>
                <button type="button" className="btn btn-outline-w btn-sm" onClick={() => run("refresh", async () => {})} disabled={!!busy}>{z.account.refresh}</button>
              </div>
              <label className="zk-field">
                <span>{z.account.amountLabel} ({sym})</span>
                <input className="field" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(",", "."))} placeholder="0" aria-invalid={amount.trim() !== "" && units === null ? true : undefined} />
              </label>
              <div className="zk-actions">
                <button type="button" className="btn btn-dark btn-sm" onClick={() => run("withdraw", (w) => w.withdraw(units!, setPhase))} disabled={!!busy || !units || units > balances.spendable}>{z.account.withdraw}</button>
                <button type="button" className="btn btn-outline-w btn-sm" onClick={() => run("deposit", (w) => w.deposit(units!, setPhase))} disabled={!!busy || !units}>{z.account.deposit}</button>
              </div>
            </>
          ) : null}
        </>
      )}
      {busy && phase && <p className="zk-phase" role="status">{z.phases[phase]}</p>}
      {error && <p className="zk-error" role="alert">{error}</p>}
      <a className="zk-back" href={dashboardUrl}>{z.account.back}</a>
    </section>
  );
}
