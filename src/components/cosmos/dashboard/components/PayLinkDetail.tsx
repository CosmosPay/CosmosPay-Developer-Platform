import { IcCopy, IcCheck, checkoutUrl } from "@/components/cosmos/shared";
import { useCopy } from "@/components/cosmos/hooks/useCopy";
import { useT, fmt } from "@/lib/i18n/index";
import { DI } from "@/components/cosmos/dashboard/icons";
import { RowMenu } from "@/components/cosmos/dashboard/components/RowMenu";
import { TokenMark } from "@/components/cosmos/dashboard/components/TokenMark";
import { CHAIN_NAMES, TEST_NETWORKS, assetLabel as chainAssetLabel, explorerTxUrl, isChain, tierOf } from "@/lib/chains";

/* Map an upstream status to a status-pill class (reuses the existing ok/fail/ref pills). */
export const STATUS_PILL = { SUCCEEDED: "ok", FAILED: "fail", EXPIRED: "fail", CANCELLED: "fail", PENDING: "ref", SUBMITTED: "ref" };

/* The chain a record settles on (Stellar for a record from before chains). */
export const chainOf = (record) => (record && isChain(record.chain) ? record.chain : "stellar");
/* "native" as the chain's coin (XLM, SOL, MON), a code as stored, a long token shortened. */
export function assetLabel(asset, chain = "stellar") { return chainAssetLabel(chain, asset); }
export function amountLabel(intent, pl) { return intent.amount ? `${intent.amount} ${assetLabel(intent.asset, chainOf(intent))}` : pl.anyAmount; }
/* "Solana · Devnet" in the sandbox, "Solana" on mainnet. */
export function networkLabel(record) {
  const chain = chainOf(record);
  return tierOf(record && record.network) === "public" ? CHAIN_NAMES[chain] : `${CHAIN_NAMES[chain]} · ${TEST_NETWORKS[chain]}`;
}

/* The explorer page of the record's on-chain transaction, on its chain and network; null until
   there is a transaction (or when the hash is not one of that chain's). */
export function explorerUrl(intent) {
  return intent ? explorerTxUrl(chainOf(intent), tierOf(intent.network), intent.txHash) : null;
}
export function hasTransaction(intent) { return !!explorerUrl(intent); }

/* Shared table row-actions cell: view the payment, open its transaction (only when one
   exists; otherwise an empty slot keeps the icons in line, never a button that does nothing),
   and delete (only when the caller can manage AND the link isn't paid).
   Reused by the Payments and Balances tables so both behave identically. */
/* A payment's amount with its token's mark (and its network's badge): what the row handles. */
export function PaymentAmount({ intent, pl, size = 24 }) {
  const chain = chainOf(intent);
  return (
    <span className="cell-mark">
      <TokenMark symbol={assetLabel(intent.asset, chain)} chain={chain} chainName={CHAIN_NAMES[chain]} size={size} />
      <span>{amountLabel(intent, pl)}</span>
    </span>
  );
}

/* A payment row's actions. Every row draws the same buttons (product owner: no gaps): the explorer
   is disabled until there is a transaction, deletion once the payment completed, each saying why;
   then the row's "⋮" menu with everything a payment offers. */
export function PayLinkRowActions({ intent, t, pl, onView, canManage = false, onDelete }) {
  const cm = t.dash.common;
  const [, copy] = useCopy();
  const url = explorerUrl(intent);
  const paid = intent.status === "SUCCEEDED";
  const short = intent.id.length > 14 ? `${intent.id.slice(0, 6)}…${intent.id.slice(-4)}` : intent.id;
  return (
    <td className="paylink-row-actions" onClick={(e) => e.stopPropagation()}>
      <button className="icon-mini" title={pl.detail.eyebrow} aria-label={pl.detail.eyebrow} onClick={() => onView(intent)}>{DI.docs}</button>
      {url
        ? <a className="icon-mini" title={t.dash.balances.explorer} aria-label={t.dash.balances.explorer} href={url} target="_blank" rel="noopener noreferrer">{DI.network}</a>
        : <button type="button" className="icon-mini" disabled title={cm.noTxYet} aria-label={`${t.dash.balances.explorer}: ${cm.noTxYet}`}>{DI.network}</button>}
      {canManage && <button className="icon-mini danger" disabled={paid} title={paid ? cm.paidNoDelete : pl.detail.delete} aria-label={paid ? `${pl.detail.delete}: ${cm.paidNoDelete}` : pl.detail.delete} onClick={() => onDelete(intent)}>{DI.trash}</button>}
      <RowMenu
        label={fmt(cm.rowActions, { name: short })}
        items={[
          { key: "open", label: cm.details, icon: DI.docs, onClick: () => onView(intent) },
          { key: "tab", label: cm.openNewTab, icon: DI.link, href: `/dashboard?view=payment&id=${encodeURIComponent(intent.id)}`, external: true },
          { key: "copy", label: cm.copyId, icon: <IcCopy />, onClick: () => copy(intent.id, t.toasts.copied) },
          { key: "link", label: cm.copyLink, icon: <IcCopy />, disabled: intent.status !== "PENDING", hint: cm.notPayable, onClick: () => copy(checkoutUrl(intent.id), t.toasts.copied) },
          { key: "checkout", label: pl.detail.openCheckout, icon: DI.payments, href: checkoutUrl(intent.id), external: true, disabled: intent.status !== "PENDING", hint: cm.notPayable },
          { key: "explorer", label: t.dash.balances.explorer, icon: DI.network, href: url, external: true, disabled: !url, hint: cm.noTxYet },
          ...(canManage ? [{ key: "delete", label: pl.detail.delete, icon: DI.trash, danger: true, disabled: paid, hint: cm.paidNoDelete, onClick: () => onDelete(intent) }] : []),
        ]}
      />
    </td>
  );
}

/* A single copyable key/value row (click anywhere on it to copy the value). */
export function CopyField({ label, value }) {
  const t = useT();
  const [done, copy] = useCopy();
  const text = String(value);
  return (
    <button type="button" className={`paylink-field copyable${done ? " done" : ""}`} onClick={() => copy(text, t.toasts.copied)} title={t.toasts.copy || label}>
      <span className="pf-k">{label}</span>
      <span className="pf-v">{text}</span>
      <span className="pf-copy">{done ? <IcCheck /> : <IcCopy />}</span>
    </button>
  );
}

/* A labelled, copyable long-text block (the SEP-7 URI or the unsigned XDR). */
export function CopyBlock({ label, value, children }) {
  const t = useT();
  const [done, copy] = useCopy();
  return (
    <div className="paylink-block">
      <div className="paylink-block-head">
        <label className="field-l">{label}</label>
        <button type="button" className={`copy-mini${done ? " done" : ""}`} onClick={() => copy(value, t.toasts.copied)} title={t.toasts.copy || label} aria-label={t.toasts.copy || label}>
          {done ? <IcCheck /> : <IcCopy />}
        </button>
      </div>
      <div className="paylink-code" onClick={() => copy(value, t.toasts.copied)} title={t.toasts.copy || label}>{value}</div>
      {children}
    </div>
  );
}
