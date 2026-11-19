/* Pieces the payments domain's P2P screens share (the public app, src/components/cosmos/p2p/P2pApp.tsx,
   and the hosted charge page, P2pChargePay.tsx): amounts in the reader's language, an account's
   fields labelled from the shared vocabulary (t.p2p), the form for the account a seller is paid
   into, the countdown, and sending a transaction from the person's own EVM wallet after checking
   it against the order's network (src/lib/p2p/tx-check.ts). */
import { useEffect, useState, type ReactNode } from "react";
import { fmt, useT } from "@/lib/i18n/index";
import { Field, Sel } from "@/components/cosmos/dashboard/components/Field";
import { RAILS, fiatDecimals, isRailId, type FieldError, type RailField } from "@/lib/p2p/rails";
import { checkTransaction, evmChainOf } from "@/lib/p2p/tx-check";
import type { P2pNetwork, P2pTransaction } from "@/lib/p2p/types";
import type { AnyWallet } from "@/lib/wallets/find";
import { countdown, msLeft } from "@/lib/p2p/orders";

export const NBSP = String.fromCharCode(160);

/** Local money with its currency's decimals ("85,000.00 ARS"). */
export function money(lang: string, value: string | number, currency: string): string {
  const n = Number(value);
  const d = fiatDecimals(currency);
  const text = Number.isFinite(n) ? new Intl.NumberFormat(lang, { minimumFractionDigits: d, maximumFractionDigits: d }).format(n) : String(value);
  return `${text}${NBSP}${currency}`;
}

/** The number alone, for a sentence that names the currency itself: local money with its
    currency's decimals when `currency` is given, else a token amount. */
export function amountOnly(lang: string, value: string | number, currency?: string): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value);
  if (currency) {
    const d = fiatDecimals(currency);
    return new Intl.NumberFormat(lang, { minimumFractionDigits: d, maximumFractionDigits: d }).format(n);
  }
  return new Intl.NumberFormat(lang, { maximumFractionDigits: n >= 1 ? 2 : 6 }).format(n);
}

/** A token amount: two decimals from 1 up, up to six below ("59.42 USDC", "0.004215 USDC"). */
export function units(lang: string, value: string | number, symbol: string): string {
  const n = Number(value);
  const text = !Number.isFinite(n) ? String(value) : n >= 1 ? new Intl.NumberFormat(lang, { maximumFractionDigits: 2 }).format(n) : new Intl.NumberFormat(lang, { maximumFractionDigits: 6 }).format(n);
  return `${text}${NBSP}${symbol}`;
}

/** A currency's name in the reader's language ("Argentine peso"), else its code. */
export function currencyName(code: string, lang: string): string {
  try {
    const name = new Intl.DisplayNames([lang], { type: "currency" }).of(code);
    if (name && name !== code) return name.charAt(0).toLocaleUpperCase(lang) + name.slice(1);
  } catch (e) { /* an engine without display names: the code */ }
  return code;
}

export const shortAddress = (a: string) => (a.length > 14 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a);

/** Re-render every second while `active` (a countdown). */
export function useNow(active = true): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active]);
  return now;
}

/** m:ss (or h:mm:ss) until `at`. */
export const timeLeft = (at: string | null | undefined, now: number) => countdown(msLeft(at, now));

/* The kind of an account field, for its label: a rail's own table names it; a field the table does
   not know is plain text under its key. */
export function fieldKind(rail: string, key: string): string {
  if (key === "holderName" || key === "document") return key;
  if (!isRailId(rail)) return "text";
  return RAILS[rail].fields.find((f) => f.key === key)?.kind ?? "text";
}

/** The rows a bank account shows: the holder, the document and each detail, labelled and with
    choice values (a PIX key's type) in words. */
export function accountRows(t: any, account: { rail: string; holderName: string; document?: string | null; details: Record<string, string> }): [string, string][] {
  const p = t.p2p;
  const rows: [string, string][] = [[p.fields.holderName, account.holderName]];
  if (account.document) {
    const docKind = isRailId(account.rail) ? RAILS[account.rail].document : "document";
    rows.push([p.fields[docKind] ?? p.fields.document, account.document]);
  }
  for (const [key, value] of Object.entries(account.details)) {
    const kind = fieldKind(account.rail, key);
    const label = kind === "text" ? key : p.fields[kind] ?? key;
    const shown = (kind === "pixKeyType" || kind === "accountTypeCo" || kind === "accountTypeCl") ? p.options[kind]?.[value] ?? value : value;
    rows.push([label, shown]);
  }
  return rows;
}

/** A field's problem in words: required, its format with the hint, or a check digit. */
export function errorText(t: any, kind: string, error: FieldError | null | undefined): string | undefined {
  if (!error) return undefined;
  const p = t.p2p;
  if (error === "required") return p.errors.required;
  if (error === "checksum") return p.errors.checksum;
  const hint = p.hints[kind];
  return hint ? fmt(p.errors.format, { hint }) : p.errors.formatPlain;
}

