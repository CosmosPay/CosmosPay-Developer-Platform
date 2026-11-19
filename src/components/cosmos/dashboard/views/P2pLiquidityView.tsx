/* P2pLiquidityView: the organization's wallets on the P2P market and what each holds there.
   Figures first; then the wallets (registered with a signature over a single-use challenge, the
   wallet's EIP-191 personal_sign; a wallet can be a merchant with a public name), their balances
   per network and token (free, locked in orders, and the most one order may lock for Cosmos Pay's
   matcher), and the bots each wallet authorised. Every deposit, withdrawal, authorisation and
   bot is a transaction the Payments API builds and the wallet itself sends (WalletTxDialog); the
   view only reads what the contract then holds. */
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useT, useLang, fmt } from "@/lib/i18n/index";
import { Modal, showToast } from "@/components/cosmos/shared";
import { ConfirmModal } from "@/components/cosmos/ui/ConfirmModal";
import { IcCopy } from "@/components/cosmos/icons";
import { DI } from "@/components/cosmos/dashboard/icons";
import { fmtDate, fmtWhen } from "@/components/cosmos/dashboard/helpers";
import { usePaged, useGsapRows, useListFilters, useUrlRequest } from "@/components/cosmos/dashboard/hooks";
import { ViewHead } from "@/components/cosmos/dashboard/components/ViewHead";
import { ViewFigures } from "@/components/cosmos/dashboard/components/ActivityPanel";
import { FilterBar } from "@/components/cosmos/dashboard/components/FilterBar";
import { TableSkeleton } from "@/components/cosmos/dashboard/components/Skeleton";
import { FillRows } from "@/components/cosmos/dashboard/components/FillRows";
import { Pagination } from "@/components/cosmos/dashboard/components/Pagination";
import { RowMenu } from "@/components/cosmos/dashboard/components/RowMenu";
import { RecordLink } from "@/components/cosmos/dashboard/components/RecordLink";
import { RecordDetail } from "@/components/cosmos/dashboard/components/RecordDetail";
import { PreviewCard, shortAddress } from "@/components/cosmos/dashboard/components/RecordPreview";
import { Pill } from "@/components/cosmos/dashboard/components/Pill";
import { StatusIcon } from "@/components/cosmos/dashboard/components/StatusIcon";
import { Field } from "@/components/cosmos/dashboard/components/Field";
import { Select } from "@/components/cosmos/dashboard/components/Select";
import { WalletSign } from "@/components/cosmos/dashboard/components/WalletSign";
import { NetworkMark } from "@/components/cosmos/dashboard/components/OrgWallets";
import { FormSteps, FormStep, FormStepsFooter, useFormSteps } from "@/components/cosmos/dashboard/components/FormSteps";
import { BulkActions, SelectCell, SelectHead, useBulkDelete, useSelection } from "@/components/cosmos/dashboard/components/BulkSelect";
import { countBy, matchesQuery } from "@/lib/dashboard-filters";
import { fromBaseUnits, toBaseUnits } from "@/lib/p2p/amounts";
import { OPERATOR_PERM_KEYS, maskToPerms, permsToMask, type OperatorPerm } from "@/lib/p2p/perms";
import type { P2pAccount, P2pMarket, P2pNetwork } from "@/lib/p2p/types";
import {
  p2pApi, useP2pMarket, useP2pList, networkOf, networkName, tokenText, usdFigure, NetworkCell, P2pTokenMark, P2pAddress,
  WalletTxDialog, buildTx, accountName, Notice, Check, accountOptions, networkOptions,
} from "@/components/cosmos/dashboard/p2p/shared";

const EVM = /^0x[0-9a-fA-F]{40}$/;
const utf8Hex = (text: string) => `0x${Array.from(new TextEncoder().encode(text), (b) => b.toString(16).padStart(2, "0")).join("")}`;

/* One row of the balances table: a wallet's token on a network, with the matcher's terms there. */
interface BalanceRow {
  key: string;
  account: P2pAccount;
  network: string;
  symbol: string;
  decimals: number;
  free: string;
  locked: string;
  cap: string | null;
  autoSettle: boolean;
}
interface BotRow { key: string; account: P2pAccount; network: string; address: string; perms: number }

type Action =
  | { kind: "deposit" | "withdraw"; account: P2pAccount; network?: string; symbol?: string }
  | { kind: "matcher"; account: P2pAccount; network?: string; cap?: string | null; autoSettle?: boolean }
  | { kind: "bot"; account?: P2pAccount; network?: string; address?: string; perms?: number };

