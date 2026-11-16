/* The organization's receiving wallets in the dashboard (product owner: connected in Settings, so
   nobody asks people to connect a wallet from the payments views, and members without the
   permission can neither remove one nor pick an address outside the list).
   - useOrgWallets: the list, read again whenever any of these components changes it.
   - ConnectWalletForm: the network, then its proof, always over a challenge the server issues for
     the address (src/lib/org-wallets.ts: a nonce, ten minutes, one use). On Stellar the address,
     an optional name and the proof as a signed XDR (product owner, 2026-10-27: people hand over a
     signed XDR, not their wallet): Freighter in one click, or the proof transaction
     (src/lib/wallets/wallet-proof-xdr.ts) signed in any wallet and pasted back, the way a swap is
     signed. On Solana, Fogo and the EVM networks the wallet shares its address and signs the
     challenge's message (src/lib/wallets/prove.ts). On every other network the browser wallets of
     its standard sign in one click (src/lib/wallets/prove-networks.ts), or, where any wallet can
     sign a message, the message is signed elsewhere and the result pasted back. Only an address
     that cannot sign a message (`addedByAddress`) is added by its address, typed twice. Every
     network a payment link settles on is offered, by name. The API checks the proof and stores
     the wallet. Used in Settings' dialog, inline inside a payment form (never a dialog on top of a
     dialog) and in the private accounts table.
   - OrgWalletsSection: Settings' list, the Payments table (a row opens its detail), with connect /
     rename / remove for whoever may.
   - WalletSelect: the receiving address of a payment form, chosen from the organization's
     wallets on that network; "connect another" opens the form inline for whoever may. */
import { useEffect, useMemo, useState, type ReactNode } from "react";
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
import { NETWORKS_BY_NAME, explorerAccountUrl, isNetworkAddress, networkName, placeholderFor, sameNetworkAddress, tierOf, type NetworkId } from "@/lib/chains";
import { networkLogoUrl } from "@/lib/logo-urls";
import { addedByAddress, shortAddress, WALLET_LABEL_MAX, WALLET_PROVIDERS, type OrgWallet, type WalletProvider } from "@/lib/org-wallets";
import { detectWallets, evmWalletName, proveWallet, type BrowserProvider } from "@/lib/wallets/prove";
import { networkSigners, pastedPayload, PASTE_FIELDS, type NetworkSigner, type PasteField, type ProofPayload, type WalletChallengeAnswer } from "@/lib/wallets/prove-networks";
import { signWithFreighter } from "@/lib/wallets/freighter";
import { checkWalletProofXdr, walletProofTransactionXdr } from "@/lib/wallets/wallet-proof-xdr";
import { isRouteFeeWallet, routeFeeAccount } from "@/lib/deposit-limits";
import { CopyBlock } from "@/components/cosmos/dashboard/components/PayLinkDetail";
import { StrKey } from "@stellar/stellar-sdk";

export const ORG_WALLETS_EVENT = "cosmospay:org-wallets";
const announce = () => window.dispatchEvent(new Event(ORG_WALLETS_EVENT));
const CONNECT = "__connect";
const PASTE = "__paste";

/* Official artwork where the project has it (public/media/brands); the EVM wallet varies. */
const PROVIDER_LOGOS: Partial<Record<WalletProvider, string>> = {
  freighter: "/media/brands/freighter.webp",
  phantom: "/media/brands/phantom.svg",
  solflare: "/media/brands/solflare.svg",
};

/* The wallets of each network's standard, named (and drawn as not installed) when the browser
   has none of them, so the network never shows an empty choice. */
const SUGGESTED_WALLETS: Partial<Record<NetworkId, string[]>> = {
  tron: ["TronLink"],
  ton: ["Tonkeeper", "MyTonWallet"],
  sui: ["Slush", "Suiet"],
  aptos: ["Petra", "Nightly"],
  movement: ["Nightly", "Razor"],
  starknet: ["Argent X", "Braavos"],
  cardano: ["Eternl", "Lace"],
  aleo: ["Leo Wallet"],
  btc: ["Unisat", "Xverse", "Leather"],
};

