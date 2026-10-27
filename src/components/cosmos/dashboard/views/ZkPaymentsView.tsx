/* ZkPaymentsView: private payments ("ZK payments" in code) as a service. One is paid with a
   confidential transfer on Cosmos Pay's confidential token (OpenZeppelin's stellar-confidential):
   the amount stays hidden on-chain. The merchant receives the amount minus the 0.01% commission; the
   payer pays on the private checkout (payments.cosmospay.lat/zk/{id}); the merchant's receiving
   account is one of the organization's Stellar wallets (Settings; the create dialog offers only
   those) with a confidential account, set up and managed in this view (ZkAccountPanel, which lists
   the wallets; without one it says the organization needs a Stellar wallet and nothing can be
   created), a table of private accounts in the same format as the payments one. The first wallet
   with a confidential account is the new payment's recipient by default.
   Testnet (the sandbox) only for now. */
import { useEffect, useMemo, useRef, useState } from "react";
import { Modal, showToast } from "@/components/cosmos/shared";
import { useT, fmt } from "@/lib/i18n/index";
import { IcCopy } from "@/components/cosmos/icons";
import { zkPayments as zkApi } from "@/lib/api-client";
import { DI } from "@/components/cosmos/dashboard/icons";
import { fmtDateTime, idempotencyKeys } from "@/components/cosmos/dashboard/helpers";
import { ViewActivity } from "@/components/cosmos/dashboard/components/ActivityPanel";
import { RecordLink } from "@/components/cosmos/dashboard/components/RecordLink";
import { PreviewCard, shortAddress } from "@/components/cosmos/dashboard/components/RecordPreview";
import { useListFilters, useUrlRequest, usePaged, useGsapRows } from "@/components/cosmos/dashboard/hooks";
import { explorerTxUrl, explorerAccountUrl } from "@/lib/chains";
import { Pill } from "@/components/cosmos/dashboard/components/Pill";
import { FilterBar } from "@/components/cosmos/dashboard/components/FilterBar";
import { ViewHead } from "@/components/cosmos/dashboard/components/ViewHead";
import { Field } from "@/components/cosmos/dashboard/components/Field";
import { Select } from "@/components/cosmos/dashboard/components/Select";
import { TableSkeleton } from "@/components/cosmos/dashboard/components/Skeleton";
import { RowMenu } from "@/components/cosmos/dashboard/components/RowMenu";
import { StatusIcon, paymentTone, pillTone } from "@/components/cosmos/dashboard/components/StatusIcon";
import { TokenMark } from "@/components/cosmos/dashboard/components/TokenMark";
import { Pagination } from "@/components/cosmos/dashboard/components/Pagination";
import { FillRows } from "@/components/cosmos/dashboard/components/FillRows";
import { PAYMENTS } from "@/components/cosmos/lib/constants";
import { countBy, inRange, matchesQuery } from "@/lib/dashboard-filters";
import { fromUnits, toUnits, zkSplit } from "@/lib/zk/amounts";
import { parseZkConfig } from "@/lib/zk/checkout-api";
import { ZkAccountPanel } from "@/components/cosmos/dashboard/components/ZkAccountPanel";
import { useOrgWallets, WalletSelect } from "@/components/cosmos/dashboard/components/OrgWallets";

const STATUSES = ["PENDING", "SUCCEEDED", "EXPIRED"];
const PILL = { SUCCEEDED: "ok", EXPIRED: "fail", PENDING: "ref" };
const DEFAULTS = { q: "", status: "all", date: "any" };
const ALLOWED = { status: ["all", ...STATUSES] };
const EXPIRIES = [60, 1440, 10080];

const checkoutUrl = (id) => `${PAYMENTS}/zk/${id}`;
const short = (a) => (a && a.length > 14 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a || "-");

