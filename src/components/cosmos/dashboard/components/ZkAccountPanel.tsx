/* The merchant's confidential account, inside the private payments view (product owner: never send
   them to another page for it): the Stellar account that receives private payments. Freighter
   connects it and derives its confidential key (two signatures, kept for this tab only); the panel
   creates the account on Cosmos Pay's confidential token, shows its balances (rebuilt from chain
   events and checked against the on-chain commitments) and moves them: incoming to available, a
   deposit of public XLM, a withdrawal back to public XLM. The amount is asked for in a dialog; the
   work then shows its progress here, in the panel. Private payments go to the organization's
   Stellar wallets (Settings), so an account that is not one of them says so, and whoever may
   connect wallets adds it from here with one signature. Proofs are generated in this tab, on one thread
   (the dashboard is not cross-origin isolated, src/lib/zk/bb-loader.ts), and nothing about the key
   leaves the browser. */
import { useEffect, useRef, useState } from "react";
import { Modal, showToast } from "@/components/cosmos/shared";
import { fmt, useT } from "@/lib/i18n/index";
import { DI } from "@/components/cosmos/dashboard/icons";
import { Pill } from "@/components/cosmos/dashboard/components/Pill";
import { TokenMark } from "@/components/cosmos/dashboard/components/TokenMark";
import { networkName } from "@/lib/chains";
import { canProve } from "@/lib/zk/bb-loader";
import { connectOrgWallet } from "@/components/cosmos/dashboard/components/OrgWallets";
import { fromUnits, toUnits } from "@/lib/zk/amounts";
import type { ZkNetworkConfig } from "@/lib/zk/checkout-api";
import type { ZkBalances, ZkPhase, ZkWallet } from "@/lib/zk/wallet";

export interface ZkAccountState {
  address: string;
  registered: boolean;
}

type Action = "connect" | "register" | "merge" | "deposit" | "withdraw" | "refresh" | "addToOrg";

