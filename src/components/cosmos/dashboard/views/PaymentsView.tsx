import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Modal, ConfirmModal, showToast } from "@/components/cosmos/shared";
import { useT, fmt } from "@/lib/i18n/index";
import { paymentIntents as payApi } from "@/lib/api-client";
import { DI } from "@/components/cosmos/dashboard/icons";
import { fmtDateTime } from "@/components/cosmos/dashboard/helpers";
import { usePaged, useGsapRows, usePolling, useListFilters } from "@/components/cosmos/dashboard/hooks";
import { Pill } from "@/components/cosmos/dashboard/components/Pill";
import { ViewHead } from "@/components/cosmos/dashboard/components/ViewHead";
import { Field, Sel } from "@/components/cosmos/dashboard/components/Field";
import { AssetSelect } from "@/components/cosmos/dashboard/components/AssetSelect";
import { TokenSelect } from "@/components/cosmos/dashboard/components/TokenSelect";
import { FilterBar } from "@/components/cosmos/dashboard/components/FilterBar";
import { TableSkeleton } from "@/components/cosmos/dashboard/components/Skeleton";
import { Pagination } from "@/components/cosmos/dashboard/components/Pagination";
import { CheckoutDesignPicker } from "@/components/cosmos/dashboard/components/CheckoutDesignPicker";
import { PayLinkDetailModal, PayLinkRowActions, STATUS_PILL, amountLabel, chainOf, networkLabel } from "@/components/cosmos/dashboard/components/PayLinkDetail";
import { CHAINS, CHAIN_NAMES, TEST_NETWORKS, ADDRESS_PLACEHOLDERS, isAddress } from "@/lib/chains";
import { DATE_RANGES, countBy, inRange, matchesQuery, rangeStart } from "@/lib/dashboard-filters";

const STATUSES = ["PENDING", "SUBMITTED", "SUCCEEDED", "FAILED", "CANCELLED", "EXPIRED"];
const KINDS = ["PAY", "TX"];
const DEFAULTS = { q: "", status: "all", chain: "all", kind: "all", date: "any" };
const ALLOWED = { status: ["all", ...STATUSES], chain: ["all", ...CHAINS], kind: ["all", ...KINDS], date: DATE_RANGES };

