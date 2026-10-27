/* ZkPaymentsView: private payments ("ZK payments" in code) as a service. One is paid with a
   confidential transfer on Cosmos Pay's confidential token (OpenZeppelin's stellar-confidential):
   the amount stays hidden on-chain. The payer pays on the private checkout
   (payments.cosmospay.lat/zk/{id}); the recipient is a customer's private account (product owner,
   2026-10-27: private accounts are customers' Stellar wallets on Cosmos Pay's token, as many as there
   are), which receives the amount minus the 0.18% commission and the organization's own fee, if any,
   paid to one of the organization's wallets (Settings). The private accounts are a view of their own
   (ZkAccountsView; product owner, 2026-10-27: separate views); here they are read from every page of
   the customers and checked on the chain, so only a wallet registered on the token is offered as a
   payment's recipient. Private accounts link here filtered to one account (`q`).
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
import { useCustomerAccounts, useRegisteredAccounts } from "@/components/cosmos/dashboard/components/ZkAccountPanel";
import { WalletSelect } from "@/components/cosmos/dashboard/components/OrgWallets";
import { FormSteps, FormStep, FormStepsFooter, useFormSteps } from "@/components/cosmos/dashboard/components/FormSteps";

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
  const { accounts } = useCustomerAccounts(env);
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
  const canCreate = canManage && config;
  const zkConfig = useMemo(() => (config ? parseZkConfig(config) : null), [config]);
  // The private accounts' addresses (on the token): a payment's recipients; null until all read.
  const registered = useRegisteredAccounts(zkConfig, accounts);
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
        shown={shown.length} total={rows === null ? undefined : all.length} active={active} onReset={reset} loading={rows === null}
        actions={canCreate && <button type="button" className="btn btn-dark btn-sm" onClick={() => setModal(true)}>{DI.plus} {z.view.create}</button>}
      />
      <div className="panel" id="zk-payments">
        {rows === null && <TableSkeleton label={t.dash.cosmos.loading} cols={7} />}
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
                    <ZkRowActions p={p} onView={() => setDetail(p)} onCopy={copy} />
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
      {detail && <ZkPaymentDetailModal payment={detail} orgId={orgId} env={env} onCopy={copy} onClose={() => setDetail(null)} />}
      {modal && config && (
        <CreateZkPaymentModal
          orgId={orgId} env={env} config={config} canConnectWallets={canConnectWallets} accounts={accounts} registered={registered}
          onClose={() => setModal(false)}
          onCreated={(p) => { setRows((r) => [p, ...(r || [])]); }}
        />
      )}
    </>
  );
}

function CreateZkPaymentModal({ orgId, env, config, canConnectWallets, accounts, registered = null, onClose, onCreated }) {
  const t = useT();
  const z = t.zk;
  const mf = t.dash.paylinks.modal.merchantFee;
  const keys = useMemo(() => idempotencyKeys(), []);
  const [amount, setAmount] = useState("");
  // A customer's private account: only the wallets registered on the token (null while the
  // customers and the chain are read). The one picked, else the first: they may arrive after the
  // dialog opened.
  const list = useMemo(() => (accounts && registered ? accounts.filter((a) => registered.includes(a.address)) : null), [accounts, registered]);
  const [picked, setRecipient] = useState("");
  const recipient = (list || []).some((a) => a.address === picked) ? picked : list?.[0]?.address || "";
  // The organization's own fee (as on a payment link): a percentage and/or fixed XLM, to one of its
  // Stellar wallets, taken from the amount or added on top. Empty means none.
  const [feePct, setFeePct] = useState("");
  const [feeFixed, setFeeFixed] = useState("");
  const [feeWallet, setFeeWallet] = useState("");
  const [feePaidBy, setFeePaidBy] = useState("recipient");
  const [description, setDescription] = useState("");
  const [expires, setExpires] = useState("1440");
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState(null);
  const [problem, setProblem] = useState(null);

  const units = (() => { try { return amount.trim() ? toUnits(amount) : null; } catch { return null; } })();
  const target = (list || []).find((a) => a.address === recipient) || null;
  const feeOn = feePct.trim() !== "" || feeFixed.trim() !== "";
  const pctNum = Number(feePct.trim() || 0);
  const fixedNum = Number(feeFixed.trim() || 0);
  const feePctOk = !feePct.trim() || (/^\d+(\.\d{1,2})?$/.test(feePct.trim()) && pctNum <= 10);
  const feeFixedOk = !feeFixed.trim() || /^\d+(\.\d{1,7})?$/.test(feeFixed.trim());
  const terms = feeOn && feePctOk && feeFixedOk ? { bps: Math.round(pctNum * 100), fixed: fixedNum > 0 ? toUnits(feeFixed.trim()) : 0n, paidBy: feePaidBy } : null;
  // The split the API makes: the commission, the organization's fee and what the customer gets.
  const split = units && units > 0n ? zkSplit(units, config.feeBps, terms) : null;
  const feeSameWallet = !!feeWallet && feeWallet === recipient;
  const feeOk = !feeOn || (!!terms && (!split || split.merchantFee > 0n) && !!feeWallet && !feeSameWallet);
  const ok = !!split && split.net > 0n && !!target && feeOk && !busy;
  // A customer named after their address (one a payment created) shows it once.
  const optionLabel = (a) => (a.label ? `${a.customerName} (${a.label})` : [a.address, short(a.address)].includes(a.customerName) ? a.customerName : `${a.customerName} (${short(a.address)})`);

  const submit = async () => {
    if (!ok) return;
    setBusy(true);
    setProblem(null);
    const body = {
      org: orgId, environment: env, amount: amount.trim(), customerId: target.customerId, recipient: target.address,
      description: description.trim() || undefined, expiresInMinutes: Number(expires),
      ...(terms ? { merchantFee: { ...(terms.bps > 0 ? { bps: terms.bps } : {}), ...(terms.fixed > 0n ? { fixed: feeFixed.trim() } : {}), wallet: feeWallet, paidBy: feePaidBy } } : {}),
    };
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

  /* Three steps (product owner, 2026-10-27: a long form goes in steps): the amount and the
     customer who receives it, the payment's details, and the organization's own fee (optional);
     the split shows wherever the amount or the fee change it. */
  const steps = useFormSteps(3);
  const stepOk = [!!split && split.net > 0n && !!target, true, feeOk && !!split && split.net > 0n];
  const splitRows = split && (
    <dl className="sq-rows zk-split" aria-live="polite">
      <div><dt>{z.merchantGets}</dt><dd>{split.net > 0n ? fromUnits(split.net) : "0"} XLM</dd></div>
      <div><dt>{z.commission} ({z.commissionRate})</dt><dd>{fromUnits(split.fee)} XLM</dd></div>
      {split.merchantFee > 0n && <div><dt>{z.merchantFee}</dt><dd>{fromUnits(split.merchantFee)} XLM</dd></div>}
      {split.total !== units && <div><dt>{z.modal.payerPays}</dt><dd>{fromUnits(split.total)} XLM</dd></div>}
    </dl>
  );

  return (
    <Modal onClose={onClose} label={z.modal.title}>
      <div className="modal-body">
        <div className="modal-eyebrow">{z.title}</div>
        <h3>{z.modal.title}</h3>
        {created ? (
          <div className="paylink-fields">
            <Field label={z.modal.link} value={checkoutUrl(created.id)} readOnly onFocus={(e) => e.target.select()} />
            <div className="modal-actions">
              <a className="btn btn-violet" href={checkoutUrl(created.id)} target="_blank" rel="noopener">{z.view.openCheckout}</a>
              <button type="button" className="btn btn-soft" onClick={onClose}>{z.account.done}</button>
            </div>
          </div>
        ) : (
          <>
            <FormSteps names={[z.modal.steps.amount, z.modal.steps.details, z.modal.steps.fee]} steps={steps} />
            <FormStep steps={steps}>
            {steps.step === 0 && (<>
            <div className="fld">
              <div className="sp pl-amount">
                <div className="sp-top"><label htmlFor="zk-amount">{z.amount}</label></div>
                <div className="sp-row">
                  <input id="zk-amount" className="sp-amount" inputMode="decimal" autoComplete="off" placeholder="0" value={amount} onChange={(e) => setAmount(e.target.value.replace(",", "."))} aria-invalid={amount.trim() !== "" && units === null ? true : undefined} />
                  <span className="sp-unit">XLM</span>
                </div>
              </div>
            </div>
            {splitRows}
            {/* The recipient, disabled while there is none: no "nothing here" text anywhere
                (product owner, 2026-10-27). */}
            {list === null ? (
              <p className="field-help" role="status">{t.dash.cosmos.loading}</p>
            ) : (
              <div className="fld">
                <span className="field-l" id="zk-recipient-l">{z.modal.recipient}</span>
                <Select labelledBy="zk-recipient-l" value={recipient} onChange={setRecipient} options={list.map((a) => ({ value: a.address, label: optionLabel(a) }))} disabled={list.length === 0} />
                <p className="field-help">{z.modal.recipientHint}</p>
              </div>
            )}
            </>)}
            {steps.step === 1 && (<>
            <Field label={z.modal.description} hint={t.dash.common.optional} value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t.dash.examples.order} maxLength={140} />
            <div className="fld">
              <span className="field-l" id="zk-expires-l">{z.modal.expires}</span>
              <Select labelledBy="zk-expires-l" value={expires} onChange={setExpires} options={EXPIRIES.map((m) => ({ value: String(m), label: z.modal.expiries[`m${m}`] }))} />
            </div>
            </>)}
            {/* The organization's own fee, as on a payment link. */}
            {steps.step === 2 && (<>
            <div className="paylink-fee" role="group" aria-labelledby="zk-fee-l">
              <span className="field-l" id="zk-fee-l">{mf.title} <span className="field-hint">{t.dash.common.optional}</span></span>
              <p className="field-help">{z.modal.feeHint}</p>
              <div className="field-row">
                <Field label={mf.pct} hint={feePctOk ? undefined : mf.pctMax} value={feePct} onChange={(e) => setFeePct(e.target.value.replace(",", "."))} placeholder="1.5" inputMode="decimal" autoComplete="off" aria-invalid={feePctOk ? undefined : true} />
                <Field label={`${mf.fixed} (XLM)`} value={feeFixed} onChange={(e) => setFeeFixed(e.target.value.replace(",", "."))} placeholder="0.5" inputMode="decimal" autoComplete="off" aria-invalid={feeFixedOk ? undefined : true} />
              </div>
              {feeOn && (
                <div className="arrive">
                  <WalletSelect id="zk-fee-wallet" orgId={orgId} chain="stellar" value={feeWallet} onChange={setFeeWallet} canConnect={canConnectWallets} label={mf.wallet} />
                  {feeSameWallet && <p className="field-err" role="alert">{mf.sameWallet}</p>}
                  <div className="fld">
                    <span className="field-l" id="zk-fee-by">{mf.paidBy}</span>
                    <div className="seg-tabs seg-fill" role="group" aria-labelledby="zk-fee-by">
                      {["recipient", "payer"].map((k) => (
                        <button key={k} type="button" className={feePaidBy === k ? "on" : ""} aria-pressed={feePaidBy === k} onClick={() => setFeePaidBy(k)}>{mf[k]}</button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
            {splitRows}
            </>)}
            </FormStep>
            {problem && <p className="field-err" role="alert">{problem}</p>}
            <FormStepsFooter
              steps={steps} canNext={stepOk[steps.step]} onCancel={onClose}
              submitLabel={busy ? z.modal.submitting : z.modal.submit} onSubmit={submit} busy={busy} submitDisabled={!ok}
            />
          </>
        )}
      </div>
    </Modal>
  );
}

/* A private payment's actions, as a payment link's (PayLinkRowActions): its detail, its link and
   checkout while it can still be paid, its transaction on the explorer once there is one; the menu
   adds a new tab, its id and the commission's transaction. */
function ZkRowActions({ p, onView, onCopy }) {
  const t = useT();
  const z = t.zk;
  const cm = t.dash.common;
  const tier = p.network === "public" ? "public" : "testnet";
  const tx = p.paymentTxHash ? explorerTxUrl("stellar", tier, p.paymentTxHash) : null;
  const feeTx = p.feeTxHash ? explorerTxUrl("stellar", tier, p.feeTxHash) : null;
  const payable = p.status === "PENDING";
  return (
    <td className="row-actions" onClick={(e) => e.stopPropagation()}>
      <button type="button" className="icon-mini" title={z.view.detail.title} aria-label={z.view.detail.title} onClick={onView}>{DI.docs}</button>
      <button type="button" className="icon-mini" disabled={!payable} title={payable ? z.view.copyLink : cm.notPayable} aria-label={payable ? z.view.copyLink : `${z.view.copyLink}: ${cm.notPayable}`} onClick={() => onCopy(p.id)}><IcCopy /></button>
      {tx
        ? <a className="icon-mini" title={t.dash.balances.explorer} aria-label={t.dash.balances.explorer} href={tx} target="_blank" rel="noopener noreferrer">{DI.network}</a>
        : <button type="button" className="icon-mini" disabled title={cm.noTxYet} aria-label={`${t.dash.balances.explorer}: ${cm.noTxYet}`}>{DI.network}</button>}
      <RowMenu
        label={fmt(cm.rowActions, { name: shortAddress(p.id) })}
        items={[
          { key: "open", label: cm.details, icon: DI.docs, onClick: onView },
          { key: "tab", label: cm.openNewTab, icon: DI.link, href: `/dashboard?view=zkPayments&open=${encodeURIComponent(p.id)}`, external: true },
          { key: "copyId", label: cm.copyId, icon: <IcCopy />, onClick: () => navigator.clipboard?.writeText(p.id).then(() => showToast(t.toasts.copied)).catch(() => {}) },
          { key: "copy", label: z.view.copyLink, icon: <IcCopy />, disabled: !payable, hint: cm.notPayable, onClick: () => onCopy(p.id) },
          { key: "checkout", label: z.view.openCheckout, icon: DI.payments, href: checkoutUrl(p.id), external: true, disabled: !payable, hint: cm.notPayable },
          { key: "explorer", label: z.view.detail.paymentTx, icon: DI.network, href: tx, external: true, disabled: !tx, hint: cm.noTxYet },
          { key: "fee", label: z.view.detail.feeTx, icon: DI.network, href: feeTx, external: true, disabled: !feeTx, hint: cm.noTxYet },
        ]}
      />
    </td>
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