export function ZkPaymentsView({ canManage = false, canConnectWallets = false, orgId, env = "dev" }) {
  const t = useT();
  const z = t.zk;
  const fl = t.dash.filters;
  const [config, setConfig] = useState(undefined);
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(false);
  const [modal, setModal] = useState(false);
  const [registered, setRegistered] = useState([]);
  const wallets = useOrgWallets(orgId);
  const stellarWallets = useMemo(() => (wallets || []).filter((w) => w.chain === "stellar").map((w) => ({ address: w.address, label: w.label })), [wallets]);
  const { filters, set, reset, active } = useListFilters(DEFAULTS, ALLOWED);

  // Loads once the organization is known; an answer for an organization or environment the view
  // has since left is dropped, so a slow failure can never cover a newer list.
  useEffect(() => {
    if (!orgId) return;
    let current = true;
    setRows(null);
    setError(false);
    zkApi.config(orgId, env).then((c) => { if (current) setConfig(c && c.enabled ? c : null); }).catch(() => { if (current) setConfig(null); });
    zkApi.list(orgId, env, { take: 100 })
      .then((res) => { if (current) setRows(Array.isArray(res?.data) ? res.data : []); })
      .catch(() => { if (current) { setRows([]); setError(true); } });
    return () => { current = false; };
  }, [orgId, env]);

  const all = rows || [];
  const matches = (p, skip) =>
    (skip === "status" || filters.status === "all" || p.status === filters.status) &&
    inRange(p.createdAt, filters.date) &&
    matchesQuery([p.id, p.recipient, p.payer, p.amount, p.description], filters.q);
  const shown = all.filter((p) => matches(p, null));
  const statusCounts = countBy(all.filter((p) => matches(p, "status")), (p) => p.status);
  const pg = usePaged(shown, JSON.stringify(filters));
  const tref = useRef(null); useGsapRows(tref, pg.page + "|" + shown.length);
  const canCreate = canManage && config && stellarWallets.length > 0;
  const zkConfig = useMemo(() => (config ? parseZkConfig(config) : null), [config]);

  // An account's count of payments received filters the payments table to it.
  const showPaymentsTo = (address) => { set("q", address); document.getElementById("zk-payments")?.scrollIntoView({ behavior: "smooth", block: "start" }); };
  const copy = (id) => navigator.clipboard?.writeText(checkoutUrl(id)).then(() => showToast(t.toasts.copied)).catch(() => {});
  const [detail, setDetail] = useState(null);
  // A private payment named from elsewhere opens once the list is here.
  const [openId, clearOpen] = useUrlRequest("open");
  useEffect(() => {
    if (!openId || rows === null) return;
    clearOpen();
    const hit = (rows || []).find((p) => p.id === openId);
    if (hit) setDetail(hit);
    else zkApi.get(openId, orgId, env).then((p) => { if (p && p.id) setDetail(p); else showToast(t.dash.common.notFound, "error"); }).catch(() => showToast(t.dash.common.notFound, "error"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openId, rows === null]);

  return (
    <>
      <ViewHead title={z.title} />
      {config === null && <div className="note-bar" style={{ marginBottom: 16 }}>{DI.link}<span>{z.unavailable}</span></div>}
      {/* Figures first, then the tables (product owner, 2026-10-27, every view): its own figures and
          chart, settled volume in USD and the payments created. */}
      <ViewActivity env={env} metrics={["zkVolume", "zkPayments"]} id="zk-activity" />
      <FilterBar
        label={fl.label}
        query={filters.q} onQuery={(v) => set("q", v)} placeholder={z.view.searchPlaceholder}
        status={{
          label: fl.status, value: filters.status, onChange: (v) => set("status", v),
          options: [
            { key: "all", label: fl.allStatuses, count: all.filter((p) => matches(p, "status")).length },
            ...STATUSES.map((st) => ({ key: st, label: z.status[st], count: statusCounts[st] || 0, icon: <StatusIcon tone={paymentTone(st)} size={16} /> })),
          ],
        }}
        date={filters.date} onDate={(v) => set("date", v)}
        shown={shown.length} total={all.length} active={active} onReset={reset} loading={rows === null}
        actions={canCreate && <button type="button" className="btn btn-dark btn-sm" onClick={() => setModal(true)}>{DI.plus} {z.view.create}</button>}
      />
      <div className="panel" id="zk-payments">
        {rows === null && <TableSkeleton label={t.dash.cosmos.loading} />}
        {rows !== null && (
          <div className="t-scroll" tabIndex={0} ref={tref}>
            <table className="tx">
              <thead><tr><th>{z.view.tableHead.id}</th><th>{z.view.tableHead.amount}</th><th>{z.view.tableHead.net}</th><th>{z.view.tableHead.fee}</th><th>{z.view.tableHead.status}</th><th>{z.view.tableHead.created}</th><th><span className="sr-only">{t.dash.common.actions}</span></th></tr></thead>
              <tbody>
                {!error && pg.slice.map((p) => (
                  <tr key={p.id} className="row-click" onClick={() => setDetail(p)}>
                    <td className="tid">
                      <RecordLink
                        href={`/dashboard?view=zkPayments&open=${encodeURIComponent(p.id)}`} onOpen={() => setDetail(p)} copy={p.id}
                        preview={() => <PreviewCard label={z.view.tableHead.id} title={p.id} headline={<><b>{p.amount} XLM</b><span className={`hub-st-t ${(PILL[p.status] === "ok" ? "ok" : PILL[p.status] === "fail" ? "fail" : "wait")}`}>{z.status[p.status] || p.status}</span></>} fields={[[z.view.tableHead.net, `${p.netAmount} XLM`], [z.view.tableHead.fee, `${p.feeAmount} XLM`], [z.view.tableHead.created, fmtDateTime(p.createdAt)], ...(p.description ? [[z.modal.description, p.description]] : [])]} />}
                      >{p.description || short(p.id)}</RecordLink>
                    </td>
                    <td className="amt"><span className="cell-mark"><TokenMark symbol="XLM" chain="stellar" chainName="Stellar" size={24} /><span>{p.amount} XLM</span></span></td>
                    <td className="amt">{p.netAmount} XLM</td>
                    <td className="cust">{p.feeAmount} XLM</td>
                    <td><Pill st={PILL[p.status] || "ref"} tone={paymentTone(p.status)} label={z.status[p.status] || p.status} /></td>
                    <td className="cust">{fmtDateTime(p.createdAt)}</td>
                    <td className="row-actions" onClick={(e) => e.stopPropagation()}>
                      <button type="button" className="icon-mini" title={z.view.detail.title} aria-label={z.view.detail.title} onClick={() => setDetail(p)}>{DI.docs}</button>
                      <button type="button" className="icon-mini" title={z.view.copyLink} aria-label={z.view.copyLink} onClick={() => copy(p.id)}><IcCopy /></button>
                      <a className="icon-mini" href={checkoutUrl(p.id)} target="_blank" rel="noopener" title={z.view.openCheckout} aria-label={z.view.openCheckout}>{DI.link}</a>
                      <RowMenu
                        label={fmt(t.dash.common.rowActions, { name: shortAddress(p.id) })}
                        items={[
                          { key: "open", label: t.dash.common.details, icon: DI.docs, onClick: () => setDetail(p) },
                          { key: "tab", label: t.dash.common.openNewTab, icon: DI.link, href: `/dashboard?view=zkPayments&open=${encodeURIComponent(p.id)}`, external: true },
                          { key: "copyId", label: t.dash.common.copyId, icon: <IcCopy />, onClick: () => navigator.clipboard?.writeText(p.id).then(() => showToast(t.toasts.copied)).catch(() => {}) },
                          { key: "copy", label: z.view.copyLink, icon: <IcCopy />, onClick: () => copy(p.id) },
                          { key: "checkout", label: z.view.openCheckout, icon: DI.payments, href: checkoutUrl(p.id), external: true },
                        ]}
                      />
                    </td>
                  </tr>
                ))}
                <FillRows
                  n={pg.size - (error ? 0 : pg.count)} cols={7}
                  empty={error ? z.view.loadError : null}
                />
              </tbody>
            </table>
          </div>
        )}
        {rows !== null && <Pagination {...pg} />}
      </div>
      {/* The private accounts the payments go to, a table of their own under the payments. */}
      {zkConfig && <ZkAccountPanel key={`${orgId}:${env}`} config={zkConfig} orgId={orgId} orgWallets={wallets === undefined ? null : stellarWallets} canConnectWallets={canConnectWallets} onRegistered={setRegistered} payments={rows} onShowPayments={showPaymentsTo} />}
      {detail && <ZkPaymentDetailModal payment={detail} orgId={orgId} env={env} onCopy={copy} onClose={() => setDetail(null)} />}
      {modal && config && (
        <CreateZkPaymentModal
          orgId={orgId} env={env} config={config} canConnectWallets={canConnectWallets} defaultRecipient={registered[0] || ""}
          onClose={() => setModal(false)}
          onCreated={(p) => { setRows((r) => [p, ...(r || [])]); }}
        />
      )}
    </>
  );
}

function CreateZkPaymentModal({ orgId, env, config, canConnectWallets, defaultRecipient = "", onClose, onCreated }) {
  const t = useT();
  const z = t.zk;
  const keys = useMemo(() => idempotencyKeys(), []);
  const [amount, setAmount] = useState("");
  // One of the organization's Stellar wallets: the first with a confidential account, else the first.
  const [recipient, setRecipient] = useState(defaultRecipient);
  const [description, setDescription] = useState("");
  const [expires, setExpires] = useState("1440");
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState(null);
  const [problem, setProblem] = useState(null);

  const units = (() => { try { return amount.trim() ? toUnits(amount) : null; } catch { return null; } })();
  const split = units && units > 0n ? zkSplit(units, config.feeBps) : null;
  const recipientOk = /^G[A-Z2-7]{55}$/.test(recipient.trim());
  const ok = !!split && split.net > 0n && recipientOk && !busy;

  const submit = async () => {
    if (!ok) return;
    setBusy(true);
    setProblem(null);
    const body = { org: orgId, environment: env, amount: amount.trim(), recipient: recipient.trim(), description: description.trim() || undefined, expiresInMinutes: Number(expires) };
    try {
      const p = await zkApi.create({ ...body, idempotencyKey: keys.keyFor(body) });
      setCreated(p);
      onCreated(p);
      showToast(z.modal.created);
    } catch (e) {
      setProblem(e && e.message ? e.message : t.dash.admin.loadError);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal onClose={onClose} label={z.modal.title}>
      <div className="modal-body">
        <h3>{z.modal.title}</h3>
        {created ? (
          <div className="paylink-fields">
            <Field label={z.modal.link} value={checkoutUrl(created.id)} readOnly onFocus={(e) => e.target.select()} />
            <div className="modal-actions">
              <a className="btn btn-dark" href={checkoutUrl(created.id)} target="_blank" rel="noopener">{z.view.openCheckout}</a>
              <button type="button" className="btn btn-outline-w" onClick={onClose}>{z.account.done}</button>
            </div>
          </div>
        ) : (
          <>
            <div className="fld">
              <div className="sp pl-amount">
                <div className="sp-top"><label htmlFor="zk-amount">{z.amount}</label></div>
                <div className="sp-row">
                  <input id="zk-amount" className="sp-amount" inputMode="decimal" autoComplete="off" placeholder="0" value={amount} onChange={(e) => setAmount(e.target.value.replace(",", "."))} aria-invalid={amount.trim() !== "" && units === null ? true : undefined} />
                  <span className="sp-unit">XLM</span>
                </div>
              </div>
            </div>
            {split && (
              <dl className="sq-rows zk-split">
                <div><dt>{z.merchantGets}</dt><dd>{fromUnits(split.net)} XLM</dd></div>
                <div><dt>{z.commission} ({z.commissionRate})</dt><dd>{fromUnits(split.fee)} XLM</dd></div>
              </dl>
            )}
            <WalletSelect id="zk-recipient" orgId={orgId} chain="stellar" value={recipient} onChange={setRecipient} canConnect={canConnectWallets} label={z.modal.recipient} hint={z.modal.recipientHint} />
            <Field label={z.modal.description} hint={t.dash.common.optional} value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t.dash.examples.order} maxLength={140} />
            <div className="fld">
              <span className="field-l" id="zk-expires-l">{z.modal.expires}</span>
              <Select labelledBy="zk-expires-l" value={expires} onChange={setExpires} options={EXPIRIES.map((m) => ({ value: String(m), label: z.modal.expiries[`m${m}`] }))} />
            </div>
            {problem && <p className="field-err" role="alert">{problem}</p>}
            <div className="modal-actions">
              <button type="button" className="btn btn-dark" onClick={submit} disabled={!ok}>{busy ? z.modal.submitting : z.modal.submit}</button>
              <button type="button" className="btn btn-outline-w" onClick={onClose}>{t.dash.common.cancel}</button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

/* A private payment's detail, read again by id so a payment settled since the list loaded shows
   it: the amount and its split, the receiving account and the payer, both transactions (the net
   amount to the merchant, the commission to Cosmos Pay) on the explorer, and its deadline. Amounts
   on-chain stay hidden; these are the ones the payment was created with. */
function ZkPaymentDetailModal({ payment, orgId, env, onCopy, onClose }) {
  const t = useT();
  const z = t.zk;
  const d = z.view.detail;
  const [data, setData] = useState(payment);
  useEffect(() => {
    let alive = true;
    zkApi.get(payment.id, orgId, env).then((p) => { if (alive && p && p.id) setData(p); }).catch(() => {});
    return () => { alive = false; };
  }, [payment.id, orgId, env]);
  const tier = data.network === "public" ? "public" : "testnet";
  const tx = (hash) => (hash ? explorerTxUrl("stellar", tier, hash) : null);
  const acct = (a) => (a ? explorerAccountUrl("stellar", tier, a) : null);
  const rows = [
    [z.view.tableHead.status, z.status[data.status] || data.status],
    [z.view.tableHead.amount, `${data.amount} XLM`],
    [z.view.tableHead.net, `${data.netAmount} XLM`],
    [z.view.tableHead.fee, `${data.feeAmount} XLM`],
    [z.modal.recipient, data.recipient],
    [d.payer, data.payer],
    [d.expires, data.status === "PENDING" && data.expiresAt ? fmtDateTime(data.expiresAt) : null],
    [d.settled, data.settledAt ? fmtDateTime(data.settledAt) : null],
    [z.view.tableHead.created, fmtDateTime(data.createdAt)],
  ].filter(([, v]) => v !== null && v !== undefined && v !== "");
  return (
    <Modal onClose={onClose}>
      <div className="modal-body">
        <div className="modal-eyebrow">{d.title}</div>
        <h3>{data.description || short(data.id)}</h3>
        <div className="paylink-fields" style={{ marginBottom: 18 }}>
          {rows.map(([k, v]) => (<div className="paylink-field" key={k}><span className="pf-k">{k}</span><span className="pf-v">{String(v)}</span></div>))}
        </div>
        <div className="paylink-actions">
          {data.status === "PENDING" && <a className="btn btn-dark btn-sm" href={checkoutUrl(data.id)} target="_blank" rel="noopener">{DI.link} {z.view.openCheckout}</a>}
          {data.status === "PENDING" && <button type="button" className="btn btn-soft btn-sm" onClick={() => onCopy(data.id)}><IcCopy /> {z.view.copyLink}</button>}
          {tx(data.paymentTxHash) && <a className="btn btn-soft btn-sm" href={tx(data.paymentTxHash)} target="_blank" rel="noopener noreferrer">{DI.network} {d.paymentTx}</a>}
          {tx(data.feeTxHash) && <a className="btn btn-soft btn-sm" href={tx(data.feeTxHash)} target="_blank" rel="noopener noreferrer">{DI.network} {d.feeTx}</a>}
          {!data.paymentTxHash && acct(data.recipient) && <a className="btn btn-soft btn-sm" href={acct(data.recipient)} target="_blank" rel="noopener noreferrer">{DI.network} {z.modal.recipient}</a>}
        </div>
      </div>
    </Modal>
  );
}
