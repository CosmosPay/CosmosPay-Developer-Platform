/* The private accounts, the Private accounts view's table (product owner, 2026-10-27: private
   payments and private accounts are views of their own; the same table format as every list),
   after its figures (accounts and sub-accounts, the customers holding them, the private payments
   they received). A private account is a customer's Stellar
   wallet that holds a confidential account on Cosmos Pay's token (product owner, 2026-10-27: they
   are customers' wallets, as many as there are; the organization's own wallets take its fees; an
   account that is not on the token's contract is a public wallet, not a private account). So the
   table lists only the customers' Stellar wallets the chain says are registered on the token (read
   with no signature, a few at a time, before the table shows); a customer's other Stellar wallets
   stay in Customers. Each row has its customer, its balances (read only with the customer's
   signature), how many private payments it received (which opens Private payments filtered to it)
   and when it was added. It is a list like every other (product owner, 2026-10-27): the filter bar
   (search, date, its own URL keys), the table with the customer as the link that opens and
   previews the account, the row's icon actions and its menu, filler rows and pages.

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
   payments, and only its balances do not open here. More than one private account per address
   (product owner, 2026-10-27): for an address that already has its own, the dialog creates a
   sub-account (src/lib/zk/sub-accounts.ts), a new Stellar account funded by the address and whose
   only signer is the address, and registers it; the customer signs its creation, its key
   transaction and its register with the address's wallet. The table marks a sub-account with its
   address, read from the chain (its signers), never stored. Nothing connects or opens a wallet (product owner,
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
import { fmt, fmtNodes, useLang, useT } from "@/lib/i18n/index";
import { IcCheck, IcCopy } from "@/components/cosmos/icons";
import { DI } from "@/components/cosmos/dashboard/icons";
import { Sk, TableSkeleton } from "@/components/cosmos/dashboard/components/Skeleton";
import { RowMenu } from "@/components/cosmos/dashboard/components/RowMenu";
import { FillRows } from "@/components/cosmos/dashboard/components/FillRows";
import { Pagination } from "@/components/cosmos/dashboard/components/Pagination";
import { AddressLink, TxLink } from "@/components/cosmos/dashboard/components/AddressLink";
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
import { ViewFigures, countText } from "@/components/cosmos/dashboard/components/ActivityPanel";
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
import { BulkActions, SelectCell, SelectHead, useBulkDelete, useSelection } from "@/components/cosmos/dashboard/components/BulkSelect";
import { SUB_ACCOUNT_STARTING_BALANCE } from "@/lib/zk/sub-accounts";

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

/* Every customer and their Stellar wallets, page after page (the API serves 100 at a time): the
   private accounts are customers' wallets, with no limit on how many. Both private views read it. */
export function useCustomerAccounts(env: string) {
  const [state, setState] = useState<{ customers: PanelCustomer[] | null; accounts: PrivateAccount[] | null; error: boolean }>({ customers: null, accounts: null, error: false });
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let alive = true;
    (async () => {
      const all: any[] = [];
      for (let skip = 0; ; skip += 100) {
        const page = await custApi.list(env, { take: 100, skip });
        const rows = Array.isArray(page?.data) ? page.data : [];
        all.push(...rows);
        if (rows.length < 100 || all.length >= (page?.total ?? all.length)) break;
      }
      if (!alive) return;
      const name = (c) => c.alias || c.name;
      setState({
        customers: all.map((c) => ({ id: c.id, name: name(c) })),
        accounts: all.flatMap((c) => (c.wallets || []).filter((w) => w.chain === "stellar").map((w) => ({ walletId: w.id, address: w.address, label: w.label, customerId: c.id, customerName: name(c), createdAt: w.createdAt }))),
        error: false,
      });
    })().catch(() => { if (alive) setState({ customers: [], accounts: [], error: true }); });
    return () => { alive = false; };
  }, [env, tick]);
  return { ...state, reload: () => setTick((n) => n + 1) };
}

/* The private accounts' addresses: which customers' Stellar wallets are registered on the token,
   read from the chain with no signature, a few at a time (null until every wallet was read). What
   a private payment may be sent to, outside the accounts' own table. */
