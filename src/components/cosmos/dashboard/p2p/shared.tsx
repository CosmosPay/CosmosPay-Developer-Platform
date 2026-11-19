/* The P2P market's shared pieces for the dashboard's P2P views: the market and the lists they read
   (through /api/p2p/*), how amounts, networks, tokens, statuses and deadlines are drawn, and
   WalletTxDialog, the one way an on-chain action happens here: the Payments API builds the
   unsigned transaction (POST /v1/p2p/transactions), the person picks one of the EVM wallets this
   browser has (WalletSign over EIP-6963) and sends it from the registered wallet itself. Cosmos
   Pay never holds a key that can move these funds. */
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useT, useLang, fmt } from "@/lib/i18n/index";
import { p2p as p2pApi } from "@/lib/api-client";
import { Modal, showToast } from "@/components/cosmos/shared";
import { IcCheck } from "@/components/cosmos/icons";
import { Pill } from "@/components/cosmos/dashboard/components/Pill";
import { TokenMark } from "@/components/cosmos/dashboard/components/TokenMark";
import { NetworkMark } from "@/components/cosmos/dashboard/components/OrgWallets";
import { AddressLink } from "@/components/cosmos/dashboard/components/AddressLink";
import { RecordLink } from "@/components/cosmos/dashboard/components/RecordLink";
import { PreviewCard, shortAddress } from "@/components/cosmos/dashboard/components/RecordPreview";
import { CopyBlock } from "@/components/cosmos/dashboard/components/PayLinkDetail";
import { WalletSign, type WalletProgress } from "@/components/cosmos/dashboard/components/WalletSign";
import { NETWORK_NAMES } from "@/lib/chains";
import { activeDeadline, countdown, msLeft, orderPill, orderTone } from "@/lib/p2p/orders";
import { fiatDecimals, type FieldError, type FieldKind } from "@/lib/p2p/rails";
import type { P2pAccount, P2pMarket, P2pNetwork, P2pOrder, P2pTransaction } from "@/lib/p2p/types";

export { p2pApi };

/* --- The market, read once per environment and shared by every view --- */

const markets = new Map<string, Promise<P2pMarket>>();

/** The market (undefined while it loads, null when it could not be read). */
export function useP2pMarket(env: string, orgId: string): P2pMarket | null | undefined {
  const [market, setMarket] = useState<P2pMarket | null | undefined>(undefined);
  useEffect(() => {
    let alive = true;
    setMarket(undefined);
    let p = markets.get(env);
    if (!p) {
      p = p2pApi.get("market", env, orgId) as Promise<P2pMarket>;
      markets.set(env, p);
      p.catch(() => markets.delete(env));
    }
    p.then((m) => { if (alive) setMarket(m && Array.isArray(m.networks) ? m : null); })
      .catch(() => { if (alive) setMarket(null); });
    return () => { alive = false; };
  }, [env, orgId]);
  return market;
}

/** Rows of a list route: its `{ data }` page, or a plain array. */
export const rowsOf = <T,>(res: unknown): T[] => (Array.isArray(res) ? res : Array.isArray((res as { data?: unknown })?.data) ? (res as { data: T[] }).data : []);

/** A list the view reads (and reads again on `reload`, or every `pollMs` while visible). An
    answer for an environment or organization the view has since left is dropped. */
export function useP2pList<T>(path: string, env: string, orgId: string, pollMs = 0) {
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const key = useRef("");
  const load = useCallback((quiet = false) => {
    const k = `${path}|${env}|${orgId}`;
    key.current = k;
    if (!quiet) setLoading(true);
    return p2pApi.get(path, env, orgId, { take: 100 })
      .then((res) => { if (key.current === k) { setRows(rowsOf<T>(res)); setError(false); } })
      .catch(() => { if (key.current === k && !quiet) setError(true); })
      .finally(() => { if (key.current === k) setLoading(false); });
  }, [path, env, orgId]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!pollMs) return;
    const id = setInterval(() => { if (!document.hidden) load(true); }, pollMs);
    return () => clearInterval(id);
  }, [pollMs, load]);
  return { rows, setRows, loading, error, reload: () => load(true) };
}

/** The registered wallets (accounts), shared by most views. */
export function useP2pAccounts(env: string, orgId: string) {
  return useP2pList<P2pAccount>("accounts", env, orgId);
}

/** A ticking clock for countdowns. */
export function useNow(ms = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}

/* --- Words and numbers --- */