/* The standard a signature follows, as "Proven with" names it (standards are not translated). */
const STANDARD_NAMES: Partial<Record<WalletProvider, string>> = {
  tip191: "TIP-191",
  tonproof: "TON Connect",
  nep413: "NEP-413",
  sui: "Sui",
  aip62: "AIP-62",
  snip12: "SNIP-12",
  cip30: "CIP-30",
  xrpl: "XRP Ledger",
  aleo: "Aleo",
  bip322: "BIP-322",
  signmessage: "signmessage",
};

type WalletsCopy = ReturnType<typeof useT>["dash"]["wallets"];

/** What a failed proof says, in the reader's language where the failure is known. */
function proofProblem(e: unknown, w: WalletsCopy, wallet: string): string {
  const p = (e as { problem?: string })?.problem;
  if (p === "missing") return fmt(w.missing, { wallet });
  if (p === "declined") return w.declined;
  const message = (e as Error)?.message || "";
  if (/expired/i.test(message)) return w.expired;
  if (/not made by this wallet/i.test(message)) return w.wrongSigner;
  if (/could not be reached/i.test(message)) return w.unreachable;
  return message || w.connectError;
}

const challengeFor = (orgId: string, chain: NetworkId, address: string | null): Promise<WalletChallengeAnswer> =>
  orgsApi.walletChallenge(orgId, address ? { chain, address } : { chain });

