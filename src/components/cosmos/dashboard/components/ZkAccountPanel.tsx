/* The private accounts, a table inside the private payments view in the format of every other list
   (product owner: never another page for it; 2026-10-27: the same table format, in their own
   "Private accounts" section, under the payments). A private account is a customer's Stellar
   wallet (product owner, 2026-10-27: they are customers' wallets, as many as there are; the
   organization's own wallets take its fees), so each row is one, with its customer, whether it
   already holds a confidential account on Cosmos Pay's token (read from the chain with no
   signature, for the page on screen) and how many private payments it received (which filter the
   payments table). "Add private account" adds a Stellar wallet to a customer, new or already there. A row opens the account's detail. Nothing connects a wallet
   (product owner, 2026-10-27: people hand over a signed XDR, not their wallet): every signature is
   asked for in ZkSignDialog, the way a swap's is (Freighter in one click, or the XDR signed in
   any Stellar wallet and pasted back), and must be the row's account's. Its one action is "create
   the private account" (the key transaction signed twice derives the key, kept for this tab only,
   then a register proof and one more signature) or "view balances" (one signature of the key
   transaction; the balances are rebuilt from chain events and checked against the on-chain
   commitments, then shown in the row), then incoming to available, a deposit of public XLM and a
   withdrawal back to public XLM. An account whose key came from a Freighter message signature
   opens with Freighter. The amount is asked for in a dialog; the work shows its progress under
   the row. Proofs are generated in this tab,
   on one thread (src/lib/zk/bb-loader.ts); nothing about the key leaves the browser. */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { StrKey } from "@stellar/stellar-sdk";
import { Modal, showToast } from "@/components/cosmos/shared";
import { fmt, useT } from "@/lib/i18n/index";
import { DI } from "@/components/cosmos/dashboard/icons";
import { Pill } from "@/components/cosmos/dashboard/components/Pill";
import { Sk, TableSkeleton } from "@/components/cosmos/dashboard/components/Skeleton";
import { RowMenu } from "@/components/cosmos/dashboard/components/RowMenu";
import { FillRows } from "@/components/cosmos/dashboard/components/FillRows";
import { Pagination } from "@/components/cosmos/dashboard/components/Pagination";
import { AddressLink } from "@/components/cosmos/dashboard/components/AddressLink";
import { NetworkMark } from "@/components/cosmos/dashboard/components/OrgWallets";
import { Field } from "@/components/cosmos/dashboard/components/Field";
import { Select } from "@/components/cosmos/dashboard/components/Select";
import { customers as custApi } from "@/lib/api-client";
import { usePaged } from "@/components/cosmos/dashboard/hooks";
import { networkName } from "@/lib/chains";
import { shortAddress } from "@/lib/org-wallets";
import { canProve } from "@/lib/zk/bb-loader";
import { fromUnits, toUnits } from "@/lib/zk/amounts";
import type { ZkNetworkConfig } from "@/lib/zk/checkout-api";
import type { ZkBalances, ZkPhase, ZkWallet } from "@/lib/zk/wallet";
import type { SignRequest } from "@/lib/zk/xdr-signer";
import { ZkSignDialog } from "@/components/cosmos/dashboard/components/ZkSignDialog";

type Action = "register" | "open" | "merge" | "deposit" | "withdraw" | "refresh";
/** A customer's Stellar wallet: a private account, once it holds a confidential account. */
export interface PrivateAccount { address: string; label: string | null; customerId: string; customerName: string }
export interface PanelCustomer { id: string; name: string }

class WrongAccountError extends Error {}

const COLS = 7;