export const networkOf = (market: P2pMarket | null | undefined, id: string): P2pNetwork | null => market?.networks.find((n) => n.id === id) ?? null;
export const networkName = (market: P2pMarket | null | undefined, id: string) =>
  networkOf(market, id)?.name ?? (NETWORK_NAMES as Record<string, string>)[id] ?? id;

const NBSP = String.fromCharCode(160);

/** Local money with its decimals (none for Chilean pesos) and its code: "150,000.00 ARS". */
export function fiatText(amount: string | number | null | undefined, currency: string, lang: string): string {
  const n = Number(amount);
  if (amount === null || amount === undefined || !Number.isFinite(n)) return "-";
  // Cents only when there are any: "150,000 ARS", "1,431.98 ARS".
  const d = Number.isInteger(n) ? 0 : fiatDecimals(currency);
  return `${new Intl.NumberFormat(lang, { minimumFractionDigits: d, maximumFractionDigits: d }).format(n)}${NBSP}${currency}`;
}

/** A token amount, trailing zeros dropped: two decimals in lists ("104.75 USDC"), up to six where
    the exact amount matters (an order's detail, what a wallet signs). */
export function tokenText(amount: string | number | null | undefined, symbol: string, lang: string, digits = 2): string {
  const n = Number(amount);
  if (amount === null || amount === undefined || !Number.isFinite(n)) return "-";
  return `${new Intl.NumberFormat(lang, { maximumFractionDigits: digits }).format(n)}${NBSP}${symbol}`;
}

/** A sum of USD stablecoins as a plain figure, cents at most: "23,820.5". */
export function usdFigure(amount: number, lang: string): string {
  return new Intl.NumberFormat(lang, { maximumFractionDigits: 2 }).format(Number.isFinite(amount) ? amount : 0);
}

/** Seconds as the shortest unit that reads well: "45 s", "12 min", "6 h", "2 d". */
export function durationText(t: any, seconds: number | null | undefined): string {
  const s = Number(seconds);
  if (!Number.isFinite(s) || s < 0) return "-";
  const d = t.p2p.durations;
  if (s < 90) return fmt(d.seconds, { n: Math.round(s) });
  if (s < 5400) return fmt(d.minutes, { n: Math.round(s / 60) });
  if (s < 172_800) return fmt(d.hours, { n: Math.round(s / 3600) });
  return fmt(d.days, { n: Math.round(s / 86_400) });
}

/** A field's error in the reader's language. */
export function fieldErrorText(t: any, kind: FieldKind | string, code: FieldError | string | null | undefined): string {
  if (!code) return "";
  const e = t.p2p.errors;
  if (code === "format") {
    const hint = t.p2p.hints[kind];
    return hint ? fmt(e.format, { hint }) : e.formatPlain;
  }
  return e[code] || e.formatPlain;
}

export const railName = (t: any, id: string) => t.p2p.rails[id] || id;

/** The explorer page of an account or a transaction on a market network, or null. */
export function explorerUrl(market: P2pMarket | null | undefined, network: string, kind: "address" | "tx", value: string): string | null {
  const base = networkOf(market, network)?.explorer;
  return base && value ? `${base.replace(/\/+$/, "")}/${kind}/${value}` : null;
}

/* --- Marks and cells --- */

export function NetworkCell({ market, id, size = 18 }: { market: P2pMarket | null | undefined; id: string; size?: number }) {
  return <span className="cell-mark"><NetworkMark chain={id} size={size} /><span>{networkName(market, id)}</span></span>;
}

export function P2pTokenMark({ market, network, symbol, size = 22 }: { market: P2pMarket | null | undefined; network: string; symbol: string; size?: number }) {
  return <TokenMark symbol={symbol} chain={network} chainName={networkName(market, network)} size={size} />;
}

export function OrderStatus({ status }: { status: string }) {
  const t = useT();
  return <Pill st={orderPill(status)} tone={orderTone(status)} label={t.p2p.status[status] || status} />;
}

/** An account as a reference: the explorer on its network, copy, and its card. */
export function P2pAddress({ market, network, address, label }: { market: P2pMarket | null | undefined; network: string; address: string | null | undefined; label?: string }) {
  return <AddressLink chain={network} address={address} label={label} explorer={address ? explorerUrl(market, network, "address", address) : null} networkName={networkName(market, network)} />;
}

/** A transaction as a reference (explorer, copy, card). */
export function P2pTx({ market, network, hash, label }: { market: P2pMarket | null | undefined; network: string; hash: string | null | undefined; label: string }) {
  if (!hash) return <span>-</span>;
  return (
    <RecordLink href={explorerUrl(market, network, "tx", hash)} external className="addr-link" title={hash} copy={hash}
      preview={() => <PreviewCard label={label} title={hash} wrap fields={[[label, networkName(market, network)]]} />}>
      <code>{shortAddress(hash)}</code>
    </RecordLink>
  );
}

