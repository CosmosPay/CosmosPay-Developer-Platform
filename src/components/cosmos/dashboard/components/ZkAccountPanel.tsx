/* The private accounts of the organization's Stellar wallets, a table inside the private payments
   view in the format of every other list (product owner: never another page for it, and no bare
   "connect Freighter": the view works from the wallets the organization connected in Settings;
   2026-10-27: the accounts in the same table format, in their own "Private accounts" section).
   Each wallet is a row saying whether it already holds a confidential account on Cosmos Pay's
   token, read from the chain with no signature, and how many private payments it received (which
   filter the payments table). A row opens the account's detail. Its one action opens Freighter
   only when it needs a key: "create the private account" (two signatures derive the key, kept
   for this tab only, then a register proof and one signature) or "view balances" (the balances
   are rebuilt from chain events and checked against the on-chain commitments, then shown in the
   row), then incoming to available, a deposit of public XLM and a withdrawal back to public XLM.
   Freighter must have that same account selected. The amount is asked for in a dialog; the work
   shows its progress under the row. Without a Stellar wallet the panel says the organization
   needs one, and whoever may connect wallets connects it here. Proofs are generated in this tab,
   on one thread (src/lib/zk/bb-loader.ts); nothing about the key leaves the browser. */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Modal, showToast } from "@/components/cosmos/shared";
import { fmt, useT } from "@/lib/i18n/index";
import { DI } from "@/components/cosmos/dashboard/icons";
import { Pill } from "@/components/cosmos/dashboard/components/Pill";
import { Sk, TableSkeleton } from "@/components/cosmos/dashboard/components/Skeleton";
import { RowMenu } from "@/components/cosmos/dashboard/components/RowMenu";
import { FillRows } from "@/components/cosmos/dashboard/components/FillRows";
import { Pagination } from "@/components/cosmos/dashboard/components/Pagination";
import { AddressLink } from "@/components/cosmos/dashboard/components/AddressLink";
import { ConnectWalletForm, NetworkMark } from "@/components/cosmos/dashboard/components/OrgWallets";
import { usePaged } from "@/components/cosmos/dashboard/hooks";
import { networkName } from "@/lib/chains";
import { shortAddress } from "@/lib/org-wallets";
import { canProve } from "@/lib/zk/bb-loader";
import { fromUnits, toUnits } from "@/lib/zk/amounts";
import type { ZkNetworkConfig } from "@/lib/zk/checkout-api";
import type { ZkBalances, ZkPhase, ZkWallet } from "@/lib/zk/wallet";

type Action = "register" | "open" | "merge" | "deposit" | "withdraw" | "refresh";
export interface PanelWallet { address: string; label: string | null }

class WrongAccountError extends Error {}

const COLS = 7;