/** Proves a wallet (its signature over a challenge issued for its address) and connects it to the organization. */
export async function connectOrgWallet({ orgId, chain, provider, label }: { orgId: string; chain: NetworkId; provider: BrowserProvider; label?: string }): Promise<OrgWallet> {
  let nonce = "";
  const { address, signature } = await proveWallet(provider, async (address) => {
    const challenge = await challengeFor(orgId, chain, address);
    nonce = challenge.nonce;
    return challenge.message ?? "";
  });
  const wallet = await orgsApi.connectWallet(orgId, { chain, address, provider, label: label?.trim() || undefined, nonce, signature });
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

/* A wallet's mark: its own icon (a data URL or an https address the wallet gives), else its initial. */
function WalletMark({ name, src, size = 30 }: { name: string; src?: string; size?: number }) {
  return src && /^(data:image\/|https:\/\/)/.test(src)
    ? <img className="wl-mark" src={src} alt="" width={size} height={size} referrerPolicy="no-referrer" />
    : <span className="wl-mark wl-mono" style={{ width: size, height: size }} aria-hidden="true">{name.slice(0, 1)}</span>;
}

const BROWSER_NETWORK = (chain: NetworkId) => WALLET_PROVIDERS[chain].some((p) => p === "phantom" || p === "solflare" || p === "evm");

export function ConnectWalletForm({ orgId, chain: initial = "stellar", lockChain = false, onDone, onCancel }: { orgId: string; chain?: NetworkId; lockChain?: boolean; onDone: (wallet: OrgWallet) => void; onCancel: () => void }) {
  const t = useT();
  const w = t.dash.wallets;
  const [chain, setChain] = useState<NetworkId>(initial);

  return (
    <div className="wl-connect">
      {!lockChain && (
        <div className="fld">
          <span className="field-l" id="wl-chain-l">{w.network}</span>
          {/* Every network a payment settles on, by name: none comes first for being one of ours. */}
          <Select
            id="wl-chain" labelledBy="wl-chain-l" value={chain}
            onChange={(v) => setChain(v as NetworkId)}
            options={NETWORKS_BY_NAME.map((c) => ({ value: c, label: networkName(c), icon: <NetworkMark chain={c} size={22} /> }))}
          />
        </div>
      )}
      {chain === "stellar" ? <StellarWalletProof orgId={orgId} onDone={onDone} onCancel={onCancel} />
        : BROWSER_NETWORK(chain) ? <BrowserWalletProof key={chain} orgId={orgId} chain={chain} onDone={onDone} onCancel={onCancel} />
        : <NetworkWalletProof key={chain} orgId={orgId} chain={chain} onDone={onDone} onCancel={onCancel} />}
    </div>
  );
}

/* Solana, Fogo and the EVM networks: the wallet shares its address, the server issues the
   challenge for it and the wallet signs its message. */
function BrowserWalletProof({ orgId, chain, onDone, onCancel }: { orgId: string; chain: NetworkId; onDone: (wallet: OrgWallet) => void; onCancel: () => void }) {
  const t = useT();
  const w = t.dash.wallets;
  const providers = WALLET_PROVIDERS[chain] as BrowserProvider[];
  const [installed, setInstalled] = useState<Record<BrowserProvider, boolean> | null>(null);
  const [provider, setProvider] = useState<BrowserProvider>(providers[0]);
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => { detectWallets().then(setInstalled).catch(() => setInstalled({ freighter: false, phantom: false, solflare: false, evm: false })); }, []);
  // Once detection answers, the first installed wallet is the choice.
  useEffect(() => { setProvider(providers.find((p) => installed?.[p]) ?? providers[0]); }, [installed]);

  const name = (p: BrowserProvider) => (p === "freighter" ? "Freighter" : p === "phantom" ? "Phantom" : p === "solflare" ? "Solflare" : evmWalletName() || w.browserWallet);

  const connect = async () => {
    if (busy) return;
    setBusy(true);
    setProblem(null);
    try {
      const wallet = await connectOrgWallet({ orgId, chain, provider, label });
      showToast(w.connected);
      onDone(wallet);
    } catch (e) {
      setProblem(proofProblem(e, w, name(provider)));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="fld">
        <span className="field-l" id="wl-provider-l">{w.wallet}</span>
        <div className="net-pick" role="group" aria-labelledby="wl-provider-l">
          {providers.map((p) => {
            const absent = installed !== null && !installed[p];
            return (
              <button key={p} type="button" className={`net-opt${provider === p ? " on" : ""}`} aria-pressed={provider === p} onClick={() => setProvider(p)} disabled={busy || absent}>
                {PROVIDER_LOGOS[p] ? <img className="wl-mark" src={PROVIDER_LOGOS[p]} alt="" width={30} height={30} /> : <WalletMark name={name(p)} />}
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
    </>
  );
}

/* A Stellar wallet from its address and a signed XDR of the proof transaction: Freighter in one
   click (for whichever network it is set to), or the XDR signed in any wallet and pasted back.
   The challenge is issued when the address moves on to the signature step; an expired one (ten
   minutes) is issued again on submit. */
function StellarWalletProof({ orgId, onDone, onCancel }: { orgId: string; onDone: (wallet: OrgWallet) => void; onCancel: () => void }) {
  const t = useT();
  const w = t.dash.wallets;
  const zs = t.zk.sign;
  const fw = t.dash.wallet;
  const [address, setAddress] = useState("");
  const [label, setLabel] = useState("");
  const [challenge, setChallenge] = useState<WalletChallengeAnswer | null>(null);
  const [signed, setSigned] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const account = address.trim();
  const valid = StrKey.isValidEd25519PublicKey(account);
  const proof = challenge && challenge.address === account ? { orgId, address: account, nonce: challenge.nonce, issuedAt: challenge.issuedAt, expiresAt: challenge.expiresAt } : null;
  const xdr = useMemo(() => (proof ? walletProofTransactionXdr(proof) : null), [proof?.nonce, account, orgId]);
  useEffect(() => { setChallenge(null); setSigned(""); setProblem(null); setNote(""); }, [account]);

  /* Two steps (product owner, 2026-10-27: a long form goes in steps): the address and its name,
     then the proof, signed in Freighter or in any wallet and pasted back. */
  const steps = useFormSteps(2);

  const issue = async () => {
    setBusy(true);
    setProblem(null);
    try {
      setChallenge(await challengeFor(orgId, "stellar", account));
      setSigned("");
    } catch (e) {
      setProblem(proofProblem(e, w, "Freighter"));
    } finally {
      setBusy(false);
    }
  };
  // The challenge is asked for when the signature step opens (and again if it expired).
  useEffect(() => { if (steps.step === 1 && valid && !challenge && !busy) void issue(); }, [steps.step, valid, challenge]);

  const add = async (signedXdr: string) => {
    if (!xdr || !proof || busy) return;
    const check = checkWalletProofXdr(proof, signedXdr);
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
      const wallet = await orgsApi.connectWallet(orgId, { chain: "stellar", address: account, label: label.trim() || undefined, nonce: proof.nonce, signedXdr: signedXdr.trim() });
      announce();
      showToast(w.connected);
      onDone(wallet);
    } catch (e) {
      const message = (e as Error)?.message || "";
      // An expired challenge is issued again; the person signs the new transaction.
      if (/expired/i.test(message)) { setChallenge(null); setSigned(""); }
      setProblem(proofProblem(e, w, "Freighter"));
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

  return (
    <>
      <FormSteps names={[w.steps.address, w.steps.sign]} steps={steps} />
      <FormStep steps={steps}>
        {steps.step === 0 && (<>
          <Field label={w.address} value={address} onChange={(e) => setAddress(e.target.value)} placeholder={w.addressPlaceholder} spellCheck={false} autoComplete="off" disabled={busy} aria-invalid={account !== "" && !valid ? true : undefined} />
          {account !== "" && !valid && <p className="field-err" role="alert">{w.invalidAddress}</p>}
          <Field label={w.label} hint={t.dash.common.optional} value={label} onChange={(e) => setLabel(e.target.value)} placeholder={w.labelPlaceholder} maxLength={WALLET_LABEL_MAX} disabled={busy} />
        </>)}
        {steps.step === 1 && !xdr && <Sk className="lg" w="100%" />}
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

/* Every other network: the browser wallets of its standard (one click: the wallet shares its
   address, the server issues the challenge, the wallet signs it), or, where any wallet can sign a
   message, the address first and then the message signed elsewhere and its result pasted back
   (two steps). An address that cannot sign a message is added by its address, typed twice. */
function NetworkWalletProof({ orgId, chain, onDone, onCancel }: { orgId: string; chain: NetworkId; onDone: (wallet: OrgWallet) => void; onCancel: () => void }) {
  const t = useT();
  const w = t.dash.wallets;
  const network = networkName(chain);
  const paste = PASTE_FIELDS[chain];
  const [signers, setSigners] = useState<NetworkSigner[] | null>(null);
  const [pick, setPick] = useState<string>("");
  const [address, setAddress] = useState("");
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  // Wallets register as they load: look once now and once a moment later.
  useEffect(() => {
    const look = () => setSigners(networkSigners(chain));
    look();
    const later = window.setTimeout(look, 600);
    return () => window.clearTimeout(later);
  }, [chain]);
  useEffect(() => {
    if (signers === null) return;
    if (!pick || (pick !== PASTE && !signers.some((s) => s.id === pick))) setPick(signers[0]?.id ?? (paste ? PASTE : ""));
  }, [signers]);

  const signer = signers?.find((s) => s.id === pick) ?? null;
  const account = address.trim();
  const typedValid = isNetworkAddress(chain, account);
  const suggested = (SUGGESTED_WALLETS[chain] || []).filter((n) => !signers?.some((s) => s.name.toLowerCase() === n.toLowerCase()));

  const connect = async () => {
    if (!signer || busy) return;
    setBusy(true);
    setProblem(null);
    try {
      const known = signer.addressWithProof ? null : signer.needsAddress ? account : await signer.account();
      const challenge = await challengeFor(orgId, chain, known);
      const { address: proven, payload } = await signer.sign(challenge, known);
      const wallet = await orgsApi.connectWallet(orgId, { chain, address: proven, label: label.trim() || undefined, nonce: challenge.nonce, ...payload });
      announce();
      showToast(w.connected);
      onDone(wallet);
    } catch (e) {
      setProblem(proofProblem(e, w, signer.name));
    } finally {
      setBusy(false);
    }
  };

  const picker = (
    <div className="fld">
      <span className="field-l" id="wl-provider-l">{w.wallet}</span>
      <div className="net-pick" role="group" aria-labelledby="wl-provider-l">
        {signers === null && <Sk className="lg" w="100%" />}
        {(signers || []).map((s) => (
          <button key={s.id} type="button" className={`net-opt${pick === s.id ? " on" : ""}`} aria-pressed={pick === s.id} onClick={() => setPick(s.id)} disabled={busy}>
            <WalletMark name={s.name} src={s.icon} />
            <span className="net-opt-t"><b>{s.name}</b><small>{s.needsAddress ? w.webWallet : w.installed}</small></span>
          </button>
        ))}
        {signers !== null && suggested.map((n) => (
          <button key={n} type="button" className="net-opt" aria-pressed={false} disabled>
            <WalletMark name={n} />
            <span className="net-opt-t"><b>{n}</b><small>{w.notInstalled}</small></span>
          </button>
        ))}
        {paste && (
          <button type="button" className={`net-opt${pick === PASTE ? " on" : ""}`} aria-pressed={pick === PASTE} onClick={() => setPick(PASTE)} disabled={busy}>
            <WalletMark name={w.pasteOption} />
            <span className="net-opt-t"><b>{w.pasteOption}</b><small>{w.pasteHint}</small></span>
          </button>
        )}
      </div>
    </div>
  );

  if (pick === PASTE) {
    return addedByAddress(chain, account)
      ? <AddressWallet orgId={orgId} chain={chain} address={address} setAddress={setAddress} onDone={onDone} onCancel={onCancel} top={picker} />
      : <PastedProof orgId={orgId} chain={chain} address={address} setAddress={setAddress} label={label} setLabel={setLabel} onDone={onDone} onCancel={onCancel} top={picker} />;
  }

  return (
    <>
      {picker}
      {signer?.needsAddress && (<>
        <Field label={fmt(w.addressOn, { network })} value={address} onChange={(e: { target: { value: string } }) => setAddress(e.target.value)} placeholder={placeholderFor(chain)} spellCheck={false} autoComplete="off" disabled={busy} aria-invalid={account !== "" && !typedValid ? true : undefined} />
        {account !== "" && !typedValid && <p className="field-err" role="alert">{fmt(w.invalidNetworkAddress, { network })}</p>}
      </>)}
      <Field label={w.label} hint={t.dash.common.optional} value={label} onChange={(e: { target: { value: string } }) => setLabel(e.target.value)} placeholder={w.labelPlaceholder} maxLength={WALLET_LABEL_MAX} disabled={busy} />
      {busy && <p className="work-progress" role="status"><span className="work-spin" aria-hidden="true" /><span>{w.signing}</span></p>}
      {problem && <p className="field-err" role="alert">{problem}</p>}
      <div className="modal-actions">
        <button type="button" className="btn btn-violet" onClick={connect} disabled={busy || !signer || (signer.needsAddress && !typedValid)}>{w.connectSign}</button>
        <button type="button" className="btn btn-soft" onClick={onCancel} disabled={busy}>{t.dash.common.cancel}</button>
      </div>
    </>
  );
}

/* A proof signed in any wallet and pasted back: the address and its name, then the challenge's
   message to copy, who does what, and the fields the network's signature is made of. */
function PastedProof({ orgId, chain, address, setAddress, label, setLabel, onDone, onCancel, top }: { orgId: string; chain: NetworkId; address: string; setAddress: (v: string) => void; label: string; setLabel: (v: string) => void; onDone: (wallet: OrgWallet) => void; onCancel: () => void; top: ReactNode }) {
  const t = useT();
  const w = t.dash.wallets;
  const network = networkName(chain);
  const spec = PASTE_FIELDS[chain]!;
  const [challenge, setChallenge] = useState<WalletChallengeAnswer | null>(null);
  const [values, setValues] = useState<Partial<Record<PasteField, string>>>({});
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const account = address.trim();
  const valid = isNetworkAddress(chain, account);
  const steps = useFormSteps(2);
  const payload: ProofPayload | null = pastedPayload(chain, values);
  useEffect(() => { setChallenge(null); setValues({}); setProblem(null); }, [account]);

  const issue = async () => {
    setBusy(true);
    setProblem(null);
    try {
      setChallenge(await challengeFor(orgId, chain, account));
      setValues({});
    } catch (e) {
      setProblem(proofProblem(e, w, network));
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => { if (steps.step === 1 && valid && !challenge && !busy) void issue(); }, [steps.step, valid, challenge]);

  const add = async () => {
    if (!challenge || !payload || busy) return;
    setBusy(true);
    setProblem(null);
    try {
      const wallet = await orgsApi.connectWallet(orgId, { chain, address: account, label: label.trim() || undefined, nonce: challenge.nonce, ...payload });
      announce();
      showToast(w.connected);
      onDone(wallet);
    } catch (e) {
      if (/expired/i.test((e as Error)?.message || "")) setChallenge(null);
      setProblem(proofProblem(e, w, network));
    } finally {
      setBusy(false);
    }
  };

  const set = (k: PasteField) => (e: { target: { value: string } }) => { setValues((v) => ({ ...v, [k]: e.target.value })); setProblem(null); };
  return (
    <>
      <FormSteps names={[w.steps.address, w.steps.sign]} steps={steps} />
      <FormStep steps={steps}>
        {steps.step === 0 && (<>
          {top}
          <Field label={fmt(w.addressOn, { network })} value={address} onChange={(e: { target: { value: string } }) => setAddress(e.target.value)} placeholder={placeholderFor(chain)} spellCheck={false} autoComplete="off" disabled={busy} aria-invalid={account !== "" && !valid ? true : undefined} />
          {account !== "" && !valid && <p className="field-err" role="alert">{fmt(w.invalidNetworkAddress, { network })}</p>}
          <Field label={w.label} hint={t.dash.common.optional} value={label} onChange={(e: { target: { value: string } }) => setLabel(e.target.value)} placeholder={w.labelPlaceholder} maxLength={WALLET_LABEL_MAX} disabled={busy} />
        </>)}
        {steps.step === 1 && !challenge?.message && <Sk className="lg" w="100%" />}
        {steps.step === 1 && challenge?.message && (<>
          <ol className="zka-sigs" aria-label={w.pasteStepsLabel}>
            <li><span className="fstep-n" aria-hidden="true">1</span><span className="zka-sig-t">{w.pasteSteps.copy}</span><span className="zka-sig-who">{w.pasteWho.you}</span></li>
            <li><span className="fstep-n" aria-hidden="true">2</span><span className="zka-sig-t">{fmt(w.pasteSteps.sign, { address: shortAddress(account) })}</span><span className="zka-sig-who">{fmt(w.pasteWho.wallet, { network })}</span></li>
            <li><span className="fstep-n" aria-hidden="true">3</span><span className="zka-sig-t">{w.pasteSteps.paste}</span><span className="zka-sig-who">{w.pasteWho.you}</span></li>
          </ol>
          <CopyBlock label={w.messageLabel} value={challenge.message} />
          {spec.fields.map((f) => (
            f === "fullMessage" || (f === "signature" && chain === "cardano")
              ? (
                <div className="fld" key={f}>
                  <label className="field-l" htmlFor={`wl-paste-${f}`}>{w.fields[f]}</label>
                  <textarea id={`wl-paste-${f}`} className="field" rows={f === "fullMessage" ? 6 : 4} value={values[f] || ""} spellCheck={false} disabled={busy} onChange={set(f)} />
                </div>
              )
              : <Field key={f} label={w.fields[f]} value={values[f] || ""} onChange={set(f)} spellCheck={false} autoComplete="off" disabled={busy} />
          ))}
        </>)}
      </FormStep>
      {busy && <p className="work-progress" role="status"><span className="work-spin" aria-hidden="true" /><span>{w.adding}</span></p>}
      {problem && <p className="field-err" role="alert">{problem}</p>}
      <FormStepsFooter steps={steps} canNext={valid} onCancel={onCancel} submitLabel={w.add} onSubmit={add} busy={busy} submitDisabled={!challenge || !payload} />
    </>
  );
}

/* An address that cannot sign a message (a P2WSH or non-SegWit P2SH script, a Zcash unified
   address): typed twice so a slip is caught before any payment is sent there, and a name. It is
   listed as added without a signature. Only whoever may connect wallets reaches this form. */
function AddressWallet({ orgId, chain, address, setAddress, onDone, onCancel, top }: { orgId: string; chain: NetworkId; address: string; setAddress: (v: string) => void; onDone: (wallet: OrgWallet) => void; onCancel: () => void; top: ReactNode }) {
  const t = useT();
  const w = t.dash.wallets;
  const [again, setAgain] = useState("");
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const account = address.trim();
  const valid = isNetworkAddress(chain, account);
  const matches = again.trim() !== "" && sameNetworkAddress(chain, account, again) && account === again.trim();
  const network = networkName(chain);

  const add = async () => {
    if (!valid || !matches || busy) return;
    setBusy(true);
    setProblem(null);
    try {
      const wallet = await orgsApi.connectWallet(orgId, { chain, address: account, provider: "address", addressConfirm: again.trim(), label: label.trim() || undefined });
      announce();
      showToast(w.connected);
      onDone(wallet);
    } catch (e) {
      setProblem((e as Error)?.message || w.connectError);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {top}
      <Field label={fmt(w.addressOn, { network })} value={address} onChange={(e: { target: { value: string } }) => setAddress(e.target.value)} placeholder={placeholderFor(chain)} spellCheck={false} autoComplete="off" disabled={busy} aria-invalid={account !== "" && !valid ? true : undefined} />
      <div className="zka-exists" role="note" aria-labelledby="wl-addr-t">
        <div className="zka-exists-head">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9.5" /><path d="M12 7.5v5.5M12 16.4v.1" /></svg>
          <b id="wl-addr-t">{w.byAddressTitle}</b>
        </div>
        <p className="zka-exists-meta">{w.byAddressDesc}</p>
      </div>
      <Field label={w.addressAgain} value={again} onChange={(e: { target: { value: string } }) => setAgain(e.target.value)} placeholder={placeholderFor(chain)} spellCheck={false} autoComplete="off" disabled={busy} aria-invalid={again.trim() !== "" && !matches ? true : undefined} />
      {again.trim() !== "" && !matches && <p className="field-err" role="alert">{w.addressMismatch}</p>}
      <Field label={w.label} hint={t.dash.common.optional} value={label} onChange={(e: { target: { value: string } }) => setLabel(e.target.value)} placeholder={w.labelPlaceholder} maxLength={WALLET_LABEL_MAX} disabled={busy} />
      {busy && <p className="work-progress" role="status"><span className="work-spin" aria-hidden="true" /><span>{w.adding}</span></p>}
      {problem && <p className="field-err" role="alert">{problem}</p>}
      <div className="modal-actions">
        <button type="button" className="btn btn-violet" onClick={add} disabled={busy || !valid || !matches}>{w.add}</button>
        <button type="button" className="btn btn-soft" onClick={onCancel} disabled={busy}>{t.dash.common.cancel}</button>
      </div>
    </>
  );
}

export function ConnectWalletDialog({ orgId, chain, onClose, onConnected }: { orgId: string; chain?: NetworkId; onClose: () => void; onConnected?: (wallet: OrgWallet) => void }) {
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
const WALLET_ALLOWED = { wchain: ["all", ...NETWORKS_BY_NAME], wdate: [...DATE_RANGES] };
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
    matchesQuery([x.label, x.address, networkName(x.chain)], filters.wq);
  const rows = all.filter((x) => matches(x, null));
  const chainCounts = countBy(all.filter((x) => matches(x, "chain")), (x) => x.chain);
  const pg = usePaged(rows, JSON.stringify(filters));
  const nameOf = (x: OrgWallet) => x.label || networkName(x.chain);
  // The filter offers the networks the organization has wallets on (and the one chosen), by name.
  const walletNetworks = NETWORKS_BY_NAME.filter((c) => all.some((x) => x.chain === c) || filters.wchain === c);
  const explorer = (x: OrgWallet) => explorerAccountUrl(x.chain, tierOf(network), x.address);
  // What proved it: the wallet that signed the challenge, the standard of the signature pasted back
  // or made by the network's wallet, a signed XDR, or nothing (an address that cannot sign).
  const provenWith = (x: OrgWallet) =>
    x.provider === "freighter" ? "Freighter" : x.provider === "phantom" ? "Phantom" : x.provider === "solflare" ? "Solflare" : x.provider === "evm" ? w.browserWallet
      : x.provider === "address" ? w.byAddress
      : x.provider && STANDARD_NAMES[x.provider] ? fmt(w.signedMessage, { standard: STANDARD_NAMES[x.provider]! })
      : w.signedXdr;
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
        selects={[{ key: "wchain", label: fl.network, value: filters.wchain, onChange: (v) => set("wchain", v), options: [{ key: "all", label: fl.allNetworks }, ...walletNetworks.map((c) => ({ key: c, label: networkName(c), icon: <NetworkMark chain={c} size={18} />, count: chainCounts[c] || 0 }))] }]}
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
                          preview={() => <PreviewCard label={w.detail} title={x.address} wrap headline={<b>{name}</b>} fields={[[w.tableHead.network, networkName(x.chain)], [w.provenWith, provenWith(x)], [w.tableHead.added, fmtDateTime(x.createdAt)]]} />}
                        >{name}</RecordLink>
                      </span>
                    </td>
                    <td className="cust">{networkName(x.chain)}</td>
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
            [w.tableHead.network, <span key="n" className="cell-mark"><NetworkMark chain={open.chain} size={18} />{networkName(open.chain)}</span>],
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
export function WalletSelect({ orgId, chain, value, onChange, canConnect, label, id, hint }: { orgId: string; chain: NetworkId; value: string; onChange: (address: string) => void; canConnect: boolean; label: string; id: string; hint?: string }) {
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
          <span>{wallets === null ? w.loadError : fmt(w.noneForChain, { network: networkName(chain) })}</span>
          {wallets !== null && (canConnect
            ? <button type="button" className="btn btn-outline-w btn-sm" onClick={() => setConnecting(true)}>{w.connect}</button>
            : <span className="field-help">{w.askAdmin}</span>)}
        </div>
      )}
      {hint && mine.length > 0 && !connecting && <p className="field-help" id={`${id}-h`}>{hint}</p>}
    </div>
  );
}

/* The account a merchant fee on a network paid through a deposit address is credited to: the
   cross-chain route credits it inside itself, to a NEAR account or an EVM address, never to an
   address on the link's network. So the choice is the organization's NEAR wallets and its EVM
   ones (one address on every EVM network: listed once, lowercase, as the route stores it), never
   a typed address. Whoever may connect wallets gets "add a NEAR wallet" inline. */
export function RouteFeeWalletSelect({ orgId, value, onChange, canConnect, label, id, hint }: { orgId: string; value: string; onChange: (account: string) => void; canConnect: boolean; label: string; id: string; hint?: string }) {
  const t = useT();
  const w = t.dash.wallets;
  const wallets = useOrgWallets(orgId);
  const accounts = useMemo(() => {
    const seen = new Set<string>();
    const out: { account: string; chain: NetworkId; label: string | null }[] = [];
    for (const x of wallets || []) {
      if (!isRouteFeeWallet(x.chain, x.address)) continue;
      const account = routeFeeAccount(x.address);
      if (seen.has(account)) continue;
      seen.add(account);
      out.push({ account, chain: x.chain, label: x.label });
    }
    return out;
  }, [wallets]);
  const [connecting, setConnecting] = useState(false);

  // Always one of the list: the first when nothing (or something no longer listed) is chosen.
  useEffect(() => {
    if (wallets === undefined) return;
    if (accounts.length && !accounts.some((x) => x.account === value)) onChange(accounts[0].account);
    if (!accounts.length && value) onChange("");
  }, [wallets, accounts]);

  const labelId = `${id}-l`;
  return (
    <div className="fld">
      <span className="field-l" id={labelId}>{label}</span>
      {wallets === undefined ? (
        <Sk className="lg" w="100%" />
      ) : connecting ? (
        <div className="wl-inline arrive">
          <ConnectWalletForm orgId={orgId} chain="near" lockChain onDone={(wallet) => { setConnecting(false); onChange(routeFeeAccount(wallet.address)); }} onCancel={() => setConnecting(false)} />
        </div>
      ) : accounts.length ? (
        <Select
          id={id}
          labelledBy={labelId}
          describedBy={hint ? `${id}-h` : undefined}
          value={value}
          onChange={(v) => (v === CONNECT ? setConnecting(true) : onChange(v))}
          options={[
            ...accounts.map((x) => ({ value: x.account, label: x.label || shortAddress(x.account), hint: x.label ? shortAddress(x.account) : undefined, icon: <NetworkMark chain={x.chain} size={22} /> })),
            ...(canConnect ? [{ value: CONNECT, label: w.connectAnother }] : []),
          ]}
        />
      ) : (
        <div className="wl-none" role="status">
          <span>{wallets === null ? w.loadError : w.noneForRoute}</span>
          {wallets !== null && (canConnect
            ? <button type="button" className="btn btn-outline-w btn-sm" onClick={() => setConnecting(true)}>{w.connect}</button>
            : <span className="field-help">{w.askAdmin}</span>)}
        </div>
      )}
      {hint && accounts.length > 0 && !connecting && <p className="field-help" id={`${id}-h`}>{hint}</p>}
    </div>
  );
}
