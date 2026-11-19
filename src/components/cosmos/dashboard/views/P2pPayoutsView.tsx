/* P2pPayoutsView: paying people in local money from a registered wallet's stablecoins, up to a
   hundred at a time. The wallet deposits into the market and authorises Cosmos Pay's matcher on
   the network (P2P liquidity); each payout is then matched to a merchant who buys the tokens,
   pays the beneficiary and marks it paid with the transfer's reference, and the wallet releases
   it (here, or through its bot). A batch comes from a CSV file checked row by row in the browser
   before anything is sent (src/lib/p2p/csv.ts), with a template to start from. */
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { useT, useLang, fmt } from "@/lib/i18n/index";
import { Modal, showToast } from "@/components/cosmos/shared";
import { IcCopy } from "@/components/cosmos/icons";
import { DI } from "@/components/cosmos/dashboard/icons";
import { fmtDateTime, fmtWhen } from "@/components/cosmos/dashboard/helpers";
import { usePaged, useGsapRows, useListFilters, useUrlRequest } from "@/components/cosmos/dashboard/hooks";
import { ViewHead } from "@/components/cosmos/dashboard/components/ViewHead";
import { ViewFigures } from "@/components/cosmos/dashboard/components/ActivityPanel";
import { FilterBar } from "@/components/cosmos/dashboard/components/FilterBar";
import { TableSkeleton } from "@/components/cosmos/dashboard/components/Skeleton";
import { FillRows } from "@/components/cosmos/dashboard/components/FillRows";
import { Pagination } from "@/components/cosmos/dashboard/components/Pagination";
import { RowMenu } from "@/components/cosmos/dashboard/components/RowMenu";
import { RecordLink } from "@/components/cosmos/dashboard/components/RecordLink";
import { PreviewCard, shortAddress } from "@/components/cosmos/dashboard/components/RecordPreview";
import { Pill } from "@/components/cosmos/dashboard/components/Pill";
import { StatusIcon } from "@/components/cosmos/dashboard/components/StatusIcon";
import { Select } from "@/components/cosmos/dashboard/components/Select";
import { FormSteps, FormStep, FormStepsFooter, useFormSteps } from "@/components/cosmos/dashboard/components/FormSteps";
import { countBy, inRange, matchesQuery, DATE_RANGES } from "@/lib/dashboard-filters";
import { parsePayoutCsv, payoutItems, payoutTemplate, PAYOUT_MAX_ITEMS, type PayoutFile } from "@/lib/p2p/csv";
import { fromBaseUnits } from "@/lib/p2p/amounts";
import type { P2pAccount, P2pMarket, P2pPayoutBatch, P2pPayoutItem } from "@/lib/p2p/types";
import {
  p2pApi, useP2pMarket, useP2pList, networkOf, networkName, fiatText, tokenText, NetworkCell, P2pTokenMark, OrderStatus, WalletTxDialog, buildTx,
  accountName, railName, fieldErrorText, Notice, accountOptions, networkOptions,
} from "@/components/cosmos/dashboard/p2p/shared";

const STATES = ["processing", "completed", "partial", "failed"] as const;
const tone = (s: string) => (s === "completed" ? "ok" : s === "failed" ? "fail" : s === "partial" ? "off" : "wait");
const pillOf = (s: string) => (s === "completed" ? "ok" : s === "failed" ? "fail" : s === "partial" ? "ref" : "pend");

/** Totals per currency, in the reader's language: "150,000.00 ARS · 820.50 BRL". */
function totals(items: { currency: string; fiatAmount: string }[], lang: string) {
  const by = new Map<string, number>();
  for (const i of items) by.set(i.currency, (by.get(i.currency) ?? 0) + Number(i.fiatAmount || 0));
  return [...by].map(([c, n]) => fiatText(n, c, lang)).join(" · ") || "-";
}