const clock = (ms: number) => {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

export function ZkAccountPanel({ config, orgId, orgWallets, canConnectWallets = false, onRegistered, payments = null, onShowPayments }: {
  config: ZkNetworkConfig;
  orgId: string;
  /* The organization's Stellar wallets; null while they load. */
  orgWallets: PanelWallet[] | null;
  canConnectWallets?: boolean;
  /* The wallets holding a confidential account (the create dialog preselects the first). */
  onRegistered?: (addresses: string[]) => void;
  /* The organization's private payments, to count each account's; null while they load. */
  payments?: { recipient?: string | null }[] | null;
  /* Shows the payments table filtered to one account. */
  onShowPayments?: (address: string) => void;
}) {
  const t = useT();
  const z = t.zk;
  const za = z.account;
  const [status, setStatus] = useState<Record<string, boolean | null>>({});
  const [open, setOpen] = useState<string | null>(null);
  const [balances, setBalances] = useState<ZkBalances | null>(null);
  const [busy, setBusy] = useState<{ action: Action; address: string } | null>(null);
  const [phase, setPhase] = useState<ZkPhase | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<"deposit" | "withdraw" | null>(null);
  const [detail, setDetail] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [startedAt, setStartedAt] = useState(0);
  const [now, setNow] = useState(0);
  const wallet = useRef<ZkWallet | null>(null);
  const sym = config.token.symbol;
  const rows = orgWallets || [];
  const addresses = rows.map((w) => w.address).join(",");
  const pg = usePaged(rows, addresses);

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
  useEffect(() => { onRegistered?.(rows.map((w) => w.address).filter((a) => status[a] === true)); }, [status, addresses]);
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
    if (e instanceof WrongAccountError) return fmt(za.wrongAccount, { wallet: nameOf(address) });
    const p = (e as { problem?: string })?.problem;
    if (p === "missing") return z.freighter.missing;
    if (p === "declined") return z.freighter.declined;
    if (p === "wrongNetwork") return fmt(z.freighter.wrongNetwork, { network: config.network === "public" ? "Mainnet" : "Testnet" });
    return e instanceof Error ? e.message : String(e);
  };
  const DONE: Partial<Record<Action, string>> = { register: za.createdOk, merge: za.mergeOk, deposit: za.depositOk, withdraw: za.withdrawOk };

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
  const working = busy ? (phase ? z.phases[phase] : za.working) : null;
  const received = (address: string) => (payments ? payments.filter((p) => p.recipient === address).length : null);
  const loadedFor = (address: string) => (open === address && balances?.registered ? balances : null);
  const copy = (address: string) => navigator.clipboard?.writeText(address).then(() => showToast(t.toasts.copied)).catch(() => {});
  const amountDialog = (kind: "deposit" | "withdraw") => { setDetail(null); setDialog(kind); };

  /* What an account offers: its first step (create it, or read its balances), then, once its
     balances are on screen, moving incoming funds, a deposit and a withdrawal. */
  const actionsFor = (address: string) => {
    const registered = status[address];
    const loaded = loadedFor(address);
    return {
      registered,
      loaded,
      primary: registered === false
        ? { label: za.register, dark: true, disabled: !!busy || !provable, onClick: () => run("register", address, (x) => x.register(setPhase)) }
        : !loaded
          ? { label: za.viewBalances, dark: false, disabled: !!busy || registered === undefined, onClick: () => run("open", address, async () => {}) }
          : null,
      more: [
        ...(loaded ? [{ key: "refresh", label: za.refresh, icon: DI.refresh, disabled: !!busy, onClick: () => run("refresh", address, async () => {}) }] : []),
        ...(loaded && loaded.receiving > 0n ? [{ key: "merge", label: za.merge, icon: DI.balances, disabled: !!busy, onClick: () => run("merge", address, (x) => x.merge(setPhase)) }] : []),
        ...(loaded ? [
          { key: "deposit", label: za.deposit, icon: DI.plus, disabled: !!busy, onClick: () => amountDialog("deposit") },
          { key: "withdraw", label: za.withdraw, icon: DI.download, disabled: !!busy || loaded.spendable === 0n, onClick: () => amountDialog("withdraw") },
        ] : []),
      ],
    };
  };

  const statusPill = (registered: boolean | null | undefined) =>
    registered === undefined ? <Sk w="5em" /> : registered === true ? <Pill st="ok" label={za.registered} /> : registered === false ? <Pill st="ref" label={za.notRegistered} /> : <span>-</span>;
  const progress = (address: string) => busy?.address === address && working ? (
    <p className="work-progress" role="status">
      <span className="work-spin" aria-hidden="true" />
      <span>{working}</span>
      {phase === "proving" && now > startedAt && <span className="work-time" aria-hidden="true">{clock(now - startedAt)}</span>}
    </p>
  ) : null;
  const paymentsCell = (address: string) => {
    const n = received(address);
    if (n === null) return <Sk w="2em" />;
    return n > 0 && onShowPayments
      ? <button type="button" className="link-btn" title={za.paymentsTo} aria-label={`${za.paymentsTo}: ${n}`} onClick={(e) => { e.stopPropagation(); setDetail(null); onShowPayments(address); }}>{n}</button>
      : <span title={za.paymentsTo}>{n}</span>;
  };
  const opened = detail ? rows.find((w) => w.address === detail) : null;

  return (
    <section className="panel zka" aria-labelledby="zka-title" aria-busy={busy ? true : undefined}>
      <div className="panel-head">
        <h3 id="zka-title">{za.title}</h3>
        {canConnectWallets && rows.length > 0 && !connecting && (
          <button type="button" className="btn btn-outline-w btn-sm" onClick={() => setConnecting(true)}>{DI.plus} {t.dash.wallets.connectAnother}</button>
        )}
      </div>

      {!provable && <p className="field-err zka-note" role="alert">{z.cannotProve}</p>}

      {connecting && (
        <div className="wl-inline arrive zka-note">
          <ConnectWalletForm orgId={orgId} chain="stellar" lockChain onDone={() => setConnecting(false)} onCancel={() => setConnecting(false)} />
        </div>
      )}

      {orgWallets === null && <TableSkeleton label={za.title} cols={COLS} rows={2} />}

      {orgWallets !== null && rows.length === 0 && !connecting && (
        <div className="wl-none zka-note" role="status">
          <span>{za.needWallet}</span>
          {canConnectWallets
            ? <button type="button" className="btn btn-outline-w btn-sm" onClick={() => setConnecting(true)}>{t.dash.wallets.connect}</button>
            : <span className="field-help">{t.dash.wallets.askAdmin}</span>}
        </div>
      )}

      {rows.length > 0 && (
        <div className="t-scroll" tabIndex={0}><table className="tx">
          <thead><tr><th>{za.tableHead.wallet}</th><th>{za.tableHead.address}</th><th>{za.tableHead.status}</th><th>{za.spendable}</th><th>{za.receiving}</th><th>{za.tableHead.payments}</th><th><span className="sr-only">{t.dash.common.actions}</span></th></tr></thead>
          <tbody>
            {pg.slice.map((w) => {
              const a = actionsFor(w.address);
              const work = progress(w.address);
              return [
                <tr key={w.address} className="row-click" onClick={() => setDetail(w.address)}>
                  <td><span className="cust-cell"><NetworkMark chain="stellar" size={24} /><span>{w.label || networkName("stellar")}</span></span></td>
                  <td className="cust" onClick={(e) => e.stopPropagation()}><AddressLink chain="stellar" network={config.network} address={w.address} label={za.tableHead.address} /></td>
                  <td>{statusPill(a.registered)}</td>
                  <td className="amt">{a.loaded ? `${fromUnits(a.loaded.spendable)} ${sym}` : <span title={a.registered ? za.viewBalances : undefined}>-</span>}</td>
                  <td className="amt">{a.loaded ? `${fromUnits(a.loaded.receiving)} ${sym}` : "-"}</td>
                  <td className="cust">{paymentsCell(w.address)}</td>
                  <td style={{ textAlign: "right", whiteSpace: "nowrap" }} onClick={(e) => e.stopPropagation()}>
                    {a.primary && <button type="button" className={`btn ${a.primary.dark ? "btn-dark" : "btn-outline-w"} btn-sm`} onClick={a.primary.onClick} disabled={a.primary.disabled}>{a.primary.label}</button>}
                    <RowMenu
                      label={fmt(t.dash.common.rowActions, { name: w.label || shortAddress(w.address) })}
                      items={[
                        { key: "open", label: t.dash.common.details, icon: DI.docs, onClick: () => setDetail(w.address) },
                        ...a.more,
                        { key: "copy", label: t.dash.common.copyAccount, icon: DI.link, onClick: () => copy(w.address) },
                      ]}
                    />
                  </td>
                </tr>,
                work && <tr key={`${w.address}:work`} className="zka-work"><td colSpan={COLS}>{work}</td></tr>,
              ];
            })}
            <FillRows n={pg.size - pg.count} cols={COLS} />
          </tbody>
        </table></div>
      )}
      {rows.length > 0 && <Pagination {...pg} />}
      {error && !detail && <p className="field-err zka-note" role="alert">{error}</p>}

      {opened && (() => {
        const a = actionsFor(opened.address);
        return (
          <Modal onClose={() => setDetail(null)} label={za.detail}>
            <div className="modal-body">
              <div className="modal-eyebrow">{za.detail}</div>
              <h3>{opened.label || shortAddress(opened.address)}</h3>
              <div className="paylink-fields" style={{ marginBottom: 18 }}>
                {([
                  [za.tableHead.wallet, opened.label || networkName("stellar")],
                  [za.tableHead.address, <AddressLink key="a" chain="stellar" network={config.network} address={opened.address} label={za.tableHead.address} />],
                  [t.dash.paylinks.detail.fields.network, `${networkName("stellar")} ${config.network === "public" ? "Mainnet" : "Testnet"}`],
                  [za.tableHead.status, statusPill(a.registered)],
                  ...(a.loaded ? [[za.spendable, `${fromUnits(a.loaded.spendable)} ${sym}`], [za.receiving, `${fromUnits(a.loaded.receiving)} ${sym}`]] : []),
                  [za.tableHead.payments, paymentsCell(opened.address)],
                ] as [string, ReactNode][]).map(([k, v]) => (
                  <div className="paylink-field" key={k}><span className="pf-k">{k}</span><span className="pf-v">{v}</span></div>
                ))}
              </div>
              {progress(opened.address)}
              {error && <p className="field-err" role="alert">{error}</p>}
              <div className="paylink-actions">
                {a.primary && <button type="button" className={`btn ${a.primary.dark ? "btn-dark" : "btn-outline-w"} btn-sm`} onClick={a.primary.onClick} disabled={a.primary.disabled}>{a.primary.label}</button>}
                {a.more.map((m) => <button key={m.key} type="button" className="btn btn-soft btn-sm" onClick={m.onClick} disabled={m.disabled}>{m.icon} {m.label}</button>)}
              </div>
            </div>
          </Modal>
        );
      })()}

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