/** The deadline running on an order, counting down (nothing once none runs). */
export function OrderCountdown({ order, compact = false }: { order: Pick<P2pOrder, "status" | "deadlines">; compact?: boolean }) {
  const t = useT();
  const now = useNow();
  const d = activeDeadline(order);
  if (!d) return compact ? <span className="p2p-cd is-none">-</span> : null;
  const left = msLeft(d.at, now);
  const text = left > 0 ? fmt(t.p2p.deadlines[d.kind], { time: countdown(left) }) : t.p2p.deadlines.over;
  // In a list cell the clock alone (0:00 in red once over); the sentence is its accessible name.
  return <span className={`p2p-cd${left <= 0 ? " is-over" : left < 5 * 60_000 ? " is-soon" : ""}`} role="timer" aria-live="off" aria-label={compact ? text : undefined}>{compact ? countdown(left) : text}</span>;
}

/* --- Sending what the Payments API built, from the person's own wallet --- */

/** The chain description a wallet needs to switch to (or add) a market network. */
export function evmChainOf(n: P2pNetwork) {
  return {
    chainId: n.chainId,
    chainName: n.name,
    nativeCurrency: { name: n.nativeSymbol || "ETH", symbol: n.nativeSymbol || "ETH", decimals: 18 },
    rpcUrls: n.rpcUrl ? [n.rpcUrl] : [],
    ...(n.explorer ? { blockExplorerUrls: [n.explorer] } : {}),
  };
}

/** A built transaction is only sent when it is the network's and it moves no native coin. */
export function isSendable(tx: P2pTransaction | null | undefined, network: P2pNetwork): tx is P2pTransaction {
  return !!tx && tx.chainId === network.chainId && /^0x[0-9a-fA-F]{40}$/.test(tx.to) && /^0x[0-9a-fA-F]*$/.test(tx.data) && (tx.value === "0" || tx.value === "0x0" || !tx.value);
}

export interface TxStep {
  key: string;
  label: string;
  /* Builds this step's transaction (the server checks it against what it names). */
  build: () => Promise<P2pTransaction>;
}

/** Send `tx` from `wallet` on `network` and wait for it to be mined; throws when it reverts. */
export async function sendFromWallet(wallet: any, from: string, tx: P2pTransaction, network: P2pNetwork, progress: WalletProgress, t: any): Promise<string> {
  if (wallet.ecosystem !== "evm") throw new Error(t.p2p.tx.evmOnly);
  if (!isSendable(tx, network)) throw new Error(t.p2p.tx.mismatch);
  progress(fmt(t.dash.wallet.confirmIn, { wallet: wallet.name }));
  const hash = await wallet.sendTransaction({ from, to: tx.to, data: tx.data, value: "0", chainId: tx.chainId }, network.rpcUrl ? evmChainOf(network) : undefined);
  progress(t.p2p.tx.mining);
  const receipt = await wallet.waitForTransaction(hash);
  if (receipt.status !== "success") throw new Error(t.p2p.tx.reverted);
  return hash;
}

/** The dialog every on-chain action of the P2P views goes through: what it does, its steps
    (approve and deposit are two), the wallets this browser has, and the transactions for any
    other wallet. It cannot be closed while a wallet is working. */