export function useRegisteredAccounts(config: ZkNetworkConfig | null, accounts: PrivateAccount[] | null): string[] | null {
  const [status, setStatus] = useState<Record<string, boolean | null>>({});
  const unread = config && accounts ? [...new Set(accounts.map((w) => w.address).filter((a) => !(a in status)))] : [];
  useEffect(() => {
    if (!config || !unread.length) return;
    let current = true;
    const batch = unread.slice(0, STATUS_CHUNK);
    import("@/lib/zk/wallet")
      .then(({ confidentialAccounts }) => confidentialAccounts(config, batch))
      .then((s) => { if (current) setStatus((prev) => ({ ...prev, ...s })); })
      .catch(() => { if (current) setStatus((prev) => ({ ...prev, ...Object.fromEntries(batch.map((a) => [a, null])) })); });
    return () => { current = false; };
  }, [unread.slice(0, STATUS_CHUNK).join(","), config?.token.contractId]);
  if (!config || !accounts || unread.length) return null;
  return [...new Set(accounts.map((w) => w.address).filter((a) => status[a] === true))];
}

const clock = (ms: number) => {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

export function ZkAccountPanel({ config, orgId, env, accounts, loadError = false, customers, canAdd = false, canRemove = false, onChanged, payments = null, onShowPayments }: {
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
  /* The organization's private payments, to count each account's; null while they load. */
  payments?: { recipient?: string | null; status?: string }[] | null;
  /* Opens the private payments filtered to one account. */
  onShowPayments?: (address: string) => void;
}) {
  const t = useT();
  const lang = useLang();
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
  // When each opened account registered on the token (undefined while read, null when unknown).
  const [created, setCreated] = useState<Record<string, { txHash: string; at: string } | null>>({});
  // The sub-accounts among the private accounts: each one's address (its only signer), from the chain.
  const [controllers, setControllers] = useState<Record<string, string>>({});
  // The signature the running action waits for, and how to hand it back.
  const [signing, setSigning] = useState<{ request: SignRequest; resolve: (xdr: string) => void; reject: (e: Error) => void } | null>(null);
  const [startedAt, setStartedAt] = useState(0);
  const [now, setNow] = useState(0);
  const wallet = useRef<ZkWallet | null>(null);
  const sym = config.token.symbol;
  const fl = t.dash.filters;
  const { filters, set, reset, active } = useListFilters(DEFAULTS);
  const all = accounts || [];
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
      .then(async (s) => {
        const registered = batch.filter((a) => s[a] === true);
        const c = registered.length
          ? await import("@/lib/zk/sub-accounts").then(({ controllersOf }) => controllersOf(config.rpcUrl, registered)).catch(() => ({}))
          : {};
        if (current) { setControllers((prev) => ({ ...prev, ...c })); setStatus((prev) => ({ ...prev, ...s })); }
      })
      .catch(() => { if (current) setStatus((prev) => ({ ...prev, ...Object.fromEntries(batch.map((a) => [a, null])) })); });
    return () => { current = false; };
  }, [unread.slice(0, STATUS_CHUNK).join(","), config.token.contractId]);
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
  const run = async (name: Action, address: string, action: (w: ZkWallet) => Promise<unknown>, opts: { before?: () => Promise<void>; report?: boolean; signerKey?: string } = {}): Promise<Outcome> => {
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
        // The customer's signed key transaction only: no wallet opens here. A sub-account's
        // transactions are signed by its address.
        const signer = new XdrSigner(address, config.networkPassphrase, requestSignature, opts.signerKey ?? controllers[address] ?? address);
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

  /* Another private account for `base`, which already has its own: a sub-account, created and
     funded by the base (whose wallet signs its creation), then registered with the base's
     signatures. Its own key signs its signer change, here, and is dropped. Resolves with its
     address or what went wrong. */
  const createSubAccount = async (base: string): Promise<{ address: string } | string | null> => {
    const [{ Keypair, rpc }, sub, { expiryOf, signatureOn }, { accountExists }] = await Promise.all([
      import("@stellar/stellar-sdk"), import("@/lib/zk/sub-accounts"), import("@/lib/zk/xdr-signer"), import("@/lib/zk/wallet"),
    ]);
    const key = Keypair.random();
    const address = key.publicKey();
    const outcome = await run("create", address, (x) => x.register(setPhase), {
      report: false,
      signerKey: base,
      before: async () => {
        if (!(await accountExists(config, base))) throw new Error(fmt(za.notFunded, { network: `${networkName("stellar")} ${config.network === "public" ? "Mainnet" : "Testnet"}` }));
        const source = await new rpc.Server(config.rpcUrl, { allowHttp: config.rpcUrl.startsWith("http://") }).getAccount(base);
        const xdr = sub.subAccountTransaction(base, source.sequenceNumber(), address, config.networkPassphrase);
        const signed = await requestSignature({ purpose: "subAccount", xdr, account: base, networkPassphrase: config.networkPassphrase, expiresAt: expiryOf(xdr, config.networkPassphrase) });
        if (!signatureOn(xdr, signed, base, config.networkPassphrase).ok) throw new Error(z.sign.notSigned.replace("{account}", shortAddress(base)));
        setPhase("waiting");
        try {
          await sub.submitSubAccount(config.rpcUrl, config.networkPassphrase, signed, key);
        } catch (e) {
          const why = e instanceof Error ? e.message : String(e);
          throw new Error(/underfunded|low_?reserve/i.test(why) ? fmt(za.subUnderfunded, { amount: SUB_ACCOUNT_STARTING_BALANCE }) : fmt(za.subFailed, { error: why }));
        }
        setControllers((c) => ({ ...c, [address]: base }));
      },
    });
    return outcome === true ? { address } : outcome;
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
  // Several at a time (product owner, 2026-10-27): removed from their customers, as one is.
  const accountName = (w: PrivateAccount) => (w.label ? `${w.customerName} (${w.label})` : w.customerName);
  const sel = useSelection(canRemove ? rows.map((w) => w.walletId) : []);
  const bulk = useBulkDelete({
    sel, nameOf: (id) => { const w = all.find((x) => x.walletId === id); return w ? accountName(w) : id; },
    remove: (id) => { const w = all.find((x) => x.walletId === id); return w ? custApi.removeWallet(w.customerId, w.walletId, env, orgId) : Promise.reject(new Error(id)); },
    onRemoved: (ids) => {
      const gone = all.filter((w) => ids.includes(w.walletId)).map((w) => w.address);
      if (open && gone.includes(open)) { void wallet.current?.destroy(); wallet.current = null; setOpen(null); setBalances(null); }
      onChanged?.();
    },
  });
  const cols = COLS + (canRemove ? 1 : 0);

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
  useEffect(() => {
    const address = opened?.address;
    if (!address || address in created) return;
    let current = true;
    import("@/lib/zk/wallet")
      .then(({ registrationOf }) => registrationOf(config, address))
      .catch(() => null)
      .then((r) => { if (current) setCreated((c) => ({ ...c, [address]: r })); });
    return () => { current = false; };
  }, [opened?.address]);
  const tier = config.network === "public" ? "public" : "testnet";
  /* When the private account was created on the contract, with its transaction. */
  const createdCell = (address: string) => {
    if (!(address in created)) return <Sk w="9em" />;
    const r = created[address];
    if (!r) return "-";
    return <>{fmtNodes(za.createdAt, { date: fmtDateTime(r.at), tx: <TxLink chain="stellar" network={config.network} hash={r.txHash} label={za.createdOn} /> })}</>;
  };

  // The progress of the running action is a line of its own under its row: one row fewer of filler.
  const workingOnPage = !adding && pg.slice.some((w) => progress(w.address));
  const loading = accounts === null || checking;
  // The view's figures (figures first, then the table): the accounts and how many are
  // sub-accounts, the customers holding them, and the private payments they received.
  const num = new Intl.NumberFormat(lang);
  const h = t.dash.overview.hub;
  const own = new Set(privateAccounts.map((w) => w.address));
  const paidTo = (payments || []).filter((p) => p.recipient && own.has(p.recipient));
  const figures = [
    { key: "accounts", label: za.title, value: num.format(privateAccounts.length), sub: countText(privateAccounts.filter((w) => controllers[w.address]).length, za.figSubOne, za.figSubN, num) },
    { key: "customers", label: za.figCustomers, value: num.format(new Set(privateAccounts.map((w) => w.customerId)).size), sub: countText((customers || []).length, za.figCustomersOfOne, za.figCustomersOf, num) },
    { key: "payments", label: za.figPayments, value: num.format(paidTo.length), sub: countText(paidTo.filter((p) => p.status === "SUCCEEDED").length, h.doneOne, h.doneN, num) },
  ];

  return (
    <section className="zka" aria-label={za.title} aria-busy={busy || loading ? true : undefined}>
      <ViewFigures label={za.figLabel} items={figures} loading={loading || payments === null} failed={loadError} />
      <FilterBar
        label={fl.label}
        query={filters.accq} onQuery={(v) => set("accq", v)} placeholder={za.searchPlaceholder}
        date={filters.accdate} onDate={(v) => set("accdate", v)}
        shown={rows.length} total={loading ? undefined : privateAccounts.length} active={active} onReset={reset} loading={loading}
        actions={sel.count ? <BulkActions sel={sel} onDelete={bulk.ask} busy={bulk.busy || !!busy} /> : canAdd && <button type="button" className="btn btn-dark btn-sm" onClick={() => setAdding(true)} disabled={!provable || !!busy}>{DI.plus} {za.add}</button>}
      />

      {!provable && <p className="field-err zka-note" role="alert">{z.cannotProve}</p>}
      {!loading && unchecked.length > 0 && (
        <p className="field-help zka-note" role="status">
          {fmt(za.unchecked, { n: unchecked.length })}{" "}
          <button type="button" className="link-btn" onClick={() => setStatus((s) => Object.fromEntries(Object.entries(s).filter(([, v]) => v !== null)))}>{za.checkAgain}</button>
        </p>
      )}

      <div className="panel">
        {loading && <TableSkeleton label={za.title} cols={cols} />}
        {!loading && (
          <div className="t-scroll" tabIndex={0} ref={tref}><table className="tx">
            <thead><tr>{canRemove && <SelectHead sel={sel} pageIds={pg.slice.map((w) => w.walletId)} />}<th>{za.tableHead.customer}</th><th>{za.tableHead.address}</th><th>{za.spendable}</th><th>{za.receiving}</th><th>{za.tableHead.payments}</th><th>{za.tableHead.added}</th><th><span className="sr-only">{t.dash.common.actions}</span></th></tr></thead>
            <tbody>
              {!loadError && pg.slice.map((w) => {
                const a = actionsFor(w.address);
                const work = adding ? null : progress(w.address);
                const url = explorer(w.address);
                const name = w.label ? `${w.customerName} (${w.label})` : w.customerName;
                return [
                  <tr key={w.walletId} className="row-click" onClick={() => setDetail(w.walletId)}>
                    {canRemove && <SelectCell sel={sel} id={w.walletId} name={accountName(w)} />}
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
                    <td className="cust" onClick={(e) => e.stopPropagation()}>
                      <AddressLink chain="stellar" network={config.network} address={w.address} label={za.tableHead.address} />
                      {controllers[w.address] && <small className="cust-wallet-net">{fmtNodes(za.subOf, { base: <AddressLink chain="stellar" network={config.network} address={controllers[w.address]} label={za.signedBy} /> })}</small>}
                    </td>
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
                  work && <tr key={`${w.walletId}:work`} className="zka-work"><td colSpan={cols}>{work}</td></tr>,
                ];
              })}
              <FillRows
                n={pg.size - (loadError ? 0 : pg.count) - (workingOnPage ? 1 : 0)} cols={cols}
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
                  ...(controllers[opened.address] ? [[za.signedBy, <AddressLink key="s" chain="stellar" network={config.network} address={controllers[opened.address]} label={za.signedBy} />]] : []),
                  [za.createdOn, createdCell(opened.address)],
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

      {bulk.dialog}
      {toRemove && (
        <ConfirmModal
          title={za.removeTitle} body={fmt(za.removeBody, { account: shortAddress(toRemove.address), customer: toRemove.customerName })}
          confirmLabel={za.remove} cancelLabel={t.dash.common.cancel}
          onConfirm={confirmRemove} onClose={() => { if (!removing) setToRemove(null); }}
        />
      )}

      {adding && (
        <AddPrivateAccountModal
          config={config} customers={customers} env={env} orgId={orgId}
          wallets={all.filter((w) => status[w.address] === false)}
          privateAccounts={privateAccounts}
          busy={!!busy} progress={working ? progress(busy!.address) : null}
          onCreate={createAccount}
          onCreateSub={createSubAccount}
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
   so nothing public is ever listed as a private account. For an address that already has its
   own, it creates another one, a sub-account of the address, or adds the existing one. The dialog
   stays open (and cannot be closed) while the signatures and the proof run; each signature opens
   over it. */
const NEW_CUSTOMER = "__new";
const OTHER_ADDRESS = "__other";
function AddPrivateAccountModal({ config, customers, env, orgId, wallets, privateAccounts, busy, progress, onCreate, onCreateSub, onClose, onAdded }: {
  config: ZkNetworkConfig;
  customers: PanelCustomer[] | null;
  env: string;
  orgId: string;
  /* The customers' Stellar wallets that hold no confidential account yet. */
  wallets: PrivateAccount[];
  privateAccounts: PrivateAccount[];
  busy: boolean;
  progress: ReactNode;
  onCreate: (address: string) => Promise<{ created: boolean } | string | null>;
  onCreateSub: (base: string) => Promise<{ address: string } | string | null>;
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
  // Already one of this customer's private accounts: only another one (a sub-account) can be made.
  const already = customer !== NEW_CUSTOMER && privateAccounts.some((w) => w.customerId === customer && w.address === account);
  const accountOk = valid && (customer !== NEW_CUSTOMER || name.trim() !== "");
  const [mode, setMode] = useState<"sub" | "existing" | null>(null);
  const working = busy || saving;
  // The second step reads the contract: whether this public account already has its private
  // account (the token keeps one per Stellar account) and since when. undefined while read; null
  // registered when the read failed (the signatures' flow reads it again).
  const [onChain, setOnChain] = useState<{ address: string; registered: boolean | null; since: { txHash: string; at: string } | null } | undefined>(undefined);
  const known = onChain && onChain.address === account ? onChain : undefined;
  useEffect(() => {
    if (steps.step !== 1 || !valid || known) return;
    let current = true;
    (async () => {
      const { confidentialAccounts, registrationOf } = await import("@/lib/zk/wallet");
      const registered = await confidentialAccounts(config, [account]).then((r) => r[account] ?? null, () => null);
      const since = registered ? await registrationOf(config, account).catch(() => null) : null;
      if (current) setOnChain({ address: account, registered, since });
    })();
    return () => { current = false; };
  }, [steps.step, account]);
  const exists = known?.registered === true;
  const another = exists && (already || mode === "sub");
  const decided = !exists || already || mode !== null;
  // Who signs every transaction: the address, for its own private account and for a sub-account.
  const signer = <AddressLink chain="stellar" network={config.network} address={account} label={za.signedBy} />;
  const sigs: { title: string; who: ReactNode }[] = known && (another || !exists) ? [
    ...(another ? [{ title: fmt(za.sigSub, { amount: SUB_ACCOUNT_STARTING_BALANCE }), who: signer }] : []),
    { title: za.sigKey, who: signer },
    { title: za.sigProof, who: za.sigHere },
    { title: za.sigRegister, who: signer },
  ] : [];

  const submit = async () => {
    if (!accountOk || working || !decided) return;
    setProblem(null);
    if (another) {
      // A sub-account: its own address joins the customer (the table names its address from the chain).
      const made = await onCreateSub(account);
      if (made === null || typeof made === "string") { setProblem(made); return; }
      await save({ chain: "stellar", address: made.address, ...(label.trim() ? { label: label.trim() } : {}) }, true);
      return;
    }
    const outcome = await onCreate(account);
    if (outcome === null || typeof outcome === "string") { setProblem(outcome); return; }
    // On the token now: the wallet joins the customer (unless it already was one of theirs).
    if (existing) { onAdded(outcome.created); return; }
    await save({ chain: "stellar", address: account, ...(label.trim() ? { label: label.trim() } : {}) }, outcome.created);
  };
  const save = async (wallet: { chain: string; address: string; label?: string }, created: boolean) => {
    setSaving(true);
    try {
      await (customer === NEW_CUSTOMER ? custApi.create(env, orgId, { name: name.trim(), wallets: [wallet] }) : custApi.addWallet(customer, env, orgId, wallet));
      onAdded(created);
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
          </>)}
          {steps.step === 1 && (<>
            <div className="paylink-fields" style={{ marginBottom: 14 }}>
              <div className="paylink-field"><span className="pf-k">{za.tableHead.customer}</span><span className="pf-v">{customer === NEW_CUSTOMER ? name.trim() : customers?.find((c) => c.id === customer)?.name}</span></div>
              <div className="paylink-field"><span className="pf-k">{za.tableHead.address}</span><span className="pf-v"><AddressLink chain="stellar" network={config.network} address={account} label={za.tableHead.address} /></span></div>
            </div>
            {!known && <p className="work-progress" role="status"><span className="work-spin" aria-hidden="true" /><span>{za.checking}</span></p>}
            {/* The address already has its private account: a warning with the choice. */}
            {exists && (
              <div className="zka-exists" role="group" aria-labelledby="zka-exists-t">
                <div className="zka-exists-head">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9.5" /><path d="M12 7.5v5.5M12 16.4v.1" /></svg>
                  <b id="zka-exists-t">{already ? za.existsHereTitle : za.existsTitle}</b>
                </div>
                {known?.since && (
                  <p className="zka-exists-meta">
                    {fmtNodes(za.createdAt, { date: fmtDateTime(known.since.at), tx: <TxLink chain="stellar" network={config.network} hash={known.since.txHash} label={za.createdOn} /> })}
                  </p>
                )}
                {!already && (
                  <div className="zka-choices" role="radiogroup" aria-labelledby="zka-exists-t">
                    {(["existing", "sub"] as const).map((k) => (
                      <button key={k} type="button" role="radio" aria-checked={mode === k} className={`zka-choice${mode === k ? " on" : ""}`} onClick={() => setMode(k)} disabled={working}>
                        <span className="zka-choice-mark" aria-hidden="true">{mode === k && <IcCheck />}</span>
                        <span>
                          <b>{k === "sub" ? za.modeSub : za.modeExisting}</b>
                          <span className="zka-choice-d">{k === "sub" ? fmt(za.modeSubDesc, { amount: SUB_ACCOUNT_STARTING_BALANCE }) : za.modeExistingDesc}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            {/* What the address signs, in order: every signature is the address's, with its own wallet. */}
            {sigs.length > 0 && (
              <ol className="zka-sigs" aria-label={za.sigsLabel}>
                {sigs.map((g, i) => (
                  <li key={g.title}>
                    <span className="fstep-n" aria-hidden="true">{i + 1}</span>
                    <span className="zka-sig-t">{g.title}</span>
                    <span className="zka-sig-who">{typeof g.who === "string" ? g.who : <>{za.sigBy} {g.who}</>}</span>
                  </li>
                ))}
              </ol>
            )}
            {progress}
          </>)}
        </FormStep>
        {problem && <p className="field-err" role="alert">{problem}</p>}
        <FormStepsFooter
          steps={steps} canNext={accountOk} onCancel={onClose}
          submitLabel={working ? za.creating : exists && mode === "existing" && !already ? za.addExisting : za.requestSignatures} onSubmit={submit} busy={working} submitDisabled={!accountOk || !known || !decided}
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
