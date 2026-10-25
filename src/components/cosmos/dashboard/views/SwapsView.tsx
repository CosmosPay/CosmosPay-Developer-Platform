/* SwapsView: every swap of the organization in one list and one form, whatever the chains. On
   one chain the Payments API routes it through that chain's market (the Stellar DEX, Jupiter on
   Solana, Kuru Flow on Monad); between two chains NEAR Intents settles it. Non-custodial: the API
   builds the transaction or the deposit address, the person's wallet signs and pays. */
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Modal, showToast } from "@/components/cosmos/shared";
import { useT, fmt } from "@/lib/i18n/index";
import { swaps as swapsApi, crossChainSwaps as crossApi } from "@/lib/api-client";
import { DI } from "@/components/cosmos/dashboard/icons";
import { fmtDateTime, idempotencyKeys } from "@/components/cosmos/dashboard/helpers";
import { usePaged, useGsapRows, usePolling, useListFilters } from "@/components/cosmos/dashboard/hooks";
import { Pill } from "@/components/cosmos/dashboard/components/Pill";
import { ViewHead } from "@/components/cosmos/dashboard/components/ViewHead";
import { Field } from "@/components/cosmos/dashboard/components/Field";
import { AssetSelect } from "@/components/cosmos/dashboard/components/AssetSelect";
import { TokenSelect } from "@/components/cosmos/dashboard/components/TokenSelect";
import { FilterBar } from "@/components/cosmos/dashboard/components/FilterBar";
import { TableSkeleton } from "@/components/cosmos/dashboard/components/Skeleton";
import { Pagination } from "@/components/cosmos/dashboard/components/Pagination";
import { FreighterSign } from "@/components/cosmos/dashboard/components/FreighterSign";
import { CrossChainSwapDetailModal } from "@/components/cosmos/dashboard/components/CrossChainSwapDetail";
import { assetLabel, CopyBlock, CopyField } from "@/components/cosmos/dashboard/components/PayLinkDetail";
import { needsIssuer as assetNeedsIssuer } from "@/lib/stellar-assets";
import { CHAINS, CHAIN_NAMES, NATIVE_CODES, ADDRESS_PLACEHOLDERS, assetLabel as chainAssetLabel, explorerTxUrl, isAddress, tierOf } from "@/lib/chains";
import { DATE_RANGES, countBy, inRange, matchesQuery } from "@/lib/dashboard-filters";

const TERMINAL = ["SUCCEEDED", "FAILED"];
/* A swap stops changing once it settled, failed, or expired without a transaction (an expired
   Solana or Monad swap with a hash is still looked for on-chain). */
const settled = (s) => TERMINAL.includes(s.status) || (s.status === "EXPIRED" && !s.txHash);
/* One vocabulary for both kinds: a swap on one chain (PENDING → SUBMITTED → SUCCEEDED) and one
   between chains (AWAITING_DEPOSIT → … → SUCCEEDED or REFUNDED). */
const GROUPS = ["open", "succeeded", "refunded", "failed", "expired"];
const groupOf = (status) =>
  status === "SUCCEEDED" ? "succeeded" : status === "FAILED" ? "failed" : status === "EXPIRED" ? "expired" : status === "REFUNDED" ? "refunded" : "open";
const GROUP_PILL = { open: "pend", succeeded: "ok", refunded: "ref", failed: "fail", expired: "fail" };
const TYPES = ["same", "cross"];

const chainOfSwap = (s) => s.chain || "stellar";
const swapExplorer = (s) => explorerTxUrl(chainOfSwap(s), tierOf(s.network), s.txHash);
const asList = (res) => (Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : []);

/* Both kinds of swap as one kind of row. */
function sameRow(s) {
  const chain = chainOfSwap(s);
  return {
    key: `s:${s.id}`, kind: "same", id: s.id, from: chain, to: chain, status: s.status, createdAt: s.createdAt, raw: s,
    sent: `${s.sendAmount ?? "-"} ${chainAssetLabel(chain, s.sendAsset)}`,
    got: `${s.destEstimated ?? s.swapAmount ?? "-"} ${chainAssetLabel(chain, s.destAsset)}`,
    search: [s.id, s.source, s.destination, s.sendAsset, s.destAsset, s.txHash, s.memo],
  };
}
function crossRow(x) {
  return {
    key: `x:${x.id}`, kind: "cross", id: x.id, from: x.originChain, to: x.destinationChain, status: x.status, createdAt: x.createdAt, raw: x,
    sent: `${x.amountIn} ${x.originAsset}`,
    got: `${x.amountOut || `~${x.amountOutEstimated}`} ${x.destinationAsset}`,
    search: [x.id, x.recipient, x.refundTo, x.depositAddress, x.originAsset, x.destinationAsset],
  };
}

