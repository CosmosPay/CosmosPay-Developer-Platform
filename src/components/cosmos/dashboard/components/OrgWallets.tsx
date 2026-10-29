/* The organization's receiving wallets in the dashboard (product owner: connected in Settings, so
   nobody asks people to connect a wallet from the payments views, and members without the
   permission can neither remove one nor pick an address outside the list).
   - useOrgWallets: the list, read again whenever any of these components changes it.
   - ConnectWalletForm: network, then, on Stellar, the address, an optional name and the proof as a
     signed XDR (product owner, 2026-10-27: people hand over a signed XDR, not their wallet):
     Freighter in one click, or the proof transaction (src/lib/wallets/wallet-proof-xdr.ts) signed
     in any wallet and pasted back, the way a swap is signed; on Solana and Monad the wallet shares
     its address and signs the proof message (src/lib/wallets/prove.ts). The API checks the proof
     and stores the wallet. Used in Settings' dialog, inline inside a payment form (never a dialog
     on top of a dialog) and in the private accounts table.
   - OrgWalletsSection: Settings' list, the Payments table (a row opens its detail), with connect /
     rename / remove for whoever may.
   - WalletSelect: the receiving address of a payment form, chosen from the organization's
     wallets on that network; "connect another" opens the form inline for whoever may. */
import { useEffect, useMemo, useState } from "react";
import { ConfirmModal, Modal, showToast } from "@/components/cosmos/shared";
import { fmt, useT } from "@/lib/i18n/index";
import { organizations as orgsApi } from "@/lib/api-client";
import { DI } from "@/components/cosmos/dashboard/icons";
import { IcCopy } from "@/components/cosmos/icons";
import { Field } from "@/components/cosmos/dashboard/components/Field";
import { FormSteps, FormStep, FormStepsFooter, useFormSteps } from "@/components/cosmos/dashboard/components/FormSteps";
import { Select } from "@/components/cosmos/dashboard/components/Select";
import { Sk, TableSkeleton } from "@/components/cosmos/dashboard/components/Skeleton";
import { FilterBar } from "@/components/cosmos/dashboard/components/FilterBar";
import { Pagination } from "@/components/cosmos/dashboard/components/Pagination";
import { FillRows } from "@/components/cosmos/dashboard/components/FillRows";
import { RowMenu } from "@/components/cosmos/dashboard/components/RowMenu";
import { RecordLink } from "@/components/cosmos/dashboard/components/RecordLink";
import { RecordDetail } from "@/components/cosmos/dashboard/components/RecordDetail";
import { PreviewCard } from "@/components/cosmos/dashboard/components/RecordPreview";
import { AddressLink } from "@/components/cosmos/dashboard/components/AddressLink";
import { usePaged, useListFilters } from "@/components/cosmos/dashboard/hooks";
import { fmtDateTime } from "@/components/cosmos/dashboard/helpers";
import { DATE_RANGES, countBy, inRange, matchesQuery, type DateRange } from "@/lib/dashboard-filters";
import { CHAINS, CHAIN_NAMES, explorerAccountUrl, networkName, tierOf, type Chain } from "@/lib/chains";
import { networkLogoUrl } from "@/lib/logo-urls";
import { shortAddress, WALLET_LABEL_MAX, WALLET_PROVIDERS, walletProofMessage, type OrgWallet, type WalletProvider } from "@/lib/org-wallets";
import { detectWallets, evmWalletName, proveWallet } from "@/lib/wallets/prove";
import { signWithFreighter } from "@/lib/wallets/freighter";
import { checkWalletProofXdr, walletProofTransactionXdr } from "@/lib/wallets/wallet-proof-xdr";
import { CopyBlock } from "@/components/cosmos/dashboard/components/PayLinkDetail";
import { StrKey } from "@stellar/stellar-sdk";

export const ORG_WALLETS_EVENT = "cosmospay:org-wallets";
const announce = () => window.dispatchEvent(new Event(ORG_WALLETS_EVENT));
const CONNECT = "__connect";

/* Official artwork where the project has it (public/media/brands); the EVM wallet varies. */
const PROVIDER_LOGOS: Partial<Record<WalletProvider, string>> = {
  freighter: "/media/brands/freighter.webp",
  phantom: "/media/brands/phantom.svg",
  solflare: "/media/brands/solflare.svg",
};