export function P2pPayoutsView({ canManage = false, orgId, env = "dev" }: { canManage?: boolean; orgId: string; env?: string }) {
  const t = useT();
  const lang = useLang();
  const p = t.p2p.payouts;
  const cm = t.dash.common;
  const fl = t.dash.filters;
  const market = useP2pMarket(env, orgId);
  const batches = useP2pList<P2pPayoutBatch>("payouts", env, orgId, 10_000);
  const accounts = useP2pList<P2pAccount>("accounts", env, orgId);
  const [creating, setCreating] = useState(false);
  const [detail, setDetail] = useState<P2pPayoutBatch | null>(null);

  const [createReq, clearCreate] = useUrlRequest("create");
  useEffect(() => { if (createReq) { clearCreate(); if (canManage) setCreating(true); } /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [createReq]);
  useEffect(() => {
    if (!detail) return;
    const fresh = batches.rows.find((b) => b.id === detail.id);
    if (fresh && fresh !== detail) setDetail(fresh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batches.rows]);

  const rows = batches.rows;
  const defaults = useMemo(() => ({ q: "", status: "all", date: "any" }), []);
  const { filters, set, reset, active } = useListFilters(defaults, { status: ["all", ...STATES], date: DATE_RANGES });
  const match = (b: P2pPayoutBatch, skip?: string) =>
    (skip === "status" || filters.status === "all" || b.status === filters.status) &&
    inRange(b.createdAt, filters.date) &&
    matchesQuery([b.id, b.token, networkName(market, b.network), ...b.items.flatMap((i) => [i.beneficiaryName, i.externalReference, i.currency])], filters.q);
  const view = rows.filter((b) => match(b));
  const stCounts = countBy(rows.filter((b) => match(b, "status")), (b) => b.status);
  const pg = usePaged(view, JSON.stringify(filters));
  const tref = useRef(null); useGsapRows(tref, pg.page + "|" + view.length);
  const items = rows.flatMap((b) => b.items);
  const toRelease = items.filter((i) => i.status === "paid").length;
  const loading = batches.loading;

  return (
    <>
      <ViewHead title={p.title} />
      <ViewFigures
        label={p.figuresLabel} loading={loading} failed={batches.error}
        items={[
          { key: "batches", label: p.figures.batches, value: rows.length },
          { key: "items", label: p.figures.items, value: items.length },
          { key: "done", label: p.figures.completed, value: items.filter((i) => i.status === "completed").length },
          { key: "release", label: p.figures.toRelease, value: toRelease, sub: p.figures.toReleaseSub },
        ]}
      />
      {!canManage && <div className="note-bar" style={{ marginBottom: 16 }}>{DI.key}<span>{p.readOnly}</span></div>}
      <FilterBar
        label={fl.label}
        query={filters.q} onQuery={(v) => set("q", v)} placeholder={p.search}
        status={{
          label: fl.status, value: filters.status, onChange: (v) => set("status", v),
          options: [
            { key: "all", label: fl.allStatuses, count: rows.filter((b) => match(b, "status")).length },
            ...STATES.map((s) => ({ key: s, label: p.state[s], count: stCounts[s] || 0, icon: <StatusIcon tone={tone(s)} size={16} /> })),
          ],
        }}
        date={filters.date} onDate={(v) => set("date", v)}
        active={active} onReset={reset}
        shown={view.length} total={loading ? undefined : rows.length} loading={loading}
        actions={canManage && <button type="button" className="btn btn-dark btn-sm" onClick={() => setCreating(true)} disabled={!market || !accounts.rows.length} title={!accounts.rows.length ? t.p2p.liquidity.bots.needWallet : undefined}>{DI.plus} {p.create}</button>}
      />
      <div className="panel">
        {loading && <TableSkeleton label={p.loading} cols={7} />}
        {!loading && (
          <div className="t-scroll" tabIndex={0} ref={tref}><table className="tx p2p-t"><thead><tr>
            <th>{p.head.batch}</th><th>{p.head.payouts}</th><th>{p.head.total}</th><th>{p.head.from}</th><th>{p.head.status}</th><th>{p.head.created}</th>
            <th><span className="sr-only">{cm.actions}</span></th>
          </tr></thead>
            <tbody>{!batches.error && pg.slice.map((b) => {
              const done = b.items.filter((i) => i.status === "completed").length;
              const paid = b.items.filter((i) => i.status === "paid").length;
              return (
                <tr key={b.id} className="row-click" onClick={() => setDetail(b)}>
                  <td className="tid" onClick={(e) => e.stopPropagation()}>
                    <span className="cell-mark">
                      <P2pTokenMark market={market} network={b.network} symbol={b.token} />
                      <RecordLink onOpen={() => setDetail(b)} copy={b.id} title={b.id}
                        preview={() => <PreviewCard label={p.head.batch} title={b.id} headline={<><b>{totals(b.items, lang)}</b><Pill st={pillOf(b.status)} tone={tone(b.status)} label={p.state[b.status]} /></>} fields={[[p.head.payouts, String(b.items.length)], [t.dash.filters.network, networkName(market, b.network)]]} />}
                      ><code>{shortAddress(b.id)}</code></RecordLink>
                    </span>
                  </td>
                  <td className="cust">{fmt(p.doneOf, { done, total: b.items.length })}{paid ? ` · ${fmt(p.paidN, { n: paid })}` : ""}</td>
                  <td className="amt">{totals(b.items, lang)}</td>
                  <td className="cust">{accountName(accounts.rows.find((a) => a.id === b.accountId))}</td>
                  <td><Pill st={pillOf(b.status)} tone={tone(b.status)} label={p.state[b.status]} /></td>
                  <td className="cust">{fmtWhen(b.createdAt)}</td>
                  <td className="row-actions" onClick={(e) => e.stopPropagation()}>
                    <button type="button" className="icon-mini" title={cm.details} aria-label={`${cm.details}: ${shortAddress(b.id)}`} onClick={() => setDetail(b)}>{DI.docs}</button>
                    <RowMenu label={fmt(cm.rowActions, { name: shortAddress(b.id) })} items={[
                      { key: "open", label: cm.details, icon: DI.docs, onClick: () => setDetail(b) },
                      { key: "copy", label: cm.copyId, icon: <IcCopy />, onClick: () => navigator.clipboard?.writeText(b.id).then(() => showToast(t.toasts.copied)).catch(() => {}) },
                    ]} />
                  </td>
                </tr>
              );
            })}
              <FillRows n={pg.size - (batches.error ? 0 : pg.count)} cols={7} empty={batches.error ? p.listError : null} />
            </tbody>
          </table></div>
        )}
        {!loading && <Pagination {...pg} />}
      </div>
      {creating && market && (
        <NewBatchModal market={market} accounts={accounts.rows} env={env} orgId={orgId} onClose={() => setCreating(false)}
          onCreated={(b) => { batches.setRows((x) => [b, ...x]); setCreating(false); setDetail(b); showToast(p.created); }} />
      )}
      {detail && (
        <BatchDetail batch={detail} market={market} account={accounts.rows.find((a) => a.id === detail.accountId) ?? null} env={env} orgId={orgId} canManage={canManage}
          onClose={() => setDetail(null)} onSoon={() => { setTimeout(batches.reload, 4500); setTimeout(batches.reload, 9000); }} />
      )}
    </>
  );
}

/* A batch's payouts, each with its order and status; those the merchant marked paid can be
   released, one by one or together (one signature each). */
function BatchDetail({ batch: b, market, account, env, orgId, canManage, onClose, onSoon }: {
  batch: P2pPayoutBatch; market: P2pMarket | null | undefined; account: P2pAccount | null; env: string; orgId: string; canManage: boolean; onClose: () => void; onSoon: () => void;
}) {
  const t = useT();
  const lang = useLang();
  const p = t.p2p.payouts;
  const [releasing, setReleasing] = useState<P2pPayoutItem[] | null>(null);
  const net = networkOf(market, b.network);
  const paid = b.items.filter((i) => i.status === "paid" && i.orderId);
  if (releasing && account && net) {
    return (
      <WalletTxDialog
        eyebrow={p.head.batch} title={releasing.length > 1 ? fmt(p.releaseN, { n: releasing.length }) : p.release} signer={account.address} network={net} market={market}
        fields={[[p.head.from, accountName(account)], [p.head.total, totals(releasing, lang)]]}
        note={<Notice id="p2p-po-rel" title={t.p2p.orders.releaseTitle}>{p.releaseBody}</Notice>}
        steps={releasing.map((i) => ({ key: i.orderId!, label: `${i.beneficiaryName} · ${fiatText(i.fiatAmount, i.currency, lang)}`, build: () => buildTx(env, orgId, { network: b.network, from: account.id, action: "release", args: { orderId: i.orderId } }) }))}
        onClose={() => setReleasing(null)} onDone={() => { setReleasing(null); onSoon(); }}
      />
    );
  }
  return (
    <Modal onClose={onClose} label={p.head.batch}>
      <div className="modal-body paylink-detail p2p-wide">
        <div className="modal-eyebrow">{p.head.batch} · {p.state[b.status]}</div>
        <h3 title={b.id}>{totals(b.items, lang)}</h3>
        <div className="paylink-fields" style={{ marginBottom: 14 }}>
          {[[p.head.from, accountName(account)], [t.dash.filters.network, <NetworkCell market={market} id={b.network} />], [t.p2p.offers.form.token, b.token], [p.head.created, fmtDateTime(b.createdAt)]].map(([k, v]) => (
            <div className="paylink-field" key={String(k)}><span className="pf-k">{k}</span><span className="pf-v">{v}</span></div>
          ))}
        </div>
        <div className="t-scroll" tabIndex={0}><table className="tx p2p-items"><thead><tr>
          <th>#</th><th>{p.items.beneficiary}</th><th>{p.items.amount}</th><th>{p.items.method}</th><th>{p.items.reference}</th><th>{p.head.status}</th>
          <th><span className="sr-only">{t.dash.common.actions}</span></th>
        </tr></thead>
          <tbody>{b.items.map((i) => (
            <tr key={i.index}>
              <td className="cust">{i.index + 1}</td>
              <td className="cust">{i.beneficiaryName}</td>
              <td className="amt">{fiatText(i.fiatAmount, i.currency, lang)}</td>
              <td className="cust">{railName(t, i.rail)}</td>
              <td className="cust">{i.externalReference ? <code>{i.externalReference}</code> : "-"}</td>
              <td>{i.status === "rejected" ? <span title={i.error ?? undefined}><Pill st="fail" tone="fail" label={t.p2p.status.rejected} /></span> : <OrderStatus status={i.status} />}{i.error && <small className="p2p-row-err">{i.error}</small>}</td>
              <td className="row-actions">
                {i.orderId && <a className="icon-mini" href={`/dashboard?view=p2pOrders&open=${encodeURIComponent(i.orderId)}`} title={p.items.order} aria-label={`${p.items.order}: ${i.index + 1}`}>{DI.p2p}</a>}
                {canManage && <button type="button" className="icon-mini" disabled={i.status !== "paid" || !account} title={i.status === "paid" ? p.release : p.items.notPaid} aria-label={`${p.release}: ${i.index + 1}`} onClick={() => setReleasing([i])}>{DI.refresh}</button>}
              </td>
            </tr>
          ))}</tbody>
        </table></div>
        {canManage && !account && paid.length > 0 && <Notice id="p2p-po-nowallet" title={t.p2p.orders.noWalletTitle}>{t.p2p.orders.noWallet}</Notice>}
        <div className="paylink-actions">
          {canManage && paid.length > 0 && <button type="button" className="btn btn-dark btn-sm" disabled={!account || !net} onClick={() => setReleasing(paid)}>{paid.length > 1 ? fmt(p.releaseN, { n: paid.length }) : p.release}</button>}
          <button type="button" className="btn btn-soft btn-sm" onClick={onClose}>{t.ui.close}</button>
        </div>
      </div>
    </Modal>
  );
}

/* A new batch: the wallet it is paid from, on which network and token (with what it holds there
   and whether Cosmos Pay may open orders on it), then the file, checked row by row. */
function NewBatchModal({ market, accounts, env, orgId, onClose, onCreated }: { market: P2pMarket; accounts: P2pAccount[]; env: string; orgId: string; onClose: () => void; onCreated: (b: P2pPayoutBatch) => void }) {
  const t = useT();
  const lang = useLang();
  const p = t.p2p.payouts;
  const f = p.form;
  const fl = t.dash.filters;
  const steps = useFormSteps(2);
  const [accountId, setAccountId] = useState(accounts.find((a) => !a.merchant)?.id ?? accounts[0]?.id ?? "");
  const [network, setNetwork] = useState(market.networks[0]?.id ?? "");
  const net = networkOf(market, network);
  const [token, setToken] = useState(net?.tokens[0]?.symbol ?? "");
  const [chains, setChains] = useState<P2pAccount | null | undefined>(undefined);
  const [file, setFile] = useState<{ name: string; parsed: PayoutFile } | null>(null);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  useEffect(() => { if (net && !net.tokens.some((x) => x.symbol === token)) setToken(net.tokens[0]?.symbol ?? ""); }, [network]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    let alive = true;
    setChains(undefined);
    if (!accountId) return;
    p2pApi.get(`accounts/${encodeURIComponent(accountId)}`, env, orgId).then((a) => { if (alive) setChains(a); }).catch(() => { if (alive) setChains(null); });
    return () => { alive = false; };
  }, [accountId, env, orgId]);
  const chain = chains?.chains?.find((c) => c.network === network);
  const bal = chain?.balances.find((b) => b.symbol === token);
  const authorised = !!chain?.matcher;
  const step1Ok = !!accountId && !!net && !!token && chains !== undefined && authorised;

  const read = (f0: File | null | undefined) => {
    if (!f0) return;
    if (f0.size > 512 * 1024) { showToast(f.tooBig, "error"); return; }
    f0.text().then((text) => setFile({ name: f0.name, parsed: parsePayoutCsv(text, market.currencies.map((c) => c.code)) })).catch(() => showToast(f.unreadable, "error"));
  };
  const onPick = (e: ChangeEvent<HTMLInputElement>) => { read(e.target.files?.[0]); e.target.value = ""; };
  const onDrop = (e: DragEvent<HTMLDivElement>) => { e.preventDefault(); setDrag(false); read(e.dataTransfer.files?.[0]); };
  const valid = file ? payoutItems(file.parsed.rows) : [];
  const invalid = file ? file.parsed.rows.length - valid.length : 0;
  const canSend = !!file && !file.parsed.missing.length && !file.parsed.tooMany && valid.length > 0;
  const templateHref = useMemo(() => `data:text/csv;charset=utf-8,${encodeURIComponent(payoutTemplate())}`, []);
  const send = () => {
    if (!canSend || busy) return;
    setBusy(true);
    p2pApi.post("payouts", env, orgId, { network, token, accountId, items: valid })
      .then(onCreated)
      .catch((e) => showToast(e?.message || p.createFailed, "error"))
      .finally(() => setBusy(false));
  };
  const problemText = (key: string, code: string) => {
    const kind = key === "document" ? "text" : key;
    const label = (t.p2p.payouts.columns as Record<string, string>)[key] ?? key;
    return `${label}: ${fieldErrorText(t, kind, code)}`;
  };

  return (
    <Modal onClose={() => { if (!busy) onClose(); }} label={p.create}>
      <div className="modal-body p2p-wide">
        <div className="modal-eyebrow">{p.title}</div>
        <h3>{p.create}</h3>
        <FormSteps names={[f.stepFrom, f.stepFile]} steps={steps} />
        <FormStep steps={steps}>
          {steps.step === 0 && (
            <>
              <div className="fld">
                <span className="field-l" id="p2p-po-w">{p.head.from}</span>
                <Select value={accountId} onChange={setAccountId} labelledBy="p2p-po-w" options={accountOptions(accounts)} />
              </div>
              <div className="field-row">
                <div className="fld">
                  <span className="field-l" id="p2p-po-n">{fl.network}</span>
                  <Select value={network} onChange={setNetwork} labelledBy="p2p-po-n" options={networkOptions(market)} />
                </div>
                <div className="fld">
                  <span className="field-l" id="p2p-po-t">{t.p2p.offers.form.token}</span>
                  <Select value={token} onChange={setToken} labelledBy="p2p-po-t" disabled={(net?.tokens.length ?? 0) < 2} options={(net?.tokens ?? []).map((x) => ({ value: x.symbol, label: x.symbol, icon: <P2pTokenMark market={market} network={network} symbol={x.symbol} size={18} /> }))} />
                </div>
              </div>
              {chains !== undefined && (
                <div className="paylink-fields" style={{ marginBottom: 14 }}>
                  <div className="paylink-field"><span className="pf-k">{f.free}</span><span className="pf-v">{bal ? tokenText(fromBaseUnits(bal.freeUnits, bal.decimals), bal.symbol, lang) : "-"}</span></div>
                  <div className="paylink-field"><span className="pf-k">{t.p2p.liquidity.balances.cap}</span><span className="pf-v">{chain?.matcher && bal ? fmt(t.p2p.liquidity.balances.capValue, { amount: tokenText(fromBaseUnits(chain.matcher.maxPerOrderUnits, bal.decimals), bal.symbol, lang) }) : t.p2p.liquidity.balances.noMatcher}</span></div>
                </div>
              )}
              {chains !== undefined && !authorised && <Notice id="p2p-po-auth" title={f.authoriseTitle}>{f.authoriseBody}</Notice>}
              <Notice id="p2p-po-how" title={f.howTitle}>{f.howBody}</Notice>
            </>
          )}
          {steps.step === 1 && (
            <>
              <div className={`p2p-drop${drag ? " on" : ""}`} onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={onDrop}>
                <label className="btn btn-soft btn-sm">
                  {DI.download} {file ? f.replace : f.choose}
                  <input type="file" accept=".csv,text/csv" className="sr-only" onChange={onPick} />
                </label>
                <span className="p2p-drop-t">{file ? file.name : f.drop}</span>
                <a className="link-btn" href={templateHref} download="cosmos-pay-payouts.csv">{f.template}</a>
              </div>
              <p className="field-help">{fmt(f.columns, { max: PAYOUT_MAX_ITEMS })}</p>
              {file && file.parsed.missing.length > 0 && <p className="field-err" role="alert">{fmt(f.missing, { columns: file.parsed.missing.map((c) => (p.columns as Record<string, string>)[c] ?? c).join(", ") })}</p>}
              {file && file.parsed.tooMany && <p className="field-err" role="alert">{fmt(f.tooMany, { max: PAYOUT_MAX_ITEMS })}</p>}
              {file && !file.parsed.missing.length && (
                <>
                  <p className="p2p-csv-sum" role="status">{fmt(f.summary, { valid: valid.length, invalid })}</p>
                  <div className="t-scroll p2p-csv" tabIndex={0}><table className="tx p2p-items"><thead><tr>
                    <th>{f.line}</th><th>{p.items.beneficiary}</th><th>{p.items.amount}</th><th>{p.items.method}</th><th>{p.items.reference}</th><th>{f.check}</th>
                  </tr></thead>
                    <tbody>{file.parsed.rows.map((r) => {
                      const errs = Object.entries(r.errors);
                      return (
                        <tr key={r.line} className={errs.length ? "is-bad" : ""}>
                          <td className="cust">{r.line}</td>
                          <td className="cust">{r.holderName || "-"}</td>
                          <td className="amt">{r.currency && Number(r.fiatAmount) > 0 ? fiatText(r.fiatAmount, r.currency, lang) : r.fiatAmount || "-"}</td>
                          <td className="cust">{railName(t, r.rail) || "-"}</td>
                          <td className="cust">{r.externalReference || "-"}</td>
                          <td>{errs.length
                            ? <span className="p2p-row-err">{errs.map(([k, c]) => problemText(k, c)).join(" · ")}</span>
                            : <span className="cell-mark"><StatusIcon tone="ok" size={16} /><span>{f.ok}</span></span>}</td>
                        </tr>
                      );
                    })}</tbody>
                  </table></div>
                </>
              )}
            </>
          )}
        </FormStep>
        <FormStepsFooter steps={steps} canNext={step1Ok} onCancel={onClose} submitLabel={valid.length === 1 ? f.sendOne : fmt(f.send, { n: valid.length })} onSubmit={send} busy={busy} submitDisabled={!canSend} />
      </div>
    </Modal>
  );
}