export function WalletTxDialog({ eyebrow, title, signer, network, market, fields = [], steps, onDone, onClose, note = null }: {
  eyebrow: string;
  title: string;
  /* The registered wallet that must send it (another account's signature would not count). */
  signer: string;
  network: P2pNetwork;
  market: P2pMarket | null | undefined;
  fields?: [string, ReactNode][];
  steps: TxStep[];
  onDone: (hashes: string[]) => void;
  onClose: () => void;
  note?: ReactNode;
}) {
  const t = useT();
  const x = t.p2p.tx;
  const [done, setDone] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [manual, setManual] = useState<P2pTransaction[] | null>(null);
  const [manualBusy, setManualBusy] = useState(false);
  const finished = done.length === steps.length;

  const run = async (wallet: any, address: string, progress: WalletProgress) => {
    setBusy(true);
    try {
      const hashes = [...done];
      for (let i = done.length; i < steps.length; i++) {
        progress(fmt(x.building, { step: steps[i].label }));
        const tx = await steps[i].build();
        const hash = await sendFromWallet(wallet, address, tx, network, progress, t);
        hashes.push(hash);
        setDone([...hashes]);
      }
      showToast(x.sent);
      onDone(hashes);
    } finally {
      setBusy(false);
    }
  };

  const showManual = async () => {
    if (manualBusy) return;
    setManualBusy(true);
    try {
      const txs = [];
      for (const s of steps) txs.push(await s.build());
      setManual(txs);
    } catch (e: any) {
      showToast(e?.message || x.buildFailed, "error");
    } finally {
      setManualBusy(false);
    }
  };

  return (
    <Modal onClose={() => { if (!busy) onClose(); }} label={title}>
      <div className="modal-body paylink-detail p2p-tx">
        <div className="modal-eyebrow">{eyebrow}</div>
        <h3>{title}</h3>
        {fields.length > 0 && (
          <div className="paylink-fields" style={{ marginBottom: 14 }}>
            {fields.filter(([, v]) => v !== null && v !== undefined && v !== "").map(([k, v]) => (
              <div className="paylink-field" key={k}><span className="pf-k">{k}</span><span className="pf-v">{v}</span></div>
            ))}
          </div>
        )}
        {note}
        {steps.length > 1 && (
          <ol className="p2p-steps" aria-label={x.steps}>
            {steps.map((s, i) => (
              <li key={s.key} className={i < done.length ? "is-done" : i === done.length && busy ? "is-current" : ""}>
                <span className="p2p-step-n" aria-hidden="true">{i < done.length ? <IcCheck /> : i + 1}</span>
                <span>{s.label}</span>
                <small>{x.whoSigns}</small>
              </li>
            ))}
          </ol>
        )}
        {!finished && (
          <WalletSign
            ecosystem="evm" chainName={network.name} signer={signer} busy={busy}
            title={fmt(x.signWith, { account: shortAddress(signer) })}
            onUse={run}
          />
        )}
        {finished && <p className="p2p-done" role="status"><IcCheck /> {x.sent}</p>}
        {!finished && (manual
          ? manual.map((tx, i) => <CopyBlock key={i} label={steps.length > 1 ? `${i + 1}. ${steps[i].label}` : x.unsigned} value={JSON.stringify({ chainId: tx.chainId, from: signer, to: tx.to, data: tx.data, value: tx.value }, null, 2)} lang="json" />)
          : <button type="button" className="link-btn p2p-manual" onClick={showManual} disabled={manualBusy}>{x.otherWallet}</button>)}
        <div className="modal-actions">
          <button type="button" className="btn btn-soft" onClick={onClose} disabled={busy}>{finished ? t.ui.close : t.dash.common.cancel}</button>
        </div>
      </div>
    </Modal>
  );
}

/** Build one transaction through the Payments API (`from` is a registered wallet's id). */
export const buildTx = (env: string, orgId: string, body: { network: string; from: string; action: string; args: Record<string, unknown> }) =>
  p2pApi.post("transactions", env, orgId, body) as Promise<P2pTransaction>;

/** A registered wallet's name for a person: its label, else its address shortened. */
export const accountName = (a: P2pAccount | null | undefined) => (a ? a.label || shortAddress(a.address) : "-");

/** A warning or a decision explained, as a component (never a bare paragraph): the panel the
    private accounts' dialog uses. */
export function Notice({ title, children, id }: { title: ReactNode; children?: ReactNode; id: string }) {
  return (
    <div className="zka-exists" role="note" aria-labelledby={id}>
      <div className="zka-exists-head">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9.5" /><path d="M12 7.5v5.5M12 16.4v.1" /></svg>
        <b id={id}>{title}</b>
      </div>
      {children && <p className="zka-exists-meta">{children}</p>}
    </div>
  );
}

/** A checkbox in the dashboard's look, with an optional line under its label. */
export function Check({ checked, onChange, label, hint, disabled = false }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode; hint?: ReactNode; disabled?: boolean }) {
  return (
    <label className={`chk p2p-chk${checked ? " on" : ""}`}>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={() => onChange(!checked)} />
      <span className="chk-box">{checked && <IcCheck />}</span>
      <span className="p2p-chk-t">{label}{hint && <small>{hint}</small>}</span>
    </label>
  );
}

/** The wallets a select offers: each registered wallet by name, its address as the hint. */
export const accountOptions = (accounts: P2pAccount[]) => accounts.map((a) => ({ value: a.id, label: accountName(a), hint: shortAddress(a.address) }));

/** The networks a select offers, each with its mark. */
export const networkOptions = (market: P2pMarket | null | undefined) =>
  (market?.networks ?? []).map((n) => ({ value: n.id, label: n.name, icon: <NetworkMark chain={n.id} size={18} /> }));