/** Proves a wallet (its signature over the proof message) and connects it to the organization. */
export async function connectOrgWallet({ orgId, chain, provider, label }: { orgId: string; chain: Chain; provider: WalletProvider; label?: string }): Promise<OrgWallet> {
  const issuedAt = new Date().toISOString();
  const { address, signature } = await proveWallet(provider, (address) => walletProofMessage({ orgId, chain, address, issuedAt }));
  const wallet = await orgsApi.connectWallet(orgId, { chain, address, provider, label: label?.trim() || undefined, issuedAt, signature });
  announce();
  return wallet;
}

/** The organization's wallets: undefined while loading, null when they could not be read. */
export function useOrgWallets(orgId: string): OrgWallet[] | null | undefined {
  const [wallets, setWallets] = useState<OrgWallet[] | null | undefined>(undefined);
  useEffect(() => {
    if (!orgId) return;
    let current = true;
    const load = () => {
      orgsApi.wallets(orgId)
        .then((d) => { if (current) setWallets(Array.isArray(d) ? d : []); })
        .catch(() => { if (current) setWallets(null); });
    };
    setWallets(undefined);
    load();
    window.addEventListener(ORG_WALLETS_EVENT, load);
    return () => { current = false; window.removeEventListener(ORG_WALLETS_EVENT, load); };
  }, [orgId]);
  return wallets;
}

/** A network's official mark, or its initial on a neutral disc where it has none. */
export function NetworkMark({ chain, size = 32 }: { chain: string; size?: number }) {
  const src = networkLogoUrl(chain);
  return src
    ? <img className="wl-mark" src={src} alt="" width={size} height={size} loading="lazy" />
    : <span className="wl-mark wl-mono" style={{ width: size, height: size }} aria-hidden="true">{networkName(chain).slice(0, 1)}</span>;
}