export interface AccountDraft {
  holderName: string;
  document: string;
  details: Record<string, string>;
}
export const emptyAccount = (rail: string): AccountDraft => {
  const details: Record<string, string> = {};
  if (isRailId(rail)) for (const f of RAILS[rail].fields) if (f.options) details[f.key] = f.options[0];
  return { holderName: "", document: "", details };
};

/** The account a seller is paid into, per rail: the holder, their document and the rail's fields,
    each checked as it is typed (src/lib/p2p/rails.ts checkAccount), the problem shown once the
    field was left. */
export function AccountFields({ rail, value, onChange, errors, idPrefix, showAll = false }: {
  rail: string;
  value: AccountDraft;
  onChange: (next: AccountDraft) => void;
  errors: Record<string, FieldError>;
  idPrefix: string;
  /* Every field's problem, left or not (the form's button was pressed). */
  showAll?: boolean;
}) {
  const t = useT();
  const p = t.p2p as any;
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const leave = (key: string) => () => setTouched((x) => ({ ...x, [key]: true }));
  const show = (key: string) => (touched[key] || showAll ? errors[key] : undefined);
  const known = isRailId(rail) ? RAILS[rail] : null;
  const fields: RailField[] = known ? [...known.fields] : Object.keys(value.details).map((key) => ({ key, kind: "text" as const }));
  const docKind = known?.document ?? "document";
  const set = (key: string, v: string) => onChange({ ...value, details: { ...value.details, [key]: v } });
  return (
    <div className="p2pa-fields" id={idPrefix}>
      <Field
        label={p.fields.holderName} value={value.holderName} autoComplete="name" placeholder={p.placeholders.holderName}
        onChange={(e: any) => onChange({ ...value, holderName: e.target.value })} onBlur={leave("holderName")}
        aria-invalid={show("holderName") ? true : undefined} hint={errorText(t, "holderName", show("holderName"))}
      />
      <Field
        label={`${p.fields[docKind] ?? p.fields.document}${known?.documentOptional ? ` ${t.dash.common.optional}` : ""}`}
        value={value.document} autoComplete="off" spellCheck={false} placeholder={p.placeholders[docKind] ?? ""}
        onChange={(e: any) => onChange({ ...value, document: e.target.value })} onBlur={leave("document")}
        aria-invalid={show("document") ? true : undefined} hint={errorText(t, docKind, show("document")) ?? p.hints[docKind]}
      />
      {fields.map((f, i) => f.options
        ? (
          <Sel
            key={f.key} label={p.fields[f.kind] ?? f.key} value={value.details[f.key] ?? f.options[0]}
            onChange={(v: string) => set(f.key, v)} options={[...f.options]} labels={p.options[f.kind] ?? {}}
          />
        )
        : (
          <Field
            key={f.key} label={f.kind === "text" ? f.key : p.fields[f.kind] ?? f.key} value={value.details[f.key] ?? ""}
            autoComplete="off" spellCheck={false} placeholder={p.placeholders[f.kind] ?? ""}
            onChange={(e: any) => set(f.key, e.target.value)} onBlur={leave(f.key)}
            aria-invalid={show(f.key) ? true : undefined}
            hint={errorText(t, f.kind, show(f.key)) ?? (f.oneOf && i === fields.findIndex((x) => x.oneOf === f.oneOf) ? p.hints.oneOf : p.hints[f.kind])}
          />
        ))}
    </div>
  );
}

/** The status of one step: a mark and its words (decorative mark, the words carry it). */
export function StepMark({ state }: { state: "todo" | "active" | "done" }) {
  return <span className={`p2pa-step-dot is-${state}`} aria-hidden="true" />;
}

export class TxRefused extends Error {}

/** Send one transaction from the connected EVM wallet once it matches the order's network (the
    market contract, or the token for an approval), and wait until the network confirms it. */
export async function sendChecked(
  wallet: AnyWallet,
  from: string,
  tx: P2pTransaction,
  network: P2pNetwork,
  opts: { approveToken?: string | null; onMining?: () => void; messages: { mismatch: string; reverted: string } },
): Promise<string> {
  if (wallet.ecosystem !== "evm") throw new TxRefused(opts.messages.mismatch);
  if (checkTransaction(tx, network, opts.approveToken)) throw new TxRefused(opts.messages.mismatch);
  const hash = await wallet.sendTransaction({ from, to: tx.to, data: tx.data, value: "0x0", chainId: tx.chainId }, evmChainOf(network) as never);
  opts.onMining?.();
  const receipt = await (wallet as AnyWallet & { waitForTransaction: (h: string) => Promise<{ status: string }> }).waitForTransaction(hash);
  if (receipt.status !== "success") throw new TxRefused(opts.messages.reverted);
  return hash;
}

/** A labelled row of a definition list. */
export function Row({ k, children }: { k: string; children: ReactNode }) {
  return <div><dt>{k}</dt><dd>{children}</dd></div>;
}
