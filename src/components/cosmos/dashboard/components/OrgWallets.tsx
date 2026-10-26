/* The organization's receiving wallets in the dashboard (product owner: connected in Settings, so
   nobody asks people to connect a wallet from the payments views, and members without the
   permission can neither remove one nor pick an address outside the list).
   - useOrgWallets: the list, read again whenever any of these components changes it.
   - ConnectWalletForm: network, wallet, an optional name; the wallet shares its address and signs
     the proof (src/lib/wallets/prove.ts), the API checks it and stores the wallet. Used in
     Settings' dialog and inline inside a payment form (never a dialog on top of a dialog).
   - OrgWalletsPanel: Settings' list, with connect / rename / remove for whoever may.
   - WalletSelect: the receiving address of a payment form, chosen from the organization's
     wallets on that network; "connect another" opens the form inline for whoever may. */
import { useEffect, useState } from "react";
import { ConfirmModal, Modal, showToast } from "@/components/cosmos/shared";
import { fmt, useT } from "@/lib/i18n/index";
import { organizations as orgsApi } from "@/lib/api-client";
import { DI } from "@/components/cosmos/dashboard/icons";
import { IcCopy } from "@/components/cosmos/icons";
import { Field } from "@/components/cosmos/dashboard/components/Field";
import { Select } from "@/components/cosmos/dashboard/components/Select";
import { ListSkeleton, Sk } from "@/components/cosmos/dashboard/components/Skeleton";
import { CHAINS, CHAIN_NAMES, networkName, type Chain } from "@/lib/chains";
import { networkLogoUrl } from "@/lib/logo-urls";
import { shortAddress, WALLET_LABEL_MAX, WALLET_PROVIDERS, walletProofMessage, type OrgWallet, type WalletProvider } from "@/lib/org-wallets";
import { detectWallets, evmWalletName, proveWallet } from "@/lib/wallets/prove";

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
        <button type="button" className="btn btn-dark" onClick={connect} disabled={busy || !installed?.[provider]}>{w.connectSign}</button>
        <button type="button" className="btn btn-outline-w" onClick={onCancel} disabled={busy}>{t.dash.common.cancel}</button>
      </div>
    </div>
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

export function OrgWalletsPanel({ orgId, perms }: { orgId: string; perms: { create: boolean; edit: boolean; remove: boolean } }) {
  const t = useT();
  const w = t.dash.wallets;
  const wallets = useOrgWallets(orgId);
  const [connecting, setConnecting] = useState(false);
  const [renaming, setRenaming] = useState<OrgWallet | null>(null);
  const [removing, setRemoving] = useState<OrgWallet | null>(null);

  const copy = (address: string) => navigator.clipboard?.writeText(address).then(() => showToast(t.toasts.copied)).catch(() => {});
  const remove = (wallet: OrgWallet) =>
    orgsApi.removeWallet(orgId, wallet.id).then(() => { announce(); showToast(w.removed); }).catch(() => showToast(w.actionError, "error"));

  return (
    <div className="panel set-panel">
      <div className="panel-head">
        <h3>{w.title}</h3>
        {perms.create && <button type="button" className="btn btn-outline-w btn-sm" onClick={() => setConnecting(true)}>{w.connect}</button>}
      </div>
      <div className="set-body">
        {wallets === undefined && <ListSkeleton label={w.title} rows={2} pairs={1} />}
        {wallets === null && <div className="empty" role="alert">{w.loadError}</div>}
        {wallets && !wallets.length && <div className="empty" style={{ padding: "18px 8px" }}>{perms.create ? w.empty : w.emptyAsk}</div>}
        {wallets && wallets.map((x) => (
          <div className="set-member wl-row arrive" key={x.id}>
            <NetworkMark chain={x.chain} />
            <div>
              <b>{x.label || CHAIN_NAMES[x.chain]}</b>
              <span title={x.address}><span className="sr-only">{CHAIN_NAMES[x.chain]} </span>{shortAddress(x.address)}</span>
            </div>
            <span className="wl-net">{CHAIN_NAMES[x.chain]}</span>
            <button type="button" className="icon-mini" title={t.ui.copyToClipboard} aria-label={t.ui.copyToClipboard} onClick={() => copy(x.address)}><IcCopy /></button>
            {perms.edit && <button type="button" className="icon-mini" title={w.rename} aria-label={w.rename} onClick={() => setRenaming(x)}>{DI.edit}</button>}
            {perms.remove && <button type="button" className="icon-mini danger" title={w.remove} aria-label={w.remove} onClick={() => setRemoving(x)}>{DI.trash}</button>}
          </div>
        ))}
      </div>
      {connecting && <ConnectWalletDialog orgId={orgId} onClose={() => setConnecting(false)} />}
      {renaming && <RenameWalletDialog orgId={orgId} wallet={renaming} onClose={() => setRenaming(null)} />}
      {removing && (
        <ConfirmModal
          title={w.removeTitle}
          body={fmt(w.removeBody, { name: removing.label || shortAddress(removing.address) })}
          confirmLabel={w.removeConfirm}
          cancelLabel={t.dash.common.cancel}
          onConfirm={() => remove(removing)}
          onClose={() => setRemoving(null)}
        />
      )}
    </div>
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