export function ConnectWalletForm({ orgId, chain: initial = "stellar", lockChain = false, onDone, onCancel }: { orgId: string; chain?: Chain; lockChain?: boolean; onDone: (wallet: OrgWallet) => void; onCancel: () => void }) {
  const t = useT();
  const w = t.dash.wallets;
  const [chain, setChain] = useState<Chain>(initial);
  const [installed, setInstalled] = useState<Record<WalletProvider, boolean> | null>(null);
  const [provider, setProvider] = useState<WalletProvider>(WALLET_PROVIDERS[initial][0]);
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const providers = WALLET_PROVIDERS[chain];

  useEffect(() => { detectWallets().then(setInstalled).catch(() => setInstalled({ freighter: false, phantom: false, solflare: false, evm: false })); }, []);
  // On a network change (or once detection answers), the first installed wallet is the choice.
  useEffect(() => { setProvider(providers.find((p) => installed?.[p]) ?? providers[0]); }, [chain, installed]);

  const name = (p: WalletProvider) => (p === "freighter" ? "Freighter" : p === "phantom" ? "Phantom" : p === "solflare" ? "Solflare" : evmWalletName() || w.browserWallet);

  const connect = async () => {
    if (busy) return;
    setBusy(true);
    setProblem(null);
    try {
      const wallet = await connectOrgWallet({ orgId, chain, provider, label });
      showToast(w.connected);
      onDone(wallet);
    } catch (e) {
      const p = (e as { problem?: string })?.problem;
      setProblem(p === "missing" ? fmt(w.missing, { wallet: name(provider) }) : p === "declined" ? w.declined : (e as Error)?.message || w.connectError);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="wl-connect">
      {!lockChain && (
        <div className="fld">
          <span className="field-l" id="wl-chain-l">{w.network}</span>
          <div className="net-pick" role="group" aria-labelledby="wl-chain-l">
            {CHAINS.map((c) => (
              <button key={c} type="button" className={`net-opt${chain === c ? " on" : ""}`} aria-pressed={chain === c} onClick={() => setChain(c)} disabled={busy}>
                <NetworkMark chain={c} size={30} />
                <span className="net-opt-t"><b>{CHAIN_NAMES[c]}</b></span>
              </button>
            ))}
          </div>
        </div>
      )}
      {chain === "stellar" ? <StellarWalletProof orgId={orgId} onDone={onDone} onCancel={onCancel} /> : <>
      <div className="fld">
        <span className="field-l" id="wl-provider-l">{w.wallet}</span>
        <div className="net-pick" role="group" aria-labelledby="wl-provider-l">
          {providers.map((p) => {
            const absent = installed !== null && !installed[p];
            return (
              <button key={p} type="button" className={`net-opt${provider === p ? " on" : ""}`} aria-pressed={provider === p} onClick={() => setProvider(p)} disabled={busy || absent}>
                {PROVIDER_LOGOS[p] ? <img className="wl-mark" src={PROVIDER_LOGOS[p]} alt="" width={30} height={30} /> : <span className="wl-mark wl-mono" style={{ width: 30, height: 30 }} aria-hidden="true">{name(p).slice(0, 1)}</span>}
                <span className="net-opt-t"><b>{name(p)}</b><small>{installed === null ? <Sk w="5em" /> : absent ? w.notInstalled : w.installed}</small></span>
              </button>
            );
          })}
        </div>
      </div>
      <Field label={w.label} hint={t.dash.common.optional} value={label} onChange={(e) => setLabel(e.target.value)} placeholder={w.labelPlaceholder} maxLength={WALLET_LABEL_MAX} disabled={busy} />
      {busy && <p className="work-progress" role="status"><span className="work-spin" aria-hidden="true" /><span>{w.signing}</span></p>}
      {problem && <p className="field-err" role="alert">{problem}</p>}
      <div className="modal-actions">
        <button type="button" className="btn btn-violet" onClick={connect} disabled={busy || !installed?.[provider]}>{w.connectSign}</button>
        <button type="button" className="btn btn-soft" onClick={onCancel} disabled={busy}>{t.dash.common.cancel}</button>
      </div>
      </>}
    </div>
  );
}

/* A Stellar wallet from its address and a signed XDR of the proof transaction: Freighter in one
   click (for whichever network it is set to), or the XDR signed in any wallet and pasted back. A
   new address issues a new proof; an expired one (ten minutes) is issued again on submit. */
function StellarWalletProof({ orgId, onDone, onCancel }: { orgId: string; onDone: (wallet: OrgWallet) => void; onCancel: () => void }) {
  const t = useT();
  const w = t.dash.wallets;
  const zs = t.zk.sign;
  const fw = t.dash.wallet;
  const [address, setAddress] = useState("");
  const [label, setLabel] = useState("");
  const [issuedAt, setIssuedAt] = useState(() => new Date().toISOString());
  const [signed, setSigned] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const account = address.trim();
  const valid = StrKey.isValidEd25519PublicKey(account);
  const xdr = useMemo(() => (valid ? walletProofTransactionXdr({ orgId, address: account, issuedAt }) : null), [valid, account, issuedAt, orgId]);
  useEffect(() => { setIssuedAt(new Date().toISOString()); setSigned(""); setProblem(null); setNote(""); }, [account]);

  const add = async (signedXdr: string) => {
    if (!xdr || busy) return;
    const check = checkWalletProofXdr({ orgId, address: account, issuedAt }, signedXdr);
    if (!check.ok) {
      // The proof is taken on Mainnet or Testnet: only a third network's signature is "another network".
      setProblem(
        check.problem === "notSigned" ? fmt(zs.notSigned, { account: shortAddress(account) })
          : check.problem === "otherNetwork" ? fmt(zs.otherNetwork, { network: "Mainnet" })
          : zs[check.problem],
      );
      return;
    }
    setBusy(true);
    setProblem(null);
    try {
      const wallet = await orgsApi.connectWallet(orgId, { chain: "stellar", address: account, label: label.trim() || undefined, issuedAt, signedXdr: signedXdr.trim() });
      announce();
      showToast(w.connected);
      onDone(wallet);
    } catch (e) {
      const message = (e as Error)?.message || w.connectError;
      // An expired proof is issued again; the person signs the new transaction.
      if (/expired/i.test(message)) { setIssuedAt(new Date().toISOString()); setSigned(""); }
      setProblem(message);
    } finally {
      setBusy(false);
    }
  };

  const freighter = async () => {
    if (!xdr || busy) return;
    setNote("");
    let res = await signWithFreighter(xdr, "public", account);
    if (!res.ok && res.reason === "wrongNetwork") res = await signWithFreighter(xdr, "testnet", account);
    if (res.ok) { await add(res.signedXdr); return; }
    setNote(res.reason === "missing" ? fw.missing : res.reason === "wrongAccount" ? fmt(fw.wrongAccount, { account: shortAddress(account) }) : fw.declined);
  };

  /* Two steps (product owner, 2026-10-27: a long form goes in steps): the address and its name,
     then the proof, signed in Freighter or in any wallet and pasted back. */
  const steps = useFormSteps(2);

  return (
    <>
      <FormSteps names={[w.steps.address, w.steps.sign]} steps={steps} />
      <FormStep steps={steps}>
        {steps.step === 0 && (<>
          <Field label={w.address} value={address} onChange={(e) => setAddress(e.target.value)} placeholder={w.addressPlaceholder} spellCheck={false} autoComplete="off" disabled={busy} aria-invalid={account !== "" && !valid ? true : undefined} />
          {account !== "" && !valid && <p className="field-err" role="alert">{w.invalidAddress}</p>}
          <Field label={w.label} hint={t.dash.common.optional} value={label} onChange={(e) => setLabel(e.target.value)} placeholder={w.labelPlaceholder} maxLength={WALLET_LABEL_MAX} disabled={busy} />
        </>)}
        {steps.step === 1 && xdr && (<>
          <div className="paylink-block">
            <div className="paylink-block-head"><span className="field-l">{w.proofTitle}</span></div>
            <p className="field-note">{w.proofDesc}</p>
            <div className="wallet-sign">
              <button type="button" className="btn btn-dark" disabled={busy} onClick={freighter}>{fw.freighter}</button>
              <p className="wallet-sign-note" role="status" aria-live="polite">{note}</p>
            </div>
          </div>
          <CopyBlock label={zs.xdr} value={xdr} />
          <div className="paylink-block">
            <div className="paylink-block-head"><label className="field-l" htmlFor="wl-signed">{zs.pasteTitle}</label></div>
            <p className="field-note">{fmt(zs.pasteDesc, { account: shortAddress(account) })}</p>
            <textarea id="wl-signed" className="field" rows={4} value={signed} placeholder={zs.pastePlaceholder} spellCheck={false} disabled={busy} onChange={(e) => { setSigned(e.target.value); setProblem(null); }} />
          </div>
        </>)}
      </FormStep>
      {busy && <p className="work-progress" role="status"><span className="work-spin" aria-hidden="true" /><span>{w.signing}</span></p>}
      {problem && <p className="field-err" role="alert">{problem}</p>}
      <FormStepsFooter steps={steps} canNext={valid} onCancel={onCancel} submitLabel={w.add} onSubmit={() => add(signed)} busy={busy} submitDisabled={!xdr || !signed.trim()} />
    </>
  );
}

export function ConnectWalletDialog({ orgId, chain, onClose, onConnected }: { orgId: string; chain?: Chain; onClose: () => void; onConnected?: (wallet: OrgWallet) => void }) {
  const t = useT();
  return (
    <Modal onClose={onClose} label={t.dash.wallets.connectTitle}>
      <div className="modal-body">
        <h3>{t.dash.wallets.connectTitle}</h3>
        <ConnectWalletForm orgId={orgId} chain={chain} onDone={(wallet) => { onConnected?.(wallet); onClose(); }} onCancel={onClose} />
      </div>
    </Modal>
  );
}

function RenameWalletDialog({ orgId, wallet, onClose }: { orgId: string; wallet: OrgWallet; onClose: () => void }) {
  const t = useT();
  const w = t.dash.wallets;
  const [label, setLabel] = useState(wallet.label || "");
  const [busy, setBusy] = useState(false);
  const save = () => {
    if (busy) return;
    setBusy(true);
    orgsApi.renameWallet(orgId, wallet.id, label.trim())
      .then(() => { announce(); showToast(w.renamed); onClose(); })
      .catch(() => showToast(w.actionError, "error"))
      .finally(() => setBusy(false));
  };
  return (
    <Modal onClose={onClose} label={w.renameTitle}>
      <form className="modal-body" onSubmit={(e) => { e.preventDefault(); save(); }}>
        <h3>{w.renameTitle}</h3>
        <Field label={w.label} value={label} onChange={(e) => setLabel(e.target.value)} placeholder={w.labelPlaceholder} maxLength={WALLET_LABEL_MAX} autoFocus />
        <div className="modal-actions">
          <button type="submit" className="btn btn-dark" disabled={busy}>{w.save}</button>
          <button type="button" className="btn btn-outline-w" onClick={onClose}>{t.dash.common.cancel}</button>
        </div>
      </form>
    </Modal>
  );
}

const WALLET_DEFAULTS = { wq: "", wchain: "all", wdate: "any" };
const WALLET_ALLOWED = { wchain: ["all", ...CHAINS], wdate: [...DATE_RANGES] };
const WALLET_COLS = 5;

/* Settings' list of the organization's wallets (product owner, 2026-10-27: every list is the
   Payments table): its own filter bar with the "add" button, a row that opens its detail, the
   address to copy and open in its explorer, and rename / remove for whoever may, a removal
   confirmed first. `wallets` is the caller's useOrgWallets (its figures count them too). */
export function OrgWalletsSection({ orgId, wallets, perms, network }: { orgId: string; wallets: OrgWallet[] | null | undefined; perms: { create: boolean; edit: boolean; remove: boolean }; network: string }) {
  const t = useT();
  const w = t.dash.wallets;
  const fl = t.dash.filters;
  const cm = t.dash.common;
  const { filters, set, reset, active } = useListFilters(WALLET_DEFAULTS, WALLET_ALLOWED);
  const [connecting, setConnecting] = useState(false);
  const [renaming, setRenaming] = useState<OrgWallet | null>(null);
  const [removing, setRemoving] = useState<OrgWallet | null>(null);
  const [open, setOpen] = useState<OrgWallet | null>(null);

  const copy = (address: string) => navigator.clipboard?.writeText(address).then(() => showToast(t.toasts.copied)).catch(() => {});
  const remove = (wallet: OrgWallet) =>
    orgsApi.removeWallet(orgId, wallet.id).then(() => { announce(); setOpen(null); showToast(w.removed); }).catch(() => showToast(w.actionError, "error"));

  const all = wallets || [];
  const matches = (x: OrgWallet, skip: string | null) =>
    (skip === "chain" || filters.wchain === "all" || x.chain === filters.wchain) &&
    inRange(x.createdAt, filters.wdate as DateRange) &&
    matchesQuery([x.label, x.address, CHAIN_NAMES[x.chain]], filters.wq);
  const rows = all.filter((x) => matches(x, null));
  const chainCounts = countBy(all.filter((x) => matches(x, "chain")), (x) => x.chain);
  const pg = usePaged(rows, JSON.stringify(filters));
  const nameOf = (x: OrgWallet) => x.label || CHAIN_NAMES[x.chain];
  const explorer = (x: OrgWallet) => explorerAccountUrl(x.chain, tierOf(network), x.address);
  // What proved it: the wallet that signed the proof message, or a signed XDR pasted back.
  const provenWith = (x: OrgWallet) => (x.provider === "freighter" ? "Freighter" : x.provider === "phantom" ? "Phantom" : x.provider === "solflare" ? "Solflare" : x.provider === "evm" ? w.browserWallet : w.signedXdr);
  const items = (x: OrgWallet) => {
    const url = explorer(x);
    return [
      { key: "open", label: cm.details, icon: DI.docs, onClick: () => setOpen(x) },
      ...(perms.edit ? [{ key: "rename", label: w.rename, icon: DI.edit, onClick: () => { setOpen(null); setRenaming(x); } }] : []),
      { key: "copy", label: cm.copyAccount, icon: <IcCopy />, onClick: () => copy(x.address) },
      { key: "explorer", label: t.dash.balances.explorer, icon: DI.network, href: url, external: true, disabled: !url },
      ...(perms.remove ? [{ key: "delete", label: w.remove, icon: DI.trash, danger: true, onClick: () => setRemoving(x) }] : []),
    ];
  };

  return (
    <section className="hub-section set-section" aria-labelledby="wl-title">
      <div className="hub-section-head"><h2 id="wl-title">{w.title}</h2></div>
      <FilterBar
        label={fl.label}
        query={filters.wq} onQuery={(v) => set("wq", v)} placeholder={w.searchPlaceholder}
        selects={[{ key: "wchain", label: fl.network, value: filters.wchain, onChange: (v) => set("wchain", v), options: [{ key: "all", label: fl.allNetworks }, ...CHAINS.map((c) => ({ key: c, label: CHAIN_NAMES[c], icon: <NetworkMark chain={c} size={18} />, count: chainCounts[c] || 0 }))] }]}
        date={filters.wdate} onDate={(v) => set("wdate", v)}
        active={active} onReset={reset}
        shown={rows.length} total={wallets ? all.length : undefined} loading={wallets === undefined}
        actions={perms.create && <button type="button" className="btn btn-dark btn-sm" onClick={() => setConnecting(true)}>{DI.plus} {w.connect}</button>}
      />
      <div className="panel">
        {wallets === undefined && <TableSkeleton label={w.title} cols={WALLET_COLS} />}
        {wallets !== undefined && (
          <div className="t-scroll" tabIndex={0}><table className="tx">
            <thead><tr><th>{w.tableHead.wallet}</th><th>{w.tableHead.network}</th><th>{w.tableHead.address}</th><th>{w.tableHead.added}</th><th><span className="sr-only">{cm.actions}</span></th></tr></thead>
            <tbody>
              {wallets && pg.slice.map((x) => {
                const url = explorer(x);
                const name = nameOf(x);
                return (
                  <tr key={x.id} className="row-click" onClick={() => setOpen(x)}>
                    <td className="tid">
                      <span className="cell-mark">
                        <NetworkMark chain={x.chain} size={24} />
                        <RecordLink
                          onOpen={() => setOpen(x)} copy={x.address} title={x.address}
                          preview={() => <PreviewCard label={w.detail} title={x.address} wrap headline={<b>{name}</b>} fields={[[w.tableHead.network, CHAIN_NAMES[x.chain]], [w.provenWith, provenWith(x)], [w.tableHead.added, fmtDateTime(x.createdAt)]]} />}
                        >{name}</RecordLink>
                      </span>
                    </td>
                    <td className="cust">{CHAIN_NAMES[x.chain]}</td>
                    <td className="cust" onClick={(e) => e.stopPropagation()}><AddressLink chain={x.chain} network={network} address={x.address} label={w.tableHead.address} /></td>
                    <td className="cust">{fmtDateTime(x.createdAt)}</td>
                    <td className="row-actions" onClick={(e) => e.stopPropagation()}>
                      <button type="button" className="icon-mini" title={cm.details} aria-label={`${cm.details}: ${name}`} onClick={() => setOpen(x)}>{DI.docs}</button>
                      {perms.edit && <button type="button" className="icon-mini" title={w.rename} aria-label={`${w.rename}: ${name}`} onClick={() => setRenaming(x)}>{DI.edit}</button>}
                      {url
                        ? <a className="icon-mini" href={url} target="_blank" rel="noopener noreferrer" title={t.dash.balances.explorer} aria-label={`${t.dash.balances.explorer}: ${name}`}>{DI.network}</a>
                        : <button type="button" className="icon-mini" disabled title={t.dash.balances.explorer} aria-label={`${t.dash.balances.explorer}: ${name}`}>{DI.network}</button>}
                      {perms.remove && <button type="button" className="icon-mini danger" title={w.remove} aria-label={`${w.remove}: ${name}`} onClick={() => setRemoving(x)}>{DI.trash}</button>}
                      <RowMenu label={fmt(cm.rowActions, { name })} items={items(x)} />
                    </td>
                  </tr>
                );
              })}
              <FillRows n={pg.size - (wallets ? pg.count : 0)} cols={WALLET_COLS} empty={wallets === null ? w.loadError : null} />
            </tbody>
          </table></div>
        )}
        {wallets !== undefined && <Pagination {...pg} />}
      </div>
      {open && (
        <RecordDetail
          eyebrow={w.detail} title={nameOf(open)} onClose={() => setOpen(null)}
          fields={[
            [w.label, open.label],
            [w.tableHead.network, <span key="n" className="cell-mark"><NetworkMark chain={open.chain} size={18} />{CHAIN_NAMES[open.chain]}</span>],
            [w.tableHead.address, <AddressLink key="a" chain={open.chain} network={network} address={open.address} label={w.tableHead.address} />],
            [w.provenWith, provenWith(open)],
            [w.tableHead.added, fmtDateTime(open.createdAt)],
          ]}
          actions={[
            ...(perms.edit ? [{ key: "rename", label: w.rename, icon: DI.edit, kind: "dark" as const, onClick: () => { setOpen(null); setRenaming(open); } }] : []),
            { key: "copy", label: cm.copyAccount, icon: <IcCopy />, onClick: () => copy(open.address) },
            ...(explorer(open) ? [{ key: "explorer", label: t.dash.balances.explorer, icon: DI.network, href: explorer(open) }] : []),
            ...(perms.remove ? [{ key: "delete", label: w.remove, icon: DI.trash, kind: "danger" as const, onClick: () => setRemoving(open) }] : []),
          ]}
        />
      )}
      {connecting && <ConnectWalletDialog orgId={orgId} onClose={() => setConnecting(false)} />}
      {renaming && <RenameWalletDialog orgId={orgId} wallet={renaming} onClose={() => setRenaming(null)} />}
      {removing && (
        <ConfirmModal
          title={w.removeTitle}
          body={fmt(w.removeBody, { name: removing.label || shortAddress(removing.address) })}
          confirmLabel={w.removeConfirm}
          cancelLabel={cm.cancel}
          onConfirm={() => remove(removing)}
          onClose={() => setRemoving(null)}
        />
      )}
    </section>
  );
}

/** The receiving address of a payment form: one of the organization's wallets on `chain`. */
export function WalletSelect({ orgId, chain, value, onChange, canConnect, label, id, hint }: { orgId: string; chain: Chain; value: string; onChange: (address: string) => void; canConnect: boolean; label: string; id: string; hint?: string }) {
  const t = useT();
  const w = t.dash.wallets;
  const wallets = useOrgWallets(orgId);
  const mine = (wallets || []).filter((x) => x.chain === chain);
  const [connecting, setConnecting] = useState(false);

  // Always one of the list: the first when nothing (or something no longer listed) is chosen.
  useEffect(() => {
    if (wallets === undefined) return;
    if (mine.length && !mine.some((x) => x.address === value)) onChange(mine[0].address);
    if (!mine.length && value) onChange("");
  }, [wallets, chain]);

  const labelId = `${id}-l`;
  return (
    <div className="fld">
      <span className="field-l" id={labelId}>{label}</span>
      {wallets === undefined ? (
        <Sk className="lg" w="100%" />
      ) : connecting ? (
        <div className="wl-inline arrive">
          <ConnectWalletForm orgId={orgId} chain={chain} lockChain onDone={(wallet) => { setConnecting(false); onChange(wallet.address); }} onCancel={() => setConnecting(false)} />
        </div>
      ) : mine.length ? (
        <Select
          id={id}
          labelledBy={labelId}
          describedBy={hint ? `${id}-h` : undefined}
          value={value}
          onChange={(v) => (v === CONNECT ? setConnecting(true) : onChange(v))}
          options={[
            ...mine.map((x) => ({ value: x.address, label: x.label || shortAddress(x.address), hint: x.label ? shortAddress(x.address) : undefined, icon: <NetworkMark chain={chain} size={22} /> })),
            ...(canConnect ? [{ value: CONNECT, label: w.connectAnother }] : []),
          ]}
        />
      ) : (
        <div className="wl-none" role="status">
          <span>{wallets === null ? w.loadError : fmt(w.noneForChain, { network: CHAIN_NAMES[chain] })}</span>
          {wallets !== null && (canConnect
            ? <button type="button" className="btn btn-outline-w btn-sm" onClick={() => setConnecting(true)}>{w.connect}</button>
            : <span className="field-help">{w.askAdmin}</span>)}
        </div>
      )}
      {hint && mine.length > 0 && !connecting && <p className="field-help" id={`${id}-h`}>{hint}</p>}
    </div>
  );
}
