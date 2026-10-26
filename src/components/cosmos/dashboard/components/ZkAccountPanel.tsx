/* The confidential accounts of the organization's Stellar wallets, inside the private payments
   view (product owner: never another page for it, and no bare "connect Freighter": the view works
   from the wallets the organization connected in Settings). Each wallet says whether it already
   holds a confidential account on Cosmos Pay's token, read from the chain with no signature. Its
   one action opens Freighter only when it needs a key: "create the confidential account" (two
   signatures derive the key, kept for this tab only, then a register proof and one signature) or
   "view balances" (the balances are rebuilt from chain events and checked against the on-chain
   commitments), then incoming to available, a deposit of public XLM and a withdrawal back to
   public XLM. Freighter must have that same account selected. The amount is asked for in a
   dialog; the work shows its progress in the panel. Without a Stellar wallet the panel says the
   organization needs one, and whoever may connect wallets connects it here. Proofs are generated
   in this tab, on one thread (src/lib/zk/bb-loader.ts); nothing about the key leaves the browser. */
import { useEffect, useRef, useState } from "react";
import { Modal, showToast } from "@/components/cosmos/shared";
import { fmt, useT } from "@/lib/i18n/index";
import { DI } from "@/components/cosmos/dashboard/icons";
import { Pill } from "@/components/cosmos/dashboard/components/Pill";
import { Sk } from "@/components/cosmos/dashboard/components/Skeleton";
import { TokenMark } from "@/components/cosmos/dashboard/components/TokenMark";
import { ConnectWalletForm, NetworkMark } from "@/components/cosmos/dashboard/components/OrgWallets";
import { networkName } from "@/lib/chains";
import { shortAddress } from "@/lib/org-wallets";
import { canProve } from "@/lib/zk/bb-loader";
import { fromUnits, toUnits } from "@/lib/zk/amounts";
import type { ZkNetworkConfig } from "@/lib/zk/checkout-api";
import type { ZkBalances, ZkPhase, ZkWallet } from "@/lib/zk/wallet";

type Action = "register" | "open" | "merge" | "deposit" | "withdraw" | "refresh";
export interface PanelWallet { address: string; label: string | null }

class WrongAccountError extends Error {}