export function P2pLiquidityView({ canManage = false, orgId, env = "dev" }: { canManage?: boolean; orgId: string; env?: string }) {
  const t = useT();
  const lang = useLang();
  const p = t.p2p.liquidity;
  const cm = t.dash.common;
  const fl = t.dash.filters;
  const market = useP2pMarket(env, orgId);
  const accounts = useP2pList<P2pAccount>("accounts", env, orgId);
  // Each wallet's on-chain state, read live (GET accounts/{id}).
  const [details, setDetails] = useState<Record<string, P2pAccount>>({});
  const [chainsLoading, setChainsLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [detail, setDetail] = useState<P2pAccount | null>(null);
  const [action, setAction] = useState<Action | null>(null);
  const [toDelete, setToDelete] = useState<P2pAccount | null>(null);
  const [revoke, setRevoke] = useState<BotRow | null>(null);

  const readChains = (list: P2pAccount[]) => {
    setChainsLoading(true);
    return Promise.all(list.map((a) => p2pApi.get(`accounts/${encodeURIComponent(a.id)}`, env, orgId).catch(() => null)))
      .then((res) => setDetails(Object.fromEntries(res.filter(Boolean).map((a: P2pAccount) => [a.id, a]))))
      .finally(() => setChainsLoading(false));
  };
  useEffect(() => { if (!accounts.loading) readChains(accounts.rows); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [accounts.loading, accounts.rows]);
  // After a transaction, the contract shows it a moment later: read again twice.
  const refreshSoon = () => { setTimeout(() => readChains(accounts.rows), 5000); setTimeout(() => readChains(accounts.rows), 12000); };

  const [createReq, clearCreate] = useUrlRequest("create");
  useEffect(() => { if (createReq) { clearCreate(); if (canManage) setRegistering(true); } /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [createReq]);

  const balances: BalanceRow[] = useMemo(() => accounts.rows.flatMap((a) => (details[a.id]?.chains ?? []).flatMap((c) => c.balances.map((b) => ({
    key: `${a.id}:${c.network}:${b.symbol}`, account: a, network: c.network, symbol: b.symbol, decimals: b.decimals,
    free: fromBaseUnits(b.freeUnits, b.decimals), locked: fromBaseUnits(b.lockedUnits, b.decimals),
    cap: c.matcher ? fromBaseUnits(c.matcher.maxPerOrderUnits, b.decimals) : null, autoSettle: !!c.matcher?.autoSettle,
  })))), [accounts.rows, details]);
  const bots: BotRow[] = useMemo(() => accounts.rows.flatMap((a) => (details[a.id]?.chains ?? []).flatMap((c) => c.operators.map((o) => ({ key: `${a.id}:${c.network}:${o.address}`, account: a, network: c.network, address: o.address, perms: o.perms })))), [accounts.rows, details]);

  const freeTotal = balances.reduce((s, b) => s + Number(b.free), 0);
  const lockedTotal = balances.reduce((s, b) => s + Number(b.locked), 0);
  const authorised = new Set(balances.filter((b) => b.cap !== null).map((b) => `${b.account.id}:${b.network}`)).size;
  const figures = [
    { key: "wallets", label: p.figures.wallets, value: accounts.rows.length, sub: ((n) => (n === 1 ? p.figures.merchantsOne : fmt(p.figures.merchants, { n })))(accounts.rows.filter((a) => a.merchant).length) },
    { key: "free", label: p.figures.free, value: usdFigure(freeTotal, lang), sub: p.figures.stable },
    { key: "locked", label: p.figures.locked, value: usdFigure(lockedTotal, lang), sub: p.figures.inOrders },
    { key: "matcher", label: p.figures.matcher, value: authorised, sub: p.figures.matcherSub },
  ];

  // The wallets table.
  const wDefaults = useMemo(() => ({ q: "", status: "all" }), []);
  const { filters, set, reset, active } = useListFilters(wDefaults, { status: ["all", "merchant", "active", "paused", "plain"] });
  const stateOf = (a: P2pAccount) => (!a.merchant ? "plain" : a.merchant.status === "ACTIVE" ? "active" : "paused");
  const wMatch = (a: P2pAccount, skip?: string) =>
    (skip === "status" || filters.status === "all" || (filters.status === "merchant" ? !!a.merchant : stateOf(a) === filters.status)) &&
    matchesQuery([a.label, a.address, a.merchant?.displayName], filters.q);
  const wView = accounts.rows.filter((a) => wMatch(a));
  const wCounts = countBy(accounts.rows.filter((a) => wMatch(a, "status")), stateOf);
  const pg = usePaged(wView, JSON.stringify(filters));
  const tref = useRef(null); useGsapRows(tref, pg.page + "|" + wView.length);
  const sel = useSelection(canManage ? wView.map((a) => a.id) : []);
  const bulk = useBulkDelete({
    sel, nameOf: (id) => accountName(accounts.rows.find((a) => a.id === id)),
    remove: (id) => p2pApi.remove(`accounts/${encodeURIComponent(id)}`, env, orgId),
    onRemoved: (ids) => accounts.setRows((x) => x.filter((a) => !ids.includes(a.id))),
  });
  const freeOf = (a: P2pAccount) => balances.filter((b) => b.account.id === a.id).reduce((s, b) => s + Number(b.free), 0);

  const remove = () => {
    const a = toDelete;
    if (!a) return;
    p2pApi.remove(`accounts/${encodeURIComponent(a.id)}`, env, orgId)
      .then(() => { accounts.setRows((x) => x.filter((y) => y.id !== a.id)); setToDelete(null); setDetail(null); showToast(p.removed); })
      .catch((e) => { setToDelete(null); showToast(e?.message || p.removeFailed, "error"); });
  };

  const walletItems = (a: P2pAccount) => [
    { key: "open", label: cm.details, icon: DI.docs, onClick: () => setDetail(a) },
    ...(canManage ? [
      { key: "deposit", label: p.deposit, icon: DI.download, onClick: () => setAction({ kind: "deposit", account: a }) },
      { key: "withdraw", label: p.withdraw, icon: DI.refresh, onClick: () => setAction({ kind: "withdraw", account: a }) },
      { key: "matcher", label: p.authorise, icon: DI.key, onClick: () => setAction({ kind: "matcher", account: a }) },
      { key: "bot", label: p.bots.add, icon: DI.developers, onClick: () => setAction({ kind: "bot", account: a }) },
    ] : []),
    { key: "copy", label: cm.copyAccount, icon: <IcCopy />, onClick: () => navigator.clipboard?.writeText(a.address).then(() => showToast(t.toasts.copied)).catch(() => {}) },
    ...(canManage ? [{ key: "delete", label: p.remove, icon: DI.trash, danger: true, onClick: () => setToDelete(a) }] : []),
  ];

  const firstNet = market?.networks[0]?.id ?? "base";
  const actions = canManage && (sel.count
    ? <BulkActions sel={sel} onDelete={bulk.ask} busy={bulk.busy} />
    : <button type="button" className="btn btn-dark btn-sm" onClick={() => setRegistering(true)} disabled={!market}>{DI.plus} {p.register}</button>);
  const loading = accounts.loading;

  return (
    <>
      <ViewHead title={p.title} />
      <ViewFigures items={figures} loading={loading || chainsLoading} failed={accounts.error} label={p.figuresLabel} />
      {!canManage && <div className="note-bar" style={{ marginBottom: 16 }}>{DI.key}<span>{p.readOnly}</span></div>}
      <FilterBar
        label={fl.label}
        query={filters.q} onQuery={(v) => set("q", v)} placeholder={p.search}
        status={{
          label: fl.status, value: filters.status, onChange: (v) => set("status", v),
          options: [
            { key: "all", label: fl.allStatuses, count: accounts.rows.filter((a) => wMatch(a, "status")).length },
            { key: "active", label: p.state.active, count: wCounts.active || 0, icon: <StatusIcon tone="ok" size={16} /> },
            { key: "paused", label: p.state.paused, count: wCounts.paused || 0, icon: <StatusIcon tone="off" size={16} /> },
            { key: "plain", label: p.state.plain, count: wCounts.plain || 0, icon: <StatusIcon tone="wait" size={16} /> },
          ],
        }}
        active={active} onReset={reset}
        shown={wView.length} total={loading ? undefined : accounts.rows.length} loading={loading}
        actions={actions}
      />
      <div className="panel">
        {loading && <TableSkeleton label={p.loading} cols={6} />}
        {!loading && (
          <div className="t-scroll" tabIndex={0} ref={tref}><table className="tx p2p-t"><thead><tr>
            {canManage && <SelectHead sel={sel} pageIds={pg.slice.map((a) => a.id)} />}
            <th>{p.head.wallet}</th><th>{p.head.address}</th><th>{p.head.merchant}</th><th>{p.head.free}</th><th>{p.head.verified}</th>
            <th><span className="sr-only">{cm.actions}</span></th>
          </tr></thead>
            <tbody>{!accounts.error && pg.slice.map((a) => (
              <tr key={a.id} className="row-click" onClick={() => setDetail(a)}>
                {canManage && <SelectCell sel={sel} id={a.id} name={accountName(a)} />}
                <td className="tid" onClick={(e) => e.stopPropagation()}>
                  <div className="cust-cell">
                    <span className="am-sq">{DI.balances}</span>
                    <RecordLink onOpen={() => setDetail(a)} copy={a.id} title={a.id}
                      preview={() => <PreviewCard label={p.head.wallet} title={a.address} wrap headline={<b>{accountName(a)}</b>} fields={[[p.head.merchant, a.merchant?.displayName || p.state.plain], [p.head.verified, fmtDate(a.verifiedAt)]]} />}
                    >{accountName(a)}</RecordLink>
                  </div>
                </td>
                <td onClick={(e) => e.stopPropagation()}><P2pAddress market={market} network={firstNet} address={a.address} label={p.head.address} /></td>
                <td>{a.merchant
                  ? <Pill st={a.merchant.status === "ACTIVE" ? "ok" : a.merchant.status === "SUSPENDED" ? "fail" : "ref"} tone={a.merchant.status === "ACTIVE" ? "ok" : a.merchant.status === "SUSPENDED" ? "fail" : "off"} label={`${a.merchant.displayName || "-"} · ${p.state[a.merchant.status === "ACTIVE" ? "active" : a.merchant.status === "SUSPENDED" ? "suspended" : "paused"]}`} />
                  : <span className="cust">{p.state.plain}</span>}</td>
                <td className="amt">{chainsLoading ? "…" : usdFigure(freeOf(a), lang)}</td>
                <td className="cust">{fmtWhen(a.verifiedAt)}</td>
                <td className="row-actions" onClick={(e) => e.stopPropagation()}>
                  <button type="button" className="icon-mini" title={cm.details} aria-label={`${cm.details}: ${accountName(a)}`} onClick={() => setDetail(a)}>{DI.docs}</button>
                  {canManage && <button type="button" className="icon-mini" title={p.deposit} aria-label={`${p.deposit}: ${accountName(a)}`} onClick={() => setAction({ kind: "deposit", account: a })} disabled={!market}>{DI.download}</button>}
                  {canManage && <button type="button" className="icon-mini danger" title={p.remove} aria-label={`${p.remove}: ${accountName(a)}`} onClick={() => setToDelete(a)}>{DI.trash}</button>}
                  <RowMenu label={fmt(cm.rowActions, { name: accountName(a) })} items={walletItems(a)} />
                </td>
              </tr>
            ))}
              <FillRows n={pg.size - (accounts.error ? 0 : pg.count)} cols={canManage ? 7 : 6} empty={accounts.error ? p.listError : null} />
            </tbody>
          </table></div>
        )}
        {!loading && <Pagination {...pg} />}
      </div>

      <BalancesSection market={market} rows={balances} loading={loading || chainsLoading} canManage={canManage} onAction={setAction} />
      <BotsSection market={market} rows={bots} loading={loading || chainsLoading} canManage={canManage} hasWallets={accounts.rows.length > 0} onAdd={() => setAction({ kind: "bot" })} onEdit={(b) => setAction({ kind: "bot", account: b.account, network: b.network, address: b.address, perms: b.perms })} onRevoke={setRevoke} />

      {registering && market && (
        <RegisterWalletModal env={env} orgId={orgId} onClose={() => setRegistering(false)} onRegistered={(a) => { accounts.setRows((x) => [...x, a]); setRegistering(false); readChains([...accounts.rows, a]); }} />
      )}
      {detail && (
        <WalletDetail
          account={detail} chains={details[detail.id]} market={market} env={env} orgId={orgId} canManage={canManage}
          onClose={() => setDetail(null)}
          onSaved={(a) => { accounts.setRows((x) => x.map((y) => (y.id === a.id ? { ...y, ...a } : y))); setDetail(null); }}
          onAction={(act) => { setDetail(null); setAction(act); }}
          onDelete={() => setToDelete(detail)}
        />
      )}
      {action && market && (
        <ActionDialog action={action} market={market} accounts={accounts.rows} balances={balances} env={env} orgId={orgId}
          onClose={() => setAction(null)} onDone={() => { setAction(null); refreshSoon(); }} />
      )}
      {revoke && market && networkOf(market, revoke.network) && (
        <WalletTxDialog
          eyebrow={p.bots.title} title={p.bots.revokeTitle} signer={revoke.account.address} network={networkOf(market, revoke.network)!} market={market}
          fields={[[p.bots.address, <code>{revoke.address}</code>], [p.head.wallet, accountName(revoke.account)], [t.dash.filters.network, networkName(market, revoke.network)]]}
          steps={[{ key: "revoke", label: p.bots.revoke, build: () => buildTx(env, orgId, { network: revoke.network, from: revoke.account.id, action: "setOperator", args: { operator: revoke.address, perms: 0 } }) }]}
          onClose={() => setRevoke(null)} onDone={() => { setRevoke(null); refreshSoon(); }}
        />
      )}
      {bulk.dialog}
      {toDelete && <ConfirmModal title={p.removeTitle} body={fmt(p.removeBody, { name: accountName(toDelete) })} confirmLabel={p.remove} cancelLabel={cm.cancel} onConfirm={remove} onClose={() => setToDelete(null)} />}
    </>
  );
}

/* The balances: one row per wallet, network and token. */
function BalancesSection({ market, rows, loading, canManage, onAction }: { market: P2pMarket | null | undefined; rows: BalanceRow[]; loading: boolean; canManage: boolean; onAction: (a: Action) => void }) {
  const t = useT();
  const lang = useLang();
  const p = t.p2p.liquidity;
  const cm = t.dash.common;
  const fl = t.dash.filters;
  const defaults = useMemo(() => ({ balq: "", balnet: "all" }), []);
  const { filters, set, reset, active } = useListFilters(defaults);
  const match = (b: BalanceRow, skip?: string) => (skip === "net" || filters.balnet === "all" || b.network === filters.balnet) && matchesQuery([accountName(b.account), b.account.address, b.symbol, networkName(market, b.network)], filters.balq);
  const view = rows.filter((b) => match(b));
  const netCounts = countBy(rows.filter((b) => match(b, "net")), (b) => b.network);
  const pg = usePaged(view, JSON.stringify(filters));
  return (
    <section className="hub-section p2p-sec" aria-labelledby="p2p-bal-t">
      <div className="hub-section-head"><h2 id="p2p-bal-t">{p.balances.title}</h2></div>
      <FilterBar
        label={fl.label} query={filters.balq} onQuery={(v) => set("balq", v)} placeholder={p.balances.search}
        selects={[{ key: "balnet", label: fl.network, value: filters.balnet, onChange: (v) => set("balnet", v), options: [{ key: "all", label: fl.allNetworks, count: rows.filter((b) => match(b, "net")).length }, ...(market?.networks ?? []).map((n) => ({ key: n.id, label: n.name, count: netCounts[n.id] || 0, icon: <NetworkMark chain={n.id} size={18} /> }))] }]}
        active={active} onReset={reset} shown={view.length} total={loading ? undefined : rows.length} loading={loading}
      />
      <div className="panel">
        {loading && <TableSkeleton label={p.loading} cols={7} />}
        {!loading && (
          <div className="t-scroll" tabIndex={0}><table className="tx p2p-t"><thead><tr>
            <th>{p.balances.token}</th><th>{p.head.wallet}</th><th>{fl.network}</th><th>{p.balances.free}</th><th>{p.balances.locked}</th><th>{p.balances.cap}</th>
            <th><span className="sr-only">{cm.actions}</span></th>
          </tr></thead>
            <tbody>{pg.slice.map((b) => (
              <tr key={b.key}>
                <td><span className="cell-mark"><P2pTokenMark market={market} network={b.network} symbol={b.symbol} /><span>{b.symbol}</span></span></td>
                <td className="cust">{accountName(b.account)}</td>
                <td><NetworkCell market={market} id={b.network} /></td>
                <td className="amt">{tokenText(b.free, b.symbol, lang)}</td>
                <td className="amt">{tokenText(b.locked, b.symbol, lang)}</td>
                <td className="cust">{b.cap === null ? p.balances.noMatcher : fmt(p.balances.capValue, { amount: tokenText(b.cap, b.symbol, lang) })}</td>
                <td className="row-actions">
                  {canManage && <button type="button" className="icon-mini" title={p.deposit} aria-label={`${p.deposit}: ${b.symbol} ${networkName(market, b.network)}`} onClick={() => onAction({ kind: "deposit", account: b.account, network: b.network, symbol: b.symbol })}>{DI.download}</button>}
                  {canManage && <button type="button" className="icon-mini" title={p.withdraw} disabled={!(Number(b.free) > 0)} aria-label={`${p.withdraw}: ${b.symbol} ${networkName(market, b.network)}`} onClick={() => onAction({ kind: "withdraw", account: b.account, network: b.network, symbol: b.symbol })}>{DI.refresh}</button>}
                  <RowMenu label={fmt(cm.rowActions, { name: `${b.symbol} ${networkName(market, b.network)}` })} items={canManage ? [
                    { key: "deposit", label: p.deposit, icon: DI.download, onClick: () => onAction({ kind: "deposit", account: b.account, network: b.network, symbol: b.symbol }) },
                    { key: "withdraw", label: p.withdraw, icon: DI.refresh, disabled: !(Number(b.free) > 0), hint: p.balances.nothingFree, onClick: () => onAction({ kind: "withdraw", account: b.account, network: b.network, symbol: b.symbol }) },
                    { key: "matcher", label: b.cap === null ? p.authorise : p.changeCap, icon: DI.key, onClick: () => onAction({ kind: "matcher", account: b.account, network: b.network, cap: b.cap, autoSettle: b.autoSettle }) },
                  ] : [{ key: "copy", label: cm.copyAccount, icon: <IcCopy />, onClick: () => navigator.clipboard?.writeText(b.account.address).catch(() => {}) }]} />
                </td>
              </tr>
            ))}
              <FillRows n={pg.size - pg.count} cols={7} />
            </tbody>
          </table></div>
        )}
        {!loading && <Pagination {...pg} />}
      </div>
    </section>
  );
}

/* The bots: operators a wallet authorised on a network, with what each may do. */
function BotsSection({ market, rows, loading, canManage, hasWallets, onAdd, onEdit, onRevoke }: {
  market: P2pMarket | null | undefined; rows: BotRow[]; loading: boolean; canManage: boolean; hasWallets: boolean;
  onAdd: () => void; onEdit: (b: BotRow) => void; onRevoke: (b: BotRow) => void;
}) {
  const t = useT();
  const p = t.p2p.liquidity;
  const cm = t.dash.common;
  const fl = t.dash.filters;
  const defaults = useMemo(() => ({ botq: "" }), []);
  const { filters, set, reset, active } = useListFilters(defaults);
  const view = rows.filter((b) => matchesQuery([b.address, accountName(b.account), networkName(market, b.network)], filters.botq));
  const pg = usePaged(view, JSON.stringify(filters));
  const permsText = (mask: number) => maskToPerms(mask).map((k) => p.perms[k].title).join(", ") || "-";
  return (
    <section className="hub-section p2p-sec" aria-labelledby="p2p-bots-t">
      <div className="hub-section-head"><h2 id="p2p-bots-t">{p.bots.title}</h2></div>
      <FilterBar
        label={fl.label} query={filters.botq} onQuery={(v) => set("botq", v)} placeholder={p.bots.search}
        active={active} onReset={reset} shown={view.length} total={loading ? undefined : rows.length} loading={loading}
        actions={canManage && <button type="button" className="btn btn-dark btn-sm" onClick={onAdd} disabled={!hasWallets || !market} title={!hasWallets ? p.bots.needWallet : undefined}>{DI.plus} {p.bots.add}</button>}
      />
      <div className="panel">
        {loading && <TableSkeleton label={p.loading} cols={5} />}
        {!loading && (
          <div className="t-scroll" tabIndex={0}><table className="tx p2p-t"><thead><tr>
            <th>{p.bots.address}</th><th>{p.head.wallet}</th><th>{fl.network}</th><th>{p.bots.perms}</th>
            <th><span className="sr-only">{cm.actions}</span></th>
          </tr></thead>
            <tbody>{pg.slice.map((b) => (
              <tr key={b.key}>
                <td className="tid"><div className="cust-cell"><span className="am-sq">{DI.developers}</span><P2pAddress market={market} network={b.network} address={b.address} label={p.bots.address} /></div></td>
                <td className="cust">{accountName(b.account)}</td>
                <td><NetworkCell market={market} id={b.network} /></td>
                <td className="cust">{permsText(b.perms)}</td>
                <td className="row-actions">
                  {canManage && <button type="button" className="icon-mini" title={p.bots.edit} aria-label={`${p.bots.edit}: ${shortAddress(b.address)}`} onClick={() => onEdit(b)}>{DI.edit}</button>}
                  {canManage && <button type="button" className="icon-mini danger" title={p.bots.revoke} aria-label={`${p.bots.revoke}: ${shortAddress(b.address)}`} onClick={() => onRevoke(b)}>{DI.trash}</button>}
                  <RowMenu label={fmt(cm.rowActions, { name: shortAddress(b.address) })} items={[
                    ...(canManage ? [{ key: "edit", label: p.bots.edit, icon: DI.edit, onClick: () => onEdit(b) }] : []),
                    { key: "copy", label: cm.copyAccount, icon: <IcCopy />, onClick: () => navigator.clipboard?.writeText(b.address).then(() => showToast(t.toasts.copied)).catch(() => {}) },
                    ...(canManage ? [{ key: "revoke", label: p.bots.revoke, icon: DI.trash, danger: true, onClick: () => onRevoke(b) }] : []),
                  ]} />
                </td>
              </tr>
            ))}
              <FillRows n={pg.size - pg.count} cols={5} />
            </tbody>
          </table></div>
        )}
        {!loading && <Pagination {...pg} />}
      </div>
    </section>
  );
}

/* Registering a wallet: its name (and whether it is a merchant), then the wallet's signature over a
   single-use challenge the Payments API issues for that address. Nothing is stored before the
   signature is checked. */
function RegisterWalletModal({ env, orgId, onClose, onRegistered }: { env: string; orgId: string; onClose: () => void; onRegistered: (a: P2pAccount) => void }) {
  const t = useT();
  const p = t.p2p.liquidity;
  const r = p.registerForm;
  const steps = useFormSteps(2);
  const [label, setLabel] = useState("");
  const [merchant, setMerchant] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const canNext = !merchant || displayName.trim().length >= 2;
  const sign = async (wallet: any, address: string, progress: (s: string) => void) => {
    if (wallet.ecosystem !== "evm") return;
    setBusy(true);
    try {
      progress(r.challenge);
      const ch = await p2pApi.post("accounts/challenge", env, orgId, { address });
      progress(fmt(t.dash.wallet.confirmIn, { wallet: wallet.name }));
      const signature = await wallet.provider.request({ method: "personal_sign", params: [utf8Hex(ch.message), address] });
      progress(r.checking);
      // The server takes the open challenge it issued for this address; a merchant is named at once.
      const account: P2pAccount = await p2pApi.post("accounts", env, orgId, { address, signature, label: label.trim() || undefined, displayName: merchant ? displayName.trim() : undefined });
      showToast(r.done);
      onRegistered(account);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal onClose={() => { if (!busy) onClose(); }} label={r.title}>
      <div className="modal-body">
        <div className="modal-eyebrow">{p.title}</div>
        <h3>{r.title}</h3>
        <FormSteps names={[r.stepDetails, r.stepSign]} steps={steps} />
        <FormStep steps={steps}>
          {steps.step === 0 && (
            <>
              <Field label={r.label} hint={t.dash.common.optional} value={label} onChange={(e) => setLabel(e.target.value)} placeholder={r.labelPlaceholder} maxLength={60} autoFocus />
              <Check checked={merchant} onChange={setMerchant} label={r.merchant} hint={r.merchantHint} />
              {merchant && <Field label={r.displayName} hint={r.displayNameHint} value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder={t.dash.examples.customerName} maxLength={40} />}
            </>
          )}
          {steps.step === 1 && (
            <>
              <Notice id="p2p-reg-sign" title={r.signTitle}>{r.signBody}</Notice>
              <WalletSign ecosystem="evm" chainName="EVM" busy={busy} title={r.pickWallet} onUse={sign} />
            </>
          )}
        </FormStep>
        <FormStepsFooter steps={steps} canNext={canNext} onCancel={onClose} submitLabel={r.waiting} onSubmit={() => {}} submitDisabled busy={busy} />
      </div>
    </Modal>
  );
}

/* A wallet's detail: its balances per network, its merchant profile (name and whether it takes
   orders) and its actions. */
function WalletDetail({ account, chains, market, env, orgId, canManage, onClose, onSaved, onAction, onDelete }: {
  account: P2pAccount; chains?: P2pAccount; market: P2pMarket | null | undefined; env: string; orgId: string; canManage: boolean;
  onClose: () => void; onSaved: (a: P2pAccount) => void; onAction: (a: Action) => void; onDelete: () => void;
}) {
  const t = useT();
  const lang = useLang();
  const p = t.p2p.liquidity;
  const [label, setLabel] = useState(account.label ?? "");
  const [name, setName] = useState(account.merchant?.displayName ?? "");
  const [status, setStatus] = useState<"ACTIVE" | "PAUSED">(account.merchant?.status === "PAUSED" ? "PAUSED" : "ACTIVE");
  const [busy, setBusy] = useState(false);
  const suspended = account.merchant?.status === "SUSPENDED";
  const save = () => {
    setBusy(true);
    const body: Record<string, unknown> = { label: label.trim() };
    if (name.trim() && !suspended) Object.assign(body, { displayName: name.trim(), merchantStatus: status });
    p2pApi.patch(`accounts/${encodeURIComponent(account.id)}`, env, orgId, body)
      .then((a) => { showToast(p.saved); onSaved(a); })
      .catch((e) => showToast(e?.message || p.saveFailed, "error"))
      .finally(() => setBusy(false));
  };
  const stats = account.merchant?.stats;
  const held = (chains?.chains ?? []).flatMap((c) => c.balances.filter((b) => b.freeUnits !== "0" || b.lockedUnits !== "0").map((b) => [
    `${b.symbol} · ${networkName(market, c.network)}`,
    `${tokenText(fromBaseUnits(b.freeUnits, b.decimals), b.symbol, lang)} · ${fmt(p.lockedValue, { amount: tokenText(fromBaseUnits(b.lockedUnits, b.decimals), b.symbol, lang) })}`,
  ] as [string, string]));
  return (
    <RecordDetail
      eyebrow={p.head.wallet} title={accountName(account)} onClose={onClose}
      fields={[
        [p.head.address, <P2pAddress market={market} network={market?.networks[0]?.id ?? "base"} address={account.address} label={p.head.address} />],
        [p.head.verified, fmtDate(account.verifiedAt)],
        ...held,
        ...(stats ? [[p.stats.completed, String(stats.completed)], [p.stats.cancelled, String(stats.cancelled)], [p.stats.disputesLost, String(stats.disputesLost)]] as [string, string][] : []),
      ]}
      actions={canManage ? [
        { key: "deposit", label: p.deposit, icon: DI.download, kind: "dark", onClick: () => onAction({ kind: "deposit", account }) },
        { key: "withdraw", label: p.withdraw, icon: DI.refresh, onClick: () => onAction({ kind: "withdraw", account }) },
        { key: "matcher", label: p.authorise, icon: DI.key, onClick: () => onAction({ kind: "matcher", account }) },
        { key: "bot", label: p.bots.add, icon: DI.developers, onClick: () => onAction({ kind: "bot", account }) },
        { key: "delete", label: p.remove, icon: DI.trash, kind: "danger", onClick: onDelete },
      ] : []}
    >
      {canManage && (
        <div className="p2p-form-block">
          <Field label={p.registerForm.label} value={label} onChange={(e) => setLabel(e.target.value)} maxLength={60} />
          <Field label={p.registerForm.displayName} hint={suspended ? p.suspended : p.registerForm.displayNameHint} value={name} onChange={(e) => setName(e.target.value)} maxLength={40} disabled={suspended} />
          {name.trim() && !suspended && (
            <div className="fld">
              <span className="field-l" id="p2p-ms-l">{p.merchantStatus}</span>
              <Select value={status} onChange={(v) => setStatus(v as "ACTIVE" | "PAUSED")} labelledBy="p2p-ms-l" options={[{ value: "ACTIVE", label: p.state.active }, { value: "PAUSED", label: p.state.paused }]} />
            </div>
          )}
          <div className="modal-actions"><button type="button" className="btn btn-violet btn-sm" onClick={save} disabled={busy}>{p.save}</button></div>
        </div>
      )}
    </RecordDetail>
  );
}

/* Deposit, withdraw, the matcher's authorisation and a bot: a short form, then the wallet. */
function ActionDialog({ action, market, accounts, balances, env, orgId, onClose, onDone }: {
  action: Action; market: P2pMarket; accounts: P2pAccount[]; balances: BalanceRow[]; env: string; orgId: string; onClose: () => void; onDone: () => void;
}) {
  const t = useT();
  const lang = useLang();
  const p = t.p2p.liquidity;
  const fl = t.dash.filters;
  const [accountId, setAccountId] = useState(action.account?.id ?? accounts[0]?.id ?? "");
  const [network, setNetwork] = useState(action.network ?? market.networks[0]?.id ?? "");
  const net: P2pNetwork | null = networkOf(market, network);
  const [symbol, setSymbol] = useState(action.kind === "deposit" || action.kind === "withdraw" ? action.symbol ?? net?.tokens[0]?.symbol ?? "" : net?.tokens[0]?.symbol ?? "");
  const token = net?.tokens.find((x) => x.symbol === symbol) ?? net?.tokens[0] ?? null;
  const [amount, setAmount] = useState(action.kind === "matcher" ? action.cap ?? "" : "");
  const [autoSettle, setAutoSettle] = useState(action.kind === "matcher" ? !!action.autoSettle : false);
  const [bot, setBot] = useState(action.kind === "bot" ? action.address ?? "" : "");
  const [perms, setPerms] = useState<OperatorPerm[]>(action.kind === "bot" && action.perms ? maskToPerms(action.perms) : ["release", "trade"]);
  const [signing, setSigning] = useState(false);
  useEffect(() => { if (net && !net.tokens.some((x) => x.symbol === symbol)) setSymbol(net.tokens[0]?.symbol ?? ""); }, [network]); // eslint-disable-line react-hooks/exhaustive-deps
  const account = accounts.find((a) => a.id === accountId) ?? null;
  const bal = balances.find((b) => b.account.id === accountId && b.network === network && b.symbol === token?.symbol);
  const units = token ? toBaseUnits(amount, token.decimals) : null;
  const isMerchant = !!account?.merchant;

  const kindTitle = action.kind === "deposit" ? p.deposit : action.kind === "withdraw" ? p.withdraw : action.kind === "matcher" ? p.authorise : action.kind === "bot" && action.address ? p.bots.edit : p.bots.add;
  let problem = "";
  if (!account) problem = p.form.pickWallet;
  else if (!net || !token) problem = p.form.pickNetwork;
  else if (action.kind === "deposit" || action.kind === "withdraw") {
    if (!amount.trim()) problem = p.form.enterAmount;
    else if (!units || units === "0") problem = fmt(p.form.badAmount, { n: token.decimals });
    else if (action.kind === "withdraw" && bal && Number(amount) > Number(bal.free)) problem = p.form.overFree;
  } else if (action.kind === "matcher") {
    if (!amount.trim()) problem = p.form.enterCap;
    else if (units === null) problem = fmt(p.form.badAmount, { n: token.decimals });
  } else if (action.kind === "bot") {
    if (!EVM.test(bot.trim())) problem = p.form.badBot;
    else if (bot.trim().toLowerCase() === account.address.toLowerCase()) problem = p.form.selfBot;
    else if (!perms.length) problem = p.form.pickPerms;
  }

  if (signing && account && net && token) {
    const base = { network: net.id, from: account.id };
    const fields: [string, ReactNode][] = [[p.head.wallet, accountName(account)], [fl.network, net.name]];
    let steps;
    if (action.kind === "deposit") {
      fields.push([p.form.amount, tokenText(amount, token.symbol, lang)]);
      steps = [
        { key: "approve", label: fmt(p.form.approveStep, { token: token.symbol }), build: () => buildTx(env, orgId, { ...base, action: "approve", args: { token: token.symbol, amount } }, token.decimals) },
        { key: "deposit", label: p.form.depositStep, build: () => buildTx(env, orgId, { ...base, action: "deposit", args: { token: token.symbol, amount } }, token.decimals) },
      ];
    } else if (action.kind === "withdraw") {
      fields.push([p.form.amount, tokenText(amount, token.symbol, lang)]);
      steps = [{ key: "withdraw", label: p.withdraw, build: () => buildTx(env, orgId, { ...base, action: "withdraw", args: { token: token.symbol, amount } }, token.decimals) }];
    } else if (action.kind === "matcher") {
      fields.push([p.form.cap, Number(amount) > 0 ? tokenText(amount, token.symbol, lang) : p.form.revoked], [p.form.matcher, <code>{shortAddress(market.matcher)}</code>]);
      steps = [{ key: "matcher", label: p.authorise, build: () => buildTx(env, orgId, { ...base, action: "setMatcher", args: { maxPerOrder: amount, autoSettle: !isMerchant && autoSettle } }, token.decimals) }];
    } else {
      fields.push([p.bots.address, <code>{bot.trim()}</code>], [p.bots.perms, perms.map((k) => p.perms[k].title).join(", ")]);
      steps = [{ key: "bot", label: kindTitle, build: () => buildTx(env, orgId, { ...base, action: "setOperator", args: { operator: bot.trim(), perms: permsToMask(perms) } }) }];
    }
    return <WalletTxDialog eyebrow={p.title} title={kindTitle} signer={account.address} network={net} market={market} fields={fields} steps={steps} onClose={onClose} onDone={onDone} />;
  }

  return (
    <Modal onClose={onClose} label={kindTitle}>
      <div className="modal-body">
        <div className="modal-eyebrow">{p.title}</div>
        <h3>{kindTitle}</h3>
        <div className="field-row">
          <div className="fld">
            <span className="field-l" id="p2p-act-w">{p.head.wallet}</span>
            <Select value={accountId} onChange={setAccountId} labelledBy="p2p-act-w" options={accountOptions(accounts)} disabled={!!action.account} />
          </div>
          <div className="fld">
            <span className="field-l" id="p2p-act-n">{fl.network}</span>
            <Select value={network} onChange={setNetwork} labelledBy="p2p-act-n" options={networkOptions(market)} disabled={!!action.network} />
          </div>
        </div>
        {(action.kind === "deposit" || action.kind === "withdraw") && net && (
          <div className="field-row">
            <div className="fld">
              <span className="field-l" id="p2p-act-t">{p.balances.token}</span>
              <Select value={token?.symbol ?? ""} onChange={setSymbol} labelledBy="p2p-act-t" disabled={net.tokens.length < 2} options={net.tokens.map((x) => ({ value: x.symbol, label: x.symbol, icon: <P2pTokenMark market={market} network={net.id} symbol={x.symbol} size={18} /> }))} />
            </div>
            <Field label={p.form.amount} hint={bal ? fmt(p.form.freeNow, { amount: tokenText(bal.free, bal.symbol, lang) }) : undefined} value={amount} onChange={(e) => setAmount(e.target.value.trim().replace(",", "."))} inputMode="decimal" placeholder="0" aria-invalid={amount.trim() && !!problem ? true : undefined} />
          </div>
        )}
        {action.kind === "deposit" && <Notice id="p2p-dep-n" title={p.form.depositTitle}>{p.form.depositBody}</Notice>}
        {action.kind === "matcher" && (
          <>
            <Field label={p.form.cap} hint={p.form.capHint} value={amount} onChange={(e) => setAmount(e.target.value.trim().replace(",", "."))} inputMode="decimal" placeholder="1000" />
            <Notice id="p2p-matcher-n" title={p.form.matcherTitle}>{p.form.matcherBody}</Notice>
            {!isMerchant && <Check checked={autoSettle} onChange={setAutoSettle} label={p.form.autoSettle} hint={p.form.autoSettleHint} />}
            {!isMerchant && autoSettle && <Notice id="p2p-auto-n" title={p.form.autoSettleRiskTitle}>{p.form.autoSettleRisk}</Notice>}
          </>
        )}
        {action.kind === "bot" && (
          <>
            <Field label={p.bots.address} hint={p.form.botHint} value={bot} onChange={(e) => setBot(e.target.value)} placeholder="0x…" spellCheck={false} autoComplete="off" disabled={!!action.address} aria-invalid={bot.trim() && !EVM.test(bot.trim()) ? true : undefined} />
            <div className="fld">
              <span className="field-l">{p.bots.perms}</span>
              <div className="p2p-perms">
                {OPERATOR_PERM_KEYS.map((k) => (
                  <Check key={k} checked={perms.includes(k)} onChange={(on) => setPerms((x) => (on ? [...x, k] : x.filter((y) => y !== k)))} label={p.perms[k].title} hint={p.perms[k].desc} />
                ))}
              </div>
            </div>
            {perms.includes("withdraw") && <Notice id="p2p-bot-w" title={p.form.withdrawTitle}>{p.form.withdrawBody}</Notice>}
          </>
        )}
        {problem && (amount.trim() || bot.trim() || action.kind === "matcher") && <p className="field-err" role="alert">{problem}</p>}
        <div className="modal-actions">
          <button type="button" className="btn btn-violet" disabled={!!problem} onClick={() => setSigning(true)}>{p.form.continue}</button>
          <button type="button" className="btn btn-soft" onClick={onClose}>{t.dash.common.cancel}</button>
        </div>
      </div>
    </Modal>
  );
}
