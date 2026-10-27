/* The private accounts, a table inside the private payments view in the format of every other list
   (product owner: never another page for it; 2026-10-27: the same table format, in their own
   "Private accounts" section, under the payments). A private account is a customer's Stellar
   wallet that holds a confidential account on Cosmos Pay's token (product owner, 2026-10-27: they
   are customers' wallets, as many as there are; the organization's own wallets take its fees; an
   account that is not on the token's contract is a public wallet, not a private account). So the
   table lists only the customers' Stellar wallets the chain says are registered on the token (read
   with no signature, a few at a time, before the table shows); a customer's other Stellar wallets
   stay in Customers. Each row has its customer, its balances (read only with the customer's
   signature), how many private payments it received (which filter the payments table) and when it
   was added. It is a list like every other (product owner, 2026-10-27): a section heading, the
   filter bar (search, date, its own URL keys), the table with the customer as the link that opens
   and previews the account, the row's icon actions and its menu, filler rows and pages.

   "Add private account" opens a dialog in two steps, as long forms do: the account (a customer, new
   or already there, and one of their Stellar wallets or a new address), then the signatures that
   create it on the token (product owner, 2026-10-27: adding a private account asks for the
   signatures; nothing is added that is not on the contract). The customer signs the key
   transaction (it derives the key, held in memory while the page is open and never stored), the
   browser proves the registration, and the customer signs the register transaction. Only then is
   the wallet saved to the customer. An account already on the token is a private account already
   (the token keeps one per Stellar account, so nothing new can be derived for it): it is added with
   nothing to sign, even when its key came from another root (registered by the private checkout or
   by this table before 2026-10-26 22:23 with Freighter's message signature); it receives private
   payments, and only its balances do not open here. Nothing connects or opens a wallet (product owner,
   2026-10-27: people hand over a signed XDR, not their wallet, and the wallet is the customer's):
   every signature is asked for in ZkSignDialog, the XDR for the customer to sign in any Stellar
   wallet and paste back, and must be the account's.

   A row's balances, "view balances", ask for the key signature again after a reload; once on
   screen they offer incoming to available, a deposit of public XLM and a withdrawal back to public
   XLM. "Delete", in the row and the detail, once confirmed, removes the wallet from its customer as
   the customer's detail does (`customers:edit`): the row leaves the table, while the confidential
   account and its balance stay the customer's on-chain. The key comes from the transaction root
   only: an account whose key came from a message signature (the private checkout's, with
   Freighter) does not open here. The amount is asked for in a dialog; the work shows its progress
   under the row (or in the add dialog). Proofs are generated in this tab, on one thread
   (src/lib/zk/bb-loader.ts); nothing about the key leaves the browser. */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { StrKey } from "@stellar/stellar-sdk";
import { Modal, showToast } from "@/components/cosmos/shared";
import { fmt, useT } from "@/lib/i18n/index";
import { IcCopy } from "@/components/cosmos/icons";
import { DI } from "@/components/cosmos/dashboard/icons";
import { Sk, TableSkeleton } from "@/components/cosmos/dashboard/components/Skeleton";
import { RowMenu } from "@/components/cosmos/dashboard/components/RowMenu";
import { FillRows } from "@/components/cosmos/dashboard/components/FillRows";
import { Pagination } from "@/components/cosmos/dashboard/components/Pagination";
import { AddressLink } from "@/components/cosmos/dashboard/components/AddressLink";
import { NetworkMark } from "@/components/cosmos/dashboard/components/OrgWallets";
import { Field } from "@/components/cosmos/dashboard/components/Field";
import { Select } from "@/components/cosmos/dashboard/components/Select";
import { FilterBar } from "@/components/cosmos/dashboard/components/FilterBar";
import { RecordLink } from "@/components/cosmos/dashboard/components/RecordLink";
import { PreviewCard } from "@/components/cosmos/dashboard/components/RecordPreview";
import { FormSteps, FormStep, FormStepsFooter, useFormSteps } from "@/components/cosmos/dashboard/components/FormSteps";
import { ConfirmModal } from "@/components/cosmos/ui/ConfirmModal";
import { customers as custApi } from "@/lib/api-client";
import { usePaged, useGsapRows, useListFilters } from "@/components/cosmos/dashboard/hooks";
import { fmtDateTime } from "@/components/cosmos/dashboard/helpers";
import { inRange, matchesQuery } from "@/lib/dashboard-filters";
import { explorerAccountUrl, networkName } from "@/lib/chains";
import { shortAddress } from "@/lib/org-wallets";
import { canProve } from "@/lib/zk/bb-loader";
import { fromUnits, toUnits } from "@/lib/zk/amounts";
import type { ZkNetworkConfig } from "@/lib/zk/checkout-api";
import type { ZkBalances, ZkPhase, ZkWallet } from "@/lib/zk/wallet";
import type { SignRequest } from "@/lib/zk/xdr-signer";
import { ZkSignDialog } from "@/components/cosmos/dashboard/components/ZkSignDialog";