const clock = (ms: number) => {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

export function ZkAccountPanel({ config, orgId, orgWallets, canConnectWallets = false, onRegistered }: {
  config: ZkNetworkConfig;
  orgId: string;
  /* The organization's Stellar wallets; null while they load. */
  orgWallets: PanelWallet[] | null;
  canConnectWallets?: boolean;
  /* The wallets holding a confidential account (the create dialog preselects the first). */
  onRegistered?: (addresses: string[]) => void;
}) {
  const t = useT();
  const z = t.zk;
  const [status, setStatus] = useState<Record<string, boolean | null>>({});
  const [open, setOpen] = useState<string | null>(null);
  const [balances, setBalances] = useState<ZkBalances | null>(null);
  const [busy, setBusy] = useState<{ action: Action; address: string } | null>(null);
  const [phase, setPhase] = useState<ZkPhase | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<"deposit" | "withdraw" | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [startedAt, setStartedAt] = useState(0);
  const [now, setNow] = useState(0);
  const wallet = useRef<ZkWallet | null>(null);
  const sym = config.token.symbol;
  const addresses = (orgWallets || []).map((w) => w.address).join(",");

  // Which wallets already hold a confidential account: a read of the chain, no signature.
  useEffect(() => {
    if (!orgWallets?.length) return;
    let current = true;
    import("@/lib/zk/wallet")
      .then(({ confidentialAccounts }) => confidentialAccounts(config, orgWallets.map((w) => w.address)))
      .then((s) => { if (current) setStatus(s); })
      .catch(() => { if (current) setStatus({}); });
    return () => { current = false; };
  }, [addresses, config.token.contractId]);
  useEffect(() => { onRegistered?.((orgWallets || []).map((w) => w.address).filter((a) => status[a] === true)); }, [status, addresses]);
  useEffect(() => () => { wallet.current?.destroy(); }, []);
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

  const nameOf = (address: string) => orgWallets?.find((w) => w.address === address)?.label || shortAddress(address);
  const problem = (e: unknown, address: string): string => {
    if (e instanceof WrongAccountError) return fmt(z.account.wrongAccount, { wallet: nameOf(address) });
    const p = (e as { problem?: string })?.problem;
    if (p === "missing") return z.freighter.missing;
    if (p === "declined") return z.freighter.declined;
    if (p === "wrongNetwork") return fmt(z.freighter.wrongNetwork, { network: config.network === "public" ? "Mainnet" : "Testnet" });
    return e instanceof Error ? e.message : String(e);
  };
  const DONE: Partial<Record<Action, string>> = { register: z.account.createdOk, merge: z.account.mergeOk, deposit: z.account.depositOk, withdraw: z.account.withdrawOk };

  /* Runs one action for `address`: Freighter connects (it must have that account selected), the
     action runs, then the balances are read again. */
  const run = async (name: Action, address: string, action: (w: ZkWallet) => Promise<unknown>) => {
    if (busy) return;
    setBusy({ action: name, address });
    setError(null);
    try {
      if (wallet.current && wallet.current.address !== address) {
        await wallet.current.destroy();
        wallet.current = null;
      }
      if (!wallet.current) {
        const { ZkWallet } = await import("@/lib/zk/wallet");
        const w = await ZkWallet.connect(config, setPhase);
        if (w.address !== address) {
          await w.destroy();
          throw new WrongAccountError();
        }
        wallet.current = w;
      }
      await action(wallet.current);
      setPhase("waiting");
      const b = await wallet.current.balances();
      setBalances(b);
      setOpen(address);
      setStatus((s) => ({ ...s, [address]: b.registered }));
      if (DONE[name]) showToast(DONE[name]!);
    } catch (e) {
      setError(problem(e, address));
    } finally {
      setBusy(null);
      setPhase(null);
    }
  };

  const provable = canProve();
  const working = busy ? (phase ? z.phases[phase] : z.account.working) : null;

  return (
    <section className="panel zka" aria-labelledby="zka-title" aria-busy={busy ? true : undefined}>
      <div className="zka-head">
        <h2 id="zka-title" className="zka-title">{z.account.title}</h2>
        {open && balances && (
          <button type="button" className="icon-mini" title={z.account.refresh} aria-label={z.account.refresh} onClick={() => run("refresh", open, async () => {})} disabled={!!busy}>{DI.refresh}</button>
        )}
      </div>

      {!provable && <p className="field-err" role="alert">{z.cannotProve}</p>}

      {orgWallets === null && <div className="zka-rows"><Sk className="lg" w="100%" /></div>}

      {orgWallets !== null && orgWallets.length === 0 && (
        connecting ? (
          <div className="wl-inline arrive">
            <ConnectWalletForm orgId={orgId} chain="stellar" lockChain onDone={() => setConnecting(false)} onCancel={() => setConnecting(false)} />
          </div>
        ) : (
          <div className="wl-none" role="status">
            <span>{z.account.needWallet}</span>
            {canConnectWallets
              ? <button type="button" className="btn btn-outline-w btn-sm" onClick={() => setConnecting(true)}>{t.dash.wallets.connect}</button>
              : <span className="field-help">{t.dash.wallets.askAdmin}</span>}
          </div>
        )
      )}

      {orgWallets !== null && orgWallets.length > 0 && (
        <ul className="zka-rows" role="list">
          {orgWallets.map((w) => {
            const registered = status[w.address];
            const isOpen = open === w.address && balances?.registered;
            const mine = busy?.address === w.address;
            return (
              <li key={w.address} className={`zka-row${isOpen ? " open" : ""}`}>
                <div className="zka-row-main">
                  <NetworkMark chain="stellar" />
                  <span className="zka-row-t"><b>{w.label || networkName("stellar")}</b><span title={w.address}>{shortAddress(w.address)}</span></span>
                  <span className="zka-row-st">
                    {registered === undefined ? <Sk w="5em" /> : registered === true ? <Pill st="ok" label={z.account.registered} /> : registered === false ? <Pill st="ref" label={z.account.notRegistered} /> : null}
                  </span>
                  {!isOpen && (
                    registered === false
                      ? <button type="button" className="btn btn-dark btn-sm" onClick={() => run("register", w.address, (x) => x.register(setPhase))} disabled={!!busy || !provable}>{z.account.register}</button>
                      : <button type="button" className="btn btn-outline-w btn-sm" onClick={() => run("open", w.address, async () => {})} disabled={!!busy || registered === undefined}>{z.account.viewBalances}</button>
                  )}
                </div>
                {isOpen && balances && (
                  <div className="zka-body arrive">
                    <ul className="hub-bals zka-bals" role="list">
                      {([[balances.spendable, z.account.spendable], [balances.receiving, z.account.receiving]] as const).map(([amount, label]) => (
                        <li key={label} className="hub-bal">
                          <TokenMark symbol={sym} chain="stellar" chainName={networkName("stellar")} size={32} />
                          <span className="hub-bal-t"><b>{fromUnits(amount)} {sym}</b><span>{label}</span></span>
                        </li>
                      ))}
                    </ul>
                    <div className="zka-actions">
                      {balances.receiving > 0n && (
                        <button type="button" className="btn btn-dark" onClick={() => run("merge", w.address, (x) => x.merge(setPhase))} disabled={!!busy}>{z.account.merge}</button>
                      )}
                      <button type="button" className="btn btn-outline-w" onClick={() => setDialog("deposit")} disabled={!!busy}>{z.account.deposit}</button>
                      <button type="button" className="btn btn-outline-w" onClick={() => setDialog("withdraw")} disabled={!!busy || balances.spendable === 0n}>{z.account.withdraw}</button>
                    </div>
                  </div>
                )}
                {mine && working && (
                  <p className="work-progress" role="status">
                    <span className="work-spin" aria-hidden="true" />
                    <span>{working}</span>
                    {phase === "proving" && now > startedAt && <span className="work-time" aria-hidden="true">{clock(now - startedAt)}</span>}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {error && <p className="field-err" role="alert">{error}</p>}

      {dialog && open && balances && (
        <AmountDialog
          kind={dialog}
          symbol={sym}
          max={dialog === "withdraw" ? balances.spendable : null}
          onClose={() => setDialog(null)}
          onSubmit={(units) => {
            const kind = dialog;
            setDialog(null);
            run(kind, open, (x) => (kind === "deposit" ? x.deposit(units, setPhase) : x.withdraw(units, setPhase)));
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