const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;
const clock = (ms: number) => {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

export function ZkAccountPanel({ config, orgId, orgWallets = null, canConnectWallets = false, onAccount }: {
  config: ZkNetworkConfig;
  orgId: string;
  /* The organization's Stellar wallets (null while they load). */
  orgWallets?: string[] | null;
  canConnectWallets?: boolean;
  onAccount?: (account: ZkAccountState | null) => void;
}) {
  const t = useT();
  const z = t.zk;
  const [address, setAddress] = useState<string | null>(null);
  const [balances, setBalances] = useState<ZkBalances | null>(null);
  const [busy, setBusy] = useState<Action | null>(null);
  const [phase, setPhase] = useState<ZkPhase | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<"deposit" | "withdraw" | null>(null);
  const [startedAt, setStartedAt] = useState(0);
  const [now, setNow] = useState(0);
  const wallet = useRef<ZkWallet | null>(null);
  const sym = config.token.symbol;

  useEffect(() => () => { wallet.current?.destroy(); }, []);
  useEffect(() => { onAccount?.(address && balances ? { address, registered: balances.registered } : null); }, [address, balances]);
  // The proof takes a while on one thread: a clock beside it says the work is moving.
  useEffect(() => {
    if (phase !== "proving") return;
    setStartedAt(Date.now());
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [phase]);

  // Development builds only: a prover self-test the browser checks can call (no wallet, no network).
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    (window as unknown as { __zkSelfTest?: unknown }).__zkSelfTest = async (token: string, account: string) => (await import("@/lib/zk/wallet")).selfTestProver(token, account);
  }, []);

  const problem = (e: unknown): string => {
    const p = (e as { problem?: string })?.problem;
    if (p === "missing") return z.freighter.missing;
    if (p === "declined") return z.freighter.declined;
    if (p === "wrongNetwork") return fmt(z.freighter.wrongNetwork, { network: config.network === "public" ? "Mainnet" : "Testnet" });
    return e instanceof Error ? e.message : String(e);
  };

  const DONE: Partial<Record<Action, string>> = { register: z.account.createdOk, merge: z.account.mergeOk, deposit: z.account.depositOk, withdraw: z.account.withdrawOk };

  /* Runs one action with the wallet (connecting it first), then reads the balances again. */
  const run = async (name: Action, action: (w: ZkWallet) => Promise<unknown>) => {
    if (busy) return;
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
      if (DONE[name]) showToast(DONE[name]!);
    } catch (e) {
      setError(problem(e));
    } finally {
      setBusy(null);
      setPhase(null);
    }
  };

  const provable = canProve();
  const outsideOrg = !!address && orgWallets !== null && !orgWallets.includes(address);
  const addToOrg = async () => {
    if (busy) return;
    setBusy("addToOrg");
    setError(null);
    try {
      await connectOrgWallet({ orgId, chain: "stellar", provider: "freighter" });
      showToast(t.dash.wallets.connected);
    } catch (e) {
      setError(problem(e));
    } finally {
      setBusy(null);
    }
  };
  const registered = !!balances?.registered;
  const bal = (amount: bigint, label: string) => (
    <li className="hub-bal arrive">
      <TokenMark symbol={sym} chain="stellar" chainName={networkName("stellar")} size={32} />
      <span className="hub-bal-t"><b>{fromUnits(amount)} {sym}</b><span>{label}</span></span>
    </li>
  );

  return (
    <section className="panel zka" aria-labelledby="zka-title" aria-busy={busy ? true : undefined}>
      <div className="zka-head">
        <div className="zka-id">
          <h2 id="zka-title" className="zka-title">{z.account.title}</h2>
          {address && (
            <p className="zka-sub">
              <span title={address}>{fmt(z.account.connected, { account: short(address) })}</span>
              {balances && <Pill st={registered ? "ok" : "ref"} label={registered ? z.account.registered : z.account.notRegistered} />}
            </p>
          )}
        </div>
        {balances && (
          <button type="button" className="icon-mini" title={z.account.refresh} aria-label={z.account.refresh} onClick={() => run("refresh", async () => {})} disabled={!!busy}>{DI.refresh}</button>
        )}
      </div>

      {!provable && <p className="field-err" role="alert">{z.cannotProve}</p>}
      {outsideOrg && (
        <div className="wl-none">
          <span>{z.account.notOrgWallet}</span>
          {canConnectWallets
            ? <button type="button" className="btn btn-outline-w btn-sm" onClick={addToOrg} disabled={!!busy}>{z.account.addToOrg}</button>
            : <span className="field-help">{t.dash.wallets.askAdmin}</span>}
        </div>
      )}

      <div className="zka-body">
        {registered && balances && (
          <ul className="hub-bals zka-bals" role="list">
            {bal(balances.spendable, z.account.spendable)}
            {bal(balances.receiving, z.account.receiving)}
          </ul>
        )}
        <div className="zka-actions">
          {!address && (
            <button type="button" className="btn btn-dark" onClick={() => run("connect", async () => {})} disabled={!!busy || !provable}>{z.account.connect}</button>
          )}
          {address && balances && !registered && (
            <button type="button" className="btn btn-dark" onClick={() => run("register", (w) => w.register(setPhase))} disabled={!!busy}>{z.account.register}</button>
          )}
          {registered && balances && (
            <>
              {balances.receiving > 0n && (
                <button type="button" className="btn btn-dark" onClick={() => run("merge", (w) => w.merge(setPhase))} disabled={!!busy}>{z.account.merge}</button>
              )}
              <button type="button" className="btn btn-outline-w" onClick={() => setDialog("deposit")} disabled={!!busy}>{z.account.deposit}</button>
              <button type="button" className="btn btn-outline-w" onClick={() => setDialog("withdraw")} disabled={!!busy || balances.spendable === 0n}>{z.account.withdraw}</button>
            </>
          )}
        </div>
      </div>

      {busy && (
        <p className="work-progress" role="status">
          <span className="work-spin" aria-hidden="true" />
          <span>{phase ? z.phases[phase] : busy === "addToOrg" ? t.dash.wallets.signing : z.account.working}</span>
          {phase === "proving" && now > startedAt && <span className="work-time" aria-hidden="true">{clock(now - startedAt)}</span>}
        </p>
      )}
      {error && <p className="field-err" role="alert">{error}</p>}

      {dialog && balances && (
        <AmountDialog
          kind={dialog}
          symbol={sym}
          max={dialog === "withdraw" ? balances.spendable : null}
          onClose={() => setDialog(null)}
          onSubmit={(units) => {
            const kind = dialog;
            setDialog(null);
            run(kind, (w) => (kind === "deposit" ? w.deposit(units, setPhase) : w.withdraw(units, setPhase)));
          }}
        />
      )}
    </section>
  );
}

/* The amount of a deposit or a withdrawal, in the same well as the create dialog's. */
function AmountDialog({ kind, symbol, max, onClose, onSubmit }: { kind: "deposit" | "withdraw"; symbol: string; max: bigint | null; onClose: () => void; onSubmit: (units: bigint) => void }) {
  const t = useT();
  const z = t.zk;
  const [amount, setAmount] = useState("");
  const units = (() => { try { return amount.trim() ? toUnits(amount) : null; } catch { return null; } })();
  const over = max !== null && units !== null && units > max;
  const ok = units !== null && units > 0n && !over;
  const title = kind === "deposit" ? z.account.deposit : z.account.withdraw;
  return (
    <Modal onClose={onClose} label={title}>
      <form className="modal-body" onSubmit={(e) => { e.preventDefault(); if (ok) onSubmit(units!); }}>
        <h3>{title}</h3>
        <div className="fld">
          <div className="sp pl-amount">
            <div className="sp-top">
              <label htmlFor="zka-amount">{z.account.amountLabel}</label>
              {max !== null && <span>{z.account.spendable}: {fromUnits(max)} {symbol}</span>}
            </div>
            <div className="sp-row">
              <input
                id="zka-amount" className="sp-amount" inputMode="decimal" autoComplete="off" placeholder="0" autoFocus
                value={amount} onChange={(e) => setAmount(e.target.value.replace(",", "."))}
                aria-invalid={(amount.trim() !== "" && units === null) || over ? true : undefined}
              />
              <span className="sp-unit">{symbol}</span>
            </div>
          </div>
        </div>
        <div className="modal-actions">
          <button type="submit" className="btn btn-dark" disabled={!ok}>{title}</button>
          <button type="button" className="btn btn-outline-w" onClick={onClose}>{t.dash.common.cancel}</button>
        </div>
      </form>
    </Modal>
  );
}