const clock = (ms: number) => {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

export function ZkAccountPanel({ config, orgId, env, accounts, customers, canAdd = false, onAdded, onRegistered, payments = null, onShowPayments }: {
  config: ZkNetworkConfig;
  orgId: string;
  env: string;
  /* Every customer's Stellar wallets; null while they load. */
  accounts: PrivateAccount[] | null;
  /* The organization's customers, to add a wallet to one; null while they load. */
  customers: PanelCustomer[] | null;
  /* Whether this member may add customers' wallets. */
  canAdd?: boolean;
  /* Read the customers again, after a wallet was added. */
  onAdded?: () => void;
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
  const [adding, setAdding] = useState(false);
  // The signature the running action waits for, and how to hand it back.
  const [signing, setSigning] = useState<{ request: SignRequest; resolve: (xdr: string) => void; reject: (e: Error) => void } | null>(null);
  const [startedAt, setStartedAt] = useState(0);
  const [now, setNow] = useState(0);
  const wallet = useRef<ZkWallet | null>(null);
  const sym = config.token.symbol;
  const rows = accounts || [];
  const addresses = rows.map((w) => w.address).join(",");
  const pg = usePaged(rows, addresses);
  const onPage = pg.slice.map((w) => w.address).filter((a) => !(a in status));

  // Which wallets on this page already hold a confidential account: a read of the chain, no
  // signature, only for the rows on screen (there may be any number of them), kept once read.
  useEffect(() => {
    if (!onPage.length) return;
    let current = true;
    import("@/lib/zk/wallet")
      .then(({ confidentialAccounts }) => confidentialAccounts(config, onPage))
      .then((s) => { if (current) setStatus((prev) => ({ ...prev, ...s })); })
      .catch(() => { if (current) setStatus((prev) => ({ ...prev, ...Object.fromEntries(onPage.map((a) => [a, null])) })); });
    return () => { current = false; };
  }, [onPage.join(","), config.token.contractId]);
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

  const nameOf = (address: string) => {
    const w = rows.find((x) => x.address === address);
    return w ? w.label || w.customerName : shortAddress(address);
  };
  /* What a failed action says; nothing when the person cancelled a signature. The error classes
     come from the modules that threw them, already loaded by then. */
  const problem = async (e: unknown, address: string): Promise<string | null> => {
    const [{ KeyMismatchError }, { KeyDerivationError }, { SignCancelledError }] = await Promise.all([
      import("@/lib/zk/wallet"), import("@/lib/zk/derive-key"), import("@/lib/zk/xdr-signer"),
    ]);
    if (e instanceof SignCancelledError) return null;
    if (e instanceof KeyMismatchError) return za.keyMismatch;
    if (e instanceof KeyDerivationError) return za.keyFailed;
    if (e instanceof WrongAccountError) return fmt(za.wrongAccount, { wallet: nameOf(address) });
    if (/tx_?too_?late|txTooLate/i.test(e instanceof Error ? e.message : "")) return z.sign.expired;
    const p = (e as { problem?: string })?.problem;
    if (p === "missing") return z.freighter.missing;
    if (p === "declined") return z.freighter.declined;
    if (p === "wrongNetwork") return fmt(z.freighter.wrongNetwork, { network: config.network === "public" ? "Mainnet" : "Testnet" });
    return e instanceof Error ? e.message : String(e);
  };
  const DONE: Partial<Record<Action, string>> = { register: za.createdOk, merge: za.mergeOk, deposit: za.depositOk, withdraw: za.withdrawOk };

  /* Each signature the wallet needs opens the signing dialog (closing the account's detail) and
     waits for it; cancelling it ends the action quietly. */
  const requestSignature = (request: SignRequest) => new Promise<string>((resolve, reject) => {
    setDetail(null);
    setSigning({ request, resolve, reject });
  });

  /* Runs one action for `address`: its key from the account's signature (or this tab's), the
     action, then the balances read again. */
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
        const [{ ZkWallet }, { XdrSigner }] = await Promise.all([import("@/lib/zk/wallet"), import("@/lib/zk/xdr-signer")]);
        // A key from a Freighter message signature is opened with Freighter, on that account.
        const legacyMessage = async (message: string) => {
          const { connectFreighter } = await import("@/lib/zk/freighter-signer");
          const f = await connectFreighter(config.networkPassphrase);
          if (f.publicKey !== address) throw new WrongAccountError();
          return f.signMessage(message);
        };
        const signer = new XdrSigner(address, config.networkPassphrase, requestSignature, legacyMessage);
        wallet.current = await ZkWallet.connect(config, signer, setPhase);
      }
      await action(wallet.current);
      setPhase("waiting");
      const b = await wallet.current.balances();
      setBalances(b);
      setOpen(address);
      setStatus((s) => ({ ...s, [address]: b.registered }));
      if (DONE[name]) showToast(DONE[name]!);
    } catch (e) {
      setError(await problem(e, address));
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
        {canAdd && !adding && (
          <button type="button" className="btn btn-outline-w btn-sm" onClick={() => setAdding(true)}>{DI.plus} {za.add}</button>
        )}
      </div>

      {!provable && <p className="field-err zka-note" role="alert">{z.cannotProve}</p>}

      {adding && (
        <div className="wl-inline arrive zka-note">
          <AddPrivateAccount customers={customers} env={env} orgId={orgId} onDone={() => { setAdding(false); onAdded?.(); }} onCancel={() => setAdding(false)} />
        </div>
      )}

      {accounts === null && <TableSkeleton label={za.title} cols={COLS} rows={2} />}

      {accounts !== null && rows.length === 0 && !adding && (
        <div className="wl-none zka-note" role="status">
          <span>{za.empty}</span>
          {canAdd && <button type="button" className="btn btn-outline-w btn-sm" onClick={() => setAdding(true)}>{za.add}</button>}
        </div>
      )}

      {rows.length > 0 && (
        <div className="t-scroll" tabIndex={0}><table className="tx">
          <thead><tr><th>{za.tableHead.customer}</th><th>{za.tableHead.address}</th><th>{za.tableHead.status}</th><th>{za.spendable}</th><th>{za.receiving}</th><th>{za.tableHead.payments}</th><th><span className="sr-only">{t.dash.common.actions}</span></th></tr></thead>
          <tbody>
            {pg.slice.map((w) => {
              const a = actionsFor(w.address);
              const work = progress(w.address);
              return [
                <tr key={w.address} className="row-click" onClick={() => setDetail(w.address)}>
                  <td><span className="cust-cell"><NetworkMark chain="stellar" size={24} /><span>{w.customerName}{w.label && <small className="cust-wallet-net">{w.label}</small>}</span></span></td>
                  <td className="cust" onClick={(e) => e.stopPropagation()}><AddressLink chain="stellar" network={config.network} address={w.address} label={za.tableHead.address} /></td>
                  <td>{statusPill(a.registered)}</td>
                  <td className="amt">{a.loaded ? `${fromUnits(a.loaded.spendable)} ${sym}` : <span title={a.registered ? za.viewBalances : undefined}>-</span>}</td>
                  <td className="amt">{a.loaded ? `${fromUnits(a.loaded.receiving)} ${sym}` : "-"}</td>
                  <td className="cust">{paymentsCell(w.address)}</td>
                  <td style={{ textAlign: "right", whiteSpace: "nowrap" }} onClick={(e) => e.stopPropagation()}>
                    {a.primary && <button type="button" className={`btn ${a.primary.dark ? "btn-dark" : "btn-outline-w"} btn-sm`} onClick={a.primary.onClick} disabled={a.primary.disabled}>{a.primary.label}</button>}
                    <RowMenu
                      label={fmt(t.dash.common.rowActions, { name: w.label ? `${w.customerName} (${w.label})` : w.customerName })}
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
              <h3>{opened.customerName}</h3>
              <div className="paylink-fields" style={{ marginBottom: 18 }}>
                {([
                  [za.tableHead.customer, opened.customerName],
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

      {signing && (
        <ZkSignDialog
          key={signing.request.xdr}
          request={signing.request}
          network={config.network}
          onSigned={(xdr) => { signing.resolve(xdr); setSigning(null); }}
          onCancel={async () => { const { SignCancelledError } = await import("@/lib/zk/xdr-signer"); signing.reject(new SignCancelledError()); setSigning(null); }}
        />
      )}

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

/* A customer's Stellar wallet added as a private account: to a customer already there, or to a new
   one named here. Its address only: the customer proves it by signing when the private account is
   created (the key transaction and the register), so nothing is signed to add it. */
const NEW_CUSTOMER = "__new";
function AddPrivateAccount({ customers, env, orgId, onDone, onCancel }: { customers: PanelCustomer[] | null; env: string; orgId: string; onDone: () => void; onCancel: () => void }) {
  const t = useT();
  const za = t.zk.account;
  const [customer, setCustomer] = useState(NEW_CUSTOMER);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const account = address.trim();
  const valid = StrKey.isValidEd25519PublicKey(account);
  const ready = valid && (customer !== NEW_CUSTOMER || name.trim() !== "") && !busy;
  const wallet = { chain: "stellar", address: account, ...(label.trim() ? { label: label.trim() } : {}) };

  const add = async () => {
    if (!ready) return;
    setBusy(true);
    setProblem(null);
    try {
      if (customer === NEW_CUSTOMER) await custApi.create(env, orgId, { name: name.trim(), wallets: [wallet] });
      else await custApi.addWallet(customer, env, orgId, wallet);
      showToast(za.added);
      onDone();
    } catch (e) {
      setProblem((e as Error)?.message || za.add);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="wl-connect">
      <div className="fld">
        <span className="field-l" id="zka-customer-l">{za.tableHead.customer}</span>
        <Select labelledBy="zka-customer-l" value={customer} onChange={setCustomer} options={[{ value: NEW_CUSTOMER, label: za.newCustomer }, ...(customers || []).map((c) => ({ value: c.id, label: c.name }))]} />
      </div>
      {customer === NEW_CUSTOMER && <Field label={za.customerName} value={name} onChange={(e) => setName(e.target.value)} placeholder={t.dash.examples.customerName} maxLength={120} disabled={busy} />}
      <Field label={t.dash.wallets.address} value={address} onChange={(e) => { setAddress(e.target.value); setProblem(null); }} placeholder={t.dash.wallets.addressPlaceholder} spellCheck={false} autoComplete="off" disabled={busy} aria-invalid={account !== "" && !valid ? true : undefined} />
      {account !== "" && !valid && <p className="field-err" role="alert">{t.dash.wallets.invalidAddress}</p>}
      <Field label={za.walletLabel} hint={t.dash.common.optional} value={label} onChange={(e) => setLabel(e.target.value)} placeholder={t.dash.wallets.labelPlaceholder} maxLength={60} disabled={busy} />
      {problem && <p className="field-err" role="alert">{problem}</p>}
      <div className="modal-actions">
        <button type="button" className="btn btn-dark" onClick={add} disabled={!ready}>{za.add}</button>
        <button type="button" className="btn btn-outline-w" onClick={onCancel} disabled={busy}>{t.dash.common.cancel}</button>
      </div>
    </div>
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