export function SwapsView({ canManage = true, orgId, env = "dev", defaultType = "all" }) {
  const t = useT();
  const sw = t.dash.swaps;
  const cc = t.dash.crossChain;
  const fl = t.dash.filters;
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const defaults = useMemo(() => ({ q: "", status: "all", type: defaultType, chain: "all", date: "any" }), [defaultType]);
  const { filters, set, reset, active } = useListFilters(defaults, { status: ["all", ...GROUPS], type: ["all", ...TYPES], chain: ["all", ...CHAINS], date: DATE_RANGES });
  const [modal, setModal] = useState(false);
  const [detail, setDetail] = useState(null);

  // Swaps on each chain and swaps between chains are four lists upstream; read together, newest first.
  const fetchAll = useCallback(() => Promise.all([
    ...CHAINS.map((c) => swapsApi.list(orgId, env, { take: 100, chain: c }).then(asList).catch(() => null)),
    crossApi.list(orgId, env, { take: 100 }).then(asList).catch(() => null),
  ]).then((parts) => {
    if (parts.every((p) => p === null)) throw new Error("unavailable");
    return [
      ...parts.slice(0, CHAINS.length).flatMap((p) => (p || []).map(sameRow)),
      ...(parts[CHAINS.length] || []).map(crossRow),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }), [orgId, env]);
  const load = useCallback(() => {
    setLoading(true);
    fetchAll().then((list) => { setRows(list); setError(false); }).catch(() => setError(true)).finally(() => setLoading(false));
  }, [fetchAll]);
  useEffect(() => { load(); }, [load]);
  // Live refresh while the tab is visible, so a swap settling on-chain flips its status.
  const refresh = useCallback(() => { fetchAll().then(setRows).catch(() => {}); }, [fetchAll]);
  usePolling(refresh, 10000);

  const matches = (r, skip) =>
    (skip === "status" || filters.status === "all" || groupOf(r.status) === filters.status) &&
    (skip === "type" || filters.type === "all" || r.kind === filters.type) &&
    (skip === "chain" || filters.chain === "all" || r.from === filters.chain || r.to === filters.chain) &&
    inRange(r.createdAt, filters.date) &&
    matchesQuery([...r.search, r.sent, r.got, CHAIN_NAMES[r.from], CHAIN_NAMES[r.to]], filters.q);
  const view = rows.filter((r) => matches(r, null));
  const groupCounts = countBy(rows.filter((r) => matches(r, "status")), (r) => groupOf(r.status));
  const typeCounts = countBy(rows.filter((r) => matches(r, "type")), (r) => r.kind);
  const chainRows = rows.filter((r) => matches(r, "chain"));
  const chainCounts = Object.fromEntries(CHAINS.map((c) => [c, chainRows.filter((r) => r.from === c || r.to === c).length]));

  const pg = usePaged(view, JSON.stringify(filters));
  const tref = useRef(null); useGsapRows(tref, pg.page + "|" + view.length);

  const onCreated = (row) => { setModal(false); setRows((r) => [row, ...r]); setDetail(row); };
  const statusLabel = (r) => (r.kind === "cross" ? cc.status[r.status] : sw.status[r.status]) || r.status;
  const chainsLabel = (r) => (r.kind === "cross" ? `${CHAIN_NAMES[r.from]} → ${CHAIN_NAMES[r.to]}` : CHAIN_NAMES[r.from]);

  return (
    <>
      <ViewHead title={sw.title} sub={fmt(sw.sub, { n: rows.length })}>
        {canManage && <button className="btn btn-dark btn-sm" onClick={() => setModal(true)}>{DI.plus} {sw.create}</button>}
      </ViewHead>
      {!canManage && <div className="note-bar" style={{ marginBottom: 16 }}>{DI.link}<span>{sw.readOnly}</span></div>}
      <FilterBar
        label={fl.label}
        query={filters.q} onQuery={(v) => set("q", v)} placeholder={sw.searchPlaceholder}
        status={{
          label: fl.status, value: filters.status, onChange: (v) => set("status", v),
          options: [
            { key: "all", label: fl.allStatuses, count: rows.filter((r) => matches(r, "status")).length },
            ...GROUPS.filter((g) => groupCounts[g] || filters.status === g).map((g) => ({ key: g, label: sw.groups[g], count: groupCounts[g] || 0 })),
          ],
        }}
        selects={[
          { key: "type", label: sw.typeLabel, value: filters.type, onChange: (v) => set("type", v), options: [{ key: "all", label: sw.types.all }, ...TYPES.map((k) => ({ key: k, label: sw.types[k], count: typeCounts[k] || 0 }))] },
          { key: "chain", label: fl.network, value: filters.chain, onChange: (v) => set("chain", v), options: [{ key: "all", label: fl.allNetworks }, ...CHAINS.map((c) => ({ key: c, label: CHAIN_NAMES[c], count: chainCounts[c] }))] },
        ]}
        date={filters.date} onDate={(v) => set("date", v)}
        active={active} onReset={reset}
        shown={view.length} total={loading ? undefined : rows.length} loading={loading}
      />
      <div className="panel">
        {loading && <TableSkeleton label={sw.loading} cols={5} />}
        {!loading && !error && view.length > 0 && (
          <div className="t-scroll" tabIndex={0} ref={tref}><table className="tx"><thead><tr><th>{sw.tableHead.id}</th><th>{sw.tableHead.chains}</th><th>{sw.tableHead.route}</th><th>{sw.tableHead.status}</th><th>{sw.tableHead.created}</th></tr></thead>
            <tbody>{pg.slice.map((r) => (
              <tr key={r.key} className="row-click" onClick={() => setDetail(r)}>
                <td className="tid">{r.id}</td>
                <td><span className="net-badge">{chainsLabel(r)}</span></td>
                <td className="amt">{r.sent} → {r.got}</td>
                <td><Pill st={GROUP_PILL[groupOf(r.status)]} label={statusLabel(r)} /></td>
                <td className="cust">{fmtDateTime(r.createdAt)}</td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
        {!loading && error && <div className="empty">{sw.loadError}</div>}
        {!loading && !error && !view.length && (
          <div className="empty">
            {rows.length ? fl.noMatch : sw.empty}
            {rows.length > 0 && active > 0 && <div><button type="button" className="fbar-reset" onClick={reset}>{fl.clear}</button></div>}
          </div>
        )}
        {!loading && !error && view.length > 0 && <Pagination {...pg} />}
      </div>
      {modal && <NewSwapModal orgId={orgId} env={env} onClose={() => setModal(false)} onCreated={onCreated} />}
      {detail && detail.kind === "cross" && <CrossChainSwapDetailModal swap={detail.raw} orgId={orgId} env={env} canManage={canManage} onClose={() => setDetail(null)} />}
      {detail && detail.kind === "same" && detail.from === "stellar" && <SwapDetailModal sw={sw} swap={detail.raw} orgId={orgId} env={env} canManage={canManage} onClose={() => setDetail(null)} />}
      {detail && detail.kind === "same" && detail.from !== "stellar" && <ChainSwapDetailModal sw={sw} swap={detail.raw} orgId={orgId} env={env} canManage={canManage} onClose={() => setDetail(null)} />}
    </>
  );
}

/* NEAR Intents' value for an asset: a Stellar token as CODE:ISSUER, elsewhere its contract or
   its symbol for the chain's coin. */
const crossValue = (a) => (a.contract && a.chain === "stellar" ? `${a.symbol}:${a.contract}` : a.contract || a.symbol);

/* ---------------- the swap form: from a chain and asset, to a chain and asset ---------------- */
/* Same chain: the chain's market quotes and builds a transaction to sign (Stellar also takes a
   destination and a memo). Different chains: NEAR Intents quotes and, once opened, gives a
   deposit address to pay; it needs a refund address on the first chain and a recipient on the
   second. Solana and Monad markets, and opening a swap between chains, are mainnet only. */
function NewSwapModal({ orgId, env, onClose, onCreated }) {
  const t = useT();
  const sw = t.dash.swaps;
  const cc = t.dash.crossChain;
  const m = sw.modal;
  const nm = sw.form;
  const tier = env === "prod" ? "public" : "testnet";
  const [fromChain, setFromChain] = useState("stellar");
  const [toChain, setToChain] = useState("stellar");
  const cross = fromChain !== toChain;
  // Same-chain assets: Stellar as code + issuer; Solana and Monad as their coin or a token address.
  const [src, setSrc] = useState({ code: "XLM", issuer: "" });
  const [dst, setDst] = useState({ code: "USDC", issuer: "" });
  // Between chains: the assets NEAR Intents lists, loaded once.
  const [nearAssets, setNearAssets] = useState(null);
  const [xFrom, setXFrom] = useState("");
  const [xTo, setXTo] = useState("");
  const [amount, setAmount] = useState("");
  const [account, setAccount] = useState("");
  const [recipient, setRecipient] = useState("");
  const [memo, setMemo] = useState("");
  const [slippageBps, setSlippageBps] = useState("");
  const [quote, setQuote] = useState(null);
  const [quoting, setQuoting] = useState(false);
  const [busy, setBusy] = useState(false);
  const keys = useRef(idempotencyKeys()).current;
  // Bumped by flip(), so the asset pickers (which keep their own choice) start from the new legs.
  const [flips, setFlips] = useState(0);

  useEffect(() => {
    if (!cross || nearAssets) return;
    let alive = true;
    crossApi.assets(orgId, env).then((list) => { if (alive) setNearAssets(Array.isArray(list) ? list : asList(list)); }).catch(() => { if (alive) setNearAssets([]); });
    return () => { alive = false; };
  }, [cross, nearAssets, orgId, env]);
  const nearFor = (chain) => (nearAssets || []).filter((a) => a.chain === chain);
  // A leg's first listed asset once the list is in, or when its chain changes.
  useEffect(() => { if (cross) setXFrom((v) => (nearFor(fromChain).some((a) => crossValue(a) === v) ? v : nearFor(fromChain)[0] ? crossValue(nearFor(fromChain)[0]) : "")); }, [cross, fromChain, nearAssets]);
  useEffect(() => { if (cross) setXTo((v) => (nearFor(toChain).some((a) => crossValue(a) === v) ? v : nearFor(toChain)[0] ? crossValue(nearFor(toChain)[0]) : "")); }, [cross, toChain, nearAssets]);

  const stale = () => setQuote(null);
  const pickChain = (leg, c) => {
    stale();
    if (leg === "from") { setFromChain(c); setSrc({ code: c === "stellar" ? "XLM" : "", issuer: "" }); setAccount(""); }
    else { setToChain(c); setDst({ code: c === "stellar" ? "USDC" : "", issuer: "" }); setRecipient(""); }
    setMemo("");
  };
  // Swap the two legs: chains, assets and, between chains, nothing else carries across.
  const flip = () => {
    stale();
    setFromChain(toChain); setToChain(fromChain);
    setSrc(dst); setDst(src);
    setXFrom(xTo); setXTo(xFrom);
    setAccount(""); setRecipient(""); setMemo("");
    setFlips((n) => n + 1);
  };

  const sameUnavailable = !cross && fromChain !== "stellar" && env !== "prod";
  const openBlocked = cross && env !== "prod";
  const venue = cross ? nm.venueCross : sw.venues[fromChain];

  // The swap API names an asset per chain: a Stellar code (+ issuer), else the coin or a token address.
  const sameAsset = (chain, a) => (chain === "stellar" ? a.code.trim() : a.issuer.trim() || NATIVE_CODES[chain]);
  const srcNeedsIssuer = fromChain === "stellar" && !!src.code.trim() && assetNeedsIssuer(src.code.trim());
  const dstNeedsIssuer = toChain === "stellar" && !!dst.code.trim() && assetNeedsIssuer(dst.code.trim());
  const assetsOk = cross
    ? !!xFrom && !!xTo
    : !!sameAsset(fromChain, src) && !!sameAsset(toChain, dst) && (!srcNeedsIssuer || !!src.issuer.trim()) && (!dstNeedsIssuer || !!dst.issuer.trim()) &&
      (fromChain === "stellar" || ((!src.issuer || isAddress(fromChain, src.issuer)) && (!dst.issuer || isAddress(toChain, dst.issuer))));
  const accountOk = isAddress(fromChain, account);
  const recipientOk = cross ? isAddress(toChain, recipient) : !recipient.trim() || isAddress("stellar", recipient);
  const memoOk = !memo.trim() || /^\d{1,20}$/.test(memo.trim());
  const amountOk = /^\d+(\.\d+)?$/.test(amount.trim()) && Number(amount) > 0;
  // A cross-chain quote needs both addresses; a same-chain one only the amount and assets.
  const canQuote = !sameUnavailable && amountOk && assetsOk && (!cross || (accountOk && recipientOk));
  const canCreate = canQuote && accountOk && recipientOk && memoOk && !openBlocked;

  const body = () => {
    const slip = slippageBps.trim() ? { slippageBps: Number(slippageBps.trim()) } : {};
    if (cross) {
      return { org: orgId, environment: env, originChain: fromChain, originAsset: xFrom, destinationChain: toChain, destinationAsset: xTo, amount: amount.trim(), recipient: recipient.trim(), refundTo: account.trim(), ...slip };
    }
    return {
      org: orgId, environment: env, chain: fromChain, amount: amount.trim(),
      ...(fromChain !== "stellar" ? { sourceAssetCode: sameAsset(fromChain, src) } : srcNeedsIssuer ? { sourceAssetCode: src.code.trim(), sourceAssetIssuer: src.issuer.trim() } : {}),
      destAssetCode: sameAsset(toChain, dst),
      ...(dstNeedsIssuer ? { destAssetIssuer: dst.issuer.trim() } : {}),
      ...slip,
    };
  };

  const getQuote = () => {
    if (!canQuote || quoting) return;
    setQuoting(true);
    (cross ? crossApi.quote(body()) : swapsApi.quote(body()))
      .then(setQuote)
      .catch((err) => showToast((err && err.message) || sw.quoteError, "error"))
      .finally(() => setQuoting(false));
  };

  const create = () => {
    if (!canCreate || busy) return;
    setBusy(true);
    const b = cross
      ? body()
      : {
          ...body(), source: account.trim(),
          ...(fromChain === "stellar" && recipient.trim() ? { destination: recipient.trim() } : {}),
          ...(fromChain === "stellar" && memo.trim() ? { memo: memo.trim() } : {}),
        };
    (cross ? crossApi.create({ ...b, idempotencyKey: keys.keyFor(b) }) : swapsApi.create({ ...b, idempotencyKey: keys.keyFor(b) }))
      .then((rec) => onCreated(cross ? crossRow(rec) : sameRow(rec)))
      .catch((err) => showToast((err && err.message) || sw.createError, "error"))
      .finally(() => setBusy(false));
  };

  // The quote, the same rows whichever market answered.
  const quoteRows = (() => {
    if (!quote) return [];
    if (cross) {
      return [
        [m.estimated, `${quote.destination.amount} ${quote.destination.asset}`],
        [m.minimum, `${quote.destination.minimum} ${quote.destination.asset}`],
        [m.fee, `${quote.fee.amount} ${quote.fee.asset} (${quote.fee.bps} ${m.bps})`],
        [cc.modal.eta, `${quote.timeEstimateSeconds} ${cc.modal.seconds}`],
        [nm.route, venue],
      ];
    }
    const d = quote.destination || {};
    const destName = chainAssetLabel(toChain, toChain === "stellar" ? dst.code : d.asset);
    return [
      quote.swap ? [m.swapped, `${quote.swap.amount} ${chainAssetLabel(fromChain, quote.swap.asset)}`] : null,
      [m.estimated, `${d.estimated} ${destName}`],
      d.minimum != null ? [m.minimum, `${d.minimum} ${destName}`] : null,
      quote.fee ? [m.fee, `${quote.fee.amount} ${chainAssetLabel(fromChain, quote.fee.asset)} (${quote.fee.bps} ${m.bps})`] : null,
      [nm.route, venue],
    ].filter(Boolean);
  })();

  const leg = (which) => {
    const isFrom = which === "from";
    const chain = isFrom ? fromChain : toChain;
    const value = isFrom ? src : dst;
    const setValue = (v) => { stale(); (isFrom ? setSrc : setDst)(v); };
    const label = isFrom ? nm.from : nm.to;
    return (
      <fieldset className="swap-leg">
        <legend className="field-l">{label}</legend>
        <div className="field-row">
          <div className="fld">
            <label className="field-l" htmlFor={`swap-${which}-chain`}>{nm.chain}</label>
            <select id={`swap-${which}-chain`} className="field" value={chain} onChange={(e) => pickChain(which, e.target.value)}>
              {CHAINS.map((c) => <option key={c} value={c}>{CHAIN_NAMES[c]}</option>)}
            </select>
          </div>
          {cross ? (
            <div className="fld">
              <label className="field-l" htmlFor={`swap-${which}-asset`}>{nm.asset}</label>
              <select id={`swap-${which}-asset`} className="field" value={isFrom ? xFrom : xTo} onChange={(e) => { stale(); (isFrom ? setXFrom : setXTo)(e.target.value); }} disabled={!nearFor(chain).length}>
                {!nearFor(chain).length && <option value="">{cc.modal.assetsLoading}</option>}
                {nearFor(chain).map((a) => (
                  <option key={a.assetId} value={crossValue(a)}>{a.symbol}{a.contract ? ` · ${a.contract.slice(0, 6)}…${a.contract.slice(-4)}` : ""}</option>
                ))}
              </select>
            </div>
          ) : chain === "stellar" ? (
            <AssetSelect
              key={`${which}-stellar-${flips}`}
              network={tier}
              label={nm.asset} codeLabel={nm.asset} issuerLabel={isFrom ? m.sourceIssuer : m.destIssuer}
              issuerHint={m.destIssuerHint}
              code={value.code} issuer={value.issuer}
              onCode={(v) => setValue({ ...value, code: v })}
              onIssuer={(v) => setValue({ ...value, issuer: v })}
              customText={t.dash.common.assetCustom} codePlaceholder={isFrom ? "XLM" : "USDC"}
            />
          ) : (
            <TokenSelect key={`${which}-${chain}-${flips}`} chain={chain} tier={tier} label={nm.asset} code={value.code} issuer={value.issuer} onChange={setValue} withTicker={false} />
          )}
        </div>
      </fieldset>
    );
  };

  return (
    <Modal onClose={onClose}>
      <div className="modal-body">
        <div className="modal-eyebrow">{m.eyebrow}</div>
        <h3>{m.title}</h3>
        <p>{nm.desc}</p>

        {leg("from")}
        <Field label={m.amount} hint={nm.amountHint} value={amount} onChange={(e) => { stale(); setAmount(e.target.value); }} placeholder="100.00" inputMode="decimal" />
        <div className="swap-flip">
          <button type="button" className="icon-mini" onClick={flip} aria-label={nm.flip} title={nm.flip}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 4v16M7 20l-3-3M7 20l3-3M17 20V4M17 4l-3 3M17 4l3 3" /></svg>
          </button>
          <span className="field-help">{fmt(nm.routeLine, { route: venue })}</span>
        </div>
        {leg("to")}

        {sameUnavailable && <div className="note-bar">{DI.network}<span>{sw.mainnetOnly}</span></div>}
        {openBlocked && <div className="note-bar">{DI.network}<span>{cc.mainnetOnly}</span></div>}

        <Field
          label={cross ? cc.modal.refundTo : m.source}
          hint={cross ? cc.modal.refundToHint : fromChain === "stellar" ? m.sourceHint : sw.chainModal.sourceHint[fromChain]}
          value={account} onChange={(e) => { stale(); setAccount(e.target.value); }}
          placeholder={ADDRESS_PLACEHOLDERS[fromChain]} aria-invalid={account.trim() && !accountOk ? true : undefined}
        />
        {(cross || fromChain === "stellar") && (
          <Field
            label={cross ? cc.modal.recipient : m.destination}
            hint={cross ? cc.modal.recipientHint : m.destinationHint}
            value={recipient} onChange={(e) => { stale(); setRecipient(e.target.value); }}
            placeholder={ADDRESS_PLACEHOLDERS[toChain]} aria-invalid={recipient.trim() && !recipientOk ? true : undefined}
          />
        )}
        <div className="field-row">
          {!cross && fromChain === "stellar" && <Field label={m.memo} hint={m.memoHint} value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="123456789" inputMode="numeric" aria-invalid={memoOk ? undefined : true} />}
          <Field label={m.slippage} hint={m.slippageHint} value={slippageBps} onChange={(e) => { stale(); setSlippageBps(e.target.value); }} placeholder={cross ? "100" : "50"} inputMode="numeric" />
        </div>

        <div className="paylink-actions" style={{ margin: "16px 0 14px" }}>
          <button className="btn btn-soft btn-sm" disabled={!canQuote || quoting} onClick={getQuote}>{quoting ? m.quoting : m.getQuote}</button>
        </div>

        {quote && (
          <div className="paylink-fields arrive" style={{ marginBottom: 16 }}>
            <div className="modal-eyebrow">{m.quoteTitle}</div>
            {quoteRows.map(([label, v]) => <CopyField key={label} label={label} value={v} />)}
            <p className="field-note">{cross ? cc.modal.feeNote : fromChain === "stellar" ? m.feeNote : sw.chainModal.feeNote}</p>
          </div>
        )}

        <div className="modal-actions">
          <button className="btn btn-violet" disabled={!canCreate || busy} onClick={create}>{busy ? m.creating : cross ? cc.modal.create : m.create}</button>
          <button className="btn btn-soft" onClick={onClose}>{t.dash.common.cancel}</button>
        </div>
      </div>
    </Modal>
  );
}

/* Polls a swap until it is terminal so status and txHash update live. */
function useSwapRecord(swap, orgId, env, complete) {
  const [data, setData] = useState(swap);
  useEffect(() => {
    if (complete(data)) return;
    let alive = true;
    swapsApi.get(swap.id, orgId, env).then((full) => { if (alive && full) setData(full); }).catch(() => {});
    return () => { alive = false; };
  }, [swap.id, orgId, env]);
  useEffect(() => {
    if (settled(data)) return;
    let alive = true;
    const h = setInterval(() => {
      if (document.hidden) return;
      swapsApi.get(swap.id, orgId, env).then((full) => { if (alive && full) setData(full); }).catch(() => {});
    }, 5000);
    return () => { alive = false; clearInterval(h); };
  }, [swap.id, orgId, env, data.status, data.txHash]);
  return [data, setData];
}

/* ---------------- detail modal (QR + uri + xdr + submit signed tx) ---------------- */
function SwapDetailModal({ sw, swap, orgId, env, canManage, onClose }) {
  const d = sw.detail;
  // Seed with the row, then fetch the full record for the QR/uri/xdr.
  const [data, setData] = useSwapRecord(swap, orgId, env, (s) => !!(s.qr && s.uri));
  const [signed, setSigned] = useState("");
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState(null);

  // The signed envelope comes from Freighter or from the paste box.
  const submit = (signedXdr = signed.trim()) => {
    if (!signedXdr || busy) return;
    setBusy(true);
    setOutcome(null);
    swapsApi.submit(swap.id, orgId, env, { signedXdr })
      .then((res) => {
        setOutcome(res || {});
        if (res && res.swap) setData((cur) => ({ ...cur, ...res.swap }));
        if (res && res.submitted) showToast(d.submitted);
      })
      .catch((err) => { setOutcome({ submitted: false, reason: (err && err.message) || d.submitFailed }); })
      .finally(() => setBusy(false));
  };

  const F = d.fields;
  const fields = [
    [F.id, data.id],
    [F.status, (sw.status && sw.status[data.status]) || data.status],
    [F.network, data.network],
    [F.source, data.source],
    [F.destination, data.destination],
    [F.sent, data.sendAmount ? `${data.sendAmount} ${assetLabel(data.sendAsset)}` : null],
    [F.received, data.destEstimated ? `${data.destEstimated} ${data.destAsset}` : null],
    [F.minimum, data.destMin ? `${data.destMin} ${data.destAsset}` : null],
    [F.fee, data.feeAmount ? `${data.feeAmount} ${assetLabel(data.sendAsset)} (${data.feeBps} ${sw.modal.bps})` : null],
    [F.memo, data.memo],
    [F.commissionMemo, data.commissionMemo],
    [F.txHash, data.txHash],
    [F.created, fmtDateTime(data.createdAt)],
  ].filter(([, v]) => v !== null && v !== undefined && v !== "");

  // Only a built, unsigned swap can be signed: a submitted one is on its way, an expired one's
  // time bounds have passed.
  const signable = canManage && !!data.xdr && data.status === "PENDING";
  const w = useT().dash.wallet;

  return (
    <Modal onClose={onClose}>
      <div className="modal-body paylink-detail">
        <div className="modal-eyebrow">{d.eyebrow}</div>
        <h3>{d.title}</h3>

        {signable && (
          <div className="paylink-block">
            <div className="paylink-block-head"><span className="field-l">{w.signTitle}</span></div>
            <p className="field-note">{w.signDesc}</p>
            <FreighterSign xdr={data.xdr} network={data.network} signer={data.source} busy={busy} onSigned={(x) => submit(x)} />
          </div>
        )}

        {/* What other wallets sign from, while the swap waits for its signature. */}
        {data.status === "PENDING" && data.qr && (
          <div className="paylink-qr-wrap">
            <img className="paylink-qr" src={data.qr} alt={d.scan} width={220} height={220} />
            <div className="paylink-qr-cap">{d.scan}</div>
            <a className="btn btn-soft btn-sm" href={data.qr} download={`swap-${data.id}.png`}>{DI.download} {d.downloadQr}</a>
          </div>
        )}

        {data.status === "PENDING" && data.uri && (
          <CopyBlock label={d.uri} value={data.uri}>
            <div className="paylink-actions">
              <a className="btn btn-dark btn-sm" href={data.uri}>{DI.link} {d.openWallet}</a>
            </div>
          </CopyBlock>
        )}

        {data.status === "PENDING" && data.xdr && <CopyBlock label={d.xdr} value={data.xdr} />}

        {/* The hash exists before signing; the explorer only knows it once it was sent. */}
        {data.txHash && data.status !== "PENDING" && (
          <div className="paylink-actions" style={{ marginBottom: 12 }}>
            <a className="btn btn-soft btn-sm" href={swapExplorer(data)} target="_blank" rel="noopener noreferrer">{DI.network} {d.viewExplorer}</a>
          </div>
        )}

        <div className="paylink-fields">
          {fields.map(([label, v]) => <CopyField key={label} label={label} value={v} />)}
        </div>

        {/* Or a transaction signed in another wallet, pasted back. */}
        {signable && (
          <div className="paylink-block">
            <div className="paylink-block-head"><label className="field-l" htmlFor={`swap-signed-${data.id}`}>{d.submitTitle}</label></div>
            <p className="field-note">{d.submitDesc}</p>
            <textarea id={`swap-signed-${data.id}`} className="field" rows={4} value={signed} onChange={(e) => setSigned(e.target.value)} placeholder={d.submitPlaceholder} />
            <div className="modal-actions">
              <button className="btn btn-violet" disabled={!signed.trim() || busy} onClick={() => submit()}>{busy ? d.submitting : d.submit}</button>
            </div>
          </div>
        )}

        <SubmitOutcome d={d} outcome={outcome} />
      </div>
    </Modal>
  );
}

/* ---------------- detail modal for Solana / Monad (transaction + approval + submit) ---------------- */
function ChainSwapDetailModal({ sw, swap, orgId, env, canManage, onClose }) {
  const d = sw.detail;
  const c = sw.chainDetail;
  const chain = swap.chain;
  const [data, setData] = useSwapRecord(swap, orgId, env, (s) => !!s.transaction);
  const [signed, setSigned] = useState("");
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState(null);

  const submit = () => {
    if (!signed.trim() || busy) return;
    setBusy(true);
    setOutcome(null);
    swapsApi.submit(swap.id, orgId, env, { signedTransaction: signed.trim() })
      .then((res) => {
        setOutcome(res || {});
        if (res && res.swap) setData((cur) => ({ ...cur, ...res.swap }));
        if (res && res.submitted) showToast(d.submitted);
      })
      .catch((err) => { setOutcome({ submitted: false, reason: (err && err.message) || d.submitFailed }); })
      .finally(() => setBusy(false));
  };

  const tx = data.transaction || {};
  // Solana hands out base64 bytes; Monad a call object the wallet signs as EIP-1559.
  const txText = tx.encoding === "base64" ? tx.data : JSON.stringify(tx, null, 2);
  const F = d.fields;
  const fields = [
    [F.id, data.id],
    [F.status, (sw.status && sw.status[data.status]) || data.status],
    [c.provider, `${sw.venues[chain]} · ${sw.chains[chain]}`],
    [F.source, data.source],
    [F.sent, data.sendAmount ? `${data.sendAmount} ${chainAssetLabel(chain, data.sendAsset)}` : null],
    [F.received, data.destEstimated ? `${data.destEstimated} ${chainAssetLabel(chain, data.destAsset)}` : null],
    [F.minimum, data.destMin ? `${data.destMin} ${chainAssetLabel(chain, data.destAsset)}` : null],
    [F.fee, data.feeAmount ? `${data.feeAmount} ${chainAssetLabel(chain, data.destAsset)} (${data.feeBps} ${sw.modal.bps})` : null],
    [c.expires, data.status === "PENDING" ? fmtDateTime(data.expiresAt) : null],
    [F.txHash, data.txHash],
    [F.created, fmtDateTime(data.createdAt)],
  ].filter(([, v]) => v !== null && v !== undefined && v !== "");

  const isTerminal = TERMINAL.includes(data.status);

  return (
    <Modal onClose={onClose}>
      <div className="modal-body paylink-detail">
        <div className="modal-eyebrow">{d.eyebrow} · {sw.chains[chain]}</div>
        <h3>{c.title}</h3>

        {data.approval && data.status === "PENDING" && (
          <CopyBlock label={c.approval} value={JSON.stringify(data.approval, null, 2)}>
            <p className="field-note">{c.approvalNote}</p>
          </CopyBlock>
        )}
        {data.transaction && data.status === "PENDING" && <CopyBlock label={c.transaction} value={txText} />}
        {data.txHash && (
          <div className="paylink-actions" style={{ marginBottom: 12 }}>
            <a className="btn btn-soft btn-sm" href={swapExplorer(data)} target="_blank" rel="noopener noreferrer">{DI.network} {d.viewExplorer}</a>
          </div>
        )}

        <div className="paylink-fields">
          {fields.map(([label, v]) => <CopyField key={label} label={label} value={v} />)}
        </div>

        {canManage && !isTerminal && data.status !== "EXPIRED" && (
          <div className="paylink-block">
            <div className="paylink-block-head"><label className="field-l">{d.submitTitle}</label></div>
            <p className="field-note">{c.submitDesc}</p>
            <textarea className="field" rows={4} value={signed} onChange={(e) => setSigned(e.target.value)} placeholder={c.submitPlaceholder} />
            <div className="modal-actions">
              <button className="btn btn-violet" disabled={!signed.trim() || busy} onClick={submit}>{busy ? d.submitting : d.submit}</button>
            </div>
          </div>
        )}

        <SubmitOutcome d={d} outcome={outcome} />
      </div>
    </Modal>
  );
}

function SubmitOutcome({ d, outcome }) {
  if (!outcome) return null;
  return (
    <div className="paylink-fields" style={{ marginTop: 8 }}>
      <CopyField label={d.fields.status} value={outcome.submitted ? d.submitted : (outcome.reason || d.submitFailed)} />
      {outcome.txHash && <CopyField label={d.fields.txHash} value={outcome.txHash} />}
      {Array.isArray(outcome.resultCodes?.operations) && outcome.resultCodes.operations.length > 0 && <CopyField label={d.resultCodes} value={outcome.resultCodes.operations.join(", ")} />}
      {typeof outcome.resultCodes === "string" && <CopyField label={d.resultCodes} value={outcome.resultCodes} />}
    </div>
  );
}