type Action = "create" | "open" | "merge" | "deposit" | "withdraw" | "refresh";
/** A customer's Stellar wallet: a private account, once it holds a confidential account. */
export interface PrivateAccount { walletId: string; address: string; label: string | null; customerId: string; customerName: string; createdAt: string }
export interface PanelCustomer { id: string; name: string }
/** Whether an action ended well (true), failed (what to say) or was cancelled (null). */
type Outcome = true | string | null;

const COLS = 7;
/* Its own filters, in the URL beside the payments' (their keys are their own). */
const DEFAULTS = { accq: "", accdate: "any" };
/* The chain is read this many accounts at a time. */
const STATUS_CHUNK = 25;

const clock = (ms: number) => {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

export function ZkAccountPanel({ config, orgId, env, accounts, loadError = false, customers, canAdd = false, canRemove = false, onChanged, onRegistered, payments = null, onShowPayments }: {
  config: ZkNetworkConfig;
  orgId: string;
  env: string;
  /* Every customer's Stellar wallets; null while they load. */
  accounts: PrivateAccount[] | null;
  /* The customers could not be read: the table says so instead of "no accounts". */
  loadError?: boolean;
  /* The organization's customers, to add a wallet to one; null while they load. */
  customers: PanelCustomer[] | null;
  /* Whether this member may add customers' wallets, and remove them. */
  canAdd?: boolean;
  canRemove?: boolean;
  /* Read the customers again, after a wallet was added or removed. */
  onChanged?: () => void;
  /* The wallets holding a confidential account (the payments' recipients); null until every
     wallet was read. */
  onRegistered?: (addresses: string[] | null) => void;
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
  const [toRemove, setToRemove] = useState<PrivateAccount | null>(null);
  const [removing, setRemoving] = useState(false);
  // The signature the running action waits for, and how to hand it back.
  const [signing, setSigning] = useState<{ request: SignRequest; resolve: (xdr: string) => void; reject: (e: Error) => void } | null>(null);
  const [startedAt, setStartedAt] = useState(0);
  const [now, setNow] = useState(0);
  const wallet = useRef<ZkWallet | null>(null);
  const sym = config.token.symbol;
  const fl = t.dash.filters;
  const { filters, set, reset, active } = useListFilters(DEFAULTS);
  const all = accounts || [];
  const addresses = all.map((w) => w.address).join(",");
  // Every wallet's place on the token is read before the table shows: only the registered ones
  // are private accounts.
  const unread = [...new Set(all.map((w) => w.address).filter((a) => !(a in status)))];
  const checking = accounts !== null && unread.length > 0;
  const privateAccounts = all.filter((w) => status[w.address] === true);
  const unchecked = all.filter((w) => status[w.address] === null);
  const rows = privateAccounts.filter((w) => inRange(w.createdAt, filters.accdate) && matchesQuery([w.customerName, w.label, w.address], filters.accq));
  // Back to the first page when the filters change, not when an account is added or removed.
  const pg = usePaged(rows, JSON.stringify(filters));
  const tref = useRef(null); useGsapRows(tref, pg.page + "|" + rows.length);

  // Which wallets hold a confidential account: a read of the chain, no signature, a few at a time
  // and kept once read (there may be any number of them).
  useEffect(() => {
    if (!unread.length) return;
    let current = true;
    const batch = unread.slice(0, STATUS_CHUNK);
    import("@/lib/zk/wallet")
      .then(({ confidentialAccounts }) => confidentialAccounts(config, batch))
      .then((s) => { if (current) setStatus((prev) => ({ ...prev, ...s })); })
      .catch(() => { if (current) setStatus((prev) => ({ ...prev, ...Object.fromEntries(batch.map((a) => [a, null])) })); });
    return () => { current = false; };
  }, [unread.slice(0, STATUS_CHUNK).join(","), config.token.contractId]);
  useEffect(() => { onRegistered?.(accounts === null || checking ? null : privateAccounts.map((w) => w.address)); }, [status, addresses, checking]);
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
    const w = all.find((x) => x.address === address);
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
    if (e instanceof KeyDerivationError) return fmt(za.keyFailed, { wallet: nameOf(address) });
    if (/tx_?too_?late|txTooLate/i.test(e instanceof Error ? e.message : "")) return z.sign.expired;
    return e instanceof Error ? e.message : String(e);
  };
  const DONE: Partial<Record<Action, string>> = { merge: za.mergeOk, deposit: za.depositOk, withdraw: za.withdrawOk };

  /* Each signature the wallet needs opens the signing dialog (closing the account's detail) and
     waits for it; cancelling it ends the action quietly. */
  const requestSignature = (request: SignRequest) => new Promise<string>((resolve, reject) => {
    setDetail(null);
    setSigning({ request, resolve, reject });
  });

  /* Runs one action for `address`: its key from the account's signature (or this tab's), the
     action, then the balances read again. `before` runs ahead of any signature; with `report`
     false a failure is only returned (the add dialog shows it), not shown under the table. */
  const run = async (name: Action, address: string, action: (w: ZkWallet) => Promise<unknown>, opts: { before?: () => Promise<void>; report?: boolean } = {}): Promise<Outcome> => {
    if (busy) return null;
    setBusy({ action: name, address });
    setError(null);
    try {
      await opts.before?.();
      if (wallet.current && wallet.current.address !== address) {
        await wallet.current.destroy();
        wallet.current = null;
      }
      if (!wallet.current) {
        const [{ ZkWallet }, { XdrSigner }] = await Promise.all([import("@/lib/zk/wallet"), import("@/lib/zk/xdr-signer")]);
        // The customer's signed key transaction only: no wallet opens here.
        const signer = new XdrSigner(address, config.networkPassphrase, requestSignature);
        wallet.current = await ZkWallet.connect(config, signer, setPhase, ["transaction"]);
      }
      await action(wallet.current);
      setPhase("waiting");
      const b = await wallet.current.balances();
      setBalances(b);
      setOpen(address);
      setStatus((s) => ({ ...s, [address]: b.registered }));
      if (DONE[name]) showToast(DONE[name]!);
      return true;
    } catch (e) {
      const said = await problem(e, address);
      if (opts.report !== false) setError(said);
      return said;
    } finally {
      setBusy(null);
      setPhase(null);
    }
  };

  /* The add dialog's work. An account already on the token is a private account already (one per
     Stellar account on the token; it may have been registered elsewhere, with another key root):
     it is added with nothing to sign. Otherwise the account must exist on the network (the
     register transaction is its own), then the key signature and the registration. Resolves with
     whether it was created now (false: it was already registered) or what went wrong. */
  const createAccount = async (address: string): Promise<{ created: boolean } | string | null> => {
    if (busy) return null;
    setBusy({ action: "create", address });
    let onToken: boolean | null = null;
    try {
      const { confidentialAccounts } = await import("@/lib/zk/wallet");
      onToken = (await confidentialAccounts(config, [address]))[address] ?? null;
    } catch {
      onToken = null; // unread: the signatures' flow reads it again
    } finally {
      setBusy(null);
    }
    if (onToken) {
      setStatus((s) => ({ ...s, [address]: true }));
      return { created: false };
    }
    let created = false;
    const outcome = await run("create", address, async (x) => {
      if (await x.isRegistered()) return;
      await x.register(setPhase);
      created = true;
    }, {
      report: false,
      before: async () => {
        const { accountExists } = await import("@/lib/zk/wallet");
        if (!(await accountExists(config, address))) throw new Error(fmt(za.notFunded, { network: `${networkName("stellar")} ${config.network === "public" ? "Mainnet" : "Testnet"}` }));
      },
    });
    return outcome === true ? { created } : outcome;
  };

  const provable = canProve();
  const working = busy ? (phase ? za.phases[phase] : za.working) : null;
  const received = (address: string) => (payments ? payments.filter((p) => p.recipient === address).length : null);
  const loadedFor = (address: string) => (open === address && balances?.registered ? balances : null);
  const copy = (address: string) => navigator.clipboard?.writeText(address).then(() => showToast(t.toasts.copied)).catch(() => {});
  const amountDialog = (kind: "deposit" | "withdraw") => { setDetail(null); setDialog(kind); };
  const explorer = (address: string) => explorerAccountUrl("stellar", config.network === "public" ? "public" : "testnet", address);
  /* Removes the wallet from its customer, as the customer's detail does, so the row leaves the
     table, once confirmed (as every delete is). The confidential account and its balance stay the
     customer's on-chain: nothing moves. */
  const confirmRemove = () => {
    const w = toRemove;
    if (!w || removing) return;
    setRemoving(true);
    custApi.removeWallet(w.customerId, w.walletId, env, orgId)
      .then(async () => {
        if (wallet.current?.address === w.address) { await wallet.current.destroy(); wallet.current = null; }
        if (open === w.address) { setOpen(null); setBalances(null); }
        setDetail(null);
        setToRemove(null);
        showToast(za.removed);
        onChanged?.();
      })
      .catch((e) => showToast((e && e.message) || za.remove, "error"))
      .finally(() => setRemoving(false));
  };
  const askRemove = (w: PrivateAccount) => { setDetail(null); setToRemove(w); };

  /* What an account offers: its balances, read with the customer's signature, then, once they are
     on screen, moving incoming funds, a deposit and a withdrawal. */
  const actionsFor = (address: string) => {
    const loaded = loadedFor(address);
    const view = () => run("open", address, async () => {});
    return {
      loaded,
      view,
      primary: !loaded ? { label: za.viewBalances, icon: DI.balances, dark: true, disabled: !!busy, onClick: view } : null,
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

  const preview = (w: PrivateAccount) => () => (
    <PreviewCard
      label={za.tableHead.customer} title={w.address}
      headline={<><b>{w.customerName}</b><span className="hub-st-t ok">{za.registered}</span></>}
      fields={[[za.tableHead.wallet, w.label || networkName("stellar")], [za.tableHead.address, shortAddress(w.address)], [za.tableHead.payments, String(received(w.address) ?? "-")], [za.tableHead.added, fmtDateTime(w.createdAt)]]}
    />
  );
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
  /* A balance, or the button that asks for the customer's signature to read it. */
  const balanceCell = (address: string, which: "spendable" | "receiving", label: string) => {
    const a = actionsFor(address);
    if (a.loaded) return `${fromUnits(a.loaded[which])} ${sym}`;
    return <button type="button" className="link-btn" aria-label={`${za.viewBalances}: ${nameOf(address)} (${label})`} onClick={(e) => { e.stopPropagation(); a.view(); }} disabled={!!busy}>{za.viewBalances}</button>;
  };
  // A row is a wallet of a customer (two customers may name the same address): kept by its id.
  const opened = detail ? privateAccounts.find((w) => w.walletId === detail) : null;

  // The progress of the running action is a line of its own under its row: one row fewer of filler.
  const workingOnPage = !adding && pg.slice.some((w) => progress(w.address));
  const loading = accounts === null || checking;

  return (
    <section className="hub-section zka" aria-labelledby="zka-title" aria-busy={busy || loading ? true : undefined}>
      {/* A second list on the page: its heading, then the filter bar and the table, as the
          overview's transactions are. */}
      <div className="hub-section-head"><h2 id="zka-title">{za.title}</h2></div>
      <FilterBar
        label={fl.label}
        query={filters.accq} onQuery={(v) => set("accq", v)} placeholder={za.searchPlaceholder}
        date={filters.accdate} onDate={(v) => set("accdate", v)}
        shown={rows.length} total={loading ? undefined : privateAccounts.length} active={active} onReset={reset} loading={loading}
        actions={canAdd && <button type="button" className="btn btn-dark btn-sm" onClick={() => setAdding(true)} disabled={!provable || !!busy}>{DI.plus} {za.add}</button>}
      />

      {!provable && <p className="field-err zka-note" role="alert">{z.cannotProve}</p>}
      {!loading && unchecked.length > 0 && (
        <p className="field-help zka-note" role="status">
          {fmt(za.unchecked, { n: unchecked.length })}{" "}
          <button type="button" className="link-btn" onClick={() => setStatus((s) => Object.fromEntries(Object.entries(s).filter(([, v]) => v !== null)))}>{za.checkAgain}</button>
        </p>
      )}

      <div className="panel">
        {loading && <TableSkeleton label={za.title} cols={COLS} />}
        {!loading && (
          <div className="t-scroll" tabIndex={0} ref={tref}><table className="tx">
            <thead><tr><th>{za.tableHead.customer}</th><th>{za.tableHead.address}</th><th>{za.spendable}</th><th>{za.receiving}</th><th>{za.tableHead.payments}</th><th>{za.tableHead.added}</th><th><span className="sr-only">{t.dash.common.actions}</span></th></tr></thead>
            <tbody>
              {!loadError && pg.slice.map((w) => {
                const a = actionsFor(w.address);
                const work = adding ? null : progress(w.address);
                const url = explorer(w.address);
                const name = w.label ? `${w.customerName} (${w.label})` : w.customerName;
                return [
                  <tr key={w.walletId} className="row-click" onClick={() => setDetail(w.walletId)}>
                    {/* The customer opens the account and previews it on hover; the copy is its address. */}
                    <td className="tid">
                      <span className="cell-mark">
                        <NetworkMark chain="stellar" size={24} />
                        <span>
                          <RecordLink onOpen={() => setDetail(w.walletId)} copy={w.address} preview={preview(w)} title={w.address}>{w.customerName}</RecordLink>
                          {w.label && <small className="cust-wallet-net">{w.label}</small>}
                        </span>
                      </span>
                    </td>
                    <td className="cust" onClick={(e) => e.stopPropagation()}><AddressLink chain="stellar" network={config.network} address={w.address} label={za.tableHead.address} /></td>
                    <td className="amt">{balanceCell(w.address, "spendable", za.spendable)}</td>
                    <td className="amt">{a.loaded ? `${fromUnits(a.loaded.receiving)} ${sym}` : "-"}</td>
                    <td className="cust">{paymentsCell(w.address)}</td>
                    <td className="cust">{fmtDateTime(w.createdAt)}</td>
                    <td className="row-actions" onClick={(e) => e.stopPropagation()}>
                      <button type="button" className="icon-mini" title={t.dash.common.details} aria-label={`${t.dash.common.details}: ${name}`} onClick={() => setDetail(w.walletId)}>{DI.docs}</button>
                      {a.primary
                        ? <button type="button" className="icon-mini" title={a.primary.label} aria-label={`${a.primary.label}: ${name}`} onClick={a.primary.onClick} disabled={a.primary.disabled}>{a.primary.icon}</button>
                        : <button type="button" className="icon-mini" title={za.refresh} aria-label={`${za.refresh}: ${name}`} onClick={() => run("refresh", w.address, async () => {})} disabled={!!busy}>{DI.refresh}</button>}
                      <a className="icon-mini" href={url} target="_blank" rel="noopener noreferrer" title={t.dash.balances.explorer} aria-label={`${t.dash.balances.explorer}: ${name}`}>{DI.network}</a>
                      {canRemove && <button type="button" className="icon-mini danger" title={za.remove} aria-label={`${za.remove}: ${name}`} onClick={() => askRemove(w)} disabled={busy?.address === w.address}>{DI.trash}</button>}
                      <RowMenu
                        label={fmt(t.dash.common.rowActions, { name })}
                        items={[
                          { key: "open", label: t.dash.common.details, icon: DI.docs, onClick: () => setDetail(w.walletId) },
                          ...(a.primary ? [{ key: "primary", label: a.primary.label, icon: a.primary.icon, disabled: a.primary.disabled, onClick: a.primary.onClick }] : []),
                          ...a.more,
                          { key: "payments", label: za.paymentsTo, icon: DI.payments, disabled: !received(w.address), hint: za.noPaymentsYet, onClick: () => onShowPayments?.(w.address) },
                          { key: "copy", label: t.dash.common.copyAccount, icon: <IcCopy />, onClick: () => copy(w.address) },
                          { key: "explorer", label: t.dash.balances.explorer, icon: DI.network, href: url, external: true },
                          ...(canRemove ? [{ key: "delete", label: za.remove, icon: DI.trash, danger: true, disabled: busy?.address === w.address, onClick: () => askRemove(w) }] : []),
                        ]}
                      />
                    </td>
                  </tr>,
                  work && <tr key={`${w.walletId}:work`} className="zka-work"><td colSpan={COLS}>{work}</td></tr>,
                ];
              })}
              <FillRows
                n={pg.size - (loadError ? 0 : pg.count) - (workingOnPage ? 1 : 0)} cols={COLS}
                empty={loadError ? za.loadError : null}
              />
            </tbody>
          </table></div>
        )}
        {!loading && <Pagination {...pg} />}
      </div>
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
                  [za.spendable, a.loaded ? `${fromUnits(a.loaded.spendable)} ${sym}` : za.balancesHidden],
                  ...(a.loaded ? [[za.receiving, `${fromUnits(a.loaded.receiving)} ${sym}`]] : []),
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
                {canRemove && <button type="button" className="btn btn-soft danger-soft btn-sm" onClick={() => askRemove(opened)} disabled={busy?.address === opened.address}>{DI.trash} {za.remove}</button>}
              </div>
            </div>
          </Modal>
        );
      })()}

      {toRemove && (
        <ConfirmModal
          title={za.removeTitle} body={fmt(za.removeBody, { account: shortAddress(toRemove.address), customer: toRemove.customerName })}
          confirmLabel={za.remove} cancelLabel={t.dash.common.cancel}
          onConfirm={confirmRemove} onClose={() => { if (!removing) setToRemove(null); }}
        />
      )}

      {adding && (
        <AddPrivateAccountModal
          customers={customers} env={env} orgId={orgId}
          wallets={all.filter((w) => status[w.address] === false)}
          privateAccounts={privateAccounts}
          busy={!!busy} progress={working ? progress(busy!.address) : null}
          onCreate={createAccount}
          onClose={() => setAdding(false)}
          onAdded={(created) => { setAdding(false); showToast(created ? za.createdOk : za.added); onChanged?.(); }}
        />
      )}

      {signing && (
        <ZkSignDialog
          key={signing.request.xdr}
          request={signing.request}
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

/* "Add private account", in two steps like every long form (product owner, 2026-10-27), copied
   from "add customer" (CustomerFormModal): the account (a customer already there or a new one, and
   one of the customer's Stellar wallets or a new address), then the customer's signatures that
   create it on Cosmos Pay's token. The wallet is saved to the customer only once the token has it,
   so nothing public is ever listed as a private account. The dialog stays open (and cannot be
   closed) while the signatures and the proof run; each signature opens over it. */
const NEW_CUSTOMER = "__new";
const OTHER_ADDRESS = "__other";
function AddPrivateAccountModal({ customers, env, orgId, wallets, privateAccounts, busy, progress, onCreate, onClose, onAdded }: {
  customers: PanelCustomer[] | null;
  env: string;
  orgId: string;
  /* The customers' Stellar wallets that hold no confidential account yet. */
  wallets: PrivateAccount[];
  privateAccounts: PrivateAccount[];
  busy: boolean;
  progress: ReactNode;
  onCreate: (address: string) => Promise<{ created: boolean } | string | null>;
  onClose: () => void;
  onAdded: (created: boolean) => void;
}) {
  const t = useT();
  const za = t.zk.account;
  const [customer, setCustomer] = useState(NEW_CUSTOMER);
  const [name, setName] = useState("");
  const [picked, setPicked] = useState("");
  const [address, setAddress] = useState("");
  const [label, setLabel] = useState("");
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const steps = useFormSteps(2);
  // The customer's Stellar wallets not on the token yet: one of them, else a new address.
  const own = customer === NEW_CUSTOMER ? [] : wallets.filter((w) => w.customerId === customer);
  const choice = own.some((w) => w.walletId === picked) || picked === OTHER_ADDRESS ? picked : own[0]?.walletId || OTHER_ADDRESS;
  const existing = own.find((w) => w.walletId === choice) || null;
  const account = existing ? existing.address : address.trim();
  const valid = StrKey.isValidEd25519PublicKey(account);
  const already = customer !== NEW_CUSTOMER && privateAccounts.some((w) => w.customerId === customer && w.address === account);
  const accountOk = valid && !already && (customer !== NEW_CUSTOMER || name.trim() !== "");
  const working = busy || saving;

  const submit = async () => {
    if (!accountOk || working) return;
    setProblem(null);
    const outcome = await onCreate(account);
    if (outcome === null || typeof outcome === "string") { setProblem(outcome); return; }
    // On the token now: the wallet joins the customer (unless it already was one of theirs).
    if (existing) { onAdded(outcome.created); return; }
    setSaving(true);
    const wallet = { chain: "stellar", address: account, ...(label.trim() ? { label: label.trim() } : {}) };
    try {
      await (customer === NEW_CUSTOMER ? custApi.create(env, orgId, { name: name.trim(), wallets: [wallet] }) : custApi.addWallet(customer, env, orgId, wallet));
      onAdded(outcome.created);
    } catch (e) {
      setProblem(fmt(za.notSaved, { error: (e && (e as Error).message) || za.add }));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal onClose={() => { if (!working) onClose(); }} label={za.add}>
      <div className="modal-body">
        <div className="modal-eyebrow">{za.title}</div>
        <h3>{za.add}</h3>
        <FormSteps names={[za.steps.account, za.steps.sign]} steps={steps} />
        <FormStep steps={steps}>
          {steps.step === 0 && (<>
            <div className="fld">
              <span className="field-l" id="zka-customer-l">{za.tableHead.customer}</span>
              <Select labelledBy="zka-customer-l" value={customer} onChange={(v) => { setCustomer(v); setPicked(""); }} options={[{ value: NEW_CUSTOMER, label: za.newCustomer }, ...(customers || []).map((c) => ({ value: c.id, label: c.name }))]} />
            </div>
            {customer === NEW_CUSTOMER && <Field label={za.customerName} value={name} onChange={(e) => setName(e.target.value)} placeholder={t.dash.examples.customerName} maxLength={120} autoFocus />}
            {own.length > 0 && (
              <div className="fld">
                <span className="field-l" id="zka-wallet-l">{za.customerWallet}</span>
                <Select labelledBy="zka-wallet-l" value={choice} onChange={setPicked} options={[...own.map((w) => ({ value: w.walletId, label: w.label ? `${w.label} (${shortAddress(w.address)})` : shortAddress(w.address) })), { value: OTHER_ADDRESS, label: za.otherAddress }]} />
              </div>
            )}
            {!existing && (<>
              <Field label={t.dash.wallets.address} value={address} onChange={(e) => setAddress(e.target.value)} placeholder={t.dash.wallets.addressPlaceholder} spellCheck={false} autoComplete="off" aria-invalid={address.trim() !== "" && !valid ? true : undefined} />
              {address.trim() !== "" && !valid && <p className="field-err" role="alert">{t.dash.wallets.invalidAddress}</p>}
              <Field label={za.walletLabel} hint={t.dash.common.optional} value={label} onChange={(e) => setLabel(e.target.value)} placeholder={t.dash.wallets.labelPlaceholder} maxLength={60} />
            </>)}
            {already && <p className="field-err" role="alert">{za.alreadyAdded}</p>}
          </>)}
          {steps.step === 1 && (<>
            <div className="paylink-fields" style={{ marginBottom: 14 }}>
              <div className="paylink-field"><span className="pf-k">{za.tableHead.customer}</span><span className="pf-v">{customer === NEW_CUSTOMER ? name.trim() : customers?.find((c) => c.id === customer)?.name}</span></div>
              <div className="paylink-field"><span className="pf-k">{za.tableHead.address}</span><span className="pf-v">{shortAddress(account)}</span></div>
            </div>
            <p className="field-note">{za.signIntro}</p>
            <ol className="zka-sign-steps">
              <li>{za.signKey}</li>
              <li>{za.signProof}</li>
              <li>{za.signRegister}</li>
            </ol>
            {progress}
          </>)}
        </FormStep>
        {problem && <p className="field-err" role="alert">{problem}</p>}
        <FormStepsFooter
          steps={steps} canNext={accountOk} onCancel={onClose}
          submitLabel={working ? za.creating : za.requestSignatures} onSubmit={submit} busy={working} submitDisabled={!accountOk}
        />
      </div>
    </Modal>
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