export function PaymentsView({ canManage = true, orgId, env = "dev" }) {
  const t = useT();
  const pl = t.dash.paylinks;
  const fl = t.dash.filters;
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const { filters, set, reset, active } = useListFilters(DEFAULTS, ALLOWED);
  const [modal, setModal] = useState(false);   // create modal
  const [detail, setDetail] = useState(null);  // a payment intent shown in the detail modal
  const [toDelete, setToDelete] = useState(null); // a payment intent pending delete confirmation
  const [deleting, setDeleting] = useState(false);

  // The date range is asked of the server (createdFrom), so a 90-day view is not cut at the
  // newest hundred; status, network, type and the search narrow what came back.
  const query = useCallback(() => {
    const from = rangeStart(filters.date);
    return payApi.list(env, { org: orgId, take: 100, ...(from ? { createdFrom: from.toISOString() } : {}) });
  }, [env, orgId, filters.date]);
  const load = useCallback(() => {
    setLoading(true);
    query()
      .then((res) => { setRows(Array.isArray(res?.data) ? res.data : []); setError(false); })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [query]);
  useEffect(() => { load(); }, [load]);
  // Live updates: silently refresh the list while the tab is visible so a payment
  // that settles on-chain flips its status in the table without a manual reload.
  const refresh = useCallback(() => {
    query().then((res) => setRows(Array.isArray(res?.data) ? res.data : [])).catch(() => {});
  }, [query]);
  usePolling(refresh, 8000);

  // The upstream list isn't network-scoped, so separate testnet vs public here to
  // match the active environment switcher (dev → testnet, prod → public).
  const wantNet = env === "prod" ? "public" : "testnet";
  const inEnv = useMemo(() => rows.filter((p) => !p.network || p.network === wantNet), [rows, wantNet]);
  const matches = (p, skip) =>
    (skip === "chain" || filters.chain === "all" || chainOf(p) === filters.chain) &&
    (skip === "kind" || filters.kind === "all" || p.kind === filters.kind) &&
    (skip === "status" || filters.status === "all" || p.status === filters.status) &&
    inRange(p.createdAt, filters.date) &&
    matchesQuery([p.id, p.destination, p.memo, p.reference, p.asset, p.amount, CHAIN_NAMES[chainOf(p)]], filters.q);
  const view = inEnv.filter((p) => matches(p, null));
  // Each control counts what the others leave, so a number says what picking it would show.
  const statusCounts = countBy(inEnv.filter((p) => matches(p, "status")), (p) => p.status);
  const chainCounts = countBy(inEnv.filter((p) => matches(p, "chain")), (p) => chainOf(p));
  const kindCounts = countBy(inEnv.filter((p) => matches(p, "kind")), (p) => p.kind);
  const statusOptions = [
    { key: "all", label: pl.filters.all, count: inEnv.filter((p) => matches(p, "status")).length },
    ...STATUSES.filter((s) => statusCounts[s] || filters.status === s).map((s) => ({ key: s, label: pl.filters[s], count: statusCounts[s] || 0 })),
  ];

  const pg = usePaged(view, JSON.stringify(filters));
  const tref = useRef(null); useGsapRows(tref, pg.page + "|" + view.length);

  const onCreated = (intent) => { setModal(false); setRows((r) => [intent, ...r]); setDetail(intent); };
  const onDeleted = (id) => { setRows((r) => r.filter((x) => x.id !== id)); setDetail(null); };
  // Delete from the table row, confirmed via the shared ConfirmModal.
  const confirmDelete = () => {
    if (!toDelete || deleting) return;
    setDeleting(true);
    payApi.remove(toDelete.id, env)
      .then(() => { onDeleted(toDelete.id); setToDelete(null); })
      .catch((err) => showToast((err && err.message) || pl.deleteError, "error"))
      .finally(() => setDeleting(false));
  };

  return (
    <>
      <ViewHead title={pl.title} sub={fmt(pl.sub, { n: inEnv.length })}>
        {canManage && <button className="btn btn-dark btn-sm" onClick={() => setModal(true)}>{DI.plus} {pl.create}</button>}
      </ViewHead>
      {!canManage && <div className="note-bar" style={{ marginBottom: 16 }}>{DI.link}<span>{pl.readOnly}</span></div>}
      <FilterBar
        label={fl.label}
        query={filters.q} onQuery={(v) => set("q", v)} placeholder={pl.searchPlaceholder}
        status={{ label: fl.status, value: filters.status, onChange: (v) => set("status", v), options: statusOptions }}
        selects={[
          { key: "chain", label: fl.network, value: filters.chain, onChange: (v) => set("chain", v), options: [{ key: "all", label: fl.allNetworks }, ...CHAINS.map((c) => ({ key: c, label: CHAIN_NAMES[c], count: chainCounts[c] || 0 }))] },
          { key: "kind", label: fl.kind, value: filters.kind, onChange: (v) => set("kind", v), options: [{ key: "all", label: fl.allKinds }, ...KINDS.map((k) => ({ key: k, label: pl.kinds[k], count: kindCounts[k] || 0 }))] },
        ]}
        date={filters.date} onDate={(v) => set("date", v)}
        active={active} onReset={reset}
        shown={view.length} total={loading ? undefined : inEnv.length} loading={loading}
      />
      <div className="panel">
        {loading && <TableSkeleton label={pl.loading} cols={6} />}
        {!loading && !error && view.length > 0 && (
          <div className="t-scroll" tabIndex={0} ref={tref}><table className="tx"><thead><tr><th>{pl.tableHead.id}</th><th>{pl.tableHead.type}</th><th>{pl.detail.fields.network}</th><th>{pl.tableHead.amount}</th><th>{pl.tableHead.status}</th><th>{pl.tableHead.created}</th><th><span className="sr-only">{t.dash.common.actions}</span></th></tr></thead>
            <tbody>{pg.slice.map((p) => (
              <tr key={p.id} className="row-click" onClick={() => setDetail(p)}>
                <td className="tid">{p.id}</td>
                <td className="cust">{pl.kinds[p.kind] || p.kind}</td>
                <td><span className="net-badge">{networkLabel(p)}</span></td>
                <td className="amt">{amountLabel(p, pl)}</td>
                <td><Pill st={STATUS_PILL[p.status] || "ref"} label={(pl.status && pl.status[p.status]) || p.status} /></td>
                <td className="cust">{fmtDateTime(p.createdAt)}</td>
                <PayLinkRowActions intent={p} t={t} pl={pl} onView={setDetail} canManage={canManage} onDelete={setToDelete} />
              </tr>
            ))}</tbody>
          </table></div>
        )}
        {!loading && error && <div className="empty">{pl.loadError}</div>}
        {!loading && !error && !view.length && (
          <div className="empty">
            {inEnv.length ? fl.noMatch : pl.empty}
            {inEnv.length > 0 && active > 0 && <div><button type="button" className="fbar-reset" onClick={reset}>{fl.clear}</button></div>}
          </div>
        )}
        {!loading && !error && view.length > 0 && <Pagination {...pg} />}
      </div>
      {modal && <CreatePayLinkModal pl={pl} orgId={orgId} env={env} onClose={() => setModal(false)} onCreated={onCreated} />}
      {detail && <PayLinkDetailModal pl={pl} intent={detail} env={env} canManage={canManage} onClose={() => setDetail(null)} onDeleted={onDeleted} />}
      {toDelete && <ConfirmModal title={pl.detail.deleteTitle} body={fmt(pl.detail.deleteBody, { id: toDelete.id })} confirmLabel={pl.detail.deleteConfirm} cancelLabel={t.dash.common.cancel} onConfirm={confirmDelete} onClose={() => setToDelete(null)} />}
    </>
  );
}

/* ---------------- create modal ---------------- */
/* A payment link on Stellar, Solana or Monad, on the environment's network (Solana devnet and
   Monad testnet in the sandbox). Transaction intents (a known payer) are Stellar's only. */
function CreatePayLinkModal({ pl, orgId, env, onClose, onCreated }) {
  const t = useT();
  const m = pl.modal;
  const tier = env === "prod" ? "public" : "testnet";
  const [chain, setChain] = useState("stellar");
  const [kind, setKind] = useState("pay");
  const [destination, setDestination] = useState("");
  const [source, setSource] = useState("");
  const [amount, setAmount] = useState("");
  const [assetCode, setAssetCode] = useState("");
  const [assetIssuer, setAssetIssuer] = useState("");
  const [memo, setMemo] = useState("");
  const [msg, setMsg] = useState("");
  const [checkoutTheme, setCheckoutTheme] = useState("classic");
  const [busy, setBusy] = useState(false);

  const stellar = chain === "stellar";
  const isTx = stellar && kind === "tx";
  // A new chain starts its addresses and asset over: none of them carry across.
  const pickChain = (c) => {
    if (c === chain) return;
    setChain(c); setKind("pay"); setDestination(""); setSource(""); setAssetCode(""); setAssetIssuer("");
    if (c === "monad") setMsg("");
  };

  const destOk = isAddress(chain, destination);
  const sourceOk = !isTx || isAddress("stellar", source);
  const needsIssuer = stellar ? !!assetCode.trim() && assetCode.trim().toLowerCase() !== "xlm" : !!assetCode.trim() || !!assetIssuer.trim();
  const tokenOk = !needsIssuer || (assetIssuer.trim() && (stellar || (assetCode.trim() && isAddress(chain, assetIssuer))));
  const amountNeeded = isTx || chain === "monad";
  const memoOk = !memo.trim() || /^\d{1,20}$/.test(memo.trim());
  const valid = destOk && sourceOk && (!amountNeeded || amount.trim()) && tokenOk && memoOk;

  const submit = () => {
    if (!valid || busy) return;
    setBusy(true);
    const body = {
      org: orgId,
      environment: env,
      chain,
      kind: isTx ? "tx" : "pay",
      destination: destination.trim(),
      ...(isTx && source.trim() ? { source: source.trim() } : {}),
      ...(amount.trim() ? { amount: amount.trim() } : {}),
      ...(assetCode.trim() ? { assetCode: assetCode.trim() } : {}),
      ...(needsIssuer && assetIssuer.trim() ? { assetIssuer: assetIssuer.trim() } : {}),
      ...(memo.trim() ? { memo: memo.trim() } : {}),
      ...(chain !== "monad" && msg.trim() ? { msg: msg.trim() } : {}),
      checkoutTheme,
    };
    payApi.create(body)
      .then((intent) => onCreated(intent))
      .catch((err) => showToast((err && err.message) || pl.createError, "error"))
      .finally(() => setBusy(false));
  };

  const invalid = (ok, value) => (value.trim() && !ok ? true : undefined);

  return (
    <Modal onClose={onClose}>
      <div className="modal-body">
        <div className="modal-eyebrow">{m.eyebrow}</div>
        <h3>{m.title}</h3>
        <p>{m.desc}</p>
        <div className="fld">
          <span className="field-l" id="paylink-chain-l">{m.chain}</span>
          <div className="seg-tabs" role="group" aria-labelledby="paylink-chain-l">
            {CHAINS.map((c) => (
              <button key={c} type="button" aria-pressed={chain === c} className={chain === c ? "on" : ""} onClick={() => pickChain(c)}>{CHAIN_NAMES[c]}</button>
            ))}
          </div>
          <p className="field-help">{tier === "public" ? fmt(m.chainLive, { chain: CHAIN_NAMES[chain] }) : fmt(m.chainTest, { chain: CHAIN_NAMES[chain], network: TEST_NETWORKS[chain] })}</p>
        </div>
        {stellar && <Sel label={m.kind} value={kind} onChange={setKind} options={["pay", "tx"]} labels={{ pay: m.kindPay, tx: m.kindTx }} hint={isTx ? m.kindTxHint : m.kindPayHint} />}
        <Field label={m.destination} hint={m.destinationHints[chain]} value={destination} onChange={(e) => setDestination(e.target.value)} placeholder={ADDRESS_PLACEHOLDERS[chain]} aria-invalid={invalid(destOk, destination)} autoFocus />
        {isTx && <Field label={m.source} hint={m.sourceHint} value={source} onChange={(e) => setSource(e.target.value)} placeholder="G…" aria-invalid={invalid(sourceOk, source)} />}
        <Field label={m.amount} hint={chain === "monad" ? m.amountMonad : isTx ? undefined : m.amountHint} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="120.50" inputMode="decimal" />
        {stellar ? (
          <AssetSelect
            network={tier}
            label={m.asset} codeLabel={m.asset} issuerLabel={m.assetIssuer}
            issuerHint={m.assetIssuerHint}
            code={assetCode} issuer={assetIssuer} onCode={setAssetCode} onIssuer={setAssetIssuer}
            customText={t.dash.common.assetCustom} anyText={t.dash.common.assetAny} allowAny codePlaceholder="XLM" />
        ) : (
          <TokenSelect key={chain} chain={chain} tier={tier} label={m.asset} code={assetCode} issuer={assetIssuer} onChange={(x) => { setAssetCode(x.code); setAssetIssuer(x.issuer); }} />
        )}
        <Field label={m.memo} hint={stellar ? m.memoHint : m.memoHintOther} value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="123456789" inputMode="numeric" aria-invalid={memoOk ? undefined : true} />
        {chain !== "monad" && <Field label={m.message} hint={m.messageHint} value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Order #24" />}
        <CheckoutDesignPicker value={checkoutTheme} onChange={setCheckoutTheme} />
        <div className="modal-actions">
          <button className="btn btn-violet" disabled={!valid || busy} onClick={submit}>{busy ? m.submitting : m.submit}</button>
          <button className="btn btn-soft" onClick={onClose}>{t.dash.common.cancel}</button>
        </div>
      </div>
    </Modal>
  );
}
